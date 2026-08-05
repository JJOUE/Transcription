import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { releasePackageReservation, stripeSessionAllowsReservationRelease } from '@/lib/billing/package-reservations';
import { timingSafeEqual } from 'node:crypto';

function secretsMatch(received: string | undefined, configured: string | undefined) {
  if (!received || !configured) return false;
  const receivedBuffer = Buffer.from(received);
  const configuredBuffer = Buffer.from(configured);
  return receivedBuffer.length === configuredBuffer.length && timingSafeEqual(receivedBuffer, configuredBuffer);
}

async function authorize(request: NextRequest) {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (secretsMatch(bearer, process.env.CRON_SECRET)) return { actor: 'scheduled-task' };
  const token = request.cookies.get('auth-token')?.value || bearer;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const user = await adminDb.collection('users').doc(decoded.uid).get();
    return user.data()?.role === 'admin' ? { actor: decoded.uid } : null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authorization = await authorize(request);
    if (!authorization) return NextResponse.json({ ok: false, error: 'Admin or scheduled-task access required' }, { status: 403 });
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ ok: false, error: 'Stripe is not configured' }, { status: 503 });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' });
    const now = Timestamp.now();
    const candidates = await adminDb.collection('transcriptions')
      .where('packageReservationExpiresAt', '<=', now)
      .limit(100)
      .get();
    const summary = { inspected: 0, released: 0, preserved: 0, errors: 0 };

    for (const snapshot of candidates.docs) {
      const job = snapshot.data();
      if (job.packageReservationStatus !== 'reserved') continue;
      summary.inspected += 1;
      const sessionId = job.stripeAddOnCheckoutSessionId;
      if (!sessionId) {
        summary.preserved += 1;
        continue;
      }
      try {
        let session = await stripe.checkout.sessions.retrieve(sessionId);
        if (session.status === 'open' && Number(session.expires_at || 0) * 1000 <= Date.now()) {
          session = await stripe.checkout.sessions.expire(session.id);
        }
        if (!stripeSessionAllowsReservationRelease(session)) {
          summary.preserved += 1;
          continue;
        }

        const released = await adminDb.runTransaction(async transaction => {
          const currentJob = await transaction.get(snapshot.ref);
          if (!currentJob.exists) return false;
          const current = currentJob.data() || {};
          if (current.packageReservationStatus !== 'reserved' || current.stripeAddOnCheckoutSessionId !== session.id) return false;
          const userRef = adminDb.collection('users').doc(String(current.userId || ''));
          const userSnapshot = await transaction.get(userRef);
          if (!userSnapshot.exists) return false;
          const packages = releasePackageReservation(userSnapshot.data()?.packages || [], current.packageReservationAllocations || []);
          if (!packages) return false;
          transaction.update(userRef, { packages, updatedAt: FieldValue.serverTimestamp() });
          transaction.update(snapshot.ref, {
            packageReservationStatus: 'released', packageReservationReleasedAt: FieldValue.serverTimestamp(),
            packageReservationReleasedBy: authorization.actor, addOnPaymentStatus: 'expired',
            stripeAddOnCheckoutUrl: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(),
          });
          return true;
        });
        if (released) summary.released += 1;
        else summary.preserved += 1;
      } catch {
        summary.errors += 1;
        summary.preserved += 1;
      }
    }
    return NextResponse.json({ ok: true, ...summary });
  } catch (error) {
    console.error('[Package Reservation Reconciliation] Failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ ok: false, error: 'Unable to reconcile package reservations' }, { status: 500 });
  }
}

// Vercel Cron invokes routes with GET; both methods share identical authorization.
export const GET = POST;
