"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { generateTemplateData, exportTranscriptPDF, exportTranscriptDOCX } from '@/lib/utils/transcriptTemplate';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import {
  Download,
  Share2,
  Edit3,
  Save,
  Clock,
  FileText,
  ArrowLeft,
  AlertCircle,
  Link2,
  Globe,
  Search,
  X,
  ChevronDown,
  ChevronUp,
  Replace,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { getTranscriptionById, updateTranscriptionStatus, TranscriptionJob } from '@/lib/firebase/transcriptions';
import { Timestamp } from 'firebase/firestore';
import { formatTime, formatDuration } from '@/lib/utils';
import { AudioPlayer, AudioPlayerRef } from '@/components/ui/AudioPlayer';
import { formatTranscriptMechanically } from '@/lib/utils/transcript-processor';

// Types for Speechmatics transcript data
interface SpeechmaticsAlternative {
  content: string;
  confidence?: number;
}

interface SpeechmaticsResult {
  type: 'word' | 'punctuation';
  alternatives: SpeechmaticsAlternative[];
  attaches_to?: 'previous' | 'next';
  start_time?: number;
  end_time?: number;
}

interface SpeechmaticsTranscript {
  results: SpeechmaticsResult[];
}

type TranscriptData = string | SpeechmaticsTranscript | unknown;

type CleanupOptionKey =
  | 'removeUm'
  | 'removeUh'
  | 'removeAh'
  | 'removeYouKnow'
  | 'removeIMean'
  | 'removeLike'
  | 'removeSortOf'
  | 'removeKindOf'
  | 'removeDuplicateAdjacentWords'
  | 'removeSentenceOpeningSo'
  | 'removeSentenceOpeningBut';

type CleanupOptionsState = Record<CleanupOptionKey, boolean>;

interface CleanupPreview {
  changeCount: number;
  segmentCount: number;
  examples: Array<{
    label: string;
    before: string;
    after: string;
  }>;
}

type LightGrammarDecision = 'pending' | 'accepted' | 'skipped';

interface CleanupChange {
  id: string;
  label: string;
  before: string;
  after: string;
  segmentIndex?: number;
  status: LightGrammarDecision;
}

interface FillerCleanupPreview extends CleanupPreview {
  changes: CleanupChange[];
}

interface FormattingOptionsState {
  useEmDashForEllipses: boolean;
}

interface FormattingPreview extends CleanupPreview {
  changes: CleanupChange[];
}

interface LightGrammarChange {
  id: string;
  label: string;
  before: string;
  after: string;
  segmentIndex?: number;
  status: LightGrammarDecision;
}

interface LightGrammarPreview extends CleanupPreview {
  changes: LightGrammarChange[];
}

const cleanupOptionItems: Array<{ key: CleanupOptionKey; label: string }> = [
  { key: 'removeUm', label: 'remove um' },
  { key: 'removeUh', label: 'remove uh' },
  { key: 'removeAh', label: 'remove ah' },
  { key: 'removeYouKnow', label: 'remove you know' },
  { key: 'removeIMean', label: 'remove I mean' },
  { key: 'removeLike', label: 'remove like' },
  { key: 'removeSortOf', label: 'remove sort of' },
  { key: 'removeKindOf', label: 'remove kind of' },
  { key: 'removeDuplicateAdjacentWords', label: 'remove duplicate adjacent words' },
  { key: 'removeSentenceOpeningSo', label: 'remove sentence-opening so only' },
  { key: 'removeSentenceOpeningBut', label: 'remove sentence-opening but only' },
];

const initialCleanupOptions: CleanupOptionsState = {
  removeUm: false,
  removeUh: false,
  removeAh: false,
  removeYouKnow: false,
  removeIMean: false,
  removeLike: false,
  removeSortOf: false,
  removeKindOf: false,
  removeDuplicateAdjacentWords: false,
  removeSentenceOpeningSo: false,
  removeSentenceOpeningBut: false,
};

const initialFormattingOptions: FormattingOptionsState = {
  useEmDashForEllipses: false,
};

const normalizeTranscriptSegmentText = (text: string) =>
  text
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();

const joinTranscriptSegmentTexts = (segments: string[]) =>
  segments
    .map(normalizeTranscriptSegmentText)
    .filter(Boolean)
    .join(' ')
    .replace(/\s+([,.!?;:])/g, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

export default function TranscriptViewerPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [transcription, setTranscription] = useState<TranscriptionJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState('');
  const [editedSegments, setEditedSegments] = useState<{[key: number]: string}>({});
  const [saving, setSaving] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'docx' | 'srt' | 'vtt'>('pdf');
  const [timestampFrequency, setTimestampFrequency] = useState<30 | 60 | 300 | 'none'>(60); // 30s, 60s, 5min (300s), or no display timestamps
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [speakerRenameSource, setSpeakerRenameSource] = useState<'toolbar' | 'sidebar' | null>(null);
  const [speakerOrder, setSpeakerOrder] = useState<string[]>([]);
  const [showSpeakerLabels, setShowSpeakerLabels] = useState(true);
  const [mergeSourceSpeaker, setMergeSourceSpeaker] = useState<string>('');
  const [mergeTargetSpeaker, setMergeTargetSpeaker] = useState<string>('');
  const [draggedSpeaker, setDraggedSpeaker] = useState<string | null>(null);
  const [isEditingSpeakerSegments, setIsEditingSpeakerSegments] = useState(false);
  const [highlightedSpeakers, setHighlightedSpeakers] = useState<Set<string>>(new Set());
  const [hoveredSegmentIndex, setHoveredSegmentIndex] = useState<number | null>(null);
  const [selectedSegments, setSelectedSegments] = useState<Set<number>>(new Set());
  const [panelPosition, setPanelPosition] = useState({ x: 16, y: window.innerHeight - 400 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  // Search and replace state
  const [showSearchPanel, setShowSearchPanel] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replaceQuery, setReplaceQuery] = useState('');
  const [searchMatches, setSearchMatches] = useState<{segmentIndex: number, matchIndex: number}[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [cleanupOptions, setCleanupOptions] = useState<CleanupOptionsState>(initialCleanupOptions);
  const [cleanupPreview, setCleanupPreview] = useState<FillerCleanupPreview | null>(null);
  const [showCleanupReview, setShowCleanupReview] = useState(false);
  const [cleanupDecisionHistory, setCleanupDecisionHistory] = useState<CleanupChange[][]>([]);
  const [formattingOptions, setFormattingOptions] = useState<FormattingOptionsState>(initialFormattingOptions);
  const [formattingPreview, setFormattingPreview] = useState<FormattingPreview | null>(null);
  const [showFormattingReview, setShowFormattingReview] = useState(false);
  const [formattingDecisionHistory, setFormattingDecisionHistory] = useState<CleanupChange[][]>([]);
  const [lightGrammarPreview, setLightGrammarPreview] = useState<LightGrammarPreview | null>(null);
  const [showLightGrammarReview, setShowLightGrammarReview] = useState(false);
  const [lightGrammarDecisionHistory, setLightGrammarDecisionHistory] = useState<LightGrammarChange[][]>([]);
  const [showUnsavedLeavePrompt, setShowUnsavedLeavePrompt] = useState(false);
  const pendingLeaveActionRef = useRef<(() => void) | null>(null);

  const handleTimestampFrequencyChange = (value: string) => {
    setTimestampFrequency(value === 'none' ? 'none' : Number(value) as 30 | 60 | 300);
  };

  const audioPlayerRef = useRef<AudioPlayerRef>(null);
  const contentEditableRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    if (id && user) {
      loadTranscription();
    }
  }, [id, user]);

  // Add selection change listener for better text selection detection
  useEffect(() => {
    if (!isEditingSpeakerSegments) return;

    const handleSelectionChange = () => {
      // Small delay to ensure selection is complete
      setTimeout(handleTextSelection, 10);
    };

    document.addEventListener('selectionchange', handleSelectionChange);

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
    };
  }, [isEditingSpeakerSegments, transcription?.timestampedTranscript]);

  const loadTranscription = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[Load] Starting to load transcription:', id);

      const transcriptionData = await getTranscriptionById(id as string);

      console.log(`[Load] Loaded transcription ${id} from Firestore:`, {
        hasTimestampedTranscript: !!transcriptionData?.timestampedTranscript,
        timestampedSegmentsCount: transcriptionData?.timestampedTranscript?.length || 0,
        hasTranscript: !!transcriptionData?.transcript,
        transcriptLength: transcriptionData?.transcript?.length || 0,
        hasTranscriptStoragePath: !!transcriptionData?.transcriptStoragePath,
        status: transcriptionData?.status,
        timestampedTranscriptSample: transcriptionData?.timestampedTranscript?.slice(0, 2),
        allKeys: Object.keys(transcriptionData || {})
      });

      if (!transcriptionData) {
        setError('Transcription not found');
        return;
      }

      // Check if user owns this transcription or is admin
      if (transcriptionData.userId !== user?.uid && userData?.role !== 'admin') {
        setError('You do not have permission to view this transcription');
        return;
      }

      // If transcript is stored in Storage (for large files), fetch it
      if (transcriptionData.transcriptStoragePath) {
        console.log(`[Load] Transcription uses Storage, fetching from: ${transcriptionData.transcriptStoragePath}`);

        try {
          const response = await fetch(`/api/transcriptions/${id}/transcript`);
          console.log('[Load] Storage fetch response status:', response.status);

          if (response.ok) {
            const { transcript, timestampedTranscript } = await response.json();
            console.log('[Load] Loaded from Storage:', {
              transcriptLength: transcript?.length,
              segmentsCount: timestampedTranscript?.length,
              firstSegmentSample: timestampedTranscript?.[0]?.text?.substring(0, 50)
            });
            transcriptionData.transcript = transcript;
            transcriptionData.timestampedTranscript = timestampedTranscript;
          } else {
            const errorText = await response.text();
            console.error('[Load] Failed to fetch from Storage:', response.status, errorText);
          }
        } catch (fetchError) {
          console.error('[Load] Error fetching transcript from Storage:', fetchError);
        }
      }

      console.log('[Load] Final transcription data being set to state:', {
        hasTranscript: !!transcriptionData.transcript,
        hasTimestampedTranscript: !!transcriptionData.timestampedTranscript,
        segmentsCount: transcriptionData.timestampedTranscript?.length
      });

      setTranscription(transcriptionData);
      setEditedTranscript(transcriptionData.transcript || '');

      // Load saved speaker names
      if (transcriptionData.speakerNames) {
        setSpeakerNames(transcriptionData.speakerNames);
      }

    } catch (err) {
      console.error('[Load] Error loading transcription:', err);
      setError('Failed to load transcription');
    } finally {
      setLoading(false);
    }
  };


  const formatDate = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return 'Unknown';
    return timestamp.toDate().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Helper function to extract plain text from transcript data
  const extractPlainText = (transcript: TranscriptData): string => {
    if (!transcript) return '';

    // If it's already a string, return it
    if (typeof transcript === 'string') {
      return transcript;
    }

    // If it's a Speechmatics format with results array
    if (typeof transcript === 'object' && transcript !== null && 'results' in transcript) {
      const speechmaticsData = transcript as SpeechmaticsTranscript;
      const tokens = speechmaticsData.results
        .filter((result) => result.type === 'word' || result.type === 'punctuation')
        .map((result) => {
          const content = result.alternatives?.[0]?.content || '';
          return {
            content,
            type: result.type,
            attachesToPrevious: result.attaches_to === 'previous'
          };
        });

      let text = '';
      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (token.type === 'punctuation' && token.attachesToPrevious) {
          // Attach punctuation directly to previous word
          text += token.content;
        } else {
          // Add space before word (except for first word)
          if (text && token.type === 'word') {
            text += ' ';
          }
          text += token.content;
        }
      }

      return text.trim();
    }

    // Fallback: try to convert to string
    return String(transcript);
  };

  const getWordCount = (transcript: TranscriptData) => {
    const text = extractPlainText(transcript);
    return text ? text.trim().split(/\s+/).filter(word => word.length > 0).length : 0;
  };

  useEffect(() => {
    if (!transcription?.timestampedTranscript || transcription.timestampedTranscript.length === 0) return;

    const speakers = Array.from(new Set(
      transcription.timestampedTranscript
        .map(segment => segment.speaker)
        .filter((speaker): speaker is string => Boolean(speaker) && speaker !== 'UU')
    )).sort();

    if (speakerOrder.length === 0 && speakers.length > 0) {
      setSpeakerOrder(speakers);
    }
  }, [transcription?.timestampedTranscript, speakerOrder.length]);

  const mergeSpeakers = (sourceSpeaker: string, targetSpeaker: string) => {
    if (!transcription || !transcription.timestampedTranscript) return;
    if (!sourceSpeaker || !targetSpeaker || sourceSpeaker === targetSpeaker) return;

    const updatedTranscript = transcription.timestampedTranscript.map((segment) => ({
      ...segment,
      speaker: segment.speaker === sourceSpeaker ? targetSpeaker : segment.speaker
    }));

    const updatedSpeakerNames = { ...speakerNames };
    if (updatedSpeakerNames[sourceSpeaker]) {
      if (!updatedSpeakerNames[targetSpeaker]) {
        updatedSpeakerNames[targetSpeaker] = updatedSpeakerNames[sourceSpeaker];
      }
      delete updatedSpeakerNames[sourceSpeaker];
    }

    const updatedOrder = speakerOrder.filter((speaker) => speaker !== sourceSpeaker);

    setTranscription({
      ...transcription,
      timestampedTranscript: updatedTranscript
    });
    setSpeakerNames(updatedSpeakerNames);
    setSpeakerOrder(updatedOrder);
    setMergeSourceSpeaker('');
    setMergeTargetSpeaker('');

    toast({
      title: 'Speakers merged',
      description: `${getSpeakerDisplayName(sourceSpeaker)} merged into ${getSpeakerDisplayName(targetSpeaker)}.`
    });
  };


  const formatTranscriptText = (text: string) => {
    if (!text) return text;
    // Remove spaces before commas and periods
    return text.replace(/\s+([,.!?;:])/g, '$1');
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const hasUnsavedTranscriptChanges = () => {
    if (!transcription) return false;

    if (Object.keys(editedSegments).length > 0) {
      return true;
    }

    if (!transcription.timestampedTranscript || transcription.timestampedTranscript.length === 0) {
      return editedTranscript.trim() !== (transcription.transcript || '').trim();
    }

    return false;
  };

  const getDraftTranscriptText = () => {
    if (!transcription) return '';

    if (transcription.timestampedTranscript && transcription.timestampedTranscript.length > 0) {
      return joinTranscriptSegmentTexts(
        transcription.timestampedTranscript.map((segment, index) =>
          editedSegments[index] !== undefined ? editedSegments[index] : segment.text
        )
      );
    }

    return isEditing ? editedTranscript : (transcription.transcript || '');
  };

  const discardTranscriptChanges = () => {
    setIsEditing(false);
    setEditedSegments({});
    setEditedTranscript(transcription?.transcript || '');
    clearLightGrammarPreview();
    clearCleanupPreview();
    clearFormattingPreview();
  };

  const saveEdits = async () => {
    if (!transcription) return false;

    try {
      setSaving(true);

      console.log('[Save] editedSegments:', editedSegments);
      console.log('[Save] hasTimestampedTranscript:', !!transcription.timestampedTranscript);
      console.log('[Save] transcriptStoragePath:', transcription.transcriptStoragePath);

      // Check if we have edited segments (inline editing)
      if (Object.keys(editedSegments).length > 0 && transcription.timestampedTranscript) {
        console.log('[Save] Saving edited segments...');

        // Apply edited segments to timestampedTranscript
        const updatedTimestampedTranscript = transcription.timestampedTranscript.map((segment, index) => {
          if (editedSegments[index] !== undefined) {
            return { ...segment, text: editedSegments[index] };
          }
          return segment;
        });

        // Generate new plain transcript from segments
        const updatedPlainTranscript = joinTranscriptSegmentTexts(
          updatedTimestampedTranscript.map(seg => seg.text)
        );

        console.log('[Save] Updated segments count:', Object.keys(editedSegments).length);

        // Save via API if using Storage, otherwise save to Firestore
        if (transcription.transcriptStoragePath) {
          console.log('[Save] Saving to Storage via API...');
          const token = await user?.getIdToken();
          const response = await fetch(`/api/transcriptions/${transcription.id}/transcript`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
              timestampedTranscript: updatedTimestampedTranscript,
              transcript: updatedPlainTranscript
            })
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('[Save] Storage save failed:', error);
            throw new Error('Failed to save transcript to Storage');
          }
          console.log('[Save] Successfully saved to Storage');
        } else {
          console.log('[Save] Saving to Firestore...');
          await updateTranscriptionStatus(transcription.id!, 'complete', {
            timestampedTranscript: updatedTimestampedTranscript,
            transcript: updatedPlainTranscript
          });
          console.log('[Save] Successfully saved to Firestore');
        }

        // Update local state
        setTranscription(prev => prev ? {
          ...prev,
          timestampedTranscript: updatedTimestampedTranscript,
          transcript: updatedPlainTranscript
        } : null);
        setEditedSegments({});

        // Reload from server to verify persistence
        console.log('[Save] Reloading transcript to verify save...');
        await loadTranscription();
      } else if (editedTranscript.trim()) {
        console.log('[Save] Saving legacy plain text...');
        // Legacy plain text editing (fallback)
        await updateTranscriptionStatus(transcription.id!, 'complete', {
          transcript: editedTranscript.trim()
        });

        setTranscription(prev => prev ? { ...prev, transcript: editedTranscript.trim() } : null);

        // Reload from server to verify persistence
        await loadTranscription();
      } else {
        console.warn('[Save] No changes to save!');
      }

      setIsEditing(false);

      toast({
        title: 'Changes saved',
        description: 'Transcript has been updated successfully'
      });
      return true;

    } catch (error) {
      console.error('[Save] Error saving transcript:', error);
      toast({
        title: 'Save failed',
        description: 'Unable to save changes. Please try again.',
        variant: 'destructive'
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const requestLeaveEditor = (action: () => void) => {
    if (!hasUnsavedTranscriptChanges()) {
      action();
      return;
    }

    pendingLeaveActionRef.current = action;
    setShowUnsavedLeavePrompt(true);
  };

  const confirmSaveAndLeave = async () => {
    const saved = await saveEdits();
    if (!saved) return;

    setShowUnsavedLeavePrompt(false);
    const action = pendingLeaveActionRef.current;
    pendingLeaveActionRef.current = null;
    action?.();
  };

  const confirmDiscardAndLeave = () => {
    discardTranscriptChanges();
    setShowUnsavedLeavePrompt(false);
    const action = pendingLeaveActionRef.current;
    pendingLeaveActionRef.current = null;
    action?.();
  };

  const cancelLeaveEditor = () => {
    setShowUnsavedLeavePrompt(false);
    pendingLeaveActionRef.current = null;
  };

  const saveAndDownload = async () => {
    const saved = await saveEdits();
    if (saved) {
      exportTranscript(selectedFormat);
    }
  };

  // Download admin-uploaded transcript directly
  const downloadAdminTranscript = () => {
    if (!transcription?.adminTranscriptURL) return;

    // Open the download URL directly
    window.open(transcription.adminTranscriptURL, '_blank');

    toast({
      title: 'Download started',
      description: `Downloading ${transcription.adminTranscriptFilename || 'transcript'}`
    });
  };

  // Format seconds to SRT timestamp (HH:MM:SS,mmm)
  const formatSRTTimestamp = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  };

  // Format seconds to VTT timestamp (HH:MM:SS.mmm)
  const formatVTTTimestamp = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.round((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  };

  const exportSubtitles = (format: 'srt' | 'vtt') => {
    if (!transcription?.timestampedTranscript || transcription.timestampedTranscript.length === 0) {
      toast({
        title: 'No subtitle data',
        description: 'This transcription does not have timestamped segments needed for subtitles.',
        variant: 'destructive'
      });
      return;
    }

    const segments = transcription.timestampedTranscript;
    let content = '';

    if (format === 'vtt') {
      content = 'WEBVTT\n\n';
    }

    segments.forEach((segment, index) => {
      const start = format === 'srt' ? formatSRTTimestamp(segment.start) : formatVTTTimestamp(segment.start);
      const end = format === 'srt' ? formatSRTTimestamp(segment.end) : formatVTTTimestamp(segment.end);
      const speakerPrefix = segment.speaker && segment.speaker !== 'UU'
        ? `${getSpeakerDisplayName(segment.speaker)}: `
        : '';
      const text = editedSegments[index] !== undefined ? editedSegments[index] : segment.text;

      if (format === 'srt') {
        content += `${index + 1}\n${start} --> ${end}\n${speakerPrefix}${text}\n\n`;
      } else {
        content += `${index + 1}\n${start} --> ${end}\n${speakerPrefix}${text}\n\n`;
      }
    });

    // Download the file
    const blob = new Blob([content], { type: format === 'vtt' ? 'text/vtt' : 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const baseName = transcription.originalFilename?.replace(/\.[^.]+$/, '') || 'transcript';
    a.href = url;
    a.download = `${baseName}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: 'Download started',
      description: `Subtitles downloaded as ${format.toUpperCase()}`
    });
  };

  const exportTranscript = async (format: 'pdf' | 'docx' | 'srt' | 'vtt') => {
    if (!transcription) return;

    if (format === 'srt' || format === 'vtt') {
      exportSubtitles(format);
      return;
    }

    try {
      // Generate template data with current transcript content
      const templateData = generateTemplateData({
        ...transcription,
        transcript: getDraftTranscriptText()
      }, userData);

      if (format === 'pdf') {
        await exportTranscriptPDF(templateData, {
          timestampFrequency,
          speakerNames,
          getSpeakerColor,
          getSpeakerDisplayName
        });
      } else if (format === 'docx') {
        await exportTranscriptDOCX(templateData, {
          timestampFrequency,
          speakerNames,
          getSpeakerDisplayName
        });
      }

      toast({
        title: 'Download started',
        description: `Transcript downloaded as ${format.toUpperCase()} using professional template`
      });

    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export failed',
        description: 'Unable to export transcript. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Search and replace functions
  const performSearch = () => {
    if (!searchQuery || !transcription?.timestampedTranscript) {
      setSearchMatches([]);
      setCurrentMatchIndex(0);
      return;
    }

    const matches: {segmentIndex: number, matchIndex: number}[] = [];
    const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();

    transcription.timestampedTranscript.forEach((segment, segmentIndex) => {
      // Use edited text if available, otherwise use original
      const segmentText = editedSegments[segmentIndex] !== undefined
        ? editedSegments[segmentIndex]
        : segment.text;
      const text = caseSensitive ? segmentText : segmentText.toLowerCase();
      let startIndex = 0;
      let matchIndex = text.indexOf(query, startIndex);

      while (matchIndex !== -1) {
        matches.push({ segmentIndex, matchIndex });
        startIndex = matchIndex + query.length;
        matchIndex = text.indexOf(query, startIndex);
      }
    });

    setSearchMatches(matches);
    setCurrentMatchIndex(0);

    if (matches.length === 0) {
      toast({
        title: 'No matches found',
        description: `"${searchQuery}" was not found in the transcript`,
        variant: 'default'
      });
    } else {
      // Scroll to first match - wait for DOM to update
      setTimeout(() => {
        const markElements = document.querySelectorAll('mark.ring-yellow-500');
        if (markElements.length > 0) {
          markElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  };

  // Helper function to render text with highlighted search matches
  const renderTextWithHighlights = (text: string, segmentIndices: number[], segments: Array<{text: string, index: number}>) => {
    if (!searchQuery || searchMatches.length === 0 || !transcription?.timestampedTranscript) {
      return text;
    }

    // Build a map of segment index to offset in the combined text
    // IMPORTANT: Use edited text length if available, not original text
    const segmentOffsets = new Map<number, number>();
    let currentOffset = 0;
    segments.forEach((seg) => {
      segmentOffsets.set(seg.index, currentOffset);
      // Use edited text if available for calculating offset
      const segText = editedSegments[seg.index] !== undefined
        ? editedSegments[seg.index]
        : seg.text;
      currentOffset += segText.length + 1; // +1 for the space between segments
    });

    // Find all matches in the combined text by searching directly
    const matches: Array<{position: number, globalIndex: number, isCurrentMatch: boolean}> = [];
    const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();
    const searchText = caseSensitive ? text : text.toLowerCase();

    let startIndex = 0;
    let matchPosition = searchText.indexOf(query, startIndex);

    // Map the global match indices to local positions
    const globalMatchMap = new Map<string, number>();
    searchMatches.forEach((match, idx) => {
      if (segmentIndices.includes(match.segmentIndex)) {
        const offset = segmentOffsets.get(match.segmentIndex) || 0;
        const adjustedPosition = offset + match.matchIndex;
        globalMatchMap.set(`${adjustedPosition}`, idx);
      }
    });

    while (matchPosition !== -1) {
      const globalIndex = globalMatchMap.get(`${matchPosition}`) ?? -1;
      if (globalIndex !== -1) {
        matches.push({
          position: matchPosition,
          globalIndex,
          isCurrentMatch: globalIndex === currentMatchIndex
        });
      }
      startIndex = matchPosition + query.length;
      matchPosition = searchText.indexOf(query, startIndex);
    }

    if (matches.length === 0) {
      return text;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    matches.forEach((match) => {
      const { position, globalIndex, isCurrentMatch } = match;

      // Add text before the match
      if (position > lastIndex) {
        parts.push(text.substring(lastIndex, position));
      }

      // Add the highlighted match
      const matchText = text.substring(position, position + searchQuery.length);
      parts.push(
        <mark
          key={`match-${globalIndex}`}
          className={`${
            isCurrentMatch
              ? 'bg-yellow-400 text-gray-900 font-semibold ring-2 ring-yellow-500'
              : 'bg-yellow-200 text-gray-900'
          } rounded px-0.5`}
        >
          {matchText}
        </mark>
      );

      lastIndex = position + searchQuery.length;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return <>{parts}</>;
  };

  const navigateToMatch = (direction: 'next' | 'prev') => {
    if (searchMatches.length === 0) return;

    let newIndex = currentMatchIndex;
    if (direction === 'next') {
      newIndex = (currentMatchIndex + 1) % searchMatches.length;
    } else {
      newIndex = currentMatchIndex === 0 ? searchMatches.length - 1 : currentMatchIndex - 1;
    }
    setCurrentMatchIndex(newIndex);

    // Scroll to the specific highlighted word, not just the segment
    // Use a timeout to ensure the DOM has updated with the new highlight
    setTimeout(() => {
      // Find the mark element with the current match styling (ring-2 ring-yellow-500)
      const markElements = document.querySelectorAll('mark.ring-yellow-500');
      if (markElements.length > 0) {
        // Should only be one element with the "current match" styling
        markElements[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // Fallback to scrolling to the segment if mark element not found
        const match = searchMatches[newIndex];
        const element = document.getElementById(`segment-${match.segmentIndex}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }, 50);
  };

  const replaceAll = () => {
    if (!searchQuery || !replaceQuery || !transcription?.timestampedTranscript) {
      toast({
        title: 'Invalid input',
        description: 'Please enter both search and replace text',
        variant: 'destructive'
      });
      return;
    }

    const newEditedSegments = { ...editedSegments };
    let replacementCount = 0;

    transcription.timestampedTranscript.forEach((segment, index) => {
      const regex = new RegExp(
        searchQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        caseSensitive ? 'g' : 'gi'
      );
      const currentText = newEditedSegments[index] !== undefined ? newEditedSegments[index] : segment.text;
      const newText = currentText.replace(regex, replaceQuery);

      if (newText !== currentText) {
        newEditedSegments[index] = newText;
        replacementCount++;

        // Update the DOM element immediately
        const element = document.getElementById(`segment-${index}`)?.querySelector('[contenteditable]') as HTMLElement;
        if (element) {
          element.textContent = newText;
        }
      }
    });

    setEditedSegments(newEditedSegments);
    setSearchMatches([]);
    setSearchQuery('');

    toast({
      title: 'Replace complete',
      description: `Replaced ${replacementCount} occurrence(s). Click "Save Changes" to persist.`,
      variant: 'default'
    });
  };

  const replaceNext = () => {
    if (searchMatches.length === 0 || !transcription?.timestampedTranscript || !replaceQuery) {
      toast({
        title: 'Invalid operation',
        description: 'Please search for text first and enter replacement text',
        variant: 'destructive'
      });
      return;
    }

    const match = searchMatches[currentMatchIndex];
    const segment = transcription.timestampedTranscript[match.segmentIndex];
    const currentText = editedSegments[match.segmentIndex] !== undefined
      ? editedSegments[match.segmentIndex]
      : segment.text;

    // Replace just this occurrence
    const beforeMatch = currentText.substring(0, match.matchIndex);
    const afterMatch = currentText.substring(match.matchIndex + searchQuery.length);
    const newText = beforeMatch + replaceQuery + afterMatch;

    // Update edited segments state
    setEditedSegments(prev => {
      const newEditedSegments = {
        ...prev,
        [match.segmentIndex]: newText
      };

      // Re-run search immediately with the new edited segments
      // Use setTimeout to ensure React has re-rendered
      setTimeout(() => {
        // Manually re-search using the updated segments
        if (!searchQuery || !transcription?.timestampedTranscript) return;

        const matches: {segmentIndex: number, matchIndex: number}[] = [];
        const query = caseSensitive ? searchQuery : searchQuery.toLowerCase();

        transcription.timestampedTranscript.forEach((seg, segmentIndex) => {
          // Use the newly edited text
          const segmentText = newEditedSegments[segmentIndex] !== undefined
            ? newEditedSegments[segmentIndex]
            : seg.text;
          const text = caseSensitive ? segmentText : segmentText.toLowerCase();
          let startIndex = 0;
          let matchIndex = text.indexOf(query, startIndex);

          while (matchIndex !== -1) {
            matches.push({ segmentIndex, matchIndex });
            startIndex = matchIndex + query.length;
            matchIndex = text.indexOf(query, startIndex);
          }
        });

        setSearchMatches(matches);
        // Keep current index if still valid, otherwise reset to 0
        if (currentMatchIndex >= matches.length) {
          setCurrentMatchIndex(Math.max(0, matches.length - 1));
        }
      }, 50);

      return newEditedSegments;
    });

    toast({
      title: 'Replaced',
      description: 'Replaced current match. Click "Save Changes" to persist.',
      variant: 'default'
    });
  };

  const hasSelectedCleanupOptions = Object.values(cleanupOptions).some(Boolean);

  const toggleCleanupOption = (option: CleanupOptionKey) => {
    setCleanupOptions(prev => ({
      ...prev,
      [option]: !prev[option],
    }));
    setCleanupPreview(null);
    setShowCleanupReview(false);
    setCleanupDecisionHistory([]);
  };

  const clearCleanupPreview = () => {
    setCleanupPreview(null);
    setShowCleanupReview(false);
    setCleanupDecisionHistory([]);
  };

  const clearLightGrammarPreview = () => {
    setLightGrammarPreview(null);
    setShowLightGrammarReview(false);
    setLightGrammarDecisionHistory([]);
  };

  const hasSelectedFormattingOptions = Object.values(formattingOptions).some(Boolean);

  const toggleFormattingOption = (option: keyof FormattingOptionsState) => {
    setFormattingOptions(prev => ({
      ...prev,
      [option]: !prev[option],
    }));
    setFormattingPreview(null);
    setShowFormattingReview(false);
    setFormattingDecisionHistory([]);
  };

  const clearFormattingPreview = () => {
    setFormattingPreview(null);
    setShowFormattingReview(false);
    setFormattingDecisionHistory([]);
  };

  const estimateLightGrammarChanges = (before: string, after: string) => {
    if (before === after) return 0;

    const patterns = [
      / {2,}/g,
      /\s+([.,!?;:])/g,
      /[.!?](?=[A-Za-z])/g,
      /[.!?]\s+[a-z]/g,
      /(^|[.!?]\s+)So\s+(?!,)/g,
      /(^|[.!?]\s+)(Good morning|Good afternoon|Good evening)\s+(?!,)/gi,
    ];

    const estimated = patterns.reduce((total, pattern) => {
      return total + (before.match(pattern)?.length || 0);
    }, 0);

    return Math.max(1, estimated);
  };

  const buildLightGrammarPreview = (): LightGrammarPreview | null => {
    if (!transcription) return null;

    if (transcription.timestampedTranscript && transcription.timestampedTranscript.length > 0) {
      let changeCount = 0;
      let segmentCount = 0;
      const examples: LightGrammarPreview['examples'] = [];
      const changes: LightGrammarChange[] = [];

      transcription.timestampedTranscript.forEach((segment, index) => {
        const currentText = editedSegments[index] !== undefined ? editedSegments[index] : segment.text;
        const formatted = formatTranscriptMechanically(currentText);

        if (formatted !== currentText) {
          changeCount += estimateLightGrammarChanges(currentText, formatted);
          segmentCount++;

          if (examples.length < 3) {
            examples.push({
              label: `Segment ${index + 1}`,
              before: currentText,
              after: formatted,
            });
          }

          changes.push({
            id: `segment-${index}`,
            label: `Segment ${index + 1}`,
            segmentIndex: index,
            before: currentText,
            after: formatted,
            status: 'pending',
          });
        }
      });

      return { changeCount, segmentCount, examples, changes };
    }

    const currentTranscript = editedTranscript || transcription.transcript || '';
    const formatted = formatTranscriptMechanically(currentTranscript);
    const hasChange = formatted !== currentTranscript;

    return {
      changeCount: hasChange ? estimateLightGrammarChanges(currentTranscript, formatted) : 0,
      segmentCount: hasChange ? 1 : 0,
      examples: hasChange ? [{
        label: 'Transcript',
        before: currentTranscript,
        after: formatted,
      }] : [],
      changes: hasChange ? [{
        id: 'transcript',
        label: 'Transcript',
        before: currentTranscript,
        after: formatted,
        status: 'pending',
      }] : [],
    };
  };

  const previewLightGrammarPass = () => {
    if (!isEditing) {
      toast({
        title: 'Edit Transcript required',
        description: 'Click Edit Transcript before using transcript-changing tools.',
        variant: 'destructive'
      });
      return;
    }

    const preview = buildLightGrammarPreview();
    if (!preview) return;

    setLightGrammarPreview(preview);
    setLightGrammarDecisionHistory([]);
    setShowLightGrammarReview(false);

    toast({
      title: 'Light Grammar Pass preview ready',
      description: preview.changeCount > 0
        ? `${preview.changeCount} proposed change(s) across ${preview.segmentCount} segment(s).`
        : 'No mechanical formatting changes found.',
    });
  };

  const updateLightGrammarChangeStatus = (changeId: string, status: LightGrammarDecision) => {
    if (!lightGrammarPreview) return;

    setLightGrammarDecisionHistory(prev => [...prev, lightGrammarPreview.changes]);
    setLightGrammarPreview({
      ...lightGrammarPreview,
      changes: lightGrammarPreview.changes.map(change =>
        change.id === changeId ? { ...change, status } : change
      ),
    });
  };

  const acceptAllLightGrammarChanges = () => {
    if (!lightGrammarPreview) return;

    setLightGrammarDecisionHistory(prev => [...prev, lightGrammarPreview.changes]);
    setLightGrammarPreview({
      ...lightGrammarPreview,
      changes: lightGrammarPreview.changes.map(change =>
        change.status === 'pending' ? { ...change, status: 'accepted' } : change
      ),
    });
  };

  const undoLightGrammarDecision = () => {
    setLightGrammarDecisionHistory(prev => {
      const previous = prev[prev.length - 1];
      if (!previous || !lightGrammarPreview) return prev;

      setLightGrammarPreview({
        ...lightGrammarPreview,
        changes: previous,
      });

      return prev.slice(0, -1);
    });
  };

  const applyAcceptedLightGrammarChanges = () => {
    if (!isEditing) {
      toast({
        title: 'Edit Transcript required',
        description: 'Click Edit Transcript before applying transcript-changing tools.',
        variant: 'destructive'
      });
      return;
    }

    if (!lightGrammarPreview) {
      toast({
        title: 'Preview required',
        description: 'Preview the Light Grammar Pass before applying it.',
        variant: 'destructive'
      });
      return;
    }

    const acceptedChanges = lightGrammarPreview.changes.filter(change => change.status === 'accepted');

    if (acceptedChanges.length === 0) {
      toast({
        title: 'No changes to apply',
        description: 'Accept at least one Light Grammar Pass change before applying.',
      });
      return;
    }

    if (!transcription) return;

    if (transcription.timestampedTranscript && transcription.timestampedTranscript.length > 0) {
      const nextEditedSegments = { ...editedSegments };

      acceptedChanges.forEach((change) => {
        if (change.segmentIndex !== undefined) {
          nextEditedSegments[change.segmentIndex] = change.after;
        }
      });

      setEditedSegments(nextEditedSegments);
    } else {
      const acceptedTranscriptChange = acceptedChanges.find(change => change.id === 'transcript');
      if (acceptedTranscriptChange) {
        setEditedTranscript(acceptedTranscriptChange.after);
      }
    }

    setIsEditing(true);
    setLightGrammarPreview(null);
    setShowLightGrammarReview(false);
    setLightGrammarDecisionHistory([]);

    toast({
      title: 'Accepted changes applied',
      description: 'Review the transcript, then use Save Transcript to persist changes.',
    });
  };

  const applySelectedCleanupToText = (text: string) => {
    let nextText = text;
    let changeCount = 0;

    const replaceAndCount = (pattern: RegExp, replacement: string | ((match: string, ...args: any[]) => string)) => {
      nextText = nextText.replace(pattern, (...args) => {
        changeCount++;
        return typeof replacement === 'function' ? replacement(...args) : replacement;
      });
    };

    if (cleanupOptions.removeUm) {
      replaceAndCount(/\bum\b[,]?\s*/gi, '');
    }

    if (cleanupOptions.removeUh) {
      replaceAndCount(/\buh\b[,]?\s*/gi, '');
    }

    if (cleanupOptions.removeAh) {
      replaceAndCount(/\bah\b[,]?\s*/gi, '');
    }

    if (cleanupOptions.removeYouKnow) {
      replaceAndCount(/(^|[.!?]\s+)you know,\s+/gi, (_match, prefix: string) => prefix);
      replaceAndCount(/,\s*you know,\s*/gi, ' ');
    }

    if (cleanupOptions.removeIMean) {
      replaceAndCount(/\bi mean\b[,]?\s*/gi, '');
    }

    if (cleanupOptions.removeLike) {
      replaceAndCount(/(^|[.!?]\s+)like,\s*like,?\s+/gi, (_match, prefix: string) => prefix);
      replaceAndCount(/,\s*like,\s*like,\s*/gi, ' ');
      replaceAndCount(/(^|[.!?]\s+)like,\s+/gi, (_match, prefix: string) => prefix);
      replaceAndCount(/,\s*like,\s*/gi, ' ');
    }

    if (cleanupOptions.removeSortOf) {
      replaceAndCount(/\bsort of\b[,]?\s*/gi, '');
    }

    if (cleanupOptions.removeKindOf) {
      replaceAndCount(/\bkind of\b[,]?\s*/gi, '');
    }

    if (cleanupOptions.removeDuplicateAdjacentWords) {
      replaceAndCount(/\b([A-Za-z]+)(\s+)\1\b/gi, (_match, word: string) => word);
    }

    if (cleanupOptions.removeSentenceOpeningSo) {
      replaceAndCount(/(^|[.!?]\s+)so\b[,]?\s+/gi, (_match, prefix: string) => prefix);
    }

    if (cleanupOptions.removeSentenceOpeningBut) {
      replaceAndCount(/(^|[.!?]\s+)but\b[,]?\s+/gi, (_match, prefix: string) => prefix);
    }

    if (changeCount > 0) {
      nextText = nextText
        .replace(/\s+([,.!?;:])/g, '$1')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();
    }

    return {
      text: nextText,
      changeCount: nextText === text ? 0 : changeCount,
    };
  };

  const buildCleanupPreview = (): FillerCleanupPreview | null => {
    if (!transcription) return null;

    if (transcription.timestampedTranscript && transcription.timestampedTranscript.length > 0) {
      let changeCount = 0;
      let segmentCount = 0;
      const examples: FillerCleanupPreview['examples'] = [];
      const changes: CleanupChange[] = [];

      transcription.timestampedTranscript.forEach((segment, index) => {
        const currentText = editedSegments[index] !== undefined ? editedSegments[index] : segment.text;
        const cleaned = applySelectedCleanupToText(currentText);

        if (cleaned.text !== currentText) {
          changeCount += cleaned.changeCount;
          segmentCount++;

          if (examples.length < 3) {
            examples.push({
              label: `Segment ${index + 1}`,
              before: currentText,
              after: cleaned.text,
            });
          }

          changes.push({
            id: `segment-${index}`,
            label: `Segment ${index + 1}`,
            segmentIndex: index,
            before: currentText,
            after: cleaned.text,
            status: 'pending',
          });
        }
      });

      return { changeCount, segmentCount, examples, changes };
    }

    const currentTranscript = editedTranscript || transcription.transcript || '';
    const cleaned = applySelectedCleanupToText(currentTranscript);
    const hasChange = cleaned.text !== currentTranscript;

    return {
      changeCount: hasChange ? cleaned.changeCount : 0,
      segmentCount: hasChange ? 1 : 0,
      examples: hasChange ? [{
        label: 'Transcript',
        before: currentTranscript,
        after: cleaned.text,
      }] : [],
      changes: hasChange ? [{
        id: 'transcript',
        label: 'Transcript',
        before: currentTranscript,
        after: cleaned.text,
        status: 'pending',
      }] : [],
    };
  };

  const previewSelectedCleanup = () => {
    if (!isEditing) {
      toast({
        title: 'Edit Transcript required',
        description: 'Click Edit Transcript before using transcript-changing tools.',
        variant: 'destructive'
      });
      return;
    }

    if (!hasSelectedCleanupOptions) {
      toast({
        title: 'No cleanup options selected',
        description: 'Select at least one option to preview changes.',
        variant: 'destructive'
      });
      return;
    }

    const preview = buildCleanupPreview();
    if (!preview) return;

    setCleanupPreview(preview);
    setCleanupDecisionHistory([]);
    setShowCleanupReview(false);

    toast({
      title: 'Cleanup preview ready',
      description: preview.changeCount > 0
        ? `${preview.changeCount} proposed change(s) across ${preview.segmentCount} segment(s).`
        : 'No matching filler or duplicate word patterns found.',
    });
  };

  const updateCleanupChangeStatus = (changeId: string, status: LightGrammarDecision) => {
    if (!cleanupPreview) return;

    setCleanupDecisionHistory(prev => [...prev, cleanupPreview.changes]);
    setCleanupPreview({
      ...cleanupPreview,
      changes: cleanupPreview.changes.map(change =>
        change.id === changeId ? { ...change, status } : change
      ),
    });
  };

  const acceptAllCleanupChanges = () => {
    if (!cleanupPreview) return;

    setCleanupDecisionHistory(prev => [...prev, cleanupPreview.changes]);
    setCleanupPreview({
      ...cleanupPreview,
      changes: cleanupPreview.changes.map(change =>
        change.status === 'pending' ? { ...change, status: 'accepted' } : change
      ),
    });
  };

  const undoCleanupDecision = () => {
    setCleanupDecisionHistory(prev => {
      const previous = prev[prev.length - 1];
      if (!previous || !cleanupPreview) return prev;

      setCleanupPreview({
        ...cleanupPreview,
        changes: previous,
      });

      return prev.slice(0, -1);
    });
  };

  const applyAcceptedCleanupChanges = () => {
    if (!isEditing) {
      toast({
        title: 'Edit Transcript required',
        description: 'Click Edit Transcript before applying transcript-changing tools.',
        variant: 'destructive'
      });
      return;
    }

    if (!cleanupPreview) {
      toast({
        title: 'Preview required',
        description: 'Preview the selected cleanup before applying it.',
        variant: 'destructive'
      });
      return;
    }

    const acceptedChanges = cleanupPreview.changes.filter(change => change.status === 'accepted');

    if (acceptedChanges.length === 0) {
      toast({
        title: 'No changes to apply',
        description: 'Accept at least one cleanup change before applying.',
      });
      return;
    }

    if (!transcription) return;

    if (transcription.timestampedTranscript && transcription.timestampedTranscript.length > 0) {
      const nextEditedSegments = { ...editedSegments };

      acceptedChanges.forEach((change) => {
        if (change.segmentIndex !== undefined) {
          nextEditedSegments[change.segmentIndex] = change.after;
        }
      });

      setEditedSegments(nextEditedSegments);
    } else {
      const acceptedTranscriptChange = acceptedChanges.find(change => change.id === 'transcript');
      if (acceptedTranscriptChange) {
        setEditedTranscript(acceptedTranscriptChange.after);
      }
    }

    setIsEditing(true);
    setCleanupPreview(null);
    setShowCleanupReview(false);
    setCleanupDecisionHistory([]);

    toast({
      title: 'Accepted cleanup changes applied',
      description: 'Review the transcript, then use Save Transcript to persist changes.',
    });
  };

  const applySelectedFormattingToText = (text: string) => {
    if (!formattingOptions.useEmDashForEllipses) {
      return { text, changeCount: 0 };
    }

    const matches = text.match(/\.\.\./g);
    const changeCount = matches?.length || 0;

    if (changeCount === 0) {
      return { text, changeCount: 0 };
    }

    return {
      text: text.replace(/\.\.\./g, '—'),
      changeCount,
    };
  };

  const buildFormattingPreview = (): FormattingPreview | null => {
    if (!transcription) return null;

    if (transcription.timestampedTranscript && transcription.timestampedTranscript.length > 0) {
      let changeCount = 0;
      let segmentCount = 0;
      const examples: FormattingPreview['examples'] = [];
      const changes: CleanupChange[] = [];

      transcription.timestampedTranscript.forEach((segment, index) => {
        const currentText = editedSegments[index] !== undefined ? editedSegments[index] : segment.text;
        const formatted = applySelectedFormattingToText(currentText);

        if (formatted.text !== currentText) {
          changeCount += formatted.changeCount;
          segmentCount++;

          if (examples.length < 3) {
            examples.push({
              label: `Segment ${index + 1}`,
              before: currentText,
              after: formatted.text,
            });
          }

          changes.push({
            id: `segment-${index}`,
            label: `Segment ${index + 1}`,
            segmentIndex: index,
            before: currentText,
            after: formatted.text,
            status: 'pending',
          });
        }
      });

      return { changeCount, segmentCount, examples, changes };
    }

    const currentTranscript = editedTranscript || transcription.transcript || '';
    const formatted = applySelectedFormattingToText(currentTranscript);
    const hasChange = formatted.text !== currentTranscript;

    return {
      changeCount: hasChange ? formatted.changeCount : 0,
      segmentCount: hasChange ? 1 : 0,
      examples: hasChange ? [{
        label: 'Transcript',
        before: currentTranscript,
        after: formatted.text,
      }] : [],
      changes: hasChange ? [{
        id: 'transcript',
        label: 'Transcript',
        before: currentTranscript,
        after: formatted.text,
        status: 'pending',
      }] : [],
    };
  };

  const previewSelectedFormatting = () => {
    if (!isEditing) {
      toast({
        title: 'Edit Transcript required',
        description: 'Click Edit Transcript before using transcript-changing tools.',
        variant: 'destructive'
      });
      return;
    }

    if (!hasSelectedFormattingOptions) {
      toast({
        title: 'No formatting options selected',
        description: 'Select at least one formatting option to preview changes.',
        variant: 'destructive'
      });
      return;
    }

    const preview = buildFormattingPreview();
    if (!preview) return;

    setFormattingPreview(preview);
    setFormattingDecisionHistory([]);
    setShowFormattingReview(false);

    toast({
      title: 'Formatting preview ready',
      description: preview.changeCount > 0
        ? `${preview.changeCount} proposed change(s) across ${preview.segmentCount} segment(s).`
        : 'No matching formatting patterns found.',
    });
  };

  const updateFormattingChangeStatus = (changeId: string, status: LightGrammarDecision) => {
    if (!formattingPreview) return;

    setFormattingDecisionHistory(prev => [...prev, formattingPreview.changes]);
    setFormattingPreview({
      ...formattingPreview,
      changes: formattingPreview.changes.map(change =>
        change.id === changeId ? { ...change, status } : change
      ),
    });
  };

  const acceptAllFormattingChanges = () => {
    if (!formattingPreview) return;

    setFormattingDecisionHistory(prev => [...prev, formattingPreview.changes]);
    setFormattingPreview({
      ...formattingPreview,
      changes: formattingPreview.changes.map(change =>
        change.status === 'pending' ? { ...change, status: 'accepted' } : change
      ),
    });
  };

  const undoFormattingDecision = () => {
    setFormattingDecisionHistory(prev => {
      const previous = prev[prev.length - 1];
      if (!previous || !formattingPreview) return prev;

      setFormattingPreview({
        ...formattingPreview,
        changes: previous,
      });

      return prev.slice(0, -1);
    });
  };

  const applyAcceptedFormattingChanges = () => {
    if (!isEditing) {
      toast({
        title: 'Edit Transcript required',
        description: 'Click Edit Transcript before applying transcript-changing tools.',
        variant: 'destructive'
      });
      return;
    }

    if (!formattingPreview) {
      toast({
        title: 'Preview required',
        description: 'Preview the selected formatting before applying it.',
        variant: 'destructive'
      });
      return;
    }

    const acceptedChanges = formattingPreview.changes.filter(change => change.status === 'accepted');

    if (acceptedChanges.length === 0) {
      toast({
        title: 'No changes to apply',
        description: 'Accept at least one formatting change before applying.',
      });
      return;
    }

    if (!transcription) return;

    if (transcription.timestampedTranscript && transcription.timestampedTranscript.length > 0) {
      const nextEditedSegments = { ...editedSegments };

      acceptedChanges.forEach((change) => {
        if (change.segmentIndex !== undefined) {
          nextEditedSegments[change.segmentIndex] = change.after;
        }
      });

      setEditedSegments(nextEditedSegments);
    } else {
      const acceptedTranscriptChange = acceptedChanges.find(change => change.id === 'transcript');
      if (acceptedTranscriptChange) {
        setEditedTranscript(acceptedTranscriptChange.after);
      }
    }

    setIsEditing(true);
    setFormattingPreview(null);
    setShowFormattingReview(false);
    setFormattingDecisionHistory([]);

    toast({
      title: 'Accepted formatting changes applied',
      description: 'Review the transcript, then use Save Transcript to persist changes.',
    });
  };

  // Re-run search when case sensitivity changes
  useEffect(() => {
    if (searchQuery && searchMatches.length > 0) {
      performSearch();
    }
  }, [caseSensitive]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F or Cmd+F - Open search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearchPanel(true);
      }

      // Ctrl+H or Cmd+H - Open search with replace
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
        e.preventDefault();
        setShowSearchPanel(true);
      }

      // Escape - Close search panel
      if (e.key === 'Escape' && showSearchPanel) {
        setShowSearchPanel(false);
        setSearchMatches([]);
      }

      // Enter in search box - Find next
      if (e.key === 'Enter' && showSearchPanel && document.activeElement?.id === 'search-input') {
        e.preventDefault();
        if (e.shiftKey) {
          navigateToMatch('prev');
        } else {
          navigateToMatch('next');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, showSearchPanel, searchMatches, currentMatchIndex]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedTranscriptChanges()) return;

      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [editedSegments, editedTranscript, transcription]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (!hasUnsavedTranscriptChanges()) return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      const link = target?.closest('a[href]') as HTMLAnchorElement | null;
      if (!link || link.target === '_blank' || link.hasAttribute('download')) return;

      const nextUrl = new URL(link.href, window.location.href);
      if (nextUrl.origin !== window.location.origin || nextUrl.href === window.location.href) return;

      event.preventDefault();
      requestLeaveEditor(() => {
        window.location.href = nextUrl.href;
      });
    };

    document.addEventListener('click', handleDocumentClick, true);
    return () => document.removeEventListener('click', handleDocumentClick, true);
  }, [editedSegments, editedTranscript, transcription]);

  const formatTimestamp = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const jumpToTime = (seconds: number) => {
    // Use the audio player's imperative API to seek
    audioPlayerRef.current?.seekTo(seconds);
    setCurrentTime(seconds);
  };

  // Speaker color mapping for visual differentiation
  const getSpeakerColor = (speaker: string | undefined): string => {
    if (!speaker || speaker === 'UU') return 'text-gray-600 bg-gray-100 border border-gray-300';

    const colors = [
      'text-blue-700 bg-blue-100 border border-blue-200',      // Speaker 1 - Blue
      'text-green-700 bg-green-100 border border-green-200',    // Speaker 2 - Green
      'text-purple-700 bg-purple-100 border border-purple-200',  // Speaker 3 - Purple
      'text-orange-700 bg-orange-100 border border-orange-200',  // Speaker 4 - Orange
      'text-red-700 bg-red-100 border border-red-200',        // Speaker 5 - Red
      'text-indigo-700 bg-indigo-100 border border-indigo-200',  // Speaker 6 - Indigo
      'text-pink-700 bg-pink-100 border border-pink-200',      // Speaker 7 - Pink
      'text-teal-700 bg-teal-100 border border-teal-200',      // Speaker 8 - Teal
      'text-yellow-700 bg-yellow-100 border border-yellow-200',  // Speaker 9 - Yellow
      'text-cyan-700 bg-cyan-100 border border-cyan-200',      // Speaker 10 - Cyan
    ];

    // Extract speaker number (e.g., "S1" -> 1, "S2" -> 2)
    const speakerNum = parseInt(speaker.replace('S', '')) || 1;
    return colors[(speakerNum - 1) % colors.length];
  };

  // Format speaker display name
  const getSpeakerDisplayName = (speaker: string | undefined): string => {
    if (!speaker || speaker === 'UU') return 'Speaker';
    // Check if there's a custom name for this speaker
    if (speakerNames[speaker]) {
      return speakerNames[speaker];
    }
    return `Speaker ${speaker.replace('S', '')}`;
  };

  // Update speaker name
  const updateSpeakerName = async (speaker: string, newName: string) => {
    const updatedNames = {
      ...speakerNames,
      [speaker]: newName
    };

    setSpeakerNames(updatedNames);
    setEditingSpeaker(null);
    setSpeakerRenameSource(null);

    // Save to database
    if (!transcription || !user) return;

    try {
      // Save via API if using Storage, otherwise save to Firestore
      if (transcription.transcriptStoragePath) {
        // For large transcripts, we need to update Firestore metadata directly
        await updateTranscriptionStatus(transcription.id!, transcription.status, {
          speakerNames: updatedNames
        });
      } else {
        // Small transcript - save directly to Firestore
        await updateTranscriptionStatus(transcription.id!, transcription.status, {
          speakerNames: updatedNames
        });
      }
    } catch (error) {
      console.error('Error saving speaker name:', error);
      toast({
        title: 'Save failed',
        description: 'Unable to save speaker name. Please try again.',
        variant: 'destructive'
      });
    }
  };

  const startSpeakerRename = (speaker: string, source: 'toolbar' | 'sidebar') => {
    setEditingSpeaker(speaker);
    setSpeakerRenameSource(source);
  };

  const cancelSpeakerRename = () => {
    setEditingSpeaker(null);
    setSpeakerRenameSource(null);
  };

  const commitSpeakerRename = (speaker: string, newName: string) => {
    const trimmedName = newName.trim();
    if (trimmedName) {
      updateSpeakerName(speaker, trimmedName);
    } else {
      cancelSpeakerRename();
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, speaker: string) => {
    setDraggedSpeaker(speaker);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetSpeaker: string) => {
    e.preventDefault();

    if (!draggedSpeaker || draggedSpeaker === targetSpeaker) {
      setDraggedSpeaker(null);
      return;
    }

    setSpeakerOrder(prev => {
      const newOrder = [...prev];
      const draggedIndex = newOrder.indexOf(draggedSpeaker);
      const targetIndex = newOrder.indexOf(targetSpeaker);

      // Remove dragged speaker from old position
      newOrder.splice(draggedIndex, 1);
      // Insert at new position
      newOrder.splice(targetIndex, 0, draggedSpeaker);

      return newOrder;
    });

    setDraggedSpeaker(null);
  };

  const handleDragEnd = () => {
    setDraggedSpeaker(null);
  };

  // Toggle segment selection
  const toggleSegmentSelection = (segmentIndex: number, shiftKey: boolean = false) => {
    setSelectedSegments(prev => {
      const newSelection = new Set(prev);

      if (shiftKey && prev.size > 0) {
        // Shift+click: select range from last selected to current
        const indices = Array.from(prev);
        const lastSelected = Math.max(...indices);
        const start = Math.min(lastSelected, segmentIndex);
        const end = Math.max(lastSelected, segmentIndex);

        for (let i = start; i <= end; i++) {
          newSelection.add(i);
        }
      } else {
        // Regular click: toggle selection
        if (newSelection.has(segmentIndex)) {
          newSelection.delete(segmentIndex);
        } else {
          newSelection.add(segmentIndex);
        }
      }

      return newSelection;
    });
  };

  // Select all segments in a range
  const selectRange = (startIndex: number, endIndex: number) => {
    const newSelection = new Set<number>();
    for (let i = startIndex; i <= endIndex; i++) {
      newSelection.add(i);
    }
    setSelectedSegments(newSelection);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedSegments(new Set());
  };

  // Drag panel handlers
  const handlePanelMouseDown = (e: React.MouseEvent) => {
    // Only allow dragging from the header area
    if ((e.target as HTMLElement).closest('.drag-handle')) {
      e.preventDefault(); // Prevent text selection during drag
      e.stopPropagation(); // Stop event from bubbling
      setIsDragging(true);
      setDragOffset({
        x: e.clientX - panelPosition.x,
        y: e.clientY - panelPosition.y
      });
    }
  };

  const handlePanelMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPanelPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handlePanelMouseUp = () => {
    setIsDragging(false);
  };

  // Add/remove mouse move and up listeners for dragging
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handlePanelMouseMove);
      document.addEventListener('mouseup', handlePanelMouseUp);
    } else {
      document.removeEventListener('mousemove', handlePanelMouseMove);
      document.removeEventListener('mouseup', handlePanelMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handlePanelMouseMove);
      document.removeEventListener('mouseup', handlePanelMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Handle text selection in edit mode
  const handleTextSelection = () => {
    if (!isEditingSpeakerSegments || !transcription?.timestampedTranscript) return;

    // Don't clear selection while dragging the panel
    if (isDragging) return;

    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
      // Don't clear if we have segments selected (user might be dragging)
      if (selectedSegments.size === 0) {
        setSelectedSegments(new Set());
      }
      return;
    }

    const selectedText = selection.toString().trim();
    if (!selectedText) {
      // Don't clear if we have segments selected (user might be dragging)
      if (selectedSegments.size === 0) {
        setSelectedSegments(new Set());
      }
      return;
    }

    // Get the range of the selection
    const range = selection.getRangeAt(0);

    // Find all segment elements that intersect with the selection
    const segmentsToSelect = new Set<number>();

    // Get all segment divs in the container
    if (transcriptContainerRef.current) {
      const segmentElements = transcriptContainerRef.current.querySelectorAll('[data-segment-index]');

      segmentElements.forEach((element) => {
        // Check if this element intersects with the selection range
        try {
          const segmentIndex = parseInt(element.getAttribute('data-segment-index') || '-1');
          if (segmentIndex === -1) return;

          // Check if the selection contains any part of this element
          // Use a simpler approach: check if selection contains the element's text node
          const elementRange = document.createRange();
          elementRange.selectNode(element);

          // Check for any intersection between ranges
          // Two ranges intersect if the start of one is before the end of the other AND vice versa
          try {
            // Method 1: Use intersectsNode (simpler)
            if (range.intersectsNode(element)) {
              segmentsToSelect.add(segmentIndex);
            }
          } catch (intersectError) {
            // Fallback: Manual boundary comparison
            // Ranges overlap if: rangeA.start < rangeB.end AND rangeA.end > rangeB.start
            const startToEnd = range.compareBoundaryPoints(Range.START_TO_END, elementRange);
            const endToStart = range.compareBoundaryPoints(Range.END_TO_START, elementRange);

            if (startToEnd < 0 && endToStart > 0) {
              segmentsToSelect.add(segmentIndex);
            }
          }
        } catch (e) {
          // Ignore comparison errors
          console.debug('Range comparison error:', e);
        }
      });
    }

    if (segmentsToSelect.size > 0) {
      setSelectedSegments(segmentsToSelect);
    } else {
      setSelectedSegments(new Set());
    }
  };

  // Change speaker for selected segments
  const changeSpeakerForSelectedSegments = (newSpeaker: string) => {
    if (!transcription?.timestampedTranscript || selectedSegments.size === 0) {
      console.log('Cannot change speaker - no transcript or segments selected');
      return;
    }

    console.log(`Changing speaker for ${selectedSegments.size} segments to ${newSpeaker}`);

    const updatedTranscript = [...transcription.timestampedTranscript];
    selectedSegments.forEach(index => {
      console.log(`Updating segment ${index} from ${updatedTranscript[index].speaker} to ${newSpeaker}`);
      updatedTranscript[index] = {
        ...updatedTranscript[index],
        speaker: newSpeaker
      };
    });

    setTranscription({
      ...transcription,
      timestampedTranscript: updatedTranscript
    });

    // Get speaker display name for toast
    const speakerDisplayName = speakerNames[newSpeaker] || `Speaker ${newSpeaker.replace('S', '')}`;

    // Show feedback
    toast({
      title: 'Speaker changed',
      description: `${selectedSegments.size} segment${selectedSegments.size !== 1 ? 's' : ''} assigned to ${speakerDisplayName}`,
    });

    // Clear selection after changing
    clearSelection();
  };

  // Change speaker for a specific segment
  const changeSpeakerForSegment = (segmentIndex: number, newSpeaker: string) => {
    if (!transcription?.timestampedTranscript) return;

    const updatedTranscript = [...transcription.timestampedTranscript];
    updatedTranscript[segmentIndex] = {
      ...updatedTranscript[segmentIndex],
      speaker: newSpeaker
    };

    setTranscription({
      ...transcription,
      timestampedTranscript: updatedTranscript
    });
  };

  // Save speaker segment changes to database
  const saveSpeakerSegmentChanges = async () => {
    if (!transcription?.timestampedTranscript || !user) return;

    try {
      setSaving(true);

      const payload = {
        timestampedTranscript: transcription.timestampedTranscript,
        transcript: transcription.transcript,
        speakerNames
      };

      // If transcript is stored in Storage (large file), we need to use the API endpoint
      if (transcription.transcriptStoragePath) {
        console.log('[Save] Saving large transcript via API endpoint');
        const token = await user.getIdToken();

        const response = await fetch(`/api/transcriptions/${transcription.id}/transcript`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error('Failed to save transcript to Storage');
        }

        // Persist speaker metadata to Firestore as well
        await updateTranscriptionStatus(transcription.id!, transcription.status, {
          speakerNames
        });
      } else {
        // Small transcript - save directly to Firestore
        console.log('[Save] Saving transcript to Firestore');
        await updateTranscriptionStatus(transcription.id!, 'complete', {
          timestampedTranscript: transcription.timestampedTranscript,
          speakerNames
        });
      }

      setIsEditingSpeakerSegments(false);

      toast({
        title: 'Changes saved',
        description: 'Speaker assignments have been updated successfully'
      });

    } catch (error) {
      console.error('Error saving speaker changes:', error);
      toast({
        title: 'Save failed',
        description: 'Unable to save speaker changes. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleHighlightSpeaker = (speaker: string) => {
    setHighlightedSpeakers(prev => {
      const next = new Set(prev);
      if (next.has(speaker)) {
        next.delete(speaker);
      } else {
        next.add(speaker);
      }
      return next;
    });
  };

  const clearHighlightedSpeakers = () => {
    setHighlightedSpeakers(new Set());
  };

  const isSpeakerHighlighted = (speaker: string | undefined | null): boolean => {
    if (highlightedSpeakers.size === 0) return false;
    return highlightedSpeakers.has(speaker || '');
  };

  const shouldDim = (speaker: string | undefined | null): boolean => {
    if (highlightedSpeakers.size === 0) return false;
    return !highlightedSpeakers.has(speaker || '');
  };

  // Get unique speakers from the transcript - calculate at component level
  const getOrderedSpeakers = () => {
    if (!transcription?.timestampedTranscript || transcription.timestampedTranscript.length === 0) {
      return [];
    }

    const allSpeakers = [...new Set(
      transcription.timestampedTranscript
        .map(segment => segment.speaker)
        .filter(speaker => speaker)
    )];

    const identifiedSpeakers = allSpeakers.filter(speaker => speaker !== 'UU').sort();

    // Use speakerOrder for display, fallback to identifiedSpeakers if order not set
    return speakerOrder.length > 0 ? speakerOrder : identifiedSpeakers;
  };

  const orderedSpeakers = getOrderedSpeakers();

  const renderTimestampedTranscript = () => {
    if (!transcription?.timestampedTranscript || transcription.timestampedTranscript.length === 0) {
      return (
        <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
          {formatTranscriptText(extractPlainText(transcription?.transcript)) || 'No transcript content available.'}
        </div>
      );
    }

    // Get unique speakers from the transcript
    const allSpeakers = [...new Set(
      transcription.timestampedTranscript
        .map(segment => segment.speaker)
        .filter(speaker => speaker)
    )];

    const identifiedSpeakers = allSpeakers.filter(speaker => speaker !== 'UU').sort();
    const hasUnknownSpeakers = allSpeakers.includes('UU');

    // Speaker order is initialized by effect when transcription loads.

    type ParagraphPiece =
      | { type: 'text'; content: string }
      | { type: 'timestamp'; time: number; content: string };

    const shouldBreakParagraph = (
      paragraphText: string,
      currentSegment: typeof transcription.timestampedTranscript[number],
      nextSegment?: typeof transcription.timestampedTranscript[number]
    ): boolean => {
      const trimmed = paragraphText.trim();
      if (!trimmed) return false;

      // Always break at strong sentence boundaries
      if (/[?!]$/.test(trimmed)) return true;

      // Prefer a new paragraph after full sentences when the paragraph is getting dense
      const wordCount = trimmed.split(/\s+/).length;
      if (wordCount >= 40 && /[.!?]$/.test(trimmed)) return true;

      // Break after conversational topic signals
      const topicChangeIndicators = [
        /\b(now|so|anyway|well|alright|okay|actually)\b[.,]?\s*$/i,
        /\b(moving on|next|let me|let's|let us|talk about)\b/i,
        /\b(in conclusion|to summarize|finally|in short)\b/i,
        /\b(first|second|third|however|therefore|meanwhile)\b[.,]?\s*$/i
      ];

      if (topicChangeIndicators.some((pattern) => pattern.test(trimmed))) {
        return true;
      }

      // Break on long pauses between segments
      if (currentSegment.end && nextSegment?.start && nextSegment.start - currentSegment.end >= 2.5) {
        return true;
      }

      // Break if the current paragraph is already long and the next segment starts a new sentence
      if (wordCount >= 60 && nextSegment && /[.!?]$/.test(trimmed)) {
        return true;
      }

      return false;
    };

    const processedSpeakerSegments: Array<{
      speaker: string | undefined | null;
      paragraphs: ParagraphPiece[][];
    }> = [];

    let currentSpeaker: string | undefined | null = null;
    let speakerParagraphs: ParagraphPiece[][] = [];
    let currentParagraph: ParagraphPiece[] = [];
    const activeTimestampFrequency = timestampFrequency === 'none' ? null : timestampFrequency;
    let nextTimestampTarget = activeTimestampFrequency;
    let pendingTimestamp:
      | { time: number; content: string }
      | null = null;

    const finishParagraph = () => {
      if (currentParagraph.length > 0) {
        speakerParagraphs.push(currentParagraph);
        currentParagraph = [];
      }
    };

    const finishSpeaker = () => {
      finishParagraph();
      if (speakerParagraphs.length > 0) {
        processedSpeakerSegments.push({
          speaker: currentSpeaker,
          paragraphs: speakerParagraphs
        });
      }
      speakerParagraphs = [];
    };

    const appendText = (text: string) => {
      const normalized = normalizeTranscriptSegmentText(text);
      if (!normalized) return;

      const lastPiece = currentParagraph[currentParagraph.length - 1];
      if (lastPiece?.type === 'text') {
        lastPiece.content = joinTranscriptSegmentTexts([lastPiece.content, normalized]);
      } else {
        currentParagraph.push({ type: 'text', content: normalized });
      }
    };

    for (let i = 0; i < transcription.timestampedTranscript.length; i++) {
      const segment = transcription.timestampedTranscript[i];
      const nextSegment = transcription.timestampedTranscript[i + 1];
      const speakerChanged = currentSpeaker !== null && currentSpeaker !== segment.speaker;

      if (speakerChanged) {
        finishSpeaker();
        currentSpeaker = segment.speaker;
      } else if (currentSpeaker === null) {
        currentSpeaker = segment.speaker;
      }

      // Intervals for inline timestamps
      if (activeTimestampFrequency !== null && nextTimestampTarget !== null && segment.start >= nextTimestampTarget && !pendingTimestamp) {
        pendingTimestamp = {
          time: nextTimestampTarget,
          content: formatTimestamp(nextTimestampTarget)
        };
        nextTimestampTarget += activeTimestampFrequency;
      }

      const segmentText = normalizeTranscriptSegmentText(segment.text);
      if (segmentText) {
        appendText(segmentText);
      }

      const paragraphText = currentParagraph.map((piece) => piece.content).join(' ').trim();
      const endsSentence = /[.!?]$/.test(segmentText);

      if (pendingTimestamp && endsSentence) {
        currentParagraph.push({
          type: 'timestamp',
          time: pendingTimestamp.time,
          content: pendingTimestamp.content
        });
        pendingTimestamp = null;
      }

      if (shouldBreakParagraph(paragraphText, segment, nextSegment)) {
        finishParagraph();
      }

      if (speakerChanged && currentParagraph.length === 0 && currentSpeaker !== segment.speaker) {
        currentSpeaker = segment.speaker;
      }
    }

    finishSpeaker();

    return (
      <div className="space-y-4">
        {/* Transcript with Intelligent Paragraphs and Inline Timestamps */}
        <div className="space-y-6">
          {isEditingSpeakerSegments ? (
            // Edit mode: Show individual segments with speaker controls
            <div className="space-y-2 relative">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-blue-800">
                  ✏️ <strong>Editing Speaker Assignments:</strong> Select any text (drag to highlight) and assign it to a speaker using the popup menu.
                </p>
              </div>


              {/* Transcript Container with Text Selection */}
              <div
                ref={transcriptContainerRef}
                onMouseUp={handleTextSelection}
                onTouchEnd={handleTextSelection}
                onKeyUp={(e) => {
                  // Handle keyboard selection (Shift+Arrow keys)
                  if (e.shiftKey) {
                    handleTextSelection();
                  }
                }}
                className="select-text user-select-text"
                style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
              >
                {transcription.timestampedTranscript.map((segment, index) => {
                  // Check if this is the start of a new speaker block
                  const isNewSpeaker = index === 0 || transcription.timestampedTranscript[index - 1].speaker !== segment.speaker;
                  const isSelected = selectedSegments.has(index);

                  return (
                    <div
                      key={index}
                      data-segment-index={index}
                      className={`relative rounded-lg transition-all duration-200 border-2 ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-400 shadow-md'
                          : 'border-transparent'
                      } ${isNewSpeaker ? 'mt-4' : 'mt-1'} ${shouldDim(segment.speaker) ? 'opacity-30 hover:opacity-50' : ''} ${isSpeakerHighlighted(segment.speaker) ? 'border-blue-400 bg-blue-50/30' : ''}`}
                    >
                      <div className="p-3">
                        {/* Show speaker label on new speaker blocks */}
                        {isNewSpeaker && showSpeakerLabels && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getSpeakerColor(segment.speaker)}`}>
                              {getSpeakerDisplayName(segment.speaker)}
                            </div>
                            <span className="text-xs text-gray-500 font-mono">
                              {formatTimestamp(segment.start)}
                            </span>
                          </div>
                        )}

                        {/* Segment text - selectable */}
                        <div
                          data-segment-text
                          className={`text-gray-800 leading-relaxed ${isSelected ? 'font-medium' : ''} cursor-text`}
                        >
                          {segment.text}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : isEditing && transcription.timestampedTranscript ? (
            // Edit mode: Group by speaker like view mode, but make editable
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-green-800">
                  ✏️ <strong>Editing Transcript:</strong> Click on any speaker section to edit it inline. Changes will be saved when you click "Save Changes".
                </p>
              </div>

              {/* Search and Replace Panel */}
              {showSearchPanel && (
                <div className="bg-white border-2 border-blue-400 rounded-lg p-4 mb-4 shadow-lg">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                      <Search className="h-4 w-4 text-blue-600" />
                      Search & Replace
                    </h4>
                    <button
                      onClick={() => {
                        setShowSearchPanel(false);
                        setSearchMatches([]);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {/* Search input */}
                    <div className="flex items-center gap-2">
                      <input
                        id="search-input"
                        type="text"
                        placeholder="Search for..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (searchMatches.length > 0) {
                              navigateToMatch('next');
                            } else {
                              performSearch();
                            }
                          }
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <Button
                        onClick={performSearch}
                        size="sm"
                        className="bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Find All
                      </Button>
                      <Button
                        onClick={() => navigateToMatch('next')}
                        size="sm"
                        variant="outline"
                        disabled={searchMatches.length === 0}
                        className="border-blue-300"
                      >
                        Find Next
                      </Button>
                    </div>

                    {/* Replace input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        placeholder="Replace with..."
                        value={replaceQuery}
                        onChange={(e) => setReplaceQuery(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <Button
                        onClick={replaceNext}
                        size="sm"
                        variant="outline"
                        disabled={searchMatches.length === 0}
                      >
                        Replace
                      </Button>
                      <Button
                        onClick={replaceAll}
                        size="sm"
                        className="bg-orange-600 text-white hover:bg-orange-700"
                      >
                        Replace All
                      </Button>
                    </div>

                    {/* Search options and navigation */}
                    <div className="flex items-center justify-between text-xs">
                      <label className="flex items-center gap-1.5 text-gray-600 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={caseSensitive}
                          onChange={(e) => setCaseSensitive(e.target.checked)}
                          className="rounded"
                        />
                        Case sensitive
                      </label>

                      {searchMatches.length > 0 && (
                        <div className="flex items-center gap-3">
                          <span className="text-gray-600 font-medium">
                            {currentMatchIndex + 1} of {searchMatches.length} matches
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => navigateToMatch('prev')}
                              className="p-1 hover:bg-gray-100 rounded border border-gray-300"
                              title="Previous match (Shift+Enter)"
                            >
                              <ChevronUp className="h-4 w-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => navigateToMatch('next')}
                              className="p-1 hover:bg-gray-100 rounded border border-gray-300"
                              title="Next match (Enter)"
                            >
                              <ChevronDown className="h-4 w-4 text-gray-600" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Keyboard shortcuts hint */}
                    <div className="text-xs text-gray-500 italic border-t pt-2">
                      💡 Shortcuts: <kbd className="px-1 py-0.5 bg-gray-100 border rounded">Ctrl+F</kbd> to open,
                      <kbd className="px-1 py-0.5 bg-gray-100 border rounded ml-1">Enter</kbd> next match,
                      <kbd className="px-1 py-0.5 bg-gray-100 border rounded ml-1">Shift+Enter</kbd> previous,
                      <kbd className="px-1 py-0.5 bg-gray-100 border rounded ml-1">Esc</kbd> to close
                    </div>
                  </div>
                </div>
              )}

              {/* Group segments by speaker for editing - Word-like interface */}
              {(() => {
                const speakerGroups: Array<{speaker: string, segments: Array<{text: string, index: number, start: number}>}> = [];
                let currentGroup: {speaker: string, segments: Array<{text: string, index: number, start: number}>} | null = null;

                transcription.timestampedTranscript.forEach((segment, index) => {
                  if (!currentGroup || currentGroup.speaker !== segment.speaker) {
                    // Start a new group
                    currentGroup = {
                      speaker: segment.speaker,
                      segments: []
                    };
                    speakerGroups.push(currentGroup);
                  }
                  currentGroup.segments.push({
                    text: segment.text,
                    index: index,
                    start: segment.start
                  });
                });

                return speakerGroups.map((group, groupIndex) => {
                  const firstSegmentIndex = group.segments[0].index;
                  const segmentIndices = group.segments.map(seg => seg.index);
                  const editorKey = `editor-${groupIndex}`;

                  // Combine all segments in this group into one continuous text
                  const groupText = joinTranscriptSegmentTexts(
                    group.segments.map(seg =>
                      editedSegments[seg.index] !== undefined ? editedSegments[seg.index] : seg.text
                    )
                  );

                  return (
                    <div
                      key={groupIndex}
                      id={`segment-${firstSegmentIndex}`}
                      className="my-6 rounded-lg border-2 border-gray-300 bg-white shadow-sm hover:shadow-md transition-shadow"
                    >
                      {/* Word-like header with draggable speaker tag */}
                      <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 border-b border-gray-200 rounded-t-md">
                        {/* Draggable Speaker Tag */}
                        <div
                          draggable
                          onDragStart={(e) => {
                            setDraggedSpeaker(group.speaker);
                            e.dataTransfer.effectAllowed = 'move';
                          }}
                          onDragEnd={() => setDraggedSpeaker(null)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold cursor-move transition-all ${
                            draggedSpeaker === group.speaker ? 'opacity-50 scale-95' : 'hover:shadow-md'
                          } ${getSpeakerColor(group.speaker)}`}
                          title="Drag to reorder speakers or click to edit"
                        >
                          {getSpeakerDisplayName(group.speaker)}
                        </div>

                        {/* Timestamp */}
                        <span className="text-xs text-gray-500 font-mono ml-auto">
                          {formatTimestamp(group.segments[0].start)}
                        </span>
                      </div>

                      {/* Word-like editable paragraph area */}
                      <div className="p-4 min-h-[120px]">
                        {searchMatches.length > 0 && searchMatches.some(m => segmentIndices.includes(m.segmentIndex)) ? (
                          // Read-only with highlights
                          <div className="text-gray-800 leading-relaxed text-base">
                            {renderTextWithHighlights(groupText, segmentIndices, group.segments)}
                          </div>
                        ) : (
                          // Editable area - properly initialized
                          <div
                            key={editorKey}
                            ref={(el) => {
                              if (el) {
                                contentEditableRefs.current[groupIndex] = el;
                                const isFocused = document.activeElement === el;
                                // Only sync DOM -> React when the element is not focused
                                if (!isFocused && el.textContent !== groupText) {
                                  el.textContent = groupText;
                                }
                              } else {
                                delete contentEditableRefs.current[groupIndex];
                              }
                            }}
                            contentEditable
                            suppressContentEditableWarning
                            onPaste={(e) => {
                              e.preventDefault();
                              const pasteText = e.clipboardData.getData('text/plain');
                              document.execCommand('insertText', false, pasteText);
                            }}
                            onInput={(e) => {
                              const newText = e.currentTarget.textContent || '';

                              // Batch updates: collect all segment edits
                              const newEditedSegments: Record<number, string> = {};
                              const words = newText.trim().split(/\s+/);
                              let wordIndex = 0;
                              let hasChanges = false;

                              group.segments.forEach((segment) => {
                                const originalWords = segment.text.trim().split(/\s+/);
                                const segmentWordCount = originalWords.length;
                                const segmentWords = words.slice(wordIndex, wordIndex + segmentWordCount);
                                const segmentText = segmentWords.join(' ') || '';

                                if (segmentText !== segment.text) {
                                  newEditedSegments[segment.index] = segmentText;
                                  hasChanges = true;
                                }

                                wordIndex += segmentWordCount;
                              });

                              // Handle remaining words
                              if (wordIndex < words.length) {
                                const remainingText = words.slice(wordIndex).join(' ');
                                const lastSegment = group.segments[group.segments.length - 1];
                                newEditedSegments[lastSegment.index] = (editedSegments[lastSegment.index] || lastSegment.text) + ' ' + remainingText;
                                hasChanges = true;
                              }

                              if (hasChanges) {
                                setEditedSegments(prev => ({
                                  ...prev,
                                  ...newEditedSegments
                                }));
                              }
                            }}
                            onBlur={(e) => {
                              // Preserve content on blur
                              e.currentTarget.textContent = e.currentTarget.textContent;
                            }}
                            className="text-gray-800 leading-relaxed text-base outline-none focus:ring-2 focus:ring-blue-400 rounded px-2 py-2 whitespace-pre-wrap break-words"
                            style={{ minHeight: '120px' }}
                          >
                          </div>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            // View mode: Normal grouped display
            processedSpeakerSegments.map((speakerSegment, index) => {
              const dimmed = shouldDim(speakerSegment.speaker);
              const highlighted = isSpeakerHighlighted(speakerSegment.speaker);
              return (
                <div
                  key={index}
                  className={`group transition-all duration-200 ${dimmed ? 'opacity-30 hover:opacity-50' : ''} ${highlighted ? 'rounded-lg border-l-4 border-blue-400 bg-blue-50/30 pl-2' : ''}`}
                >
                  {/* Speaker Label */}
                  {showSpeakerLabels && speakerSegment.speaker && (
                    <div className="flex items-center mb-4">
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getSpeakerColor(speakerSegment.speaker)}`}>
                        {getSpeakerDisplayName(speakerSegment.speaker)}
                      </div>
                    </div>
                  )}

                  {/* Paragraphs with Inline Timestamps */}
                  <div className={`pl-4 border-l-2 ${highlighted ? 'border-blue-300' : 'border-gray-200'} space-y-4`}>
                    {speakerSegment.paragraphs.map((paragraph, paragraphIndex) => (
                      <div key={paragraphIndex} className="text-gray-800 leading-relaxed">
                        {paragraph.map((part, partIndex) => (
                          <span key={partIndex}>
                            {part.type === 'text' ? (
                              part.content
                            ) : (
                              <button
                                onClick={() => jumpToTime(part.time)}
                                className="inline-flex items-center mx-2 text-[#003366] hover:text-[#004080] font-mono text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded transition-colors cursor-pointer"
                                title={`Jump to ${part.content}`}
                              >
                                [{part.content}]
                              </button>
                            )}
                            {part.type === 'timestamp' && partIndex < paragraph.length - 1 && ' '}
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const shareTranscript = async () => {
    if (!transcription || !user) return;

    try {
      // Toggle sharing status
      const newSharingState = !transcription.isShared;

      // Get auth token
      const token = await user.getIdToken();

      // Call API to toggle sharing
      const response = await fetch(`/api/transcriptions/${id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isShared: newSharingState })
      });

      if (!response.ok) {
        throw new Error('Failed to update sharing settings');
      }

      const data = await response.json();

      // Update local state
      setTranscription({
        ...transcription,
        isShared: data.isShared,
        shareId: data.shareId,
        sharedAt: data.isShared ? Timestamp.now() : undefined
      });

      if (data.isShared && data.shareUrl) {
        // Copy share link to clipboard
        await navigator.clipboard.writeText(data.shareUrl);
        toast({
          title: 'Sharing enabled',
          description: 'Share link copied to clipboard!',
        });
      } else {
        toast({
          title: 'Sharing disabled',
          description: 'This transcript is now private',
        });
      }
    } catch (error) {
      console.error('Error toggling share:', error);
      toast({
        title: 'Error',
        description: 'Failed to update sharing settings',
        variant: 'destructive',
      });
    }
  };

  const copyShareLink = async () => {
    if (!transcription?.shareId) return;

    const shareUrl = `${window.location.origin}/share/${transcription.shareId}`;

    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: 'Link copied',
        description: 'Transcript link copied to clipboard'
      });
    } catch (error) {
      console.error('Error copying link:', error);
      toast({
        title: 'Error',
        description: 'Failed to copy link to clipboard',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-8 flex-1">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <LoadingSpinner size="lg" className="mb-4" />
              <p className="text-gray-600">Loading transcript...</p>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !transcription) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-8 flex-1">
          <Button
            variant="ghost"
            onClick={() => requestLeaveEditor(() => router.back())}
            className="mb-4 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transcriptions
          </Button>

          <div className="flex items-center justify-center min-h-[400px]">
            <Card className="max-w-md">
              <CardContent className="p-8 text-center">
                <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {error || 'Transcript not found'}
                </h2>
                <p className="text-gray-600 mb-4">
                  {error === 'You do not have permission to view this transcription'
                    ? 'You can only view transcriptions that belong to you.'
                    : 'The transcript you\'re looking for doesn\'t exist or has been removed.'
                  }
                </p>
                <Button onClick={() => router.push('/transcriptions')}>
                  View All Transcriptions
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const workspaceMode = isEditingSpeakerSegments
    ? 'Editing Speakers'
    : isEditing
    ? 'Editing Transcript'
    : 'Viewing';
  const acceptedLightGrammarCount = lightGrammarPreview?.changes.filter(change => change.status === 'accepted').length || 0;
  const skippedLightGrammarCount = lightGrammarPreview?.changes.filter(change => change.status === 'skipped').length || 0;
  const pendingLightGrammarCount = lightGrammarPreview?.changes.filter(change => change.status === 'pending').length || 0;
  const acceptedCleanupCount = cleanupPreview?.changes.filter(change => change.status === 'accepted').length || 0;
  const skippedCleanupCount = cleanupPreview?.changes.filter(change => change.status === 'skipped').length || 0;
  const pendingCleanupCount = cleanupPreview?.changes.filter(change => change.status === 'pending').length || 0;
  const acceptedFormattingCount = formattingPreview?.changes.filter(change => change.status === 'accepted').length || 0;
  const skippedFormattingCount = formattingPreview?.changes.filter(change => change.status === 'skipped').length || 0;
  const pendingFormattingCount = formattingPreview?.changes.filter(change => change.status === 'pending').length || 0;
  const hasUnsavedTranscriptDraft = hasUnsavedTranscriptChanges();
  const transcriptWordCount = getWordCount(transcription.transcript);
  const speakerCount = orderedSpeakers.length;
  const speakerSegmentCounts = (transcription.timestampedTranscript || []).reduce<Record<string, number>>((counts, segment) => {
    if (segment.speaker && segment.speaker !== 'UU') {
      counts[segment.speaker] = (counts[segment.speaker] || 0) + 1;
    }
    return counts;
  }, {});
  const timestampIntervalLabel = timestampFrequency === 'none'
    ? 'No timestamps'
    : timestampFrequency === 30
    ? '30 seconds'
    : timestampFrequency === 60
    ? '60 seconds'
    : '5 minutes';
  const speakerLabelPresets = [
    'MEMBER',
    'CLAIMANT',
    'COUNSEL',
    'WITNESS',
    'OFFICER',
    'ADJUDICATOR',
    'REPRESENTATIVE',
    'Interviewer',
    'Participant',
    'Host',
    'Guest',
    'Doctor',
    'Patient',
    'Nurse',
    'Specialist',
  ];
  const futureWorkspaceTools = [
    'Export Tools',
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-1">
        {showUnsavedLeavePrompt && (
          <div className="fixed inset-0 z-[60] bg-black/40 px-4 py-6">
            <div className="mx-auto mt-24 max-w-lg rounded-lg bg-white p-5 shadow-xl">
              <h2 className="text-lg font-semibold text-[#003366]">Unsaved transcript changes</h2>
              <p className="mt-2 text-sm text-gray-700">
                Save your transcript changes before leaving, discard them, or stay on this page.
              </p>
              <div className="mt-5 flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={confirmSaveAndLeave}
                  disabled={saving}
                >
                  {saving ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Transcript
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={confirmDiscardAndLeave}
                  disabled={saving}
                >
                  Discard Changes
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={cancelLeaveEditor}
                  disabled={saving}
                >
                  Cancel / Stay
                </Button>
              </div>
            </div>
          </div>
        )}

        {showCleanupReview && cleanupPreview && (
          <div className="fixed inset-0 z-50 bg-black/40 px-4 py-6">
            <div className="mx-auto flex h-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#003366]">Filler & Duplicate Word Review</h2>
                  <p className="text-sm text-gray-600">
                    {cleanupPreview.changeCount} proposed change{cleanupPreview.changeCount === 1 ? '' : 's'} across {cleanupPreview.segmentCount} segment{cleanupPreview.segmentCount === 1 ? '' : 's'}.
                  </p>
                  <p className="text-xs text-gray-500">
                    {pendingCleanupCount} pending · {acceptedCleanupCount} accepted · {skippedCleanupCount} skipped
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={acceptAllCleanupChanges}
                    disabled={saving || pendingCleanupCount === 0}
                  >
                    Accept All Changes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={undoCleanupDecision}
                    disabled={saving || cleanupDecisionHistory.length === 0}
                  >
                    Undo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={applyAcceptedCleanupChanges}
                    disabled={saving || acceptedCleanupCount === 0}
                  >
                    Apply Accepted Changes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={clearCleanupPreview}
                    disabled={saving}
                  >
                    Cancel / Clear Preview
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCleanupReview(false)}
                    disabled={saving}
                  >
                    Close Review
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {cleanupPreview.changes.map((change) => (
                    <div
                      key={change.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-[#003366]">{change.label}</h3>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Status: {change.status}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={change.status === 'accepted' ? 'default' : 'outline'}
                            onClick={() => updateCleanupChangeStatus(change.id, 'accepted')}
                            disabled={saving}
                          >
                            Accept this change
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={change.status === 'skipped' ? 'default' : 'outline'}
                            onClick={() => updateCleanupChangeStatus(change.id, 'skipped')}
                            disabled={saving}
                          >
                            Skip this change
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-md border border-red-100 bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">Before</p>
                          <p className="whitespace-pre-wrap text-sm text-gray-700">{change.before}</p>
                        </div>
                        <div className="rounded-md border border-green-100 bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700">After</p>
                          <p className="whitespace-pre-wrap text-sm text-gray-900">{change.after}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showLightGrammarReview && lightGrammarPreview && (
          <div className="fixed inset-0 z-50 bg-black/40 px-4 py-6">
            <div className="mx-auto flex h-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#003366]">Light Grammar Pass Review</h2>
                  <p className="text-sm text-gray-600">
                    {lightGrammarPreview.changeCount} proposed change{lightGrammarPreview.changeCount === 1 ? '' : 's'} across {lightGrammarPreview.segmentCount} segment{lightGrammarPreview.segmentCount === 1 ? '' : 's'}.
                  </p>
                  <p className="text-xs text-gray-500">
                    {pendingLightGrammarCount} pending · {acceptedLightGrammarCount} accepted · {skippedLightGrammarCount} skipped
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={acceptAllLightGrammarChanges}
                    disabled={saving || pendingLightGrammarCount === 0}
                  >
                    Accept All Changes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={undoLightGrammarDecision}
                    disabled={saving || lightGrammarDecisionHistory.length === 0}
                  >
                    Undo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={applyAcceptedLightGrammarChanges}
                    disabled={saving || acceptedLightGrammarCount === 0}
                  >
                    Apply Accepted Changes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={clearLightGrammarPreview}
                    disabled={saving}
                  >
                    Cancel / Clear Preview
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowLightGrammarReview(false)}
                    disabled={saving}
                  >
                    Close Review
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {lightGrammarPreview.changes.map((change) => (
                    <div
                      key={change.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-[#003366]">{change.label}</h3>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Status: {change.status}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={change.status === 'accepted' ? 'default' : 'outline'}
                            onClick={() => updateLightGrammarChangeStatus(change.id, 'accepted')}
                            disabled={saving}
                          >
                            Accept this change
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={change.status === 'skipped' ? 'default' : 'outline'}
                            onClick={() => updateLightGrammarChangeStatus(change.id, 'skipped')}
                            disabled={saving}
                          >
                            Skip this change
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-md border border-red-100 bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">Before</p>
                          <p className="whitespace-pre-wrap text-sm text-gray-700">{change.before}</p>
                        </div>
                        <div className="rounded-md border border-green-100 bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700">After</p>
                          <p className="whitespace-pre-wrap text-sm text-gray-900">{change.after}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showFormattingReview && formattingPreview && (
          <div className="fixed inset-0 z-50 bg-black/40 px-4 py-6">
            <div className="mx-auto flex h-full max-w-6xl flex-col rounded-lg bg-white shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 p-4">
                <div>
                  <h2 className="text-xl font-semibold text-[#003366]">Formatting Tools Review</h2>
                  <p className="text-sm text-gray-600">
                    {formattingPreview.changeCount} proposed change{formattingPreview.changeCount === 1 ? '' : 's'} across {formattingPreview.segmentCount} segment{formattingPreview.segmentCount === 1 ? '' : 's'}.
                  </p>
                  <p className="text-xs text-gray-500">
                    {pendingFormattingCount} pending · {acceptedFormattingCount} accepted · {skippedFormattingCount} skipped
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={acceptAllFormattingChanges}
                    disabled={saving || pendingFormattingCount === 0}
                  >
                    Accept All Changes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={undoFormattingDecision}
                    disabled={saving || formattingDecisionHistory.length === 0}
                  >
                    Undo
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-700"
                    onClick={applyAcceptedFormattingChanges}
                    disabled={saving || acceptedFormattingCount === 0}
                  >
                    Apply Accepted Changes
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={clearFormattingPreview}
                    disabled={saving}
                  >
                    Cancel / Clear Preview
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setShowFormattingReview(false)}
                    disabled={saving}
                  >
                    Close Review
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-4">
                  {formattingPreview.changes.map((change) => (
                    <div
                      key={change.id}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-[#003366]">{change.label}</h3>
                          <p className="text-xs uppercase tracking-wide text-gray-500">
                            Status: {change.status}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant={change.status === 'accepted' ? 'default' : 'outline'}
                            onClick={() => updateFormattingChangeStatus(change.id, 'accepted')}
                            disabled={saving}
                          >
                            Accept this change
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={change.status === 'skipped' ? 'default' : 'outline'}
                            onClick={() => updateFormattingChangeStatus(change.id, 'skipped')}
                            disabled={saving}
                          >
                            Skip this change
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <div className="rounded-md border border-red-100 bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-red-700">Before</p>
                          <p className="whitespace-pre-wrap text-sm text-gray-700">{change.before}</p>
                        </div>
                        <div className="rounded-md border border-green-100 bg-white p-3">
                          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-green-700">After</p>
                          <p className="whitespace-pre-wrap text-sm text-gray-900">{change.after}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Header Section */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="mb-4 hover:bg-gray-100"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Transcriptions
          </Button>
          
          <div>
            <h1 className="text-2xl font-bold text-[#003366] mb-2 truncate" title={transcription.originalFilename}>
              {transcription.originalFilename}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
              <StatusBadge status={transcription.status} />
              <Badge variant="outline">{transcription.mode.charAt(0).toUpperCase() + transcription.mode.slice(1)}</Badge>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime(transcription.duration)}
              </div>
              <div className="flex items-center gap-1">
                <FileText className="h-4 w-4" />
                {getWordCount(transcription.transcript)} words
              </div>
              <CreditDisplay amount={transcription.creditsUsed} size="sm" />
              <span>Completed: {formatDate(transcription.completedAt || transcription.updatedAt)}</span>
            </div>
          </div>
        </div>

        {/* Sticky Action Toolbar - top-16 to sit below the h-16 sticky header */}
        <div className="sticky top-16 z-40 -mx-4 px-4 py-3 bg-gray-50/95 backdrop-blur-sm border-b border-gray-200/80 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            {/* Only show edit button for completed transcriptions */}
            {transcription.status === 'complete' && (
              <Button
                variant="outline"
                onClick={isEditing ? saveEdits : () => setIsEditing(true)}
                disabled={saving}
                className="border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white"
                size="sm"
              >
                {saving ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : isEditing ? (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                ) : (
                  <>
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit
                  </>
                )}
              </Button>
            )}

            {transcription.isShared ? (
              <>
                <Button
                  variant="outline"
                  onClick={copyShareLink}
                  className="border-green-300 bg-green-50 text-green-700 hover:bg-green-100"
                  size="sm"
                >
                  <Link2 className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button
                  variant="outline"
                  onClick={shareTranscript}
                  className="border-gray-300"
                  size="sm"
                >
                  <Globe className="h-4 w-4 mr-2" />
                  Disable Sharing
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                onClick={shareTranscript}
                className="border-gray-300"
                size="sm"
              >
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}

            {/* Download options - show admin transcript if available */}
            {transcription.adminTranscriptURL ? (
              <Button
                variant="default"
                onClick={downloadAdminTranscript}
                className="bg-[#003366] hover:bg-[#004080]"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Download Transcript
              </Button>
            ) : (
              <div className="flex">
                <Button
                  variant="outline"
                  onClick={() => exportTranscript(selectedFormat)}
                  className="border-gray-300 rounded-r-none border-r-0"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export {selectedFormat.toUpperCase()}
                </Button>
                <select
                  value={selectedFormat}
                  onChange={(e) => setSelectedFormat(e.target.value as 'pdf' | 'docx' | 'srt' | 'vtt')}
                  className="border border-gray-300 rounded-l-none rounded-r-md px-2 py-1.5 text-sm bg-white hover:bg-gray-50"
                >
                  <option value="pdf">PDF</option>
                  <option value="docx">DOCX</option>
                  <option value="srt">SRT</option>
                  <option value="vtt">VTT</option>
                </select>
              </div>
            )}

            {/* Search button - always visible in edit mode */}
            {isEditing && (
              <Button
                onClick={() => setShowSearchPanel(!showSearchPanel)}
                size="sm"
                variant="outline"
                className="border-blue-300 text-blue-700 hover:bg-blue-50 ml-auto"
              >
                <Search className="h-4 w-4 mr-1" />
                Search & Replace
              </Button>
            )}
          </div>
        </div>

        {hasUnsavedTranscriptDraft && (
          <div className="sticky top-[7.75rem] z-30 -mx-4 mb-6 border-y border-amber-200 bg-amber-50 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-amber-900">Unsaved transcript changes</p>
                <p className="text-sm text-amber-800">
                  Save Transcript to keep your edits, or discard them before leaving.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  className="bg-green-600 text-white hover:bg-green-700"
                  onClick={saveEdits}
                  disabled={saving}
                >
                  {saving ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                  Save Transcript
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={saveAndDownload}
                  disabled={saving}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Save & Download
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={discardTranscriptChanges}
                  disabled={saving}
                >
                  <X className="h-4 w-4 mr-2" />
                  Discard Changes
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* Audio Player Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-[11rem] z-30 space-y-4 lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:overscroll-contain lg:pb-8 lg:pr-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg text-[#003366]">Audio Player</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                {transcription.downloadURL ? (
                  <AudioPlayer
                    ref={audioPlayerRef}
                    src={transcription.downloadURL}
                    onTimeUpdate={handleTimeUpdate}
                    standalone={false}
                  />
                ) : (
                  <div className="bg-gray-100 rounded-lg p-4 text-center">
                    <div className="text-gray-500 mb-2">🎵</div>
                    <div className="text-sm text-gray-600">
                      Audio file not available for playback
                    </div>
                  </div>
                )}

                {/* File Info */}
                <div className="text-sm space-y-2 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mode:</span>
                    <span className="font-medium">{transcription.mode.charAt(0).toUpperCase() + transcription.mode.slice(1)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Duration:</span>
                    <span>{formatDuration(transcription.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Credits Used:</span>
                    <CreditDisplay amount={transcription.creditsUsed} size="sm" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Uploaded:</span>
                    <span>{formatDate(transcription.createdAt)}</span>
                  </div>
                  {transcription.completedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Completed:</span>
                      <span>{formatDate(transcription.completedAt)}</span>
                    </div>
                  )}
                </div>

              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg text-[#003366]">Transcript Workspace</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <section className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Project Status
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">Mode:</span>
                      <span className="font-medium text-[#003366] text-right">{workspaceMode}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-600">Status:</span>
                      <span className="font-medium text-right">{saving ? 'Saving...' : 'Ready'}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 block mb-1">File:</span>
                      <p className="font-medium text-gray-900 break-words">
                        {transcription.originalFilename || transcription.filename || 'Untitled transcript'}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Transcript Snapshot
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Words</p>
                      <p className="text-lg font-semibold text-[#003366]">{transcriptWordCount}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Speakers</p>
                      <p className="text-lg font-semibold text-[#003366]">{speakerCount}</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Timestamps</p>
                      <p className="text-lg font-semibold text-[#003366]">
                        {timestampFrequency === 'none' ? 'None' : timestampFrequency === 300 ? '5m' : `${timestampFrequency}s`}
                      </p>
                    </div>
                    <div className="rounded-lg bg-gray-50 p-3">
                      <p className="text-gray-500">Labels</p>
                      <p className="text-lg font-semibold text-[#003366]">
                        {showSpeakerLabels ? 'Shown' : 'Hidden'}
                      </p>
                    </div>
                  </div>
                </section>

                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Edit Transcript
                  </h3>
                  <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {!isEditing ? (
                      <>
                        <p className="text-xs text-gray-600">
                          Read-only view. Click Edit Transcript to make changes.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setIsEditing(true)}
                          disabled={saving || transcription.status !== 'complete'}
                        >
                          <Edit3 className="h-4 w-4 mr-2" />
                          Edit Transcript
                        </Button>
                      </>
                    ) : (
                      <>
                        {hasUnsavedTranscriptDraft && (
                          <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                            Unsaved transcript changes are ready to save.
                          </p>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          className="w-full justify-start bg-green-600 text-white hover:bg-green-700"
                          onClick={saveEdits}
                          disabled={saving}
                        >
                          {saving ? <LoadingSpinner size="sm" className="mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                          Save Transcript
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={discardTranscriptChanges}
                          disabled={saving}
                        >
                          <X className="h-4 w-4 mr-2" />
                          Discard Changes / Cancel Edit
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="w-full justify-start"
                          onClick={() => setShowSearchPanel(true)}
                          disabled={saving || !transcription.timestampedTranscript || transcription.timestampedTranscript.length === 0}
                        >
                          <Search className="h-4 w-4 mr-2" />
                          Open Search
                        </Button>
                      </>
                    )}
                  </div>
                </section>

                {transcription.projectDictionaryTerms && transcription.projectDictionaryTerms.length > 0 && (
                  <section className="space-y-3 border-t pt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Project Dictionary
                    </h3>
                    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs text-gray-600">
                        Project-only reference terms supplied at upload. These are not reused on future jobs or added to shared dictionaries.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {transcription.projectDictionaryTerms.map((term) => (
                          <span
                            key={term}
                            className="rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-medium text-[#003366]"
                          >
                            {term}
                          </span>
                        ))}
                      </div>
                    </div>
                  </section>
                )}

                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Timestamp Tools
                  </h3>
                  <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-600">Current interval:</span>
                      <span className="font-medium text-[#003366] text-right">{timestampIntervalLabel}</span>
                    </div>
                    <label className="block space-y-1.5 text-sm">
                      <span className="font-medium text-gray-700">Frequency</span>
                      <select
                        value={timestampFrequency}
                        onChange={(e) => handleTimestampFrequencyChange(e.target.value)}
                        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                        disabled={!transcription.timestampedTranscript || transcription.timestampedTranscript.length === 0}
                      >
                        <option value="none">No timestamps</option>
                        <option value={30}>Every 30 seconds</option>
                        <option value={60}>Every 1 minute</option>
                        <option value={300}>Every 5 minutes</option>
                      </select>
                    </label>
                    <p className="text-xs text-gray-600">
                      This changes how timestamps are displayed and exported. It does not change the original audio timing.
                    </p>
                    <p className="text-xs font-medium text-[#003366]">
                      Changes apply immediately to the transcript view.
                    </p>
                  </div>
                </section>

                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Light Grammar Pass
                  </h3>
                  <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {!isEditing && (
                      <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                        Click Edit Transcript before using transcript-changing tools.
                      </p>
                    )}
                    <p className="text-xs text-gray-600">
                      Fixes spacing, punctuation spacing, sentence capitalization, and simple comma placement. This does not rewrite, summarize, paraphrase, or remove transcript wording.
                    </p>

                    {lightGrammarPreview && (
                      <div className="space-y-2 rounded-md border border-blue-200 bg-white p-3">
                        <div className="text-sm font-medium text-[#003366]">
                          {lightGrammarPreview.changeCount} proposed change{lightGrammarPreview.changeCount === 1 ? '' : 's'}
                        </div>
                        <p className="text-xs text-gray-600">
                          Across {lightGrammarPreview.segmentCount} segment{lightGrammarPreview.segmentCount === 1 ? '' : 's'}.
                        </p>
                        {lightGrammarPreview.examples.length > 0 && (
                          <div className="space-y-2">
                            {lightGrammarPreview.examples.map((example) => (
                              <div key={example.label} className="space-y-1 text-xs">
                                <p className="font-medium text-gray-700">{example.label}</p>
                                <p className="text-gray-500 line-through">{example.before}</p>
                                <p className="text-gray-800">{example.after}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={previewLightGrammarPass}
                        disabled={saving || !isEditing || (!transcription.timestampedTranscript?.length && !transcription.transcript)}
                      >
                        Preview Light Grammar Pass
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full justify-start bg-green-600 text-white hover:bg-green-700"
                        onClick={() => setShowLightGrammarReview(true)}
                        disabled={saving || !isEditing || !lightGrammarPreview || lightGrammarPreview.changeCount === 0}
                      >
                        Review All Changes
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={clearLightGrammarPreview}
                        disabled={saving || !isEditing || !lightGrammarPreview}
                      >
                        Cancel / Clear Preview
                      </Button>
                    </div>
                  </div>
                </section>

                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Filler & Duplicate Word Tools
                  </h3>
                  <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {!isEditing && (
                      <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                        Click Edit Transcript before using transcript-changing tools.
                      </p>
                    )}
                    <p className="text-xs text-gray-600">
                      These tools apply only the options you select. They do not rewrite or summarize the transcript.
                    </p>
                    <p className="text-xs text-amber-700">
                      Some filler phrases may change nuance. Preview changes carefully before applying.
                    </p>

                    <div className="space-y-2">
                      {cleanupOptionItems.map((option) => (
                        <label key={option.key} className="flex items-start gap-2 text-sm text-gray-700">
                          <input
                            type="checkbox"
                            checked={cleanupOptions[option.key]}
                            onChange={() => toggleCleanupOption(option.key)}
                            className="mt-0.5 rounded border-gray-300"
                            disabled={saving || !isEditing}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>

                    {cleanupPreview && (
                      <div className="space-y-2 rounded-md border border-blue-200 bg-white p-3">
                        <div className="text-sm font-medium text-[#003366]">
                          {cleanupPreview.changeCount} proposed change{cleanupPreview.changeCount === 1 ? '' : 's'}
                        </div>
                        <p className="text-xs text-gray-600">
                          Across {cleanupPreview.segmentCount} segment{cleanupPreview.segmentCount === 1 ? '' : 's'}.
                        </p>
                        {cleanupPreview.examples.length > 0 && (
                          <div className="space-y-2">
                            {cleanupPreview.examples.map((example) => (
                              <div key={example.label} className="space-y-1 text-xs">
                                <p className="font-medium text-gray-700">{example.label}</p>
                                <p className="text-gray-500 line-through">{example.before}</p>
                                <p className="text-gray-800">{example.after}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={previewSelectedCleanup}
                        disabled={saving || !isEditing || !hasSelectedCleanupOptions || (!transcription.timestampedTranscript?.length && !transcription.transcript)}
                      >
                        Preview Selected Cleanup
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full justify-start bg-green-600 text-white hover:bg-green-700"
                        onClick={() => setShowCleanupReview(true)}
                        disabled={saving || !isEditing || !cleanupPreview || cleanupPreview.changeCount === 0}
                      >
                        Review All Changes
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={clearCleanupPreview}
                        disabled={saving || !isEditing || !cleanupPreview}
                      >
                        Cancel / Clear Preview
                      </Button>
                    </div>
                  </div>
                </section>

                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Formatting Tools
                  </h3>
                  <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-3">
                    {!isEditing && (
                      <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                        Click Edit Transcript before using transcript-changing tools.
                      </p>
                    )}
                    <p className="text-xs text-gray-600">
                      Optional formatting changes apply only after you preview and accept them. They do not rewrite, summarize, or change transcript wording.
                    </p>

                    <label className="flex items-start gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={formattingOptions.useEmDashForEllipses}
                        onChange={() => toggleFormattingOption('useEmDashForEllipses')}
                        className="mt-0.5 rounded border-gray-300"
                        disabled={saving || !isEditing}
                      />
                      <span>Use em dash for ellipses/trail-offs</span>
                    </label>

                    {formattingPreview && (
                      <div className="space-y-2 rounded-md border border-blue-200 bg-white p-3">
                        <div className="text-sm font-medium text-[#003366]">
                          {formattingPreview.changeCount} proposed change{formattingPreview.changeCount === 1 ? '' : 's'}
                        </div>
                        <p className="text-xs text-gray-600">
                          Across {formattingPreview.segmentCount} segment{formattingPreview.segmentCount === 1 ? '' : 's'}.
                        </p>
                        {formattingPreview.examples.length > 0 && (
                          <div className="space-y-2">
                            {formattingPreview.examples.map((example) => (
                              <div key={example.label} className="space-y-1 text-xs">
                                <p className="font-medium text-gray-700">{example.label}</p>
                                <p className="text-gray-500 line-through">{example.before}</p>
                                <p className="text-gray-800">{example.after}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="space-y-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={previewSelectedFormatting}
                        disabled={saving || !isEditing || !hasSelectedFormattingOptions || (!transcription.timestampedTranscript?.length && !transcription.transcript)}
                      >
                        Preview Selected Formatting
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        className="w-full justify-start bg-green-600 text-white hover:bg-green-700"
                        onClick={() => setShowFormattingReview(true)}
                        disabled={saving || !isEditing || !formattingPreview || formattingPreview.changeCount === 0}
                      >
                        Review All Changes
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-start"
                        onClick={clearFormattingPreview}
                        disabled={saving || !isEditing || !formattingPreview}
                      >
                        Cancel / Clear Preview
                      </Button>
                    </div>
                  </div>
                </section>

                <section className="space-y-3 border-t pt-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Speaker Tools
                    </h3>
                    <span className="text-xs text-gray-500">
                      {speakerCount} speaker{speakerCount === 1 ? '' : 's'}
                    </span>
                  </div>

                  {speakerCount > 0 ? (
                    <div className="space-y-3">
                      {!isEditingSpeakerSegments && (
                        <p className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-900">
                          Use Edit Speakers before renaming, applying presets, merging, or reassigning speakers.
                        </p>
                      )}
                      <div className="space-y-2">
                        {orderedSpeakers.map((speaker) => (
                          <div key={`workspace-speaker-${speaker}`} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs text-gray-500">{speaker}</p>
                                <p className="font-semibold text-gray-900 break-words">
                                  {getSpeakerDisplayName(speaker)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {speakerSegmentCounts[speaker] || 0} segment{speakerSegmentCounts[speaker] === 1 ? '' : 's'}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => startSpeakerRename(speaker, 'sidebar')}
                                disabled={saving || !isEditingSpeakerSegments}
                              >
                                Rename
                              </Button>
                            </div>

                            {editingSpeaker === speaker && speakerRenameSource === 'sidebar' && (
                              <div className="mt-3 space-y-2">
                                <input
                                  type="text"
                                  autoFocus
                                  defaultValue={getSpeakerDisplayName(speaker)}
                                  onBlur={(e) => {
                                    commitSpeakerRename(speaker, e.target.value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      commitSpeakerRename(speaker, e.currentTarget.value);
                                    } else if (e.key === 'Escape') {
                                      cancelSpeakerRename();
                                    }
                                  }}
                                  className="w-full rounded-md border border-blue-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                                  placeholder="Speaker name"
                                />
                              </div>
                            )}

                            <select
                              value=""
                              onChange={(e) => {
                                const preset = e.currentTarget.value;
                                if (preset) {
                                  updateSpeakerName(speaker, preset);
                                }
                              }}
                              className="mt-3 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                              disabled={saving || !isEditingSpeakerSegments}
                            >
                              <option value="">Preset label</option>
                              {speakerLabelPresets.map((preset) => (
                                <option key={`workspace-preset-${speaker}-${preset}`} value={preset}>
                                  {preset}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium text-gray-700">Speaker labels</span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8"
                            onClick={() => setShowSpeakerLabels(prev => !prev)}
                            disabled={saving}
                          >
                            {showSpeakerLabels ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                            {showSpeakerLabels ? 'Hide' : 'Show'}
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-2 rounded-lg border border-gray-200 p-3">
                        <p className="text-sm font-medium text-gray-700">Merge speakers</p>
                        <div className="grid grid-cols-1 gap-2">
                          <select
                            value={mergeSourceSpeaker}
                            onChange={(e) => setMergeSourceSpeaker(e.target.value)}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                            disabled={!isEditingSpeakerSegments || saving || speakerCount < 2}
                          >
                            <option value="">Merge from</option>
                            {orderedSpeakers.map((speaker) => (
                              <option key={`workspace-merge-source-${speaker}`} value={speaker}>
                                {getSpeakerDisplayName(speaker)}
                              </option>
                            ))}
                          </select>
                          <select
                            value={mergeTargetSpeaker}
                            onChange={(e) => setMergeTargetSpeaker(e.target.value)}
                            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                            disabled={!isEditingSpeakerSegments || saving || !mergeSourceSpeaker}
                          >
                            <option value="">Merge into</option>
                            {orderedSpeakers
                              .filter((speaker) => speaker !== mergeSourceSpeaker)
                              .map((speaker) => (
                                <option key={`workspace-merge-target-${speaker}`} value={speaker}>
                                  {getSpeakerDisplayName(speaker)}
                                </option>
                              ))}
                          </select>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full justify-center"
                            disabled={!isEditingSpeakerSegments || saving || !mergeSourceSpeaker || !mergeTargetSpeaker || mergeSourceSpeaker === mergeTargetSpeaker}
                            onClick={() => mergeSpeakers(mergeSourceSpeaker, mergeTargetSpeaker)}
                          >
                            Merge Speakers
                          </Button>
                        </div>
                        {!isEditingSpeakerSegments && (
                          <p className="text-xs text-gray-500">
                            Enter speaker edit mode to merge speakers.
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        {!isEditingSpeakerSegments ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="w-full justify-start"
                            onClick={() => setIsEditingSpeakerSegments(true)}
                            disabled={saving || !transcription.timestampedTranscript || transcription.timestampedTranscript.length === 0}
                          >
                            <Edit3 className="h-4 w-4 mr-2" />
                            Edit Speakers
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              className="w-full justify-start bg-green-600 text-white hover:bg-green-700"
                              onClick={saveSpeakerSegmentChanges}
                              disabled={saving}
                            >
                              {saving ? (
                                <LoadingSpinner size="sm" className="mr-2" />
                              ) : (
                                <Save className="h-4 w-4 mr-2" />
                              )}
                              Save Speaker Changes
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => {
                                setIsEditingSpeakerSegments(false);
                                loadTranscription();
                              }}
                              disabled={saving}
                            >
                              <X className="h-4 w-4 mr-2" />
                              Cancel Speaker Edit
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
                      No detected speakers.
                    </p>
                  )}
                </section>

                <section className="space-y-3 border-t pt-4">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    Future Tools
                  </h3>
                  <div className="space-y-2">
                    {futureWorkspaceTools.map((tool) => (
                      <Button
                        key={tool}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full justify-between text-gray-400"
                        disabled
                      >
                        <span>{tool}</span>
                        <span className="text-xs">Coming soon</span>
                      </Button>
                    ))}
                  </div>
                </section>
              </CardContent>
            </Card>
            </div>
          </div>

          {/* Speaker Assignment Panel - Draggable floating panel */}
          {isEditingSpeakerSegments && selectedSegments.size > 0 && (
            <div
              className="fixed w-80 z-50 animate-in slide-in-from-bottom duration-300"
              style={{
                left: `${panelPosition.x}px`,
                top: `${panelPosition.y}px`,
                cursor: isDragging ? 'grabbing' : 'default'
              }}
              onMouseDown={handlePanelMouseDown}
            >
              <Card className="shadow-2xl">
                <CardContent className="p-4">
                  <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-4 border-2 border-indigo-300">
                    <div className="mb-3 drag-handle cursor-grab active:cursor-grabbing">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-sm font-semibold text-indigo-900 mb-1">
                            ✏️ Assign Selected Text
                          </h3>
                          <p className="text-xs text-indigo-700">
                            {selectedSegments.size} segment{selectedSegments.size !== 1 ? 's' : ''} selected
                          </p>
                        </div>
                        <div className="text-indigo-400">
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L10 5.414 7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zm-3.707 9.293a1 1 0 011.414 0L10 14.586l2.293-2.293a1 1 0 011.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable speaker buttons container */}
                    <div className="max-h-[50vh] overflow-y-auto pr-1 space-y-2 scrollbar-thin scrollbar-thumb-indigo-300 scrollbar-track-indigo-100">
                      {orderedSpeakers.map(speaker => (
                        <button
                          key={speaker}
                          onClick={() => {
                            changeSpeakerForSelectedSegments(speaker);
                            window.getSelection()?.removeAllRanges();
                          }}
                          className={`w-full px-3 py-2.5 rounded-lg text-sm font-semibold text-left transition-all hover:scale-[1.02] hover:shadow-md ${getSpeakerColor(speaker)}`}
                        >
                          {getSpeakerDisplayName(speaker)}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => {
                        clearSelection();
                        window.getSelection()?.removeAllRanges();
                      }}
                      className="w-full px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 border border-gray-300 mt-2"
                    >
                      Cancel Selection
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Transcript Content */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-[#003366]">Transcript</CardTitle>
                  {isEditing && (
                    <div className="flex gap-2">
                      <Button
                        onClick={discardTranscriptChanges}
                        disabled={saving}
                        variant="outline"
                        size="sm"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={saveEdits}
                        disabled={saving}
                        className="bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
                        size="sm"
                      >
                        {saving ? (
                          <>
                            <LoadingSpinner size="sm" className="mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {transcription.status !== 'complete' && !transcription.transcript ? (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      {transcription.status === 'processing' ? 'Transcription in Progress' : 
                       transcription.status === 'pending-review' ? 'Awaiting Review' :
                       transcription.status === 'pending-transcription' ? 'Awaiting Transcription' :
                       transcription.status === 'failed' ? 'Transcription Failed' : 'No Transcript Available'}
                    </h3>
                    <p className="text-gray-600">
                      {transcription.status === 'processing' ? 'Your transcript is being generated and will appear here when ready.' :
                       transcription.status === 'pending-review' ? 'The AI transcript is being reviewed by our team.' :
                       transcription.status === 'pending-transcription' ? 'This file is queued for manual transcription.' :
                       transcription.status === 'failed' ? 'The transcription process encountered an error. Please try again or contact support.' :
                       'The transcript is not available yet.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="bg-white rounded-lg border border-gray-200 p-6">
                      {!isEditing && (
                        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                          Read-only view. Click Edit Transcript to make changes.
                        </div>
                      )}
                      {isEditing && hasUnsavedTranscriptDraft && (
                        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                          You have unsaved transcript changes. Use Save Transcript to keep them.
                        </div>
                      )}
                      <div className="prose max-w-none">
                        {renderTimestampedTranscript()}
                      </div>
                      {transcription.transcript && !isEditing && (
                        <div className="mt-4 pt-4 border-t text-sm text-gray-500 flex justify-between items-center">
                          <span>Word count: {getWordCount(transcription.transcript)}</span>
                          {transcription.timestampedTranscript && transcription.timestampedTranscript.length > 0 && (
                            <span className="text-[#003366]">
                              📍 {transcription.timestampedTranscript.length} timestamped segments
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {transcription.specialInstructions && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                        <h4 className="font-medium text-blue-900 mb-2">Special Instructions:</h4>
                        <p className="text-blue-800">{transcription.specialInstructions}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
