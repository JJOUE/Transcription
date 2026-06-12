"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Users, FileText, TrendingUp, Clock, Package, Wallet, ArrowRight, RefreshCw, BarChart3, Eye, Globe, Timer } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { WorkQueueCard } from '@/components/admin/WorkQueueCard';
import { useAuth } from '@/contexts/AuthContext';
import { useCredits } from '@/contexts/CreditContext';
import { usePackages } from '@/contexts/PackageContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TranscriptionJob } from '@/lib/firebase/transcriptions';
import { collection, getDocs, query, orderBy, getFirestore, where, doc, getDoc } from 'firebase/firestore';

type AdminStatsJob = {
  id?: string;
  status?: string;
  rushDelivery?: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
  completedAt: Date | null;
  isArchived?: boolean;
};

type AdminPackageSummary = {
  id?: string;
  active?: boolean;
};

export default function AdminPage() {
  const { userData, loading: authLoading } = useAuth();
  const { getAllUsers, getAllTransactions } = useCredits();
  const { packages } = usePackages();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    activeJobs: 0,
    queuedJobs: 0,
    processingJobs: 0,
    pendingReviewJobs: 0,
    failedJobs: 0,
    rushJobs: 0,
    totalRevenue: 0,
    avgProcessingTime: '2.5hrs',
    totalWalletBalance: 0,
    totalPackagesSold: 0,
    activePackages: 0,
    totalWalletTopups: 0
  });
  
  // Analytics state
  const [analytics, setAnalytics] = useState<{
    configured: boolean;
    today: { activeUsers: number; pageViews: number; sessions: number };
    week: { totalUsers: number; pageViews: number; sessions: number; avgSessionDuration: string };
    topPages: { path: string; views: number }[];
  } | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Pending jobs for "Your Work" section
  const [pendingJobs, setPendingJobs] = useState<TranscriptionJob[]>([]);
  const [pendingJobsLoading, setPendingJobsLoading] = useState(true);
  const [userEmails, setUserEmails] = useState<{[key: string]: string}>({});

  // Filter state for admin queue
  const [queueFilter, setQueueFilter] = useState<'all' | 'transcription' | 'office'>('all');
  const [officeStatusFilter, setOfficeStatusFilter] = useState<'all' | 'submitted' | 'assigned' | 'in_progress' | 'waiting_review' | 'completed' | 'delivered'>('all');

  // Load GA4 analytics
  const loadAnalytics = useCallback(async () => {
    if (userData?.role !== 'admin') return;
    setAnalyticsLoading(true);
    try {
      const response = await fetch('/api/admin/analytics');
      if (response.ok) {
        const data = await response.json();
        if (data.configured) {
          setAnalytics(data);
        } else {
          setAnalytics(null);
        }
      } else {
        setAnalytics(null);
      }
    } catch {
      setAnalytics(null);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [userData]);

  // Load pending jobs for "Your Work" section
  const loadPendingJobs = useCallback(async () => {
    if (userData?.role !== 'admin') return;

    setPendingJobsLoading(true);
    try {
      const db = getFirestore();
      const transcriptionsRef = collection(db, 'transcriptions');

      // Only fetch jobs with statuses that could need admin action
      const actionableStatuses = ['pending-review', 'under-review', 'pending-transcription', 'processing', 'failed', 'queued'];
      const allJobsQuery = query(
        transcriptionsRef,
        where('status', 'in', actionableStatuses),
        orderBy('createdAt', 'desc')
      );

      const snapshot = await getDocs(allJobsQuery);
      const allJobs = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as TranscriptionJob));

      // Filter for jobs needing admin action (matches queue page logic)
      const actionableJobs = allJobs.filter(job => {
        if (job.isArchived) return false;

        const isStuckProcessing = job.status === 'processing' && !job.speechmaticsJobId;
        return (
          // Document Workspace jobs (except completed/cancelled)
          (job.type === 'office' && !['complete', 'cancelled'].includes(job.status)) ||
          // Human mode jobs (except completed/cancelled)
          (job.mode === 'human' && !['complete', 'cancelled'].includes(job.status)) ||
          // Hybrid mode jobs needing review
          (job.mode === 'hybrid' && ['pending-review', 'under-review'].includes(job.status)) ||
          // Failed jobs that might need retry
          ((job.mode === 'ai' || job.mode === 'hybrid') && job.status === 'failed') ||
          // Stuck processing jobs
          isStuckProcessing
        );
      });

      // Sort: rush first, then oldest first
      actionableJobs.sort((a, b) => {
        if (a.rushDelivery && !b.rushDelivery) return -1;
        if (!a.rushDelivery && b.rushDelivery) return 1;
        // Compare timestamps - older first
        const aTime = a.createdAt?.toMillis?.() || 0;
        const bTime = b.createdAt?.toMillis?.() || 0;
        return aTime - bTime;
      });

      // Limit to 10 jobs on dashboard
      const limitedJobs = actionableJobs.slice(0, 10);
      setPendingJobs(limitedJobs);

      // Fetch user emails for these jobs in parallel
      const uniqueUserIds = [...new Set(limitedJobs.map(j => j.userId).filter(Boolean))];
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
      console.error('Error loading pending jobs:', error);
    } finally {
      setPendingJobsLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    // Check if user is admin
    if (!authLoading && userData?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    const loadAdminData = async () => {
      if (userData?.role !== 'admin') return;

      try {
        setLoading(true);

        const db = getFirestore();

        // Run all 4 queries in parallel
        const [users, snapshot, allTransactions, packagesSnapshot] = await Promise.all([
          getAllUsers(),
          getDocs(query(
            collection(db, 'transcriptions'),
            orderBy('createdAt', 'desc')
          )),
          getAllTransactions(),
          getDocs(query(collection(db, 'packages'))),
        ]);

        // Safe date conversion helper
        const convertToDate = (timestamp: unknown) => {
          if (!timestamp) return null;
          if (typeof (timestamp as { toDate?: () => Date }).toDate === 'function') {
            return (timestamp as { toDate: () => Date }).toDate();
          }
          if (timestamp instanceof Date) {
            return timestamp;
          }
          return new Date(timestamp as string | number);
        };

        const jobs = snapshot.docs.map((docSnap): AdminStatsJob => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            createdAt: convertToDate(data.createdAt),
            updatedAt: convertToDate(data.updatedAt),
            completedAt: convertToDate(data.completedAt)
          };
        }).filter(job => !job.isArchived);

        // Calculate system statistics
        const queuedJobs = jobs.filter(j => j.status === 'queued').length;
        const processingJobs = jobs.filter(j => j.status === 'processing').length;
        const pendingReviewJobs = jobs.filter(j =>
          j.status === 'pending-review' || j.status === 'under-review'
                                             ).length;
        const failedJobs = jobs.filter(j => j.status === 'failed').length;
        const rushJobs = jobs.filter(j => j.rushDelivery === true).length;
        
        const activeJobs = queuedJobs + processingJobs;
        
        const walletTopups = allTransactions.filter(t =>
          t.type === 'wallet_topup' || t.type === 'purchase'
        );
        const packagePurchases = allTransactions.filter(t =>
          t.type === 'package_purchase'
        );

        const totalWalletTopups = walletTopups.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalPackageRevenue = packagePurchases.reduce((sum, t) => sum + Math.abs(t.amount), 0);
        const totalRevenue = totalWalletTopups + totalPackageRevenue;

        const totalWalletBalance = users.reduce((sum, user) => {
          const wallet = user.walletBalance || 0;
          return sum + wallet;
        }, 0);

        const allPackages: AdminPackageSummary[] = packagesSnapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        }));
        const activePackagesCount = allPackages.filter(p => p.active).length;
        const totalPackagesSold = packagePurchases.length;

        // Calculate actual processing times from completed jobs
        const completedJobs = jobs.filter(j => j.status === 'complete' && j.createdAt && j.completedAt);
        let avgProcessingTime = '2.5hrs';

        if (completedJobs.length > 0) {
          const totalProcessingTime = completedJobs.reduce((sum, job) => {
            const startTime = job.createdAt;
            const endTime = job.completedAt;
            if (startTime && endTime) {
              return sum + (endTime.getTime() - startTime.getTime());
            }
            return sum;
          }, 0);

          const avgMilliseconds = totalProcessingTime / completedJobs.length;
          const avgMinutes = avgMilliseconds / (1000 * 60);
          const avgHours = avgMinutes / 60;

          if (avgMinutes < 60) {
            avgProcessingTime = `${Math.round(avgMinutes)}min`;
          } else if (avgHours < 24) {
            const hours = Math.floor(avgHours);
            const minutes = Math.round((avgHours - hours) * 60);
            avgProcessingTime = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
          } else {
            const days = Math.floor(avgHours / 24);
            const hours = Math.round(avgHours % 24);
            avgProcessingTime = hours > 0 ? `${days}d ${hours}h` : `${days}d`;
          }
        }

       setSystemStats({
         totalUsers: users.length,
         activeJobs,
         queuedJobs,
         processingJobs,
         pendingReviewJobs,
         failedJobs,
         rushJobs,
         totalRevenue,
         avgProcessingTime,
         totalWalletBalance,
         totalPackagesSold,
         activePackages: activePackagesCount,
         totalWalletTopups
       });
        
      } catch (error) {
        console.error('Error loading admin data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadAdminData();
      loadPendingJobs();
      loadAnalytics();
    }
  }, [userData, authLoading, router, loadPendingJobs, loadAnalytics]);

  // Prevent SSR hydration issues
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (userData?.role !== 'admin') {
    return null;
  }

  // Filter pending jobs by type
  const transcriptionJobs = pendingJobs.filter(
    job => job.type !== 'office'
  );

  const officeJobs = pendingJobs.filter(
    job => job.type === 'office'
  );

  // Get displayed jobs based on filter
  const displayedJobs = 
    queueFilter === 'transcription' 
      ? transcriptionJobs 
      : queueFilter === 'office' 
      ? officeStatusFilter === 'all'
        ? officeJobs
        : officeJobs.filter(job => job.officeStatus === officeStatusFilter)
      : pendingJobs;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-[#003366] mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600">
            Overview of system activity and key metrics.
          </p>
        </div>

        {/* Key Metrics - Row 1 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Users</p>
                  <p className="text-2xl font-bold text-[#003366]">{systemStats.totalUsers.toLocaleString()}</p>
                </div>
                <div className="w-12 h-12 bg-[#b29dd9] rounded-lg flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>                
    
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Packages</p>
                  <p className="text-2xl font-bold text-[#003366]">{systemStats.activePackages}</p>
                  <p className="text-xs text-gray-500 mt-1">{systemStats.totalPackagesSold} sold</p>
                </div>
                <div className="w-12 h-12 bg-[#b29dd9] rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Wallet Balance</p>
                  <p className="text-2xl font-bold text-[#003366]">CA${systemStats.totalWalletBalance.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">All users</p>
                </div>
                <div className="w-12 h-12 bg-green-500 rounded-lg flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                  <p className="text-2xl font-bold text-[#003366]">CA${systemStats.totalRevenue.toFixed(2)}</p>
                  <p className="text-xs text-gray-500 mt-1">Topups: CA${systemStats.totalWalletTopups.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Metrics - Row 2 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Jobs</p>
                  <p className="text-2xl font-bold text-[#003366]">
                    {systemStats.activeJobs}
                  </p>
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
              <p className="text-sm font-medium text-gray-600">Queued Jobs</p>
              <p className="text-2xl font-bold text-[#003366]">
                {systemStats.queuedJobs}
              </p>
            </div>
            <div className="w-12 h-12 bg-yellow-500 rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
          
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-[#003366]">
                {systemStats.pendingReviewJobs}
              </p>
            </div>
            <div className="w-12 h-12 bg-orange-500 rounded-lg flex items-center justify-center">
              <Eye className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
          
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Failed Jobs</p>
              <p className="text-2xl font-bold text-red-600">
                {systemStats.failedJobs}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-500 rounded-lg flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rush Jobs</p>
              <p className="text-2xl font-bold text-[#003366]">
                {systemStats.rushJobs}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
              <Timer className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
          
      <Card className="border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg. Processing</p>
              <p className="text-2xl font-bold text-[#003366]">
                {systemStats.avgProcessingTime}
              </p>
            </div>
            <div className="w-12 h-12 bg-[#2c3e50] rounded-lg flex items-center justify-center">
              <Clock className="h-6 w-6 text-white" />
            </div>
          </div>
        </CardContent>
      </Card>
          
  <Link href="/admin/packages">
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-gradient-to-br from-[#b29dd9] to-[#9d87c7]">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/90">Manage Packages</p>
            <p className="text-lg font-bold text-white">Package Settings</p>
            <p className="text-xs text-white/80 mt-1">
              Configure pricing & minutes
            </p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
            <ArrowRight className="h-6 w-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </Link>

</div>
              
      {systemStats.failedJobs > 0 && (
      <Card className="border-2 border-red-300 bg-red-50 mb-6">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="font-semibold text-red-700">
              ⚠ Failed Jobs Require Attention
            </p>
            <p className="text-sm text-red-600">
              {systemStats.failedJobs} transcription job(s) failed and may need retry or review.
            </p>
          </div>
          
          <Link href="/admin/queue">
            <Button className="bg-red-600 hover:bg-red-700 text-white">
              View Failed Jobs
            </Button>
          </Link>
        </CardContent>
      </Card>
    )}
        {/* Site Analytics */}
        {!analyticsLoading && analytics && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-5 w-5 text-[#003366]" />
              <h2 className="text-lg font-semibold text-[#003366]">Site Analytics</h2>
              <span className="text-xs text-gray-500 ml-auto">Powered by Google Analytics</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Visitors Today</p>
                      <p className="text-2xl font-bold text-[#003366]">{analytics.today.activeUsers.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Eye className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Page Views Today</p>
                      <p className="text-2xl font-bold text-[#003366]">{analytics.today.pageViews.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
                      <FileText className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Visitors This Week</p>
                      <p className="text-2xl font-bold text-[#003366]">{analytics.week.totalUsers.toLocaleString()}</p>
                      <p className="text-xs text-gray-500 mt-1">{analytics.week.sessions.toLocaleString()} sessions</p>
                    </div>
                    <div className="w-12 h-12 bg-cyan-500 rounded-lg flex items-center justify-center">
                      <Globe className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg. Session Duration</p>
                      <p className="text-2xl font-bold text-[#003366]">{analytics.week.avgSessionDuration}</p>
                    </div>
                    <div className="w-12 h-12 bg-amber-500 rounded-lg flex items-center justify-center">
                      <Timer className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Pages */}
            {analytics.topPages.length > 0 && (
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Pages (Last 7 Days)</h3>
                  <div className="space-y-2">
                    {analytics.topPages.map((page, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 font-mono text-xs truncate max-w-[70%]">{page.path}</span>
                        <span className="text-gray-500 font-medium">{page.views.toLocaleString()} views</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Queue Filter Buttons */}
        <div className="mb-6 flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-600">Filter:</span>
          </div>
          <Button
            onClick={() => setQueueFilter('all')}
            variant={queueFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            className={queueFilter === 'all' ? 'bg-[#003366] hover:bg-[#004080]' : ''}
          >
            All Jobs {pendingJobs.length > 0 && `(${pendingJobs.length})`}
          </Button>
          <Button
            onClick={() => setQueueFilter('transcription')}
            variant={queueFilter === 'transcription' ? 'default' : 'outline'}
            size="sm"
            className={queueFilter === 'transcription' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
          >
            Transcription {transcriptionJobs.length > 0 && `(${transcriptionJobs.length})`}
          </Button>
          <Button
            onClick={() => {
              setQueueFilter('office');
              setOfficeStatusFilter('all');
            }}
            variant={queueFilter === 'office' ? 'default' : 'outline'}
            size="sm"
            className={queueFilter === 'office' ? 'bg-[#b29dd9] hover:bg-[#9d87c7]' : ''}
          >
            Document Workspace {officeJobs.length > 0 && `(${officeJobs.length})`}
          </Button>
        </div>

        {/* Office Status Filters - Only show when Office filter is selected */}
        {queueFilter === 'office' && (
          <div className="mb-6 flex flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Office Status:</span>
            </div>
            <Button
              onClick={() => setOfficeStatusFilter('all')}
              variant={officeStatusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              className={officeStatusFilter === 'all' ? 'bg-[#b29dd9] text-white hover:bg-[#9d87c7]' : ''}
            >
              All
            </Button>
            <Button
              onClick={() => setOfficeStatusFilter('submitted')}
              variant={officeStatusFilter === 'submitted' ? 'default' : 'outline'}
              size="sm"
              className={officeStatusFilter === 'submitted' ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
            >
              📨 Submitted {officeJobs.filter(j => j.officeStatus === 'submitted').length > 0 && `(${officeJobs.filter(j => j.officeStatus === 'submitted').length})`}
            </Button>
            <Button
              onClick={() => setOfficeStatusFilter('assigned')}
              variant={officeStatusFilter === 'assigned' ? 'default' : 'outline'}
              size="sm"
              className={officeStatusFilter === 'assigned' ? 'bg-cyan-600 text-white hover:bg-cyan-700' : ''}
            >
              👤 Assigned {officeJobs.filter(j => j.officeStatus === 'assigned').length > 0 && `(${officeJobs.filter(j => j.officeStatus === 'assigned').length})`}
            </Button>
            <Button
              onClick={() => setOfficeStatusFilter('in_progress')}
              variant={officeStatusFilter === 'in_progress' ? 'default' : 'outline'}
              size="sm"
              className={officeStatusFilter === 'in_progress' ? 'bg-yellow-600 text-white hover:bg-yellow-700' : ''}
            >
              ⚙️ In Progress {officeJobs.filter(j => j.officeStatus === 'in_progress').length > 0 && `(${officeJobs.filter(j => j.officeStatus === 'in_progress').length})`}
            </Button>
            <Button
              onClick={() => setOfficeStatusFilter('waiting_review')}
              variant={officeStatusFilter === 'waiting_review' ? 'default' : 'outline'}
              size="sm"
              className={officeStatusFilter === 'waiting_review' ? 'bg-orange-600 text-white hover:bg-orange-700' : ''}
            >
              👀 Waiting Review {officeJobs.filter(j => j.officeStatus === 'waiting_review').length > 0 && `(${officeJobs.filter(j => j.officeStatus === 'waiting_review').length})`}
            </Button>
            <Button
              onClick={() => setOfficeStatusFilter('completed')}
              variant={officeStatusFilter === 'completed' ? 'default' : 'outline'}
              size="sm"
              className={officeStatusFilter === 'completed' ? 'bg-green-600 text-white hover:bg-green-700' : ''}
            >
              ✅ Completed {officeJobs.filter(j => j.officeStatus === 'completed').length > 0 && `(${officeJobs.filter(j => j.officeStatus === 'completed').length})`}
            </Button>
            <Button
              onClick={() => setOfficeStatusFilter('delivered')}
              variant={officeStatusFilter === 'delivered' ? 'default' : 'outline'}
              size="sm"
              className={officeStatusFilter === 'delivered' ? 'bg-purple-600 text-white hover:bg-purple-700' : ''}
            >
              📦 Delivered {officeJobs.filter(j => j.officeStatus === 'delivered').length > 0 && `(${officeJobs.filter(j => j.officeStatus === 'delivered').length})`}
            </Button>
          </div>
        )}

        {/* Your Work - Pending Jobs */}
        <Card className="border-2 border-[#b29dd9] shadow-md">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl font-semibold text-[#003366] flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {queueFilter === 'transcription' 
                    ? 'Transcription Jobs Needing Admin Action' 
                    : queueFilter === 'office' 
                    ? 'Document Workspace Projects Needing Admin Action' 
                    : 'Jobs Needing Admin Action'}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {queueFilter === 'transcription'
                    ? 'AI, hybrid, and human transcription jobs requiring review, processing, or retry'
                    : queueFilter === 'office'
                    ? 'Document Workspace projects needing admin attention'
                    : 'Human review, failed jobs, rush jobs, and items requiring admin attention'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={loadPendingJobs}
                  disabled={pendingJobsLoading}
                  variant="outline"
                  size="sm"
                  className="flex items-center gap-1"
                >
                  <RefreshCw className={`h-4 w-4 ${pendingJobsLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <Link href="/admin/queue">
                  <Button variant="outline" size="sm" className="flex items-center gap-1">
                    View All
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pendingJobsLoading ? (
              <div className="flex items-center justify-center py-8">
                <LoadingSpinner size="md" />
                <span className="ml-2 text-gray-600">Loading pending jobs...</span>
              </div>
            ) : displayedJobs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">
                  {queueFilter === 'transcription'
                    ? 'No transcription jobs pending'
                    : queueFilter === 'office'
                    ? 'No Document Workspace projects in queue'
                    : 'No pending jobs'}
                </p>
                <p className="text-sm">
                  {queueFilter === 'transcription'
                    ? 'All transcription jobs are caught up!'
                    : queueFilter === 'office'
                    ? 'All Document Workspace projects are caught up!'
                    : "You're all caught up! Check back later for new work."}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayedJobs.map(job => (
                  <WorkQueueCard
                    key={job.id}
                    job={job}
                    userEmail={userEmails[job.userId]}
                    onComplete={loadPendingJobs}
                  />
                ))}
                {displayedJobs.length >= 10 && (
                  <div className="text-center pt-2">
                    <Link href="/admin/queue" className="text-sm text-[#003366] hover:underline">
                      View all jobs in queue →
                    </Link>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
