import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { recordDocumentWorkspaceAudit } from '@/lib/document-workspace/workflow';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const { id } = await params;
    const body = await request.json() as { action?: string; quoteId?: string; quoteVersion?: number };
    if (!['accept', 'decline'].includes(body.action || '')) {
      return NextResponse.json({ ok: false, error: 'Choose accept or decline' }, { status: 400 });
    }

    const jobRef = adminDb.collection('transcriptions').doc(id);
    await adminDb.runTransaction(async transaction => {
      const snapshot = await transaction.get(jobRef);
      if (!snapshot.exists) throw new Error('NOT_FOUND');
      const job = snapshot.data() || {};
      if (job.type !== 'office') throw new Error('NOT_OFFICE');
      if (job.userId !== decoded.uid) throw new Error('FORBIDDEN');
      if (!job.officeQuote || job.quoteStatus !== 'quote-sent') throw new Error('NOT_AVAILABLE');
      if (job.officeQuote.quoteId !== body.quoteId || job.officeQuote.version !== body.quoteVersion) throw new Error('STALE_QUOTE');
      if (job.officeQuote.expiresAt && Date.parse(`${job.officeQuote.expiresAt}T23:59:59.999Z`) < Date.now()) throw new Error('EXPIRED');

      if (body.action === 'accept') {
        transaction.update(jobRef, {
          quoteStatus: 'quote-accepted', officeQuoteStatus: 'accepted',
          quoteAcceptedAt: FieldValue.serverTimestamp(), quoteAcceptedBy: decoded.uid,
          acceptedQuoteId: job.officeQuote.quoteId, acceptedQuoteSnapshot: job.officeQuote,
          paymentStatus: Number(job.officeQuote.total || 0) === 0 ? 'not-required' : 'pending',
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        transaction.update(jobRef, {
          quoteStatus: 'quote-declined', officeQuoteStatus: 'declined',
          quoteDeclinedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(),
        });
      }
    });

    await recordDocumentWorkspaceAudit(id, body.action === 'accept' ? 'quote-accepted' : 'quote-declined', decoded.uid, {
      quoteId: body.quoteId || null, quoteVersion: body.quoteVersion || 0,
    });
    return NextResponse.json({ ok: true, status: body.action === 'accept' ? 'quote-accepted' : 'quote-declined' });
  } catch (error) {
    const code = error instanceof Error ? error.message : '';
    const responses: Record<string, [string, number]> = {
      NOT_FOUND: ['Project not found', 404], NOT_OFFICE: ['This is not a Document Workspace project', 400],
      FORBIDDEN: ['You do not have access to this project', 403], NOT_AVAILABLE: ['This quote is no longer available', 409],
      STALE_QUOTE: ['The quote changed after it was displayed. Refresh before responding.', 409],
      EXPIRED: ['This quote has expired. Contact Talk to Text Canada for an updated quote.', 409],
    };
    if (responses[code]) return NextResponse.json({ ok: false, error: responses[code][0] }, { status: responses[code][1] });
    console.error('[Document Workspace Quote Response] Failed:', error);
    return NextResponse.json({ ok: false, error: 'The quote response could not be saved' }, { status: 500 });
  }
}
