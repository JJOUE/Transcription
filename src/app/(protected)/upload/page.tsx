"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Upload, FileAudio, FileVideo, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
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
import { createTranscriptionJobAPI, getModeDetails } from '@/lib/api/transcriptions';
import { TranscriptionMode, TranscriptionJob, TranscriptionDomain } from '@/lib/firebase/transcriptions';
import { formatDuration, getBillingMinutes } from '@/lib/utils';
import { PricingSettings, getPricingSettings } from '@/lib/firebase/settings';

interface UploadFile {
  file: File;
  duration: number; // in seconds (exact duration)
}

export default function UploadPage() {
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);
  const [transcriptionMode, setTranscriptionMode] = useState('ai');
  const [transcriptionLanguage, setTranscriptionLanguage] = useState('en');
  const [transcriptionDomain, setTranscriptionDomain] = useState<TranscriptionDomain>('general');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{[key: string]: number}>({});
  const [processingFiles, setProcessingFiles] = useState<Set<string>>(new Set());
  const [processingProgress, setProcessingProgress] = useState({ current: 0, total: 0, stage: '' });
  const [overallProgress, setOverallProgress] = useState(0);

  // Metadata fields for transcript template
  const [projectName, setProjectName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [location, setLocation] = useState('');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [includeFiller, setIncludeFiller] = useState(false);

  // Template file for human transcription
  const [templateFile, setTemplateFile] = useState<File | null>(null);

  // Pricing settings from database
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);

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

  // Add-on options
  const [rushDelivery, setRushDelivery] = useState(false);
  const [multipleSpeakers, setMultipleSpeakers] = useState(false);
  const [speakerCount, setSpeakerCount] = useState(2);
  const { user, userData, refreshUser } = useAuth();
  const { consumeCredits } = useCredits();
  const {
    walletBalance,
    packages,
    freeTrialMinutes,
    freeTrialActive,
    freeTrialUsed,
    freeTrialTotal,
    checkSufficientBalance,
    deductForTranscription,
    getActivePackageForMode,
    refreshWallet
  } = useWallet();
  const { toast } = useToast();
  const router = useRouter();

  // Log authentication and configuration status on mount
  useEffect(() => {
    console.log('[Upload Page] Component mounted');
    console.log('[Upload Page] Auth state:', {
      authenticated: !!user,
      userId: user?.uid,
      userEmail: user?.email,
      hasUserData: !!userData
    });
    console.log('[Upload Page] Firebase Storage Bucket:', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET);
  }, [user, userData]);

  // Function to get user's location
  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not supported",
        description: "Your browser doesn't support location services.",
        variant: "destructive"
      });
      return;
    }

    setLocationEnabled(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Use reverse geocoding to get a readable address
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${position.coords.latitude}&longitude=${position.coords.longitude}&localityLanguage=en`
          );
          const data = await response.json();

          // Format a nice location string
          const locationString = [
            data.city,
            data.principalSubdivision,
            data.countryName
          ].filter(Boolean).join(', ');

          setLocation(locationString || `${position.coords.latitude}, ${position.coords.longitude}`);

          toast({
            title: "Location detected",
            description: `Location set to: ${locationString}`,
          });
        } catch {
          // Fallback to coordinates if geocoding fails
          const coords = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
          setLocation(coords);

          toast({
            title: "Location detected",
            description: `Location set to coordinates: ${coords}`,
          });
        }
      },
      (error) => {
        setLocationEnabled(false);

        let message = "Unable to get your location.";
        if (error.code === error.PERMISSION_DENIED) {
          message = "Location access denied. Please enable location permissions.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = "Location information unavailable.";
        }

        toast({
          title: "Location error",
          description: message,
          variant: "destructive"
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  };

  const transcriptionModes = [
    {
      id: 'ai',
      name: 'AI Transcription',
      description: 'Fast, automated transcription with good accuracy',
      creditsPerMinute: 100, // Legacy support
      costPerMinute: pricingSettings?.payAsYouGo.ai || 0.40, // CA$ per minute from database
      turnaround: '60 mins',
      icon: '/ai_transcription.jpg'
    },
    {
      id: 'hybrid',
      name: 'Hybrid Review',
      description: 'AI transcription reviewed by human experts',
      creditsPerMinute: 150, // Legacy support
      costPerMinute: pricingSettings?.payAsYouGo.hybrid || 1.50, // CA$ per minute from database
      turnaround: '3-5 days',
      icon: '/hybrid_review.jpg'
    },
    {
      id: 'human',
      name: 'Dictation & Human Transcription',
      description: 'Professional human transcription for dictation and highest accuracy',
      creditsPerMinute: 200, // Legacy support
      costPerMinute: pricingSettings?.payAsYouGo.human || 2.50, // CA$ per minute from database
      turnaround: '3-5 days',
      icon: '/human_transcription.jpg'
    }
  ];

  const selectedMode = transcriptionModes.find(mode => mode.id === transcriptionMode)!;
  const totalDurationSeconds = uploadedFiles.reduce((sum, file) => sum + file.duration, 0);
  const totalBillingMinutes = uploadedFiles.reduce((sum, file) => sum + getBillingMinutes(file.duration), 0);

  // Calculate cost based on minutes, mode, and packages
  const activePackage = getActivePackageForMode(transcriptionMode as TranscriptionMode);
  const hasPackage = !!activePackage;

  // Check balance and calculate costs (includes FREE TRIAL logic)
  const balanceCheck = checkSufficientBalance(
    transcriptionMode as TranscriptionMode,
    totalBillingMinutes
  );

  // Extract from balanceCheck (already calculated with FREE TRIAL priority)
  const freeTrialMinutesUsed = balanceCheck.freeTrialMinutes;
  const packageMinutesUsed = balanceCheck.packageMinutes;
  const walletMinutesUsed = totalBillingMinutes - freeTrialMinutesUsed - packageMinutesUsed;

  // Calculate add-on costs (only if NOT using package or free trial for those minutes)
  let addOnCostPerMinute = 0;
  if (!hasPackage && (transcriptionMode === 'hybrid' || transcriptionMode === 'human')) {
    if (rushDelivery) {
      addOnCostPerMinute += transcriptionMode === 'hybrid' ? 0.50 : 0.75;
    }
    if (multipleSpeakers) {
      addOnCostPerMinute += transcriptionMode === 'hybrid' ? 0.25 : 0.30;
    }
  }

  // Add-ons only apply to wallet minutes (not free trial or package)
  const addOnCost = walletMinutesUsed * addOnCostPerMinute;

  // Total cost from balanceCheck + add-ons
  const totalCost = balanceCheck.totalCost + addOnCost;
  const walletAmountNeeded = balanceCheck.walletNeeded + addOnCost;
  const hasInsufficientBalance = walletAmountNeeded > walletBalance;

  // Function to get accurate duration from audio/video files
  const getMediaDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const isVideo = file.type.startsWith('video/');
      const media = isVideo ? document.createElement('video') : document.createElement('audio');

      // Create object URL for the file
      const objectUrl = URL.createObjectURL(file);

      // Set timeout for large files (30 seconds)
      const timeout = setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error('Timeout loading media file'));
      }, 30000);

      media.addEventListener('loadedmetadata', () => {
        clearTimeout(timeout);
        // Clean up the object URL to free memory
        URL.revokeObjectURL(objectUrl);
        // Return exact duration in seconds
        resolve(media.duration);
      });

      media.addEventListener('error', (error) => {
        clearTimeout(timeout);
        URL.revokeObjectURL(objectUrl);
        console.error('Media loading error:', error);
        reject(new Error('Failed to load media file'));
      });

      // Set preload to metadata only to speed up loading for large files
      media.preload = 'metadata';

      // Set the source to trigger loading
      media.src = objectUrl;
    });
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFiles = async (files: File[]) => {
    const audioVideoFiles = files.filter(file => 
      file.type.startsWith('audio/') || file.type.startsWith('video/')
    );

    if (audioVideoFiles.length !== files.length) {
      toast({
        title: "Invalid file type",
        description: "Please upload only audio or video files.",
        variant: "destructive",
      });
    }

    // Process files one by one to get their durations
    for (const file of audioVideoFiles) {
      const fileKey = file.name;
      setProcessingFiles(prev => new Set(prev).add(fileKey));
      
      try {
        const durationSeconds = await getMediaDuration(file);
        
        const newFile: UploadFile = {
          file,
          duration: durationSeconds
        };
        
        setUploadedFiles(prev => [...prev, newFile]);
      } catch (error) {
        console.error(`Error getting duration for ${file.name}:`, error);
        toast({
          title: "Duration calculation failed",
          description: `Could not determine duration for ${file.name}. Using estimated duration.`,
          variant: "destructive",
        });
        
        // Fallback to estimated duration based on file size
        const estimatedDurationMinutes = Math.ceil(file.size / (1024 * 1024) * 2); // Rough estimate: 2 minutes per MB
        const finalDurationMinutes = Math.max(estimatedDurationMinutes, 1); // At least 1 minute
        const estimatedDurationSeconds = finalDurationMinutes * 60; // Convert to seconds
        const newFile: UploadFile = {
          file,
          duration: estimatedDurationSeconds
        };
        
        setUploadedFiles(prev => [...prev, newFile]);
      } finally {
        setProcessingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileKey);
          return newSet;
        });
      }
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, [toast]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Diagnostic function to check API endpoint health
  const checkAPIHealth = async () => {
    console.log('[Health Check] Starting API endpoint health check...');
    try {
      const response = await fetch('/api/transcriptions/process', {
        method: 'OPTIONS',
      });
      console.log('[Health Check] OPTIONS request result:', {
        status: response.status,
        ok: response.ok,
        headers: Array.from(response.headers.entries()),
      });
      return response.ok;
    } catch (error) {
      console.error('[Health Check] Failed to reach API endpoint:', error);
      return false;
    }
  };

  const handleSubmit = async () => {
    if (uploadedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one file to continue.",
        variant: "destructive",
      });
      return;
    }

    if (hasInsufficientBalance) {
      toast({
        title: "Insufficient Wallet Balance",
        description: `You need CA$${walletAmountNeeded.toFixed(2)} from your wallet but only have CA$${walletBalance.toFixed(2)}. Please top up your wallet to continue.`,
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to upload files.",
        variant: "destructive",
      });
      return;
    }

    // Run health check before starting upload
    console.log('[Upload] ==================== UPLOAD SESSION START ====================');
    console.log('[Upload] Session info:', {
      timestamp: new Date().toISOString(),
      filesCount: uploadedFiles.length,
      mode: transcriptionMode,
      userId: user.uid,
      userAgent: navigator.userAgent,
    });

    const healthCheckPassed = await checkAPIHealth();
    if (!healthCheckPassed) {
      console.warn('[Upload] API health check failed - proceeding anyway but may encounter issues');
    } else {
      console.log('[Upload] API health check passed ✅');
    }

    setIsUploading(true);
    const progress: {[key: string]: number} = {};
    setProcessingProgress({ current: 0, total: uploadedFiles.length, stage: 'Preparing files...' });
    setOverallProgress(0);

    try {
      const modeDetails = getModeDetails(transcriptionMode as TranscriptionMode);

      // Get cost per minute from database settings
      const costPerMinute = transcriptionMode === 'ai' ? (pricingSettings?.payAsYouGo.ai || 0.40) :
                             transcriptionMode === 'hybrid' ? (pricingSettings?.payAsYouGo.hybrid || 1.50) :
                             (pricingSettings?.payAsYouGo.human || 2.50);

      // Track subscription minutes used across all files
      let totalCostProcessed = 0; // Track total cost of files being processed

      // Upload files to Firebase Storage and create transcription jobs
      const uploadPromises = uploadedFiles.map(async (uploadFile, index) => {
        setProcessingProgress(prev => ({
          ...prev,
          current: index,
          stage: `Processing ${uploadFile.file.name}...`
        }));

        const filePath = generateFilePath(user.uid, uploadFile.file.name);
        const fileKey = `${index}-${uploadFile.file.name}`;

        // Upload file to Firebase Storage with progress tracking
        const { uploadFile: uploadFileFunction } = await import('@/lib/firebase/storage');
        const result = await uploadFileFunction(
          uploadFile.file,
          filePath,
          (progressData) => {
            progress[fileKey] = progressData.progress;
            setUploadProgress({...progress});

            // Calculate overall progress across all files
            const totalProgress = Object.values(progress).reduce((sum, p) => sum + p, 0);
            const avgProgress = totalProgress / uploadedFiles.length;
            setOverallProgress(avgProgress);
          }
        );

        // Create transcription job in Firestore
        const billingMinutes = getBillingMinutes(uploadFile.duration);

        // Calculate add-on cost for this file
        let fileAddOnCost = 0;
        if (!hasPackage && (transcriptionMode === 'hybrid' || transcriptionMode === 'human')) {
          if (rushDelivery) {
            fileAddOnCost += billingMinutes * (transcriptionMode === 'hybrid' ? 0.50 : 0.75);
          }
          if (multipleSpeakers) {
            fileAddOnCost += billingMinutes * (transcriptionMode === 'hybrid' ? 0.25 : 0.30);
          }
        }

        const costForFile = (billingMinutes * costPerMinute) + fileAddOnCost;
        
        // Set initial status based on transcription mode
        let initialStatus: 'processing' | 'pending-transcription';
        if (transcriptionMode === 'human') {
          initialStatus = 'pending-transcription'; // Human mode goes directly to transcription queue
        } else {
          initialStatus = 'processing'; // AI and hybrid modes start processing immediately
        }

        // Upload template file for human transcription (only once for first file)
        let templateData: { templatePath?: string; templateURL?: string; templateFilename?: string } = {};
        if (transcriptionMode === 'human' && templateFile && index === 0) {
          try {
            const templatePath = generateFilePath(user.uid, `template_${templateFile.name}`);
            const { uploadFile: uploadFileFunction } = await import('@/lib/firebase/storage');
            const templateResult = await uploadFileFunction(templateFile, templatePath);
            templateData = {
              templatePath: templateResult.fullPath,
              templateURL: templateResult.downloadURL,
              templateFilename: templateFile.name
            };
            console.log('[Upload] Template uploaded:', templateData);
          } catch (templateError) {
            console.error('[Upload] Failed to upload template:', templateError);
            // Continue without template - not critical
          }
        }

        const jobData: Omit<TranscriptionJob, 'id' | 'createdAt' | 'updatedAt'> = {
          userId: user.uid,
          filename: result.name,
          originalFilename: uploadFile.file.name,
          filePath: result.fullPath,
          downloadURL: result.downloadURL,
          status: initialStatus,
          mode: transcriptionMode as TranscriptionMode,
          domain: transcriptionDomain, // Include domain for specialized vocabulary
          language: transcriptionLanguage, // Store language selection
          duration: uploadFile.duration, // Store duration in seconds
          creditsUsed: Math.round(costForFile * 100), // Store cost as credits (1 credit = $0.01) for backward compatibility
          // Add metadata fields for template
          projectName: projectName.trim() || undefined,
          patientName: patientName.trim() || undefined,
          location: location.trim() || undefined,
          // Filler words option
          includeFiller,
          // Add-on options
          rushDelivery: (transcriptionMode === 'hybrid' || transcriptionMode === 'human') ? rushDelivery : false,
          multipleSpeakers: (transcriptionMode === 'hybrid' || transcriptionMode === 'human') ? multipleSpeakers : false,
          speakerCount: multipleSpeakers ? speakerCount : 2,
          addOnCost: fileAddOnCost,
          hasPackage: hasPackage,
          // Template for human transcription
          ...templateData
        };

        // Only add specialInstructions if it has content
        const trimmedInstructions = specialInstructions.trim();
        if (trimmedInstructions) {
          jobData.specialInstructions = trimmedInstructions;
        }
        
        const jobId = await createTranscriptionJobAPI(jobData);

        // Update minutes used for tracking
        const { updateDoc, doc } = await import('firebase/firestore');
        const { db } = await import('@/lib/firebase/config');
        const { increment } = await import('firebase/firestore');

        await updateDoc(doc(db, 'users', user.uid), {
          minutesUsedThisMonth: increment(billingMinutes)
        });

        // Deduct from wallet balance
        if (billingMinutes > 0) {
          const deductionResult = await deductForTranscription(
            transcriptionMode as TranscriptionMode,
            billingMinutes,
            jobId
          );

          if (!deductionResult.success) {
            // If deduction fails, we should probably delete the job or mark it as failed
            console.error('Failed to deduct payment:', deductionResult.error);
            toast({
              title: "Payment failed",
              description: deductionResult.error || "Failed to process payment for transcription",
              variant: "destructive",
            });
            // TODO: Consider deleting the created job or marking it as payment_failed
            throw new Error(deductionResult.error || 'Payment failed');
          }

          totalCostProcessed += deductionResult.costDeducted;

          // Refresh wallet and user data to show updated balances (including free trial usage)
          await Promise.all([refreshWallet(), refreshUser()]);
        }

        // For AI and hybrid modes, start Speechmatics transcription processing with retry logic
        if (transcriptionMode === 'ai' || transcriptionMode === 'hybrid') {
          // Start processing with retry logic
          const processWithRetry = async (retries = 3, delayMs = 1000) => {
            const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            console.log(`[Upload][${clientId}] ==================== TRANSCRIPTION PROCESSING START ====================`);
            console.log(`[Upload][${clientId}] Client Environment:`, {
              userAgent: navigator.userAgent,
              language: navigator.language,
              online: navigator.onLine,
              cookiesEnabled: navigator.cookieEnabled,
              platform: navigator.platform,
              timestamp: new Date().toISOString(),
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              windowLocation: window.location.href,
            });

            for (let attempt = 1; attempt <= retries; attempt++) {
              const attemptStartTime = Date.now();
              try {
                console.log(`[Upload][${clientId}][Attempt ${attempt}/${retries}] Starting processing for job ${jobId}`);
                console.log(`[Upload][${clientId}][Attempt ${attempt}] Request payload:`, {
                  jobId: jobId,
                  language: transcriptionLanguage,
                  operatingPoint: 'standard'
                });

                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                  console.error(`[Upload][${clientId}][Attempt ${attempt}] Request timeout after 30 seconds`);
                  controller.abort();
                }, 30000); // 30 second timeout

                console.log(`[Upload][${clientId}][Attempt ${attempt}] Sending POST request to /api/transcriptions/process...`);
                const fetchStartTime = Date.now();

                const transcriptionResponse = await fetch('/api/transcriptions/process', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    jobId: jobId,
                    language: transcriptionLanguage,
                    operatingPoint: 'standard'
                  }),
                  signal: controller.signal
                });

                const fetchDuration = Date.now() - fetchStartTime;
                clearTimeout(timeoutId);

                console.log(`[Upload][${clientId}][Attempt ${attempt}] Response received after ${fetchDuration}ms`, {
                  status: transcriptionResponse.status,
                  statusText: transcriptionResponse.statusText,
                  ok: transcriptionResponse.ok,
                  headers: {
                    'content-type': transcriptionResponse.headers.get('content-type'),
                    'x-ratelimit-limit': transcriptionResponse.headers.get('x-ratelimit-limit'),
                    'x-ratelimit-remaining': transcriptionResponse.headers.get('x-ratelimit-remaining'),
                  },
                  url: transcriptionResponse.url,
                  redirected: transcriptionResponse.redirected,
                  type: transcriptionResponse.type,
                });

                if (!transcriptionResponse.ok) {
                  console.error(`[Upload][${clientId}][Attempt ${attempt}] Response not OK, status: ${transcriptionResponse.status}`);

                  let errorData;
                  try {
                    errorData = await transcriptionResponse.json();
                    console.error(`[Upload][${clientId}][Attempt ${attempt}] Error response body:`, errorData);
                  } catch (parseError) {
                    console.error(`[Upload][${clientId}][Attempt ${attempt}] Failed to parse error response:`, parseError);
                    errorData = { error: 'Failed to parse error response', originalStatus: transcriptionResponse.status };
                  }

                  // Don't retry on 405 or 400 errors
                  if (transcriptionResponse.status === 405 || transcriptionResponse.status === 400) {
                    console.error(`[Upload][${clientId}][Attempt ${attempt}] Non-retryable error ${transcriptionResponse.status}:`, {
                      status: transcriptionResponse.status,
                      errorData,
                      headers: Array.from(transcriptionResponse.headers.entries()),
                      url: transcriptionResponse.url,
                    });
                    toast({
                      title: "Processing Issue",
                      description: `Unable to start processing (Error ${transcriptionResponse.status}). Please contact support with client ID: ${clientId}`,
                      variant: "destructive",
                      duration: 10000,
                    });
                    return;
                  }

                  throw new Error(`HTTP ${transcriptionResponse.status}: ${errorData.error || errorData.message}`);
                }

                console.log(`[Upload][${clientId}][Attempt ${attempt}] Parsing success response...`);
                const responseData = await transcriptionResponse.json();
                console.log(`[Upload][${clientId}][Attempt ${attempt}] Response data:`, responseData);

                if (responseData.success === false) {
                  console.info(`[Upload][${clientId}][Attempt ${attempt}] Speechmatics not available for job ${jobId}:`, responseData.message);
                } else {
                  console.log(`[Upload][${clientId}][Attempt ${attempt}] ✅ SUCCESS - Processing started for job ${jobId}`);
                }

                const totalDuration = Date.now() - attemptStartTime;
                console.log(`[Upload][${clientId}][Attempt ${attempt}] Total attempt duration: ${totalDuration}ms`);
                return; // Success, exit retry loop

              } catch (error: any) {
                const totalDuration = Date.now() - attemptStartTime;
                console.error(`[Upload][${clientId}][Attempt ${attempt}] ❌ FAILED after ${totalDuration}ms:`, {
                  errorName: error.name,
                  errorMessage: error.message,
                  errorStack: error.stack?.split('\n').slice(0, 3).join('\n'),
                  errorType: error.constructor.name,
                });

                // Check if it's a network error
                if (error.name === 'AbortError') {
                  console.error(`[Upload][${clientId}][Attempt ${attempt}] Timeout error - request aborted after 30 seconds`);
                } else if (error.message?.includes('Failed to fetch')) {
                  console.error(`[Upload][${clientId}][Attempt ${attempt}] Network error - fetch failed (possible CORS, DNS, or connection issue)`);
                } else if (error.message?.includes('NetworkError')) {
                  console.error(`[Upload][${clientId}][Attempt ${attempt}] Browser reported network error`);
                } else if (error.message?.includes('ERR_')) {
                  console.error(`[Upload][${clientId}][Attempt ${attempt}] System error code detected`);
                }

                // Retry with exponential backoff
                if (attempt < retries) {
                  const backoffDelay = delayMs * Math.pow(2, attempt - 1);
                  console.log(`[Upload][${clientId}][Attempt ${attempt}] Retrying in ${backoffDelay}ms...`);
                  await new Promise(resolve => setTimeout(resolve, backoffDelay));
                } else {
                  // Final attempt failed
                  console.error(`[Upload][${clientId}] ==================== ALL ATTEMPTS FAILED ====================`);
                  console.error(`[Upload][${clientId}] Final error summary:`, {
                    jobId,
                    totalAttempts: retries,
                    lastError: error.message,
                    clientId,
                    timestamp: new Date().toISOString(),
                  });
                  toast({
                    title: "Processing delayed",
                    description: `Your file was uploaded but processing couldn't start. Client ID: ${clientId.substring(0, 20)}...`,
                    variant: "default",
                    duration: 10000,
                  });
                }
              }
            }
            console.log(`[Upload][${clientId}] ==================== TRANSCRIPTION PROCESSING END ====================`);
          };

          // Execute retry logic without blocking upload completion
          processWithRetry().catch(error => {
            console.error(`[Upload] Unexpected error in retry handler for job ${jobId}:`, error);
          });
        }

        setProcessingProgress(prev => ({
          ...prev,
          current: index + 1,
          stage: index + 1 === uploadedFiles.length ? 'Finalizing...' : `Completed ${uploadFile.file.name}`
        }));

        return jobId;
      });
      
      await Promise.all(uploadPromises);
      
      toast({
        title: 'Upload successful!',
        description: `Your ${uploadedFiles.length} file(s) have been uploaded and are being processed.`,
      });

      // Reset form
      setUploadedFiles([]);
      setSpecialInstructions('');
      setUploadProgress({});

      router.push('/transcriptions');
    } catch (error: any) {
      console.error('Upload error:', error);

      // Extract detailed error information
      let errorTitle = "Upload failed";
      let errorDescription = "Please try again or contact support.";

      if (error.message) {
        errorDescription = error.message;

        // Provide specific guidance based on error type
        if (error.message.includes('storage/unknown')) {
          errorTitle = "Storage Error";
          errorDescription = "Firebase Storage error detected. This usually means:\n\n1. Storage quota exceeded (upgrade to Blaze plan required)\n2. Billing not enabled on Firebase project\n3. Storage bucket not properly initialized\n4. Daily usage limits reached\n\nPlease check Firebase Console → Storage → Usage";
        } else if (error.message.includes('storage/unauthorized')) {
          errorTitle = "Authorization Error";
          errorDescription = "Storage access denied. Check Firebase Storage rules or authentication.";
        } else if (error.message.includes('storage/quota-exceeded')) {
          errorTitle = "Quota Exceeded";
          errorDescription = "Storage quota exceeded. Please upgrade to Blaze plan in Firebase Console.";
        } else if (error.message.includes('Storage bucket not configured')) {
          errorTitle = "Configuration Error";
          errorDescription = "Firebase Storage is not properly configured. Please check environment variables.";
        }
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
        duration: 10000, // Show longer for important error messages
      });
    } finally {
      setIsUploading(false);
      setProcessingProgress({ current: 0, total: 0, stage: '' });
      setOverallProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#003366] mb-2">
            Upload Files for Transcription
          </h1>
          <p className="text-gray-600">
            Upload your audio or video files and choose your preferred transcription mode.
          </p>
        </div>

        <div className="space-y-8">
          {/* File Upload */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                Select Files
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? 'border-[#b29dd9] bg-[#b29dd9]/5'
                    : 'border-gray-300 hover:border-[#b29dd9]'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-[#003366] mb-2">
                  Drop files here or click to browse
                </h3>
                <p className="text-gray-600 mb-4">
                  Supports MP3, WAV, MP4, MOV, and other audio/video formats
                </p>
                <input
                  type="file"
                  multiple
                  accept="audio/*,video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <Button asChild className="bg-[#003366] hover:bg-[#002244] text-white">
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Browse Files
                  </label>
                </Button>
              </div>

              {/* Processing Files Message */}
              {processingFiles.size > 0 && (
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                    <p className="text-blue-800 font-medium">
                      Calculating duration for {processingFiles.size} file(s)...
                    </p>
                  </div>
                  <p className="text-blue-700 text-sm mt-1">
                    Please wait while we analyze your media files to determine accurate pricing.
                  </p>
                </div>
              )}

              {/* Uploaded Files List */}
              {uploadedFiles.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h4 className="font-medium text-[#003366]">Uploaded Files</h4>
                  {uploadedFiles.map((uploadFile, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {uploadFile.file.type.startsWith('audio/') ? (
                          <FileAudio className="h-5 w-5 text-[#b29dd9]" />
                        ) : (
                          <FileVideo className="h-5 w-5 text-[#b29dd9]" />
                        )}
                        <div>
                          <p className="font-medium text-[#003366]">
                            {uploadFile.file.name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {Math.round(uploadFile.file.size / 1024 / 1024 * 100) / 100} MB • {formatDuration(uploadFile.duration)}
                          </p>
                        </div>
                        {isUploading && uploadProgress[`${index}-${uploadFile.file.name}`] !== undefined && (
                          <div className="mt-2">
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-[#b29dd9] h-2 rounded-full transition-all duration-300" 
                                style={{width: `${uploadProgress[`${index}-${uploadFile.file.name}`] || 0}%`}}
                              ></div>
                            </div>
                            <p className="text-xs text-gray-600 mt-1">
                              {Math.round(uploadProgress[`${index}-${uploadFile.file.name}`] || 0)}% uploaded
                            </p>
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 disabled:opacity-50"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Transcription Mode */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                Choose Transcription Mode
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={transcriptionMode} onValueChange={setTranscriptionMode} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {transcriptionModes.map((mode) => (
                  <Label
                    htmlFor={mode.id}
                    key={mode.id}
                    className={`cursor-pointer border rounded-lg p-4 md:p-6 flex flex-col transition-colors min-h-[200px] md:min-h-[250px] ${
                      transcriptionMode === mode.id
                        ? 'border-[#b29dd9] ring-2 ring-[#b29dd9] bg-[#b29dd9]/5'
                        : 'border-gray-200 hover:border-[#b29dd9] hover:bg-gray-50'
                    }`}
                  >
                    {/* Icon and Title in one line */}
                    <div className="flex items-center space-x-3 mb-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
                        <Image
                          src={mode.icon}
                          alt={mode.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <h3 className="font-semibold text-[#003366] text-lg flex-1">{mode.name}</h3>
                      <RadioGroupItem value={mode.id} id={mode.id} className="flex-shrink-0" />
                    </div>
                    
                    {/* Description */}
                    <div className="flex-1 flex flex-col justify-between">
                      <p className="text-gray-600 mb-6 leading-relaxed">{mode.description}</p>
                      
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Cost/min:</span>
                          <span className="text-sm font-semibold text-[#b29dd9]">CA${mode.costPerMinute.toFixed(2)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Turnaround time:</span>
                          <span className="text-sm text-gray-600 font-medium">{mode.turnaround}</span>
                        </div>
                      </div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Language Selection (AI Mode Only) */}
          {transcriptionMode === 'ai' && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#003366]">
                  🌍 Transcription Language
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  Select the language of your audio/video file
                </p>
              </CardHeader>
              <CardContent>
                <RadioGroup value={transcriptionLanguage} onValueChange={setTranscriptionLanguage} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Label
                    htmlFor="lang-en"
                    className={`cursor-pointer border rounded-lg p-4 flex flex-col transition-colors ${
                      transcriptionLanguage === 'en'
                        ? 'border-[#b29dd9] ring-2 ring-[#b29dd9] bg-[#b29dd9]/5'
                        : 'border-gray-200 hover:border-[#b29dd9] hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="text-2xl">🇨🇦</div>
                      <h3 className="font-medium text-gray-900 flex-1">Canadian English</h3>
                      <RadioGroupItem value="en" id="lang-en" />
                    </div>
                    <p className="text-sm text-gray-600">Transcribe Canadian English audio and video files</p>
                  </Label>

                  <Label
                    htmlFor="lang-fr"
                    className={`cursor-pointer border rounded-lg p-4 flex flex-col transition-colors ${
                      transcriptionLanguage === 'fr'
                        ? 'border-[#b29dd9] ring-2 ring-[#b29dd9] bg-[#b29dd9]/5'
                        : 'border-gray-200 hover:border-[#b29dd9] hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="text-2xl">🇫🇷</div>
                      <h3 className="font-medium text-gray-900 flex-1">French</h3>
                      <RadioGroupItem value="fr" id="lang-fr" />
                    </div>
                    <p className="text-sm text-gray-600">Transcrire des fichiers audio et vidéo en français</p>
                  </Label>
                </RadioGroup>

                {/* Information box for French */}
                {transcriptionLanguage === 'fr' && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <div className="text-blue-600 mt-0.5">ℹ️</div>
                      <div>
                        <p className="text-sm text-blue-800 font-medium">French Transcription Active</p>
                        <p className="text-sm text-blue-700 mt-1">
                          Your audio will be transcribed in French with optimized language models for accurate French transcription.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Domain Selection for Medical/Legal Terminology */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                🎯 Domain-Specific Terminology
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Select your domain to improve accuracy for specialized vocabulary
              </p>
            </CardHeader>
            <CardContent>
              <RadioGroup value={transcriptionDomain} onValueChange={(value) => setTranscriptionDomain(value as TranscriptionDomain)} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Label
                  htmlFor="general"
                  className={`cursor-pointer border rounded-lg p-4 flex flex-col transition-colors ${
                    transcriptionDomain === 'general'
                      ? 'border-[#b29dd9] ring-2 ring-[#b29dd9] bg-[#b29dd9]/5'
                      : 'border-gray-200 hover:border-[#b29dd9] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="text-2xl">🌐</div>
                    <h3 className="font-medium text-gray-900 flex-1">General</h3>
                    <RadioGroupItem value="general" id="general" />
                  </div>
                  <p className="text-sm text-gray-600">Standard vocabulary for everyday conversations and business meetings</p>
                </Label>

                <Label
                  htmlFor="medical"
                  className={`cursor-pointer border rounded-lg p-4 flex flex-col transition-colors ${
                    transcriptionDomain === 'medical'
                      ? 'border-[#b29dd9] ring-2 ring-[#b29dd9] bg-[#b29dd9]/5'
                      : 'border-gray-200 hover:border-[#b29dd9] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="text-2xl">🏥</div>
                    <h3 className="font-medium text-gray-900 flex-1">Medical</h3>
                    <RadioGroupItem value="medical" id="medical" />
                  </div>
                  <p className="text-sm text-gray-600">Enhanced accuracy for medical terminology, procedures, and pharmaceutical names</p>
                </Label>

                <Label
                  htmlFor="legal"
                  className={`cursor-pointer border rounded-lg p-4 flex flex-col transition-colors ${
                    transcriptionDomain === 'legal'
                      ? 'border-[#b29dd9] ring-2 ring-[#b29dd9] bg-[#b29dd9]/5'
                      : 'border-gray-200 hover:border-[#b29dd9] hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="text-2xl">⚖️</div>
                    <h3 className="font-medium text-gray-900 flex-1">Legal</h3>
                    <RadioGroupItem value="legal" id="legal" />
                  </div>
                  <p className="text-sm text-gray-600">Optimized for legal terminology, court proceedings, and judicial language</p>
                </Label>
              </RadioGroup>

              {/* Domain-specific information */}
              {transcriptionDomain === 'medical' && (
                <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="text-blue-600 mt-0.5">ℹ️</div>
                    <div>
                      <p className="text-sm text-blue-800 font-medium">Medical Domain Active</p>
                      <p className="text-sm text-blue-700 mt-1">
                        Enhanced recognition for medical procedures, pharmaceutical names, anatomical terms, and clinical vocabulary.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {transcriptionDomain === 'legal' && (
                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <div className="text-amber-600 mt-0.5">ℹ️</div>
                    <div>
                      <p className="text-sm text-amber-800 font-medium">Legal Domain Active</p>
                      <p className="text-sm text-amber-700 mt-1">
                        Improved accuracy for legal terminology, Latin phrases, court procedures, and judicial language.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filler Words Option */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                💬 Filler Words
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                Choose whether to include or remove filler words (um, uh, like, you know, etc.)
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">Include Filler Words</div>
                  <p className="text-sm text-gray-600 mt-1">
                    {includeFiller
                      ? "Transcript will include all filler words for verbatim accuracy"
                      : "Filler words will be removed for cleaner, more readable transcripts"}
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer ml-4">
                  <input
                    type="checkbox"
                    checked={includeFiller}
                    onChange={(e) => setIncludeFiller(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#b29dd9]/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#b29dd9]"></div>
                </label>
              </div>

              {/* Information box */}
              <div className={`mt-4 p-4 border rounded-lg ${includeFiller ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-start space-x-2">
                  <div className={`mt-0.5 ${includeFiller ? 'text-amber-600' : 'text-green-600'}`}>
                    {includeFiller ? '📝' : '✨'}
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${includeFiller ? 'text-amber-800' : 'text-green-800'}`}>
                      {includeFiller ? 'Verbatim Mode' : 'Clean Mode'}
                    </p>
                    <p className={`text-sm mt-1 ${includeFiller ? 'text-amber-700' : 'text-green-700'}`}>
                      {includeFiller
                        ? 'Perfect for legal depositions, interviews, and situations requiring exact word-for-word transcripts.'
                        : 'Ideal for business meetings, presentations, and content creation where readability is key.'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transcript Metadata */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                Transcript Information (Optional)
              </CardTitle>
              <p className="text-sm text-gray-600 mt-2">
                This information will appear on your professional transcript template
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="projectName" className="text-sm font-medium text-gray-700 mb-2">
                    Project Name
                  </Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g., Discovery Interview"
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="patientName" className="text-sm font-medium text-gray-700 mb-2">
                    Patient/Subject Name
                  </Label>
                  <Input
                    id="patientName"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g., John Doe"
                    className="w-full"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm font-medium text-gray-700 mb-2">
                    Location
                  </Label>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1">
                      <Input
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Enter location manually or use GPS"
                        className="w-full"
                        disabled={locationEnabled}
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={requestLocation}
                      disabled={locationEnabled}
                      variant="outline"
                      className="border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white"
                    >
                      {locationEnabled ? 'Getting Location...' : 'Use GPS'}
                    </Button>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Location will be auto-populated if you enable GPS, or you can enter it manually
                  </p>
                </div>
              </div>

              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-900 mb-2">Automatic Fields</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <div><strong>Client Name:</strong> {userData?.name || 'Your account name'}</div>
                  <div><strong>Provider Name:</strong> Talk to Text</div>
                  <div><strong>Date & Time:</strong> Upload time will be used</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Add-on Options (for Hybrid and Human only) */}
          {(transcriptionMode === 'hybrid' || transcriptionMode === 'human') && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#003366]">
                  ⚡ Premium Add-ons
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  {userData?.hasActivePackage
                    ? "✨ These add-ons are FREE with your package!"
                    : "Select optional add-ons (additional charges apply)"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Rush Delivery Option */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🚀</span>
                        <h4 className="font-medium text-gray-900">Rush Delivery</h4>
                        {!userData?.hasActivePackage && (
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                            +CA${transcriptionMode === 'hybrid' ? '0.50' : '0.75'}/min
                          </span>
                        )}
                        {userData?.hasActivePackage && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                            FREE with package
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Get your transcription in 24-48 hours instead of 3-5 business days
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={rushDelivery}
                        onChange={(e) => setRushDelivery(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#b29dd9]/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#b29dd9]"></div>
                    </label>
                  </div>
                </div>

                {/* Multiple Speakers Option */}
                <div className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👥</span>
                        <h4 className="font-medium text-gray-900">Multiple Speakers (3+)</h4>
                        {!userData?.hasActivePackage && (
                          <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                            +CA${transcriptionMode === 'hybrid' ? '0.25' : '0.30'}/min
                          </span>
                        )}
                        {userData?.hasActivePackage && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                            FREE with package
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Enhanced speaker identification for recordings with 3 or more speakers
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer ml-4">
                      <input
                        type="checkbox"
                        checked={multipleSpeakers}
                        onChange={(e) => setMultipleSpeakers(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#b29dd9]/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#b29dd9]"></div>
                    </label>
                  </div>

                  {/* Speaker count input when multiple speakers is selected */}
                  {multipleSpeakers && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <label className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">Number of speakers:</span>
                        <input
                          type="number"
                          min="3"
                          max="10"
                          value={speakerCount}
                          onChange={(e) => setSpeakerCount(Math.max(3, Math.min(10, parseInt(e.target.value) || 3)))}
                          className="w-20 px-3 py-1 border border-gray-300 rounded-md text-center focus:outline-none focus:ring-2 focus:ring-[#b29dd9] focus:border-transparent"
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* Cost Summary for Add-ons */}
                {(rushDelivery || multipleSpeakers) && !userData?.hasActivePackage && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <div className="text-amber-600 mt-0.5">💰</div>
                      <div>
                        <p className="text-sm text-amber-800 font-medium">Add-on Charges</p>
                        <div className="text-sm text-amber-700 mt-1 space-y-1">
                          {rushDelivery && (
                            <div>• Rush Delivery: +CA${(transcriptionMode === 'hybrid' ? 0.50 : 0.75).toFixed(2)}/min</div>
                          )}
                          {multipleSpeakers && (
                            <div>• Multiple Speakers: +CA${(transcriptionMode === 'hybrid' ? 0.25 : 0.30).toFixed(2)}/min</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Package Benefit Notice */}
                {(rushDelivery || multipleSpeakers) && userData?.hasActivePackage && (
                  <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <div className="text-green-600 mt-0.5">✨</div>
                      <div>
                        <p className="text-sm text-green-800 font-medium">Package Benefits Active!</p>
                        <p className="text-sm text-green-700 mt-1">
                          Your selected add-ons are included FREE with your package. No additional charges!
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Special Instructions */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                Special Instructions (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Any special instructions for the transcriber? (e.g., speaker names, technical terms, formatting preferences)"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                rows={4}
                className="min-h-[120px]"
              />
            </CardContent>
          </Card>

          {/* Template Upload (Human Transcription Only) */}
          {transcriptionMode === 'human' && (
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#003366]">
                  📄 Document Template (Optional)
                </CardTitle>
                <p className="text-sm text-gray-600 mt-2">
                  Upload a Word document template (letterhead, legal form, etc.) for the transcriber to use
                </p>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                      templateFile ? 'border-green-300 bg-green-50' : 'border-gray-300 hover:border-[#b29dd9]'
                    }`}
                  >
                    {templateFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <FileText className="h-8 w-8 text-green-600" />
                        <div className="text-left">
                          <p className="font-medium text-gray-900">{templateFile.name}</p>
                          <p className="text-sm text-gray-500">
                            {(templateFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTemplateFile(null)}
                          className="ml-4 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <input
                          type="file"
                          accept=".doc,.docx,.pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setTemplateFile(file);
                            }
                          }}
                          className="hidden"
                        />
                        <div className="space-y-2">
                          <Upload className="h-8 w-8 mx-auto text-gray-400" />
                          <p className="text-gray-600">
                            Click to upload a template
                          </p>
                          <p className="text-xs text-gray-400">
                            Supports: .docx, .doc, .pdf
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cost Summary */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366]">
                Cost Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Billable Minutes */}
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">Billable Minutes:</span>
                  <span className="font-medium text-lg">{totalBillingMinutes} {totalBillingMinutes === 1 ? 'minute' : 'minutes'}</span>
                </div>
                {totalDurationSeconds > 0 && totalBillingMinutes !== Math.floor(totalDurationSeconds / 60) && (
                  <p className="text-xs text-gray-500 -mt-2">
                    Actual duration: {formatDuration(totalDurationSeconds)} (partial minutes rounded up)
                  </p>
                )}

                {/* FREE TRIAL Section - Shows first if using free trial */}
                {freeTrialMinutesUsed > 0 && (
                  <div className="p-4 bg-green-50 border-2 border-green-500 rounded-lg mb-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">🎉</span>
                      <span className="text-sm font-bold text-green-700 uppercase tracking-wide">FREE TRIAL</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-green-700 font-medium">Using FREE trial minutes:</span>
                      <span className="text-lg font-bold text-green-800">
                        {freeTrialMinutesUsed} minutes FREE
                      </span>
                    </div>
                    <div className="text-xs text-gray-600 mt-2 flex justify-between items-center">
                      <span>After this: {freeTrialMinutes - freeTrialMinutesUsed} FREE minutes remain</span>
                      <span className="font-semibold text-green-700">CA$0.00</span>
                    </div>
                  </div>
                )}

                {/* Payment Method Section */}
                {activePackage && packageMinutesUsed > 0 && (
                  <>
                    {/* Package covers everything */}
                    {walletMinutesUsed === 0 ? (
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-green-700 font-medium">✓ Using {activePackage.name}</span>
                          <span className="text-sm font-semibold text-green-800">
                            {packageMinutesUsed} min × CA${activePackage.rate.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-xs text-green-600 mt-2">
                          {activePackage.minutesRemaining - packageMinutesUsed} minutes will remain • No wallet needed
                        </div>
                      </div>
                    ) : (
                      /* Package + Wallet needed */
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                        <div className="text-xs text-amber-700 font-medium mb-2">Package insufficient, using both:</div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-amber-700">{activePackage.name}:</span>
                            <span className="text-sm font-semibold text-amber-800">
                              {packageMinutesUsed} min × CA${activePackage.rate.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-amber-700">From Wallet:</span>
                            <span className="text-sm font-semibold text-amber-800">
                              {walletMinutesUsed} min × CA${selectedMode.costPerMinute.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* No package available - wallet only */}
                {!activePackage && walletMinutesUsed > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">Rate ({selectedMode.name}):</span>
                    <span className="font-semibold text-[#b29dd9]">
                      {walletMinutesUsed} min × CA${selectedMode.costPerMinute.toFixed(2)}
                    </span>
                  </div>
                )}

                {/* Add-on costs */}
                {addOnCost > 0 && (
                  <div className="pl-4 space-y-1 border-l-2 border-gray-200">
                    {rushDelivery && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">+ Rush Delivery:</span>
                        <span className="text-sm text-gray-700">CA${(walletMinutesUsed * (transcriptionMode === 'hybrid' ? 0.50 : 0.75)).toFixed(2)}</span>
                      </div>
                    )}
                    {multipleSpeakers && (
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">+ Multiple Speakers:</span>
                        <span className="text-sm text-gray-700">CA${(walletMinutesUsed * (transcriptionMode === 'hybrid' ? 0.25 : 0.30)).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Total Cost - Always at the bottom */}
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#003366] text-xl">Total Cost:</span>
                    <span className="font-bold text-[#003366] text-xl">CA${totalCost.toFixed(2)}</span>
                  </div>
                </div>

                {/* Account Balance Info */}
                {userData && (
                  <div className="pt-2 space-y-2">
                    {/* Show current balances */}
                    <div className="text-sm space-y-1">
                      {/* Free Trial Balance */}
                      {freeTrialActive && freeTrialMinutes > 0 && (
                        <div className="flex justify-between items-center bg-green-50 p-2 rounded border border-green-200">
                          <span className="text-green-700 font-medium">🎉 Free Trial Balance:</span>
                          <span className="text-green-800 font-bold">{freeTrialMinutes} minutes</span>
                        </div>
                      )}
                      {activePackage && (
                        <div className="flex justify-between items-center">
                          <span className="text-gray-500">Package Balance:</span>
                          <span className="text-gray-700">{activePackage.minutesRemaining} minutes</span>
                        </div>
                      )}
                      {walletMinutesUsed > 0 && (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-gray-500">Wallet Balance:</span>
                            <span className={walletBalance >= walletAmountNeeded ? 'text-gray-700' : 'text-red-600 font-medium'}>
                              CA${walletBalance.toFixed(2)}
                            </span>
                          </div>
                          {walletBalance >= walletAmountNeeded && (
                            <div className="flex justify-between items-center">
                              <span className="text-gray-500">After Transaction:</span>
                              <span className="text-gray-700">CA${(walletBalance - walletAmountNeeded).toFixed(2)}</span>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Package benefits for add-ons */}
                    {activePackage && (rushDelivery || multipleSpeakers) && (transcriptionMode === 'hybrid' || transcriptionMode === 'human') && (
                      <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                        ✓ Add-ons included FREE with your package
                      </div>
                    )}
                  </div>
                )}

                {hasInsufficientBalance && (
                  <div className="p-6 bg-red-50 border border-red-200 rounded-lg mt-4">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3" />
                      <div>
                        <p className="font-medium text-red-800 mb-2">
                          Insufficient Wallet Balance
                        </p>
                        <p className="text-red-700">
                          {activePackage && walletMinutesUsed > 0 ? (
                            <>Your package can cover {packageMinutesUsed} minutes, but you need CA${walletAmountNeeded.toFixed(2)} from your wallet for the remaining {walletMinutesUsed} minutes. You only have CA${walletBalance.toFixed(2)}.</>
                          ) : (
                            <>You need CA${walletAmountNeeded.toFixed(2)} but only have CA${walletBalance.toFixed(2)} in your wallet.</>
                          )}
                        </p>
                        <Link href="/billing" className="text-red-800 underline mt-2 inline-block">
                          Top up your wallet
                        </Link>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4 pt-4">
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              disabled={isUploading}
              className="px-8 py-3"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUploading || uploadedFiles.length === 0 || hasInsufficientBalance}
              className={`text-white px-8 py-3 relative overflow-hidden ${
                isUploading ? 'bg-gray-400' : 'bg-[#003366] hover:bg-[#002244]'
              }`}
            >
              {/* Progress bar fill - completed portion shows normal button color */}
              {isUploading && (
                <div
                  className="absolute inset-0 bg-[#003366] transition-all duration-300 ease-out"
                  style={{ width: `${overallProgress}%` }}
                />
              )}

              {/* Button content */}
              <span className="relative z-10 flex items-center">
                {isUploading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Processing...
                  </>
                ) : (
                  'Start Transcription'
                )}
              </span>
            </Button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}