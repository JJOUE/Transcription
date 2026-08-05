/**
 * Client-side API functions for transcription operations
 * These functions call server-side API endpoints instead of directly accessing Firestore
 */

import { TranscriptionJob, TranscriptionMode } from '@/lib/firebase/transcriptions';

/**
 * Create a new transcription job via API endpoint
 */
export async function createTranscriptionJobAPI(
  job: Omit<TranscriptionJob, 'id' | 'createdAt' | 'updatedAt' | 'userId'>
): Promise<string> {
  try {
    console.log('Creating transcription job:', job);

    const response = await fetch('/api/transcriptions/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify(job),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    console.log('API Response:', data);

    if (!data.success || !data.jobId) {
      throw new Error('Invalid API response');
    }

    return data.jobId;
  } catch (error) {
    console.error('Error creating transcription job:', error);
    throw error;
  }
}

export async function submitDocumentWorkspaceJobAPI(
  job: Omit<TranscriptionJob, 'id' | 'createdAt' | 'updatedAt'>,
  submissionKey: string,
  billingMinutes: number
): Promise<{ jobId: string; quoteRequired: boolean; duplicate: boolean }> {
  const response = await fetch('/api/document-workspace/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ job, submissionKey, billingMinutes }),
  });
  const data = await response.json();
  if (!response.ok || !data.ok || !data.jobId) {
    throw new Error(data.error || `Document Workspace submission failed (${response.status})`);
  }
  return {
    jobId: data.jobId,
    quoteRequired: Boolean(data.quoteRequired),
    duplicate: Boolean(data.duplicate),
  };
}

/**
 * Process a transcription job via API endpoint
 */
export async function processTranscriptionJobAPI(jobId: string): Promise<void> {
  try {
    const response = await fetch('/api/transcriptions/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({ jobId }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      console.warn('Transcription processing warning:', data.message);
    }
  } catch (error) {
    console.error('Error processing transcription job:', error);
    throw error;
  }
}


/**
 * Get mode details (no API call needed, static data)
 */
export { getModeDetails } from '@/lib/firebase/transcriptions';
