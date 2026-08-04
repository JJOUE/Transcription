import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './config';
import type { UserData } from './auth';

export const getAllUsers = async (): Promise<UserData[]> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserData));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};
