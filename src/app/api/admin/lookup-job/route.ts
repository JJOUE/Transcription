import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { buildProjectDictionaryVocabulary, speechmaticsService } from '@/lib/speechmatics/service';
import { updateTranscriptionStatusAdmin, getTranscriptionByIdAdmin } from '@/lib/firebase/transcriptions-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for resubmit operations

/**
 * Admin endpoint to lookup transcription jobs by filename or userId
 * GET /api/admin/lookup-job?filename=HairMax&userId=xxx
 */
export async function GET(request: NextRequest) {
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

    const url = new URL(request.url);
    const filename = url.searchParams.get('filename');
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Build query
    let query: FirebaseFirestore.Query = adminDb.collection('transcriptions');

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('createdAt', 'desc').limit(limit);

    const snapshot = await query.get();

    let jobs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        originalFilename: data.originalFilename,
        status: data.status,
        mode: data.mode,
        duration: data.duration,
        userId: data.userId,
        speechmaticsJobId: data.speechmaticsJobId || null,
        downloadURL: data.downloadURL || null,
        filePath: data.filePath || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
        error: data.specialInstructions || null,
        hasTranscript: !!data.transcript,
        creditsUsed: data.creditsUsed || 0,
      };
    });

    // Filter by filename if provided (client-side filter since Firestore doesn't support contains)
    if (filename) {
      jobs = jobs.filter(job =>
        job.originalFilename?.toLowerCase().includes(filename.toLowerCase())
      );
    }

    // Get user info for the jobs
    const userIds = [...new Set(jobs.map(j => j.userId))];
    const userEmails: Record<string, string> = {};

    for (const uid of userIds) {
      try {
        const userDoc = await adminDb.collection('users').doc(uid).get();
        if (userDoc.exists) {
          userEmails[uid] = userDoc.data()?.email || 'unknown';
        }
      } catch (e) {
        userEmails[uid] = 'error fetching';
      }
    }

    // Add email to jobs and check file accessibility
    const jobsWithEmail = await Promise.all(jobs.map(async (job) => {
      let fileAccessible = null;
      let fileSize = null;

      // Check if file is accessible (only for first few jobs to avoid timeout)
      if (job.downloadURL && jobs.indexOf(job) < 3) {
        try {
          const headResponse = await fetch(job.downloadURL, {
            method: 'HEAD',
            signal: AbortSignal.timeout(5000)
          });
          fileAccessible = headResponse.ok;
          fileSize = headResponse.headers.get('content-length');
        } catch (e) {
          fileAccessible = false;
        }
      }

      return {
        ...job,
        userEmail: userEmails[job.userId] || 'unknown',
        fileAccessible,
        fileSize: fileSize ? `${Math.round(parseInt(fileSize) / 1024 / 1024)} MB` : null,
      };
    }));

    return NextResponse.json({
      count: jobsWithEmail.length,
      query: { filename, userId, status, limit },
      jobs: jobsWithEmail,
    });

  } catch (error) {
    console.error('[Admin Lookup Job] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * POST /api/admin/lookup-job - Resubmit a stuck job to Speechmatics
 * Body: { jobId: string, action: 'resubmit' }
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
    const { jobId, action, language = 'en' } = body;

    if (!jobId || action !== 'resubmit') {
      return NextResponse.json({
        error: 'Invalid request. Required: { jobId: string, action: "resubmit" }'
      }, { status: 400 });
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
