"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Archive, Search, Filter, Download, CheckCircle, XCircle, Eye, Edit, RefreshCw, Zap, RotateCcw, Upload, Music } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import {
  applyRetentionHold,
  getAllTranscriptionJobs,
  approveTranscriptionReview,
  archiveTranscriptionJob,
  rejectTranscriptionJob,
  releaseRetentionHold,
  submitHumanTranscription,
  TranscriptionJob
} from '@/lib/firebase/transcriptions';
import { formatDuration } from '@/lib/utils';
import { formatRetentionLabel, isRetentionDeleted } from '@/lib/utils/retention';
import { doc, getDoc, getFirestore } from 'firebase/firestore';
import { AudioPlayer } from '@/components/ui/AudioPlayer';

const getOfficeServiceLabel = (serviceType?: string) => {
  switch (serviceType) {
    case 'dictation-cleanup':
      return 'Audio instructions for document preparation';
    case 'copy-typing':
      return 'Copy typing';
    case 'handwriting-transcription':
      return 'Handwriting transcription';
    case 'document-preparation':
      return 'Document preparation';
    default:
      return 'Document Workspace';
  }
};

export function TranscriptionQueue() {
  const { user, userData } = useAuth();
  const { refundCredits } = useCredits();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterJobType, setFilterJobType] = useState('all');
  const [selectedJob, setSelectedJob] = useState<TranscriptionJob | null>(null);
  const [selectedArchiveJob, setSelectedArchiveJob] = useState<TranscriptionJob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [queueItems, setQueueItems] = useState<TranscriptionJob[]>([]);
  const [queueLoading, setQueueLoading] = useState(true);
  const [userEmails, setUserEmails] = useState<{[key: string]: string}>({});
  const [storageTranscripts, setStorageTranscripts] = useState<{[key: string]: string}>({});
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const { toast } = useToast();

  // Load transcription jobs from Firebase
  const loadQueueItems = useCallback(async () => {
    if (!user || !userData || userData.role !== 'admin') return;
    
    setQueueLoading(true);
    try {
      const jobs = await getAllTranscriptionJobs();
      setQueueItems(jobs);
      
      // Fetch user emails in parallel
      const db = getFirestore();
      const uniqueUserIds = [...new Set(jobs.map(j => j.userId).filter(Boolean))];
      const emailResults = await Promise.all(
        uniqueUserIds.map(async (uid) => {
          try {
            const userRef = doc(db, 'users', uid);
            const userDoc = await getDoc(userRef);
            return { uid, email: userDoc.exists() ? (userDoc.data().email || 'Unknown') : 'Unknown' };
          } catch {
            return { uid, email: 'Unknown' };
          }
        })
      );
      const emailMap: {[key: string]: string} = {};
      for (const { uid, email } of emailResults) {
        emailMap[uid] = email;
      }
      setUserEmails(emailMap);
    } catch (error) {
      console.error('Error loading queue items:', error);
      toast({
        title: "Error loading queue",
        description: "Failed to load transcription queue. Please try again.",
        variant: "destructive",
      });
    } finally {
      setQueueLoading(false);
    }
  }, [user, userData, toast]);
  
  useEffect(() => {
    loadQueueItems();
  }, [loadQueueItems]);

  // Fetch transcript from Storage if needed
  const fetchTranscriptFromStorage = async (jobId: string) => {
    // Check if already fetched
    if (storageTranscripts[jobId]) {
      return storageTranscripts[jobId];
    }

    setLoadingTranscript(true);
    try {
      const response = await fetch(`/api/transcriptions/${jobId}/transcript`);
      if (!response.ok) {
        throw new Error('Failed to fetch transcript');
      }
      const data = await response.json();

      // Extract plain text from the response
      let transcriptText = '';
      if (typeof data.transcript === 'string') {
        transcriptText = data.transcript;
      } else if (data.timestampedTranscript && Array.isArray(data.timestampedTranscript)) {
        transcriptText = data.timestampedTranscript.map((seg: any) => seg.text).join(' ');
      }

      // Cache it
      setStorageTranscripts(prev => ({ ...prev, [jobId]: transcriptText }));
      return transcriptText;
    } catch (error) {
      console.error('Error fetching transcript from storage:', error);
      toast({
        title: "Error",
        description: "Failed to load transcript from storage.",
        variant: "destructive",
      });
      return '';
    } finally {
      setLoadingTranscript(false);
    }
  };

  // Get transcript text helper (handles all formats)
  const getTranscriptText = (job: TranscriptionJob): string => {
    // Check if transcript is in storage
    if (job.transcriptStoragePath && storageTranscripts[job.id || '']) {
      return storageTranscripts[job.id || ''];
    }

    // Check if transcript is a string
    if (typeof job.transcript === 'string') {
      return job.transcript;
    }

    // Fallback to timestamped transcript
    if (job.timestampedTranscript && Array.isArray(job.timestampedTranscript)) {
      return job.timestampedTranscript.map(seg => seg.text).join(' ');
    }

    return '';
  };

  const processJobWithSpeechmatics = async (jobId: string) => {
    try {
      const response = await fetch('/api/admin/process-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId: jobId,
          language: 'en',
          operatingPoint: 'standard'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process job');
      }

      const result = await response.json();
      console.log('Speechmatics processing result:', result);
    } catch (error) {
      console.error('Error processing job with Speechmatics:', error);
      throw error;
    }
  };

  // Resubmit a stuck processing job
  const resubmitStuckJob = async (jobId: string) => {
    try {
      toast({
        title: "Resubmitting job...",
        description: "Downloading file and submitting to Speechmatics. This may take a few minutes for large files.",
      });

      const response = await fetch('/api/admin/process-job', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          jobId: jobId,
          language: 'en',
          operatingPoint: 'standard'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resubmit job');
      }

      const result = await response.json();
      console.log('Resubmit result:', result);
      return result;
    } catch (error) {
      console.error('Error resubmitting job:', error);
      throw error;
    }
  };

  const handleAction = async (jobId: string, action: string, transcriptText?: string) => {
    setIsLoading(true);
    try {
      switch (action) {
        case 'approve-review':
          await approveTranscriptionReview(jobId);
          setSelectedJob(null); // Close modal after approval
          toast({
            title: "Review Approved",
            description: "Transcription has been approved and marked as complete.",
          });
          break;
        case 'reject':
          // Find the job to get credit amount and user ID for refund
          const jobToReject = queueItems.find(job => job.id === jobId);
          if (jobToReject && jobToReject.creditsUsed > 0) {
            // Process refund to the job owner
            await refundCredits(jobToReject.creditsUsed, jobId, jobToReject.userId);
          }
          
          await rejectTranscriptionJob(jobId, 'Rejected by admin');
          setSelectedJob(null); // Close modal after rejection
          toast({
            title: "Job Rejected",
            description: `Transcription job has been rejected${jobToReject?.creditsUsed ? ` and ${jobToReject.creditsUsed} credits have been refunded` : ''}.`,
          });
          break;
        case 'submit-transcription':
          if (transcriptText) {
            await submitHumanTranscription(jobId, transcriptText);
            setSelectedJob(null); // Close modal after submission
            toast({
              title: "Transcription Submitted",
              description: "Human transcription has been submitted successfully.",
            });
          }
          break;
        case 'process-with-speechmatics':
          await processJobWithSpeechmatics(jobId);
          toast({
            title: "Processing Started",
            description: "Job is now being processed with Speechmatics AI.",
          });
          break;
        case 'resubmit-stuck':
          await resubmitStuckJob(jobId);
          toast({
            title: "Job Resubmitted",
            description: "Job has been resubmitted to Speechmatics. It may take a few minutes to complete.",
          });
          break;
        case 'archive':
          await archiveTranscriptionJob(jobId, user?.uid || 'unknown-admin');
          setSelectedArchiveJob(null);
          toast({
            title: "Job archived",
            description: "The job was removed from the active work list. No files were deleted.",
          });
          break;
        case 'apply-retention-hold':
          await applyRetentionHold(jobId, user?.uid || 'unknown-admin');
          toast({
            title: "Retention hold applied",
            description: "This job is marked Keep File for future retention automation. No files were changed.",
          });
          break;
        case 'release-retention-hold':
          await releaseRetentionHold(jobId);
          toast({
            title: "Retention hold removed",
            description: "This job returned to the normal retention lifecycle. No files were changed.",
          });
          break;
      }
      
      // Refresh the queue after action
      await loadQueueItems();
      setTranscript('');
    } catch (error) {
      console.error('Action error:', error);
      toast({
        title: "Error",
        description: "Failed to complete action. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = queueItems.filter(item => {
    if (item.isArchived) return false;

    const userEmail = userEmails[item.userId] || '';
    const filename = item.originalFilename || item.filename || '';
    const matchesSearch = filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesJobType = filterJobType === 'all' || 
                          (filterJobType === 'transcription' && item.type !== 'office') ||
                          (filterJobType === 'office' && item.type === 'office');

    // Filter out completed jobs and AI-only jobs that don't need admin intervention
    // Only show jobs that need admin action:
    // - Human mode jobs (except completed/cancelled)
    // - Hybrid mode jobs that need review (pending-review, under-review)
    // - Failed AI/Hybrid jobs that might need retry
    // - Stuck processing jobs (processing status but no speechmaticsJobId)
    // - Document Workspace jobs (all non-completed statuses)
    const isStuckProcessing = item.status === 'processing' && !item.speechmaticsJobId;
    const needsAdminAction = (item.type === 'office' && !['complete', 'cancelled'].includes(item.status)) ||
                            (item.mode === 'human' && !['complete', 'cancelled'].includes(item.status)) ||
                            (item.mode === 'hybrid' && ['pending-review', 'under-review'].includes(item.status)) ||
                            (item.mode === 'ai' && item.status === 'failed') ||
                            (item.mode === 'hybrid' && item.status === 'failed') ||
                            isStuckProcessing;

    return matchesSearch && matchesStatus && matchesJobType && needsAdminAction;
  }).sort((a, b) => {
    // Sort by priority: Rush delivery jobs first
    if (a.rushDelivery && !b.rushDelivery) return -1;
    if (!a.rushDelivery && b.rushDelivery) return 1;

    // Then sort by creation date (oldest first)
    return (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0);
  });

  // Separate transcription and office jobs
  const transcriptionItems = filteredItems.filter(item => item.type !== 'office');
  const officeItems = filteredItems.filter(item => item.type === 'office');

  // Calculate stats only for jobs that need admin action
  const adminActionItems = queueItems.filter(item => {
    if (item.isArchived) return false;

    return (item.type === 'office' && !['complete', 'cancelled'].includes(item.status)) ||
           (item.mode === 'human' && !['complete', 'cancelled'].includes(item.status)) || 
           (item.mode === 'hybrid' && ['pending-review', 'under-review'].includes(item.status)) ||
           (item.mode === 'ai' && item.status === 'failed') ||
           (item.mode === 'hybrid' && item.status === 'failed');
  });

  const stats = {
    pendingReview: adminActionItems.filter(item => item.status === 'pending-review').length,
    pendingTranscription: adminActionItems.filter(item => item.status === 'pending-transcription').length,
    total: adminActionItems.length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#003366] mb-2">
                Transcription Queue
              </h1>
              <p className="text-gray-600">
                Monitor and manage active transcription jobs.
              </p>
            </div>
            <Button 
              onClick={loadQueueItems}
              disabled={queueLoading}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`h-4 w-4 ${queueLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Queue Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-orange-600">{stats.pendingReview}</p>
              <p className="text-sm text-gray-500">Pending Review</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-blue-600">{stats.pendingTranscription}</p>
              <p className="text-sm text-gray-500">Pending Transcription</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6 text-center">
              <p className="text-2xl font-bold text-green-600">{stats.total}</p>
              <p className="text-sm text-gray-500">Total Queue</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-sm mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by filename or user..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={filterJobType} onValueChange={setFilterJobType}>
                <SelectTrigger className="w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="transcription">Transcription</SelectItem>
                  <SelectItem value="office">Document Workspace</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-48">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="pending-review">Pending Review</SelectItem>
                  <SelectItem value="pending-transcription">Pending Transcription</SelectItem>
                  <SelectItem value="under-review">Under Review</SelectItem>
                  <SelectItem value="complete">Complete</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transcription Queue Items */}
        <Card className="border-0 shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#003366]">
              Transcription Queue ({transcriptionItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queueLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
                <span className="ml-2 text-gray-600">Loading queue items...</span>
              </div>
            ) : (
            <div className="space-y-4">
              {transcriptionItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    item.rushDelivery
                      ? 'bg-orange-50 border-orange-300 hover:bg-orange-100'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-[#003366]">{item.originalFilename || item.filename || 'Unknown file'}</h3>
                        <StatusBadge status={item.status} />
                        {/* Add-on indicators */}
                        {item.rushDelivery && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            🚀 Rush
                          </span>
                        )}
                        {item.multipleSpeakers && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            👥 {item.speakerCount || 3}+ Speakers
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{userEmails[item.userId] || 'Loading...'}</span>
                        <span>{item.mode === 'ai' ? 'AI' : item.mode === 'human' ? 'Human' : item.mode === 'hybrid' ? 'Hybrid' : item.mode}</span>
                        <span>{formatDuration(item.duration || 0)}</span>
                        <CreditDisplay amount={item.creditsUsed || 0} size="sm" />
                        {formatRetentionLabel(item) && (
                          <span className={isRetentionDeleted(item) ? 'font-medium text-red-600' : 'text-gray-500'}>
                            {formatRetentionLabel(item)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {item.status === 'pending-review' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600"
                            onClick={async () => {
                              // Pre-fetch transcript if it's in storage
                              if (item.transcriptStoragePath && item.id) {
                                await fetchTranscriptFromStorage(item.id);
                              }
                              setSelectedJob(item);
                            }}
                            disabled={loadingTranscript}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            {loadingTranscript ? 'Loading...' : 'Review'}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-green-600"
                            onClick={() => item.id && handleAction(item.id, 'approve-review')}
                            disabled={isLoading}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </>
                      )}
                      {item.status === 'pending-transcription' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600"
                          onClick={() => {
                            setSelectedJob(item);
                            setTranscript('');
                          }}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Transcribe
                        </Button>
                      )}
                      {item.status === 'failed' &&
                       (item.mode === 'ai' || item.mode === 'hybrid') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-purple-600"
                          onClick={() => item.id && handleAction(item.id, 'process-with-speechmatics')}
                          disabled={isLoading}
                          title="Retry with Speechmatics AI"
                        >
                          <Zap className="h-4 w-4 mr-1" />
                          Retry AI
                        </Button>
                      )}
                      {item.status === 'processing' && !item.speechmaticsJobId &&
                       (item.mode === 'ai' || item.mode === 'hybrid') && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-orange-600"
                          onClick={() => item.id && handleAction(item.id, 'resubmit-stuck')}
                          disabled={isLoading}
                          title="Resubmit stuck job to Speechmatics"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Resubmit
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600"
                        onClick={() => item.id && handleAction(item.id, 'reject')}
                        disabled={isLoading}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-700"
                        onClick={() => setSelectedArchiveJob(item)}
                        disabled={isLoading}
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        Archive job
                      </Button>
                      {item.retentionHold || item.deletionStatus === 'held' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-700"
                          onClick={() => item.id && handleAction(item.id, 'release-retention-hold')}
                          disabled={isLoading}
                        >
                          Remove Hold
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-700"
                          onClick={() => item.id && handleAction(item.id, 'apply-retention-hold')}
                          disabled={isLoading || isRetentionDeleted(item)}
                        >
                          Keep File
                        </Button>
                      )}
                      {isRetentionDeleted(item) && (item.downloadURL || item.templateURL || item.voiceInstructionsURL) && (
                        <span className="text-sm font-medium text-red-600">Files expired/deleted</span>
                      )}
                      {!isRetentionDeleted(item) && item.downloadURL && (
                        <Button variant="ghost" size="sm" className="text-gray-600">
                          <a href={item.downloadURL} target="_blank" rel="noopener noreferrer" className="flex items-center">
                            <Download className="h-4 w-4 mr-1" />
                            Audio
                          </a>
                        </Button>
                      )}
                      {!isRetentionDeleted(item) && item.templateURL && (
                        <Button variant="ghost" size="sm" className="text-purple-600">
                          <a href={item.templateURL} target="_blank" rel="noopener noreferrer" className="flex items-center">
                            <Download className="h-4 w-4 mr-1" />
                            Template
                          </a>
                        </Button>
                      )}
                      {!isRetentionDeleted(item) && item.voiceInstructionsURL && (
                        <Button variant="ghost" size="sm" className="text-indigo-600">
                          <a href={item.voiceInstructionsURL} target="_blank" rel="noopener noreferrer" className="flex items-center">
                            <Music className="h-4 w-4 mr-1" />
                            Voice Instructions
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Show AI transcript for hybrid review */}
                  {item.status === 'pending-review' && (item.transcript || item.transcriptStoragePath) && (
                    <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                      <h4 className="font-medium text-blue-900 mb-2">AI Transcript (for review):</h4>
                      <p className="text-sm text-blue-800 line-clamp-3">
                        {item.transcriptStoragePath && !storageTranscripts[item.id || '']
                          ? '[Transcript stored in cloud - click Review to load]'
                          : (getTranscriptText(item) || '[Click Review to view transcript]')}
                      </p>
                    </div>
                  )}

                  {/* Timestamps */}
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Submitted: {item.createdAt ? item.createdAt.toDate().toISOString().slice(0, 19).replace('T', ' ') : 'Unknown'}</span>
                    <span>Status: {item.status || 'Unknown'}</span>
                  </div>
                </div>
              ))}

              {transcriptionItems.length === 0 && !queueLoading && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No transcription items found matching your criteria.</p>
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>

        {/* Document Workspace Queue Items */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#003366]">
              Document Workspace Queue ({officeItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {queueLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
                <span className="ml-2 text-gray-600">Loading queue items...</span>
              </div>
            ) : (
            <div className="space-y-4">
              {officeItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-lg border transition-colors ${
                    item.rushDelivery
                      ? 'bg-orange-50 border-orange-300 hover:bg-orange-100'
                      : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="font-medium text-[#003366]">{item.originalFilename || item.filename || 'Unknown file'}</h3>
                        <StatusBadge status={item.status} />
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#b29dd9] text-white border border-[#9d87c7]">
                          🏢 Document Workspace
                        </span>
                        {/* Add-on indicators */}
                        {item.rushDelivery && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            🚀 Rush
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600">
                        <span>{userEmails[item.userId] || 'Loading...'}</span>
                        <span>{getOfficeServiceLabel(item.officeServiceType)}</span>
                        <span>{formatDuration(item.duration || 0)}</span>
                        <CreditDisplay amount={item.creditsUsed || 0} size="sm" />
                        {formatRetentionLabel(item) && (
                          <span className={isRetentionDeleted(item) ? 'font-medium text-red-600' : 'text-gray-500'}>
                            {formatRetentionLabel(item)}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      {item.status === 'pending-review' && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600"
                            onClick={() => {
                              setSelectedJob(item);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Review
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-green-600"
                            onClick={() => item.id && handleAction(item.id, 'approve-review')}
                            disabled={isLoading}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </>
                      )}
                      {item.status === 'pending-transcription' && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-blue-600"
                          onClick={() => {
                            setSelectedJob(item);
                            setTranscript('');
                          }}
                        >
                          <Upload className="h-4 w-4 mr-1" />
                          Upload Document
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600"
                        onClick={() => item.id && handleAction(item.id, 'reject')}
                        disabled={isLoading}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-700"
                        onClick={() => setSelectedArchiveJob(item)}
                        disabled={isLoading}
                      >
                        <Archive className="h-4 w-4 mr-1" />
                        Archive job
                      </Button>
                      {item.retentionHold || item.deletionStatus === 'held' ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-amber-700"
                          onClick={() => item.id && handleAction(item.id, 'release-retention-hold')}
                          disabled={isLoading}
                        >
                          Remove Hold
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-green-700"
                          onClick={() => item.id && handleAction(item.id, 'apply-retention-hold')}
                          disabled={isLoading || isRetentionDeleted(item)}
                        >
                          Keep File
                        </Button>
                      )}
                      {isRetentionDeleted(item) && (item.downloadURL || item.templateURL || item.voiceInstructionsURL) && (
                        <span className="text-sm font-medium text-red-600">Files expired/deleted</span>
                      )}
                      {!isRetentionDeleted(item) && item.downloadURL && (
                        <Button variant="ghost" size="sm" className="text-gray-600">
                          <a href={item.downloadURL} target="_blank" rel="noopener noreferrer" className="flex items-center">
                            <Download className="h-4 w-4 mr-1" />
                            Audio
                          </a>
                        </Button>
                      )}
                      {!isRetentionDeleted(item) && item.templateURL && (
                        <Button variant="ghost" size="sm" className="text-purple-600">
                          <a href={item.templateURL} target="_blank" rel="noopener noreferrer" className="flex items-center">
                            <Download className="h-4 w-4 mr-1" />
                            Template
                          </a>
                        </Button>
                      )}
                      {!isRetentionDeleted(item) && item.voiceInstructionsURL && (
                        <Button variant="ghost" size="sm" className="text-indigo-600">
                          <a href={item.voiceInstructionsURL} target="_blank" rel="noopener noreferrer" className="flex items-center">
                            <Music className="h-4 w-4 mr-1" />
                            Voice Instructions
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Office-specific metadata display */}
                  <div className="mt-3 rounded border border-[#b29dd9] bg-[#f8f5fc] p-3">
                    <h4 className="mb-2 text-sm font-medium text-[#003366]">Client Instructions</h4>
                    <div className="grid gap-2 text-sm md:grid-cols-3">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Written</p>
                        <p className="mt-1 text-gray-700 line-clamp-2">
                          {item.specialInstructions || 'No written instructions were provided.'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Voice</p>
                        <p className="mt-1 text-gray-700">
                          {item.hasVoiceInstructions
                            ? `Included${item.voiceInstructionsDuration ? ` · ${formatDuration(item.voiceInstructionsDuration)}` : ''}`
                            : 'No voice instructions were provided.'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Materials</p>
                        <p className="mt-1 text-gray-700 line-clamp-2">
                          {item.templateFilename ? `Reference: ${item.templateFilename}` : 'No template/reference file included.'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Timestamps */}
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>Submitted: {item.createdAt ? item.createdAt.toDate().toISOString().slice(0, 19).replace('T', ' ') : 'Unknown'}</span>
                    <span>Status: {item.status || 'Unknown'}</span>
                  </div>
                </div>
              ))}

              {officeItems.length === 0 && !queueLoading && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No Document Workspace projects found matching your criteria.</p>
                </div>
              )}
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transcription Modal */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-full sm:max-w-2xl w-full max-h-[95vh] sm:max-h-[85vh] overflow-y-auto my-4">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-[#003366]">
                  {selectedJob.type === 'office'
                    ? 'Document Workspace Project Details'
                    : selectedJob.status === 'pending-review'
                      ? 'Review AI Transcript'
                      : 'Create Transcript'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedJob(null);
                    setTranscript('');
                  }}
                  className="flex-shrink-0"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>

              <div className="mb-4 space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>File:</strong> <span className="break-words">{selectedJob.originalFilename || selectedJob.filename || 'Unknown file'}</span>
                </p>
                <p className="text-sm text-gray-600">
                  <strong>User:</strong> <span className="break-words">{userEmails[selectedJob.userId] || 'Loading...'}</span>
                </p>
                {selectedJob.type === 'office' ? (
                  <p className="text-sm text-gray-600">
                    <strong>Service:</strong> {getOfficeServiceLabel(selectedJob.officeServiceType)}
                  </p>
                ) : (
                  <>
                    <p className="text-sm text-gray-600">
                      <strong>Duration:</strong> {formatDuration(selectedJob.duration || 0)}
                    </p>
                    <p className="text-sm text-gray-600">
                      <strong>Mode:</strong> {selectedJob.mode || 'Unknown'}
                    </p>
                  </>
                )}
                {selectedJob.type === 'office' && selectedJob.duration > 0 && (
                  <p className="text-sm text-gray-600">
                    <strong>Media duration:</strong> {formatDuration(selectedJob.duration || 0)}
                  </p>
                )}
                {selectedJob.type === 'office' && (
                  <div className="rounded-lg border border-[#b29dd9] bg-[#f8f5fc] p-4">
                    <h4 className="mb-3 text-sm font-semibold text-[#003366]">Client Instructions</h4>
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="font-medium text-gray-900">Written instructions</p>
                        <p className="mt-1 whitespace-pre-wrap text-gray-700">
                          {selectedJob.specialInstructions || 'No written instructions were provided.'}
                        </p>
                      </div>
                      {selectedJob.officeNotes && (
                        <div>
                          <p className="font-medium text-gray-900">Additional notes</p>
                          <p className="mt-1 whitespace-pre-wrap text-gray-700">{selectedJob.officeNotes}</p>
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900">Voice instructions</p>
                        <p className="mt-1 text-gray-700">
                          {selectedJob.hasVoiceInstructions
                            ? `Included${selectedJob.voiceInstructionsDuration ? ` · ${formatDuration(selectedJob.voiceInstructionsDuration)}` : ''}`
                            : 'No voice instructions were provided.'}
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Uploaded materials</p>
                        <p className="mt-1 text-gray-700">
                          Main file: {selectedJob.originalFilename || selectedJob.filename || 'Unknown file'}
                        </p>
                        <p className="mt-1 text-gray-700">
                          {selectedJob.templateFilename
                            ? `Template/reference: ${selectedJob.templateFilename}`
                            : 'No template/reference file included.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                {formatRetentionLabel(selectedJob) && (
                  <p className={`text-sm ${isRetentionDeleted(selectedJob) ? 'font-medium text-red-600' : 'text-gray-600'}`}>
                    <strong>Retention:</strong> {formatRetentionLabel(selectedJob)}
                  </p>
                )}

                {isRetentionDeleted(selectedJob) && (selectedJob.downloadURL || selectedJob.templateURL || selectedJob.voiceInstructionsURL) && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-700">
                    Files expired/deleted
                  </div>
                )}

                {!isRetentionDeleted(selectedJob) && selectedJob.downloadURL && (
                  <div className="mb-4 pt-2">
                    <AudioPlayer
                      src={selectedJob.downloadURL}
                      standalone={true}
                    />
                  </div>
                )}

                {!isRetentionDeleted(selectedJob) && selectedJob.voiceInstructionsURL && (
                  <div className="mb-4 rounded-lg border border-indigo-200 bg-indigo-50 p-3">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-indigo-900">🎙️ Voice Instructions</p>
                        <p className="text-xs text-indigo-700">
                          {selectedJob.voiceInstructionsFilename || 'Client-recorded voice instructions'}
                          {selectedJob.voiceInstructionsDuration ? ` · ${formatDuration(selectedJob.voiceInstructionsDuration)}` : ''}
                        </p>
                      </div>
                      <Button variant="outline" size="sm" className="text-indigo-700 border-indigo-300 hover:bg-indigo-100">
                        <a href={selectedJob.voiceInstructionsURL} target="_blank" rel="noopener noreferrer" className="flex items-center">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </a>
                      </Button>
                    </div>
                    <AudioPlayer src={selectedJob.voiceInstructionsURL} standalone={true} />
                  </div>
                )}

                {/* Template download for human transcription */}
                {!isRetentionDeleted(selectedJob) && selectedJob.templateURL && (
                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-900">📄 Document Template</p>
                        <p className="text-xs text-purple-700">{selectedJob.templateFilename || 'Template file'}</p>
                      </div>
                      <Button variant="outline" size="sm" className="text-purple-600 border-purple-300 hover:bg-purple-100">
                        <a href={selectedJob.templateURL} target="_blank" rel="noopener noreferrer" className="flex items-center">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {selectedJob.status === 'pending-review' && (selectedJob.transcript || selectedJob.transcriptStoragePath) && (
                <div className="mb-4">
                  <h4 className="font-medium text-[#003366] mb-2 text-sm sm:text-base">AI Transcript:</h4>
                  <div className="p-3 bg-gray-50 border rounded text-sm max-h-48 sm:max-h-64 overflow-y-auto">
                    {loadingTranscript ? (
                      <div className="flex items-center justify-center py-4">
                        <LoadingSpinner size="sm" />
                        <span className="ml-2 text-gray-600">Loading transcript...</span>
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm leading-relaxed">
                        {getTranscriptText(selectedJob) || 'Unable to load transcript'}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {selectedJob.status === 'pending-transcription' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Enter Transcript:
                  </label>
                  <Textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Enter the transcription here..."
                    rows={6}
                    className="w-full min-h-[150px] sm:min-h-[200px]"
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedJob(null);
                    setTranscript('');
                  }}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                {selectedJob.retentionHold || selectedJob.deletionStatus === 'held' ? (
                  <Button
                    variant="outline"
                    onClick={() => selectedJob.id && handleAction(selectedJob.id, 'release-retention-hold')}
                    disabled={isLoading}
                    className="text-amber-700 border-amber-300 hover:bg-amber-50 w-full sm:w-auto"
                  >
                    Remove Hold
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => selectedJob.id && handleAction(selectedJob.id, 'apply-retention-hold')}
                    disabled={isLoading || isRetentionDeleted(selectedJob)}
                    className="text-green-700 border-green-300 hover:bg-green-50 w-full sm:w-auto"
                  >
                    Keep File
                  </Button>
                )}
                {selectedJob.status === 'pending-review' && (
                  <Button
                    onClick={() => selectedJob.id && handleAction(selectedJob.id, 'approve-review')}
                    disabled={isLoading}
                    className="bg-[#003366] hover:bg-[#004080] w-full sm:w-auto"
                  >
                    Approve Transcript
                  </Button>
                )}
                {selectedJob.status === 'pending-transcription' && (
                  <Button
                    onClick={() => selectedJob.id && handleAction(selectedJob.id, 'submit-transcription', transcript)}
                    disabled={isLoading || !transcript.trim()}
                    className="bg-[#003366] hover:bg-[#004080] w-full sm:w-auto"
                  >
                    Submit Transcript
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedArchiveJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#003366] mb-2">
              Remove from work list?
            </h3>
            <p className="text-sm text-gray-600 mb-2">
              Remove this job from the work list? This will hide it from the active admin queue but will not delete files.
            </p>
            <p className="text-xs text-gray-500 mb-5">
              {selectedArchiveJob.originalFilename || selectedArchiveJob.filename || 'Unknown file'}
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedArchiveJob(null)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#003366] hover:bg-[#004080] text-white"
                onClick={() => selectedArchiveJob.id && handleAction(selectedArchiveJob.id, 'archive')}
                disabled={isLoading}
              >
                {isLoading ? 'Removing...' : 'Remove from work list'}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
// Default export for Next.js pages compatibility
export default TranscriptionQueue;
