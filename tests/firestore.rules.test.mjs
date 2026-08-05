import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  deleteDoc,
  doc,
  getDoc,
  setDoc,
  updateDoc,
} from 'firebase/firestore';

const projectId = 'talk-to-text-rules-test';
let testEnv;

const ownerDb = () => testEnv.authenticatedContext('owner').firestore();
const otherDb = () => testEnv.authenticatedContext('other').firestore();
const adminDb = () => testEnv.authenticatedContext('admin').firestore();

before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: await readFile('../firestore.rules', 'utf8') },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();
  await testEnv.withSecurityRulesDisabled(async context => {
    const db = context.firestore();
    await setDoc(doc(db, 'users/owner'), {
      uid: 'owner', email: 'owner@example.test', role: 'user', name: 'Owner',
      walletBalance: 0, freeTrialMinutes: 60, packages: [],
    });
    await setDoc(doc(db, 'users/other'), {
      uid: 'other', email: 'other@example.test', role: 'user', name: 'Other',
      walletBalance: 0, freeTrialMinutes: 60, packages: [],
    });
    await setDoc(doc(db, 'users/admin'), {
      uid: 'admin', email: 'admin@example.test', role: 'admin', name: 'Admin',
    });
    await setDoc(doc(db, 'transcriptions/project-one'), {
      userId: 'owner', type: 'office', mode: 'human', filename: 'source.wav',
      status: 'pending-review', officeStatus: 'submitted', paymentStatus: 'quote-required',
      officeQuote: { quoteId: 'quote-1', version: 1, total: 25 },
    });
    await setDoc(doc(db, 'users/owner/packages/pkg-1'), {
      type: 'human', minutesRemaining: 100,
    });
    await setDoc(doc(db, 'transactions/owner-transaction'), {
      userId: 'owner', type: 'package_purchase', amount: 100,
    });
    await setDoc(doc(db, 'transactions/other-transaction'), {
      userId: 'other', type: 'package_purchase', amount: 100,
    });
  });
});

after(async () => testEnv?.cleanup());

describe('project ownership and protected workflow fields', () => {
  test('owner reads own project and unrelated user cannot', async () => {
    await assertSucceeds(getDoc(doc(ownerDb(), 'transcriptions/project-one')));
    await assertFails(getDoc(doc(otherDb(), 'transcriptions/project-one')));
  });

  for (const [label, update] of [
    ['payment status', { paymentStatus: 'paid' }],
    ['quote fields', { quoteStatus: 'quote-accepted' }],
    ['Stripe identifiers', { stripeCheckoutSessionId: 'cs_test_synthetic' }],
    ['project status', { status: 'complete' }],
    ['office status', { officeStatus: 'completed' }],
    ['completion timestamp', { completedAt: new Date() }],
    ['completed URL', { officeCompletedDocumentURL: 'https://example.test/file' }],
    ['completed path', { officeCompletedDocumentPath: 'transcriptions/owner/project-one/completed-document/file.pdf' }],
  ]) {
    test(`owner cannot change ${label}`, async () => {
      await assertFails(updateDoc(doc(ownerDb(), 'transcriptions/project-one'), update));
    });
  }

  test('owner may edit transcript content', async () => {
    await assertSucceeds(updateDoc(doc(ownerDb(), 'transcriptions/project-one'), {
      transcript: 'Client-edited transcript text', updatedAt: new Date(),
    }));
  });

  test('owner cannot mark a transcript complete while saving permitted edits', async () => {
    await assertFails(updateDoc(doc(ownerDb(), 'transcriptions/project-one'), {
      transcript: 'Edited text', status: 'complete', completedAt: new Date(), updatedAt: new Date(),
    }));
  });

  test('intentional public sharing permits only explicitly shared projects', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, 'transcriptions/public-project'), {
        userId: 'owner', mode: 'ai', status: 'complete', isShared: true,
      });
      await setDoc(doc(db, 'transcriptions/private-project'), {
        userId: 'owner', mode: 'ai', status: 'complete', isShared: false,
      });
    });
    const signedOutDb = testEnv.unauthenticatedContext().firestore();
    await assertSucceeds(getDoc(doc(signedOutDb, 'transcriptions/public-project')));
    await assertFails(getDoc(doc(signedOutDb, 'transcriptions/private-project')));
  });

  test('admin may update protected project state', async () => {
    await assertSucceeds(updateDoc(doc(adminDb(), 'transcriptions/project-one'), {
      paymentStatus: 'paid', status: 'complete', completedAt: new Date(),
    }));
  });
});

describe('user entitlement and profile fields', () => {
  for (const [label, update] of [
    ['packages', { packages: [{ type: 'human', minutesRemaining: 999 }] }],
    ['wallet balance', { walletBalance: 999 }],
    ['free trial', { freeTrialMinutes: 999 }],
  ]) {
    test(`owner cannot change ${label}`, async () => {
      await assertFails(updateDoc(doc(ownerDb(), 'users/owner'), update));
    });
  }

  test('owner may update approved profile fields', async () => {
    await assertSucceeds(updateDoc(doc(ownerDb(), 'users/owner'), {
      name: 'Updated Owner', phone: '555-0100', preferredLanguage: 'en',
    }));
  });

  test('owner cannot create, update, or delete package records', async () => {
    await assertFails(setDoc(doc(ownerDb(), 'users/owner/packages/new'), { type: 'ai', minutesRemaining: 60 }));
    await assertFails(updateDoc(doc(ownerDb(), 'users/owner/packages/pkg-1'), { minutesRemaining: 999 }));
    await assertFails(deleteDoc(doc(ownerDb(), 'users/owner/packages/pkg-1')));
  });

  test('owner reads own package and not another user package', async () => {
    await assertSucceeds(getDoc(doc(ownerDb(), 'users/owner/packages/pkg-1')));
    await assertFails(getDoc(doc(otherDb(), 'users/owner/packages/pkg-1')));
  });

  test('admin may write package records', async () => {
    await assertSucceeds(setDoc(doc(adminDb(), 'users/owner/packages/admin-package'), {
      type: 'ai', minutesRemaining: 60,
    }));
  });
});

describe('financial records and server-only subcollections', () => {
  test('owner cannot create arbitrary transaction records', async () => {
    await assertFails(setDoc(doc(ownerDb(), 'transactions/fake'), {
      userId: 'owner', type: 'package_purchase', amount: 999,
    }));
  });

  test('owner reads only own transactions and admin reads all', async () => {
    await assertSucceeds(getDoc(doc(ownerDb(), 'transactions/owner-transaction')));
    await assertFails(getDoc(doc(ownerDb(), 'transactions/other-transaction')));
    await assertSucceeds(getDoc(doc(adminDb(), 'transactions/other-transaction')));
  });

  test('clients cannot write or read admin quote snapshots and audit events', async () => {
    await assertFails(setDoc(doc(ownerDb(), 'transcriptions/project-one/quoteAdminSnapshots/q1'), { total: 25 }));
    await assertFails(setDoc(doc(ownerDb(), 'transcriptions/project-one/auditEvents/e1'), { event: 'payment-confirmed' }));
    await assertFails(getDoc(doc(ownerDb(), 'transcriptions/project-one/quoteAdminSnapshots/q1')));
    await assertFails(getDoc(doc(ownerDb(), 'transcriptions/project-one/auditEvents/e1')));
  });

  test('Admin SDK-style writes bypass rules in the emulator', async () => {
    await testEnv.withSecurityRulesDisabled(async context => {
      const db = context.firestore();
      await setDoc(doc(db, 'transcriptions/project-one/quoteAdminSnapshots/q1'), { total: 25 });
      await updateDoc(doc(db, 'transcriptions/project-one'), { paymentStatus: 'paid' });
    });
    assert.equal((await getDoc(doc(adminDb(), 'transcriptions/project-one'))).data().paymentStatus, 'paid');
    await assertSucceeds(getDoc(doc(adminDb(), 'transcriptions/project-one/quoteAdminSnapshots/q1')));
  });
});
