import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { sendDocumentWorkspaceClientEmail } from '@/lib/email/simple-email';
import { publicProjectUrl, recordDocumentWorkspaceAudit } from '@/lib/document-workspace/workflow';

const fieldFor = {
  'quote-ready': 'quoteEmail',
  'payment-requested': 'paymentRequestEmail',
  'payment-received-ready': 'completionEmail',
} as const;

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const admin = await adminDb.collection('users').doc(decoded.uid).get();
    if (admin.data()?.role !== 'admin') return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    const { id } = await params;
    const body = await request.json() as { kind?: keyof typeof fieldFor };
    if (!body.kind || !fieldFor[body.kind]) return NextResponse.json({ ok: false, error: 'Invalid notification type' }, { status: 400 });
    const jobRef = adminDb.collection('transcriptions').doc(id);
    const snapshot = await jobRef.get();
    if (!snapshot.exists || snapshot.data()?.type !== 'office') return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
    const job = snapshot.data() || {};
    if (body.kind === 'quote-ready' && !job.officeQuote) return NextResponse.json({ ok: false, error: 'No quote is available' }, { status: 409 });
    if (body.kind === 'payment-requested' && job.paymentStatus !== 'requested') return NextResponse.json({ ok: false, error: 'Payment has not been requested' }, { status: 409 });
    const deliveryAllowed = job.paymentStatus === 'paid' || (Number(job.acceptedQuoteSnapshot?.total || 0) === 0 && job.courtesyApprovedAt);
    const hasCompletedFile = Boolean(job.officeCompletedDocumentPath);
    if (body.kind === 'payment-received-ready' && (!deliveryAllowed || !hasCompletedFile)) {
      return NextResponse.json({ ok: false, error: 'Payment/courtesy approval and a completed file are required' }, { status: 409 });
    }
    const client = await adminDb.collection('users').doc(String(job.userId || '')).get();
    const clientEmail = client.data()?.email;
    if (!clientEmail) return NextResponse.json({ ok: false, error: 'Client email is unavailable' }, { status: 409 });
    const result = await sendDocumentWorkspaceClientEmail({
      kind: body.kind, clientEmail, projectId: id, serviceLabel: job.officeQuote?.outputType,
      total: Number(job.acceptedQuoteSnapshot?.total ?? job.officeQuote?.total ?? 0), dashboardUrl: publicProjectUrl(id),
    });
    const prefix = fieldFor[body.kind];
    await jobRef.update({
      [`${prefix}Status`]: result.ok ? 'sent' : 'failed',
      [`${prefix}SentAt`]: result.ok ? FieldValue.serverTimestamp() : null,
      [`${prefix}MessageId`]: result.messageId || null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    await recordDocumentWorkspaceAudit(id, result.ok ? 'email-sent' : 'email-failed', decoded.uid, { notification: body.kind, messageId: result.messageId || null, manualResend: true });
    return NextResponse.json({ ok: result.ok, error: result.error });
  } catch (error) {
    console.error('[Document Workspace Notification Resend] Failed:', error);
    return NextResponse.json({ ok: false, error: 'Notification could not be sent' }, { status: 500 });
  }
}
