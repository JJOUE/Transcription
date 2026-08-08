import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { CreateTranscriptionJobSchema, validateData } from '@/lib/validation/schemas';
import { sendSimpleNotification } from '@/lib/email/simple-email';
import { PACKAGE_ADD_ON_DISABLED_MESSAGE, SPEAKER_CUSTOM_QUOTE_MESSAGE, supportsTranscriptionAddOns, transcriptionAddOnQuote } from '@/lib/billing/transcription-rates';
import { packageAvailableMinutes } from '@/lib/billing/package-reservations';
import { isPackageAddOnCheckoutEnabled } from '@/lib/billing/package-add-on-feature';

function redactProjectDictionaryTerms(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const data = { ...(value as Record<string, unknown>) };

  if (Array.isArray(data.projectDictionaryTerms)) {
    data.projectDictionaryTerms = `[${data.projectDictionaryTerms.length} terms redacted]`;
  }

  return data;
}

export async function POST(request: NextRequest) {
  // Apply rate limiting first
  const rateLimitResponse = await rateLimiters.general(request);
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  try {
    // Get auth token from cookie
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the token
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
      console.log('[API] Received transcription job data:', JSON.stringify(redactProjectDictionaryTerms(body), null, 2));
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    const validation = validateData(body, CreateTranscriptionJobSchema);

    if (!validation.success) {
      console.error('[API] Validation failed for transcription job creation');
      console.error('[API] Request body:', JSON.stringify(redactProjectDictionaryTerms(body), null, 2));
      console.error('[API] Validation errors:', JSON.stringify(validation.errors, null, 2));
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.errors
        },
        { status: 400 }
      );
    }

    const validatedBody = validation.data;

    if (validatedBody.type === 'office' && validatedBody.officeServiceType) {
      return NextResponse.json(
        { error: 'Document Workspace projects must use the protected Document Workspace submission route' },
        { status: 400 }
      );
    }

    // Ensure userId matches authenticated user
    if (validatedBody.userId && validatedBody.userId !== userId) {
      return NextResponse.json(
        { error: 'Cannot create transcription job for another user' },
        { status: 403 }
      );
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();
    const userData = userDoc.data();
    const isAdminUser = userData?.role === 'admin';
    const requestedFreeTrialBilling =
      validatedBody.paymentStatus === 'free-trial' ||
      validatedBody.billingType === 'ai-free-trial' ||
      (validatedBody.freeTrialMinutesUsed || 0) > 0;

    if (!isAdminUser && requestedFreeTrialBilling && validatedBody.mode !== 'ai') {
      return NextResponse.json(
        { error: 'Free trial minutes can only be applied to AI transcription jobs' },
        { status: 400 }
      );
    }

    // Add-on fields are server-normalized so manipulated AI requests cannot retain them.
    const supportsAddOns = supportsTranscriptionAddOns(validatedBody.mode);
    const { addOnCost: _ignoredAddOnCost, ...clientJobFields } = validatedBody;
    const billingMinutes = Math.max(1, Math.ceil(Number(validatedBody.duration || 0) / 60));
    const matchingPackageMinutes = supportsAddOns && Array.isArray(userData?.packages)
      ? userData.packages
        .filter((pkg: { type?: string; active?: boolean }) => pkg?.type === validatedBody.mode && pkg?.active !== false)
        .reduce((sum: number, pkg: { minutesRemaining?: number; minutesReserved?: number }) => sum + packageAvailableMinutes(pkg), 0)
      : 0;
    const hasSufficientMatchingPackage = matchingPackageMinutes >= billingMinutes;
    const requiresSpeakerQuote = Number(validatedBody.speakerCount || 1) >= 5 || validatedBody.multipleSpeakers === true;
    if (!isAdminUser && requiresSpeakerQuote) {
      return NextResponse.json(
        { error: SPEAKER_CUSTOM_QUOTE_MESSAGE, code: 'SPEAKER_QUOTE_REQUIRED' },
        { status: 409 }
      );
    }
    const requestedPaidAddOn = supportsAddOns && validatedBody.rushDelivery === true;

    const packageAddOnPending = !isAdminUser && hasSufficientMatchingPackage && requestedPaidAddOn;
    if (packageAddOnPending && !isPackageAddOnCheckoutEnabled()) {
      return NextResponse.json(
        { error: PACKAGE_ADD_ON_DISABLED_MESSAGE, code: 'PACKAGE_ADD_ON_CHECKOUT_DISABLED' },
        { status: 503 }
      );
    }
    const addOnQuote = transcriptionAddOnQuote(validatedBody.mode, billingMinutes, {
      rushDelivery: validatedBody.rushDelivery === true,
      speakerCount: 1,
    });

    // Create the transcription job with server timestamp
    const serverInitialStatus = packageAddOnPending
      ? 'pending-add-on-payment'
      : validatedBody.mode === 'human' ? 'pending-transcription' : 'processing';
    const jobData = {
      ...clientJobFields,
      ...(validatedBody.mode === 'hybrid' || validatedBody.mode === 'human' ? {
        serviceCategory: 'professional-transcription',
        professionalWorkflow: 'managed-delivery',
        aiGeneratedInitialTranscript: validatedBody.mode === 'hybrid',
      } : {}),
      rushDelivery: supportsAddOns ? validatedBody.rushDelivery === true : false,
      multipleSpeakers: supportsAddOns
        ? Number(validatedBody.speakerCount || 1) >= 5
        : false,
      ...(supportsAddOns ? { addOnCost: packageAddOnPending ? addOnQuote.subtotalCents / 100 : 0 } : {}),
      // Billing and workflow state is established by trusted server routes,
      // never by values supplied in the browser request.
      status: serverInitialStatus,
      paymentStatus: 'pending',
      billingType: 'pending',
      freeTrialMinutesUsed: 0,
      hasPackage: false,
      ...(packageAddOnPending && {
        paymentStatus: 'pending',
        billingType: 'package-pending-add-on',
        hasPackage: true,
        addOnPaymentStatus: 'pending',
        addOnRushCents: addOnQuote.rushCents,
        addOnSpeakerCents: addOnQuote.speakerCents,
        addOnSubtotalCents: addOnQuote.subtotalCents,
        addOnCurrency: 'cad',
      }),
      ...(isAdminUser && {
        creditsUsed: 0,
        ...(supportsAddOns ? { addOnCost: 0 } : {}),
        hasPackage: false,
        paymentStatus: 'admin-comped',
        billingType: 'internal-admin',
        adminBypass: true,
        adminBypassBy: userData?.email || userId,
        adminBypassAt: FieldValue.serverTimestamp(),
      }),
      userId, // Ensure userId is from authenticated user
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    };

    const docRef = await adminDb.collection('transcriptions').add(jobData);

    console.log(`[API] Created transcription job ${docRef.id} for user ${userId}`);

    if (!isAdminUser && validatedBody.mode === 'ai') {
      await sendSimpleNotification({
        jobId: docRef.id,
        clientName: userData?.name,
        clientEmail: userData?.email || decodedToken.email,
        mode: validatedBody.mode,
        originalFilename: validatedBody.originalFilename,
        durationMinutes: validatedBody.duration / 60,
        rushDelivery: false,
      });
    }

    return NextResponse.json({
      success: true,
      jobId: docRef.id,
      message: 'Transcription job created successfully'
    });

  } catch (error) {
    console.error('[API] Error creating transcription job:', error);

    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create transcription job',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
