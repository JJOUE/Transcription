import axios from 'axios';
import FormData from 'form-data';
import { TranscriptionJob, TranscriptionStatus, updateTranscriptionStatusAdmin, getTranscriptionByIdAdmin, TranscriptSegment } from '../firebase/transcriptions-admin';
import { cleanupTerminologySegments } from '../utils/terminology-cleanup';

export interface SpeechmaticsAdditionalVocabEntry {
  content: string;
  sounds_like?: string[];
}

export interface SpeechmaticsConfig {
  language?: string;
  operatingPoint?: 'standard' | 'enhanced';
  enableDiarization?: boolean;
  enablePunctuation?: boolean;
  punctuationSensitivity?: number; // Speechmatics punctuation sensitivity (0-1, default 0.5)
  enableEntities?: boolean; // Include entity metadata for numbers, dates, currency, etc.
  outputLocale?: string; // Output spelling/format locale, e.g. en-GB for Canadian conventions
  maxSpeakers?: number; // Only available for real-time API (not batch API)
  speakerSensitivity?: number; // Speaker sensitivity (0-1, default 0.5) - available for batch API
  domain?: 'general' | 'medical' | 'legal'; // Domain-specific vocabulary
  removeDisfluencies?: boolean; // Remove filler words (um, uh, etc.) - English only
  additionalVocab?: SpeechmaticsAdditionalVocabEntry[];
}

export interface SpeechmaticsResult {
  success: boolean;
  transcript?: string;
  timestampedTranscript?: TranscriptSegment[]; // New field for timestamped data
  terminologyIssues?: ReturnType<typeof cleanupTerminologySegments>['issues'];
  duration?: number;
  speakers?: number;
  confidence?: number;
  jobId?: string;
  error?: string;
}

// Domain-specific vocabulary for improved accuracy
const MEDICAL_VOCABULARY = [
  // Common medical terms
  { content: "hypertension" },
  { content: "myocardial infarction" },
  { content: "electrocardiogram", sounds_like: ["ECG", "EKG"] },
  { content: "sphygmomanometer" },
  { content: "stethoscope" },
  { content: "auscultation" },
  { content: "palpitation" },
  { content: "bradycardia" },
  { content: "tachycardia" },
  { content: "arrhythmia" },
  { content: "systolic" },
  { content: "diastolic" },
  { content: "hemoglobin" },
  { content: "hematocrit" },
  { content: "leukocytes" },
  { content: "erythrocytes" },
  { content: "thrombocytes" },
  { content: "lymphocytes" },
  { content: "neutrophils" },
  { content: "eosinophils" },
  { content: "basophils" },
  { content: "platelets" },
  { content: "fibrinogen" },
  { content: "prothrombin" },
  { content: "creatinine" },
  { content: "creatine kinase" },
  { content: "troponin" },
  { content: "cholesterol" },
  { content: "triglycerides" },
  { content: "glucose" },
  { content: "insulin" },
  { content: "diabetes mellitus" },
  { content: "type 1 diabetes", sounds_like: ["type one diabetes"] },
  { content: "type 2 diabetes", sounds_like: ["type two diabetes"] },
  { content: "hyperglycemia" },
  { content: "hypoglycemia" },
  { content: "pneumonia" },
  { content: "bronchitis" },
  { content: "asthma" },
  { content: "chronic obstructive pulmonary disease", sounds_like: ["COPD"] },
  { content: "multiple sclerosis", sounds_like: ["MS"] },
  { content: "Parkinson's disease", sounds_like: ["Parkinsons disease"] },
  { content: "Alzheimer's disease", sounds_like: ["Alzheimers disease"] },
  { content: "Crohn's disease", sounds_like: ["Crohns disease"] },
  { content: "ulcerative colitis" },
  { content: "rheumatoid arthritis" },
  { content: "osteoarthritis" },
  { content: "osteoporosis" },
  { content: "fibromyalgia" },
  { content: "migraine" },
  { content: "epilepsy" },
  { content: "stroke" },
  { content: "transient ischemic attack", sounds_like: ["TIA"] },
  { content: "coronary artery disease" },
  { content: "congestive heart failure" },
  { content: "chronic kidney disease" },
  { content: "hypothyroidism" },
  { content: "hyperthyroidism" },
  { content: "emphysema" },
  { content: "fibrosis" },
  { content: "pneumothorax" },
  { content: "pleurisy" },
  { content: "dyspnea" },
  { content: "orthopnea" },
  { content: "cyanosis" },
  { content: "anemia" },
  { content: "leukemia" },
  { content: "lymphoma" },
  { content: "carcinoma" },
  { content: "metastasis" },
  { content: "biopsy" },
  { content: "chemotherapy" },
  { content: "radiotherapy" },
  { content: "oncology" },
  { content: "cardiology" },
  { content: "neurology" },
  { content: "gastroenterology" },
  { content: "endocrinology" },
  { content: "nephrology" },
  { content: "rheumatology" },
  { content: "dermatology" },
  { content: "ophthalmology" },
  { content: "otolaryngology" },
  { content: "psychiatry" },
  { content: "anesthesiology" },
  { content: "pathology" },
  { content: "radiology" },
  { content: "surgery" },
  { content: "laparoscopy" },
  { content: "endoscopy" },
  { content: "arthroscopy" },
  { content: "catheterization" },
  { content: "intubation" },
  { content: "ventilation" },
  { content: "defibrillation" },
  { content: "resuscitation" },
  { content: "epidural" },
  { content: "spinal anesthesia" },
  { content: "general anesthesia" },
  { content: "sedation" },
  { content: "analgesic" },
  { content: "antibiotic" },
  { content: "antiviral" },
  { content: "antifungal" },
  { content: "immunosuppressant" },
  { content: "corticosteroid" },
  { content: "beta blocker" },
  { content: "ACE inhibitor" },
  { content: "diuretic" },
  { content: "anticoagulant" },
  { content: "antiplatelet" },
  { content: "statin" },
  { content: "metformin" },
  { content: "levothyroxine" },
  { content: "prednisone" },
  { content: "ibuprofen" },
  { content: "acetaminophen" },
  { content: "morphine" },
  { content: "fentanyl" },
  { content: "midazolam" },
  { content: "propofol" },
  { content: "lidocaine" },
  { content: "epinephrine" },
  { content: "norepinephrine" },
  { content: "dopamine" },
  { content: "vasopressin" }
];

const LEGAL_VOCABULARY = [
  // Common legal terms
  { content: "plaintiff" },
  { content: "defendant" },
  { content: "appellant" },
  { content: "appellee" },
  { content: "petitioner" },
  { content: "respondent" },
  { content: "counsel", sounds_like: ["council"] },
  { content: "legal counsel", sounds_like: ["legal council"] },
  { content: "opposing counsel", sounds_like: ["opposing council"] },
  { content: "duty counsel", sounds_like: ["duty council"] },
  { content: "counsel for the claimant", sounds_like: ["council for the claimant"] },
  { content: "counsel for the applicant", sounds_like: ["council for the applicant"] },
  { content: "counsel for the appellant", sounds_like: ["council for the appellant"] },
  { content: "counsel for the defendant", sounds_like: ["council for the defendant"] },
  { content: "counsel for the plaintiff", sounds_like: ["council for the plaintiff"] },
  { content: "counsel for the respondent", sounds_like: ["council for the respondent"] },
  { content: "counsel's submissions", sounds_like: ["council's submissions"] },
  { content: "claimant's counsel", sounds_like: ["claimant's council"] },
  { content: "respondent's counsel", sounds_like: ["respondent's council"] },
  { content: "applicant's counsel", sounds_like: ["applicant's council"] },
  { content: "appellant's counsel", sounds_like: ["appellant's council"] },
  { content: "defendant's counsel", sounds_like: ["defendant's council"] },
  { content: "plaintiff's counsel", sounds_like: ["plaintiff's council"] },
  { content: "deposition" },
  { content: "interrogatory" },
  { content: "subpoena" },
  { content: "voir dire" },
  { content: "habeas corpus" },
  { content: "res ipsa loquitur" },
  { content: "prima facie" },
  { content: "in camera" },
  { content: "ex parte" },
  { content: "amicus curiae" },
  { content: "certiorari" },
  { content: "mandamus" },
  { content: "injunction" },
  { content: "restraining order" },
  { content: "summary judgment" },
  { content: "motion to dismiss" },
  { content: "motion for summary judgment" },
  { content: "motion in limine" },
  { content: "directed verdict" },
  { content: "judgment notwithstanding the verdict" },
  { content: "res judicata" },
  { content: "collateral estoppel" },
  { content: "statute of limitations" },
  { content: "statute of frauds" },
  { content: "parol evidence rule" },
  { content: "breach of contract" },
  { content: "specific performance" },
  { content: "liquidated damages" },
  { content: "punitive damages" },
  { content: "compensatory damages" },
  { content: "consequential damages" },
  { content: "incidental damages" },
  { content: "mitigation of damages" },
  { content: "negligence" },
  { content: "gross negligence" },
  { content: "strict liability" },
  { content: "proximate cause" },
  { content: "assumption of risk" },
  { content: "comparative negligence" },
  { content: "contributory negligence" },
  { content: "vicarious liability" },
  { content: "respondeat superior" },
  { content: "joint and several liability" },
  { content: "indemnification" },
  { content: "tort" },
  { content: "battery" },
  { content: "assault" },
  { content: "false imprisonment" },
  { content: "intentional infliction of emotional distress" },
  { content: "defamation" },
  { content: "libel" },
  { content: "slander" },
  { content: "invasion of privacy" },
  { content: "trespass" },
  { content: "conversion" },
  { content: "nuisance" },
  { content: "easement" },
  { content: "covenant" },
  { content: "lien" },
  { content: "mortgage" },
  { content: "deed" },
  { content: "title" },
  { content: "escrow" },
  { content: "consideration" },
  { content: "offer" },
  { content: "acceptance" },
  { content: "counteroffer" },
  { content: "revocation" },
  { content: "capacity" },
  { content: "duress" },
  { content: "undue influence" },
  { content: "misrepresentation" },
  { content: "fraud" },
  { content: "mistake" },
  { content: "impossibility" },
  { content: "frustration of purpose" },
  { content: "force majeure" },
  { content: "arbitration" },
  { content: "mediation" },
  { content: "litigation" },
  { content: "discovery" },
  { content: "due process" },
  { content: "equal protection" },
  { content: "probable cause" },
  { content: "reasonable suspicion" },
  { content: "Miranda rights" },
  { content: "Fifth Amendment" },
  { content: "Sixth Amendment" },
  { content: "Fourteenth Amendment" },
  { content: "search and seizure" },
  { content: "warrant" },
  { content: "affidavit" },
  { content: "indictment" },
  { content: "arraignment" },
  { content: "plea bargain" },
  { content: "nolo contendere" },
  { content: "allocution" },
  { content: "sentencing" },
  { content: "probation" },
  { content: "parole" },
  { content: "restitution" },
  { content: "expungement" },
  { content: "felony" },
  { content: "misdemeanor" },
  { content: "infraction" },
  { content: "jurisdiction" },
  { content: "venue" },
  { content: "standing" },
  { content: "justiciability" },
  { content: "ripeness" },
  { content: "mootness" },
  { content: "precedent" },
  { content: "stare decisis" },
  { content: "dicta" },
  { content: "holding" }
];

const MAX_ADDITIONAL_VOCAB_ENTRIES = 1000;
const MAX_ADDITIONAL_VOCAB_WORDS = 6;

export function buildProjectDictionaryVocabulary(terms?: string[]): SpeechmaticsAdditionalVocabEntry[] {
  if (!terms?.length) {
    return [];
  }

  const seen = new Set<string>();
  const entries: SpeechmaticsAdditionalVocabEntry[] = [];

  for (const term of terms) {
    const content = term.trim().replace(/\s+/g, ' ');
    const normalizedKey = content.toLocaleLowerCase();
    const wordCount = content.split(/\s+/).filter(Boolean).length;

    if (!content || seen.has(normalizedKey) || wordCount > MAX_ADDITIONAL_VOCAB_WORDS) {
      continue;
    }

    seen.add(normalizedKey);
    entries.push({ content });

    if (entries.length >= MAX_ADDITIONAL_VOCAB_ENTRIES) {
      break;
    }
  }

  return entries;
}

function getDomainVocabulary(domain?: SpeechmaticsConfig['domain']): SpeechmaticsAdditionalVocabEntry[] {
  if (domain === 'medical') {
    return MEDICAL_VOCABULARY;
  }

  if (domain === 'legal') {
    return LEGAL_VOCABULARY;
  }

  return [];
}

function buildAdditionalVocabulary(config: SpeechmaticsConfig): SpeechmaticsAdditionalVocabEntry[] {
  const seen = new Set<string>();
  const mergedVocabulary: SpeechmaticsAdditionalVocabEntry[] = [];
  const addEntries = (entries: SpeechmaticsAdditionalVocabEntry[]) => {
    for (const entry of entries) {
      const content = entry.content.trim().replace(/\s+/g, ' ');
      const key = content.toLocaleLowerCase();

      if (!content || seen.has(key) || mergedVocabulary.length >= MAX_ADDITIONAL_VOCAB_ENTRIES) {
        continue;
      }

      seen.add(key);
      mergedVocabulary.push({
        content,
        ...(entry.sounds_like?.length ? { sounds_like: entry.sounds_like } : {})
      });
    }
  };

  addEntries(config.additionalVocab || []);
  addEntries(getDomainVocabulary(config.domain));

  return mergedVocabulary;
}

function summarizeVocabularyUse(config: SpeechmaticsConfig, additionalVocabulary: SpeechmaticsAdditionalVocabEntry[]) {
  const projectTermCount = config.additionalVocab?.length || 0;
  const domainTermCount = getDomainVocabulary(config.domain).length;

  if (projectTermCount > 0) {
    console.log(`[Speechmatics] Using project dictionary vocabulary: ${projectTermCount} terms`);
  }

  if (domainTermCount > 0) {
    console.log(`[Speechmatics] Using ${config.domain} vocabulary: ${domainTermCount} terms`);
  } else {
    console.log(`[Speechmatics] Using general vocabulary`);
  }

  if (additionalVocabulary.length > 0) {
    console.log(`[Speechmatics] Total additional_vocab entries: ${additionalVocabulary.length}`);
  }
}

function clampSpeechmaticsSensitivity(value: number) {
  return Math.min(Math.max(value, 0), 1);
}

function createBaseTranscriptionConfig(config: SpeechmaticsConfig, operatingPointOverride?: SpeechmaticsConfig['operatingPoint']) {
  const transcriptionConfig: any = {
    language: config.language || 'en',
    operating_point: operatingPointOverride || config.operatingPoint || 'standard',
    output_locale: config.outputLocale || 'en-GB'
  };

  if (config.enableEntities) {
    transcriptionConfig.enable_entities = true;
  }

  if (config.enablePunctuation !== false && config.punctuationSensitivity !== undefined) {
    transcriptionConfig.punctuation_overrides = {
      sensitivity: clampSpeechmaticsSensitivity(config.punctuationSensitivity)
    };
  }

  return transcriptionConfig;
}

function redactVocabularyForLog(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactVocabularyForLog);
  }

  if (!value || typeof value !== 'object') {
    return value;
  }

  const record = value as Record<string, unknown>;
  const redacted: Record<string, unknown> = {};

  for (const [key, entryValue] of Object.entries(record)) {
    if (key === 'additional_vocab' && Array.isArray(entryValue)) {
      redacted[key] = `[${entryValue.length} entries redacted]`;
    } else {
      redacted[key] = redactVocabularyForLog(entryValue);
    }
  }

  return redacted;
}

export class SpeechmaticsService {
  private apiKey: string;
  private apiUrl: string;
  private isConfigured: boolean;
  // Force recompilation to ensure debug changes take effect

  constructor() {
    this.apiKey = process.env.SPEECHMATICS_API_KEY || '';
    this.apiUrl = process.env.SPEECHMATICS_API_URL || 'https://asr.api.speechmatics.com/v2';
    this.isConfigured = !!this.apiKey;

    console.log(`[Speechmatics] Initializing service...`);
    console.log(`[Speechmatics] API URL: ${this.apiUrl}`);
    console.log(`[Speechmatics] API Key present: ${this.isConfigured}`);
    console.log(`[Speechmatics] API Key length: ${this.apiKey.length}`);

    if (!this.isConfigured) {
      console.warn('[Speechmatics] SPEECHMATICS_API_KEY environment variable is missing. Speechmatics functionality will be disabled.');
    } else {
      console.log('[Speechmatics] Service initialized successfully');
    }
  }

  /**
   * Check if Speechmatics is properly configured
   */
  isReady(): boolean {
    return this.isConfigured;
  }

  /**
   * Submit job via URL using fetch_data (no file download required)
   * This is the recommended approach for large files to avoid serverless memory limits
   */
  async submitJobWithFetchData(
    audioUrl: string,
    filename: string,
    config: SpeechmaticsConfig,
    callbackUrl: string
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      console.log(`[Speechmatics] ====== SUBMITTING JOB WITH FETCH_DATA ======`);
      console.log(`[Speechmatics] Audio URL: ${audioUrl.substring(0, 100)}...`);
      console.log(`[Speechmatics] Callback URL: ${callbackUrl}`);
      console.log(`[Speechmatics] Timestamp: ${new Date().toISOString()}`);

      if (!this.isConfigured) {
        return {
          success: false,
          error: 'Speechmatics API is not configured'
        };
      }

      // Create job configuration with webhook and diarization
      const transcriptionConfig = createBaseTranscriptionConfig(config);

      // Add speaker diarization if enabled
      if (config.enableDiarization) {
        transcriptionConfig.diarization = 'speaker';

        if (config.speakerSensitivity !== undefined) {
          transcriptionConfig.speaker_diarization_config = {
            speaker_sensitivity: Math.min(Math.max(config.speakerSensitivity, 0), 1)
          };
        }
      }

      const additionalVocabulary = buildAdditionalVocabulary(config);
      if (additionalVocabulary.length > 0) {
        transcriptionConfig.additional_vocab = additionalVocabulary;
      }
      summarizeVocabularyUse(config, additionalVocabulary);

      // Add disfluency filtering
      if (config.removeDisfluencies !== undefined) {
        transcriptionConfig.transcript_filtering_config = {
          remove_disfluencies: config.removeDisfluencies
        };
        console.log(`[Speechmatics] Disfluency removal: ${config.removeDisfluencies ? 'ENABLED' : 'DISABLED'}`);
      }

      // Job config using fetch_data instead of file upload
      const jobConfig = {
        type: 'transcription',
        transcription_config: transcriptionConfig,
        fetch_data: {
          url: audioUrl
        },
        notification_config: [{
          url: callbackUrl,
          contents: ['jobinfo'],
          auth_headers: [
            'ngrok-skip-browser-warning: true'
          ]
        }]
      };

      console.log(`[Speechmatics] Job config:`, JSON.stringify(redactVocabularyForLog(jobConfig), null, 2));

      // Speechmatics requires multipart/form-data even for fetch_data
      const boundary = `----speechmatics${Date.now()}`;
      const configJson = JSON.stringify(jobConfig);

      const formParts = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="config"',
        'Content-Type: application/json',
        '',
        configJson,
        `--${boundary}--`
      ];

      const formData = Buffer.from(formParts.join('\r\n'), 'utf8');

      const response = await fetch(`${this.apiUrl}/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Speechmatics] Job submission failed:`, errorText);

        // Check if this is an enhanced model quota limit error
        if (response.status === 403 && errorText.includes('Enhanced Model transcription')) {
          console.log('[Speechmatics] Enhanced model quota exceeded, retrying with standard model...');

          const fallbackConfig = {
            ...jobConfig,
            transcription_config: {
              ...transcriptionConfig,
              operating_point: 'standard'
            }
          };

          const fallbackConfigJson = JSON.stringify(fallbackConfig);
          const fallbackFormParts = [
            `--${boundary}`,
            'Content-Disposition: form-data; name="config"',
            'Content-Type: application/json',
            '',
            fallbackConfigJson,
            `--${boundary}--`
          ];

          const fallbackFormData = Buffer.from(fallbackFormParts.join('\r\n'), 'utf8');

          const fallbackResponse = await fetch(`${this.apiUrl}/jobs`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': `multipart/form-data; boundary=${boundary}`
            },
            body: fallbackFormData
          });

          if (!fallbackResponse.ok) {
            const fallbackErrorText = await fallbackResponse.text();
            throw new Error(`HTTP ${fallbackResponse.status}: ${fallbackErrorText}`);
          }

          const fallbackData = await fallbackResponse.json();
          console.log(`[Speechmatics] Fallback job submitted with ID: ${fallbackData.id}`);

          return {
            success: true,
            jobId: fallbackData.id
          };
        }

        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      console.log(`[Speechmatics] Job submitted successfully with ID: ${responseData.id}`);

      return {
        success: true,
        jobId: responseData.id
      };

    } catch (error: unknown) {
      console.error('[Speechmatics] Job submission with fetch_data failed:', error);

      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Submit job with webhook callback (async) - uploads file buffer
   * Use submitJobWithFetchData for large files to avoid memory limits
   */
  async submitJobWithWebhook(
    audioBuffer: Buffer,
    filename: string,
    config: SpeechmaticsConfig,
    callbackUrl: string
  ): Promise<{ success: boolean; jobId?: string; error?: string }> {
    try {
      console.log(`[Speechmatics] ====== SUBMITTING JOB WITH WEBHOOK ======`);
      console.log(`[Speechmatics] Callback URL: ${callbackUrl}`);
      console.log(`[Speechmatics] Timestamp: ${new Date().toISOString()}`);

      // Create job configuration with webhook and diarization
      const transcriptionConfig = createBaseTranscriptionConfig(config);

      // Add speaker diarization if enabled
      if (config.enableDiarization) {
        transcriptionConfig.diarization = 'speaker';

        // Add speaker diarization configuration (batch API only supports speaker_sensitivity)
        if (config.speakerSensitivity !== undefined) {
          transcriptionConfig.speaker_diarization_config = {
            speaker_sensitivity: Math.min(Math.max(config.speakerSensitivity, 0), 1)
          };
        }
      }

      const additionalVocabulary = buildAdditionalVocabulary(config);
      if (additionalVocabulary.length > 0) {
        transcriptionConfig.additional_vocab = additionalVocabulary;
      }
      summarizeVocabularyUse(config, additionalVocabulary);

      // Add transcript filtering configuration for disfluencies (filler words)
      if (config.removeDisfluencies !== undefined) {
        transcriptionConfig.transcript_filtering_config = {
          remove_disfluencies: config.removeDisfluencies
        };
        console.log(`[Speechmatics] Disfluency removal: ${config.removeDisfluencies ? 'ENABLED' : 'DISABLED'}`);
      }

      const jobConfig = {
        type: 'transcription',
        transcription_config: transcriptionConfig,
        notification_config: [{
          url: callbackUrl,
          // Don't include 'transcript' in contents - it's too large for Vercel 4.5MB limit
          // Webhook will just notify job status, then we fetch transcript from API
          contents: ['jobinfo'],  // Only send job info, not full transcript (avoids 413 error)
          auth_headers: [
            'ngrok-skip-browser-warning: true'  // Skip ngrok browser warning for webhooks
          ]
        }]
      };

      console.log(`[Speechmatics] Job config:`, JSON.stringify(redactVocabularyForLog(jobConfig), null, 2));
      console.log(`[Speechmatics] transcriptionConfig object:`, JSON.stringify(redactVocabularyForLog(transcriptionConfig), null, 2));

      // Create multipart form data manually for Node.js compatibility
      const boundary = `----speechmatics${Date.now()}`;
      const configJson = JSON.stringify(jobConfig);

      const formParts = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="config"',
        'Content-Type: application/json',
        '',
        configJson,
        `--${boundary}`,
        `Content-Disposition: form-data; name="data_file"; filename="${filename}"`,
        'Content-Type: audio/wav',
        '',
      ];

      const formHeader = Buffer.from(formParts.join('\r\n') + '\r\n', 'utf8');
      const formFooter = Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8');
      const formData = Buffer.concat([formHeader, audioBuffer, formFooter]);

      // Submit the job using fetch instead of axios for better Buffer support
      const response = await fetch(`${this.apiUrl}/jobs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': formData.length.toString()
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();

        // Check if this is an enhanced model quota limit error
        if (response.status === 403 && errorText.includes('Enhanced Model transcription')) {
          console.log('[Speechmatics] Enhanced model quota exceeded, retrying with standard model...');

          // Retry with standard operating point
          const fallbackConfig = {
            ...jobConfig,
            transcription_config: {
              ...jobConfig.transcription_config,
              operating_point: 'standard'
            }
          };

          const fallbackConfigJson = JSON.stringify(fallbackConfig);
          const fallbackFormParts = [
            `--${boundary}`,
            'Content-Disposition: form-data; name="config"',
            'Content-Type: application/json',
            '',
            fallbackConfigJson,
            `--${boundary}`,
            `Content-Disposition: form-data; name="data_file"; filename="${filename}"`,
            'Content-Type: audio/wav',
            '',
          ];

          const fallbackFormHeader = Buffer.from(fallbackFormParts.join('\r\n') + '\r\n', 'utf8');
          const fallbackFormData = Buffer.concat([fallbackFormHeader, audioBuffer, formFooter]);

          console.log('[Speechmatics] Retrying with standard model config:', JSON.stringify(redactVocabularyForLog(fallbackConfig), null, 2));

          const fallbackResponse = await fetch(`${this.apiUrl}/jobs`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': `multipart/form-data; boundary=${boundary}`,
              'Content-Length': fallbackFormData.length.toString()
            },
            body: fallbackFormData
          });

          if (!fallbackResponse.ok) {
            const fallbackErrorText = await fallbackResponse.text();
            throw new Error(`HTTP ${fallbackResponse.status}: ${fallbackErrorText}`);
          }

          const fallbackResponseData = await fallbackResponse.json();
          const speechmaticsJobId = fallbackResponseData.id;
          console.log(`[Speechmatics] Fallback job submitted successfully with ID: ${speechmaticsJobId}`);

          return {
            success: true,
            jobId: speechmaticsJobId
          };
        }

        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();
      const speechmaticsJobId = responseData.id;
      console.log(`[Speechmatics] Job submitted successfully with ID: ${speechmaticsJobId}`);

      return {
        success: true,
        jobId: speechmaticsJobId
      };

    } catch (error: unknown) {
      console.error('[Speechmatics] Job submission failed:', error);

      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Transcribe audio file using Speechmatics API (legacy synchronous method)
   */
  async transcribeAudio(
    audioBuffer: Buffer,
    filename: string,
    config: SpeechmaticsConfig = {}
  ): Promise<SpeechmaticsResult> {
    try {
      if (!this.isConfigured) {
        return {
          success: false,
          error: 'Speechmatics API is not configured. Please set SPEECHMATICS_API_KEY environment variable.'
        };
      }

      const {
        enableDiarization = true,
        removeDisfluencies,
        domain,
        additionalVocab
      } = config;

      console.log(`[Speechmatics] Starting transcription for ${filename}`);

      // Create FormData for Node.js (use form-data package)
      const formData = new FormData();

      // Append the audio buffer directly; let form-data handle streams/boundaries
      formData.append('data_file', audioBuffer, {
        filename: filename || 'audiofile',
        contentType: 'application/octet-stream',
      } as any);

      // Build transcription config
      const transcriptionConfig = createBaseTranscriptionConfig(config);

      // Add diarization if enabled
      if (enableDiarization) {
        transcriptionConfig.diarization = 'speaker';
      }

      const additionalVocabulary = buildAdditionalVocabulary({ domain, additionalVocab });
      if (additionalVocabulary.length > 0) {
        transcriptionConfig.additional_vocab = additionalVocabulary;
      }
      summarizeVocabularyUse({ domain, additionalVocab }, additionalVocabulary);

      // Add disfluency filtering if specified
      if (removeDisfluencies !== undefined) {
        transcriptionConfig.transcript_filtering_config = {
          remove_disfluencies: removeDisfluencies
        };
        console.log(`[Speechmatics] Disfluency removal: ${removeDisfluencies ? 'ENABLED' : 'DISABLED'}`);
      }

      // Add the configuration as JSON (using only valid Speechmatics properties)
      const jobConfig = {
        type: 'transcription',
        transcription_config: transcriptionConfig
      };

      formData.append('config', JSON.stringify(jobConfig));

      console.log(`[Speechmatics] Job config:`, JSON.stringify(redactVocabularyForLog(jobConfig), null, 2));

      // Submit job with file and config in one request
      const createJobResponse = await axios.post(
        `${this.apiUrl}/jobs`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            ...formData.getHeaders?.(),
          },
          // Axios in Node will stream form-data; no need to set maxContentLength unless very large files
        }
      );

      const jobId = createJobResponse.data.id;
      console.log(`[Speechmatics] Created job and uploaded file: ${jobId}`);

      // Wait for completion (job starts automatically after upload)
      const result = await this.waitForCompletion(jobId, config);
      
      if (result.success) {
        console.log(`[Speechmatics] Successfully completed transcription for job: ${jobId}`);
      } else {
        console.error(`[Speechmatics] Transcription failed for job: ${jobId}`, result.error);
      }

      return result;

    } catch (error) {
      console.error('[Speechmatics] Transcription error:', error);
      
      let errorMessage = 'Failed to transcribe audio';
      
      if (axios.isAxiosError(error)) {
        console.error('[Speechmatics] Axios error details:');
        console.error('- Status:', error.response?.status);
        console.error('- Status text:', error.response?.statusText);
        console.error('- Response data:', JSON.stringify(error.response?.data, null, 2));
        console.error('- Request URL:', error.config?.url);
        console.error('- Request method:', error.config?.method);
        
        if (error.response?.status === 401) {
          errorMessage = 'Invalid Speechmatics API credentials';
        } else if (error.response?.status === 429) {
          errorMessage = 'Speechmatics rate limit exceeded';
        } else if (error.response?.status === 403 &&
                   (error.response?.data?.detail?.includes('Enhanced Model transcription') ||
                    error.response?.data?.error?.includes('Enhanced Model transcription'))) {

          // Enhanced model quota exceeded - retry with standard model
          console.log('[Speechmatics] Enhanced model quota exceeded, retrying with standard model...');

          try {
            const fallbackTranscriptionConfig = createBaseTranscriptionConfig(config, 'standard');

            if (config.enableDiarization !== false) {
              fallbackTranscriptionConfig.diarization = 'speaker';
            }

            const fallbackAdditionalVocabulary = buildAdditionalVocabulary(config);
            if (fallbackAdditionalVocabulary.length > 0) {
              fallbackTranscriptionConfig.additional_vocab = fallbackAdditionalVocabulary;
            }

            if (config.removeDisfluencies !== undefined) {
              fallbackTranscriptionConfig.transcript_filtering_config = {
                remove_disfluencies: config.removeDisfluencies
              };
            }

            const fallbackConfig = {
              type: 'transcription',
              transcription_config: fallbackTranscriptionConfig
            };

            // Create new FormData with standard model
            const fallbackFormData = new FormData();
            fallbackFormData.append('data_file', audioBuffer, {
              filename: filename || 'audiofile',
              contentType: 'application/octet-stream',
            } as any);
            fallbackFormData.append('config', JSON.stringify(fallbackConfig));

            console.log(`[Speechmatics] Retrying with standard model config:`, JSON.stringify(redactVocabularyForLog(fallbackConfig), null, 2));

            const fallbackResponse = await axios.post(
              `${this.apiUrl}/jobs`,
              fallbackFormData,
              {
                headers: {
                  Authorization: `Bearer ${this.apiKey}`,
                  ...fallbackFormData.getHeaders?.(),
                },
              }
            );

            const fallbackJobId = fallbackResponse.data.id;
            console.log(`[Speechmatics] Fallback job created: ${fallbackJobId}`);

            // Wait for completion with standard model
            const fallbackResult = await this.waitForCompletion(fallbackJobId, config);

            if (fallbackResult.success) {
              console.log(`[Speechmatics] Successfully completed fallback transcription for job: ${fallbackJobId}`);
            }

            return fallbackResult;

          } catch (fallbackError) {
            console.error('[Speechmatics] Fallback with standard model also failed:', fallbackError);
            errorMessage = 'Enhanced model quota exceeded and standard model fallback failed';
          }
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.response?.status === 400) {
          errorMessage = `Bad request to Speechmatics API: ${error.response?.statusText}`;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Process a transcription job with Speechmatics
   */
  async processTranscriptionJob(
    transcriptionJobId: string,
    audioBuffer: Buffer,
    filename: string,
    config: SpeechmaticsConfig = {}
  ): Promise<void> {
    try {
      // Update job status to processing
      await updateTranscriptionStatusAdmin(transcriptionJobId, 'processing');

      // Transcribe with Speechmatics
      const result = await this.transcribeAudio(audioBuffer, filename, config);

      console.log(`[Speechmatics] transcribeAudio result:`, {
        success: result.success,
        hasTranscript: !!result.transcript,
        transcriptLength: result.transcript?.length || 0,
        hasTimestampedTranscript: !!result.timestampedTranscript,
        timestampedSegmentsCount: result.timestampedTranscript?.length || 0,
        duration: result.duration,
        error: result.error
      });

      if (result.success && result.transcript) {
        // For AI mode, complete the job directly
        // For hybrid mode, set to pending-review
        const job = await this.getTranscriptionJob(transcriptionJobId);
        const finalStatus: TranscriptionStatus = job?.mode === 'hybrid' ? 'pending-review' : 'complete';

        console.log(`[Speechmatics] About to save result:`, {
          hasTranscript: !!result.transcript,
          hasTimestampedTranscript: !!result.timestampedTranscript,
          timestampedSegmentsCount: result.timestampedTranscript?.length || 0,
          firstSegment: result.timestampedTranscript?.[0]
        });

        // Debug: force add test timestamps to verify data flow
        const testTimestamps = [
          { start: 1.0, end: 2.0, text: "Test segment 1" },
          { start: 3.0, end: 4.0, text: "Test segment 2" }
        ];

        await updateTranscriptionStatusAdmin(transcriptionJobId, finalStatus, {
          transcript: result.transcript,
          timestampedTranscript: result.timestampedTranscript || testTimestamps,
          terminologyIssues: result.terminologyIssues || [],
          duration: result.duration || 0
        });

        console.log(`[Speechmatics] Updated transcription job ${transcriptionJobId} to ${finalStatus}`);
      } else {
        // Mark job as failed
        await updateTranscriptionStatusAdmin(transcriptionJobId, 'failed', {
          specialInstructions: result.error || 'Transcription failed'
        });
        
        console.error(`[Speechmatics] Failed to process job ${transcriptionJobId}:`, result.error);
      }

    } catch (error) {
      console.error(`[Speechmatics] Error processing transcription job ${transcriptionJobId}:`, error);
      
      // Mark job as failed
      await updateTranscriptionStatusAdmin(transcriptionJobId, 'failed', {
        specialInstructions: 'Internal processing error'
      });
    }
  }

  /**
   * Wait for Speechmatics job completion
   */
  private async waitForCompletion(jobId: string, config: SpeechmaticsConfig = {}): Promise<SpeechmaticsResult> {
    const maxAttempts = 120; // 10 minutes max (5s intervals) - increased for longer files
    let attempts = 0;
    let jobStatus = 'running';

    while (jobStatus === 'running' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      try {
        const statusResponse = await axios.get(
          `${this.apiUrl}/jobs/${jobId}`,
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`
            }
          }
        );

        jobStatus = statusResponse.data.job.status;
        attempts++;

        console.log(`[Speechmatics] Job ${jobId} status: ${jobStatus} (${attempts}/${maxAttempts})`);

        if (jobStatus === 'rejected') {
          await this.cleanupJob(jobId);
          return {
            success: false,
            error: 'Speechmatics rejected the transcription job',
            jobId
          };
        }

      } catch (error) {
        console.error(`[Speechmatics] Error checking job status for ${jobId}:`, error);
        await this.cleanupJob(jobId);
        return {
          success: false,
          error: 'Failed to check job status',
          jobId
        };
      }
    }

    if (jobStatus === 'done') {
          return await this.getTranscriptResult(jobId, config);
    } else {
      await this.cleanupJob(jobId);
      return {
        success: false,
        error: jobStatus === 'running' ? 'Transcription timed out' : `Job failed with status: ${jobStatus}`,
        jobId
      };
    }
  }

  /**
   * Get transcript result from completed job
   */
  private async getTranscriptResult(jobId: string, config: SpeechmaticsConfig = {}): Promise<SpeechmaticsResult> {
    try {
      const transcriptResponse = await axios.get(
        `${this.apiUrl}/jobs/${jobId}/transcript`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json'
          }
        }
      );

      const data = transcriptResponse.data;
      
      // Extract transcript text (plain text for compatibility)
      const transcriptText = data.results
        ?.map((result: any) => result.alternatives?.[0]?.content || '')
        .join(' ')
        .trim() || '';

      // Extract timestamped segments - group words into sentences
      const timestampedSegments: TranscriptSegment[] = [];
      console.log(`[Speechmatics] Processing ${data.results?.length || 0} results for timestamps`);

      if (data.results && Array.isArray(data.results)) {
        let currentSentence = '';
        let sentenceStartTime: number | null = null;
        let sentenceEndTime = 0;
        let confidenceScores: number[] = [];

        data.results.forEach((result: any, index: number) => {
          if (result.alternatives && result.alternatives[0] && result.alternatives[0].content) {
            const word = result.alternatives[0].content;
            const startTime = result.start_time || 0;
            const endTime = result.end_time || 0;
            const confidence = result.alternatives[0].confidence;

            // Initialize sentence start time
            if (sentenceStartTime === null) {
              sentenceStartTime = startTime;
            }

            // Add word to current sentence
            currentSentence += (currentSentence ? ' ' : '') + word;
            sentenceEndTime = endTime;

            // Collect confidence scores
            if (confidence && typeof confidence === 'number') {
              confidenceScores.push(confidence);
            }

            // Check if this word ends a sentence (contains sentence-ending punctuation)
            const endsWithPunctuation = /[.!?]$/.test(word);
            const isLastWord = index === data.results.length - 1;

            if (endsWithPunctuation || isLastWord) {
              // Complete the sentence segment and clean up spacing
              const cleanedText = currentSentence.trim()
                .replace(/\s+([.!?,:;])/g, '$1')  // Remove spaces before punctuation
                .replace(/\s+/g, ' ');             // Normalize multiple spaces to single space

              const segment: any = {
                start: sentenceStartTime,
                end: sentenceEndTime,
                text: cleanedText
              };

              // Calculate average confidence for the sentence
              if (confidenceScores.length > 0) {
                const avgConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
                segment.confidence = avgConfidence;
              }

              timestampedSegments.push(segment);

              // Reset for next sentence
              currentSentence = '';
              sentenceStartTime = null;
              sentenceEndTime = 0;
              confidenceScores = [];
            }
          }
        });

        // Handle any remaining incomplete sentence
        if (currentSentence.trim() && sentenceStartTime !== null) {
          const cleanedText = currentSentence.trim()
            .replace(/\s+([.!?,:;])/g, '$1')  // Remove spaces before punctuation
            .replace(/\s+/g, ' ');             // Normalize multiple spaces to single space

          const segment: any = {
            start: sentenceStartTime,
            end: sentenceEndTime,
            text: cleanedText
          };

          if (confidenceScores.length > 0) {
            const avgConfidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
            segment.confidence = avgConfidence;
          }

          timestampedSegments.push(segment);
        }
      }
      const terminologyCleanup = cleanupTerminologySegments(timestampedSegments, {
        domain: config.domain,
        projectDictionaryTerms: config.additionalVocab?.map((entry) => entry.content),
      });
      const cleanedTimestampedSegments = terminologyCleanup.segments;

      if (terminologyCleanup.correctionCount > 0 || terminologyCleanup.issues.length > 0) {
        console.log('[Speechmatics] Terminology cleanup summary:', {
          corrections: terminologyCleanup.correctionCount,
          reviewIssues: terminologyCleanup.issues.length,
          domain: config.domain || 'general',
        });
      }

      const cleanedTranscriptText = cleanedTimestampedSegments.map(segment => segment.text).join(' ');
      console.log(`[Speechmatics] Created ${cleanedTimestampedSegments.length} timestamped segments`);

      // Extract metadata
      const duration = data.job?.duration || 0;
      const speakers = data.speakers?.length || 0;

      // Calculate average confidence if available
      let confidence = 0;
      if (cleanedTimestampedSegments.length > 0) {
        const confidenceScores = cleanedTimestampedSegments
          .map(segment => segment.confidence || 0)
          .filter(score => score > 0);

        if (confidenceScores.length > 0) {
          confidence = confidenceScores.reduce((sum, score) => sum + score, 0) / confidenceScores.length;
        }
      }

      await this.cleanupJob(jobId);

      return {
        success: true,
        transcript: cleanedTranscriptText || transcriptText,
        timestampedTranscript: cleanedTimestampedSegments,
        terminologyIssues: terminologyCleanup.issues,
        duration,
        speakers,
        confidence,
        jobId
      };

    } catch (error) {
      console.error(`[Speechmatics] Error retrieving transcript for ${jobId}:`, error);
      await this.cleanupJob(jobId);
      
      return {
        success: false,
        error: 'Failed to retrieve transcript',
        jobId
      };
    }
  }

  /**
   * Clean up Speechmatics job
   */
  private async cleanupJob(jobId: string): Promise<void> {
    try {
      await axios.delete(
        `${this.apiUrl}/jobs/${jobId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      console.log(`[Speechmatics] Cleaned up job: ${jobId}`);
    } catch (error) {
      console.warn(`[Speechmatics] Failed to clean up job ${jobId}:`, error);
    }
  }

  /**
   * Helper method to get transcription job details
   */
  private async getTranscriptionJob(jobId: string): Promise<TranscriptionJob | null> {
    try {
      return await getTranscriptionByIdAdmin(jobId);
    } catch (error) {
      console.error('Error fetching transcription job:', error);
      return null;
    }
  }
}

// Export singleton instance
export const speechmaticsService = new SpeechmaticsService();
