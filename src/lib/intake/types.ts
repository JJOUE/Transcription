export const GUIDED_INTAKE_STORAGE_KEY = 'ttc-guided-intake-v1';

export type IntakeOutcome =
  | 'transcript'
  | 'transcript-document'
  | 'dictation-document'
  | 'copy-typing'
  | 'handwriting'
  | 'unsure';

export type IntakeService = 'ai' | 'hybrid' | 'human';

export interface GuidedIntakeDraft {
  version: 1;
  outcome?: IntakeOutcome;
  service?: IntakeService;
  speakerCount?: number;
  rushRequested?: boolean;
  transcriptStyle?: string;
  timestampsRequested?: boolean;
  speakerLabelsRequested?: boolean;
  instructions?: string;
  documentInstructions?: string;
  requestedOutputFormat?: string;
  preferredFilename?: string;
  selectedSourceFileNames?: string[];
  selectedTemplateFileName?: string;
  selectedSupportingFileNames?: string[];
  updatedAt: string;
}

export function createEmptyGuidedIntakeDraft(): GuidedIntakeDraft {
  return { version: 1, updatedAt: new Date().toISOString() };
}
