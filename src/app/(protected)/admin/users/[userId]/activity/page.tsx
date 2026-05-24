"use client";

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, CreditCard, FileText, Clock, CheckCircle, Download, User, Wallet, TrendingUp, Calendar, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { collection, query, where, orderBy, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { getTranscriptionsByUser, TranscriptionJob } from '@/lib/firebase/transcriptions';
import { UserData } from '@/lib/firebase/auth';
import Link from 'next/link';

interface CreditTransaction {
  id: string;
  type: 'wallet_topup' | 'package_purchase' | 'transcription' | 'refund' | 'adjustment' | 'purchase' | 'consumption' | 'usage';
  amount: number;
  description: string;
  createdAt: any;
  jobId?: string;
  packageMinutes?: number;
}

interface UserPackage {
  id: string;
  type: 'ai' | 'hybrid' | 'human';
  name: string;
  minutesTotal: number;
  minutesRemaining: number;
  minutesUsed: number;
  rate: number;
  active: boolean;
  purchasedAt: any;
  expiresAt: any;
}

export default function UserActivityPage() {
  const { user: currentUser, userData: currentUserData } = useAuth();
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  const userId = params.userId as string;

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [transcriptions, setTranscriptions] = useState<TranscriptionJob[]>([]);
  const [packages, setPackages] = useState<UserPackage[]>([]);

  useEffect(() => {
    // Check if current user is admin
    if (currentUserData?.role !== 'admin') {
      router.push('/dashboard');
      return;
    }

    const loadUserActivity = async () => {
      try {
        setLoading(true);

        // Load user data
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          toast({
            title: "User not found",
            description: "The requested user does not exist.",
            variant: "destructive",
          });
          router.push('/admin/users');
          return;
        }

        const user = { id: userDoc.id, ...userDoc.data() } as UserData;
        setUserData(user);

        // Load transactions, transcriptions, and packages in parallel
        const [transactionsSnapshot, userTranscriptions, packagesSnapshot] = await Promise.all([
          getDocs(query(
            collection(db, 'transactions'),
            where('userId', '==', userId),
            orderBy('createdAt', 'desc')
          )),
          getTranscriptionsByUser(userId),
          getDocs(collection(db, 'users', userId, 'packages')),
        ]);

        setTransactions(transactionsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as CreditTransaction)));
        setTranscriptions(userTranscriptions);
        setPackages(packagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        } as UserPackage)));

      } catch (error) {
        console.error('Error loading user activity:', error);
        toast({
          title: "Error loading data",
          description: "Failed to load user activity. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadUserActivity();
  }, [userId, currentUserData, router, toast]);

  const handleExportActivity = () => {
    if (!userData) return;

    const headers = ['Date', 'Type', 'Description', 'Amount'];
    const rows = transactions.map(tx => {
      const date = tx.createdAt?.toDate ? tx.createdAt.toDate().toISOString() : (tx.createdAt instanceof Date ? tx.createdAt.toISOString() : new Date(tx.createdAt).toISOString());
      return [
        date,
        tx.type,
        tx.description,
        tx.amount.toString()
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${userData.name || userData.email}-activity-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast({
      title: "Export successful",
      description: "User activity has been downloaded.",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!userData) {
    return null;
  }

  const activePackages = packages.filter(pkg => pkg.active);
  const completedJobs = transcriptions.filter(t => t.status === 'complete').length;
  const totalSpent = transactions
    .filter(t => t.type === 'wallet_topup' || t.type === 'package_purchase')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Back Button and Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/users')}
            className="mb-4"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-[#003366] mb-2">
                User Activity
              </h1>
              <p className="text-gray-600">
                Viewing activity for {userData.name || 'Unnamed User'}
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleExportActivity}
            >
              <Download className="h-4 w-4 mr-2" />
              Export Activity
            </Button>
          </div>
        </div>

        {/* User Info Card */}
        <Card className="border-0 shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#003366] flex items-center">
              <User className="h-5 w-5 mr-2" />
              User Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Name</p>
                <p className="font-medium text-[#003366]">{userData.name || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Email</p>
                <p className="font-medium text-[#003366]">{userData.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Role</p>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  userData.role === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {userData.role === 'admin' ? 'Admin' : 'User'}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Joined</p>
                <p className="font-medium text-[#003366]">
                  {userData.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Wallet Balance</p>
                  <p className="text-2xl font-bold text-[#003366]">CA${(userData.walletBalance || 0).toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-[#b29dd9] rounded-lg flex items-center justify-center">
                  <Wallet className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Jobs</p>
                  <p className="text-2xl font-bold text-[#003366]">{transcriptions.length}</p>
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
                  <p className="text-2xl font-bold text-[#003366]">{completedJobs}</p>
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
                  <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-[#003366]">CA${totalSpent.toFixed(2)}</p>
                </div>
                <div className="w-12 h-12 bg-[#2c3e50] rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Active Packages */}
        {activePackages.length > 0 && (
          <Card className="border-0 shadow-sm mb-8">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-[#003366] flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Active Packages
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activePackages.map((pkg) => {
                  const expiresAt = pkg.expiresAt?.toDate ? pkg.expiresAt.toDate() : new Date(pkg.expiresAt);
                  const daysRemaining = Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  const usagePercent = ((pkg.minutesUsed / pkg.minutesTotal) * 100).toFixed(0);

                  return (
                    <div key={pkg.id} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium capitalize text-[#003366]">{pkg.type} Package</span>
                        {daysRemaining <= 7 && (
                          <span className="text-xs bg-yellow-500 text-white px-2 py-0.5 rounded">
                            {daysRemaining}d left
                          </span>
                        )}
                      </div>
                      <div className="text-xl font-bold text-[#003366] mb-1">
                        {pkg.minutesRemaining} / {pkg.minutesTotal} min
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        CA${pkg.rate.toFixed(2)}/min • {usagePercent}% used
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-[#b29dd9] h-2 rounded-full transition-all"
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Transcriptions */}
        <Card className="border-0 shadow-sm mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#003366] flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Recent Transcriptions ({transcriptions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transcriptions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No transcriptions yet</p>
            ) : (
              <div className="space-y-3">
                {transcriptions.slice(0, 10).map((job) => (
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
                          {job.mode === 'ai' ? 'AI' :
                           job.mode === 'hybrid' ? 'Hybrid' :
                           job.mode === 'human' ? 'Human' : job.mode}
                        </span>
                        <span>{Math.ceil(job.duration / 60)} min</span>
                        <span className="text-[#003366] font-medium">CA${((job.creditsUsed || 0) / 100).toFixed(2)}</span>
                        <span className="text-gray-500">
                          {job.createdAt?.toDate?.()?.toLocaleDateString() || 'N/A'}
                        </span>
                      </div>
                    </div>
                    {job.status === 'complete' && job.id && (
                      <Button
                        size="sm"
                        asChild
                        className="bg-white border border-[#003366] text-[#003366] hover:bg-[#003366] hover:text-white"
                      >
                        <Link href={`/transcript/${job.id}`}>
                          View
                        </Link>
                      </Button>
                    )}
                  </div>
                ))}
                {transcriptions.length > 10 && (
                  <p className="text-center text-sm text-gray-500 pt-4">
                    Showing 10 of {transcriptions.length} transcriptions
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Transaction History */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-[#003366] flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Transaction History ({transactions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No transactions yet</p>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => {
                  const isCredit = transaction.type === 'wallet_topup' || transaction.type === 'package_purchase';
                  const date = transaction.createdAt?.toDate
                    ? transaction.createdAt.toDate().toLocaleDateString()
                    : transaction.createdAt instanceof Date
                    ? transaction.createdAt.toLocaleDateString()
                    : new Date(transaction.createdAt).toLocaleDateString();

                  return (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          isCredit ? 'bg-green-100' : 'bg-red-100'
                        }`}>
                          {isCredit ? (
                            <CreditCard className="h-4 w-4 text-green-600" />
                          ) : (
                            <CheckCircle className="h-4 w-4 text-red-600" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {transaction.description}
                          </p>
                          <p className="text-xs text-gray-500">{date}</p>
                        </div>
                      </div>
                      <div className={`text-sm font-medium ${
                        isCredit ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {(() => {
                          if (transaction.type === 'wallet_topup') {
                            return `+CA$${transaction.amount.toFixed(2)}`;
                          }
                          if (transaction.type === 'package_purchase') {
                            return `+${transaction.packageMinutes || transaction.amount} minutes`;
                          }
                          return `-CA$${transaction.amount.toFixed(2)}`;
                        })()}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
