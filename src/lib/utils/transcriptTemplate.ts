import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun, AlignmentType, PageBreak, TabStopType } from 'docx';
import { TranscriptionJob, TranscriptSegment } from '@/lib/firebase/transcriptions';
import { Timestamp } from 'firebase/firestore';

export interface TranscriptTemplateData {
  clientName?: string;
  projectName?: string;
  fileName: string;
  providerName?: string;
  patientName?: string;
  location?: string;
  time?: string;
  date: string;
  transcriptContent: string;
  timestampedTranscript?: TranscriptSegment[]; // New field for timestamped data
}

export type TranscriptStyleId =
  | 'standard-speaker-paragraph'
  | 'speaker-own-line'
  | 'question-answer'
  | 'formal-interview'
  | 'clean-read';

export interface TranscriptStylePreset {
  id: TranscriptStyleId;
  label: string;
  description: string;
  speakerPlacement: 'inline' | 'own-line' | 'tab-hanging';
  speakerBold: boolean;
  questionAnswerMode: boolean;
  lineSpacing: number;
  paragraphSpacingAfter: number;
  speakerSpacingBefore: number;
  speakerSpacingAfter: number;
}

export const TRANSCRIPT_STYLE_PRESETS: TranscriptStylePreset[] = [
  {
    id: 'standard-speaker-paragraph',
    label: 'Standard Speaker Paragraph',
    description: 'Bold speaker labels followed by transcript text on the same line.',
    speakerPlacement: 'inline',
    speakerBold: true,
    questionAnswerMode: false,
    lineSpacing: 300,
    paragraphSpacingAfter: 220,
    speakerSpacingBefore: 240,
    speakerSpacingAfter: 0,
  },
  {
    id: 'speaker-own-line',
    label: 'Speaker on Own Line',
    description: 'The current familiar layout with each speaker label above their text.',
    speakerPlacement: 'own-line',
    speakerBold: true,
    questionAnswerMode: false,
    lineSpacing: 300,
    paragraphSpacingAfter: 220,
    speakerSpacingBefore: 400,
    speakerSpacingAfter: 200,
  },
  {
    id: 'question-answer',
    label: 'Q and A Style',
    description: 'Alternating speakers are presented as questions and answers.',
    speakerPlacement: 'own-line',
    speakerBold: true,
    questionAnswerMode: true,
    lineSpacing: 300,
    paragraphSpacingAfter: 240,
    speakerSpacingBefore: 360,
    speakerSpacingAfter: 140,
  },
  {
    id: 'formal-interview',
    label: 'Formal Interview Style',
    description: 'Strong speaker headings with more generous spacing between turns.',
    speakerPlacement: 'own-line',
    speakerBold: true,
    questionAnswerMode: false,
    lineSpacing: 340,
    paragraphSpacingAfter: 300,
    speakerSpacingBefore: 520,
    speakerSpacingAfter: 220,
  },
  {
    id: 'clean-read',
    label: 'Clean Read Style',
    description: 'A compact inline layout with restrained paragraph spacing.',
    speakerPlacement: 'inline',
    speakerBold: true,
    questionAnswerMode: false,
    lineSpacing: 280,
    paragraphSpacingAfter: 140,
    speakerSpacingBefore: 180,
    speakerSpacingAfter: 0,
  },
];

export const DEFAULT_TRANSCRIPT_STYLE_ID: TranscriptStyleId = 'speaker-own-line';

export const getTranscriptStylePreset = (styleId?: TranscriptStyleId): TranscriptStylePreset =>
  TRANSCRIPT_STYLE_PRESETS.find(style => style.id === styleId) ||
  TRANSCRIPT_STYLE_PRESETS.find(style => style.id === DEFAULT_TRANSCRIPT_STYLE_ID)!;

const getOrderedSpeakerIds = (segments: TranscriptSegment[] = []) =>
  [...new Set(segments.map(segment => segment.speaker).filter((speaker): speaker is string => Boolean(speaker && speaker !== 'UU')))];

const getStyledSpeakerLabel = (
  preset: TranscriptStylePreset,
  displayName: string,
  speaker: string | undefined,
  orderedSpeakers: string[]
) => {
  if (!preset.questionAnswerMode) return displayName;
  const speakerIndex = speaker ? orderedSpeakers.indexOf(speaker) : -1;
  if (speakerIndex < 0) return displayName;
  return speakerIndex % 2 === 0 ? 'Q' : 'A';
};

const MAX_SENTENCES_PER_PARAGRAPH = 9;

function normalizeTranscriptSegmentText(text: string): string {
  return text
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function countCompletedSentences(text: string): number {
  const normalized = normalizeTranscriptSegmentText(text);
  if (!normalized) return 0;

  const protectedText = normalized
    .replace(/\b(?:[A-Z]\.){2,}/gi, match => match.replace(/\./g, ''))
    .replace(/\b(?:e\.g\.|i\.e\.)/gi, match => match.replace(/\./g, ''))
    .replace(/\b\d+\.\d+\b/g, match => match.replace('.', ''));

  return (protectedText.match(/[.!?…]+(?=(?:["'”’)\]]|\s|$))/g) || []).length;
}

// Utility function to format seconds into MM:SS or HH:MM:SS format
function formatTimestamp(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

export function generateTemplateData(transcription: TranscriptionJob, userData?: { name?: string }): TranscriptTemplateData {
  let dateString: string;
  let timeString: string;

  try {
    const uploadTime = transcription.createdAt instanceof Timestamp
      ? transcription.createdAt.toDate()
      : transcription.createdAt instanceof Date
      ? transcription.createdAt
      : new Date();

    dateString = uploadTime.toLocaleDateString('en-CA');
    timeString = uploadTime.toLocaleTimeString('en-CA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  } catch (error) {
    console.warn('Error formatting date/time in generateTemplateData:', error);
    const now = new Date();
    dateString = now.toLocaleDateString('en-CA');
    timeString = now.toLocaleTimeString('en-CA', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  }

  return {
    clientName: userData?.name || transcription.clientName || '', // Use user's name
    projectName: transcription.projectName || '',
    fileName: transcription.originalFilename || 'Unknown',
    providerName: 'Talk to Text', // Always use this
    patientName: transcription.patientName || '',
    location: transcription.location || '', // Will be user's location if enabled
    time: timeString, // Use upload time
    date: dateString, // Use upload date
    transcriptContent: transcription.transcript || '',
    timestampedTranscript: transcription.timestampedTranscript || [] // Include timestamped data
  };
}

export interface ExportOptions {
  timestampFrequency?: 30 | 60 | 300 | 'none'; // 30s, 60s, 5min, or no interval timestamps
  speakerNames?: Record<string, string>;
  getSpeakerColor?: (speaker: string | undefined) => string;
  getSpeakerDisplayName?: (speaker: string | undefined) => string;
  speakerLabelLayout?: 'separate-line' | 'tab-hanging' | 'space-inline';
  transcriptStyleId?: TranscriptStyleId;
}

export async function exportTranscriptPDF(templateData: TranscriptTemplateData, options?: ExportOptions): Promise<void> {
  const pdf = new jsPDF();
  const pageHeight = pdf.internal.pageSize.height;
  const pageWidth = pdf.internal.pageSize.width;

  // Default options
  const timestampFrequency = options?.timestampFrequency || 60;
  const activeTimestampFrequency = timestampFrequency === 'none' ? null : timestampFrequency;
  const speakerNames = options?.speakerNames || {};
  const transcriptStyle = getTranscriptStylePreset(options?.transcriptStyleId);
  const orderedSpeakers = getOrderedSpeakerIds(templateData.timestampedTranscript);

  // Helper function to get speaker display name
  const getSpeakerDisplayName = (speaker: string | undefined): string => {
    const providedDisplayName = options?.getSpeakerDisplayName?.(speaker);
    if (providedDisplayName) return getStyledSpeakerLabel(transcriptStyle, providedDisplayName, speaker, orderedSpeakers);
    if (!speaker || speaker === 'UU') return 'Speaker';
    if (speakerNames[speaker]) {
      return getStyledSpeakerLabel(transcriptStyle, speakerNames[speaker], speaker, orderedSpeakers);
    }
    return getStyledSpeakerLabel(transcriptStyle, `Speaker ${speaker.replace('S', '')}`, speaker, orderedSpeakers);
  };

  // Load and add the logo
  try {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load logo'));
      img.src = '/images/logo.png';
    });

    // Calculate logo dimensions to maintain aspect ratio
    const logoMaxWidth = 50;
    const logoMaxHeight = 15;
    const aspectRatio = img.width / img.height;

    let logoWidth = logoMaxWidth;
    let logoHeight = logoMaxWidth / aspectRatio;

    // If height exceeds max, scale down based on height instead
    if (logoHeight > logoMaxHeight) {
      logoHeight = logoMaxHeight;
      logoWidth = logoMaxHeight * aspectRatio;
    }

    // Add logo (top right corner) with proper aspect ratio and padding from border
    pdf.addImage(img, 'PNG', pageWidth - logoWidth - 15, 15, logoWidth, logoHeight);
  } catch (error) {
    console.warn('Could not load logo for PDF:', error);
    // Fallback to text if logo fails to load
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('LOGO', pageWidth - 30, 24);
  }

  // Add page border
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);

  // Metadata section with border
  let yPos = 45;
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  const metadata = [
    templateData.clientName && ['Client Name:', templateData.clientName],
    templateData.projectName && ['Project Name:', templateData.projectName],
    ['Date:', templateData.date],
    ['File Name:', templateData.fileName],
    ['Provider Name:', templateData.providerName],
    templateData.patientName && ['Patient Name:', templateData.patientName],
    templateData.location && ['Location:', templateData.location],
    templateData.time && ['Time:', templateData.time]
  ].filter(Boolean) as [string, string][];

  // Metadata box border
  const metadataHeight = metadata.length * 8 + 15; // Increased for extra padding
  pdf.setDrawColor(150, 150, 150);
  pdf.setLineWidth(0.2);
  pdf.rect(20, yPos - 5, pageWidth - 40, metadataHeight);

  yPos += 5; // Add padding above first row

  metadata.forEach(([label, value]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(label, 25, yPos);
    pdf.setFont('helvetica', 'normal');
    pdf.text(value, 85, yPos);
    yPos += 8;
  });

  // Keep the cover page separate from the transcript body.
  pdf.addPage();
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(0, 0, 0);
  const transcriptTitle = 'TRANSCRIPT';
  const transcriptTitleWidth = pdf.getTextWidth(transcriptTitle);
  const transcriptTitleX = (pageWidth - transcriptTitleWidth) / 2;
  pdf.text(transcriptTitle, transcriptTitleX, 25);
  pdf.setLineWidth(0.3);
  pdf.line(transcriptTitleX, 27, transcriptTitleX + transcriptTitleWidth, 27);
  yPos = 40;

  // Add transcript content with padding
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');

  // Check if we have timestamped data, use it if available
  if (templateData.timestampedTranscript && templateData.timestampedTranscript.length > 0) {
    // Process segments to group by speaker with interval-based timestamps
    let currentSpeaker: string | undefined = undefined;
    let accumulatedText = '';
    let currentParagraphSentenceCount = 0;
    let shouldRenderSpeakerLabel = true;
    // Start from the first timestamp interval (0 seconds)
    let nextTimestampTarget = 0;
    let pendingTimestamp: string | null = null;

    const addNewPage = () => {
      pdf.addPage();
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
      return 25;
    };

    const renderTextWithTimestamp = (
      text: string,
      timestamp: string | null,
      speaker: string | undefined,
      includeSpeakerLabel: boolean
    ) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(0, 0, 0);

      if (transcriptStyle.speakerPlacement === 'inline' && includeSpeakerLabel) {
        if (yPos > pageHeight - 50) yPos = addNewPage();
        const speakerLabel = `${getSpeakerDisplayName(speaker)}:`;
        pdf.setFont('helvetica', transcriptStyle.speakerBold ? 'bold' : 'normal');
        pdf.text(speakerLabel, 25, yPos);
        const labelWidth = pdf.getTextWidth(speakerLabel) + 2;
        pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(text.trim(), Math.max(40, pageWidth - 50 - labelWidth));
        lines.forEach((line: string, index: number) => {
          if (index > 0) {
            yPos += 6;
            if (yPos > pageHeight - 50) yPos = addNewPage();
          }
          pdf.text(line, index === 0 ? 25 + labelWidth : 25, yPos);
        });
        yPos += 6;
        if (timestamp) {
          pdf.setFont('helvetica', 'bold');
          pdf.text(`[${timestamp}]`, 25, yPos);
          yPos += 6;
        }
        return;
      }

      if (timestamp) {
        // Text with inline timestamp
        const textBeforeTimestamp = text.trim();
        const combinedText = `${textBeforeTimestamp} `;
        const lines = pdf.splitTextToSize(combinedText, pageWidth - 50);

        for (let i = 0; i < lines.length; i++) {
          if (yPos > pageHeight - 50) {
            yPos = addNewPage();
          }
          pdf.text(lines[i], 25, yPos);
          yPos += 6;
        }

        // Add timestamp on same line or next line
        if (yPos > pageHeight - 50) {
          yPos = addNewPage();
        }
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 51, 102); // Brand color for timestamps
        pdf.text(`[${timestamp}]`, 25, yPos);
        yPos += 6;

      } else {
        // Regular text without timestamp
        const lines = pdf.splitTextToSize(text.trim(), pageWidth - 50);
        for (let i = 0; i < lines.length; i++) {
          if (yPos > pageHeight - 50) {
            yPos = addNewPage();
          }
          pdf.text(lines[i], 25, yPos);
          yPos += 6;
        }
      }
    };

    const addCurrentSegment = () => {
      if (accumulatedText.trim()) {
        renderTextWithTimestamp(accumulatedText, pendingTimestamp, currentSpeaker, shouldRenderSpeakerLabel);
        accumulatedText = '';
        currentParagraphSentenceCount = 0;
        pendingTimestamp = null;
        shouldRenderSpeakerLabel = false;
        yPos += Math.max(2, transcriptStyle.paragraphSpacingAfter / 50);
      }
    };

    for (let i = 0; i < templateData.timestampedTranscript.length; i++) {
      const segment = templateData.timestampedTranscript[i];
      const speakerChanged = currentSpeaker !== undefined && currentSpeaker !== segment.speaker;
      const reachedSentenceLimit = currentParagraphSentenceCount >= MAX_SENTENCES_PER_PARAGRAPH;

      // If speaker changed, finalize current segment and add speaker label
      if (speakerChanged) {
        addCurrentSegment();

        shouldRenderSpeakerLabel = true;
        // Add extra space before new speaker
        yPos += Math.max(2, transcriptStyle.speakerSpacingBefore / 70);
        if (yPos > pageHeight - 50) {
          yPos = addNewPage();
        }

        if (transcriptStyle.speakerPlacement === 'own-line') {
          pdf.setFont('helvetica', transcriptStyle.speakerBold ? 'bold' : 'normal');
          pdf.setTextColor(0, 0, 0);
          pdf.text(getSpeakerDisplayName(segment.speaker), 25, yPos);
          yPos += Math.max(6, transcriptStyle.speakerSpacingAfter / 25);
        }

        currentSpeaker = segment.speaker;
        // Don't reset timestamp target when speaker changes - keep continuous timeline
      } else if (reachedSentenceLimit) {
        addCurrentSegment();
      } else if (currentSpeaker === undefined) {
        // First segment - add speaker label
        if (yPos > pageHeight - 50) {
          yPos = addNewPage();
        }
        if (transcriptStyle.speakerPlacement === 'own-line') {
          pdf.setFont('helvetica', transcriptStyle.speakerBold ? 'bold' : 'normal');
          pdf.setTextColor(0, 0, 0);
          pdf.text(getSpeakerDisplayName(segment.speaker), 25, yPos);
          yPos += Math.max(6, transcriptStyle.speakerSpacingAfter / 25);
        }

        currentSpeaker = segment.speaker;
        // Set the first timestamp target based on the frequency
        nextTimestampTarget = activeTimestampFrequency || 60;
      }

      // Check if we've passed a timestamp target - handle multiple missed timestamps
      while (activeTimestampFrequency !== null && segment.start >= nextTimestampTarget) {
        // If we already have a pending timestamp, we need to insert it first
        if (pendingTimestamp && accumulatedText.trim()) {
          addCurrentSegment();
        }
        pendingTimestamp = formatTimestamp(nextTimestampTarget);
        nextTimestampTarget += activeTimestampFrequency;
      }

      // Check for sentence end to insert timestamp
      const endsWithSentence = /[.!?]\s*$/.test(segment.text);

      if (pendingTimestamp && endsWithSentence) {
        accumulatedText += segment.text;
        currentParagraphSentenceCount += countCompletedSentences(segment.text);
        addCurrentSegment();
      } else {
        accumulatedText += segment.text + ' ';
        currentParagraphSentenceCount += countCompletedSentences(segment.text);
      }
    }

    // Add any remaining text
    addCurrentSegment();

  } else {
    // Fallback to regular content without timestamps
    const content = templateData.transcriptContent || '{{transcript_body}}';
    const lines = pdf.splitTextToSize(content, pageWidth - 50);

    for (let i = 0; i < lines.length; i++) {
      if (yPos > pageHeight - 50) {
        pdf.addPage();
        // Add border to new page
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
        yPos = 25;
      }
      pdf.text(lines[i], 25, yPos);
      yPos += 6;
    }
  }

  // Add footer to all pages
  const pageCount = pdf.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);

    // Add page border if not first page
    if (i > 1) {
      pdf.setDrawColor(0, 0, 0);
      pdf.setLineWidth(0.5);
      pdf.rect(10, 10, pageWidth - 20, pageHeight - 20);
    }

    // Footer content
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(0, 0, 0);
    pdf.text('www.talktotext.ca', 20, pageHeight - 15);
    pdf.text(`Page ${i} of ${pageCount}`, pageWidth - 40, pageHeight - 15);

    // Footer separator line
    pdf.setLineWidth(0.2);
    pdf.line(20, pageHeight - 20, pageWidth - 20, pageHeight - 20);
  }

  const filename = templateData.fileName.split('.')[0];
  pdf.save(`${filename}_transcript.pdf`);
}

const getTranscriptMetadataEntries = (templateData: TranscriptTemplateData): [string, string][] =>
  [
    ...(templateData.clientName ? [['Client Name:', templateData.clientName]] : []),
    ...(templateData.projectName ? [['Project Name:', templateData.projectName]] : []),
    ['Date:', templateData.date],
    ['File Name:', templateData.fileName],
    ['Provider Name:', templateData.providerName || 'Talk to Text'],
    ...(templateData.patientName ? [['Patient Name:', templateData.patientName]] : []),
    ...(templateData.location ? [['Location:', templateData.location]] : []),
    ...(templateData.time ? [['Time:', templateData.time]] : []),
  ] as [string, string][];

function generateCoverPage(templateData: TranscriptTemplateData): Paragraph[] {
  const metadata = getTranscriptMetadataEntries(templateData);

  return [
    new Paragraph({
      children: [],
      spacing: { before: 2600, after: 500 },
    }),
    ...metadata.map(([label, value]) =>
      new Paragraph({
        children: [
          new TextRun({ text: `${label} `, bold: true, size: 24, color: "000000" }),
          new TextRun({ text: value, size: 24, color: "000000" }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 180 },
      })
    ),
    new Paragraph({
      children: [new PageBreak()],
    }),
  ];
}

// Helper function to generate DOCX transcript content with interval-based timestamps and speakers
function generateDocxTranscriptContent(templateData: TranscriptTemplateData, options?: ExportOptions): Paragraph[] {
  if (!templateData.timestampedTranscript || templateData.timestampedTranscript.length === 0) {
    // Fallback to regular content
    return [
      new Paragraph({
        children: [
          new TextRun({
            text: templateData.transcriptContent || "{{transcript_body}}",
            size: 22,
            color: "000000",
          }),
        ],
        spacing: { line: 300 },
      })
    ];
  }

  const timestampFrequency = options?.timestampFrequency || 60;
  const activeTimestampFrequency = timestampFrequency === 'none' ? null : timestampFrequency;
  const speakerNames = options?.speakerNames || {};
  const transcriptStyle = getTranscriptStylePreset(options?.transcriptStyleId);
  const orderedSpeakers = getOrderedSpeakerIds(templateData.timestampedTranscript);
  const speakerLabelLayout = options?.speakerLabelLayout || (
    transcriptStyle.speakerPlacement === 'tab-hanging'
      ? 'tab-hanging'
      : transcriptStyle.speakerPlacement === 'inline'
      ? 'space-inline'
      : 'separate-line'
  );
  const usesInlineSpeakerLabels = speakerLabelLayout === 'tab-hanging' || speakerLabelLayout === 'space-inline';
  const hangingIndentTwips = 2268; // 4 cm, so wrapped lines align under transcript text.

  const getSpeakerDisplayName = (speaker: string | undefined): string => {
    const providedDisplayName = options?.getSpeakerDisplayName?.(speaker);
    if (providedDisplayName) return getStyledSpeakerLabel(transcriptStyle, providedDisplayName, speaker, orderedSpeakers);
    if (!speaker || speaker === 'UU') return 'Speaker';
    if (speakerNames[speaker]) {
      return getStyledSpeakerLabel(transcriptStyle, speakerNames[speaker], speaker, orderedSpeakers);
    }
    return getStyledSpeakerLabel(transcriptStyle, `Speaker ${speaker.replace('S', '')}`, speaker, orderedSpeakers);
  };

  const paragraphs: Paragraph[] = [];
  let currentSpeaker: string | undefined = undefined;
  let accumulatedText = '';
  let currentParagraphSentenceCount = 0;
  let shouldRenderSpeakerLabelOnNextParagraph = true;
  // Start from the first timestamp interval (0 seconds)
  let nextTimestampTarget = 0;
  let pendingTimestamp: string | null = null;

  const addSpeakerLabelParagraph = (speaker: string | undefined, before = transcriptStyle.speakerSpacingBefore) => {
    if (usesInlineSpeakerLabels) return;

    paragraphs.push(new Paragraph({
      children: [
        new TextRun({
          text: getSpeakerDisplayName(speaker),
          bold: transcriptStyle.speakerBold,
          color: "000000",
          size: 24
        })
      ],
      spacing: {
        before,
        after: transcriptStyle.speakerSpacingAfter
      }
    }));
  };

  const addCurrentSegment = (speaker: string | undefined) => {
    if (accumulatedText.trim()) {
      const children: TextRun[] = [];
      const speakerDisplayName = getSpeakerDisplayName(speaker);

      if (usesInlineSpeakerLabels && shouldRenderSpeakerLabelOnNextParagraph) {
        children.push(new TextRun({
          text: `${speakerDisplayName}:`,
          bold: transcriptStyle.speakerBold,
          color: "000000",
          size: 24
        }));

        children.push(new TextRun({
          text: speakerLabelLayout === 'tab-hanging' ? '\t' : ' ',
          size: 22,
          color: "000000"
        }));
      }

      // Add text
      children.push(new TextRun({
        text: accumulatedText.trim(),
        size: 22,
        color: "000000"
      }));

      // Add timestamp if present
      if (pendingTimestamp) {
        children.push(new TextRun({
          text: ` [${pendingTimestamp}]`,
          bold: true,
          color: "000000",
          size: 22
        }));
      }

      paragraphs.push(new Paragraph({
        children,
        indent: speakerLabelLayout === 'tab-hanging'
          ? { left: hangingIndentTwips, hanging: hangingIndentTwips }
          : undefined,
        tabStops: speakerLabelLayout === 'tab-hanging'
          ? [{ type: TabStopType.LEFT, position: hangingIndentTwips }]
          : undefined,
        spacing: {
          line: transcriptStyle.lineSpacing,
          after: transcriptStyle.paragraphSpacingAfter
        }
      }));

      accumulatedText = '';
      currentParagraphSentenceCount = 0;
      shouldRenderSpeakerLabelOnNextParagraph = false;
      pendingTimestamp = null;
    }
  };

  for (let i = 0; i < templateData.timestampedTranscript.length; i++) {
    const segment = templateData.timestampedTranscript[i];
    const speakerChanged = currentSpeaker !== undefined && currentSpeaker !== segment.speaker;
    const reachedSentenceLimit = currentParagraphSentenceCount >= MAX_SENTENCES_PER_PARAGRAPH;

    // If speaker changed, finalize current segment and add speaker label
    if (speakerChanged) {
      addCurrentSegment(currentSpeaker);

      // Add speaker label paragraph
      addSpeakerLabelParagraph(segment.speaker);

      currentSpeaker = segment.speaker;
      shouldRenderSpeakerLabelOnNextParagraph = true;
      // Don't reset timestamp target when speaker changes - keep continuous timeline
    } else if (reachedSentenceLimit) {
      addCurrentSegment(currentSpeaker);
    } else if (currentSpeaker === undefined) {
      // First segment - add speaker label
      addSpeakerLabelParagraph(segment.speaker, Math.min(200, transcriptStyle.speakerSpacingBefore));

      currentSpeaker = segment.speaker;
      shouldRenderSpeakerLabelOnNextParagraph = true;
      // Set the first timestamp target based on the frequency
      nextTimestampTarget = activeTimestampFrequency || 60;
    }

    // Check if we've passed a timestamp target - handle multiple missed timestamps
    while (activeTimestampFrequency !== null && segment.start >= nextTimestampTarget) {
      // If we already have a pending timestamp, we need to insert it first
      if (pendingTimestamp && accumulatedText.trim()) {
        addCurrentSegment(currentSpeaker);
      }
      pendingTimestamp = formatTimestamp(nextTimestampTarget);
      nextTimestampTarget += activeTimestampFrequency;
    }

    // Check for sentence end to insert timestamp
    const endsWithSentence = /[.!?]\s*$/.test(segment.text);

    if (pendingTimestamp && endsWithSentence) {
      accumulatedText += segment.text;
      currentParagraphSentenceCount += countCompletedSentences(segment.text);
      addCurrentSegment(currentSpeaker);
    } else {
      accumulatedText += segment.text + ' ';
      currentParagraphSentenceCount += countCompletedSentences(segment.text);
    }
  }

  // Add any remaining text
  addCurrentSegment(currentSpeaker);

  return paragraphs;
}

export async function exportTranscriptDOCX(templateData: TranscriptTemplateData, options?: ExportOptions): Promise<void> {
  const doc = new Document({
    sections: [
      {
        children: [
          ...generateCoverPage(templateData),

          // Transcript section header
          new Paragraph({
            children: [
              new TextRun({
                text: "TRANSCRIPT",
                bold: true,
                underline: {},
                color: "000000",
                size: 24,
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 400, after: 200 },
          }),

          // Transcript content - handle timestamped segments
          ...generateDocxTranscriptContent(templateData, options),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  const blob = new Blob([new Uint8Array(buffer)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  const filename = templateData.fileName.split('.')[0];
  a.download = `${filename}_transcript.docx`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export function formatTranscriptSegmentsForStyle(
  segments: TranscriptSegment[] | undefined,
  styleId: TranscriptStyleId,
  getSpeakerDisplayName: (speaker: string | undefined) => string
): string {
  if (!segments?.length) return '';

  const preset = getTranscriptStylePreset(styleId);
  const orderedSpeakers = getOrderedSpeakerIds(segments);
  const groups: Array<{ speaker?: string; text: string }> = [];

  segments.forEach(segment => {
    const text = normalizeTranscriptSegmentText(segment.text);
    if (!text) return;
    const previous = groups[groups.length - 1];
    if (previous && previous.speaker === segment.speaker) {
      previous.text = `${previous.text} ${text}`.trim();
    } else {
      groups.push({ speaker: segment.speaker, text });
    }
  });

  return groups.map(group => {
    const displayName = getSpeakerDisplayName(group.speaker);
    const label = getStyledSpeakerLabel(preset, displayName, group.speaker, orderedSpeakers);
    return preset.speakerPlacement === 'own-line'
      ? `${label}:\n${group.text}`
      : `${label}: ${group.text}`;
  }).join('\n\n');
}

export function exportTranscriptTXT(templateData: TranscriptTemplateData): void {
  // Build metadata lines only for fields that have values
  const metadataLines = [
    templateData.clientName && `Client Name: ${templateData.clientName}`,
    templateData.projectName && `Project Name: ${templateData.projectName}`,
    `Date: ${templateData.date}`,
    `File Name: ${templateData.fileName}`,
    `Provider Name: ${templateData.providerName}`,
    templateData.patientName && `Patient Name: ${templateData.patientName}`,
    templateData.location && `Location: ${templateData.location}`,
    templateData.time && `Time: ${templateData.time}`
  ].filter(Boolean).join('\n');

  // Generate transcript content with timestamps if available
  let transcriptContent = '';
  if (templateData.timestampedTranscript && templateData.timestampedTranscript.length > 0) {
    transcriptContent = templateData.timestampedTranscript
      .map(segment => `[${formatTimestamp(segment.start)}] ${segment.text}`)
      .join('\n\n');
  } else {
    transcriptContent = templateData.transcriptContent;
  }

  const content = `TALK TO TEXT CANADA

${metadataLines}

────────────────────────────────────────────────────────────────

${transcriptContent}

────────────────────────────────────────────────────────────────
www.talktotext.ca`;

  const blob = new Blob([content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  const filename = templateData.fileName.split('.')[0];
  a.download = `${filename}_transcript.txt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}
