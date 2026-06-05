import { NextRequest, NextResponse } from 'next/server';
// Ensure this route runs on Node.js runtime (Buffer, axios, Firebase SDK compatibility)
export const runtime = 'nodejs';
// Set maxDuration to 5 minutes (300s) for Vercel deployment
export const maxDuration = 300;
import { buildProjectDictionaryVocabulary, speechmaticsService, type SpeechmaticsConfig } from '@/lib/speechmatics/service';
import { getTranscriptionByIdAdmin, updateTranscriptionStatusAdmin, TranscriptionMode } from '@/lib/firebase/transcriptions-admin';
import { ProcessTranscriptionJobSchema, validateData } from '@/lib/validation/schemas';

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS(request: NextRequest) {
  const timestamp = new Date().toISOString();
  const headers = {
    'origin': request.headers.get('origin') || 'none',
    'referer': request.headers.get('referer') || 'none',
    'user-agent': request.headers.get('user-agent')?.substring(0, 100) || 'none',
    'x-forwarded-for': request.headers.get('x-forwarded-for') || 'none',
  };

  console.log(`[OPTIONS] ${timestamp} - CORS preflight request`, {
    url: request.url,
    method: request.method,
    headers
  });

  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
}

export async function POST(request: NextRequest) {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const timestamp = new Date().toISOString();

  // CRITICAL: Wrap ENTIRE handler in try-catch to prevent unhandled errors from causing 405
  try {
    // Log detailed request information
    console.log(`[POST][${requestId}] ${timestamp} - Transcription processing request START`, {
      url: request.url,
      method: request.method,
      headers: {
        'content-type': request.headers.get('content-type'),
        'origin': request.headers.get('origin'),
        'referer': request.headers.get('referer'),
        'user-agent': request.headers.get('user-agent')?.substring(0, 100),
        'x-forwarded-for': request.headers.get('x-forwarded-for'),
        'x-real-ip': request.headers.get('x-real-ip'),
        'x-forwarded-proto': request.headers.get('x-forwarded-proto'),
        'host': request.headers.get('host'),
      },
      ip: request.ip || 'unknown',
      geo: {
        country: request.geo?.country,
        region: request.geo?.region,
        city: request.geo?.city,
      }
    });

    // Rate limiting removed - relying on Firebase auth, credit system, and Vercel edge protection
    console.log(`[POST][${requestId}] Processing transcription request...`);

    // Parse and validate request body
    let body: unknown;
    try {
      console.log(`[POST][${requestId}] Parsing request body...`);
      body = await request.json();
      console.log(`[POST][${requestId}] Request body parsed successfully:`, {
        hasJobId: !!(body as any)?.jobId,
        hasLanguage: !!(body as any)?.language,
        hasOperatingPoint: !!(body as any)?.operatingPoint,
        bodyKeys: Object.keys(body as object || {})
      });
    } catch (error) {
      console.error(`[POST][${requestId}] Failed to parse request body:`, error);
      return NextResponse.json(
        { error: 'Invalid JSON in request body', requestId },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    console.log(`[POST][${requestId}] Validating request data...`);
    const validation = validateData(body, ProcessTranscriptionJobSchema);

    if (!validation.success) {
      console.error(`[POST][${requestId}] Validation failed:`, validation.errors);
      return NextResponse.json(
        {
          error: 'Invalid request data',
          details: validation.errors,
          requestId
        },
        { status: 400, headers: { 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const { jobId, language, operatingPoint } = validation.data;

    console.log(`[POST][${requestId}] Request validated successfully`, {
      jobId,
      language,
      operatingPoint
    });

    // Check if Speechmatics is configured
    console.log(`[POST][${requestId}] Checking if Speechmatics is ready...`);
    if (!speechmaticsService.isReady()) {
      console.warn(`[POST][${requestId}] Speechmatics not configured for job ${jobId}. Marking as pending.`);
      
      // Update job status to indicate manual processing needed
      await updateTranscriptionStatusAdmin(jobId, 'pending-transcription', {
        specialInstructions: 'Speechmatics API not configured - requires manual processing'
      });
      
      return NextResponse.json({
        success: false,
        message: 'Speechmatics API not configured. Job marked for manual processing.',
        jobId,
        status: 'pending-transcription',
        requestId
      }, {
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' }
      }); // Return 200 since it's not really an error
    }

    console.log(`[POST][${requestId}] Speechmatics is ready, proceeding with job ${jobId}`);

    // Get the transcription job details
    console.log(`[POST][${requestId}] Fetching transcription job details from database...`);
    const transcriptionJob = await getTranscriptionByIdAdmin(jobId);

    if (!transcriptionJob) {
      console.error(`[POST][${requestId}] Transcription job not found in database: ${jobId}`);
      return NextResponse.json(
        { error: 'Transcription job not found', jobId, requestId },
        {
          status: 404,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    console.log(`[POST][${requestId}] Job details retrieved:`, {
      mode: transcriptionJob.mode,
      status: transcriptionJob.status,
      duration: transcriptionJob.duration,
      hasDownloadURL: !!transcriptionJob.downloadURL
    });

    // Only process AI and hybrid mode jobs
    if (!['ai', 'hybrid'].includes(transcriptionJob.mode)) {
      console.error(`[POST][${requestId}] Invalid mode for this endpoint:`, transcriptionJob.mode);
      return NextResponse.json(
        { error: 'This endpoint only processes AI and hybrid transcription jobs', mode: transcriptionJob.mode, requestId },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // Check if job is already completed
    if (['complete', 'pending-review'].includes(transcriptionJob.status)) {
      console.warn(`[POST][${requestId}] Job already completed:`, transcriptionJob.status);
      return NextResponse.json(
        { error: `Job is already ${transcriptionJob.status}`, status: transcriptionJob.status, requestId },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    // Only process jobs that are in processing status or failed (for retry)
    if (!['processing', 'failed'].includes(transcriptionJob.status)) {
      console.error(`[POST][${requestId}] Invalid job status:`, transcriptionJob.status);
      return NextResponse.json(
        { error: `Cannot process job with status: ${transcriptionJob.status}. Expected 'processing' or 'failed'.`, status: transcriptionJob.status, requestId },
        {
          status: 400,
          headers: { 'Access-Control-Allow-Origin': '*' }
        }
      );
    }

    console.log(`[API] Processing transcription job ${jobId} with mode: ${transcriptionJob.mode}`);
    console.log(`[API] Job details:`, {
      mode: transcriptionJob.mode,
      duration: transcriptionJob.duration,
      status: transcriptionJob.status,
      hasDownloadURL: !!transcriptionJob.downloadURL
    });

    // Ensure status is processing (in case it was failed and we're retrying)
    if (transcriptionJob.status === 'failed') {
      await updateTranscriptionStatusAdmin(jobId, 'processing');
    }

    // Determine processing strategy based on file duration
    // Files longer than 10 minutes (600s) use fetch_data to avoid memory issues
    // Files longer than 5 minutes (300s) use webhook but still download
    // Short files use synchronous processing
    const useFetchData = transcriptionJob.duration
      ? transcriptionJob.duration > 600  // 10 minutes - use URL-based submission
      : true; // Default to fetch_data if duration unknown (safer for large files)

    const useWebhook = transcriptionJob.duration
      ? transcriptionJob.duration > 300  // 5 minutes
      : true; // Default to webhook if duration unknown

    console.log(`[API] File duration: ${transcriptionJob.duration || 'unknown'}s`);
    console.log(`[API] Processing strategy: ${useFetchData ? 'FETCH_DATA (URL-based)' : useWebhook ? 'WEBHOOK (buffer upload)' : 'SYNCHRONOUS'}`);

    const additionalVocab = buildProjectDictionaryVocabulary(transcriptionJob.projectDictionaryTerms);

    if (additionalVocab.length > 0) {
      console.log(`[API] Using project dictionary vocabulary for job ${jobId}: ${additionalVocab.length} terms`);
    }

    const speechmaticsConfig: SpeechmaticsConfig = {
      language,
      operatingPoint,
      enableDiarization: true,
      enablePunctuation: true,
      punctuationSensitivity: 0.6,
      enableEntities: true,
      outputLocale: 'en-GB',
      speakerSensitivity: 0.6,
      domain: transcriptionJob.domain || 'general',
      removeDisfluencies: false,
      additionalVocab: additionalVocab.length > 0 ? additionalVocab : undefined
    };

    let result;

    if (useFetchData) {
      // Use fetch_data for large files - Speechmatics downloads directly from URL
      // This avoids downloading the file to our serverless function
      console.log(`[API] Using fetch_data for large file - Speechmatics will fetch from URL directly`);

      result = await processTranscriptionWithFetchData(
        jobId,
        transcriptionJob.downloadURL,
        transcriptionJob.originalFilename,
        speechmaticsConfig,
        request
      );
    } else if (useWebhook) {
      // For medium files, download and use webhook
      const audioBuffer = await downloadAudioFile(transcriptionJob.downloadURL);

      if (!audioBuffer) {
        console.error(`[POST][${requestId}] Failed to download audio file from Firebase Storage`);
        await updateTranscriptionStatusAdmin(jobId, 'failed', {
          specialInstructions: 'Failed to download audio file'
        });

        return NextResponse.json(
          { error: 'Failed to download audio file', requestId },
          {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
          }
        );
      }

      result = await processTranscriptionWithWebhook(
        jobId,
        audioBuffer,
        transcriptionJob.originalFilename,
        speechmaticsConfig,
        request
      );
    } else {
      // For short files, use synchronous processing
      const audioBuffer = await downloadAudioFile(transcriptionJob.downloadURL);

      if (!audioBuffer) {
        console.error(`[POST][${requestId}] Failed to download audio file from Firebase Storage`);
        await updateTranscriptionStatusAdmin(jobId, 'failed', {
          specialInstructions: 'Failed to download audio file'
        });

        return NextResponse.json(
          { error: 'Failed to download audio file', requestId },
          {
            status: 500,
            headers: { 'Access-Control-Allow-Origin': '*' }
          }
        );
      }

      result = await processTranscriptionSynchronous(
        jobId,
        audioBuffer,
        transcriptionJob.originalFilename,
        speechmaticsConfig
      );
    }

    if (!result.success) {
      const errorMessage = result.error || 'Failed to submit job to Speechmatics';
      let userFriendlyMessage = errorMessage;

      // Check for quota exceeded errors and provide user-friendly message
      if (errorMessage.includes('Enhanced Model transcription') && errorMessage.includes('limit')) {
        userFriendlyMessage = 'Enhanced model quota exceeded. Using standard model automatically.';
      } else if (errorMessage.includes('quota') || errorMessage.includes('limit')) {
        userFriendlyMessage = 'Monthly transcription quota exceeded. Please contact support or wait for next month.';
      }

      await updateTranscriptionStatusAdmin(jobId, 'failed', {
        specialInstructions: userFriendlyMessage
      });

      return NextResponse.json(
        {
          error: userFriendlyMessage,
          technicalError: errorMessage // Keep technical details for debugging
        },
        { status: 500 }
      );
    }

    // Update job with Speechmatics job ID (only for webhook processing)
    // For synchronous processing, the job is already complete, so we don't update it again
    if (useWebhook) {
      await updateTranscriptionStatusAdmin(jobId, 'processing', {
        speechmaticsJobId: result.speechmaticsJobId
      });
    }

    console.log(`[POST][${requestId}] ✅ Processing completed successfully`);

    return NextResponse.json({
      success: true,
      message: useWebhook
        ? 'Transcription job submitted successfully'
        : 'Transcription completed successfully',
      jobId,
      speechmaticsJobId: result.speechmaticsJobId,
      status: useWebhook ? 'processing' : 'complete',
      requestId
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
      }
    });

  } catch (error) {
    console.error(`[POST][${requestId}] ⚠️ CAUGHT ERROR - Preventing 405 crash:`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5) : undefined,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(
      {
        error: 'Failed to process transcription job',
        details: error instanceof Error ? error.message : 'Unknown error',
        requestId
      },
      {
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
        }
      }
    );
  }
}

/**
 * Download audio file from Firebase Storage URL
 */
async function downloadAudioFile(downloadURL: string): Promise<Buffer | null> {
  try {
    console.log(`[API] Downloading audio file from: ${downloadURL.substring(0, 100)}...`);

    const response = await fetch(downloadURL, {
      method: 'GET',
      // Add timeout to prevent hanging
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!response.ok) {
      console.error(`[API] Failed to download audio file:`, {
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        contentLength: response.headers.get('content-length')
      });
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }

    console.log(`[API] Audio file download successful:`, {
      status: response.status,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length')
    });

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log(`[API] Audio file converted to buffer: ${buffer.length} bytes`);
    return buffer;

  } catch (error) {
    console.error('[API] Error downloading audio file:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 3) : undefined
    });
    return null;
  }
}

/**
 * Process transcription synchronously (for shorter files)
 */
async function processTranscriptionSynchronous(
  jobId: string,
  audioBuffer: Buffer,
  filename: string,
  speechmaticsConfig: SpeechmaticsConfig
): Promise<{ success: boolean; speechmaticsJobId?: string; error?: string }> {
  try {
    console.log(`[API] Starting synchronous processing for job ${jobId}`);

    // Use the existing synchronous transcription method
    const result = await speechmaticsService.processTranscriptionJob(
      jobId,
      audioBuffer,
      filename,
      speechmaticsConfig
    );

    console.log(`[API] Synchronous processing completed for job ${jobId}`);
    return { success: true };

  } catch (error) {
    console.error(`[API] Error in synchronous processing for job ${jobId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Synchronous processing failed'
    };
  }
}

/**
 * Process transcription with webhook callback
 */
async function processTranscriptionWithWebhook(
  jobId: string,
  audioBuffer: Buffer,
  filename: string,
  speechmaticsConfig: SpeechmaticsConfig,
  request?: NextRequest
): Promise<{ success: boolean; speechmaticsJobId?: string; error?: string }> {
  try {
    console.log(`[API] Starting webhook-based processing for job ${jobId}`);

    // Determine the base URL dynamically
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    // Ensure the URL has a protocol
    if (baseUrl && !baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
      console.log(`[API] Added https:// protocol to base URL: ${baseUrl}`);
    }

    // Try to get the actual domain from request headers (for server-side)
    if (request) {
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      if (host) {
        const dynamicUrl = `${protocol}://${host}`;
        console.log(`[API] Request headers indicate URL: ${dynamicUrl}`);
        // Use dynamic URL if available
        baseUrl = dynamicUrl;
      }
    }

    // Fallback logic
    if (!baseUrl) {
      console.error('[API] Unable to determine base URL for webhook callback');
      // Only use localhost in development
      if (process.env.NODE_ENV === 'development') {
        baseUrl = 'http://localhost:3002';
        console.log('[API] Using development fallback URL: http://localhost:3002');
      } else {
        return { success: false, error: 'Application URL not configured - webhook callback will fail' };
      }
    }

    console.log(`[API] Final base URL for Speechmatics webhook: ${baseUrl}`);

    const webhookToken = process.env.SPEECHMATICS_WEBHOOK_TOKEN || 'default-webhook-secret';
    const callbackUrl = `${baseUrl}/api/speechmatics/callback?token=${webhookToken}&jobId=${jobId}`;

    // Submit job to Speechmatics with webhook
    const result = await speechmaticsService.submitJobWithWebhook(
      audioBuffer,
      filename,
      speechmaticsConfig,
      callbackUrl
    );

    console.log(`[API] submitJobWithWebhook result for ${jobId}:`, {
      success: result.success,
      speechmaticsJobId: result.jobId,
      error: result.error
    });

    if (result.success && result.jobId) {
      console.log(`[API] Job ${jobId} submitted to Speechmatics with ID: ${result.jobId}`);

      // Store the webhook URL in the database for debugging
      try {
        await updateTranscriptionStatusAdmin(jobId, 'processing', {
          speechmaticsJobId: result.jobId,
          webhookUrl: callbackUrl,
          webhookSubmittedAt: new Date().toISOString()
        });
        console.log(`[API] Stored webhook URL in database: ${callbackUrl}`);
      } catch (error) {
        console.error(`[API] Failed to store webhook URL:`, error);
      }

      return {
        success: true,
        speechmaticsJobId: result.jobId
      };
    } else {
      console.error(`[API] Failed to submit job ${jobId} to Speechmatics:`, result.error);
      return {
        success: false,
        error: result.error || 'Failed to submit job to Speechmatics'
      };
    }

  } catch (error) {
    console.error(`[API] Error submitting transcription job ${jobId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal processing error'
    };
  }
}

/**
 * Process transcription using fetch_data (URL-based submission)
 * This is for large files to avoid downloading to serverless memory
 */
async function processTranscriptionWithFetchData(
  jobId: string,
  audioUrl: string,
  filename: string,
  speechmaticsConfig: SpeechmaticsConfig,
  request?: NextRequest
): Promise<{ success: boolean; speechmaticsJobId?: string; error?: string }> {
  try {
    console.log(`[API] Starting fetch_data processing for job ${jobId}`);
    console.log(`[API] Audio URL: ${audioUrl.substring(0, 100)}...`);

    // Determine the base URL dynamically for webhook callback
    let baseUrl = process.env.NEXT_PUBLIC_APP_URL;

    if (baseUrl && !baseUrl.startsWith('http')) {
      baseUrl = `https://${baseUrl}`;
    }

    if (request) {
      const host = request.headers.get('host');
      const protocol = request.headers.get('x-forwarded-proto') || 'https';
      if (host) {
        baseUrl = `${protocol}://${host}`;
      }
    }

    if (!baseUrl) {
      if (process.env.NODE_ENV === 'development') {
        baseUrl = 'http://localhost:3002';
      } else {
        return { success: false, error: 'Application URL not configured' };
      }
    }

    console.log(`[API] Webhook callback base URL: ${baseUrl}`);

    const webhookToken = process.env.SPEECHMATICS_WEBHOOK_TOKEN || 'default-webhook-secret';
    const callbackUrl = `${baseUrl}/api/speechmatics/callback?token=${webhookToken}&jobId=${jobId}`;

    // Submit job using fetch_data - Speechmatics fetches the file directly
    const result = await speechmaticsService.submitJobWithFetchData(
      audioUrl,
      filename,
      speechmaticsConfig,
      callbackUrl
    );

    console.log(`[API] submitJobWithFetchData result for ${jobId}:`, {
      success: result.success,
      speechmaticsJobId: result.jobId,
      error: result.error
    });

    if (result.success && result.jobId) {
      console.log(`[API] Job ${jobId} submitted via fetch_data with Speechmatics ID: ${result.jobId}`);

      // Update database with Speechmatics job ID
      try {
        await updateTranscriptionStatusAdmin(jobId, 'processing', {
          speechmaticsJobId: result.jobId,
          webhookUrl: callbackUrl,
          webhookSubmittedAt: new Date().toISOString(),
          processingMethod: 'fetch_data'
        });
        console.log(`[API] Updated job ${jobId} with Speechmatics ID and processing method`);
      } catch (error) {
        console.error(`[API] Failed to update job status:`, error);
      }

      return {
        success: true,
        speechmaticsJobId: result.jobId
      };
    } else {
      console.error(`[API] Failed to submit job ${jobId} via fetch_data:`, result.error);
      return {
        success: false,
        error: result.error || 'Failed to submit job to Speechmatics'
      };
    }

  } catch (error) {
    console.error(`[API] Error in fetch_data processing for job ${jobId}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Internal processing error'
    };
  }
}
