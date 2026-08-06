import { collection, getDocs } from 'firebase/firestore';
import { db } from './config';
import { normalizeUserPackages } from '@/lib/utils/user-package-normalization';

export * from '@/lib/utils/user-package-normalization';

export const loadNormalizedUserPackages = async (userId: string, embeddedPackages?: unknown) => {
  try {
    const snapshot = await getDocs(collection(db, 'users', userId, 'packages'));
    const subcollectionPackages = snapshot.docs.map(packageDoc => ({
      id: packageDoc.id,
      ...packageDoc.data(),
    }));
    return normalizeUserPackages(embeddedPackages, subcollectionPackages);
  } catch (error) {
    console.warn('Unable to load package subcollection; using embedded package records.', error);
    return normalizeUserPackages(embeddedPackages);
  }
};
