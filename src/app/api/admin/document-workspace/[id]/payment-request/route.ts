import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { sendDocumentWorkspaceClientEmail } from '@/lib/email/simple-email';
import { publicProjectUrl, recordDocumentWorkspaceAudit } from '@/lib/document-workspace/workflow';

async function requireAdmin(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('UNAUTHENTICATED');
  const decoded = await adminAuth.verifyIdToken(token);
  const snapshot = await adminDb.collection('users').doc(decoded.uid).get();
  if (snapshot.data()?.role !== 'admin') throw new Error('FORBIDDEN');
  return decoded;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin(request);
    const { id } = await params;
    const body = await request.json().catch(() => ({})) as { action?: string };
    const jobRef = adminDb.collection('transcriptions').doc(id);
    const snapshot = await jobRef.get();
    if (!snapshot.exists) throw new Error('NOT_FOUND');
    const job = snapshot.data() || {};
    if (job.type !== 'office' || job.quoteStatus !== 'quote-accepted' || !job.acceptedQuoteSnapshot) throw new Error('NOT_ACCEPTED');
    const quote = job.acceptedQuoteSnapshot;
    if (quote.quoteId !== job.acceptedQuoteId) throw new Error('STALE_QUOTE');
    if (!job.officeCompletedDocumentPath) throw new Error('WORK_NOT_COMPLETE');
    const amountCents = Math.round(Number(quote.total || 0) * 100);

    if (body.action === 'courtesy') {
      if (amountCents !== 0) throw new Error('NOT_ZERO');
      await jobRef.update({
        paymentStatus: 'not-required', courtesyApprovedAt: FieldValue.serverTimestamp(),
        courtesyApprovedBy: admin.uid,
        ...(job.officeCompletedDocumentPath ? { status: 'complete', officeStatus: 'completed', completedAt: FieldValue.serverTimestamp() } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      await recordDocumentWorkspaceAudit(id, 'courtesy-approved', admin.uid, { quoteId: quote.quoteId, totalCents: 0 });
      if (job.officeCompletedDocumentPath && job.completionEmailStatus !== 'sent') {
        const client = await adminDb.collection('users').doc(String(job.userId || '')).get();
        const clientEmail = client.data()?.email;
        if (clientEmail) {
          try {
            const email = await sendDocumentWorkspaceClientEmail({ kind: 'payment-received-ready', clientEmail, projectId: id, serviceLabel: quote.outputType, total: 0, dashboardUrl: publicProjectUrl(id) });
            await jobRef.update({ completionEmailStatus: email.ok ? 'sent' : 'failed', completionEmailSentAt: email.ok ? FieldValue.serverTimestamp() : null, completionEmailMessageId: email.messageId || null, updatedAt: FieldValue.serverTimestamp() });
            await recordDocumentWorkspaceAudit(id, email.ok ? 'email-sent' : 'email-failed', admin.uid, { notification: 'payment-received-ready', messageId: email.messageId || null });
          } catch (emailError) {
            console.error('[Document Workspace Courtesy] Approved but notification tracking failed:', emailError);
          }
        }
      }
      return NextResponse.json({ ok: true, courtesy: true });
    }

    if (amountCents <= 0) throw new Error('USE_COURTESY');
    if (job.paymentStatus === 'paid') return NextResponse.json({ ok: true, alreadyPaid: true });
    if (job.paymentStatus === 'requested' && job.stripeCheckoutSessionId && job.stripeCheckoutUrl) {
      return NextResponse.json({ ok: true, duplicate: true, checkoutUrl: job.stripeCheckoutUrl });
    }
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_NOT_CONFIGURED');

    const clientSnapshot = await adminDb.collection('users').doc(String(job.userId || '')).get();
    const clientEmail = clientSnapshot.data()?.email;
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-08-27.basil' });
    const dashboardUrl = publicProjectUrl(id);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment', payment_method_types: ['card'], customer_email: clientEmail || undefined,
      line_items: [{
        price_data: {
          currency: 'cad', unit_amount: amountCents,
          product_data: { name: 'Document Workspace project', description: `Project reference ${id}` },
        }, quantity: 1,
      }],
      success_url: `${dashboardUrl}?payment=processing&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${dashboardUrl}?payment=canceled`,
      metadata: {
        type: 'document-workspace-quote', projectId: id, userId: String(job.userId),
        quoteId: String(quote.quoteId), quoteVersion: String(quote.version),
        expectedAmountCents: String(amountCents), expectedCurrency: 'cad',
      },
      payment_intent_data: { metadata: { type: 'document-workspace-quote', projectId: id, quoteId: String(quote.quoteId) } },
      billing_address_collection: 'required',
    }, { idempotencyKey: `document-workspace-${id}-${quote.quoteId}` });

    await adminDb.runTransaction(async transaction => {
      const current = await transaction.get(jobRef);
      const data = current.data() || {};
      if (data.paymentStatus === 'paid') return;
      if (data.acceptedQuoteId !== quote.quoteId) throw new Error('STALE_QUOTE');
      transaction.update(jobRef, {
        paymentStatus: 'requested', paymentRequestedAt: FieldValue.serverTimestamp(),
        paymentRequestedBy: admin.uid, stripeCheckoutSessionId: session.id,
        stripeCheckoutUrl: session.url, updatedAt: FieldValue.serverTimestamp(),
      });
    });
    await recordDocumentWorkspaceAudit(id, 'payment-requested', admin.uid, { quoteId: quote.quoteId, sessionId: session.id, amountCents, currency: 'cad' });

    if (clientEmail) {
      try {
        const email = await sendDocumentWorkspaceClientEmail({ kind: 'payment-requested', clientEmail, projectId: id, total: amountCents / 100, dashboardUrl });
        await jobRef.update({ paymentRequestEmailStatus: email.ok ? 'sent' : 'failed', paymentRequestEmailMessageId: email.messageId || null, updatedAt: FieldValue.serverTimestamp() });
        await recordDocumentWorkspaceAudit(id, email.ok ? 'email-sent' : 'email-failed', admin.uid, { notification: 'payment-requested', messageId: email.messageId || null });
      } catch (emailError) {
        console.error('[Document Workspace Payment Request] Created but notification tracking failed:', emailError);
      }
    }
    return NextResponse.json({ ok: true, checkoutUrl: session.url });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const responses: Record<string, [string, number]> = {
      UNAUTHENTICATED: ['Authentication required', 401], FORBIDDEN: ['Admin access required', 403], NOT_FOUND: ['Project not found', 404],
      NOT_ACCEPTED: ['The client must accept the frozen quote first', 409], STALE_QUOTE: ['The accepted quote no longer matches the project', 409],
      WORK_NOT_COMPLETE: ['Upload the completed document before requesting payment', 409],
      NOT_ZERO: ['Courtesy approval is available only for a CA$0 quote', 400], USE_COURTESY: ['Use courtesy approval for a CA$0 quote', 400],
      STRIPE_NOT_CONFIGURED: ['Stripe is not configured', 503],
    };
    if (responses[code]) return NextResponse.json({ ok: false, error: responses[code][0] }, { status: responses[code][1] });
    console.error('[Document Workspace Payment Request] Failed:', error);
    return NextResponse.json({ ok: false, error: 'Payment request could not be created' }, { status: 500 });
  }
}
