"use client";

import React, { createContext, useContext, useState, ReactNode, useCallback, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { collection, addDoc, query, orderBy, limit, getDocs, getFirestore, where, doc, getDoc, updateDoc } from 'firebase/firestore';

interface CreditTransaction {
  id: string;
  type: 'wallet_topup' | 'package_purchase' | 'transcription' | 'refund' | 'adjustment' | 'purchase' | 'consumption';
  amount: number;
  description: string;
  createdAt: Date;
  jobId?: string;
  userId?: string;
  userEmail?: string;
  revenue?: number;
}

interface CreditContextType {
  transactions: CreditTransaction[];
  transactionsLoading: boolean;
  purchaseCredits: (packageId: string, amount: number, cost: number) => Promise<void>;
  reserveCredits: (amount: number, jobId: string) => Promise<void>;
  consumeCredits: (amount: number, jobId: string, description?: string) => Promise<void>;
  refundCredits: (amount: number, jobId: string, targetUserId?: string) => Promise<void>;
  addTransaction: (transaction: Omit<CreditTransaction, 'id' | 'createdAt'>) => Promise<void>;
  refreshCredits: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  getAllTransactions: () => Promise<CreditTransaction[]>;
  getAllUsers: () => Promise<any[]>;
}

const CreditContext = createContext<CreditContextType | undefined>(undefined);

export function useCredits() {
  const context = useContext(CreditContext);
  if (context === undefined) {
    throw new Error('useCredits must be used within a CreditProvider');
  }
  return context;
}

interface CreditProviderProps {
  children: ReactNode;
}

// Mock transactions for demo
const mockTransactions: CreditTransaction[] = [
  {
    id: 'tx1',
    type: 'purchase',
    amount: 5000,
    description: 'Purchased professional package - 5000 credits for $45 CAD',
    createdAt: new Date('2024-08-28T10:30:00Z')
  },
  {
    id: 'tx2',
    type: 'consumption',
    amount: -450,
    description: 'Credits consumed for meeting transcription (45 min)',
    createdAt: new Date('2024-08-27T15:20:00Z'),
    jobId: 'job-123'
  },
  {
    id: 'tx3',
    type: 'consumption',
    amount: -230,
    description: 'Credits consumed for interview transcription (23 min)',
    createdAt: new Date('2024-08-25T09:15:00Z'),
    jobId: 'job-124'
  },
  {
    id: 'tx4',
    type: 'purchase',
    amount: 1000,
    description: 'Purchased starter package - 1000 credits for $10 CAD',
    createdAt: new Date('2024-08-20T14:45:00Z')
  }
];

export function CreditProvider({ children }: CreditProviderProps) {
  const { user, userData, refreshUser, updateUserData } = useAuth();
  const [transactions, setTransactions] = useState<CreditTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [transactionCounter, setTransactionCounter] = useState(100);

  const loadTransactions = useCallback(async () => {
    if (!user) return;
    
    setTransactionsLoading(true);
    try {
      const db = getFirestore();
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        where('userId', '==', user.uid),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      
      const snapshot = await getDocs(q);
      const firestoreTransactions: CreditTransaction[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate()
      } as CreditTransaction));
      
      setTransactions(firestoreTransactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      // Fallback to mock transactions if Firestore fails
      setTransactions(mockTransactions);
    } finally {
      setTransactionsLoading(false);
    }
  }, [user]);

  // Load transactions from Firestore when user changes
  useEffect(() => {
    if (!user) {
      setTransactions([]);
      setTransactionsLoading(false);
      return;
    }

    loadTransactions();
  }, [user, loadTransactions]);

  const addTransaction = async (transaction: Omit<CreditTransaction, 'id' | 'createdAt'>) => {
    if (!user) return;

    const newTransaction = {
      ...transaction,
      userId: user.uid,
      userEmail: user.email || userData?.email,
      createdAt: new Date()
    };

    try {
      // Save to Firestore
      const db = getFirestore();
      const docRef = await addDoc(collection(db, 'transactions'), newTransaction);
      
      // Add to local state with Firestore document ID
      const transactionWithId: CreditTransaction = {
        id: docRef.id,
        ...transaction,
        createdAt: newTransaction.createdAt
      };
      
      setTransactions(prev => [transactionWithId, ...prev]);
    } catch (error) {
      console.error('Error saving transaction:', error);
      // Still add to local state as fallback
      const newId = `tx_${transactionCounter + 1}`;
      setTransactionCounter(prev => prev + 1);
      
      const transactionWithId: CreditTransaction = {
        id: newId,
        ...transaction,
        createdAt: newTransaction.createdAt
      };
      setTransactions(prev => [transactionWithId, ...prev]);
    }
  };

  const purchaseCredits = async (packageId: string, amount: number, cost: number) => {
    if (!user || !userData) return;

    try {
      // Calculate new wallet balance and update totalSpent
      const currentWallet = userData.walletBalance || 0;
      const currentTotalSpent = userData.totalSpent || 0;
      const newWalletBalance = currentWallet + amount;
      const newTotalSpent = currentTotalSpent + cost;

      // Update user's wallet balance and totalSpent in Firestore
      await updateUserData({
        walletBalance: newWalletBalance,
        totalSpent: newTotalSpent
      });

      // Record transaction to Firestore and local state with revenue information
      await addTransaction({
        type: 'purchase',
        amount,
        description: `Purchased ${packageId} package - ${amount} for $${cost} CAD`,
        revenue: cost
      });

    } catch (error) {
      console.error('Error processing purchase:', error);
      throw error;
    }
  };

  const reserveCredits = async (amount: number, jobId: string) => {
    if (!user) return;
    // No reservation endpoint; log a pending transaction to Firestore
    await addTransaction({
      type: 'consumption',
      amount: -amount,
      description: `Credits reserved for transcription job`,
      jobId
    });
  };

  const consumeCredits = async (amount: number, jobId: string, description?: string) => {
    if (!user || !userData) return;

    try {
      // Calculate new wallet balance
      const currentWallet = userData.walletBalance || 0;
      const newWalletBalance = currentWallet - amount;

      // Update user's wallet balance in Firestore
      await updateUserData({ walletBalance: newWalletBalance });

      // Add the transaction
      await addTransaction({
        type: 'consumption',
        amount: -amount,
        description: description || `Wallet deduction for transcription`,
        jobId
      });

    } catch (error) {
      console.error('Error consuming from wallet:', error);
      throw error;
    }
  };

  const refundCredits = async (amount: number, jobId: string, targetUserId?: string) => {
    if (!user) return;
    
    try {
      const userIdToRefund = targetUserId || user.uid;
      const db = getFirestore();
      
      // Get target user's current data
      let targetUserData;
      if (targetUserId && targetUserId !== user.uid) {
        // Admin is refunding credits to another user
        const userRef = doc(db, 'users', targetUserId);
        const userDoc = await getDoc(userRef);
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }
        targetUserData = userDoc.data();
      } else {
        // User is refunding their own credits
        targetUserData = userData;
      }
      
      if (!targetUserData) {
        throw new Error('Unable to get user data for refund');
      }
      
      // Calculate new wallet balance
      const currentWallet = targetUserData.walletBalance || 0;
      const newWalletBalance = currentWallet + amount;

      // Update target user's wallet balance in Firestore
      if (targetUserId && targetUserId !== user.uid) {
        // Admin updating another user's wallet
        const userRef = doc(db, 'users', targetUserId);
        await updateDoc(userRef, { walletBalance: newWalletBalance });
      } else {
        // Update current user's wallet
        await updateUserData({ walletBalance: newWalletBalance });
      }

      // Record the refund transaction with proper user information
      await addTransaction({
        type: 'refund',
        amount,
        description: 'Refund for cancelled/failed transcription',
        jobId,
        userId: userIdToRefund,
        userEmail: targetUserData.email
      });
      
    } catch (error) {
      console.error('Error processing credit refund:', error);
      throw error;
    }
  };

  const refreshCredits = useCallback(async () => {
    try {
      // Refresh user data from Firestore
      await refreshUser();
      console.log('Credits refreshed from Firestore');
    } catch (e) {
      console.warn('⚠️ Failed to refresh credits:', e);
    }
  }, [refreshUser]);

  const refreshTransactions = useCallback(async () => {
    await loadTransactions();
  }, [loadTransactions]);

  // Admin functions - fetch all transactions and users
  const getAllTransactions = useCallback(async (): Promise<CreditTransaction[]> => {
    if (!user || !userData || userData.role !== 'admin') {
      throw new Error('Admin access required');
    }

    try {
      const db = getFirestore();
      const transactionsRef = collection(db, 'transactions');
      const q = query(
        transactionsRef,
        orderBy('createdAt', 'desc'),
        limit(100) // Limit to last 100 transactions for performance
      );
      
      const snapshot = await getDocs(q);
      const allTransactions: CreditTransaction[] = [];
      
      // Fetch user data for each transaction to get email addresses
      for (const docSnapshot of snapshot.docs) {
        const transactionData = docSnapshot.data();
        let userEmail = transactionData.userEmail;
        
        // If userEmail is not stored, fetch it from users collection
        if (!userEmail && transactionData.userId) {
          try {
            const userRef = doc(db, 'users', transactionData.userId);
            const userDoc = await getDoc(userRef);
            if (userDoc.exists()) {
              userEmail = userDoc.data().email;
            }
          } catch (error) {
            console.warn(`Could not fetch user data for ${transactionData.userId}`);
          }
        }
        
        // Calculate revenue for purchase transactions
        const revenue = transactionData.type === 'purchase' ? 
          (transactionData.revenue || transactionData.cost || transactionData.price || 0) : 0;
        
        allTransactions.push({
          id: docSnapshot.id,
          type: transactionData.type,
          amount: transactionData.amount,
          description: transactionData.description,
          createdAt: transactionData.createdAt.toDate(),
          jobId: transactionData.jobId,
          userId: transactionData.userId,
          userEmail,
          revenue
        });
      }
      
      return allTransactions;
    } catch (error) {
      console.error('Error fetching all transactions:', error);
      throw error;
    }
  }, [user, userData]);

  const getAllUsers = useCallback(async (): Promise<any[]> => {
    if (!user || !userData || userData.role !== 'admin') {
      throw new Error('Admin access required');
    }

    try {
      const db = getFirestore();
      const usersRef = collection(db, 'users');
      const q = query(usersRef, orderBy('createdAt', 'desc'));
      
      const snapshot = await getDocs(q);
      const allUsers = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      return allUsers;
    } catch (error) {
      console.error('Error fetching all users:', error);
      throw error;
    }
  }, [user, userData]);

  const value = {
    transactions,
    transactionsLoading,
    purchaseCredits,
    reserveCredits,
    consumeCredits,
    refundCredits,
    addTransaction,
    refreshCredits,
    refreshTransactions,
    getAllTransactions,
    getAllUsers
  };

  return (
    <CreditContext.Provider value={value}>
      {children}
    </CreditContext.Provider>
  );
}
