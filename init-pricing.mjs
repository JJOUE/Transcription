/**
 * Initialize pricing settings in Firestore
 * Run with: node init-pricing.mjs
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

const app = initializeApp({
  credential: cert(serviceAccount),
  projectId: serviceAccount.projectId,
});

const db = getFirestore(app);

async function initializePricing() {
  try {
    console.log('🔧 Initializing pricing settings in Firestore...\n');

    const settingsRef = db.collection('settings').doc('pricing');
    const doc = await settingsRef.get();

    if (doc.exists) {
      console.log('✓ Pricing settings already exist:');
      const data = doc.data();
      console.log('  AI: $' + data.payAsYouGo.ai + '/min');
      console.log('  Hybrid: $' + data.payAsYouGo.hybrid + '/min');
      console.log('  Human: $' + data.payAsYouGo.human + '/min');
      console.log('\n✓ No changes needed. Settings are already initialized.');
    } else {
      await settingsRef.set({
        payAsYouGo: {
          ai: 0.05,
          hybrid: 1.50,
          human: 2.50
        },
        updatedAt: FieldValue.serverTimestamp()
      });

      console.log('✓ Pricing settings created successfully!');
      console.log('\nDefault pricing:');
      console.log('  AI: $0.05/min');
      console.log('  Hybrid: $1.50/min');
      console.log('  Human: $2.50/min');
      console.log('\n📝 You can update these from the admin panel at:');
      console.log('   https://www.talktotext.ca/admin/packages');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

initializePricing();
