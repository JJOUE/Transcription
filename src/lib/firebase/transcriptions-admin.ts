// Server-side transcription functions using Firebase Admin SDK
import { adminDb } from './admin';
import { FieldValue } from 'firebase-admin/firestore';

export type TranscriptionStatus = 'processing' | 'pending-review' | 'pending-transcription' | 'complete' | 'failed';
export type TranscriptionMode = 'ai' | 'hybrid' | 'human';
export type TranscriptionDomain = 'general' | 'medical' | 'legal';

export interface TranscriptSegment {
  start: number; // Start time in seconds
  end: number;   // End time in seconds
  text: string;  // Text content
  confidence?: number; // Optional confidence score
  speaker?: string; // Speaker ID (e.g., "S1", "S2", "UU" for unknown)
}

export interface TranscriptionJob {
  id?: string;
  userId: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  downloadURL: string;
  status: TranscriptionStatus;
  mode: TranscriptionMode;
  domain?: TranscriptionDomain; // Domain for specialized vocabulary
  language?: string; // Transcription language (e.g., 'en', 'fr')
  duration: number; // in seconds (exact duration)
  creditsUsed: number;
  specialInstructions?: string;
  transcript?: string;
  timestampedTranscript?: TranscriptSegment[]; // New field for timestamped data
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
  completedAt?: FirebaseFirestore.Timestamp;
  expectedSpeakerCount?: 1 | 2 | 3 | 4 | 5; // Client's expected speaker count for review/cleanup metadata
  // Add-on options
  rushDelivery?: boolean; // Whether rush delivery (24-48hr) was requested
  multipleSpeakers?: boolean; // Whether multiple speakers (3+) option was selected
  speakerCount?: number; // Number of speakers in the recording
  addOnCost?: number; // Additional cost for add-ons in CAD
  hasPackage?: boolean; // Whether user has active package (add-ons are free)
}

const TRANSCRIPTIONS_COLLECTION = 'transcriptions';

export const getTranscriptionByIdAdmin = async (id: string): Promise<TranscriptionJob | null> => {
  try {
    const docRef = adminDb.collection(TRANSCRIPTIONS_COLLECTION).doc(id);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      return {
        id: docSnap.id,
        ...docSnap.data()
      } as TranscriptionJob;
    }

    return null;
  } catch (error) {
    console.error('Error fetching transcription job from admin:', error);
    throw error;
  }
};

export const updateTranscriptionStatusAdmin = async (
  id: string,
  status: TranscriptionStatus,
  additionalData?: Partial<Omit<TranscriptionJob, 'id' | 'updatedAt' | 'createdAt'>>
): Promise<void> => {
  try {
    const docRef = adminDb.collection(TRANSCRIPTIONS_COLLECTION).doc(id);
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: FieldValue.serverTimestamp()
    };

    // Add additional data, filtering out undefined values
    if (additionalData) {
      for (const [key, value] of Object.entries(additionalData)) {
        if (value !== undefined) {
          updateData[key] = value;
        }
      }
    }

    if (status === 'complete') {
      updateData.completedAt = FieldValue.serverTimestamp();
    }

    // Add debug fingerprint to track data flow
    const debugFingerprint = {
      timestamp: Date.now(),
      buildId: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
      runtime: process.env.NEXT_RUNTIME ?? 'node',
      projectId: process.env.FIREBASE_PROJECT_ID ?? 'unknown'
    };

    console.log(`[Admin] Updating transcription ${id} with status: ${status}`);
    console.log(`[Admin] Has timestampedTranscript: ${!!additionalData?.timestampedTranscript}`);
    console.log(`[Admin] TimestampedSegments count: ${additionalData?.timestampedTranscript?.length || 0}`);
    console.log(`[Admin] Additional data keys: ${additionalData ? Object.keys(additionalData).join(', ') : 'none'}`);
    console.log(`[Admin] Fields being updated: ${Object.keys(updateData).join(', ')}`);

    // Debug the actual timestampedTranscript field
    if (additionalData?.timestampedTranscript) {
      console.log(`[Admin] timestampedTranscript type: ${typeof additionalData.timestampedTranscript}`);
      console.log(`[Admin] timestampedTranscript isArray: ${Array.isArray(additionalData.timestampedTranscript)}`);
      if (Array.isArray(additionalData.timestampedTranscript) && additionalData.timestampedTranscript[0]) {
        console.log(`[Admin] First segment: start=${additionalData.timestampedTranscript[0].start}, text="${additionalData.timestampedTranscript[0].text}"`);
      }
    } else {
      console.log(`[Admin] timestampedTranscript is null/undefined`);
    }

    // Add debug fingerprint to the actual document
    updateData._debugWriter = debugFingerprint;

    await docRef.update(updateData);
    console.log(`[Admin] Updated transcription ${id} status to ${status}`);
  } catch (error) {
    console.error(`Error updating transcription status for ${id}:`, error);
    throw error;
  }
};

export const getAllTranscriptionJobsAdmin = async (): Promise<TranscriptionJob[]> => {
  try {
    const querySnapshot = await adminDb
      .collection(TRANSCRIPTIONS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TranscriptionJob));
  } catch (error) {
    console.error('Error fetching all transcription jobs:', error);
    throw error;
  }
};

export const getTranscriptionJobsByStatusAdmin = async (status: TranscriptionStatus): Promise<TranscriptionJob[]> => {
  try {
    const querySnapshot = await adminDb
      .collection(TRANSCRIPTIONS_COLLECTION)
      .where('status', '==', status)
      .orderBy('createdAt', 'desc')
      .get();

    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as TranscriptionJob));
  } catch (error) {
    console.error(`Error fetching transcription jobs by status ${status}:`, error);
    throw error;
  }
};

export const getModeDetails = (mode: TranscriptionMode) => {
  const modeMap = {
    ai: {
      name: 'AI Transcription',
      description: 'Fast, automated transcription with good accuracy',
      creditsPerMinute: 100, // Legacy support
      costPerMinute: 0.40, // Pay as you go rate in CAD
      turnaround: '60 minutes'
    },
    hybrid: {
      name: 'Hybrid Review',
      description: 'AI transcription reviewed by human experts',
      creditsPerMinute: 150, // Legacy support
      costPerMinute: 1.50, // Pay as you go rate in CAD
      turnaround: '3-5 business days'
    },
    human: {
      name: 'Human Transcription',
      description: 'Professional human transcription for highest accuracy',
      creditsPerMinute: 200, // Legacy support
      costPerMinute: 2.50, // Pay as you go rate in CAD
      turnaround: '3-5 business days'
    }
  };

  return modeMap[mode];
};
