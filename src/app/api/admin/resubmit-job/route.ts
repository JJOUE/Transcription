import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { speechmaticsService } from '@/lib/speechmatics/service';
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

    // Download the audio file
    console.log(`[Admin Resubmit] Downloading audio from: ${job.downloadURL}`);

    const audioResponse = await fetch(job.downloadURL);
    if (!audioResponse.ok) {
      return NextResponse.json({
        error: `Failed to download audio file: ${audioResponse.status}`
      }, { status: 500 });
    }

    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    console.log(`[Admin Resubmit] Downloaded ${audioBuffer.length} bytes`);

    // Update status to processing
    await updateTranscriptionStatusAdmin(jobId, 'processing');

    // Submit to Speechmatics
    console.log(`[Admin Resubmit] Submitting to Speechmatics...`);

    const result = await speechmaticsService.transcribeAudio(
      audioBuffer,
      job.originalFilename,
      {
        language,
        operatingPoint: 'standard',
        enableDiarization: true,
        enablePunctuation: true,
        domain: job.domain || 'general',
      }
    );

    if (result.success && result.transcript) {
      const finalStatus = job.mode === 'hybrid' ? 'pending-review' : 'complete';

      await updateTranscriptionStatusAdmin(jobId, finalStatus, {
        transcript: result.transcript,
        timestampedTranscript: result.timestampedTranscript,
        speechmaticsJobId: result.jobId,
      });

      console.log(`[Admin Resubmit] Job ${jobId} completed successfully`);

      return NextResponse.json({
        success: true,
        message: 'Job resubmitted and completed',
        jobId,
        status: finalStatus,
        transcriptPreview: result.transcript?.substring(0, 200) + '...',
      });
    } else {
      await updateTranscriptionStatusAdmin(jobId, 'failed', {
        specialInstructions: `Resubmit failed: ${result.error || 'Unknown error'}`
      });

      return NextResponse.json({
        success: false,
        error: result.error || 'Speechmatics transcription failed',
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
