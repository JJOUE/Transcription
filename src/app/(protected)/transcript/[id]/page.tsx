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
  Replace
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { getTranscriptionById, updateTranscriptionStatus, TranscriptionJob } from '@/lib/firebase/transcriptions';
import { Timestamp } from 'firebase/firestore';
import { formatTime, formatDuration } from '@/lib/utils';
import { AudioPlayer, AudioPlayerRef } from '@/components/ui/AudioPlayer';

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
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'docx'>('pdf');
  const [timestampFrequency, setTimestampFrequency] = useState<30 | 60 | 300>(60); // 30s, 60s, 5min (300s)
  const [speakerNames, setSpeakerNames] = useState<Record<string, string>>({});
  const [editingSpeaker, setEditingSpeaker] = useState<string | null>(null);
  const [speakerOrder, setSpeakerOrder] = useState<string[]>([]);
  const [draggedSpeaker, setDraggedSpeaker] = useState<string | null>(null);
  const [isEditingSpeakerSegments, setIsEditingSpeakerSegments] = useState(false);
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

  const audioPlayerRef = useRef<AudioPlayerRef>(null);

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

  const formatTranscriptText = (text: string) => {
    if (!text) return text;
    // Remove spaces before commas and periods
    return text.replace(/\s+([,.!?;:])/g, '$1');
  };

  const handleTimeUpdate = (time: number) => {
    setCurrentTime(time);
  };

  const saveEdits = async () => {
    if (!transcription) return;

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
        const updatedPlainTranscript = updatedTimestampedTranscript
          .map(seg => seg.text)
          .join(' ');

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

    } catch (error) {
      console.error('[Save] Error saving transcript:', error);
      toast({
        title: 'Save failed',
        description: 'Unable to save changes. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
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

  const exportTranscript = async (format: 'pdf' | 'docx') => {
    if (!transcription) return;

    try {
      // Generate template data with current transcript content
      const templateData = generateTemplateData({
        ...transcription,
        transcript: isEditing ? editedTranscript : (transcription.transcript || '')
      }, userData);

      console.log('Export templateData:', templateData);
      console.log('Transcription data:', transcription);
      console.log('User data:', userData);

      // Use the new template functions with UI state
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
          body: JSON.stringify({
            timestampedTranscript: transcription.timestampedTranscript,
            transcript: transcription.transcript
          })
        });

        if (!response.ok) {
          throw new Error('Failed to save transcript to Storage');
        }
      } else {
        // Small transcript - save directly to Firestore
        console.log('[Save] Saving transcript to Firestore');
        await updateTranscriptionStatus(transcription.id!, 'complete', {
          timestampedTranscript: transcription.timestampedTranscript
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

    // Initialize speaker order if not set
    if (speakerOrder.length === 0 && identifiedSpeakers.length > 0) {
      setSpeakerOrder(identifiedSpeakers);
    }

    // Helper function to detect paragraph breaks based on context
    const shouldBreakParagraph = (text: string, nextText?: string): boolean => {
      if (!text) return false;

      // Break after questions
      if (/[?!]$/.test(text.trim())) return true;

      // Break after long pauses (if we had pause data)
      // Break after certain phrases that indicate topic changes
      const topicChangeIndicators = [
        /\b(now|so|anyway|well|alright|okay)\b[.,]?\s*$/i,
        /\b(moving on|next|let me)\b/i,
        /\b(in conclusion|to summarize|finally)\b/i,
        /\b(first|second|third|meanwhile|however|therefore)\b[.,]?\s*$/i
      ];

      if (topicChangeIndicators.some(pattern => pattern.test(text))) return true;

      // Break if text is getting quite long (> 150 words approximately)
      const wordCount = text.split(/\s+/).length;
      if (wordCount > 30 && /[.!]$/.test(text.trim())) return true;

      return false;
    };

    // Process segments to create continuous text flow with intelligent paragraph breaks
    const processedSpeakerSegments = [];
    let currentSpeaker = null;
    let accumulatedText = '';
    let nextTimestampTarget = timestampFrequency; // First target at the frequency interval
    let pendingTimestamp = null; // Store timestamp to be inserted at next sentence end
    let textParts = [];
    let paragraphParts = [];

    const addCurrentParagraph = () => {
      if (accumulatedText.trim()) {
        textParts.push({ type: 'text', content: accumulatedText.trim() });
        accumulatedText = '';
      }

      if (textParts.length > 0) {
        paragraphParts.push([...textParts]);
        textParts = [];
      }
    };

    const addCurrentSegment = () => {
      // Add any remaining text as final paragraph
      addCurrentParagraph();

      // Only add segments that have actual content
      if (paragraphParts.length > 0) {
        processedSpeakerSegments.push({
          speaker: currentSpeaker,
          paragraphs: [...paragraphParts]
        });
      }

      // Reset for next segment - but DON'T reset timestamp target, keep global timeline
      paragraphParts = [];
      // nextTimestampTarget stays the same to maintain continuous timeline
      // pendingTimestamp also stays the same if there's one waiting
    };

    // Helper to check if text ends a sentence
    const endsWithSentence = (text: string): boolean => {
      return /[.!?]$/.test(text.trim());
    };

    for (let i = 0; i < transcription.timestampedTranscript.length; i++) {
      const segment = transcription.timestampedTranscript[i];
      const speakerChanged = currentSpeaker !== null && currentSpeaker !== segment.speaker;

      // If speaker changed, finalize current segment and start new one
      if (speakerChanged) {
        addCurrentSegment();
        currentSpeaker = segment.speaker;
      } else if (currentSpeaker === null) {
        // First segment
        currentSpeaker = segment.speaker;
      }

      // Check if we've passed a timestamp target and need to mark for insertion
      if (segment.start >= nextTimestampTarget && !pendingTimestamp) {
        pendingTimestamp = {
          time: nextTimestampTarget,
          content: formatTimestamp(nextTimestampTarget)
        };
        // Move to next target interval
        nextTimestampTarget += timestampFrequency;
      }

      // Add the current segment text
      const newText = (accumulatedText ? ' ' : '') + segment.text;

      // Check if we should insert the pending timestamp at this sentence end
      if (pendingTimestamp && endsWithSentence(newText)) {
        // Add accumulated text before timestamp
        if (accumulatedText.trim()) {
          textParts.push({ type: 'text', content: accumulatedText.trim() });
          accumulatedText = '';
        }

        // Add the exact interval timestamp
        textParts.push({
          type: 'timestamp',
          time: pendingTimestamp.time,
          content: pendingTimestamp.content
        });

        // Clear pending timestamp
        pendingTimestamp = null;
      }

      // Check if we should break into a new paragraph
      if (accumulatedText && shouldBreakParagraph(accumulatedText + newText)) {
        // Complete current paragraph
        addCurrentParagraph();
      }

      accumulatedText += newText;
    }

    // Add the final segment
    addCurrentSegment();

    return (
      <div className="space-y-4">
        {/* Timestamp Frequency Control */}
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Timestamp Frequency:</span>
          </div>
          <select
            value={timestampFrequency}
            onChange={(e) => setTimestampFrequency(Number(e.target.value) as 30 | 60 | 300)}
            className="border border-blue-300 rounded-md px-3 py-1 text-sm bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value={30}>Every 30 seconds</option>
            <option value={60}>Every 60 seconds</option>
            <option value={300}>Every 5 minutes</option>
          </select>
        </div>

        {/* Speaker Legend */}
        {(identifiedSpeakers.length > 0 || hasUnknownSpeakers) && (
          <div className="bg-gray-50 rounded-lg p-4 border">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-gray-700">
                🎤 Speaker Detection Results
              </h4>
              <div className="flex items-center gap-3">
                {isEditingSpeakerSegments ? (
                  <Button
                    onClick={saveSpeakerSegmentChanges}
                    disabled={saving}
                    size="sm"
                    className="bg-green-600 text-white hover:bg-green-700"
                  >
                    {saving ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-3 w-3 mr-1" />
                        Save Changes
                      </>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={() => setIsEditingSpeakerSegments(true)}
                    size="sm"
                    variant="outline"
                    className="border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <Edit3 className="h-3 w-3 mr-1" />
                    Edit Speakers
                  </Button>
                )}
                {isEditingSpeakerSegments && (
                  <Button
                    onClick={() => {
                      setIsEditingSpeakerSegments(false);
                      loadTranscription(); // Reload to discard changes
                    }}
                    size="sm"
                    variant="outline"
                  >
                    Cancel
                  </Button>
                )}
                <p className="text-xs text-gray-500 italic">
                  Click to edit names • Drag to reorder
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {orderedSpeakers.map(speaker => (
                <div
                  key={speaker}
                  className="relative group"
                  draggable={editingSpeaker !== speaker}
                  onDragStart={(e) => handleDragStart(e, speaker)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, speaker)}
                  onDragEnd={handleDragEnd}
                >
                  {editingSpeaker === speaker ? (
                    <input
                      type="text"
                      autoFocus
                      defaultValue={getSpeakerDisplayName(speaker)}
                      onBlur={(e) => {
                        const newName = e.target.value.trim();
                        if (newName) {
                          updateSpeakerName(speaker, newName);
                        } else {
                          setEditingSpeaker(null);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const newName = e.currentTarget.value.trim();
                          if (newName) {
                            updateSpeakerName(speaker, newName);
                          } else {
                            setEditingSpeaker(null);
                          }
                        } else if (e.key === 'Escape') {
                          setEditingSpeaker(null);
                        }
                      }}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getSpeakerColor(speaker)} border-2 border-blue-500 outline-none min-w-[100px]`}
                    />
                  ) : (
                    <button
                      onClick={() => setEditingSpeaker(speaker)}
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${getSpeakerColor(speaker)} hover:ring-2 hover:ring-blue-400 transition-all ${draggedSpeaker === speaker ? 'opacity-50' : 'opacity-100'} ${editingSpeaker !== speaker ? 'cursor-move' : 'cursor-text'}`}
                      title="Click to edit • Drag to reorder"
                    >
                      {getSpeakerDisplayName(speaker)}
                      <Edit3 className="inline-block ml-1 h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </div>
              ))}
              {hasUnknownSpeakers && (
                <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getSpeakerColor('UU')}`}>
                  Unidentified Speech
                </div>
              )}
            </div>
            {identifiedSpeakers.length === 0 && hasUnknownSpeakers && (
              <p className="text-xs text-gray-600 mt-2">
                ℹ️ Speaker identification was not possible for this audio. This may be due to audio quality, single speaker, or processing limitations.
              </p>
            )}
          </div>
        )}

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
                      className={`relative rounded-lg transition-all border-2 ${
                        isSelected
                          ? 'bg-indigo-50 border-indigo-400 shadow-md'
                          : 'border-transparent'
                      } ${isNewSpeaker ? 'mt-4' : 'mt-1'}`}
                    >
                      <div className="p-3">
                        {/* Show speaker label on new speaker blocks */}
                        {isNewSpeaker && (
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
                <div className="flex items-center justify-between">
                  <p className="text-sm text-green-800">
                    ✏️ <strong>Editing Transcript:</strong> Click on any speaker section to edit it inline. Changes will be saved when you click "Save Changes".
                  </p>
                  <Button
                    onClick={() => setShowSearchPanel(!showSearchPanel)}
                    size="sm"
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-100"
                  >
                    <Search className="h-4 w-4 mr-1" />
                    Search & Replace
                  </Button>
                </div>
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

              {/* Group segments by speaker for editing */}
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

                  // Combine all segments in this group into one continuous text
                  // Use edited text if available, otherwise use original
                  const groupText = group.segments.map(seg =>
                    editedSegments[seg.index] !== undefined ? editedSegments[seg.index] : seg.text
                  ).join(' ');

                  return (
                    <div
                      key={groupIndex}
                      id={`segment-${firstSegmentIndex}`}
                      className="group rounded-lg border-2 border-gray-200 hover:border-blue-300 transition-all"
                    >
                      <div className="p-4">
                        {/* Speaker Label */}
                        <div className="flex items-center gap-2 mb-3">
                          <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getSpeakerColor(group.speaker)}`}>
                            {getSpeakerDisplayName(group.speaker)}
                          </div>
                          <span className="text-xs text-gray-500 font-mono">
                            {formatTimestamp(group.segments[0].start)}
                          </span>
                        </div>

                        {/* Editable grouped content with inline word highlighting */}
                        <div className="pl-4 border-l-2 border-gray-200">
                          {searchMatches.length > 0 && searchMatches.some(m => segmentIndices.includes(m.segmentIndex)) ? (
                            // Read-only view with highlights when search is active
                            <div
                              className="text-gray-800 leading-relaxed p-2 cursor-text min-h-[3rem]"
                              onClick={(e) => {
                                // Make editable when clicked
                                const target = e.currentTarget;
                                target.contentEditable = 'true';
                                target.focus();
                              }}
                            >
                              {renderTextWithHighlights(groupText, segmentIndices, group.segments)}
                            </div>
                          ) : (
                            // Editable view when no search is active
                            <div
                              ref={(el) => {
                                if (el && !el.dataset.initialized) {
                                  el.textContent = groupText;
                                  el.dataset.initialized = 'true';
                                }
                              }}
                              contentEditable
                              suppressContentEditableWarning
                              onInput={(e) => {
                                const newText = e.currentTarget.textContent || '';
                                console.log(`[Edit] Group ${groupIndex} changed`);

                                // Split the edited text back into segments based on word count
                                const words = newText.trim().split(/\s+/);
                                let wordIndex = 0;

                                group.segments.forEach((segment) => {
                                  const originalWords = segment.text.trim().split(/\s+/);
                                  const segmentWordCount = originalWords.length;
                                  const segmentWords = words.slice(wordIndex, wordIndex + segmentWordCount);
                                  const segmentText = segmentWords.join(' ');

                                  if (segmentText !== segment.text) {
                                    setEditedSegments(prev => ({
                                      ...prev,
                                      [segment.index]: segmentText
                                    }));
                                  }

                                  wordIndex += segmentWordCount;
                                });

                                // Handle any remaining words (in case text was added)
                                if (wordIndex < words.length) {
                                  const remainingText = words.slice(wordIndex).join(' ');
                                  const lastSegment = group.segments[group.segments.length - 1];
                                  const existingEdit = editedSegments[lastSegment.index] || lastSegment.text;
                                  setEditedSegments(prev => ({
                                    ...prev,
                                    [lastSegment.index]: existingEdit + ' ' + remainingText
                                  }));
                                }
                              }}
                              onBlur={(e) => {
                                const newText = e.currentTarget.textContent || '';
                                console.log(`[Edit] Group ${groupIndex} blur - saving all segments`);

                                // On blur, just save the entire block to all segments proportionally
                                const words = newText.trim().split(/\s+/);
                                let wordIndex = 0;

                                group.segments.forEach((segment, segIndex) => {
                                  const originalWords = segment.text.trim().split(/\s+/);
                                  const segmentWordCount = originalWords.length;
                                  const segmentWords = words.slice(wordIndex, wordIndex + segmentWordCount);
                                  const segmentText = segmentWords.join(' ');

                                  setEditedSegments(prev => ({
                                    ...prev,
                                    [segment.index]: segmentText
                                  }));

                                  wordIndex += segmentWordCount;
                                });

                                // Handle any remaining words
                                if (wordIndex < words.length) {
                                  const remainingText = words.slice(wordIndex).join(' ');
                                  const lastSegment = group.segments[group.segments.length - 1];
                                  const existingEdit = editedSegments[lastSegment.index] || lastSegment.text;
                                  setEditedSegments(prev => ({
                                    ...prev,
                                    [lastSegment.index]: existingEdit + ' ' + remainingText
                                  }));
                                }
                              }}
                              className="text-gray-800 leading-relaxed outline-none focus:bg-yellow-50 rounded p-2 cursor-text min-h-[3rem]"
                            >
                              {groupText}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          ) : (
            // View mode: Normal grouped display
            processedSpeakerSegments.map((speakerSegment, index) => (
              <div key={index} className="group">
                {/* Speaker Label */}
                {speakerSegment.speaker && (
                  <div className="flex items-center mb-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getSpeakerColor(speakerSegment.speaker)}`}>
                      {getSpeakerDisplayName(speakerSegment.speaker)}
                    </div>
                  </div>
                )}

                {/* Paragraphs with Inline Timestamps */}
                <div className="pl-4 border-l-2 border-gray-200 space-y-4">
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
            ))
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
            onClick={() => router.back()}
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

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-1">
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
          
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="min-w-0 flex-1">
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
            
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              {/* Only show edit button for completed transcriptions */}
              {transcription.status === 'complete' && (
                <Button
                  variant="outline"
                  onClick={isEditing ? saveEdits : () => setIsEditing(true)}
                  disabled={saving}
                  className="border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white w-full sm:w-auto"
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
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={copyShareLink}
                    className="border-green-300 bg-green-50 text-green-700 hover:bg-green-100 w-full sm:w-auto"
                  >
                    <Link2 className="h-4 w-4 mr-2" />
                    Copy Link
                  </Button>
                  <Button
                    variant="outline"
                    onClick={shareTranscript}
                    className="border-gray-300 w-full sm:w-auto"
                  >
                    <Globe className="h-4 w-4 mr-2" />
                    Disable Sharing
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={shareTranscript}
                  className="border-gray-300 w-full sm:w-auto"
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
                  className="bg-[#003366] hover:bg-[#004080] w-full sm:w-auto"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Transcript
                </Button>
              ) : (
                <div className="flex w-full sm:w-auto">
                  <Button
                    variant="outline"
                    onClick={() => exportTranscript(selectedFormat)}
                    className="border-gray-300 rounded-r-none border-r-0 flex-1 sm:flex-initial"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Export </span>{selectedFormat.toUpperCase()}
                  </Button>
                  <select
                    value={selectedFormat}
                    onChange={(e) => setSelectedFormat(e.target.value as 'pdf' | 'docx')}
                    className="border border-gray-300 rounded-l-none rounded-r-md px-2 py-2 text-sm bg-white hover:bg-gray-50"
                  >
                    <option value="pdf">PDF</option>
                    <option value="docx">DOCX</option>
                  </select>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {/* Audio Player Section */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-4">
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
                        onClick={() => {
                          setIsEditing(false);
                          setEditedSegments({});
                          setEditedTranscript('');
                        }}
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