import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { sendSimpleNotification } from '@/lib/email/simple-email';

const CLAIM_TIMEOUT_MS = 5 * 60 * 1000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const jobRef = adminDb.collection('transcriptions').doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return NextResponse.json({ ok: false, error: 'Transcription job not found' }, { status: 404 });
    }

    const job = jobDoc.data() || {};
    if (job.userId !== decodedToken.uid) {
      return NextResponse.json({ ok: false, error: 'You do not have permission to notify for this job' }, { status: 403 });
    }

    if (job.mode !== 'human' && job.mode !== 'hybrid') {
      return NextResponse.json({ ok: false, error: 'Admin notification is only available for Human or Hybrid jobs' }, { status: 400 });
    }

    const paymentTransaction = await adminDb
      .collection('transactions')
      .where('jobId', '==', id)
      .limit(1)
      .get();

    if (paymentTransaction.empty || paymentTransaction.docs[0].data().userId !== decodedToken.uid) {
      return NextResponse.json({ ok: false, error: 'Successful job payment has not been confirmed' }, { status: 409 });
    }

    if (job.adminSubmissionNotifiedAt) {
      return NextResponse.json({ ok: true, alreadyNotified: true });
    }

    const claimResult = await adminDb.runTransaction(async transaction => {
      const currentDoc = await transaction.get(jobRef);
      const currentJob = currentDoc.data() || {};

      if (currentJob.adminSubmissionNotifiedAt) return 'already-notified' as const;

      const attemptAt = currentJob.adminSubmissionNotificationAttemptAt;
      const activeClaim =
        currentJob.adminSubmissionNotificationStatus === 'sending' &&
        attemptAt instanceof Timestamp &&
        Date.now() - attemptAt.toMillis() < CLAIM_TIMEOUT_MS;

      if (activeClaim) return 'in-progress' as const;

      transaction.update(jobRef, {
        adminSubmissionNotificationStatus: 'sending',
        adminSubmissionNotificationAttemptAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return 'claimed' as const;
    });

    if (claimResult === 'already-notified') {
      return NextResponse.json({ ok: true, alreadyNotified: true });
    }
    if (claimResult === 'in-progress') {
      return NextResponse.json({ ok: true, notificationInProgress: true });
    }

    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.data() || {};
    const notificationResult = await sendSimpleNotification({
      jobId: id,
      clientName: userData.name || job.clientName,
      clientEmail: userData.email || decodedToken.email,
      mode: job.mode,
      originalFilename: job.originalFilename || job.filename || 'Not available',
      durationMinutes: typeof job.duration === 'number' ? job.duration / 60 : undefined,
      rushDelivery: Boolean(job.rushDelivery),
    });

    if (!notificationResult.ok) {
      console.error('[Admin Submission Notification] Delivery failed', {
        jobId: id,
        error: notificationResult.error,
      });
      await jobRef.update({
        adminSubmissionNotificationStatus: 'failed',
        adminSubmissionNotificationError: notificationResult.error || 'Notification failed',
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json(
        { ok: false, error: 'Job was paid, but the admin notification could not be sent' },
        { status: 502 }
      );
    }

    await jobRef.update({
      adminSubmissionNotifiedAt: FieldValue.serverTimestamp(),
      adminSubmissionNotificationStatus: 'sent',
      adminSubmissionNotificationError: FieldValue.delete(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, notified: true });
  } catch (error) {
    console.error('[Admin Submission Notification] Route failed:', error);
    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json({ ok: false, error: 'Invalid authentication token' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: 'Unable to send admin notification' }, { status: 500 });
  }
}
