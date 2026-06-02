import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

export interface ClientDictionaryTerm {
  id: string;
  term: string;
  normalizedTerm: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
  source: 'manual-upload';
  useCount?: number;
  lastUsedAt?: Timestamp;
}

const MAX_PROJECT_DICTIONARY_TERMS = 100;
const MAX_SAVED_CLIENT_TERMS = 500;

export const normalizeClientDictionaryTerm = (term: string) =>
  term.trim().replace(/\s+/g, ' ');

export const getNormalizedClientDictionaryKey = (term: string) =>
  normalizeClientDictionaryTerm(term).toLocaleLowerCase();

export const parseDictionaryTermsInput = (input: string) =>
  input
    .split(/\r?\n|,/)
    .map(normalizeClientDictionaryTerm)
    .filter(Boolean);

export const dedupeDictionaryTerms = (terms: string[], limit = MAX_PROJECT_DICTIONARY_TERMS) => {
  const seen = new Set<string>();
  const deduped: string[] = [];

  terms.forEach((term) => {
    const normalizedTerm = normalizeClientDictionaryTerm(term);
    const key = getNormalizedClientDictionaryKey(normalizedTerm);

    if (!normalizedTerm || seen.has(key)) return;

    seen.add(key);
    deduped.push(normalizedTerm);
  });

  return deduped.slice(0, limit);
};

const getClientDictionaryCollection = (uid: string) =>
  collection(db, 'users', uid, 'clientDictionaryTerms');

const getClientDictionaryTermDoc = (uid: string, normalizedTerm: string) =>
  doc(db, 'users', uid, 'clientDictionaryTerms', encodeURIComponent(normalizedTerm));

export const getClientDictionaryTerms = async (uid: string): Promise<ClientDictionaryTerm[]> => {
  const termsQuery = query(getClientDictionaryCollection(uid), orderBy('term', 'asc'));
  const snapshot = await getDocs(termsQuery);

  return snapshot.docs.map((termDoc) => ({
    id: termDoc.id,
    ...termDoc.data(),
  } as ClientDictionaryTerm));
};

export const saveClientDictionaryTerms = async (uid: string, terms: string[]) => {
  const termsToSave = dedupeDictionaryTerms(terms, MAX_SAVED_CLIENT_TERMS);

  await Promise.all(
    termsToSave.map(async (term) => {
      const normalizedTerm = getNormalizedClientDictionaryKey(term);
      const termRef = getClientDictionaryTermDoc(uid, normalizedTerm);
      const existingTerm = await getDoc(termRef);

      return setDoc(
        termRef,
        {
          term,
          normalizedTerm,
          source: 'manual-upload' as const,
          ...(!existingTerm.exists() && {
            createdAt: serverTimestamp(),
          }),
          updatedAt: serverTimestamp(),
          useCount: increment(1),
          lastUsedAt: serverTimestamp(),
        },
        { merge: true }
      );
    })
  );
};
