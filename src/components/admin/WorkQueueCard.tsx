"use client";

import React, { useState, useRef } from 'react';
import { Download, CheckCircle, XCircle, Edit, Eye, Music, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { CreditDisplay } from '@/components/ui/CreditDisplay';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AudioPlayer } from '@/components/ui/AudioPlayer';
import { useToast } from '@/components/ui/use-toast';
import { useCredits } from '@/contexts/CreditContext';
import {
  approveTranscriptionReview,
  rejectTranscriptionJob,
  submitHumanTranscription,
  TranscriptionJob
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

  return (
    <>
      <div
        className={`p-4 rounded-lg border transition-colors ${
          job.rushDelivery
            ? 'bg-orange-50 border-orange-300'
            : 'bg-gray-50 border-gray-200'
        }`}
      >
        {/* Job Info Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-2 mb-1">
              {job.rushDelivery && (
                <span className="text-amber-500 text-lg" title="Rush Delivery">⚡</span>
              )}
              <span className="font-medium text-[#003366] truncate">
                {job.originalFilename || job.filename || 'Unknown file'}
              </span>
              <StatusBadge status={job.status} />
              {job.multipleSpeakers && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  👥 {job.speakerCount || 3}+ Speakers
                </span>
              )}
            </div>
            <div className="flex items-center flex-wrap gap-3 text-sm text-gray-600">
              <span>{userEmail || 'Unknown user'}</span>
              <span className="capitalize">{job.mode}</span>
              <span>{formatDuration(job.duration || 0)}</span>
              <CreditDisplay amount={job.creditsUsed || 0} size="sm" />
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
          {job.status === 'pending-review' && (
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

          {job.status === 'pending-transcription' && (
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
                {uploadingFile ? 'Loading...' : 'Upload'}
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

          {/* Reject button for both statuses */}
          {(job.status === 'pending-review' || job.status === 'pending-transcription') && (
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
        </div>
      </div>

      {/* Transcription/Review Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-full sm:max-w-2xl w-full max-h-[95vh] sm:max-h-[85vh] overflow-y-auto my-4">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base sm:text-lg font-semibold text-[#003366]">
                  {job.status === 'pending-review' ? 'Review AI Transcript' : 'Create Transcript'}
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
                <p className="text-sm text-gray-600">
                  <strong>Mode:</strong> {job.mode || 'Unknown'}
                </p>

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

              {/* AI Transcript for review */}
              {job.status === 'pending-review' && (job.transcript || job.transcriptStoragePath) && (
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

              {/* Transcript input for human transcription */}
              {job.status === 'pending-transcription' && (
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
                  Cancel
                </Button>
                {job.status === 'pending-review' && (
                  <Button
                    onClick={handleApprove}
                    disabled={isLoading}
                    className="bg-[#003366] hover:bg-[#004080] w-full sm:w-auto"
                  >
                    {isLoading ? <LoadingSpinner size="sm" /> : 'Approve Transcript'}
                  </Button>
                )}
                {job.status === 'pending-transcription' && (
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
    </>
  );
}
