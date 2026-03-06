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
import { Timestamp } from 'firebase/firestore';


// Transaction interface now comes from CreditContext

export function UserDashboard() {
  const { user, userData } = useAuth();
  const { transactions } = useCredits();
  const {
    walletBalance: contextWalletBalance,
    packages,
    freeTrialMinutes,
    freeTrialActive,
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
        setAllJobs(jobs); // Store all jobs for stats
        setRecentJobs(jobs.slice(0, 5)); // Show only 5 most recent
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
  const totalPackageMinutes = activePackages.reduce((sum, pkg) => sum + pkg.minutesRemaining, 0);

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
        startTime = new Date(job.createdAt);
      }
      
      if (job.completedAt instanceof Timestamp) {
        endTime = job.completedAt.toDate();
      } else if (job.completedAt instanceof Date) {
        endTime = job.completedAt;
      } else {
        endTime = new Date(job.completedAt);
      }
      
      return sum + (endTime.getTime() - startTime.getTime());
    }, 0);
    
    const avgMilliseconds = totalProcessingTime / completedJobs.length;
    const avgMinutes = avgMilliseconds / (1000 * 60);
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

  const stats = {
    totalJobs: allJobs.length,
    completedJobs: allJobs.filter(j => j.status === 'complete').length,
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

        {/* FREE TRIAL Display - Prominent banner at top */}
        {freeTrialActive && freeTrialMinutes > 0 && (
          <Card className="border-2 border-[#b29dd9] shadow-lg mb-6 bg-gradient-to-r from-[#003366] to-[#004488]">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-4xl">🎉</span>
                    <div>
                      <h3 className="text-2xl font-bold text-white">
                        Free Trial Active!
                      </h3>
                      <p className="text-sm text-white/80 mt-1">
                        Use your free minutes for ANY transcription mode or add-ons
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
                      <p className="text-sm text-white/70 mb-1">Remaining</p>
                      <p className="text-3xl font-bold text-white">{freeTrialMinutes}</p>
                      <p className="text-xs text-green-400 font-semibold">FREE minutes</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
                      <p className="text-sm text-white/70 mb-1">Used</p>
                      <p className="text-3xl font-bold text-white">{freeTrialUsed}</p>
                      <p className="text-xs text-white/60">of {freeTrialTotal} minutes</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur rounded-lg p-4 border border-white/20">
                      <p className="text-sm text-white/70 mb-1">Savings</p>
                      <p className="text-3xl font-bold text-green-400">CA${(freeTrialMinutes * 2.5).toFixed(0)}</p>
                      <p className="text-xs text-white/60">value available</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-white/80 font-medium">Trial Progress</span>
                      <span className="text-sm text-white/80">{((freeTrialUsed / freeTrialTotal) * 100).toFixed(0)}% used</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3">
                      <div
                        className="bg-[#b29dd9] h-3 rounded-full transition-all"
                        style={{ width: `${(freeTrialUsed / freeTrialTotal) * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Link href="/upload">
                      <Button className="bg-white hover:bg-gray-100 text-[#003366] font-semibold shadow-md">
                        Start Free Transcription →
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Active Packages Display */}
        {activePackages.length > 0 && (
          <Card className="border-0 shadow-sm mb-6 bg-gradient-to-r from-[#003366] to-[#004488]">
            <CardContent className="p-6">
              <div className="text-white">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Active Packages
                  </h3>
                  <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
                    {totalPackageMinutes} total minutes available
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activePackages.map((pkg) => {
                    const daysRemaining = Math.ceil((new Date(pkg.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    const usagePercent = ((pkg.minutesUsed / pkg.minutesTotal) * 100).toFixed(0);

                    return (
                      <div key={pkg.id} className="bg-white/10 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium capitalize">{pkg.type} Package</span>
                          {daysRemaining <= 7 && (
                            <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded">
                              {daysRemaining}d left
                            </span>
                          )}
                        </div>
                        <div className="text-2xl font-bold mb-1">
                          {pkg.minutesRemaining} / {pkg.minutesTotal} min
                        </div>
                        <div className="text-xs text-white/70 mb-2">
                          CA${pkg.rate.toFixed(2)}/min • {usagePercent}% used
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-2">
                          <div
                            className="bg-[#b29dd9] h-2 rounded-full transition-all"
                            style={{ width: `${usagePercent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Wallet Balance</p>
                  <p className="text-2xl font-bold text-[#003366]">CA${walletBalance.toFixed(2)}</p>
                  <div className="space-y-0.5 mt-1">
                    {freeTrialActive && freeTrialMinutes > 0 && (
                      <p className="text-xs text-green-600 font-semibold">
                        🎉 + {freeTrialMinutes} FREE trial minutes
                      </p>
                    )}
                    {totalPackageMinutes > 0 && (
                      <p className="text-xs text-gray-500">
                        + {totalPackageMinutes} pkg minutes
                      </p>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 bg-[#b29dd9] rounded-lg flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

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
                  className="w-full bg-white border border-[#b29dd9] text-[#003366] hover:bg-[#b29dd9] hover:text-white shadow-sm"
                >
                  <Link href="/billing">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Add Funds
                  </Link>
                </Button>

                {/* Credit Balance Alert */}
                {walletBalance < 100 && (
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
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-semibold text-[#003366]">
                  Recent Jobs
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
                  {jobsLoading && (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#003366] mx-auto mb-4"></div>
                      <p className="text-gray-500">Loading recent jobs...</p>
                    </div>
                  )}
                  
                  {!jobsLoading && recentJobs.map((job) => (
                    <div
                      key={job.id}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-medium text-[#003366] truncate">
                            {job.originalFilename}
                          </h3>
                          <StatusBadge status={job.status} />
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <span>
                            {job.mode === 'ai' ? 'AI Transcription' :
                             job.mode === 'hybrid' ? 'Hybrid Review' :
                             job.mode === 'human' ? 'Human Transcription' : job.mode}
                          </span>
                          <span>{Math.ceil(job.duration / 60)} min</span>
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
                              View
                            </Link>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  {!jobsLoading && recentJobs.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-lg font-medium mb-2">No transcriptions yet</p>
                      <p className="text-sm">Upload your first audio or video file to get started!</p>
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
            <CardHeader className="flex flex-row items-center justify-between">
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
// Default export for Next.js pages compatibility
export default UserDashboard;
