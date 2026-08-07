import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  addDoc
} from 'firebase/firestore';
import { db } from './config';

export interface TranscriptionPackage {
  id: string;
  type: 'ai' | 'hybrid' | 'human';
  tier: 'light' | 'pro' | 'enterprise';
  name: string;
  minutes: number;
  price: number;
  perMinuteRate: number;
  standardRate: number;
  description: string;
  popular: boolean;
  active: boolean;
  features: string[];
  bestFor: string;
  estimatedFiles: string;
  validity: string;
  savingsPercentage: number;
  savingsAmount: number;
  includesAddons: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Collection reference
const packagesCollection = collection(db, 'packages');

// Get all packages
export const getAllPackages = async (): Promise<TranscriptionPackage[]> => {
  try {
    const q = query(packagesCollection, orderBy('type'), orderBy('minutes'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    } as TranscriptionPackage));
  } catch (error) {
    console.error('Error fetching packages:', error);
    throw error;
  }
};

// Get active packages only
export const getActivePackages = async (): Promise<TranscriptionPackage[]> => {
  try {
    const q = query(
      packagesCollection,
      where('active', '==', true),
      orderBy('type'),
      orderBy('minutes')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    } as TranscriptionPackage));
  } catch (error) {
    console.error('Error fetching active packages:', error);
    throw error;
  }
};

// Get packages by type
export const getPackagesByType = async (type: 'ai' | 'hybrid' | 'human'): Promise<TranscriptionPackage[]> => {
  try {
    const q = query(
      packagesCollection,
      where('type', '==', type),
      where('active', '==', true),
      orderBy('minutes')
    );
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    } as TranscriptionPackage));
  } catch (error) {
    console.error(`Error fetching ${type} packages:`, error);
    throw error;
  }
};

// Get single package
export const getPackage = async (packageId: string): Promise<TranscriptionPackage | null> => {
  try {
    const docRef = doc(packagesCollection, packageId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: docSnap.data().createdAt?.toDate(),
        updatedAt: docSnap.data().updatedAt?.toDate()
      } as TranscriptionPackage;
    }
    return null;
  } catch (error) {
    console.error('Error fetching package:', error);
    throw error;
  }
};

// Create new package
export const createPackage = async (packageData: Omit<TranscriptionPackage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const newPackage = {
      ...packageData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(packagesCollection, newPackage);
    return docRef.id;
  } catch (error) {
    console.error('Error creating package:', error);
    throw error;
  }
};

// Update package
export const updatePackage = async (packageId: string, updates: Partial<TranscriptionPackage>): Promise<void> => {
  try {
    const docRef = doc(packagesCollection, packageId);

    // Remove id from updates if present
    const { id, ...updateData } = updates;

    await updateDoc(docRef, {
      ...updateData,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating package:', error);
    throw error;
  }
};

// Delete package
export const deletePackage = async (packageId: string): Promise<void> => {
  try {
    const docRef = doc(packagesCollection, packageId);
    await deleteDoc(docRef);
  } catch (error) {
    console.error('Error deleting package:', error);
    throw error;
  }
};

// Toggle package active status
export const togglePackageStatus = async (packageId: string, active: boolean): Promise<void> => {
  try {
    await updatePackage(packageId, { active });
  } catch (error) {
    console.error('Error toggling package status:', error);
    throw error;
  }
};

// Toggle package popular status (ensures only one popular package per type)
export const togglePackagePopular = async (packageId: string, type: 'ai' | 'hybrid' | 'human', popular: boolean): Promise<void> => {
  try {
    // If setting as popular, first unset all other popular packages of the same type
    if (popular) {
      const q = query(
        packagesCollection,
        where('type', '==', type),
        where('popular', '==', true)
      );
      const snapshot = await getDocs(q);

      // Unset popular for all packages of this type
      const updatePromises = snapshot.docs.map(doc =>
        updateDoc(doc.ref, {
          popular: false,
          updatedAt: Timestamp.now()
        })
      );
      await Promise.all(updatePromises);
    }

    // Now update the target package
    await updatePackage(packageId, { popular });
  } catch (error) {
    console.error('Error toggling package popular status:', error);
    throw error;
  }
};

// Subscribe to packages changes (real-time updates)
export const subscribeToPackages = (callback: (packages: TranscriptionPackage[]) => void) => {
  const q = query(packagesCollection, orderBy('type'), orderBy('minutes'));

  return onSnapshot(q, (snapshot) => {
    const packages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    } as TranscriptionPackage));

    callback(packages);
  }, (error) => {
    console.error('Error in packages subscription:', error);
  });
};

// Subscribe to active packages only
export const subscribeToActivePackages = (callback: (packages: TranscriptionPackage[]) => void) => {
  const q = query(
    packagesCollection,
    where('active', '==', true),
    orderBy('type'),
    orderBy('minutes')
  );

  return onSnapshot(q, (snapshot) => {
    const packages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      updatedAt: doc.data().updatedAt?.toDate()
    } as TranscriptionPackage));

    callback(packages);
  }, (error) => {
    console.error('Error in active packages subscription:', error);
  });
};

// Initialize default packages (run once to populate Firebase)
export const initializeDefaultPackages = async (): Promise<void> => {
  try {
    // Check if packages already exist
    const existingPackages = await getAllPackages();
    if (existingPackages.length > 0) {
      console.log('Packages already initialized');
      return;
    }

    // Default packages data
    const defaultPackages: Omit<TranscriptionPackage, 'id' | 'createdAt' | 'updatedAt'>[] = [
      // AI Packages
      {
        type: 'ai',
        tier: 'light',
        name: 'AI Light',
        minutes: 300,
        price: 100,
        perMinuteRate: 0.33,
        standardRate: 0.05,
        description: 'Perfect for individuals and small projects',
        popular: false,
        active: true,
        features: [
          'Fast automated transcription (60 min turnaround)',
          'Speaker detection & diarization',
          'Transcript editor with search',
          'DOCX & PDF export',
          'English & French support',
          'Standard email support'
        ],
        bestFor: 'Individual creators',
        estimatedFiles: '~10 podcasts',
        validity: '30 days',
        savingsPercentage: 17.5,
        savingsAmount: 20,
        includesAddons: false
      },
      {
        type: 'ai',
        tier: 'pro',
        name: 'AI Pro',
        minutes: 750,
        price: 240,
        perMinuteRate: 0.32,
        standardRate: 0.05,
        description: 'Most popular for regular users',
        popular: true,
        active: true,
        features: [
          'Fast automated transcription (60 min turnaround)',
          'Speaker detection & diarization',
          'Advanced transcript editor',
          'DOCX & PDF export',
          'English & French support',
          'Priority email support',
          'Bulk file upload (up to 10 files)'
        ],
        bestFor: 'Regular users',
        estimatedFiles: '~25 interviews',
        validity: '30 days',
        savingsPercentage: 20,
        savingsAmount: 60,
        includesAddons: false
      },
      {
        type: 'ai',
        tier: 'enterprise',
        name: 'AI Enterprise',
        minutes: 1500,
        price: 450,
        perMinuteRate: 0.30,
        standardRate: 0.05,
        description: 'Best value for high-volume users',
        popular: false,
        active: true,
        features: [
          'Fast automated transcription (60 min turnaround)',
          'Speaker detection & diarization',
          'Advanced transcript editor',
          'DOCX & PDF export',
          'English & French support',
          'Dedicated support team',
          'Unlimited bulk uploads',
          'Custom export templates'
        ],
        bestFor: 'Power users',
        estimatedFiles: '~50 recordings',
        validity: '30 days',
        savingsPercentage: 25,
        savingsAmount: 150,
        includesAddons: false
      },
      // Hybrid Packages
      {
        type: 'hybrid',
        tier: 'light',
        name: 'Hybrid Light',
        minutes: 300,
        price: 400,
        perMinuteRate: 1.33,
        standardRate: 1.50,
        description: 'Great for important recordings',
        popular: false,
        active: true,
        features: [
          'AI + Human review',
          '3-5 business days turnaround',
          '1-2 speakers included',
          '98%+ accuracy guarantee',
          'Professional formatting',
          'DOCX & PDF export',
          'Email support',
          'FREE Rush delivery (worth $150)',
          'FREE Multiple speakers (worth $75)'
        ],
        bestFor: 'Quality-focused',
        estimatedFiles: '~10 meetings',
        validity: '30 days',
        savingsPercentage: 11,
        savingsAmount: 50,
        includesAddons: true
      },
      {
        type: 'hybrid',
        tier: 'pro',
        name: 'Hybrid Pro',
        minutes: 750,
        price: 950,
        perMinuteRate: 1.27,
        standardRate: 1.50,
        description: 'Ideal for business professionals',
        popular: true,
        active: true,
        features: [
          'AI + Human review',
          '3-5 business days turnaround',
          '1-2 speakers included',
          '98%+ accuracy guarantee',
          'Professional formatting',
          'Priority processing available',
          'Phone & email support',
          'Custom vocabulary support',
          'FREE Rush delivery (worth $375)',
          'FREE Multiple speakers (worth $187.50)'
        ],
        bestFor: 'Professionals',
        estimatedFiles: '~25 sessions',
        validity: '30 days',
        savingsPercentage: 15,
        savingsAmount: 175,
        includesAddons: true
      },
      {
        type: 'hybrid',
        tier: 'enterprise',
        name: 'Hybrid Enterprise',
        minutes: 1500,
        price: 1800,
        perMinuteRate: 1.20,
        standardRate: 1.50,
        description: 'Perfect for organizations',
        popular: false,
        active: true,
        features: [
          'AI + Human review',
          '3-5 business days turnaround',
          '1-2 speakers included',
          '98%+ accuracy guarantee',
          'Professional formatting',
          'Priority processing included',
          'Dedicated account manager',
          'Custom vocabulary & formatting',
          'Volume discount on add-ons',
          'FREE Rush delivery (worth $750)',
          'FREE Multiple speakers (worth $375)'
        ],
        bestFor: 'Businesses',
        estimatedFiles: '~50 recordings',
        validity: '30 days',
        savingsPercentage: 20,
        savingsAmount: 450,
        includesAddons: true
      },
      // Human Packages
      {
        type: 'human',
        tier: 'light',
        name: 'Human Light',
        minutes: 300,
        price: 650,
        perMinuteRate: 2.17,
        standardRate: 2.50,
        description: 'Professional transcription for critical content',
        popular: false,
        active: true,
        features: [
          '100% human transcription',
          '3-5 business days turnaround',
          '1-2 speakers included',
          '99%+ accuracy guarantee',
          'Verbatim or clean read',
          'Professional formatting',
          'Time-coding included',
          'Email support',
          'FREE Rush delivery (worth $225)',
          'FREE Multiple speakers (worth $90)'
        ],
        bestFor: 'Legal/Medical',
        estimatedFiles: '~10 depositions',
        validity: '30 days',
        savingsPercentage: 13,
        savingsAmount: 100,
        includesAddons: true
      },
      {
        type: 'human',
        tier: 'pro',
        name: 'Human Pro',
        minutes: 750,
        price: 1600,
        perMinuteRate: 2.13,
        standardRate: 2.50,
        description: 'For legal, medical, and media professionals',
        popular: true,
        active: true,
        features: [
          '100% human transcription',
          '3-5 business days turnaround',
          '1-2 speakers included',
          '99%+ accuracy guarantee',
          'Verbatim or clean read',
          'Professional formatting',
          'Time-coding included',
          'Priority processing available',
          'Industry-specific formatting',
          'FREE Rush delivery (worth $562.50)',
          'FREE Multiple speakers (worth $225)'
        ],
        bestFor: 'Agencies',
        estimatedFiles: '~25 interviews',
        validity: '30 days',
        savingsPercentage: 15,
        savingsAmount: 275,
        includesAddons: true
      },
      {
        type: 'human',
        tier: 'enterprise',
        name: 'Human Enterprise',
        minutes: 1500,
        price: 3000,
        perMinuteRate: 2.00,
        standardRate: 2.50,
        description: 'Maximum accuracy for enterprise needs',
        popular: false,
        active: true,
        features: [
          '100% human transcription',
          '3-5 business days turnaround',
          '1-2 speakers included',
          '99%+ accuracy guarantee',
          'Verbatim or clean read',
          'Professional formatting',
          'Time-coding included',
          'Dedicated transcription team',
          'Custom style guides',
          'Quality assurance review',
          'FREE Rush delivery (worth $1125)',
          'FREE Multiple speakers (worth $450)'
        ],
        bestFor: 'Enterprises',
        estimatedFiles: '~50 recordings',
        validity: '30 days',
        savingsPercentage: 20,
        savingsAmount: 750,
        includesAddons: true
      }
    ];

    // Create all packages
    const createPromises = defaultPackages.map(pkg => createPackage(pkg));
    await Promise.all(createPromises);

    console.log('Default packages initialized successfully');
  } catch (error) {
    console.error('Error initializing default packages:', error);
    throw error;
  }
};
