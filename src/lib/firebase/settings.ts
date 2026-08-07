import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  onSnapshot
} from 'firebase/firestore';
import { db } from './config';

export interface PricingSettings {
  payAsYouGo: {
    ai: number;
    hybrid: number;
    human: number;
  };
  updatedAt?: Date;
}

const SETTINGS_DOC_ID = 'pricing';
const settingsDocRef = doc(db, 'settings', SETTINGS_DOC_ID);

// Get pricing settings
export const getPricingSettings = async (): Promise<PricingSettings> => {
  try {
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        payAsYouGo: data.payAsYouGo,
        updatedAt: data.updatedAt?.toDate()
      };
    } else {
      // Return defaults if not exists
      return {
        payAsYouGo: {
          ai: 0.05,
          hybrid: 1.50,
          human: 2.50
        }
      };
    }
  } catch (error) {
    console.error('Error getting pricing settings:', error);
    throw error;
  }
};

// Update pricing settings
export const updatePricingSettings = async (settings: Partial<PricingSettings>): Promise<void> => {
  try {
    const updateData = {
      ...settings,
      updatedAt: new Date()
    };

    // Check if document exists
    const docSnap = await getDoc(settingsDocRef);

    if (docSnap.exists()) {
      await updateDoc(settingsDocRef, updateData);
    } else {
      // Create if doesn't exist
      await setDoc(settingsDocRef, updateData);
    }
  } catch (error) {
    console.error('Error updating pricing settings:', error);
    throw error;
  }
};

// Initialize default settings
export const initializeDefaultSettings = async (): Promise<void> => {
  try {
    const docSnap = await getDoc(settingsDocRef);

    if (!docSnap.exists()) {
      await setDoc(settingsDocRef, {
        payAsYouGo: {
          ai: 0.05,
          hybrid: 1.50,
          human: 2.50
        },
        updatedAt: new Date()
      });
      console.log('Default pricing settings initialized');
    }
  } catch (error) {
    console.error('Error initializing default settings:', error);
    throw error;
  }
};

// Subscribe to pricing settings changes
export const subscribeToPricingSettings = (
  callback: (settings: PricingSettings) => void
): (() => void) => {
  return onSnapshot(settingsDocRef, (doc) => {
    if (doc.exists()) {
      const data = doc.data();
      callback({
        payAsYouGo: data.payAsYouGo,
        updatedAt: data.updatedAt?.toDate()
      });
    } else {
      // Return defaults if not exists
      callback({
        payAsYouGo: {
          ai: 0.05,
          hybrid: 1.50,
          human: 2.50
        }
      });
    }
  }, (error) => {
    console.error('Error in pricing settings subscription:', error);
  });
};
