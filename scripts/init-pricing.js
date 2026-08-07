/**
 * Initialize default pricing settings in Firestore
 * Run with: node scripts/init-pricing.js
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: serviceAccount.projectId,
});

const db = admin.firestore();

async function initializePricingSettings() {
  try {
    console.log('Initializing pricing settings...');

    const settingsRef = db.collection('settings').doc('pricing');

    // Check if settings already exist
    const doc = await settingsRef.get();

    if (doc.exists) {
      console.log('✓ Pricing settings already exist:');
      console.log(JSON.stringify(doc.data(), null, 2));

      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      const answer = await new Promise(resolve => {
        readline.question('\nOverwrite existing settings? (y/N): ', resolve);
      });
      readline.close();

      if (answer.toLowerCase() !== 'y') {
        console.log('Aborted. No changes made.');
        process.exit(0);
      }
    }

    // Create/update pricing settings with default values
    const defaultPricing = {
      payAsYouGo: {
        ai: 0.05,
        hybrid: 1.50,
        human: 2.50
      },
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await settingsRef.set(defaultPricing);

    console.log('\n✓ Pricing settings initialized successfully!');
    console.log('\nDefault pricing:');
    console.log('  AI: $0.05/min');
    console.log('  Hybrid: $1.50/min');
    console.log('  Human: $2.50/min');
    console.log('\nYou can now update these from the admin panel at:');
    console.log('https://www.talktotext.ca/admin/packages');

    process.exit(0);
  } catch (error) {
    console.error('Error initializing pricing settings:', error);
    process.exit(1);
  }
}

initializePricingSettings();
