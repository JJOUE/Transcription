"use client";

import React, { useState, useRef } from 'react';
import { Archive, Download, CheckCircle, XCircle, Edit, Eye, Music, Upload, RotateCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { useToast } from '@/components/ui/use-toast';
import { useCredits } from '@/contexts/CreditContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  approveTranscriptionReview,
  archiveTranscriptionJob,
  rejectTranscriptionJob,
  submitHumanTranscription,
  TranscriptionJob,
  updateOfficeStatus,
  uploadOfficeCompletedDocument,
  assignOfficeTypist,
  setOfficeProjectDueDate,
  OfficeStatus
} from '@/lib/firebase/transcriptions';
import { formatDuration } from '@/lib/utils';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc, getFirestore, Timestamp } from 'firebase/firestore';

interface WorkQueueCardProps {
  job: TranscriptionJob;
  userEmail?: string;
  onComplete: () => void;
}

export function WorkQueueCard({ job, userEmail, onComplete }: WorkQueueCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [storageTranscript, setStorageTranscript] = useState<string | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { refundCredits } = useCredits();
  const { user } = useAuth();
  
  // Office Studio management state
  const [assignedTypistInput, setAssignedTypistInput] = useState(job.assignedTypistName || '');
  const [dueDateInput, setDueDateInput] = useState('');
  const [uploadingCompletedDoc, setUploadingCompletedDoc] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const completedDocInputRef = useRef<HTMLInputElement>(null);

  // Handle file upload - uploads directly to Storage (no parsing)
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !job.id) return;

    const fileName = file.name.toLowerCase();
    const validExtensions = ['.docx', '.doc', '.txt', '.pdf', '.rtf'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      toast({
        title: "Invalid file type",
        description: "Please upload a document file (.docx, .doc, .txt, .pdf, .rtf)",
        variant: "destructive",
      });
      return;
    }

    setUploadingFile(true);
    try {
      // Upload file directly to Firebase Storage
      const storage = getStorage();
      const storagePath = `transcriptions/${job.userId}/${job.id}/admin-transcript/${file.name}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Firestore document with admin transcript info and mark as complete
      const db = getFirestore();
      const jobRef = doc(db, 'transcriptions', job.id);
      await updateDoc(jobRef, {
        adminTranscriptPath: storagePath,
        adminTranscriptURL: downloadURL,
        adminTranscriptFilename: file.name,
        status: 'complete',
        completedAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });

      toast({
        title: "Transcript Uploaded",
        description: `${file.name} uploaded successfully. Job marked as complete.`,
      });

      onComplete();
    } catch (error) {
      console.error('File upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload transcript file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Fetch transcript from Storage if needed
  const fetchTranscriptFromStorage = async () => {
    if (storageTranscript) return storageTranscript;
    if (!job.transcriptStoragePath || !job.id) return '';

    setLoadingTranscript(true);
    try {
      const response = await fetch(`/api/transcriptions/${job.id}/transcript`);
      if (!response.ok) {
        throw new Error('Failed to fetch transcript');
      }
      const data = await response.json();

      let transcriptText = '';
      if (typeof data.transcript === 'string') {
        transcriptText = data.transcript;
      } else if (data.timestampedTranscript && Array.isArray(data.timestampedTranscript)) {
        transcriptText = data.timestampedTranscript.map((seg: { text: string }) => seg.text).join(' ');
      }

      setStorageTranscript(transcriptText);
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

  // Get transcript text helper
  const getTranscriptText = (): string => {
    if (job.transcriptStoragePath && storageTranscript) {
      return storageTranscript;
    }
    if (typeof job.transcript === 'string') {
      return job.transcript;
    }
    if (job.timestampedTranscript && Array.isArray(job.timestampedTranscript)) {
      return job.timestampedTranscript.map(seg => seg.text).join(' ');
    }
    return '';
  };

  const handleApprove = async () => {
    if (!job.id) return;
    setIsLoading(true);
    try {
      await approveTranscriptionReview(job.id);
      toast({
        title: "Review Approved",
        description: "Transcription has been approved and marked as complete.",
      });
      onComplete();
    } catch (error) {
      console.error('Approve error:', error);
      toast({
        title: "Error",
        description: "Failed to approve transcription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    if (!job.id) return;
    setIsLoading(true);
    try {
      // Process refund if credits were used
      if (job.creditsUsed > 0) {
        await refundCredits(job.creditsUsed, job.id, job.userId);
      }
      await rejectTranscriptionJob(job.id, 'Rejected by admin');
      toast({
        title: "Job Rejected",
        description: `Job rejected${job.creditsUsed ? ` and ${job.creditsUsed} credits refunded` : ''}.`,
      });
      onComplete();
    } catch (error) {
      console.error('Reject error:', error);
      toast({
        title: "Error",
        description: "Failed to reject job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!job.id) return;
    setIsLoading(true);
    try {
      await archiveTranscriptionJob(job.id, user?.uid || 'unknown-admin');
      toast({
        title: "Job archived",
        description: "The job was removed from the active work list. No files were deleted.",
      });
      setShowArchiveConfirm(false);
      onComplete();
    } catch (error) {
      console.error('Archive error:', error);
      toast({
        title: "Error",
        description: "Failed to archive job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitTranscription = async () => {
    if (!job.id || !transcript.trim()) return;
    setIsLoading(true);
    try {
      await submitHumanTranscription(job.id, transcript);
      toast({
        title: "Transcription Submitted",
        description: "Human transcription has been submitted successfully.",
      });
      setShowModal(false);
      setTranscript('');
      onComplete();
    } catch (error) {
      console.error('Submit error:', error);
      toast({
        title: "Error",
        description: "Failed to submit transcription. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openReviewModal = async () => {
    // Pre-fetch transcript if stored in storage
    if (job.transcriptStoragePath && job.id) {
      await fetchTranscriptFromStorage();
    }
    setShowModal(true);
  };

  const openTranscribeModal = () => {
    setTranscript('');
    setShowModal(true);
  };

  // Retry failed job with Speechmatics
  const handleRetryWithAI = async () => {
    if (!job.id) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/process-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          language: 'en',
          operatingPoint: 'standard'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process job');
      }

      toast({
        title: "Processing Started",
        description: "Job is now being processed with Speechmatics AI.",
      });
      onComplete();
    } catch (error) {
      console.error('Retry error:', error);
      toast({
        title: "Error",
        description: "Failed to retry job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Resubmit stuck processing job
  const handleResubmit = async () => {
    if (!job.id) return;
    setIsLoading(true);
    try {
      toast({
        title: "Resubmitting job...",
        description: "This may take a few minutes for large files.",
      });

      const response = await fetch('/api/admin/process-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId: job.id,
          language: 'en',
          operatingPoint: 'standard'
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resubmit job');
      }

      toast({
        title: "Job Resubmitted",
        description: "Job has been resubmitted to Speechmatics.",
      });
      onComplete();
    } catch (error) {
      console.error('Resubmit error:', error);
      toast({
        title: "Error",
        description: "Failed to resubmit job. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Office Studio handlers
  const handleAssignTypist = async () => {
    if (!job.id || !assignedTypistInput.trim()) {
      toast({
        title: "Missing information",
        description: "Please enter a typist name.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      // Use the input as both ID and name for now (simplified)
      await assignOfficeTypist(job.id, assignedTypistInput.trim(), assignedTypistInput.trim());
      toast({
        title: "Typist Assigned",
        description: `Project assigned to ${assignedTypistInput.trim()}.`,
      });
      onComplete();
    } catch (error) {
      console.error('Assignment error:', error);
      toast({
        title: "Error",
        description: "Failed to assign typist. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDueDate = async () => {
    if (!job.id || !dueDateInput) {
      toast({
        title: "Missing date",
        description: "Please select a due date.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const dueDate = new Timestamp(Math.floor(new Date(dueDateInput).getTime() / 1000), 0);
      const priority = job.rushDelivery ? 'rush' : 'standard';
      await setOfficeProjectDueDate(job.id, dueDate, priority);
      toast({
        title: "Due Date Set",
        description: `Due date set to ${new Date(dueDateInput).toLocaleDateString()}.`,
      });
      setDueDateInput('');
      onComplete();
    } catch (error) {
      console.error('Due date error:', error);
      toast({
        title: "Error",
        description: "Failed to set due date. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadCompletedDocument = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !job.id) return;

    const fileName = file.name.toLowerCase();
    const validExtensions = ['.docx', '.doc', '.pdf', '.txt'];
    const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

    if (!hasValidExtension) {
      toast({
        title: "Invalid file type",
        description: "Please upload a document file (.docx, .doc, .pdf, .txt)",
        variant: "destructive",
      });
      return;
    }

    setUploadingCompletedDoc(true);
    try {
      const storage = getStorage();
      const storagePath = `transcriptions/${job.userId}/${job.id}/completed-document/${file.name}`;
      const storageRef = ref(storage, storagePath);

      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);

      // Update Office document in Firestore
      await uploadOfficeCompletedDocument(job.id, storagePath, downloadURL, file.name);

      toast({
        title: "Document Uploaded",
        description: `${file.name} uploaded successfully.`,
      });

      onComplete();
    } catch (error) {
      console.error('Document upload error:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload document. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploadingCompletedDoc(false);
      if (completedDocInputRef.current) {
        completedDocInputRef.current.value = '';
      }
    }
  };

  const handleUpdateOfficeStatus = async (newStatus: OfficeStatus) => {
    if (!job.id) return;
    setIsLoading(true);
    try {
      await updateOfficeStatus(job.id, newStatus);
      toast({
        title: "Status Updated",
        description: `Project status changed to ${newStatus.replace(/_/g, ' ')}.`,
      });
      onComplete();
    } catch (error) {
      console.error('Status update error:', error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Check if this is a stuck processing job
  const isStuckProcessing = job.status === 'processing' && !job.speechmaticsJobId;
  const createdDate =
    job.createdAt instanceof Date
      ? job.createdAt
      : job.createdAt?.toDate?.();
            
  const waitingTime = createdDate
    ? createdDate.toLocaleDateString()
    : 'Unknown';
    
  const waitingClass =
    createdDate
      ? Date.now() - createdDate.getTime() > 86400000
        ? 'text-red-600 font-semibold'
        : Date.now() - createdDate.getTime() > 7200000
        ? 'text-amber-600 font-medium'
        : 'text-gray-500'
      : 'text-gray-500';

  return (
    <>
      <div
        className={`p-4 rounded-lg border transition-colors ${
          job.rushDelivery
            ? 'bg-orange-50 border-orange-400 border-l-4 border-l-red-500 shadow-sm'
              : 'bg-gray-50 border-gray-200'
      }`}
      >
        {/* Job Info Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              {job.rushDelivery && (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-300"
                  title="Rush Delivery"
                >
                  ⚡ RUSH
                </span>
              )}
              
              {job.type === 'office' && (
                <span
                  className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-[#b29dd9] text-white border border-[#9d87c7]"
                  title="Document Workspace Project"
                >
                  🏢 DOCUMENT WORKSPACE
                </span>
              )}
              <span className="font-medium text-[#003366] truncate">
                {job.originalFilename || job.filename || 'Unknown file'}
              </span>
              <StatusBadge status={job.status} />
            </div>

            <div className="space-y-2"> 

              {/* Client Info */}
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
              <span className="font-medium text-gray-900">
                {userEmail || 'Unknown user'}
              </span>

              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  job.type === 'office'
                    ? 'bg-[#b29dd9] text-white'
                    : job.mode === 'ai'
                    ? 'bg-indigo-100 text-indigo-800'
                    : job.mode === 'human'
                    ? 'bg-emerald-100 text-emerald-800'
                    : job.mode === 'hybrid'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-amber-100 text-amber-800'
                }`}

              >
                {job.type === 'office'
                  ? '🏢 Document Workspace'
                  : job.mode === 'ai'
                  ? '⚡ AI'
                  : job.mode === 'human'
                  ? '👤 Human'
                  : job.mode === 'hybrid'
                  ? '🔄 Hybrid'
                  : 'Unknown'}
              </span>

              {/* Office Status Badge */}
              {job.type === 'office' && job.officeStatus && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#f0ebf8] text-[#003366]"
                >
                  {job.officeStatus === 'submitted' && '📨 Submitted'}
                  {job.officeStatus === 'assigned' && '👤 Assigned'}
                  {job.officeStatus === 'in_progress' && '⚙️ In Progress'}
                  {job.officeStatus === 'waiting_review' && '👀 Waiting Review'}
                  {job.officeStatus === 'completed' && '✅ Completed'}
                  {job.officeStatus === 'delivered' && '📦 Delivered'}
                </span>
              )} 

              <span>
                {formatDuration(job.duration || 0)}
              </span>
              </div>

              {/* Queue Metadata */}
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500">
                {job.type === 'office' && job.domain && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#f0ebf8] text-[#003366] font-medium">
                    📄 {job.domain.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </span>
                )}
                
                {job.type === 'office' && job.rushDelivery && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-800 font-medium">
                    ⚡ Rush
                  </span>
                )}

                {job.type === 'office' && job.assignedTypistName && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    👤 Assigned to: {job.assignedTypistName}
                  </span>
                )}

                {job.type === 'office' && job.officeDueDate && (
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${
                    job.officeDueDate.toDate() < new Date() 
                      ? 'bg-red-100 text-red-800 font-medium' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    📅 Due: {job.officeDueDate.toDate().toLocaleDateString()}
                  </span>
                )}
                
                {job.templateFilename && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800">
                    📋 Template
                  </span>
                )}
                
                {job.multipleSpeakers && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    👥 {job.speakerCount || 3}+ Speakers
                  </span>
                )}

                <span className={`${waitingClass} whitespace-nowrap`}>
                  Submitted {waitingTime}
                </span>

                <CreditDisplay amount={job.creditsUsed || 0} size="sm" />
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons Row */}
        <div className="flex flex-wrap gap-2">
          {/* Download Audio */}
          {job.downloadURL && (
            <Button
              size="sm"
              variant="outline"
              className="text-blue-600 border-blue-300 hover:bg-blue-50"
              onClick={() => window.open(job.downloadURL, '_blank')}
            >
              <Music className="h-4 w-4 mr-1" />
              Audio
            </Button>
          )}

          {/* Download Template (if exists) */}
          {job.templateURL && (
            <Button
              size="sm"
              variant="outline"
              className="text-purple-600 border-purple-300 hover:bg-purple-50"
              onClick={() => window.open(job.templateURL, '_blank')}
            >
              <Download className="h-4 w-4 mr-1" />
              Template
            </Button>
          )}

          {/* Actions based on status */}

          {/* Office Studio jobs: management controls */}
          {job.type === 'office' && !['complete', 'cancelled'].includes(job.status) && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-[#003366] border-[#b29dd9] hover:bg-[#f0ebf8]"
                onClick={openReviewModal}
              >
                <Eye className="h-4 w-4 mr-1" />
                View Details
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-purple-600 border-purple-300 hover:bg-purple-50"
                onClick={() => completedDocInputRef.current?.click()}
                disabled={uploadingCompletedDoc}
              >
                <Upload className="h-4 w-4 mr-1" />
                {uploadingCompletedDoc ? 'Uploading...' : 'Upload Doc'}
              </Button>
              <input
                ref={completedDocInputRef}
                type="file"
                accept=".docx,.doc,.pdf,.txt"
                onChange={handleUploadCompletedDocument}
                className="hidden"
              />
            </>
          )}

          {/* Hybrid jobs: pending-review or under-review */}
          {job.type !== 'office' && (job.status === 'pending-review' || job.status === 'under-review') && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="text-blue-600"
                onClick={openReviewModal}
                disabled={loadingTranscript}
              >
                <Eye className="h-4 w-4 mr-1" />
                {loadingTranscript ? 'Loading...' : 'Review'}
              </Button>
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleApprove}
                disabled={isLoading}
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Approve
              </Button>
            </>
          )}

          {/* Human jobs: pending-transcription or queued */}
          {job.type !== 'office' && (job.status === 'pending-transcription' || (job.mode === 'human' && job.status === 'queued')) && (
            <>
              <Button
                size="sm"
                className="bg-[#003366] hover:bg-[#004080] text-white"
                onClick={openTranscribeModal}
              >
                <Edit className="h-4 w-4 mr-1" />
                Transcribe
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-green-600 border-green-300 hover:bg-green-50"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
              >
                <Upload className="h-4 w-4 mr-1" />
                {uploadingFile ? 'Uploading...' : 'Upload'}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.docx,.doc,.pdf,.rtf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </>
          )}

          {/* Failed jobs: retry with AI (non-office only) */}
          {job.type !== 'office' && job.status === 'failed' && (job.mode === 'ai' || job.mode === 'hybrid') && (
            <Button
              size="sm"
              variant="outline"
              className="text-purple-600 border-purple-300 hover:bg-purple-50"
              onClick={handleRetryWithAI}
              disabled={isLoading}
            >
              <Zap className="h-4 w-4 mr-1" />
              {isLoading ? 'Retrying...' : 'Retry AI'}
            </Button>
          )}

          {/* Stuck processing jobs: resubmit (non-office only) */}
          {job.type !== 'office' && isStuckProcessing && (job.mode === 'ai' || job.mode === 'hybrid') && (
            <Button
              size="sm"
              variant="outline"
              className="text-orange-600 border-orange-300 hover:bg-orange-50"
              onClick={handleResubmit}
              disabled={isLoading}
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              {isLoading ? 'Resubmitting...' : 'Resubmit'}
            </Button>
          )}

          {/* Reject button for actionable statuses */}
          {(job.status === 'pending-review' || job.status === 'under-review' ||
            job.status === 'pending-transcription' || (job.mode === 'human' && job.status === 'queued') ||
            (job.type === 'office' && !['complete', 'cancelled'].includes(job.status))) && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-300 hover:bg-red-50"
              onClick={handleReject}
              disabled={isLoading}
            >
              <XCircle className="h-4 w-4 mr-1" />
              Reject
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            className="text-gray-700 border-gray-300 hover:bg-gray-100"
            onClick={() => setShowArchiveConfirm(true)}
            disabled={isLoading}
          >
            <Archive className="h-4 w-4 mr-1" />
            Archive job
          </Button>
        </div>
        
        {/* Office Studio Management Panel */}
        {job.type === 'office' && !['complete', 'cancelled'].includes(job.status) && (
          <div className="mt-4 p-4 bg-[#f0ebf8] border border-[#b29dd9] rounded-lg space-y-3">
            <h4 className="font-medium text-[#003366] text-sm">📋 Document Workspace Management</h4>
            
            <div className="space-y-2">
              {/* Typist Assignment */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-700 block mb-1">Assign Typist</label>
                  <input
                    type="text"
                    value={assignedTypistInput}
                    onChange={(e) => setAssignedTypistInput(e.target.value)}
                    placeholder="Typist name"
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  className="bg-[#003366] hover:bg-[#004080] text-white whitespace-nowrap"
                  onClick={handleAssignTypist}
                  disabled={isLoading}
                >
                  Assign
                </Button>
              </div>

              {/* Due Date Setting */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs font-medium text-gray-700 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDateInput}
                    onChange={(e) => setDueDateInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                  />
                </div>
                <Button
                  size="sm"
                  className="bg-[#003366] hover:bg-[#004080] text-white whitespace-nowrap"
                  onClick={handleSetDueDate}
                  disabled={isLoading}
                >
                  Set
                </Button>
              </div>

              {/* Status Update Buttons */}
              <div className="flex gap-2 flex-wrap">
                {job.officeStatus !== 'in_progress' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => handleUpdateOfficeStatus('in_progress')}
                    disabled={isLoading}
                  >
                    Start Work
                  </Button>
                )}
                {job.officeStatus !== 'waiting_review' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => handleUpdateOfficeStatus('waiting_review')}
                    disabled={isLoading}
                  >
                    Mark for Review
                  </Button>
                )}
                {job.officeStatus !== 'completed' && job.officeCompletedDocumentURL && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs"
                    onClick={() => handleUpdateOfficeStatus('completed')}
                    disabled={isLoading}
                  >
                    Mark Complete
                  </Button>
                )}
                {job.officeStatus !== 'delivered' && job.officeCompletedDocumentURL && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs bg-green-50 border-green-300 text-green-700 hover:bg-green-100"
                    onClick={() => handleUpdateOfficeStatus('delivered')}
                    disabled={isLoading}
                  >
                    Deliver to Client
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transcription/Review Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-full sm:max-w-2xl w-full max-h-[95vh] sm:max-h-[85vh] overflow-y-auto my-4">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-[#003366]">
                  {job.type === 'office'
                    ? 'Document Workspace Project Details'
                    : (job.status === 'pending-review' || job.status === 'under-review') ? 'Review AI Transcript' : 'Create Transcript'}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setShowModal(false);
                    setTranscript('');
                  }}
                  className="flex-shrink-0"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>

              {/* Job Info */}
              <div className="mb-4 space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>File:</strong> <span className="break-words">{job.originalFilename || job.filename || 'Unknown file'}</span>
                </p>
                <p className="text-sm text-gray-600">
                  <strong>User:</strong> <span className="break-words">{userEmail || 'Unknown'}</span>
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Duration:</strong> {formatDuration(job.duration || 0)}
                </p>
                {job.type !== 'office' && (
                  <p className="text-sm text-gray-600">
                    <strong>Mode:</strong> {job.mode || 'Unknown'}
                  </p>
                )}
                {job.type === 'office' && job.domain && (
                  <p className="text-sm text-gray-600">
                    <strong>Project Type:</strong> {job.domain.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                  </p>
                )}

                {/* Audio Player */}
                {job.downloadURL && (
                  <div className="mb-4 pt-2">
                    <AudioPlayer src={job.downloadURL} standalone={true} />
                  </div>
                )}

                {/* Template download */}
                {job.templateURL && (
                  <div className="mb-4 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-900">📄 Document Template</p>
                        <p className="text-xs text-purple-700">{job.templateFilename || 'Template file'}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-purple-600 border-purple-300 hover:bg-purple-100"
                        onClick={() => window.open(job.templateURL, '_blank')}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* AI Transcript for review (hybrid jobs) */}
              {(job.status === 'pending-review' || job.status === 'under-review') && (job.transcript || job.transcriptStoragePath) && (
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
                        {getTranscriptText() || 'Unable to load transcript'}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {/* Transcript input for human transcription (non-office jobs only) */}
              {job.type !== 'office' && (job.status === 'pending-transcription' || (job.mode === 'human' && job.status === 'queued')) && (
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-3">
                    Type or paste the transcript below. Or use the <strong>Upload</strong> button to upload a document file directly.
                  </p>
                  <Textarea
                    value={transcript}
                    onChange={(e) => setTranscript(e.target.value)}
                    placeholder="Enter the transcription here..."
                    rows={6}
                    className="w-full min-h-[150px] sm:min-h-[200px]"
                  />
                </div>
              )}

              {/* Office Studio message */}
              {job.type === 'office' && (
                <div className="mb-4 p-4 bg-[#f0ebf8] border border-[#b29dd9] rounded-lg">
                  <p className="text-sm text-[#003366] font-medium">
                    🏢 Document Workspace Project
                  </p>
                  <p className="text-xs text-[#003366]/80 mt-1">
                    This is a Document Workspace project. Review the document and template details above. Use appropriate action buttons to process or reject this project.
                  </p>
                  {job.domain && (
                    <p className="text-xs text-[#003366]/80 mt-2">
                      <strong>Project Type:</strong> {job.domain.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                    </p>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowModal(false);
                    setTranscript('');
                  }}
                  className="w-full sm:w-auto"
                >
                  Close
                </Button>
                {job.type !== 'office' && (job.status === 'pending-review' || job.status === 'under-review') && (
                  <Button
                    onClick={handleApprove}
                    disabled={isLoading}
                    className="bg-[#003366] hover:bg-[#004080] w-full sm:w-auto"
                  >
                    {isLoading ? <LoadingSpinner size="sm" /> : 'Approve Transcript'}
                  </Button>
                )}
                {job.type !== 'office' && (job.status === 'pending-transcription' || (job.mode === 'human' && job.status === 'queued')) && (
                  <Button
                    onClick={handleSubmitTranscription}
                    disabled={isLoading || !transcript.trim()}
                    className="bg-[#003366] hover:bg-[#004080] w-full sm:w-auto"
                  >
                    {isLoading ? <LoadingSpinner size="sm" /> : 'Submit Transcript'}
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {showArchiveConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-[#003366] mb-2">
              Remove from work list?
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              Remove this job from the work list? This will hide it from the active admin queue but will not delete files.
            </p>
            <div className="flex flex-col sm:flex-row justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setShowArchiveConfirm(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                className="bg-[#003366] hover:bg-[#004080] text-white"
                onClick={handleArchive}
                disabled={isLoading}
              >
                {isLoading ? 'Removing...' : 'Remove from work list'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
