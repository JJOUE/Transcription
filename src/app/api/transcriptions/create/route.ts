import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { rateLimiters } from '@/lib/middleware/rate-limit';
import { CreateTranscriptionJobSchema, validateData } from '@/lib/validation/schemas';
import { sendDocumentWorkspaceNotification, sendSimpleNotification } from '@/lib/email/simple-email';

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

    // Create the transcription job with server timestamp
    const jobData = {
      ...validatedBody,
      ...(isAdminUser && {
        creditsUsed: 0,
        addOnCost: 0,
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

    if (validatedBody.type === 'office') {
      await sendDocumentWorkspaceNotification({
        jobId: docRef.id,
        clientName: userData?.name,
        clientEmail: userData?.email,
        serviceType: validatedBody.officeServiceType,
        originalFilename: validatedBody.originalFilename,
        hasWrittenInstructions: Boolean(validatedBody.specialInstructions?.trim() || validatedBody.officeNotes?.trim()),
        hasVoiceInstructions: Boolean(validatedBody.hasVoiceInstructions),
        hasTemplate: Boolean(validatedBody.templateURL || validatedBody.templateFilename),
        rushDelivery: validatedBody.rushDelivery,
      });
    } else if (validatedBody.mode === 'human' || validatedBody.mode === 'hybrid') {
      if (userData?.email) {
        // Send simple email to Jennifer
        await sendSimpleNotification(
          validatedBody.originalFilename,
          validatedBody.mode,
          userData.email,
          validatedBody.duration / 60 // Convert seconds to minutes
        );
      }
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
