import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from './config';
import type { UserData } from './auth';
import { loadNormalizedUserPackages } from './user-packages';

export const getAllUsers = async (): Promise<UserData[]> => {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    
    return Promise.all(snapshot.docs.map(async userDoc => {
      const data = userDoc.data();
      const packages = await loadNormalizedUserPackages(userDoc.id, data.packages);
      return {
        id: userDoc.id,
        ...data,
        packages,
      } as unknown as UserData;
    }));
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
};
