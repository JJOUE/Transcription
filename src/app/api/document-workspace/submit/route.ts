import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin';
import { sendDocumentWorkspaceNotification } from '@/lib/email/simple-email';
import { CreateTranscriptionJobSchema, validateData } from '@/lib/validation/schemas';
import { deductHumanPackageMinutes, type DocumentWorkspacePackage } from '@/lib/billing/document-workspace-submission';
import { rateLimiters } from '@/lib/middleware/rate-limit';

function submissionIdentity(userId: string, submissionKey: string) {
  const keyHash = createHash('sha256').update(`${userId}:${submissionKey}`).digest('hex');
  return { keyHash, jobId: `office_${keyHash.slice(0, 32)}` };
}

export async function POST(request: NextRequest) {
  const rateLimitResponse = await rateLimiters.general(request);
  if (rateLimitResponse) return rateLimitResponse;

  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });

    const decodedToken = await adminAuth.verifyIdToken(token);
    const body = await request.json() as {
      submissionKey?: unknown;
      billingMinutes?: unknown;
      job?: unknown;
    };

    const submissionKey = typeof body.submissionKey === 'string' ? body.submissionKey.trim() : '';
    if (!/^[A-Za-z0-9:_-]{16,160}$/.test(submissionKey)) {
      return NextResponse.json({ ok: false, error: 'Invalid submission key' }, { status: 400 });
    }

    const validation = validateData(body.job, CreateTranscriptionJobSchema);
    if (!validation.success) {
      return NextResponse.json({ ok: false, error: 'Invalid Document Workspace project', details: validation.errors }, { status: 400 });
    }

    const requestedJob = validation.data;
    const userId = decodedToken.uid;
    const expectedPrefix = `transcriptions/${userId}/`;
    const billingMinutes = Number(body.billingMinutes);

    if (requestedJob.userId && requestedJob.userId !== userId) {
      return NextResponse.json({ ok: false, error: 'Cannot submit a project for another user' }, { status: 403 });
    }
    if (requestedJob.type !== 'office' || requestedJob.mode !== 'human' || !requestedJob.officeServiceType) {
      return NextResponse.json({ ok: false, error: 'This route accepts Document Workspace projects only' }, { status: 400 });
    }
    if (!requestedJob.filePath.startsWith(expectedPrefix)) {
      return NextResponse.json({ ok: false, error: 'Source file path does not belong to the signed-in user' }, { status: 400 });
    }
    if (requestedJob.templatePath && !requestedJob.templatePath.startsWith(expectedPrefix)) {
      return NextResponse.json({ ok: false, error: 'Template path does not belong to the signed-in user' }, { status: 400 });
    }
    if (requestedJob.voiceInstructionsPath && !requestedJob.voiceInstructionsPath.startsWith(expectedPrefix)) {
      return NextResponse.json({ ok: false, error: 'Voice-instruction path does not belong to the signed-in user' }, { status: 400 });
    }
    if (!Number.isFinite(billingMinutes) || billingMinutes < 0 || billingMinutes > 1440) {
      return NextResponse.json({ ok: false, error: 'Invalid billable duration' }, { status: 400 });
    }

    const hasInstructions = Boolean(
      requestedJob.specialInstructions?.trim() ||
      requestedJob.officeNotes?.trim() ||
      requestedJob.hasVoiceInstructions
    );
    if (!hasInstructions) {
      return NextResponse.json({ ok: false, error: 'Please provide written or voice instructions for this project' }, { status: 400 });
    }

    const quoteRequired = billingMinutes === 0 || requestedJob.officeServiceType !== 'dictation-cleanup';
    const { keyHash, jobId } = submissionIdentity(userId, submissionKey);
    const jobRef = adminDb.collection('transcriptions').doc(jobId);
    const userRef = adminDb.collection('users').doc(userId);
    const ledgerRef = adminDb.collection('transactions').doc(`office_${keyHash.slice(0, 40)}`);

    const result = await adminDb.runTransaction(async transaction => {
      const existingJob = await transaction.get(jobRef);
      if (existingJob.exists) {
        const existing = existingJob.data();
        if (existing?.userId !== userId || existing?.submissionKeyHash !== keyHash) {
          throw new Error('SUBMISSION_KEY_CONFLICT');
        }
        return {
          existing: true,
          quoteRequired: existing?.paymentStatus === 'quote-required',
          rushDelivery: Boolean(existing?.rushDelivery),
        };
      }

      const userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists) throw new Error('USER_NOT_FOUND');
      const userData = userSnapshot.data() || {};
      const isAdmin = userData.role === 'admin';
      const now = new Date();
      const packages = Array.isArray(userData.packages) ? userData.packages as DocumentWorkspacePackage[] : [];
      let updatedPackages = [...packages];
      let packageMinutesUsed = 0;
      let packageValueUsed = 0;
      let walletUsed = 0;
      let paymentStatus = 'quote-required';
      let billingType = 'custom-quote';
      let rushDelivery = false;

      if (isAdmin) {
        paymentStatus = 'admin-comped';
        billingType = 'internal-admin';
        rushDelivery = Boolean(requestedJob.rushDelivery);
      } else if (!quoteRequired) {
        const packageDeduction = deductHumanPackageMinutes(packages, billingMinutes, now);

        if (packageDeduction.kind !== 'none') {
          if (packageDeduction.kind === 'insufficient') throw new Error('INSUFFICIENT_HUMAN_PACKAGE_MINUTES');
          updatedPackages = packageDeduction.packages;
          packageMinutesUsed = packageDeduction.minutesUsed;
          packageValueUsed = packageDeduction.valueUsed;
          paymentStatus = 'paid-package';
          billingType = 'human-package';
          rushDelivery = Boolean(requestedJob.rushDelivery);
          transaction.update(userRef, { packages: updatedPackages, updatedAt: FieldValue.serverTimestamp() });
        } else {
          const humanRate = 2.5;
          walletUsed = billingMinutes * humanRate;
          const availableBalance = Number(userData.walletBalance || 0);
          if (availableBalance < walletUsed) throw new Error('PAYMENT_REQUIRED');
          paymentStatus = 'paid';
          billingType = 'pay-as-you-go';
          rushDelivery = false;
          transaction.update(userRef, { walletBalance: availableBalance - walletUsed, updatedAt: FieldValue.serverTimestamp() });
        }
      }

      const jobData = {
        ...requestedJob,
        userId,
        status: 'pending-review',
        officeStatus: 'submitted',
        rushDelivery,
        hasPackage: packageMinutesUsed > 0,
        paymentStatus,
        billingType,
        packageMinutesUsed,
        walletUsed,
        creditsUsed: isAdmin || quoteRequired ? 0 : requestedJob.creditsUsed,
        submissionKeyHash: keyHash,
        submittedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        ...(isAdmin && {
          adminBypass: true,
          adminBypassBy: userData.email || userId,
          adminBypassAt: FieldValue.serverTimestamp(),
        }),
      };

      transaction.create(jobRef, jobData);
      if (!quoteRequired && !isAdmin) {
        transaction.create(ledgerRef, {
          userId,
          type: 'transcription',
          amount: -(walletUsed || packageValueUsed),
          description: `Document Workspace: ${billingMinutes} minutes`,
          jobId,
          packageMinutesUsed,
          walletUsed,
          minutesUsed: billingMinutes,
          submissionKeyHash: keyHash,
          createdAt: FieldValue.serverTimestamp(),
        });
      }

      return { existing: false, quoteRequired, rushDelivery };
    });

    if (!result.existing) {
      const userSnapshot = await userRef.get();
      const userData = userSnapshot.data();
      await sendDocumentWorkspaceNotification({
        jobId,
        clientName: userData?.name,
        clientEmail: userData?.email || decodedToken.email,
        serviceType: requestedJob.officeServiceType,
        originalFilename: requestedJob.originalFilename,
        hasWrittenInstructions: Boolean(requestedJob.specialInstructions?.trim() || requestedJob.officeNotes?.trim()),
        hasVoiceInstructions: Boolean(requestedJob.hasVoiceInstructions),
        hasTemplate: Boolean(requestedJob.templatePath || requestedJob.templateFilename),
        rushDelivery: result.rushDelivery,
        quoteRequired: result.quoteRequired,
      });
    }

    return NextResponse.json({ ok: true, success: true, jobId, quoteRequired: result.quoteRequired, duplicate: result.existing });
  } catch (error) {
    console.error('[Document Workspace Submit] Failed:', error);
    const message = error instanceof Error ? error.message : '';
    if (message === 'INSUFFICIENT_HUMAN_PACKAGE_MINUTES') {
      return NextResponse.json({ ok: false, error: 'Your Human Transcription package does not have enough minutes for this audio file.' }, { status: 402 });
    }
    if (message === 'PAYMENT_REQUIRED') {
      return NextResponse.json({ ok: false, error: 'Additional pay-as-you-go transcription must be purchased before submitting this project.' }, { status: 402 });
    }
    if (message === 'USER_NOT_FOUND') return NextResponse.json({ ok: false, error: 'User account was not found' }, { status: 404 });
    if (message === 'SUBMISSION_KEY_CONFLICT') return NextResponse.json({ ok: false, error: 'Submission key conflict' }, { status: 409 });
    return NextResponse.json({ ok: false, error: 'The project could not be submitted. Your package minutes were not deducted.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    const decodedToken = await adminAuth.verifyIdToken(token);
    const body = await request.json() as { submissionKey?: unknown; paths?: unknown };
    const submissionKey = typeof body.submissionKey === 'string' ? body.submissionKey.trim() : '';
    const paths = Array.isArray(body.paths) ? body.paths.filter((path): path is string => typeof path === 'string') : [];
    if (!/^[A-Za-z0-9:_-]{16,160}$/.test(submissionKey) || paths.length === 0 || paths.length > 6) {
      return NextResponse.json({ ok: false, error: 'Invalid cleanup request' }, { status: 400 });
    }

    const userId = decodedToken.uid;
    const expectedPrefix = `transcriptions/${userId}/`;
    if (paths.some(path => !path.startsWith(expectedPrefix) || path.includes('..'))) {
      return NextResponse.json({ ok: false, error: 'Cleanup path does not belong to the signed-in user' }, { status: 403 });
    }

    const { jobId } = submissionIdentity(userId, submissionKey);
    const jobSnapshot = await adminDb.collection('transcriptions').doc(jobId).get();
    let cleanupPaths = paths;
    let protectedCount = 0;
    if (jobSnapshot.exists) {
      const job = jobSnapshot.data() || {};
      if (job.userId !== userId) {
        return NextResponse.json({ ok: false, error: 'Project ownership mismatch' }, { status: 403 });
      }
      const referencedPaths = new Set(
        [job.filePath, job.templatePath, job.voiceInstructionsPath].filter(
          (path): path is string => typeof path === 'string'
        )
      );
      cleanupPaths = paths.filter(path => !referencedPaths.has(path));
      protectedCount = paths.length - cleanupPaths.length;
    }

    const bucket = adminStorage.bucket();
    const results = await Promise.allSettled(cleanupPaths.map(path => bucket.file(path).delete({ ignoreNotFound: true })));
    const failures = results.filter(result => result.status === 'rejected');
    if (failures.length > 0) {
      console.error('[Document Workspace Cleanup] Some current-attempt files could not be deleted', {
        userId,
        failedCount: failures.length,
      });
    }
    return NextResponse.json({
      ok: failures.length === 0,
      deleted: results.length - failures.length,
      failed: failures.length,
      protectedExistingProject: jobSnapshot.exists,
      protectedCount,
    });
  } catch (error) {
    console.error('[Document Workspace Cleanup] Failed:', error);
    return NextResponse.json({ ok: false, error: 'Current-attempt file cleanup failed' }, { status: 500 });
  }
}
