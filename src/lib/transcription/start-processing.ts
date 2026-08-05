import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import { buildProjectDictionaryVocabulary, speechmaticsService, type SpeechmaticsConfig } from '@/lib/speechmatics/service';
import { getTranscriptionByIdAdmin } from '@/lib/firebase/transcriptions-admin';

type RequestContext = { headers?: Headers };
export type StartProcessingResult = { success: boolean; duplicate?: boolean; status: string; speechmaticsJobId?: string; error?: string };

function callbackBaseUrl(request?: RequestContext) {
  let baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (baseUrl && !baseUrl.startsWith('http')) baseUrl = `https://${baseUrl}`;
  const host = request?.headers?.get('host');
  if (host) baseUrl = `${request?.headers?.get('x-forwarded-proto') || 'https'}://${host}`;
  if (!baseUrl && process.env.NODE_ENV === 'development') baseUrl = 'http://localhost:3002';
  return baseUrl;
}

function processingConfig(job: Record<string, any>, language: string, operatingPoint: 'standard' | 'enhanced') {
  const vocabulary = buildProjectDictionaryVocabulary(job.projectDictionaryTerms);
  return {
    language, operatingPoint, enableDiarization: true, enablePunctuation: true,
    punctuationSensitivity: 0.6, enableEntities: true, outputLocale: 'en-GB',
    speakerSensitivity: 0.6, domain: job.domain || 'general', removeDisfluencies: false,
    additionalVocab: vocabulary.length ? vocabulary : undefined,
  } satisfies SpeechmaticsConfig;
}

async function downloadAudioFile(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Failed to download file: ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function claimProcessing(jobId: string) {
  const ref = adminDb.collection('transcriptions').doc(jobId);
  return adminDb.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    if (!snapshot.exists) throw new Error('JOB_NOT_FOUND');
    const job = snapshot.data() || {};
    if (!['ai', 'hybrid'].includes(job.mode)) throw new Error('INVALID_MODE');
    if (!['paid', 'free-trial', 'admin-comped'].includes(String(job.paymentStatus || ''))) throw new Error('PAYMENT_REQUIRED');
    if (job.billingType === 'package-pending-add-on' || (Number(job.addOnCost || 0) > 0 && job.hasPackage === true)) {
      if (job.paymentStatus !== 'paid' || job.packageReservationStatus !== 'consumed') throw new Error('ADD_ON_PAYMENT_REQUIRED');
    }
    if (job.speechmaticsSubmissionStatus === 'submitted' || job.speechmaticsJobId) return { duplicate: true, job };
    const claimedAt = job.speechmaticsSubmissionClaimedAt instanceof Timestamp ? job.speechmaticsSubmissionClaimedAt.toMillis() : 0;
    if (job.speechmaticsSubmissionStatus === 'submitting' && claimedAt > Date.now() - 10 * 60 * 1000) return { duplicate: true, job };
    if (!['processing', 'failed', 'pending-transcription'].includes(String(job.status))) throw new Error('INVALID_STATUS');
    transaction.update(ref, {
      status: 'processing', speechmaticsSubmissionStatus: 'submitting',
      speechmaticsSubmissionClaimedAt: FieldValue.serverTimestamp(),
      speechmaticsSubmissionAttempts: FieldValue.increment(1),
      processingFailureRecoverable: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(),
    });
    return { duplicate: false, job };
  });
}

export async function startTranscriptionProcessing(input: {
  jobId: string; language?: string; operatingPoint?: 'standard' | 'enhanced'; request?: RequestContext;
}): Promise<StartProcessingResult> {
  const { jobId } = input;
  const ref = adminDb.collection('transcriptions').doc(jobId);
  try {
    const claim = await claimProcessing(jobId);
    if (claim.duplicate) return { success: true, duplicate: true, status: String(claim.job.status || 'processing'), speechmaticsJobId: claim.job.speechmaticsJobId };
    if (!speechmaticsService.isReady()) throw new Error('Speechmatics API is not configured');
    const job = await getTranscriptionByIdAdmin(jobId);
    if (!job) throw new Error('JOB_NOT_FOUND');
    const config = processingConfig(job, input.language || job.language || 'en', input.operatingPoint || 'enhanced');
    const duration = Number(job.duration || 0);
    const baseUrl = callbackBaseUrl(input.request);
    if (!baseUrl) throw new Error('Application URL is not configured');
    const callbackUrl = `${baseUrl}/api/speechmatics/callback?token=${process.env.SPEECHMATICS_WEBHOOK_TOKEN || 'default-webhook-secret'}&jobId=${jobId}`;

    let result: { success: boolean; jobId?: string; error?: string };
    let asynchronous = false;
    if (!duration || duration > 600) {
      asynchronous = true;
      result = await speechmaticsService.submitJobWithFetchData(job.downloadURL, job.originalFilename, config, callbackUrl);
    } else if (duration > 300) {
      asynchronous = true;
      result = await speechmaticsService.submitJobWithWebhook(await downloadAudioFile(job.downloadURL), job.originalFilename, config, callbackUrl);
    } else {
      await speechmaticsService.processTranscriptionJob(jobId, await downloadAudioFile(job.downloadURL), job.originalFilename, config);
      const completed = await getTranscriptionByIdAdmin(jobId);
      result = completed && ['complete', 'pending-review'].includes(completed.status)
        ? { success: true }
        : { success: false, error: completed?.specialInstructions || 'Synchronous transcription failed' };
    }
    if (!result.success) throw new Error(result.error || 'Speechmatics submission failed');
    await ref.update({
      speechmaticsSubmissionStatus: 'submitted', speechmaticsSubmittedAt: FieldValue.serverTimestamp(),
      ...(result.jobId ? { speechmaticsJobId: result.jobId, webhookUrl: callbackUrl } : {}),
      ...(asynchronous ? { status: 'processing' } : {}), updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true, status: asynchronous ? 'processing' : 'complete', speechmaticsJobId: result.jobId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Transcription processing failed';
    if (!['JOB_NOT_FOUND', 'INVALID_MODE', 'PAYMENT_REQUIRED', 'ADD_ON_PAYMENT_REQUIRED', 'INVALID_STATUS'].includes(message)) {
      await ref.update({
        status: 'failed', speechmaticsSubmissionStatus: 'failed',
        speechmaticsSubmissionFailedAt: FieldValue.serverTimestamp(), processingFailureRecoverable: true,
        processingFailureMessage: message, updatedAt: FieldValue.serverTimestamp(),
      }).catch(() => undefined);
    }
    return { success: false, status: 'failed', error: message };
  }
}
