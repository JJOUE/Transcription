export const PROFESSIONAL_FINISHED_FILE_REQUIRED_MESSAGE =
  'Upload the finished transcript before marking this professional project complete.';

type CompletionJob = {
  status?: string;
  type?: string;
  mode?: string;
  userId?: string;
  serviceCategory?: string;
  professionalWorkflow?: string;
  finishedTranscriptPath?: string;
};

export function isManagedProfessionalTranscription(job: CompletionJob) {
  return job.serviceCategory === 'professional-transcription' &&
    job.professionalWorkflow === 'managed-delivery' &&
    (job.mode === 'hybrid' || job.mode === 'human');
}

export function professionalCompletionCheck(jobId: string, job: CompletionJob) {
  if (job.status === 'complete' || !isManagedProfessionalTranscription(job)) {
    return { allowed: true, requiresStorageVerification: false } as const;
  }

  const expectedPrefix = `transcriptions/${job.userId}/${jobId}/finished-transcript/`;
  const path = typeof job.finishedTranscriptPath === 'string' ? job.finishedTranscriptPath : '';
  if (!job.userId || !path.startsWith(expectedPrefix)) {
    return {
      allowed: false,
      requiresStorageVerification: false,
      error: PROFESSIONAL_FINISHED_FILE_REQUIRED_MESSAGE,
    } as const;
  }

  return { allowed: true, requiresStorageVerification: true, path } as const;
}
