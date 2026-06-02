import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { buildProjectDictionaryVocabulary, speechmaticsService } from '@/lib/speechmatics/service';
import { updateTranscriptionStatusAdmin, getTranscriptionByIdAdmin } from '@/lib/firebase/transcriptions-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for long audio files

/**
 * Admin endpoint to force resubmit a stuck job to Speechmatics
 * POST /api/admin/resubmit-job
 * Body: { jobId: string }
 */
export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { jobId, language = 'en' } = body;

    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 });
    }

    console.log(`[Admin Resubmit] Processing job ${jobId} by admin ${decodedToken.email}`);

    // Get the job
    const job = await getTranscriptionByIdAdmin(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Allow resubmitting processing or failed jobs
    if (!['processing', 'failed'].includes(job.status)) {
      return NextResponse.json({
        error: `Cannot resubmit job with status: ${job.status}. Only processing or failed jobs can be resubmitted.`
      }, { status: 400 });
    }

    // Only AI and hybrid modes use Speechmatics
    if (!['ai', 'hybrid'].includes(job.mode)) {
      return NextResponse.json({
        error: 'Only AI and hybrid transcription jobs can be resubmitted to Speechmatics'
      }, { status: 400 });
    }

    // Use fetch_data for all files (safer for serverless memory limits)
    console.log(`[Admin Resubmit] Using fetch_data approach for job ${jobId}`);
    console.log(`[Admin Resubmit] Audio URL: ${job.downloadURL.substring(0, 100)}...`);

    // Update status to processing
    await updateTranscriptionStatusAdmin(jobId, 'processing');

    // Get base URL for webhook callback
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.talktotext.ca';
    const webhookToken = process.env.SPEECHMATICS_WEBHOOK_TOKEN || 'default-webhook-secret';
    const callbackUrl = `${baseUrl}/api/speechmatics/callback?token=${webhookToken}&jobId=${jobId}`;

    console.log(`[Admin Resubmit] Webhook callback URL: ${callbackUrl}`);

    const additionalVocab = buildProjectDictionaryVocabulary(job.projectDictionaryTerms);
    if (additionalVocab.length > 0) {
      console.log(`[Admin Resubmit] Using project dictionary vocabulary for job ${jobId}: ${additionalVocab.length} terms`);
    }

    // Submit to Speechmatics using fetch_data (URL-based, no file download)
    const result = await speechmaticsService.submitJobWithFetchData(
      job.downloadURL,
      job.originalFilename,
      {
        language,
        operatingPoint: 'standard',
        enableDiarization: true,
        enablePunctuation: true,
        domain: job.domain || 'general',
        additionalVocab: additionalVocab.length > 0 ? additionalVocab : undefined,
      },
      callbackUrl
    );

    if (result.success && result.jobId) {
      // Update job with Speechmatics job ID
      await updateTranscriptionStatusAdmin(jobId, 'processing', {
        speechmaticsJobId: result.jobId,
        webhookUrl: callbackUrl,
        webhookSubmittedAt: new Date().toISOString(),
        processingMethod: 'fetch_data'
      });

      console.log(`[Admin Resubmit] Job ${jobId} submitted to Speechmatics with ID: ${result.jobId}`);

      return NextResponse.json({
        success: true,
        message: 'Job submitted for processing (webhook-based)',
        jobId,
        speechmaticsJobId: result.jobId,
        status: 'processing',
        note: 'Transcription will complete asynchronously via webhook callback'
      });
    } else {
      await updateTranscriptionStatusAdmin(jobId, 'failed', {
        specialInstructions: `Resubmit failed: ${result.error || 'Unknown error'}`
      });

      return NextResponse.json({
        success: false,
        error: result.error || 'Speechmatics submission failed',
        jobId,
      }, { status: 500 });
    }

  } catch (error) {
    console.error('[Admin Resubmit] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
