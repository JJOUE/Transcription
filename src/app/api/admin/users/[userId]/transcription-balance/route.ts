import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

const ALLOWED_REASONS = new Set([
  'refunded-project', 'duplicate-submission', 'cancelled-project',
  'failed-processing', 'courtesy-credit', 'manual-correction',
]);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ userId: string }> }) {
  try {
    const { userId } = await params;
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });

    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (adminDoc.data()?.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { balanceType, packageId, direction, amount, reasonCode, reason,
      relatedJobId, relatedPaymentId, stripeRefundId } = body;

    if (!['package', 'free-trial'].includes(balanceType)) {
      return NextResponse.json({ ok: false, error: 'Invalid balance type' }, { status: 400 });
    }
    if (!['increase', 'decrease'].includes(direction)) {
      return NextResponse.json({ ok: false, error: 'Invalid adjustment direction' }, { status: 400 });
    }
    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ ok: false, error: 'Adjustment amount must be greater than zero' }, { status: 400 });
    }
    if (!ALLOWED_REASONS.has(reasonCode) || typeof reason !== 'string' || !reason.trim()) {
      return NextResponse.json({ ok: false, error: 'A valid reason and explanation are required' }, { status: 400 });
    }
    if (balanceType === 'package' && !packageId) {
      return NextResponse.json({ ok: false, error: 'A package must be selected' }, { status: 400 });
    }
    if (stripeRefundId && !/^[A-Za-z0-9_-]{1,200}$/.test(stripeRefundId)) {
      return NextResponse.json({ ok: false, error: 'Invalid Stripe refund ID' }, { status: 400 });
    }

    const userRef = adminDb.collection('users').doc(userId);
    const adjustmentRef = adminDb.collection('balanceAdjustments').doc();
    const refundKeyRef = stripeRefundId
      ? adminDb.collection('balanceAdjustmentKeys').doc(`stripe-refund-${stripeRefundId}`)
      : null;

    const result = await adminDb.runTransaction(async transaction => {
      const userSnapshot = await transaction.get(userRef);
      if (!userSnapshot.exists) throw new Error('USER_NOT_FOUND');
      if (refundKeyRef && (await transaction.get(refundKeyRef)).exists) {
        throw new Error('REFUND_ALREADY_ADJUSTED');
      }

      const userData = userSnapshot.data() || {};
      let previousBalance = 0;
      let resultingBalance = 0;
      const userUpdates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

      if (balanceType === 'package') {
        const packages = [...(userData.packages || [])];
        const packageIndex = packages.findIndex((item: { id?: string }) => item.id === packageId);
        if (packageIndex < 0) throw new Error('PACKAGE_NOT_FOUND');
        const currentPackage = packages[packageIndex];
        const total = Number(currentPackage.minutesTotal || 0);
        const remaining = Number(currentPackage.minutesRemaining || 0);
        previousBalance = remaining;
        resultingBalance = direction === 'increase' ? remaining + amount : remaining - amount;
        if (resultingBalance < 0) throw new Error('NEGATIVE_BALANCE');
        if (resultingBalance > total) throw new Error('PACKAGE_TOTAL_EXCEEDED');
        packages[packageIndex] = {
          ...currentPackage,
          minutesRemaining: resultingBalance,
          minutesUsed: total - resultingBalance,
          active: resultingBalance > 0,
        };
        userUpdates.packages = packages;
      } else {
        const total = Number(userData.freeTrialMinutesTotal || 60);
        const remaining = Number(userData.freeTrialMinutes || 0);
        previousBalance = remaining;
        resultingBalance = direction === 'increase' ? remaining + amount : remaining - amount;
        if (resultingBalance < 0) throw new Error('NEGATIVE_BALANCE');
        if (resultingBalance > total) throw new Error('FREE_TRIAL_TOTAL_EXCEEDED');
        userUpdates.freeTrialMinutes = resultingBalance;
        userUpdates.freeTrialMinutesUsed = total - resultingBalance;
        userUpdates.freeTrialActive = resultingBalance > 0;
      }

      const auditData = {
        userId, balanceType, packageId: packageId || null, direction, amount,
        reasonCode, reason: reason.trim(), relatedJobId: relatedJobId || null,
        relatedPaymentId: relatedPaymentId || null, stripeRefundId: stripeRefundId || null,
        previousBalance, resultingBalance, administratorId: decodedToken.uid,
        administratorEmail: decodedToken.email || null, createdAt: FieldValue.serverTimestamp(),
      };
      transaction.update(userRef, userUpdates);
      transaction.set(adjustmentRef, auditData);
      transaction.set(userRef.collection('activity').doc(adjustmentRef.id), {
        ...auditData, type: 'transcription_balance_adjustment',
      });
      if (refundKeyRef) transaction.set(refundKeyRef, {
        stripeRefundId, adjustmentId: adjustmentRef.id, userId, createdAt: FieldValue.serverTimestamp(),
      });
      return { previousBalance, resultingBalance, adjustmentId: adjustmentRef.id };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error('[Admin Balance Adjustment] Failed:', error);
    const message = error instanceof Error ? error.message : '';
    const known: Record<string, [number, string]> = {
      USER_NOT_FOUND: [404, 'Client account not found'], PACKAGE_NOT_FOUND: [404, 'Selected package not found'],
      NEGATIVE_BALANCE: [400, 'Adjustment would make the balance negative'],
      PACKAGE_TOTAL_EXCEEDED: [400, 'Adjustment would exceed the package total'],
      FREE_TRIAL_TOTAL_EXCEEDED: [400, 'Adjustment would exceed the original free AI allowance'],
      REFUND_ALREADY_ADJUSTED: [409, 'This Stripe refund has already been credited'],
    };
    return NextResponse.json({ ok: false, error: known[message]?.[1] || 'Unable to adjust transcription balance' },
      { status: known[message]?.[0] || 500 });
  }
}
