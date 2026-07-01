import type { TranscriptSegment } from '@/lib/firebase/transcriptions-admin';

export type TerminologyIssueType = 'legal-council-counsel' | 'medical-project-term-review';

export interface TerminologyIssue {
  type: TerminologyIssueType;
  message: string;
  segmentIndex?: number;
  term?: string;
}

export interface TerminologyCleanupResult {
  segments: TranscriptSegment[];
  issues: TerminologyIssue[];
  correctionCount: number;
}

const LEGAL_COUNCIL_PATTERNS = [
  /\bcouncil(?=\s+for\s+the\s+(claimant|respondent|applicant|appellant|defendant|plaintiff)\b)/gi,
  /\blegal\s+council\b/gi,
  /\bopposing\s+council\b/gi,
  /\b(claimant|respondent|applicant|appellant|defendant|plaintiff)(['’]s)\s+council\b/gi,
  /\bcouncil(?=\s+(asked|submits|submitted|stated|referred|objected)\b)/gi,
];

const NON_LEGAL_COUNCIL_CONTEXT =
  /\b(city|municipal|band|town|regional)\s+council\b|\bcouncil\s+(meeting|member|members|approved|voted|bylaw)\b/i;

const MEDICAL_CONTEXT_WORDS = [
  'diagnosis',
  'disease',
  'condition',
  'symptom',
  'treatment',
  'medication',
  'prescription',
  'doctor',
  'physician',
  'patient',
  'clinic',
  'hospital',
  'surgery',
  'therapy',
  'blood',
  'scan',
  'test',
  'lab',
  'chronic',
  'acute',
];

const preserveCouncilCapitalization = (match: string) => {
  if (match === match.toUpperCase()) {
    return match.replace(/COUNCIL/g, 'COUNSEL');
  }

  if (/^Council\b/.test(match)) {
    return match.replace(/^Council\b/, 'Counsel');
  }

  return match.replace(/council/gi, 'counsel');
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const hasTerm = (text: string, term: string) => {
  const normalizedTerm = term.trim().replace(/\s+/g, ' ');
  if (!normalizedTerm) return true;

  return new RegExp(`\\b${escapeRegExp(normalizedTerm)}\\b`, 'i').test(text);
};

const isLikelyMedicalTerm = (term: string) => {
  const normalized = term.trim().toLocaleLowerCase();

  if (!normalized || normalized.length < 4) {
    return false;
  }

  return (
    MEDICAL_CONTEXT_WORDS.some((word) => normalized.includes(word)) ||
    /\b(syndrome|disease|itis|emia|oma|pathy|osis|cardia|algia|plasia|sclerosis)\b/i.test(normalized) ||
    /(itis|emia|oma|pathy|osis|cardia|algia|plasia|sclerosis)$/.test(normalized)
  );
};

export function cleanupTerminologySegments(
  segments: TranscriptSegment[],
  options: {
    domain?: string;
    projectDictionaryTerms?: string[];
  }
): TerminologyCleanupResult {
  const issues: TerminologyIssue[] = [];
  let correctionCount = 0;

  const cleanedSegments = segments.map((segment, segmentIndex) => {
    if (options.domain !== 'legal' || !segment.text) {
      return segment;
    }

    let text = segment.text;
    const originalText = text;

    for (const pattern of LEGAL_COUNCIL_PATTERNS) {
      text = text.replace(pattern, preserveCouncilCapitalization);
    }

    if (text !== originalText) {
      correctionCount += 1;
    } else if (/\bcouncil\b/i.test(text) && !NON_LEGAL_COUNCIL_CONTEXT.test(text)) {
      issues.push({
        type: 'legal-council-counsel',
        message: 'Possible legal terminology issue: council/counsel may need review.',
        segmentIndex,
      });
    }

    return text === segment.text ? segment : { ...segment, text };
  });

  if (options.domain === 'medical' && options.projectDictionaryTerms?.length) {
    const transcriptText = cleanedSegments.map((segment) => segment.text).join(' ');
    const seenTerms = new Set<string>();

    for (const term of options.projectDictionaryTerms) {
      const normalizedTerm = term.trim().replace(/\s+/g, ' ');
      const key = normalizedTerm.toLocaleLowerCase();

      if (!normalizedTerm || seenTerms.has(key) || !isLikelyMedicalTerm(normalizedTerm)) {
        continue;
      }

      seenTerms.add(key);

      if (!hasTerm(transcriptText, normalizedTerm)) {
        issues.push({
          type: 'medical-project-term-review',
          message: 'Project medical dictionary term was not found in the completed transcript and may need review.',
          term: normalizedTerm,
        });
      }
    }
  }

  return {
    segments: cleanedSegments,
    issues,
    correctionCount,
  };
}
