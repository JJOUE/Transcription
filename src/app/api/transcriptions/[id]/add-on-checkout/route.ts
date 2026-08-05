import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { transcriptionAddOnQuote } from '@/lib/billing/transcription-rates';
import { releasePackageReservation, reservePackageMinutes } from '@/lib/billing/package-reservations';
import { isPackageAddOnCheckoutEnabled } from '@/lib/billing/package-add-on-feature';

const RESERVATION_MINUTES = 31;

function billingMinutes(seconds: number) {
  if (!seconds || seconds <= 0) return 1;
  const minutes = Math.round(seconds * 100) / 100 / 60;
  return Math.abs(minutes - Math.round(minutes)) < 0.0002 ? Math.round(minutes) : Math.ceil(minutes);
}

function millis(value: unknown) {
  if (value instanceof Timestamp) return value.toMillis();
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') return value.toMillis();
  if (typeof value === 'string' || typeof value === 'number' || value instanceof Date) {
    const parsed = new Date(value).getTime();
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function packageEligible(pkg: Record<string, any>) {
  return pkg?.active !== false && Number(pkg?.minutesRemaining || 0) > 0 && (!pkg?.expiresAt || millis(pkg.expiresAt) > Date.now());
}

function baseUrl(request: NextRequest) {
  return process.env.NEXT_PUBLIC_APP_URL || `${request.headers.get('x-forwarded-proto') || 'https'}://${request.headers.get('host')}`;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isPackageAddOnCheckoutEnabled()) {
    return NextResponse.json(
      { ok: false, code: 'PACKAGE_ADD_ON_CHECKOUT_DISABLED', error: 'Package add-on checkout is not available. Please contact support.' },
      { status: 503 }
    );
  }

  try {
    const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const { id } = await params;
    const jobRef = adminDb.collection('transcriptions').doc(id);
    const userRef = adminDb.collection('users').doc(decoded.uid);
    const initialJobSnapshot = await jobRef.get();
    if (!initialJobSnapshot.exists) return NextResponse.json({ ok: false, error: 'Transcription job not found' }, { status: 404 });
    const initialJob = initialJobSnapshot.data() || {};
    if (initialJob.userId !== decoded.uid) return NextResponse.json({ ok: false, error: 'You do not own this transcription job' }, { status: 403 });
    if (!['hybrid', 'human'].includes(initialJob.mode) || !['package-pending-add-on', 'package'].includes(initialJob.billingType)) {
      return NextResponse.json({ ok: false, error: 'This job does not require a package add-on payment' }, { status: 409 });
    }
    if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ ok: false, error: 'Stripe is not configured' }, { status: 503 });
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' });
    if (initialJob.paymentStatus === 'paid' || initialJob.packageReservationStatus === 'consumed') {
      return NextResponse.json({ ok: true, alreadyPaid: true, jobId: id });
    }

    let verifiedExpiredSessionId: string | null = null;
    if (initialJob.stripeAddOnCheckoutSessionId && initialJob.packageReservationStatus === 'reserved') {
      const existingSession = await stripe.checkout.sessions.retrieve(initialJob.stripeAddOnCheckoutSessionId);
      if (existingSession.status === 'complete') {
        return NextResponse.json({ ok: true, paymentProcessing: true, jobId: id });
      }
      if (existingSession.status === 'open' && millis(initialJob.packageReservationExpiresAt) > Date.now()) {
        return NextResponse.json({ ok: true, duplicate: true, checkoutUrl: existingSession.url });
      }
      if (existingSession.status === 'open') await stripe.checkout.sessions.expire(existingSession.id);
      verifiedExpiredSessionId = existingSession.id;
    }

    const reservation = await adminDb.runTransaction(async transaction => {
      const [jobSnapshot, userSnapshot] = await Promise.all([transaction.get(jobRef), transaction.get(userRef)]);
      if (!jobSnapshot.exists || !userSnapshot.exists) throw new Error('NOT_FOUND');
      const job = jobSnapshot.data() || {};
      const user = userSnapshot.data() || {};
      if (job.userId !== decoded.uid) throw new Error('FORBIDDEN');
      if (job.paymentStatus === 'paid' || job.packageReservationStatus === 'consumed') return { alreadyPaid: true } as const;

      let packages = Array.isArray(user.packages) ? [...user.packages] : [];
      const reservationExpired = millis(job.packageReservationExpiresAt) <= Date.now();
      const mayRelease = !job.stripeAddOnCheckoutSessionId || verifiedExpiredSessionId === job.stripeAddOnCheckoutSessionId;
      if (job.packageReservationStatus === 'reserved' && reservationExpired && mayRelease) {
        packages = releasePackageReservation(packages, job.packageReservationAllocations || []) || packages;
      } else if (job.packageReservationStatus === 'reserved') {
        return {
          alreadyPaid: false, reservationId: String(job.packageReservationId),
          expiresAtMillis: millis(job.packageReservationExpiresAt),
          minutes: Number(job.packageReservedMinutes), allocations: job.packageReservationAllocations || [],
          mode: String(job.mode), rushDelivery: job.rushDelivery === true,
          speakerCount: Number(job.speakerCount || 1), userEmail: user.email,
        } as const;
      }

      const minutes = billingMinutes(Number(job.duration || 0));
      const reserved = reservePackageMinutes(packages, String(job.mode), minutes, packageEligible);
      if (!reserved) throw new Error('INSUFFICIENT_PACKAGE_MINUTES');
      const attempt = Number(job.packageReservationAttempt || 0) + 1;
      const reservationId = `${id}-${attempt}`;
      const expiresAt = Timestamp.fromMillis(Date.now() + RESERVATION_MINUTES * 60 * 1000);
      const quote = transcriptionAddOnQuote(String(job.mode), minutes, {
        rushDelivery: job.rushDelivery === true, speakerCount: Number(job.speakerCount || 1),
      });
      if (quote.subtotalCents <= 0) throw new Error('NO_ADD_ONS');

      transaction.update(userRef, { packages: reserved.packages, updatedAt: FieldValue.serverTimestamp() });
      transaction.update(jobRef, {
        status: 'pending-add-on-payment', paymentStatus: 'pending', billingType: 'package-pending-add-on',
        packageReservationStatus: 'reserved', packageReservedMinutes: minutes,
        packageReservationId: reservationId, packageReservationAttempt: attempt,
        packageReservationAllocations: reserved.allocations,
        packageReservationCreatedAt: FieldValue.serverTimestamp(), packageReservationExpiresAt: expiresAt,
        packageId: reserved.allocations[0]?.packageId || null,
        addOnPaymentStatus: 'pending', addOnRushCents: quote.rushCents,
        addOnSpeakerCents: quote.speakerCents, addOnSubtotalCents: quote.subtotalCents,
        addOnCurrency: 'cad', stripeAddOnCheckoutSessionId: FieldValue.delete(),
        stripeAddOnCheckoutUrl: FieldValue.delete(), updatedAt: FieldValue.serverTimestamp(),
      });
      return {
        alreadyPaid: false, reservationId, expiresAtMillis: expiresAt.toMillis(), minutes,
        allocations: reserved.allocations, mode: String(job.mode), rushDelivery: job.rushDelivery === true,
        speakerCount: Number(job.speakerCount || 1), userEmail: user.email,
      } as const;
    });
    if (reservation.alreadyPaid) return NextResponse.json({ ok: true, alreadyPaid: true, jobId: id });

    const quote = transcriptionAddOnQuote(reservation.mode, reservation.minutes, {
      rushDelivery: reservation.rushDelivery, speakerCount: reservation.speakerCount,
    });
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    if (quote.rushCents > 0) lineItems.push({
      price_data: { currency: 'cad', unit_amount: quote.rushCents, product_data: { name: `${reservation.mode === 'hybrid' ? 'Hybrid' : 'Human'} rush service`, description: `${reservation.minutes} audio minutes` } }, quantity: 1,
    });
    if (quote.speakerCents > 0) lineItems.push({
      price_data: { currency: 'cad', unit_amount: quote.speakerCents, product_data: { name: `${reservation.mode === 'hybrid' ? 'Hybrid' : 'Human'} 5+ speaker service`, description: `${reservation.minutes} audio minutes` } }, quantity: 1,
    });

    const returnUrl = `${baseUrl(request).replace(/\/$/, '')}/transcriptions`;
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'payment', payment_method_types: ['card'], line_items: lineItems,
        customer_email: decoded.email || reservation.userEmail || undefined,
        billing_address_collection: 'required',
        expires_at: Math.floor(reservation.expiresAtMillis / 1000),
        success_url: `${returnUrl}?add_on_payment=processing&job_id=${encodeURIComponent(id)}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${returnUrl}?add_on_payment=canceled&job_id=${encodeURIComponent(id)}`,
        metadata: {
          type: 'transcription-package-add-ons', jobId: id, userId: decoded.uid,
          reservationId: reservation.reservationId, mode: reservation.mode,
          billingMinutes: String(reservation.minutes), expectedSubtotalCents: String(quote.subtotalCents), expectedCurrency: 'cad',
        },
        payment_intent_data: { metadata: { type: 'transcription-package-add-ons', jobId: id, userId: decoded.uid, reservationId: reservation.reservationId } },
      }, { idempotencyKey: `transcription-add-ons-${reservation.reservationId}` });
    } catch (error) {
      await jobRef.update({ addOnPaymentStatus: 'checkout-error', updatedAt: FieldValue.serverTimestamp() }).catch(() => undefined);
      throw error;
    }

    await adminDb.runTransaction(async transaction => {
      const current = await transaction.get(jobRef);
      const data = current.data() || {};
      if (data.paymentStatus === 'paid') return;
      if (data.packageReservationId !== reservation.reservationId) throw new Error('RESERVATION_CHANGED');
      transaction.update(jobRef, {
        addOnPaymentStatus: 'requested', addOnPaymentRequestedAt: FieldValue.serverTimestamp(),
        stripeAddOnCheckoutSessionId: session.id, stripeAddOnCheckoutUrl: session.url,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });
    return NextResponse.json({ ok: true, checkoutUrl: session.url });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    if (code === 'INSUFFICIENT_PACKAGE_MINUTES') return NextResponse.json({ ok: false, error: 'Your package does not have enough unreserved minutes for this recording.' }, { status: 402 });
    if (code === 'NO_ADD_ONS') return NextResponse.json({ ok: false, error: 'No paid add-ons were selected' }, { status: 409 });
    if (code === 'NOT_FOUND') return NextResponse.json({ ok: false, error: 'Job or user not found' }, { status: 404 });
    if (code === 'FORBIDDEN') return NextResponse.json({ ok: false, error: 'You do not own this transcription job' }, { status: 403 });
    console.error('[Transcription Add-on Checkout] Failed:', code || 'Unknown error');
    return NextResponse.json({ ok: false, error: 'Unable to create add-on checkout' }, { status: 500 });
  }
}
