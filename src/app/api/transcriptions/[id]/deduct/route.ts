import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { TRANSCRIPTION_MODE_RATES, supportsTranscriptionAddOns, transcriptionAddOnRate } from '@/lib/billing/transcription-rates';
import { packageAvailableMinutes } from '@/lib/billing/package-reservations';

function billingMinutes(seconds: number) {
  if (!seconds || seconds <= 0) return 1;
  const roundedSeconds = Math.round(seconds * 100) / 100;
  const minutes = roundedSeconds / 60;
  return Math.abs(minutes - Math.round(minutes)) < 0.0002 ? Math.round(minutes) : Math.ceil(minutes);
}

function expiryMillis(value: unknown) {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : Number.POSITIVE_INFINITY;
  }
  return Number.POSITIVE_INFINITY;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const { id } = await params;
    const jobRef = adminDb.collection('transcriptions').doc(id);
    const userRef = adminDb.collection('users').doc(decoded.uid);
    const ledgerRef = adminDb.collection('transactions').doc(`transcription_billing_${id}`);

    const result = await adminDb.runTransaction(async transaction => {
      const [jobSnapshot, userSnapshot, ledgerSnapshot] = await Promise.all([
        transaction.get(jobRef), transaction.get(userRef), transaction.get(ledgerRef),
      ]);
      if (!jobSnapshot.exists) throw new Error('JOB_NOT_FOUND');
      if (!userSnapshot.exists) throw new Error('USER_NOT_FOUND');
      const job = jobSnapshot.data() || {};
      const user = userSnapshot.data() || {};
      if (job.userId !== decoded.uid) throw new Error('FORBIDDEN');
      if (!['ai', 'hybrid', 'human'].includes(job.mode)) throw new Error('INVALID_MODE');
      if (ledgerSnapshot.exists) return { duplicate: true, ...(ledgerSnapshot.data() || {}) };
      if (job.packageReservationStatus === 'reserved') throw new Error('ADD_ON_CHECKOUT_REQUIRED');
      if (job.packageReservationStatus === 'consumed') throw new Error('PAYMENT_RECONCILIATION_REQUIRED');

      const mode = job.mode as keyof typeof TRANSCRIPTION_MODE_RATES;
      const minutes = billingMinutes(Number(job.duration || 0));
      const packages = Array.isArray(user.packages) ? [...user.packages] : [];
      const eligible = packages
        .map((pkg, index) => ({ pkg, index }))
        .filter(({ pkg }) => pkg?.type === mode && pkg?.active !== false && packageAvailableMinutes(pkg) > 0 && expiryMillis(pkg?.expiresAt) > Date.now())
        .sort((a, b) => Number(a.pkg?.rate || 0) - Number(b.pkg?.rate || 0));

      let remaining = minutes;
      let freeTrialMinutesUsed = 0;
      let packageMinutesUsed = 0;
      let packageValueUsed = 0;
      const currentTrial = Number(user.freeTrialMinutes || 0);
      const currentTrialUsed = Number(user.freeTrialMinutesUsed || 0);
      if (mode === 'ai' && user.freeTrialActive === true && currentTrial > 0) {
        freeTrialMinutesUsed = Math.min(remaining, currentTrial);
        remaining -= freeTrialMinutesUsed;
      }

      for (const { pkg, index } of eligible) {
        if (remaining <= 0) break;
        const used = Math.min(remaining, packageAvailableMinutes(pkg));
        packages[index] = {
          ...pkg,
          minutesUsed: Number(pkg.minutesUsed || 0) + used,
          minutesRemaining: Number(pkg.minutesRemaining || 0) - used,
        };
        packageMinutesUsed += used;
        packageValueUsed += used * Number(pkg.rate || 0);
        remaining -= used;
      }

      const addOnRate = transcriptionAddOnRate(mode, {
        rushDelivery: job.rushDelivery,
        speakerCount: job.speakerCount,
      });
      if (packageMinutesUsed > 0 && addOnRate > 0) throw new Error('ADD_ON_CHECKOUT_REQUIRED');
      const addOnCost = minutes * addOnRate;
      const walletUsed = (remaining * TRANSCRIPTION_MODE_RATES[mode]) + addOnCost;
      const currentWallet = Number(user.walletBalance || 0);
      if (currentWallet < walletUsed) throw new Error('PAYMENT_REQUIRED');

      const userUpdates: Record<string, unknown> = {
        walletBalance: currentWallet - walletUsed,
        packages,
        minutesUsedThisMonth: FieldValue.increment(minutes),
        updatedAt: FieldValue.serverTimestamp(),
      };
      if (freeTrialMinutesUsed > 0) {
        const trialRemaining = currentTrial - freeTrialMinutesUsed;
        userUpdates.freeTrialMinutes = trialRemaining;
        userUpdates.freeTrialMinutesUsed = currentTrialUsed + freeTrialMinutesUsed;
        if (trialRemaining <= 0) userUpdates.freeTrialActive = false;
      }

      const billingType = freeTrialMinutesUsed === minutes
        ? 'ai-free-trial'
        : packageMinutesUsed > 0 && remaining === 0
          ? 'package'
          : 'pay-as-you-go';
      transaction.update(userRef, userUpdates);
      transaction.update(jobRef, {
        paymentStatus: freeTrialMinutesUsed === minutes ? 'free-trial' : 'paid',
        billingType,
        freeTrialMinutesUsed,
        hasPackage: packageMinutesUsed > 0,
        ...(supportsTranscriptionAddOns(mode) ? { addOnCost } : {}),
        creditsUsed: Math.round(walletUsed * 100),
        updatedAt: FieldValue.serverTimestamp(),
      });
      const ledger = {
        userId: decoded.uid,
        type: 'transcription',
        amount: -(packageValueUsed + walletUsed),
        description: `${mode.toUpperCase()} transcription: ${minutes} minutes`,
        jobId: id,
        freeTrialMinutesUsed,
        packageMinutesUsed,
        walletUsed,
        minutesUsed: minutes,
        billingType,
        costDeducted: packageValueUsed + walletUsed,
        createdAt: FieldValue.serverTimestamp(),
      };
      transaction.create(ledgerRef, ledger);
      return { duplicate: false, ...ledger, costDeducted: packageValueUsed + walletUsed };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const responses: Record<string, [number, string]> = {
      JOB_NOT_FOUND: [404, 'Transcription job not found'], USER_NOT_FOUND: [404, 'User profile not found'],
      FORBIDDEN: [403, 'You do not own this transcription job'], INVALID_MODE: [400, 'Unsupported transcription mode'],
      PAYMENT_REQUIRED: [402, 'Insufficient pay-as-you-go balance for this transcription'],
      ADD_ON_CHECKOUT_REQUIRED: [409, 'Complete the secure add-on checkout before submitting this package-funded job.'],
      PAYMENT_RECONCILIATION_REQUIRED: [409, 'This paid package job requires billing reconciliation before it can continue.'],
    };
    if (responses[code]) return NextResponse.json({ ok: false, error: responses[code][1] }, { status: responses[code][0] });
    console.error('[Transcription Billing] Deduction failed:', error);
    return NextResponse.json({ ok: false, error: 'Unable to process transcription billing' }, { status: 500 });
  }
}
