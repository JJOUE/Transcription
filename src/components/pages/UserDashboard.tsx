"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Upload, FileText, CreditCard, Clock, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import { useWallet } from '@/contexts/WalletContext';
import { getTranscriptionsByUser, TranscriptionJob } from '@/lib/firebase/transcriptions';
import { formatRetentionLabel, isRetentionDeleted } from '@/lib/utils/retention';
import { Timestamp } from 'firebase/firestore';


// Transaction interface now comes from CreditContext

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

export function UserDashboard() {
  const { user, userData } = useAuth();
  const { transactions } = useCredits();
  const {
    walletBalance: contextWalletBalance,
    packages,
    freeTrialMinutes,
    freeTrialUsed,
    freeTrialTotal,
    loading: walletLoading
  } = useWallet();

  const [allJobs, setAllJobs] = useState<TranscriptionJob[]>([]);
  const [recentJobs, setRecentJobs] = useState<TranscriptionJob[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  // Load all transcription jobs from Firestore
  useEffect(() => {
    if (!user) return;

    const loadJobs = async () => {
      try {
        setJobsLoading(true);
        const jobs = await getTranscriptionsByUser(user.uid);
        const visibleJobs = jobs.filter(job => !isRetentionDeleted(job));
        setAllJobs(visibleJobs); // Deleted file records remain in Firestore but stay out of client-facing stats.
        setRecentJobs(visibleJobs.slice(0, 5)); // Show only 5 most recent visible jobs
      } catch (error) {
        console.error('Error loading jobs:', error);
      } finally {
        setJobsLoading(false);
      }
    };

    loadJobs();
  }, [user]);

  // Real transaction data now comes from CreditContext

  // Use wallet balance from context, with userData fallback while loading
  const walletBalance = walletLoading ? (userData?.walletBalance || 0) : contextWalletBalance;

  // Get active packages
  const activePackages = packages.filter(pkg => pkg.active);
  type BalancePackage = {
    type: 'ai' | 'hybrid' | 'human';
    minutesTotal: number;
    minutesUsed: number;
    minutesRemaining: number;
    active: boolean;
  };
  const storedActivePackages = ((userData?.packages || activePackages) as BalancePackage[])
    .filter(pkg => pkg.active && pkg.minutesRemaining > 0);
  const packageBalances = (['ai', 'hybrid', 'human'] as const)
    .map(type => {
      const matchingPackages = storedActivePackages.filter(pkg => pkg.type === type);
      return {
        type,
        purchased: matchingPackages.reduce((sum, pkg) => sum + pkg.minutesTotal, 0),
        used: matchingPackages.reduce((sum, pkg) => sum + pkg.minutesUsed, 0),
        remaining: matchingPackages.reduce((sum, pkg) => sum + pkg.minutesRemaining, 0),
      };
    })
    .filter(balance => balance.purchased > 0);

  const packageTypeLabel = (type: 'ai' | 'hybrid' | 'human') => ({
    ai: 'AI Transcription Package',
    hybrid: 'Hybrid Review Package',
    human: 'Human Transcription Package',
  })[type];

  // Calculate real average turnaround time from user's completed jobs
  const calculateAvgTurnaround = (jobs: TranscriptionJob[]) => {
    const completedJobs = jobs.filter(j => 
      j.status === 'complete' && 
      j.createdAt && 
      j.completedAt
    );
    
    if (completedJobs.length === 0) {
      return '2.5hrs'; // Default fallback
    }
    
    const totalProcessingTime = completedJobs.reduce((sum, job) => {
      // Handle different date formats safely
      let startTime: Date, endTime: Date;
      
      if (job.createdAt instanceof Timestamp) {
        startTime = job.createdAt.toDate();
      } else if (job.createdAt instanceof Date) {
        startTime = job.createdAt;
      } else {
        startTime = new Date(job.createdAt as unknown as number);
      }
      
      if (job.completedAt instanceof Timestamp) {
        endTime = job.completedAt.toDate();
      } else if (job.completedAt instanceof Date) {
        endTime = job.completedAt;
      } else {
        endTime = new Date(job.completedAt as unknown as number);
      }
      
      const processingTimeMs = endTime.getTime() - startTime.getTime();
      return sum + processingTimeMs;
    }, 0);

    const avgMs = totalProcessingTime / completedJobs.length;
    const avgMinutes = avgMs / (1000 * 60);
    const avgHours = avgMinutes / 60;

    // Format based on duration
    if (avgMinutes < 60) {
      return `${Math.round(avgMinutes)}min`;
    } else if (avgHours < 24) {
      const hours = Math.floor(avgHours);
      const minutes = Math.round((avgHours - hours) * 60);
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    } else {
      const days = Math.floor(avgHours / 24);
      const hours = Math.round(avgHours % 24);
      return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
    }
  };

  // Separate transcription and office studio jobs
  const transcriptionJobs = recentJobs.filter(
    job => !isRetentionDeleted(job) && (job.type !== 'office' ||
      (job.mode === 'human' && Boolean(job.officeCompletedDocumentPath))
    )
  );

  const officeJobs = recentJobs.filter(
    job => !isRetentionDeleted(job) && job.type === 'office' &&
      !(job.mode === 'human' && Boolean(job.officeCompletedDocumentPath))
  );

  const isCompletedTranscriptionJob = (job: TranscriptionJob) =>
    job.status === 'complete' ||
    (Boolean(job.finishedTranscriptPath || job.officeCompletedDocumentPath) &&
      (job.mode === 'human' || job.mode === 'hybrid'));

  const isCompletedOfficeJob = (job: TranscriptionJob) =>
    job.status === 'complete' || Boolean(job.officeCompletedDocumentPath || job.officeCompletedDocumentURL);

  const stats = {
    totalJobs: allJobs.length,
    completedJobs: allJobs.filter(j => j.type === 'office' ? isCompletedOfficeJob(j) : isCompletedTranscriptionJob(j)).length,
    spentThisMonth: allJobs.reduce((s, j) => s + ((j.creditsUsed || 0) / 100), 0), // Convert credits to CAD (100 credits = $1)
    avgTurnaroundTime: calculateAvgTurnaround(allJobs)
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#003366] mb-2">
            Welcome back, {userData?.name || user?.email?.split('@')[0] || 'User'}!
          </h1>
          <p className="text-gray-600">
            Here&apos;s an overview of your transcription activity and account status.
          </p>
        </div>

        {(packageBalances.length > 0 || freeTrialTotal > 0) && (
          <Card className="border border-[#b29dd9] shadow-sm mb-6">
            <CardHeader>
              <CardTitle className="text-xl text-[#003366] flex items-center gap-2">
                <Package className="h-5 w-5" />
                Your transcription balance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {packageBalances.map(balance => (
                  <div key={balance.type} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-[#003366] mb-3">{packageTypeLabel(balance.type)}</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4"><dt className="text-gray-600">Purchased</dt><dd className="font-medium">{balance.purchased} minutes</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-gray-600">Used</dt><dd className="font-medium">{balance.used} minutes</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-gray-600">Remaining</dt><dd className="font-bold text-[#003366]">{balance.remaining} minutes</dd></div>
                    </dl>
                  </div>
                ))}
                {freeTrialTotal > 0 && (
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-[#003366] mb-3">AI trial minutes</h3>
                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-4"><dt className="text-gray-600">Allowance</dt><dd className="font-medium">{freeTrialTotal} minutes</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-gray-600">Used</dt><dd className="font-medium">{freeTrialUsed} minutes</dd></div>
                      <div className="flex justify-between gap-4"><dt className="text-gray-600">Remaining</dt><dd className="font-bold text-[#003366]">{freeTrialMinutes} minutes</dd></div>
                    </dl>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-600 mt-4">
                Your package minutes are used when you submit a transcription. Minutes from refunded or cancelled projects are returned to your available balance.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Legacy Subscription Status (kept for backward compatibility) */}
        {!activePackages.length && userData?.subscriptionStatus === 'active' &&
         ((userData.includedMinutesPerMonth || 0) - (userData.minutesUsedThisMonth || 0)) > 0 ? (
          <Card className="border-0 shadow-sm mb-6 bg-gradient-to-r from-[#003366] to-[#004488]">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-white">
                <div>
                  <p className="text-sm font-medium text-white/80">Active Plan</p>
                  <p className="text-xl font-bold capitalize">
                    {userData.subscriptionPlan?.replace('-', ' ')}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80">Minutes Remaining</p>
                  <p className="text-xl font-bold">
                    {Math.max(0, (userData.includedMinutesPerMonth || 0) - (userData.minutesUsedThisMonth || 0))} / {userData.includedMinutesPerMonth || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80">Billing Cycle Ends</p>
                  <p className="text-xl font-bold">
                    {userData.currentPeriodEnd
                      ? new Date(userData.currentPeriodEnd.toMillis()).toLocaleDateString()
                      : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : userData?.trialMinutesRemaining && userData.trialMinutesRemaining > 0 ? (
          <Card className="border-0 shadow-sm mb-6 bg-gradient-to-r from-green-500 to-green-600">
            <CardContent className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-white">
                <div>
                  <p className="text-sm font-medium text-white/80">Free Trial</p>
                  <p className="text-xl font-bold">
                    {userData.trialMinutesRemaining} Minutes Remaining
                  </p>
                </div>
                <div className="flex items-center">
                  <Button
                    asChild
                    variant="secondary"
                    className="bg-white text-green-600 hover:bg-white/90"
                  >
                    <Link href="/billing">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Subscribe Now
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Quick Stats */}
        <div className={`grid grid-cols-1 sm:grid-cols-2 ${walletBalance > 0 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'} gap-4 md:gap-6 mb-8`}>
          {walletBalance > 0 && <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Account credit</p>
                  <p className="text-2xl font-bold text-[#003366]">CA${walletBalance.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-[#b29dd9] rounded-lg flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>}

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                  <p className="text-2xl font-bold text-[#003366]">{stats.totalJobs}</p>
                </div>
                <div className="w-12 h-12 bg-[#003366] rounded-lg flex items-center justify-center">
                  <FileText className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-[#003366]">{stats.completedJobs}</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg. Turnaround</p>
                  <p className="text-2xl font-bold text-[#003366]">{stats.avgTurnaroundTime}</p>
                </div>
                <div className="w-12 h-12 bg-[#2c3e50] rounded-lg flex items-center justify-center">
                  <Clock className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-[#003366]">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  asChild
                  className="w-full bg-[#003366] hover:bg-[#002244] text-white"
                >
                  <Link href="/upload">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload New File
                  </Link>
                </Button>

                <Button
                  asChild
                  className="w-full bg-white border border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white shadow-sm"
                >
                  <Link href="/office/upload">
                    <FileText className="mr-2 h-4 w-4" />
                    Document Workspace
                  </Link>
                </Button>
                
                <Button
                  asChild
                  className="w-full bg-white border border-[#b29dd9] text-[#003366] hover:bg-[#b29dd9] hover:text-white shadow-sm"
                >
                  <Link href="/billing">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Add Funds
                  </Link>
                </Button>

                {/* Credit Balance Alert */}
                {walletBalance > 0 && walletBalance < 100 && (
                  <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-yellow-800">
                          Low Credit Balance
                        </p>
                        <p className="text-sm text-yellow-700 mt-1">
                          Your wallet balance is low (CA${walletBalance}). Consider adding funds or purchasing a package to avoid interruptions.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent Jobs */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="flex flex-row items-start justify-between">
                <CardTitle className="text-lg font-semibold text-[#003366]">
                  My Projects
                  <p className="text-sm font-normal text-gray-500 mt-1">
                    Access your active and completed transcription projects
                  </p>
                </CardTitle>
                <Button 
                  size="sm" 
                  asChild
                  className="bg-transparent text-[#b29dd9] hover:text-[#9d87c7] hover:bg-gray-100"
                >
                  <Link href="/transcriptions">
                    View All
                  </Link>
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-sm text-blue-900">
                    Completed files are active for 30 days, archived after 30 days, and may be deleted after 90 days unless a retention hold applies.
                  </div>

                  {jobsLoading && (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366] mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading recent jobs...</p>
                    </div>
                  )}
                  
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                        Active Projects
                        </h3>
                    </div>

                  {!jobsLoading &&
                    transcriptionJobs
                    .filter((job) => !isCompletedTranscriptionJob(job))
                    .map((job) => (
                      
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-5 bg-white border border-gray-200 rounded-xl hover:border-[#003366] hover:shadow-sm transition-all"
                    >
                      <div className="flex-1">
                        <div className="flex items-center flex-wrap gap-2 mb-2">
                          <h3 className="text-base font-semibold text-[#003366] truncate">
                            {job.originalFilename}
                          </h3>
                          <StatusBadge status={job.status} />
                        </div>
                        <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                          <span>
                            {job.mode === 'ai' ? 'AI Transcription' :
                             job.mode === 'hybrid' ? 'Hybrid Review' :
                             job.mode === 'human' ? 'Human Transcription' : job.mode}
                          </span>
                          <span>{Math.ceil(job.duration / 60)} min</span>

                          <span>
                            {new Date(job.createdAt).toLocaleDateString()}
                          </span>
                          
                          <span className="text-[#003366] font-medium">CA${((job.creditsUsed || 0) / 100).toFixed(2)}</span>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {job.status === 'complete' && (
                          <Button
                            size="sm"
                            asChild
                            className="bg-white border border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white shadow-sm"
                          >
                            <Link href={`/transcript/${job.id}`}>
                              Open Workspace
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                      <div className="pt-2 border-t border-gray-100">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                          Completed Projects
                        </h3>
                      </div>

                      {!jobsLoading &&
                        transcriptionJobs
                          .filter((job) => isCompletedTranscriptionJob(job))
                          .map((job) => (
                            
                          <div
                            key={job.id}
                            className="flex items-center justify-between p-5 bg-white border border-gray-200 rounded-xl hover:border-[#003366] hover:shadow-sm transition-all"
                          >
                            <div className="flex-1">
                              <div className="flex items-center flex-wrap gap-2 mb-2">
                                <h3 className="text-base font-semibold text-[#003366] truncate">
                                 {job.originalFilename}
                                </h3>
                                
                                <StatusBadge status={isCompletedTranscriptionJob(job) ? 'complete' : job.status} />
                              </div>
                                 
                              <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                                <span>
                                  {job.mode === 'ai'
                                    ? 'AI Transcription'
                                    : job.mode === 'hybrid'
                                    ? 'Hybrid Review'
                                    : job.mode === 'human'
                                    ? 'Human Transcription'
                                    : job.mode}
                                </span>
                                    
                                <span>{Math.ceil(job.duration / 60)} min</span>
                                    
                                <span className="text-[#003366] font-medium">
                                  CA${((job.creditsUsed || 0) / 100).toFixed(2)}
                                </span>
                                {(job.finishedTranscriptPath || job.officeCompletedDocumentPath) && !isRetentionDeleted(job) && (
                                  <span className="font-semibold text-green-700">
                                    {job.completedFiles?.find(file => file.isLatest)?.label || 'Finished transcript ready'}
                                    {job.completedFiles?.length ? ' · Latest version' : ''}
                                  </span>
                                )}
                                {formatRetentionLabel(job) && (
                                  <span className={isRetentionDeleted(job) ? 'text-red-600 font-medium' : 'text-gray-500'}>
                                    {formatRetentionLabel(job)}
                                  </span>
                                )}
                              </div>
                            </div>
                                
                            <div className="flex items-center space-x-2">
                              {(job.finishedTranscriptPath || job.officeCompletedDocumentPath) && !isRetentionDeleted(job) ? (
                                <Button
                                  size="sm"
                                  asChild
                                  className="bg-[#003366] text-white hover:bg-[#004080] shadow-sm"
                                >
                                  <a href={job.officeCompletedDocumentPath
                                    ? `/api/document-workspace/${job.id}/completed-document`
                                    : `/api/transcripts/${job.id}/finished-transcript`}>
                                    Download Finished Transcript
                                  </a>
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  asChild
                                  className="bg-white border border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white shadow-sm"
                                >
                                  <Link href={`/transcript/${job.id}`}>
                                    Open Workspace
                                  </Link>
                                </Button>
                              )}
                            </div>
                          </div>
                  ))}
                        
                  {!jobsLoading && transcriptionJobs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">No transcriptions yet</p>
                      <p className="text-sm">Upload your first audio or video file to get started!</p>
                    </div>
                  )}

                  {/* Document Workspace Projects Section */}
                  <div className="pt-2 border-t border-gray-100 mt-6">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                      Document Workspace Projects
                    </h3>
                  </div>

                  {!jobsLoading &&
                    officeJobs.map((job) => (
                      <div
                        key={job.id}
                        className="flex items-center justify-between p-5 bg-white border border-gray-200 rounded-xl hover:border-[#003366] hover:shadow-sm transition-all"
                      >
                        <div className="flex-1">
                          <div className="flex items-center flex-wrap gap-2 mb-2">
                            <h3 className="text-base font-semibold text-[#003366] truncate">
                              {job.originalFilename}
                            </h3>
                            <StatusBadge status={isCompletedOfficeJob(job) ? 'complete' : job.status} />
                            {isCompletedOfficeJob(job) && (job.officeCompletedDocumentPath || job.officeCompletedDocumentURL) && !isRetentionDeleted(job) && (
                              <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                                {job.completedFiles?.find(file => file.isLatest)?.label || (job.mode === 'human' ? 'Finished transcript ready' : 'Completed work ready')}
                                {job.completedFiles?.length ? ' · Latest version' : ''}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
                            <span>{getOfficeServiceLabel(job.officeServiceType)}</span>
                            {job.hasVoiceInstructions && (
                              <span className="text-indigo-700">Voice instructions included</span>
                            )}
                            <span>{Math.ceil(job.duration / 60)} min</span>
                            <span>
                              {new Date(job.createdAt).toLocaleDateString()}
                            </span>
                            <span className="text-[#003366] font-medium">CA${((job.creditsUsed || 0) / 100).toFixed(2)}</span>
                            {formatRetentionLabel(job) && (
                              <span className={isRetentionDeleted(job) ? 'text-red-600 font-medium' : 'text-gray-500'}>
                                {formatRetentionLabel(job)}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            asChild
                            className="bg-white border border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white shadow-sm"
                          >
                            <Link href={`/document-workspace/${job.id}`}>
                              Open Project
                            </Link>
                          </Button>
                          {isRetentionDeleted(job) && (job.officeCompletedDocumentPath || job.officeCompletedDocumentURL) && (
                            <span className="text-sm font-medium text-red-600">Files expired/deleted</span>
                          )}
                          {!isRetentionDeleted(job) && (job.officeCompletedDocumentPath || job.officeCompletedDocumentURL) && (
                            <Button
                              size="sm"
                              asChild
                              className="bg-green-50 border border-green-300 text-green-700 hover:bg-green-100 shadow-sm"
                            >
                              <a 
                                href={job.officeCompletedDocumentPath
                                  ? `/api/document-workspace/${job.id}/completed-document`
                                  : job.officeCompletedDocumentURL}
                                download={job.officeCompletedFilename || 'completed-document'}
                                {...(!job.officeCompletedDocumentPath ? {
                                  target: '_blank',
                                  rel: 'noopener noreferrer',
                                } : {})}
                              >
                                {job.mode === 'human' ? 'Download Finished Transcript' : 'Download Completed Work'}
                              </a>
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}

                  {!jobsLoading && officeJobs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">No Document Workspace projects yet</p>
                      <p className="text-sm">Start a new Document Workspace project to get started!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="mt-8">
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle className="text-lg font-semibold text-[#003366]">
                Recent Credit Activity
              </CardTitle>
              <Button 
                size="sm" 
                asChild
                className="bg-transparent text-[#b29dd9] hover:text-[#9d87c7] hover:bg-gray-100"
              >
                <Link href="/billing">
                  View All
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-[#003366]">
                        {transaction.description}
                      </p>
                      <p className="text-sm text-gray-600">
                        {transaction.createdAt?.toISOString?.()?.slice(0, 10) || 'Unknown date'}
                      </p>
                    </div>
                    <div className={`font-medium ${
                      transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.amount > 0 ? '+' : ''}CA${Math.abs(transaction.amount).toFixed(2)}
                    </div>
                  </div>
                ))}
                
                {transactions.length === 0 && (
                  <p className="text-gray-500 text-center py-8">
                    No transaction history yet. Add funds or purchase a package to get started!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Footer />
    </div>
  );
}
