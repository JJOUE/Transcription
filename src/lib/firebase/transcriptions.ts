import { collection, doc, addDoc, getDocs, getDoc, updateDoc, query, where, orderBy, Timestamp, deleteDoc } from 'firebase/firestore';
import { db } from './config';

export type TranscriptionStatus = 'processing' | 'pending-review' | 'pending-transcription' | 'complete' | 'failed';
export type TranscriptionMode = 'ai' | 'hybrid' | 'human';
export type OfficeStatus = 'submitted' | 'assigned' | 'in_progress' | 'waiting_review' | 'completed' | 'delivered';
export type OfficePriority = 'standard' | 'rush' | 'same_day';

export interface TranscriptSegment {
  start: number; // Start time in seconds
  end: number;   // End time in seconds
  text: string;  // Text content
  speaker?: string; // Speaker identifier (e.g., "S1", "S2", "UU" for unidentified)
  confidence?: number; // Optional confidence score
}

export interface TranscriptionJob {
  id?: string;
  userId: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  downloadURL: string;
  status: TranscriptionStatus;
  type?: 'transcription' | 'office';
  mode: TranscriptionMode;
  domain?: string; // Transcription domain (general, medical, legal, technical)
  language?: string; // Transcription language (e.g., 'en', 'fr')
  duration: number; // in seconds (exact duration)
  minutesFromSubscription?: number; // Minutes covered by subscription (if any)
  creditsUsed: number; // Credits used for minutes not covered by subscription
  specialInstructions?: string;
  projectDictionaryTerms?: string[]; // Project-only names/terms supplied at upload time
  transcript?: string;
  timestampedTranscript?: TranscriptSegment[]; // New field for timestamped data
  transcriptStoragePath?: string; // Path to transcript in Storage (for large files)
  speechmaticsJobId?: string; // Speechmatics job ID for tracking
  segmentCount?: number; // Number of timestamped segments (for large files stored in Storage)
  transcriptLength?: number; // Length of transcript text (for large files stored in Storage)
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
  // Template metadata fields
  clientName?: string;
  projectName?: string;
  providerName?: string;
  patientName?: string;
  location?: string;
  recordingTime?: string;
  // Sharing fields
  isShared?: boolean; // Whether this transcript is publicly shareable
  shareId?: string; // Unique ID for sharing (different from document ID for security)
  sharedAt?: Timestamp; // When sharing was enabled
  // Speaker customization
  speakerNames?: Record<string, string>; // Custom names for speakers (e.g., {"S1": "John", "S2": "Mary"})
  // Filler words option
  includeFiller?: boolean; // Whether to include filler words (um, uh, etc.) in the transcript
  expectedSpeakerCount?: 1 | 2 | 3 | 4 | 5; // Client's expected speaker count for review/cleanup metadata
  // Add-on options
  rushDelivery?: boolean; // Whether rush delivery (24-48hr) was requested
  multipleSpeakers?: boolean; // Whether multiple speakers (3+) option was selected
  speakerCount?: number; // Number of speakers in the recording
  addOnCost?: number; // Additional cost for add-ons in CAD
  hasPackage?: boolean; // Whether user has active package (add-ons are free)
  // Template for human transcription
  templatePath?: string; // Path to template file in Storage
  templateURL?: string; // Download URL for template file
  templateFilename?: string; // Original template filename
  // Admin-uploaded transcript file (served as-is to users)
  adminTranscriptPath?: string; // Storage path for admin-uploaded transcript
  adminTranscriptURL?: string; // Download URL for admin-uploaded transcript
  adminTranscriptFilename?: string; // Original filename of admin-uploaded transcript
  // Office Studio specific fields
  assignedTypist?: string; // UID of assigned typist
  assignedTypistName?: string; // Name of assigned typist
  officeDueDate?: Timestamp; // Due date for Office Studio project
  officePriority?: OfficePriority; // Priority level (standard, rush, same_day)
  officeStatus?: OfficeStatus; // Office-specific workflow status
  officeNotes?: string; // Additional notes for office projects
  officeCompletedDocumentURL?: string; // Download URL for completed document
  officeCompletedDocumentPath?: string; // Storage path for completed document
  officeCompletedFilename?: string; // Filename of completed document
  officeReviewed?: boolean; // Whether Office project has been reviewed
  officeTemplateCategory?: string; // Category of template used (for template library)
  officeTemplateName?: string; // Name of template used (for template library)
}

const TRANSCRIPTIONS_COLLECTION = 'transcriptions';

export const createTranscriptionJob = async (job: Omit<TranscriptionJob, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = Timestamp.now();
  const jobWithTimestamps = {
     type: 'transcription',
    ...job,
    createdAt: now,
    updatedAt: now
  };
  
  const docRef = await addDoc(collection(db, TRANSCRIPTIONS_COLLECTION), jobWithTimestamps);
  return docRef.id;
};

export const getTranscriptionsByUser = async (userId: string): Promise<TranscriptionJob[]> => {
  const q = query(
    collection(db, TRANSCRIPTIONS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TranscriptionJob));
};

export const getTranscriptionById = async (id: string): Promise<TranscriptionJob | null> => {
  const docRef = doc(db, TRANSCRIPTIONS_COLLECTION, id);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...docSnap.data()
    } as TranscriptionJob;
  }
  
  return null;
};

export const updateTranscriptionStatus = async (
  id: string, 
  status: TranscriptionStatus, 
  additionalData?: Partial<TranscriptionJob>
): Promise<void> => {
  const docRef = doc(db, TRANSCRIPTIONS_COLLECTION, id);
  const updateData: Partial<TranscriptionJob> = {
    status,
    updatedAt: Timestamp.now(),
    ...additionalData
  };
  
  if (status === 'complete') {
    updateData.completedAt = Timestamp.now();
  }
  
  await updateDoc(docRef, updateData);
};

export const updateTranscriptionTranscript = async (id: string, transcript: string): Promise<void> => {
  const docRef = doc(db, TRANSCRIPTIONS_COLLECTION, id);
  await updateDoc(docRef, {
    transcript,
    status: 'complete' as TranscriptionStatus,
    updatedAt: Timestamp.now(),
    completedAt: Timestamp.now()
  });
};

export const deleteTranscriptionJob = async (id: string): Promise<void> => {
  const docRef = doc(db, TRANSCRIPTIONS_COLLECTION, id);
  await deleteDoc(docRef);
};

export const getAllTranscriptionJobs = async (): Promise<TranscriptionJob[]> => {
  const q = query(
    collection(db, TRANSCRIPTIONS_COLLECTION),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TranscriptionJob));
};

export const getTranscriptionJobsByStatus = async (status: TranscriptionStatus): Promise<TranscriptionJob[]> => {
  const q = query(
    collection(db, TRANSCRIPTIONS_COLLECTION),
    where('status', '==', status),
    orderBy('createdAt', 'desc')
  );
  
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TranscriptionJob));
};

export const approveTranscriptionReview = async (id: string): Promise<void> => {
  await updateTranscriptionStatus(id, 'complete');
};

export const rejectTranscriptionJob = async (id: string, reason?: string): Promise<void> => {
  const additionalData: Partial<TranscriptionJob> = {};
  if (reason) {
    additionalData.specialInstructions = reason;
  }
  await updateTranscriptionStatus(id, 'failed', additionalData);
};

export const submitHumanTranscription = async (id: string, transcript: string): Promise<void> => {
  await updateTranscriptionTranscript(id, transcript);
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
      name: 'Dictation & Human Transcription',
      description: 'Professional human transcription for dictation and highest accuracy',
      creditsPerMinute: 200, // Legacy support
      costPerMinute: 2.50, // Pay as you go rate in CAD
      turnaround: '3-5 business days'
    }
  };

  return modeMap[mode];
};

// Sharing functions
export const toggleTranscriptSharing = async (id: string, isShared: boolean): Promise<string | null> => {
  const docRef = doc(db, TRANSCRIPTIONS_COLLECTION, id);

  if (isShared) {
    // Generate unique share ID
    const shareId = `${id}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    await updateDoc(docRef, {
      isShared: true,
      shareId,
      sharedAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return shareId;
  } else {
    // Disable sharing
    await updateDoc(docRef, {
      isShared: false,
      shareId: null,
      sharedAt: null,
      updatedAt: Timestamp.now()
    });
    return null;
  }
};

export const getTranscriptionByShareId = async (shareId: string): Promise<TranscriptionJob | null> => {
  const q = query(
    collection(db, TRANSCRIPTIONS_COLLECTION),
    where('shareId', '==', shareId),
    where('isShared', '==', true)
  );

  const querySnapshot = await getDocs(q);

  if (querySnapshot.empty) {
    return null;
  }

  const doc = querySnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  } as TranscriptionJob;
};

// Office Studio specific functions
export const updateOfficeStatus = async (
  id: string,
  officeStatus: OfficeStatus,
  additionalData?: Partial<TranscriptionJob>
): Promise<void> => {
  const docRef = doc(db, TRANSCRIPTIONS_COLLECTION, id);
  const updateData: Partial<TranscriptionJob> = {
    officeStatus,
    updatedAt: Timestamp.now(),
    ...additionalData
  };

  // Mark as completed when delivered
  if (officeStatus === 'delivered') {
    updateData.completedAt = Timestamp.now();
  }

  await updateDoc(docRef, updateData);
};

export const assignOfficeTypist = async (
  id: string,
  typistId: string,
  typistName: string
): Promise<void> => {
  const docRef = doc(db, TRANSCRIPTIONS_COLLECTION, id);
  await updateDoc(docRef, {
    assignedTypist: typistId,
    assignedTypistName: typistName,
    officeStatus: 'assigned' as OfficeStatus,
    updatedAt: Timestamp.now()
  });
};

export const uploadOfficeCompletedDocument = async (
  id: string,
  documentPath: string,
  documentURL: string,
  filename: string
): Promise<void> => {
  const docRef = doc(db, TRANSCRIPTIONS_COLLECTION, id);
  await updateDoc(docRef, {
    officeCompletedDocumentPath: documentPath,
    officeCompletedDocumentURL: documentURL,
    officeCompletedFilename: filename,
    officeStatus: 'completed' as OfficeStatus,
    updatedAt: Timestamp.now()
  });
};

export const setOfficeProjectDueDate = async (
  id: string,
  dueDate: Timestamp,
  priority: OfficePriority = 'standard'
): Promise<void> => {
  const docRef = doc(db, TRANSCRIPTIONS_COLLECTION, id);
  await updateDoc(docRef, {
    officeDueDate: dueDate,
    officePriority: priority,
    updatedAt: Timestamp.now()
  });
};

export const getOfficeProjectsByStatus = async (
  status: OfficeStatus
): Promise<TranscriptionJob[]> => {
  const q = query(
    collection(db, TRANSCRIPTIONS_COLLECTION),
    where('type', '==', 'office'),
    where('officeStatus', '==', status),
    orderBy('officeDueDate', 'asc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TranscriptionJob));
};

export const getOverdueOfficeProjects = async (): Promise<TranscriptionJob[]> => {
  const now = Timestamp.now();
  const q = query(
    collection(db, TRANSCRIPTIONS_COLLECTION),
    where('type', '==', 'office'),
    where('officeDueDate', '<', now),
    orderBy('officeDueDate', 'asc')
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  } as TranscriptionJob));
};
