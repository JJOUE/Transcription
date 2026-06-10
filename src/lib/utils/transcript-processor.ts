/**
 * Transcript Post-Processing Utility
 * 
 * Safe, conservative transcript processing for:
 * - Canadian English normalization
 * - Basic cleanup operations
 * - Future AI enhancement support
 * 
 * IMPORTANT:
 * - All functions are non-destructive (return new strings, don't modify originals)
 * - No automatic application to production transcripts
 * - Designed to be used with preview/confirmation in future UI
 * - Preserves legal/medical terminology and proper nouns
 */

/**
 * Configuration for Canadian English normalization
 * Conservative list focused on common spelling differences
 * 
 * Rules:
 * - Only includes common, unambiguous replacements
 * - Avoids proper nouns, brand names, and acronyms
 * - Preserves legal and medical terminology
 * - Word-boundary aware to avoid partial matches
 */
const CANADIAN_ENGLISH_REPLACEMENTS: Array<{
  pattern: RegExp;
  replacement: string;
  category: 'spelling' | 'punctuation' | 'formatting';
  description: string;
}> = [
  // Spelling: -or → -our
  {
    pattern: /\bcolor\b/gi,
    replacement: 'colour',
    category: 'spelling',
    description: 'color → colour'
  },
  {
    pattern: /\bcolors\b/gi,
    replacement: 'colours',
    category: 'spelling',
    description: 'colors → colours'
  },
  {
    pattern: /\bfavor\b/gi,
    replacement: 'favour',
    category: 'spelling',
    description: 'favor → favour'
  },
  {
    pattern: /\bfavors\b/gi,
    replacement: 'favours',
    category: 'spelling',
    description: 'favors → favours'
  },
  {
    pattern: /\bhonor\b/gi,
    replacement: 'honour',
    category: 'spelling',
    description: 'honor → honour'
  },
  {
    pattern: /\bhonors\b/gi,
    replacement: 'honours',
    category: 'spelling',
    description: 'honors → honours'
  },
  {
    pattern: /\blabor\b/gi,
    replacement: 'labour',
    category: 'spelling',
    description: 'labor → labour'
  },
  {
    pattern: /\blabors\b/gi,
    replacement: 'labours',
    category: 'spelling',
    description: 'labors → labours'
  },
  {
    pattern: /\bmajor\b/gi,
    replacement: 'major',
    category: 'spelling',
    description: 'major - no change (avoid ambiguity)'
  },
  {
    pattern: /\bneighbor\b/gi,
    replacement: 'neighbour',
    category: 'spelling',
    description: 'neighbor → neighbour'
  },
  {
    pattern: /\bneighbors\b/gi,
    replacement: 'neighbours',
    category: 'spelling',
    description: 'neighbors → neighbours'
  },
  {
    pattern: /\brumor\b/gi,
    replacement: 'rumour',
    category: 'spelling',
    description: 'rumor → rumour'
  },
  {
    pattern: /\brumors\b/gi,
    replacement: 'rumours',
    category: 'spelling',
    description: 'rumors → rumours'
  },
  {
    pattern: /\btumor\b/gi,
    replacement: 'tumour',
    category: 'spelling',
    description: 'tumor → tumour (medical term)'
  },
  {
    pattern: /\btumors\b/gi,
    replacement: 'tumours',
    category: 'spelling',
    description: 'tumors → tumours'
  },
  {
    pattern: /\bvapor\b/gi,
    replacement: 'vapour',
    category: 'spelling',
    description: 'vapor → vapour'
  },
  {
    pattern: /\bvapors\b/gi,
    replacement: 'vapours',
    category: 'spelling',
    description: 'vapors → vapours'
  },

  // Spelling: -er → -re (centre, metre, theatre, etc.)
  {
    pattern: /\bcenter\b/gi,
    replacement: 'centre',
    category: 'spelling',
    description: 'center → centre'
  },
  {
    pattern: /\bcenters\b/gi,
    replacement: 'centres',
    category: 'spelling',
    description: 'centers → centres'
  },
  {
    pattern: /\bmeter\b/gi,
    replacement: 'metre',
    category: 'spelling',
    description: 'meter → metre (metric measurement)'
  },
  {
    pattern: /\bmeters\b/gi,
    replacement: 'metres',
    category: 'spelling',
    description: 'meters → metres'
  },
  {
    pattern: /\btheater\b/gi,
    replacement: 'theatre',
    category: 'spelling',
    description: 'theater → theatre'
  },
  {
    pattern: /\btheaters\b/gi,
    replacement: 'theatres',
    category: 'spelling',
    description: 'theaters → theatres'
  },

  // Spelling: other common differences
  {
    pattern: /\bfiber\b/gi,
    replacement: 'fibre',
    category: 'spelling',
    description: 'fiber → fibre'
  },
  {
    pattern: /\bfibers\b/gi,
    replacement: 'fibres',
    category: 'spelling',
    description: 'fibers → fibres'
  },
  {
    pattern: /\blicence\b/gi,
    replacement: 'licence',
    category: 'spelling',
    description: 'license (noun) → licence'
  },
  {
    pattern: /\bpractice\b/gi,
    replacement: 'practice',
    category: 'spelling',
    description: 'practise (verb) vs practice (noun) - preserve current'
  },
  {
    pattern: /\bspecialized\b/gi,
    replacement: 'specialised',
    category: 'spelling',
    description: 'specialized → specialised'
  },
];

/**
 * Protected terms that should NOT be modified
 * Includes legal, medical, and proper noun patterns
 */
const PROTECTED_TERMS = [
  // Legal terms (from Speechmatics legal vocabulary)
  'plaintiff', 'defendant', 'appellant', 'appellee',
  'deposition', 'interrogatory', 'subpoena',
  'habeas', 'corpus', 'voir', 'dire',
  'petitioner', 'respondent',
  // Medical terms (from Speechmatics medical vocabulary)
  'tumor', 'tumour', 'carcinoma', 'sarcoma', 'lymphoma',
  'hypertension', 'myocardial', 'infarction',
  'electrocardiogram', 'sphygmomanometer',
  'stethoscope', 'auscultation', 'palpitation',
  // Common proper nouns/brand names - just samples, not exhaustive
  'Colour', 'Color', 'Centre', 'Center', // when capitalized
];

/**
 * Apply only mechanical formatting fixes to transcript text.
 *
 * This does not remove words, rewrite phrasing, apply Canadian spelling,
 * change speaker labels, or change timestamps. It is intentionally limited to
 * punctuation spacing, sentence capitalization, and a few greeting/comma fixes.
 */
export function formatTranscriptMechanically(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const protectedFragments = new Map<string, string>();
  let protectedIndex = 0;
  const protect = (value: string) => {
    const token = `__MECH_PROTECTED_${protectedIndex}__`;
    protectedFragments.set(token, value);
    protectedIndex += 1;
    return token;
  };

  let formatted = text;

  // Protect dots that should not be treated as sentence boundaries.
  formatted = formatted.replace(/\b(?:https?:\/\/|www\.)\S+/gi, protect);
  formatted = formatted.replace(/\b[\w.-]+\.(?:com|ca|org|net|gov|edu|pdf|docx?|xlsx?|pptx?|txt|csv|mp3|mp4|wav)\b/gi, protect);
  formatted = formatted.replace(/\b\d+\.\d+\b/g, protect);

  // Protect initials and common abbreviations before sentence-spacing rules.
  formatted = formatted.replace(/\b(?:[A-Z]\.){2,}(?=\s|$)/g, protect);
  formatted = formatted.replace(/\b(?:e\.g\.|i\.e\.)/gi, protect);

  // Remove duplicate spaces and fix spacing before punctuation.
  formatted = formatted.replace(/ {2,}/g, ' ');
  formatted = formatted.replace(/\s+([.,!?;:])/g, '$1');

  // Add missing space after sentence punctuation when another word follows.
  formatted = formatted.replace(/([.!?])(?=[A-Za-z])/g, '$1 ');

  // Normalize standalone honorifics only; do not touch "ms" inside words.
  formatted = formatted.replace(/\bmr\.?(?=\s|$)/gi, 'Mr.');
  formatted = formatted.replace(/\b(?:ms|miss)\.?(?=\s|$)/gi, 'Ms.');

  // Capitalize the first letter after sentence-ending punctuation.
  formatted = formatted.replace(
    /([.!?]\s+)(["'“‘(\[]*)([a-z])/g,
    (_match, prefix: string, opener: string, letter: string) => `${prefix}${opener}${letter.toUpperCase()}`
  );

  // Add comma after sentence-opening "So" only.
  formatted = formatted.replace(/(^|[.!?]\s+)So\s+(?!,)/g, '$1So, ');

  // Add comma after common sentence-opening greetings.
  formatted = formatted.replace(
    /(^|[.!?]\s+)(Good morning|Good afternoon|Good evening)\s+(?!,)/gi,
    (_match, prefix: string, greeting: string) => `${prefix}${greeting}, `
  );

  protectedFragments.forEach((original, token) => {
    formatted = formatted.replace(new RegExp(token, 'g'), original);
  });

  formatted = formatted.replace(/\b(Mr|Ms)\.\s*\./g, '$1.');

  return formatted.trim();
}

/**
 * Demonstration examples for the mechanical formatter.
 * Useful for manual verification before wiring into any production flow.
 */
export function demonstrateMechanicalFormatting(): void {
  const examples = [
    ['Hello.There', 'Hello. There'],
    ['What happened?She left.', 'What happened? She left.'],
    ['hello. there', 'hello. There'],
    ["everyone. i'm your host", "everyone. I'm your host"],
    ['this is nice.it works', 'this is nice. It works'],
    ['okay! next item', 'okay! Next item'],
    ['what happened? she left', 'what happened? She left'],
    ['A.G. Smith met J.R. Smith near the U.S. border.', 'A.G. Smith met J.R. Smith near the U.S. border.'],
    ['Use e.g. this format and i.e. this explanation.', 'Use e.g. this format and i.e. this explanation.'],
    ['Visit example.com for report.docx version 2.5.', 'Visit example.com for report.docx version 2.5.'],
    ['Hello ,  world', 'Hello, world'],
    ['So I went home.', 'So, I went home.'],
    ['I was so tired.', 'I was so tired.'],
    ['Good morning everyone', 'Good morning, everyone'],
    ['Good afternoon everyone', 'Good afternoon, everyone'],
    ['Good evening everyone', 'Good evening, everyone'],
    [
      'mr smith spoke to ms wang. Mr. Jones replied to Ms. Chen. Miss Brown reviewed the forms and claims. The items and terms were listed. This transmission includes no changes to normal words.',
      'Mr. Smith spoke to Ms. Wang. Mr. Jones replied to Ms. Chen. Ms. Brown reviewed the forms and claims. The items and terms were listed. This transmission includes no changes to normal words.'
    ],
  ];

  console.log('[TranscriptProcessor] Mechanical Formatting Examples:');
  examples.forEach(([input, expected], index) => {
    const output = formatTranscriptMechanically(input);
    console.log(`Example ${index + 1}:`, {
      input,
      output,
      expected,
      match: output === expected,
    });
  });
}

/**
 * Normalize whitespace in transcript
 * - Remove multiple consecutive spaces
 * - Fix spacing around punctuation
 * - Preserve intentional line breaks (paragraphs)
 */
export function normalizeSpacing(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Remove multiple consecutive spaces (but preserve at least one)
  let normalized = text.replace(/  +/g, ' ');

  // Fix spacing before punctuation (no space before period, comma, etc.)
  normalized = normalized.replace(/ ([.,!?;:])/g, '$1');

  // Fix spacing after opening quotes/parentheses
  normalized = normalized.replace(/(["\('"])\s+/g, '$1');

  // Fix spacing before closing quotes/parentheses
  normalized = normalized.replace(/\s+(["\)'])/g, '$1');

  return normalized;
}

/**
 * Clean basic punctuation issues
 * Conservative: only fixes obvious errors
 * - Multiple periods → single period
 * - Spaces inside parentheses
 * - Common quote normalization
 */
export function cleanBasicPunctuation(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  let cleaned = text;

  // Remove space inside parentheses: ( text ) → (text)
  cleaned = cleaned.replace(/\(\s+/g, '(');
  cleaned = cleaned.replace(/\s+\)/g, ')');

  // Remove space inside square brackets: [ text ] → [text]
  cleaned = cleaned.replace(/\[\s+/g, '[');
  cleaned = cleaned.replace(/\s+\]/g, ']');

  // Fix multiple periods: ... → .
  cleaned = cleaned.replace(/\.{2,}/g, '.');

  // Fix multiple question marks: ??? → ?
  cleaned = cleaned.replace(/\?{2,}/g, '?');

  // Fix multiple exclamation marks: !!! → !
  cleaned = cleaned.replace(/!{2,}/g, '!');

  return cleaned;
}

/**
 * Apply Canadian English normalization
 * Conservative approach:
 * - Only applies clearly unambiguous replacements
 * - Skips terms that could be proper nouns
 * - Skips protected legal/medical terminology
 * - Uses word boundaries to avoid partial matches
 */
export function applyCanadianEnglish(text: string): string {
  if (!text || typeof text !== 'string') {
    return text;
  }

  // Check if any protected terms are in the text
  const hasProtectedTerms = PROTECTED_TERMS.some(term =>
    new RegExp(`\\b${term}\\b`, 'i').test(text)
  );

  if (hasProtectedTerms) {
    console.warn('[TranscriptProcessor] Protected legal/medical terms detected - applying selective replacements only');
  }

  let processed = text;

  // Apply each replacement rule
  for (const rule of CANADIAN_ENGLISH_REPLACEMENTS) {
    // Skip if this would affect a protected term
    const matches = text.match(rule.pattern);
    if (matches && hasProtectedTerms) {
      // For protected content, be extra cautious
      // Only apply if we're confident it's not a proper noun (not capitalized)
      processed = processed.replace(rule.pattern, (match) => {
        // Keep capitalized versions as-is (likely proper nouns)
        if (match[0] === match[0].toUpperCase() && match.length > 1) {
          return match;
        }
        return match.replace(/(.)/gi, (char) => {
          const index = match.indexOf(char);
          return rule.replacement[index] || char;
        });
      });
    } else {
      // Safe to apply normally
      processed = processed.replace(rule.pattern, rule.replacement);
    }
  }

  return processed;
}

/**
 * Protect legal and medical terminology from aggressive modifications
 * Identifies and marks terms that should not be changed by future processing
 */
export function protectLegalMedicalTerms(text: string): {
  protectedText: string;
  replacements: Map<string, string>;
} {
  const replacements = new Map<string, string>();
  let processedText = text;
  let replacementIndex = 0;

  // Pattern for legal terms (from Speechmatics legal vocabulary)
  const legalPattern = /\b(plaintiff|defendant|appellant|appellee|deposition|interrogatory|subpoena|habeas\s+corpus|voir\s+dire|petitioner|respondent|litigation|discovery|jurisdiction|venue|standing|precedent|stare\s+decisis)\b/gi;

  // Pattern for medical terms (from Speechmatics medical vocabulary)
  const medicalPattern = /\b(hypertension|myocardial\s+infarction|electrocardiogram|sphygmomanometer|stethoscope|auscultation|palpitation|bradycardia|tachycardia|arrhythmia|carcinoma|sarcoma|lymphoma|leukemia|pneumonia|bronchitis|asthma|diabetes\s+mellitus|chemotherapy|radiotherapy|surgery|laparoscopy|endoscopy|catheterization|intubation|defibrillation|anesthesia)\b/gi;

  // Find all legal terms and replace with placeholders
  processedText = processedText.replace(legalPattern, (match) => {
    const placeholder = `__LEGAL_${replacementIndex}__`;
    replacements.set(placeholder, match);
    replacementIndex++;
    return placeholder;
  });

  // Find all medical terms and replace with placeholders
  processedText = processedText.replace(medicalPattern, (match) => {
    const placeholder = `__MEDICAL_${replacementIndex}__`;
    replacements.set(placeholder, match);
    replacementIndex++;
    return placeholder;
  });

  return { protectedText: processedText, replacements };
}

/**
 * Restore protected terms after processing
 * Reverses the protection applied by protectLegalMedicalTerms()
 */
export function restoreProtectedTerms(
  text: string,
  replacements: Map<string, string>
): string {
  let restored = text;

  replacements.forEach((originalTerm, placeholder) => {
    restored = restored.replace(new RegExp(placeholder, 'g'), originalTerm);
  });

  return restored;
}

/**
 * Comprehensive transcript cleanup with options
 * Returns modified text AND metadata about what was changed
 * 
 * Non-destructive: always returns a new string, original is unchanged
 */
export interface CleanupOptions {
  canadianEnglish?: boolean;
  normalizeWhitespace?: boolean;
  cleanPunctuation?: boolean;
  protectMedicalLegal?: boolean;
}

export function cleanupTranscript(
  text: string,
  options: CleanupOptions = {}
): {
  cleanedText: string;
  changesApplied: string[];
  characterCount: { before: number; after: number };
} {
  const {
    canadianEnglish = false,
    normalizeWhitespace = true,
    cleanPunctuation = true,
    protectMedicalLegal = true,
  } = options;

  const changesApplied: string[] = [];
  let processed = text;
  const beforeLength = text.length;

  // Protect legal/medical terms first if requested
  let protectionMap = new Map<string, string>();
  if (protectMedicalLegal && canadianEnglish) {
    const { protectedText, replacements } = protectLegalMedicalTerms(processed);
    processed = protectedText;
    protectionMap = replacements;
    changesApplied.push('Protected legal/medical terminology');
  }

  // Apply Canadian English normalization if requested
  if (canadianEnglish) {
    const beforeCanadian = processed;
    processed = applyCanadianEnglish(processed);
    if (beforeCanadian !== processed) {
      changesApplied.push('Applied Canadian English spelling');
    }
  }

  // Restore protected terms
  if (protectionMap.size > 0) {
    processed = restoreProtectedTerms(processed, protectionMap);
    changesApplied.push('Restored protected terminology');
  }

  // Normalize whitespace if requested
  if (normalizeWhitespace) {
    const beforeWhitespace = processed;
    processed = normalizeSpacing(processed);
    if (beforeWhitespace !== processed) {
      changesApplied.push('Normalized whitespace');
    }
  }

  // Clean punctuation if requested
  if (cleanPunctuation) {
    const beforePunctuation = processed;
    processed = cleanBasicPunctuation(processed);
    if (beforePunctuation !== processed) {
      changesApplied.push('Cleaned punctuation');
    }
  }

  return {
    cleanedText: processed,
    changesApplied: changesApplied.length > 0 ? changesApplied : ['No changes applied'],
    characterCount: {
      before: beforeLength,
      after: processed.length,
    },
  };
}

/**
 * Example/test function demonstrating the processor
 * Shows before/after examples of Canadian English normalization
 */
export function demonstrateProcessing(): void {
  const examples = [
    {
      name: 'Basic color/colour replacement',
      input: 'The color of the flower is beautiful.',
      expected: 'The colour of the flower is beautiful.',
    },
    {
      name: 'Center/centre replacement',
      input: 'The meeting is at the center of town.',
      expected: 'The meeting is at the centre of town.',
    },
    {
      name: 'Multiple replacements',
      input: 'She asked for a favor at the theatre in the center.',
      expected: 'She asked for a favour at the theatre in the centre.',
    },
    {
      name: 'Protected legal terms (not changed)',
      input: 'The defendant and plaintiff discussed the litigation at the center court.',
      expected: 'The defendant and plaintiff discussed the litigation at the centre court.',
    },
    {
      name: 'Medical term protection',
      input: 'The tumor was examined at the hospital center.',
      expected: 'The tumour was examined at the hospital centre.',
    },
    {
      name: 'Whitespace normalization',
      input: 'The   quick  brown  fox',
      expected: 'The quick brown fox',
    },
    {
      name: 'Punctuation cleanup',
      input: 'What is this??? ( text ) is [ here ]',
      expected: 'What is this? (text) is [here]',
    },
  ];

  console.log('[TranscriptProcessor] Demonstration Examples:');
  console.log('=============================================\n');

  examples.forEach((example, index) => {
    const cleaned = cleanupTranscript(example.input, {
      canadianEnglish: true,
      normalizeWhitespace: true,
      cleanPunctuation: true,
      protectMedicalLegal: true,
    });

    console.log(`Example ${index + 1}: ${example.name}`);
    console.log(`  Input:    "${example.input}"`);
    console.log(`  Output:   "${cleaned.cleanedText}"`);
    console.log(`  Expected: "${example.expected}"`);
    console.log(`  Match: ${cleaned.cleanedText === example.expected ? '✅' : '⚠️'}`);
    console.log(`  Changes: ${cleaned.changesApplied.join(', ')}`);
    console.log();
  });
}

/**
 * Export all Canadian English rules for inspection/testing
 * Useful for UI preview or debugging
 */
export function getCanadianEnglishRules() {
  return CANADIAN_ENGLISH_REPLACEMENTS.map(rule => ({
    description: rule.description,
    category: rule.category,
  }));
}
