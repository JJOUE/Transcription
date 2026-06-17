"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Upload, FileText, X, AlertCircle, FileUp, Mic, Square, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import { useWallet } from '@/contexts/WalletContext';
import { generateFilePath } from '@/lib/firebase/storage';
import { createTranscriptionJobAPI } from '@/lib/api/transcriptions';
import { TranscriptionJob } from '@/lib/firebase/transcriptions';
import { formatDuration, getBillingMinutes } from '@/lib/utils';
import { PricingSettings, getPricingSettings } from '@/lib/firebase/settings';

interface UploadFile {
  file: File;
  duration: number;
  isMedia: boolean;
}

type OfficeServiceType = 'dictation-cleanup' | 'copy-typing' | 'handwriting-transcription' | 'document-preparation';

const OFFICE_SERVICE_TYPES: { value: OfficeServiceType; label: string; description: string }[] = [
  {
    value: 'dictation-cleanup',
    label: 'Audio instructions for document preparation',
    description: 'Upload audio instructions for a document you want prepared.'
  },
  {
    value: 'copy-typing',
    label: 'Copy typing',
    description: 'Scanned documents, PDFs, images, or typed drafts recreated as clean editable documents.'
  },
  {
    value: 'handwriting-transcription',
    label: 'Handwriting transcription',
    description: 'Handwritten notes, letters, file notes, or forms typed into readable digital documents.'
  },
  {
    value: 'document-preparation',
    label: 'Document preparation',
    description: 'Notes, files, references, and instructions turned into an organized document.'
  }
];

const MAIN_FILE_ACCEPT = 'audio/*,video/*,.doc,.docx,.pdf,.txt,.jpg,.jpeg,.png,.heic';
const DOCUMENT_EXTENSIONS = ['.doc', '.docx', '.pdf', '.txt'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.heic'];
const MAX_VOICE_INSTRUCTIONS_SECONDS = 10 * 60;

const getOfficeServiceLabel = (serviceType?: OfficeServiceType) =>
  OFFICE_SERVICE_TYPES.find(service => service.value === serviceType)?.label || 'Document Workspace';

const isMediaFile = (file: File) => {
  const type = file.type.split('/')[0];
  return type === 'audio' || type === 'video';
};

const hasAllowedDocumentWorkspaceExtension = (file: File) => {
  const filename = file.name.toLowerCase();
  return [...DOCUMENT_EXTENSIONS, ...IMAGE_EXTENSIONS].some(ext => filename.endsWith(ext));
};

export default function OfficeUploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, stage: '' });
  const [overallProgress, setOverallProgress] = useState(0);

  // Document Workspace fields
  const [officeServiceType, setOfficeServiceType] = useState<OfficeServiceType>('dictation-cleanup');
  const [formattingInstructions, setFormattingInstructions] = useState('');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [rushDelivery, setRushDelivery] = useState(false);
  const [officeNotes, setOfficeNotes] = useState('');
  const [voiceInstructionBlob, setVoiceInstructionBlob] = useState<Blob | null>(null);
  const [voiceInstructionUrl, setVoiceInstructionUrl] = useState<string | null>(null);
  const [voiceInstructionDuration, setVoiceInstructionDuration] = useState(0);
  const [isRecordingVoiceInstructions, setIsRecordingVoiceInstructions] = useState(false);
  const [microphoneError, setMicrophoneError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Pricing and wallet
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
  const { user, userData, refreshUser } = useAuth();
  const { consumeCredits } = useCredits();
  const {
    walletBalance,
    packages,
    checkSufficientBalance,
    deductForTranscription,
    refreshWallet
  } = useWallet();
  const { toast } = useToast();
  const router = useRouter();

  // Load pricing settings
  useEffect(() => {
    const loadPricing = async () => {
      try {
        const settings = await getPricingSettings();
        setPricingSettings(settings);
      } catch (error) {
        console.error('Error loading pricing settings:', error);
      }
    };
    loadPricing();
  }, []);

  useEffect(() => {
    return () => {
      if (voiceInstructionUrl) {
        URL.revokeObjectURL(voiceInstructionUrl);
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
      recordingStreamRef.current?.getTracks().forEach(track => track.stop());
    };
  }, [voiceInstructionUrl]);

  // Office studio uses human mode pricing for cost calculation
  const costPerMinute = pricingSettings?.payAsYouGo.human || 2.50;

  // Calculate total cost
  const totalDuration = uploadedFiles.reduce((sum, f) => sum + f.duration, 0);
  const hasDocumentSourceFiles = uploadedFiles.some(f => !f.isMedia);
  const totalCost = (totalDuration / 60) * costPerMinute;
  const rushCost = rushDelivery ? Math.ceil(totalDuration / 60) * 0.50 : 0; // $0.50 per minute for rush
  const totalWithRush = totalCost + rushCost;

  // Calculate billing against packages and wallet
  const activePackage = packages.find(p => p.active);
  const packageMinutes = activePackage ? activePackage.minutesRemaining : 0;
  const billingMinutes = Math.ceil(totalDuration / 60);
  const minutesFromWallet = Math.max(0, billingMinutes - packageMinutes);
  const walletAmountNeeded = minutesFromWallet * costPerMinute;
  const hasInsufficientBalance = walletAmountNeeded > walletBalance;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    processFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processFiles(files);
  };

  const processFiles = async (files: File[]) => {
    const supportedFiles = files.filter(f => {
      return isMediaFile(f) || hasAllowedDocumentWorkspaceExtension(f);
    });

    if (supportedFiles.length === 0) {
      toast({
        title: "Invalid file type",
        description: "Please upload audio, video, document, PDF, text, or common image files.",
        variant: "destructive"
      });
      return;
    }

    // Process each file for duration
    const newFiles: UploadFile[] = [];
    for (const file of supportedFiles) {
      if (file.size > 1024 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds 1GB limit.`,
          variant: "destructive"
        });
        continue;
      }

      if (isMediaFile(file)) {
        try {
          const duration = await getMediaDuration(file);
          newFiles.push({ file, duration, isMedia: true });
        } catch (error) {
          console.error('Error processing file:', error);
          toast({
            title: "Error processing file",
            description: `Could not read duration from ${file.name}`,
            variant: "destructive"
          });
        }
      } else {
        newFiles.push({ file, duration: 0, isMedia: false });
      }
    }

    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const media = document.createElement(file.type.startsWith('audio') ? 'audio' : 'video');
      media.onloadedmetadata = () => resolve(media.duration);
      media.onerror = () => reject(new Error('Failed to load media'));
      media.src = URL.createObjectURL(file);
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetVoiceInstructionRecording = () => {
    if (voiceInstructionUrl) {
      URL.revokeObjectURL(voiceInstructionUrl);
    }
    setVoiceInstructionBlob(null);
    setVoiceInstructionUrl(null);
    setVoiceInstructionDuration(0);
    setMicrophoneError('');
  };

  const stopVoiceInstructionRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const startVoiceInstructionRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setMicrophoneError('Voice recording is not available in this browser. You can still upload a file or type your instructions.');
      return;
    }

    try {
      resetVoiceInstructionRecording();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      recordingStartedAtRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordingChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const recordedBlob = new Blob(recordingChunksRef.current, {
          type: recorder.mimeType || 'audio/webm'
        });
        const duration = recordingStartedAtRef.current
          ? Math.min((Date.now() - recordingStartedAtRef.current) / 1000, MAX_VOICE_INSTRUCTIONS_SECONDS)
          : voiceInstructionDuration;

        if (recordedBlob.size > 0) {
          const objectUrl = URL.createObjectURL(recordedBlob);
          setVoiceInstructionBlob(recordedBlob);
          setVoiceInstructionUrl(objectUrl);
          setVoiceInstructionDuration(duration);
        }

        setIsRecordingVoiceInstructions(false);
        recordingStartedAtRef.current = null;
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }
        stream.getTracks().forEach(track => track.stop());
        recordingStreamRef.current = null;
      };

      recorder.start();
      setIsRecordingVoiceInstructions(true);
      setMicrophoneError('');
      recordingIntervalRef.current = setInterval(() => {
        if (!recordingStartedAtRef.current) return;

        const elapsed = (Date.now() - recordingStartedAtRef.current) / 1000;
        setVoiceInstructionDuration(Math.min(elapsed, MAX_VOICE_INSTRUCTIONS_SECONDS));
        if (elapsed >= MAX_VOICE_INSTRUCTIONS_SECONDS) {
          stopVoiceInstructionRecording();
        }
      }, 500);
    } catch (error) {
      console.error('Microphone recording error:', error);
      setIsRecordingVoiceInstructions(false);
      setMicrophoneError('Microphone access was not allowed. You can still upload a file or type your instructions.');
      recordingStreamRef.current?.getTracks().forEach(track => track.stop());
      recordingStreamRef.current = null;
    }
  };

  const handleTemplateSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: "Template too large",
          description: "Template must be under 50MB",
          variant: "destructive"
        });
        return;
      }
      setTemplateFile(file);
    }
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one file to continue.",
        variant: "destructive"
      });
      return;
    }

    if (isRecordingVoiceInstructions) {
      toast({
        title: "Recording in progress",
        description: "Please stop the voice instructions recording before submitting your project.",
        variant: "destructive"
      });
      return;
    }

    if (hasInsufficientBalance) {
      toast({
        title: "Insufficient Wallet Balance",
        description: `You need CA$${walletAmountNeeded.toFixed(2)} but only have CA$${walletBalance.toFixed(2)}. Please top up your wallet.`,
        variant: "destructive"
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    setProcessingProgress({ current: 0, total: uploadedFiles.length, stage: 'Preparing files...' });

    try {
      let uploadedVoiceInstructions: {
        path: string;
        url: string;
        name: string;
        duration: number;
      } | null = null;

      if (voiceInstructionBlob) {
        setProcessingProgress(prev => ({
          ...prev,
          stage: 'Uploading voice instructions...'
        }));

        const storage = await import('firebase/storage');
        const filename = `voice-instructions-${Date.now()}.webm`;
        const path = generateFilePath(user.uid, `voice-instructions/${filename}`);
        const ref = storage.ref(await import('@/lib/firebase/config').then(m => m.storage), path);
        const uploadTask = storage.uploadBytesResumable(ref, voiceInstructionBlob, {
          contentType: voiceInstructionBlob.type || 'audio/webm'
        });

        const url = await new Promise<string>((resolve, reject) => {
          uploadTask.on('state_changed',
            () => {},
            (error) => reject(error),
            async () => {
              const downloadUrl = await storage.getDownloadURL(ref);
              resolve(downloadUrl);
            }
          );
        });

        uploadedVoiceInstructions = {
          path,
          url,
          name: filename,
          duration: Math.round(voiceInstructionDuration)
        };
      }

      // Upload all files
      const uploadPromises = uploadedFiles.map(async (uploadFile, index) => {
        setProcessingProgress(prev => ({
          ...prev,
          current: index,
          stage: `Uploading ${uploadFile.file.name}...`
        }));

        try {
          const storage = await import('firebase/storage');
          const path = generateFilePath(user.uid, uploadFile.file.name);
          const ref = storage.ref(await import('@/lib/firebase/config').then(m => m.storage), path);

          const uploadTask = storage.uploadBytesResumable(ref, uploadFile.file);

          return new Promise<{ path: string; url: string; name: string }>((resolve, reject) => {
            uploadTask.on('state_changed',
              (snapshot) => {
                const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                setUploadProgress(prev => ({
                  ...prev,
                  [uploadFile.file.name]: progress
                }));
              },
              (error) => reject(error),
              async () => {
                const url = await storage.getDownloadURL(ref);
                resolve({
                  path,
                  url,
                  name: uploadFile.file.name
                });
              }
            );
          });
        } catch (error) {
          console.error('Upload error:', error);
          throw error;
        }
      });

      const uploadResults = await Promise.all(uploadPromises);
      setProcessingProgress(prev => ({ ...prev, stage: 'Creating jobs...' }));

      // Create jobs for each uploaded file
      for (let i = 0; i < uploadResults.length; i++) {
        const result = uploadResults[i];
        const uploadFile = uploadedFiles[i];

        const jobData: Omit<TranscriptionJob, 'id' | 'createdAt' | 'updatedAt'> = {
          userId: user.uid,
          filename: result.name,
          originalFilename: uploadFile.file.name,
          filePath: result.path,
          downloadURL: result.url,
          status: 'pending-review',
          type: 'office',
          mode: 'human',
          duration: uploadFile.duration,
          creditsUsed: Math.round(((uploadFile.duration / 60) * costPerMinute) * 100),
          rushDelivery,
          // Office-specific fields
          officeServiceType,
          specialInstructions: formattingInstructions || undefined,
          officeNotes: officeNotes || undefined,
          hasVoiceInstructions: Boolean(uploadedVoiceInstructions),
          voiceInstructionsPath: uploadedVoiceInstructions?.path,
          voiceInstructionsURL: uploadedVoiceInstructions?.url,
          voiceInstructionsFilename: uploadedVoiceInstructions?.name,
          voiceInstructionsDuration: uploadedVoiceInstructions?.duration
        };

        // Add template if provided
        if (templateFile) {
          try {
            const storage = await import('firebase/storage');
            const templatePath = generateFilePath(user.uid, `templates/${templateFile.name}`);
            const templateRef = storage.ref(await import('@/lib/firebase/config').then(m => m.storage), templatePath);
            
            const uploadTask = storage.uploadBytesResumable(templateRef, templateFile);
            
            const templateUrl = await new Promise<string>((resolve, reject) => {
              uploadTask.on('state_changed',
                () => {},
                (error) => reject(error),
                async () => {
                  const url = await storage.getDownloadURL(templateRef);
                  resolve(url);
                }
              );
            });

            jobData.templatePath = templatePath;
            jobData.templateURL = templateUrl;
            jobData.templateFilename = templateFile.name;
          } catch (error) {
            console.error('Template upload error:', error);
          }
        }

        const jobId = await createTranscriptionJobAPI(jobData);

        // Deduct using the existing human-mode wallet flow used for Document Workspace pricing.
        const fileBillingMinutes = getBillingMinutes(uploadFile.duration);
        if (fileBillingMinutes > 0) {
          const deductionResult = await deductForTranscription(
            'human',
            fileBillingMinutes,
            jobId
          );

          if (!deductionResult.success) {
            console.error('Failed to deduct payment:', deductionResult.error);
            throw new Error(deductionResult.error || 'Payment failed');
          }
        }
      }

      await refreshWallet();
      await refreshUser();

      toast({
        title: "Success",
        description: `${uploadResults.length} file(s) uploaded successfully!`,
      });

      setUploadedFiles([]);
      resetVoiceInstructionRecording();
      router.push('/dashboard');
    } catch (error) {
      console.error('Upload failed:', error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setProcessingProgress({ current: 0, total: 0, stage: '' });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <LoadingSpinner />
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-[#003366] mb-2">Document Workspace</h1>
          <p className="text-lg text-gray-600">
            Upload audio instructions, documents, scans, handwriting, or reference files for preparation.
          </p>
          <p className="text-sm text-gray-500 mt-2">
            If you only need audio or video converted into text, use AI Transcription instead.
          </p>
        </div>

        {/* Office-Specific Fields */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#003366]">
              Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Service Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service needed
              </label>
              <select
                value={officeServiceType}
                onChange={(e) => setOfficeServiceType(e.target.value as OfficeServiceType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#003366] focus:border-transparent"
                required
              >
                {OFFICE_SERVICE_TYPES.map(service => (
                  <option key={service.value} value={service.value}>{service.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-2">
                {OFFICE_SERVICE_TYPES.find(service => service.value === officeServiceType)?.description}
              </p>
            </div>

            {/* Voice Instructions */}
            <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-white p-2 text-[#003366]">
                  <Mic className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-[#003366]">Voice instructions</h2>
                  <p className="mt-1 text-sm text-gray-600">
                    Record a short message explaining what you need prepared. You can also type instructions below.
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Voice recording works best in Safari on iPhone or Chrome on Android. If recording does not work, you can upload an audio file or type your instructions instead.
                  </p>
                  <p className="mt-2 text-xs text-gray-500">
                    Do not include passwords, unnecessary personal details, or confidential information that is not needed for the project.
                  </p>

                  {microphoneError && (
                    <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                      {microphoneError}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {!isRecordingVoiceInstructions && !voiceInstructionBlob && (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-[#003366] text-[#003366] hover:bg-blue-50"
                        onClick={startVoiceInstructionRecording}
                        disabled={isUploading}
                      >
                        <Mic className="mr-2 h-4 w-4" />
                        Start Recording
                      </Button>
                    )}

                    {isRecordingVoiceInstructions && (
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-300 text-red-700 hover:bg-red-50"
                        onClick={stopVoiceInstructionRecording}
                        disabled={isUploading}
                      >
                        <Square className="mr-2 h-4 w-4" />
                        Stop Recording
                      </Button>
                    )}

                    {voiceInstructionBlob && !isRecordingVoiceInstructions && (
                      <>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-[#003366] text-[#003366] hover:bg-blue-50"
                          onClick={startVoiceInstructionRecording}
                          disabled={isUploading}
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Re-record
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          onClick={resetVoiceInstructionRecording}
                          disabled={isUploading}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Remove Recording
                        </Button>
                      </>
                    )}

                    {(isRecordingVoiceInstructions || voiceInstructionBlob) && (
                      <span className="text-sm font-medium text-gray-700">
                        {formatDuration(Math.round(voiceInstructionDuration))}
                        {isRecordingVoiceInstructions ? ` / ${formatDuration(MAX_VOICE_INSTRUCTIONS_SECONDS)}` : ''}
                      </span>
                    )}
                  </div>

                  {voiceInstructionUrl && (
                    <div className="mt-4 rounded-md border border-blue-100 bg-white p-3">
                      <p className="mb-2 text-sm font-medium text-[#003366]">Voice instructions recorded</p>
                      <audio controls src={voiceInstructionUrl} className="w-full" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Formatting Instructions */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Instructions or formatting notes (Optional)
              </label>
              <Textarea
                value={formattingInstructions}
                onChange={(e) => setFormattingInstructions(e.target.value)}
                placeholder="Tell us what you need prepared, typed, cleaned up, or formatted."
                className="min-h-24"
              />
            </div>

            {/* Template Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Optional template or reference document
              </label>
              <div className="relative">
                <input
                  type="file"
                  onChange={handleTemplateSelect}
                  className="hidden"
                  id="template-input"
                  accept=".doc,.docx,.pdf,.txt"
                />
                <label
                  htmlFor="template-input"
                  className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-[#003366] transition-colors"
                >
                  <FileUp className="h-5 w-5 text-gray-400 mr-2" />
                  <span className="text-sm text-gray-600">
                    {templateFile ? templateFile.name : 'Upload optional template or reference'}
                  </span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Use this for a sample, letterhead, formatting reference, or document you want us to follow.
              </p>
            </div>

            {/* Rush Delivery */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="rush-delivery"
                checked={rushDelivery}
                onChange={(e) => setRushDelivery(e.target.checked)}
                className="h-4 w-4 text-[#003366] rounded border-gray-300"
              />
              <label htmlFor="rush-delivery" className="ml-2 text-sm text-gray-700">
                Rush Delivery (+${rushCost.toFixed(2)}) - 24-48 hour turnaround
              </label>
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes (Optional)
              </label>
              <Textarea
                value={officeNotes}
                onChange={(e) => setOfficeNotes(e.target.value)}
                placeholder="Any other details or special instructions..."
                className="min-h-24"
              />
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card className="mb-6 border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#003366]">
              Upload your file
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver
                  ? 'border-[#003366] bg-blue-50'
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400'
              }`}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drag files here or click to select
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Upload audio instructions, documents, scans, handwriting, or reference files for preparation.
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Supported: audio, video, DOC, DOCX, PDF, TXT, JPG, PNG, HEIC (Max 1GB each)
              </p>
              <input
                type="file"
                onChange={handleFileSelect}
                className="hidden"
                id="file-input"
                multiple
                accept={MAIN_FILE_ACCEPT}
              />
              <label htmlFor="file-input">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  Select Files
                </Button>
              </label>
            </div>

            {/* Uploaded Files List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">
                  Files to Upload ({uploadedFiles.length})
                </h3>
                <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center flex-1">
                        <FileText className="h-5 w-5 text-[#003366] mr-3" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-700">
                            {file.file.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {file.isMedia ? `${formatDuration(file.duration)} · ` : 'Custom quote may apply · '}
                            {(file.file.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pricing Summary */}
        {uploadedFiles.length > 0 && (
          <Card className="mb-6 border-l-4 border-l-[#003366] bg-gradient-to-r from-blue-50 to-transparent shadow-sm">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-600">Total Duration</p>
                  <p className="text-2xl font-bold text-[#003366]">
                    {formatDuration(totalDuration)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Cost</p>
                  <p className="text-2xl font-bold text-[#003366]">
                    CA${totalWithRush.toFixed(2)}
                  </p>
                </div>
              </div>

              {packages.length > 0 && (
                <div className="text-sm text-gray-600 pt-4 border-t border-gray-200">
                  <p className="mb-2">
                    Package: <span className="font-medium">{packageMinutes} minutes remaining</span>
                  </p>
                  {minutesFromWallet > 0 && (
                    <p>
                      Wallet charge: <span className="font-medium">CA${(minutesFromWallet * costPerMinute).toFixed(2)}</span>
                    </p>
                  )}
                </div>
              )}

              {hasDocumentSourceFiles && (
                <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-sm">
                  Custom quote may apply for document, handwriting, scan, or copy typing projects.
                </div>
              )}

              {hasInsufficientBalance && (
                <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <span>
                    Insufficient balance. Top up CA${walletAmountNeeded.toFixed(2)} to proceed.
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <Card className="mb-6 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4 mb-4">
                <LoadingSpinner />
                <div>
                  <p className="font-medium text-gray-700">{processingProgress.stage}</p>
                  <p className="text-sm text-gray-500">
                    {processingProgress.current + 1} of {processingProgress.total}
                  </p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-[#003366] h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(processingProgress.current / Math.max(1, processingProgress.total)) * 100}%`
                  }}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Button
            onClick={handleSubmit}
            disabled={isUploading || isRecordingVoiceInstructions || uploadedFiles.length === 0 || hasInsufficientBalance}
            className="flex-1 bg-[#003366] hover:bg-[#002244] text-white font-medium py-2"
          >
            {isUploading ? 'Uploading...' : `Upload ${uploadedFiles.length} File(s)`}
          </Button>
          <Button
            variant="outline"
            asChild
            className="border border-gray-300"
          >
            <Link href="/dashboard">Cancel</Link>
          </Button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
