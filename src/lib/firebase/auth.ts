import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  User,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import { auth, db } from './config';
import { doc, setDoc, getDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { setCookie, deleteCookie } from 'cookies-next';
import { SubscriptionStatus, PlanId } from '@/lib/types/subscription';

// Ensure persistence is set to LOCAL (only on client side)
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.warn('Failed to set auth persistence:', error);
  });
}

export interface UserData {
  uid: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: any;
  lastLogin: any;

  // Wallet system
  walletBalance?: number;
  totalSpent?: number;

  // Free Trial system - 60 AI transcription minutes for new users
  freeTrialMinutes?: number;           // Remaining free trial minutes
  freeTrialMinutesTotal?: number;      // Total free trial minutes granted (60)
  freeTrialMinutesUsed?: number;       // Minutes used from free trial
  freeTrialActive?: boolean;           // Whether free trial is active

  // Subscription info
  subscriptionPlan?: PlanId;
  subscriptionStatus?: SubscriptionStatus;
  subscriptionId?: string;
  stripeCustomerId?: string;

  // Usage tracking
  currentPeriodMinutesUsed?: number;
  currentPeriodStart?: Timestamp;
  currentPeriodEnd?: Timestamp;
  lifetimeMinutesUsed?: number;
  totalJobs?: number;
  includedMinutesPerMonth?: number;
  minutesUsedThisMonth?: number;

  // User profile
  name?: string;
}

// Sign up new user
export const signUp = async (email: string, password: string, name?: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user document in Firestore with FREE TRIAL
    await setDoc(doc(db, 'users', user.uid), {
      uid: user.uid,
      email: user.email,
      name: name || '',
      role: 'user', // Default role
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
      walletBalance: 0,
      totalSpent: 0,
      // Free Trial - 60 AI transcription minutes for all new users
      freeTrialMinutes: 60,
      freeTrialMinutesTotal: 60,
      freeTrialMinutesUsed: 0,
      freeTrialActive: true,
    });

    // Get ID token and set cookie
    const idToken = await user.getIdToken();
    setCookie('auth-token', idToken, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return { user, error: null };
  } catch (error: any) {
    return { user: null, error: error.message };
  }
};

// Sign in existing user
export const signIn = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update last login
    await setDoc(
      doc(db, 'users', user.uid),
      { lastLogin: serverTimestamp() },
      { merge: true }
    );

    // Get ID token and set cookie
    const idToken = await user.getIdToken();
    setCookie('auth-token', idToken, {
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return { user, error: null };
  } catch (error: any) {
    // Preserve the full error message for better error handling
    return { user: null, error: error.message || error.toString() };
  }
};

// Sign out user
export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
    deleteCookie('auth-token');
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Get user data from Firestore
export const getUserData = async (uid: string): Promise<UserData | null> => {
  try {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return docSnap.data() as UserData;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user data:', error);
    return null;
  }
};

// Send password reset email
export const forgotPassword = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email);
    return { error: null };
  } catch (error: any) {
    return { error: error.message };
  }
};

// Subscribe to auth state changes
export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
