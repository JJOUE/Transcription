"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import {
  collection,
  addDoc,
  query,
  orderBy,
  limit,
  getDocs,
  where,
  doc,
  getDoc,
  updateDoc,
  runTransaction,
  Timestamp,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { TranscriptionMode } from '@/lib/firebase/transcriptions';
import { PricingSettings, subscribeToPricingSettings } from '@/lib/firebase/settings';
import { loadNormalizedUserPackages, normalizeUserPackages } from '@/lib/firebase/user-packages';

// Package types
interface Package {
  id: string;
  type: 'ai' | 'hybrid' | 'human';
  name: string;
  minutesTotal: number;
  minutesUsed: number;
  minutesRemaining: number;
  availableMinutesRemaining?: number;
  rate: number; // Cost per minute in CAD
  purchasedAt?: Date;
  expiresAt?: Date;
  active: boolean;
}

// Transaction types
interface WalletTransaction {
  id: string;
  type: 'package_purchase' | 'wallet_topup' | 'transcription' | 'refund' | 'adjustment';
  amount: number; // Positive for additions, negative for deductions
  description: string;
  createdAt: Date;
  jobId?: string;
  packageId?: string;
  minutesUsed?: number;
}

// Context type
interface WalletContextType {
  walletBalance: number;
  packages: Package[];
  transactions: WalletTransaction[];
  loading: boolean;
  // Free Trial
  freeTrialMinutes: number;
  freeTrialActive: boolean;
  freeTrialUsed: number;
  freeTrialTotal: number;
  refreshWallet: () => Promise<void>;
  deductForTranscription: (
    mode: TranscriptionMode,
    minutes: number,
    jobId: string
  ) => Promise<{
    success: boolean;
    costDeducted: number;
    freeTrialMinutesUsed: number;
    packageMinutesUsed: number;
    walletUsed: number;
    error?: string
  }>;
  addPackage: (packageData: Omit<Package, 'id' | 'minutesUsed' | 'minutesRemaining' | 'active'>) => Promise<void>;
  addToWallet: (amount: number, description: string) => Promise<void>;
  checkSufficientBalance: (mode: TranscriptionMode, minutes: number) => {
    sufficient: boolean;
    totalCost: number;
    freeTrialMinutes: number;
    packageMinutes: number;
    walletNeeded: number;
    hasPackage: boolean;
    hasFreeTrialMinutes: boolean;
  };
  refundTransaction: (jobId: string, amount: number, minutes: number) => Promise<void>;
  getActivePackageForMode: (mode: TranscriptionMode) => Package | null;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

interface WalletProviderProps {
  children: ReactNode;
}

// Helper to convert Firestore timestamps to JavaScript Dates
// Handles: Firestore Timestamp, raw {_seconds} objects, Date objects, and numbers
function toDate(value: any): Date {
  if (!value) return new Date(0);
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value._seconds !== undefined) return new Date(value._seconds * 1000);
  if (typeof value === 'number') return new Date(value);
  return new Date(value);
}

export function WalletProvider({ children }: WalletProviderProps) {
  const { user, userData, updateUserData } = useAuth();
  // Initialize with userData's walletBalance if available (prevents showing 0 during load)
  const [walletBalance, setWalletBalance] = useState(userData?.walletBalance || 0);
  const [packages, setPackages] = useState<Package[]>([]);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  // Free Trial state
  const [freeTrialMinutes, setFreeTrialMinutes] = useState(0);
  const [freeTrialActive, setFreeTrialActive] = useState(false);
  const [freeTrialUsed, setFreeTrialUsed] = useState(0);
  const [freeTrialTotal, setFreeTrialTotal] = useState(0);
  // Pricing settings from database
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
  const [professionalEditorAiRate, setProfessionalEditorAiRate] = useState(0.05);

  useEffect(() => {
    if (!user) { setProfessionalEditorAiRate(0.05); return; }
    user.getIdToken().then(token => fetch('/api/professional-editor/status', {
      headers: { Authorization: `Bearer ${token}` }, credentials: 'include', cache: 'no-store',
    })).then(response => response.ok ? response.json() : null)
      .then(data => setProfessionalEditorAiRate(data?.aiRate === 0.03 ? 0.03 : 0.05))
      .catch(() => setProfessionalEditorAiRate(0.05));
  }, [user]);

  // Mode pricing configuration (from database)
  const MODE_PRICING = pricingSettings ? {
    ai: { standardRate: professionalEditorAiRate, name: 'AI Transcription' },
    hybrid: { standardRate: pricingSettings.payAsYouGo.hybrid, name: 'Hybrid Transcription' },
    human: { standardRate: pricingSettings.payAsYouGo.human, name: 'Human Transcription' }
  } : {
    ai: { standardRate: professionalEditorAiRate, name: 'AI Transcription' },
    hybrid: { standardRate: 1.50, name: 'Hybrid Transcription' },
    human: { standardRate: 2.50, name: 'Human Transcription' }
  };

  // Load wallet data
  const loadWalletData = useCallback(async () => {
    if (!user) {
      setWalletBalance(0);
      setPackages([]);
      setTransactions([]);
      setFreeTrialMinutes(0);
      setFreeTrialActive(false);
      setFreeTrialUsed(0);
      setFreeTrialTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Get user document
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();

        // Get wallet balance (new system only)
        const wallet = data.walletBalance || 0;
        setWalletBalance(wallet);

        // Load free trial data
        const trialMinutes = data.freeTrialMinutes || 0;
        const trialActive = data.freeTrialActive || false;
        const trialUsed = data.freeTrialMinutesUsed || 0;
        const trialTotal = data.freeTrialMinutesTotal || 0;
        setFreeTrialMinutes(trialMinutes);
        setFreeTrialActive(trialActive && trialMinutes > 0);
        setFreeTrialUsed(trialUsed);
        setFreeTrialTotal(trialTotal);

        // Merge the current embedded package array with legacy/newer package subcollection records.
        const normalizedPackages = await loadNormalizedUserPackages(user.uid, data.packages);
        setPackages(normalizedPackages.filter(pkg => pkg.active) as Package[]);
      } else {
        setPackages([]);
      }

      // Load recent transactions
      const transactionsQuery = query(
        collection(db, 'transactions'),
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const transactionsSnapshot = await getDocs(transactionsQuery);
      const loadedTransactions: WalletTransaction[] = transactionsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as WalletTransaction[];

      setTransactions(loadedTransactions);
    } catch (error) {
      console.error('Error loading wallet data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  // Sync wallet data with userData when it changes (ensures consistency across contexts)
  // This runs immediately when userData becomes available, preventing the "0 balance" flash
  useEffect(() => {
    if (userData) {
      // Sync wallet balance immediately
      if (userData.walletBalance !== undefined) {
        setWalletBalance(userData.walletBalance);
      }

      // Sync free trial data
      if (userData.freeTrialMinutes !== undefined) {
        setFreeTrialMinutes(userData.freeTrialMinutes);
      }
      if (userData.freeTrialActive !== undefined) {
        setFreeTrialActive(userData.freeTrialActive && (userData.freeTrialMinutes || 0) > 0);
      }
      if (userData.freeTrialMinutesUsed !== undefined) {
        setFreeTrialUsed(userData.freeTrialMinutesUsed);
      }
      if (userData.freeTrialMinutesTotal !== undefined) {
        setFreeTrialTotal(userData.freeTrialMinutesTotal);
      }

      // An empty embedded array must not suppress packages loaded from the subcollection.
      setPackages(current => normalizeUserPackages(userData.packages, current)
        .filter(pkg => pkg.active) as Package[]);

      // Mark as not loading once we have userData
      setLoading(false);
    }
  }, [userData]);

  // Refresh when the client returns to the tab after an administrator changes a balance.
  useEffect(() => {
    const refreshOnFocus = () => void loadWalletData();
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [loadWalletData]);

  // Subscribe to pricing settings
  useEffect(() => {
    const unsubscribe = subscribeToPricingSettings((settings) => {
      setPricingSettings(settings);
    });

    return () => unsubscribe();
  }, []);

  // Get active package for a specific mode
  const getActivePackageForMode = (mode: TranscriptionMode): Package | null => {
    const now = new Date();

    // Find packages that match the mode and have minutes remaining
    const eligiblePackages = packages.filter(pkg => {
      const expiresAt = pkg.expiresAt ? toDate(pkg.expiresAt) : null;
      return pkg.type === mode &&
        pkg.active &&
        (pkg.availableMinutesRemaining ?? pkg.minutesRemaining) > 0 &&
        (!expiresAt || expiresAt > now);
    });

    // Return package with best rate (lowest)
    if (eligiblePackages.length > 0) {
      return eligiblePackages.reduce((best, current) =>
        current.rate < best.rate ? current : best
      );
    }

    return null;
  };

  // Check if user has sufficient balance
  const checkSufficientBalance = (mode: TranscriptionMode, minutes: number) => {
    const activePackage = getActivePackageForMode(mode);
    const standardRate = MODE_PRICING[mode].standardRate;

    let remainingMinutes = minutes;
    let freeTrialMinutesUsed = 0;
    let packageMinutes = 0;
    let walletNeeded = 0;
    let totalCost = 0;

    const canUseFreeTrial = mode === 'ai';

    // PRIORITY 1: Use free trial minutes first for AI transcription only
    if (canUseFreeTrial && freeTrialActive && freeTrialMinutes > 0) {
      freeTrialMinutesUsed = Math.min(remainingMinutes, freeTrialMinutes);
      remainingMinutes -= freeTrialMinutesUsed;
      // Free trial is FREE - no cost
    }

    // PRIORITY 2: Use package minutes for remaining (mode-specific)
    if (remainingMinutes > 0 && activePackage) {
      packageMinutes = Math.min(
        remainingMinutes,
        activePackage.availableMinutesRemaining ?? activePackage.minutesRemaining,
      );
      remainingMinutes -= packageMinutes;
      // Calculate cost for package minutes (for tracking purposes)
      totalCost += packageMinutes * activePackage.rate;
    }

    // PRIORITY 3: Use wallet for any remaining minutes
    if (remainingMinutes > 0) {
      walletNeeded = remainingMinutes * standardRate;
      totalCost += walletNeeded;
    }

    return {
      sufficient: walletBalance >= walletNeeded,
      totalCost,
      freeTrialMinutes: freeTrialMinutesUsed,
      packageMinutes,
      walletNeeded,
      hasPackage: !!activePackage,
      hasFreeTrialMinutes: freeTrialMinutesUsed > 0
    };
  };

  // Deduct for transcription
  const deductForTranscription = async (
    mode: TranscriptionMode,
    minutes: number,
    jobId: string
  ): Promise<{ success: boolean; costDeducted: number; freeTrialMinutesUsed: number; packageMinutesUsed: number; walletUsed: number; error?: string }> => {
    if (!user) {
      return { success: false, costDeducted: 0, freeTrialMinutesUsed: 0, packageMinutesUsed: 0, walletUsed: 0, error: 'User not authenticated' };
    }

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/transcriptions/${encodeURIComponent(jobId)}/deduct`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || 'Failed to process payment');
      await loadWalletData();
      return {
        success: true,
        costDeducted: Number(result.costDeducted || 0),
        freeTrialMinutesUsed: Number(result.freeTrialMinutesUsed || 0),
        packageMinutesUsed: Number(result.packageMinutesUsed || 0),
        walletUsed: Number(result.walletUsed || 0),
      };
    } catch (error: any) {
      console.error('Error deducting for transcription:', error);
      return {
        success: false,
        costDeducted: 0,
        freeTrialMinutesUsed: 0,
        packageMinutesUsed: 0,
        walletUsed: 0,
        error: error.message || 'Failed to process payment'
      };
    }
  };

  // Add package (called by webhook)
  const addPackage = async (packageData: Omit<Package, 'id' | 'minutesUsed' | 'minutesRemaining' | 'active'>) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const packageId = `pkg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newPackage = {
        ...packageData,
        id: packageId,
        minutesUsed: 0,
        minutesRemaining: packageData.minutesTotal,
        active: true
      };

      await updateDoc(userRef, {
        packages: [...packages, newPackage],
        updatedAt: serverTimestamp()
      });

      // Record transaction
      await addDoc(collection(db, 'transactions'), {
        userId: user.uid,
        type: 'package_purchase',
        amount: packageData.minutesTotal * packageData.rate, // Total value
        description: `${packageData.name}: ${packageData.minutesTotal} minutes`,
        packageId,
        createdAt: serverTimestamp()
      });

      await loadWalletData();
    } catch (error) {
      console.error('Error adding package:', error);
      throw error;
    }
  };

  // Add to wallet (called by webhook)
  const addToWallet = async (amount: number, description: string) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User not found');

        const currentBalance = userDoc.data().walletBalance || 0;

        transaction.update(userRef, {
          walletBalance: currentBalance + amount,
          updatedAt: serverTimestamp()
        });

        // Record transaction
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          userId: user.uid,
          type: 'wallet_topup',
          amount: amount,
          description,
          createdAt: serverTimestamp()
        });
      });

      await loadWalletData();
    } catch (error) {
      console.error('Error adding to wallet:', error);
      throw error;
    }
  };

  // Refund transaction
  const refundTransaction = async (jobId: string, amount: number, minutes: number) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.uid);

      await runTransaction(db, async (transaction) => {
        const userDoc = await transaction.get(userRef);
        if (!userDoc.exists()) throw new Error('User not found');

        const currentBalance = userDoc.data().walletBalance || 0;

        transaction.update(userRef, {
          walletBalance: currentBalance + amount,
          updatedAt: serverTimestamp()
        });

        // Record refund transaction
        const transactionRef = doc(collection(db, 'transactions'));
        transaction.set(transactionRef, {
          userId: user.uid,
          type: 'refund',
          amount: amount,
          description: `Refund for cancelled transcription (${minutes} minutes)`,
          jobId,
          createdAt: serverTimestamp()
        });
      });

      await loadWalletData();
    } catch (error) {
      console.error('Error processing refund:', error);
      throw error;
    }
  };

  const refreshWallet = async () => {
    await loadWalletData();
  };

  const value: WalletContextType = {
    walletBalance,
    packages,
    transactions,
    loading,
    // Free Trial
    freeTrialMinutes,
    freeTrialActive,
    freeTrialUsed,
    freeTrialTotal,
    refreshWallet,
    deductForTranscription,
    addPackage,
    addToWallet,
    checkSufficientBalance,
    refundTransaction,
    getActivePackageForMode
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}
