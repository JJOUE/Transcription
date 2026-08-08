export const AI_STANDARD_TRANSCRIPT_STYLE_ID = 'standard-speaker-paragraph' as const;
export const APPROVED_TRANSCRIPT_STYLE_IDS = [
  AI_STANDARD_TRANSCRIPT_STYLE_ID,
  'speaker-own-line',
  'question-answer',
  'formal-interview',
  'clean-read',
] as const;

export type TranscriptAccessLevel = 'standard' | 'full';
export interface TranscriptCapabilities {
  accessLevel: TranscriptAccessLevel;
  reason: 'admin' | 'professional-service' | 'free-trial' | 'active-membership' | 'ai-only' | 'historical-compatibility';
  canEditTranscript: boolean;
  canRenameSpeakers: boolean;
  canChangeTimecodes: boolean;
  canUseSearchReplace: boolean;
  canUseAdvancedSpeakerTools: boolean;
  canUseFormattingTools: boolean;
  canChooseTranscriptStyles: boolean;
  canDownload: boolean;
  allowedTranscriptStyleIds: readonly string[];
  effectiveTranscriptStyleId?: string;
}

type EntitlementJob = { mode?: string; billingType?: string; paymentStatus?: string; freeTrialMinutesUsed?: number };
const FULL_CAPABILITIES = {
  accessLevel: 'full' as const, canEditTranscript: true, canRenameSpeakers: true, canChangeTimecodes: true,
  canUseSearchReplace: true, canUseAdvancedSpeakerTools: true, canUseFormattingTools: true,
  canChooseTranscriptStyles: true, canDownload: true, allowedTranscriptStyleIds: APPROVED_TRANSCRIPT_STYLE_IDS,
};
const STANDARD_CAPABILITIES = {
  accessLevel: 'standard' as const, canEditTranscript: false, canRenameSpeakers: true, canChangeTimecodes: true,
  canUseSearchReplace: false, canUseAdvancedSpeakerTools: false, canUseFormattingTools: false,
  canChooseTranscriptStyles: false, canDownload: true, allowedTranscriptStyleIds: [AI_STANDARD_TRANSCRIPT_STYLE_ID],
  effectiveTranscriptStyleId: AI_STANDARD_TRANSCRIPT_STYLE_ID,
};

function isExplicitlyClassifiedAiJob(job: EntitlementJob) {
  return ['ai-free-trial', 'package', 'pay-as-you-go'].includes(String(job.billingType || '')) ||
    ['free-trial', 'paid'].includes(String(job.paymentStatus || '')) || typeof job.freeTrialMinutesUsed === 'number';
}

export function resolveTranscriptCapabilities(input: {
  job: EntitlementJob;
  isAdmin: boolean;
  membershipActive?: boolean;
}): TranscriptCapabilities {
  const { job } = input;
  if (input.isAdmin) return { ...FULL_CAPABILITIES, reason: 'admin' };
  if (job.mode === 'hybrid' || job.mode === 'human') return { ...FULL_CAPABILITIES, reason: 'professional-service' };

  // Unknown and legacy records retain established access. Only explicit,
  // server-billed AI jobs receive the new standard-access restriction.
  if (job.mode !== 'ai' || !isExplicitlyClassifiedAiJob(job)) {
    return { ...FULL_CAPABILITIES, reason: 'historical-compatibility' };
  }
  if (Number(job.freeTrialMinutesUsed || 0) > 0 || job.billingType === 'ai-free-trial' || job.paymentStatus === 'free-trial') {
    return { ...FULL_CAPABILITIES, reason: 'free-trial' };
  }
  if (input.membershipActive === true) {
    return { ...FULL_CAPABILITIES, reason: 'active-membership' };
  }
  return { ...STANDARD_CAPABILITIES, reason: 'ai-only' };
}

export function transcriptStyleAllowed(capabilities: TranscriptCapabilities, styleId: unknown) {
  return typeof styleId === 'string' && capabilities.allowedTranscriptStyleIds.includes(styleId);
}
