import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { randomUUID } from 'crypto';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { sendDocumentWorkspaceClientEmail } from '@/lib/email/simple-email';
import { publicProjectUrl, recordDocumentWorkspaceAudit } from '@/lib/document-workspace/workflow';
import {
  COMPLEX_PAGE_RATE,
  LOW_EFFECTIVE_HOURLY_RATE,
  MINIMUM_SUGGESTED_CHARGE,
  STANDARD_PAGE_DEFINITION,
  STANDARD_PAGE_RATE,
  calculateDocumentWorkspaceQuote,
  type DocumentWorkspaceQuoteInput,
} from '@/lib/quotes/document-workspace-quote';

const finiteNumber = (value: unknown) => typeof value === 'number' && Number.isFinite(value);

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });

    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminSnapshot = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (adminSnapshot.data()?.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const jobRef = adminDb.collection('transcriptions').doc(id);

    const body = await request.json() as Partial<DocumentWorkspaceQuoteInput>;
    const numericFields: Array<keyof DocumentWorkspaceQuoteInput> = [
      'sourceAudioMinutes', 'finishedPages', 'preparationHours', 'revisionsAmount',
      'otherChargesAmount', 'courtesyDiscount', 'customBaseAmount', 'approvedBaseAmount', 'taxRate',
    ];
    if (numericFields.some(field => !finiteNumber(body[field]) || Number(body[field]) < 0)) {
      return NextResponse.json({ ok: false, error: 'Quote amounts and quantities must be valid non-negative numbers' }, { status: 400 });
    }
    if (!body.outputType?.trim() || !['standard', 'complex', 'custom'].includes(String(body.complexity))) {
      return NextResponse.json({ ok: false, error: 'Output type and quote complexity are required' }, { status: 400 });
    }
    if (Number(body.finishedPages) <= 0) {
      return NextResponse.json({ ok: false, error: 'Estimated or actual finished pages are required' }, { status: 400 });
    }

    const input = body as DocumentWorkspaceQuoteInput;
    const calculation = calculateDocumentWorkspaceQuote(input);
    if (input.complexity === 'custom' && !input.customQuoteReason?.trim()) {
      return NextResponse.json({ ok: false, error: 'A reason is required for a custom quote' }, { status: 400 });
    }
    if (calculation.materialOverride && !input.overrideReason?.trim()) {
      return NextResponse.json({ ok: false, error: 'An internal reason is required for a material override' }, { status: 400 });
    }
    if (input.otherChargesAmount > 0 && !input.otherChargesReason?.trim()) {
      return NextResponse.json({ ok: false, error: 'Describe the other approved charges' }, { status: 400 });
    }
    if (input.revisionsAmount > 0 && !input.revisionsNote?.trim()) {
      return NextResponse.json({ ok: false, error: 'Describe the revision charge' }, { status: 400 });
    }
    if (input.courtesyDiscount > calculation.subtotalBeforeDiscount) {
      return NextResponse.json({ ok: false, error: 'Courtesy discount cannot exceed the quoted charges' }, { status: 400 });
    }
    if (input.expiresAt && Number.isNaN(Date.parse(input.expiresAt))) {
      return NextResponse.json({ ok: false, error: 'Quote expiry date is invalid' }, { status: 400 });
    }

    const quoteId = randomUUID();
    const clientLineItems = [
      { label: 'Document preparation', amount: input.approvedBaseAmount },
      ...(input.revisionsAmount > 0 ? [{ label: 'Revisions', amount: input.revisionsAmount }] : []),
      ...(input.otherChargesAmount > 0 ? [{ label: 'Other approved charges', amount: input.otherChargesAmount }] : []),
      ...(input.courtesyDiscount > 0 ? [{ label: 'Courtesy discount', amount: -input.courtesyDiscount }] : []),
    ];

    const internalFrozenQuote = {
      status: 'sent', quoteId, version: 1,
      outputType: input.outputType.trim(),
      sourceAudioMinutes: input.sourceAudioMinutes,
      transcriptionCoveredByPackage: Boolean(input.transcriptionCoveredByPackage),
      finishedPages: input.finishedPages,
      complexity: input.complexity,
      templateSupplied: Boolean(input.templateSupplied),
      preparationHours: input.preparationHours,
      revisionsAmount: input.revisionsAmount,
      revisionsNote: input.revisionsNote?.trim() || '',
      otherChargesAmount: input.otherChargesAmount,
      otherChargesReason: input.otherChargesReason?.trim() || '',
      courtesyDiscount: input.courtesyDiscount,
      customBaseAmount: input.customBaseAmount,
      customQuoteReason: input.customQuoteReason?.trim() || '',
      approvedBaseAmount: input.approvedBaseAmount,
      overrideReason: input.overrideReason?.trim() || '',
      taxRate: input.taxRate,
      clientLineItems,
      clientNotes: input.clientNotes?.trim() || '',
      expiresAt: input.expiresAt || '',
      ...calculation,
      frozenRates: {
        standardPage: STANDARD_PAGE_RATE,
        complexPage: COMPLEX_PAGE_RATE,
        minimumSuggestedCharge: MINIMUM_SUGGESTED_CHARGE,
        lowHourlyRateWarning: LOW_EFFECTIVE_HOURLY_RATE,
      },
      standardPageDefinition: STANDARD_PAGE_DEFINITION,
      sentAt: FieldValue.serverTimestamp(),
      sentBy: decodedToken.uid,
      sentByEmail: decodedToken.email || null,
    };
    const publicQuote = {
      status: 'sent', quoteId, version: 1,
      outputType: input.outputType.trim(), clientLineItems,
      subtotal: calculation.subtotal, taxAmount: calculation.taxAmount, total: calculation.total,
      clientNotes: input.clientNotes?.trim() || '', expiresAt: input.expiresAt || '',
      sentAt: FieldValue.serverTimestamp(),
    };

    const result = await adminDb.runTransaction(async transaction => {
      const jobSnapshot = await transaction.get(jobRef);
      if (!jobSnapshot.exists) throw new Error('PROJECT_NOT_FOUND');

      const job = jobSnapshot.data() || {};
      if (job.type !== 'office' || job.paymentStatus !== 'quote-required') {
        throw new Error('PROJECT_NOT_QUOTE_REQUIRED');
      }
      if (job.officeQuote?.status === 'sent') {
        return { duplicate: true, job };
      }

      transaction.update(jobRef, {
        officeQuote: publicQuote,
        officeQuoteStatus: 'sent',
        quoteStatus: 'quote-sent',
        quoteVersion: 1,
        officeQuoteSentAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(jobRef.collection('quoteAdminSnapshots').doc(quoteId), internalFrozenQuote);
      return { duplicate: false, job };
    });

    if (!result.duplicate) {
      await Promise.allSettled([
        recordDocumentWorkspaceAudit(id, 'quote-approved', decodedToken.uid, { quoteId, version: 1, total: calculation.total }),
        recordDocumentWorkspaceAudit(id, 'quote-sent', decodedToken.uid, { quoteId, version: 1 }),
      ]);
      const clientSnapshot = await adminDb.collection('users').doc(String(result.job.userId || '')).get();
      const clientEmail = clientSnapshot.data()?.email;
      if (clientEmail) {
        try {
          const emailResult = await sendDocumentWorkspaceClientEmail({
            kind: 'quote-ready', clientEmail, projectId: id, serviceLabel: input.outputType.trim(),
            total: calculation.total, dashboardUrl: publicProjectUrl(id),
          });
          await jobRef.update({ quoteEmailStatus: emailResult.ok ? 'sent' : 'failed', quoteEmailSentAt: emailResult.ok ? FieldValue.serverTimestamp() : null, quoteEmailMessageId: emailResult.messageId || null, updatedAt: FieldValue.serverTimestamp() });
          await recordDocumentWorkspaceAudit(id, emailResult.ok ? 'email-sent' : 'email-failed', decodedToken.uid, { notification: 'quote-ready', quoteId, messageId: emailResult.messageId || null });
        } catch (emailError) {
          console.error('[Document Workspace Quote] Quote saved but notification tracking failed:', emailError);
        }
      }
    }

    return NextResponse.json({ ok: true, duplicate: result.duplicate });
  } catch (error) {
    if (error instanceof Error && error.message === 'PROJECT_NOT_FOUND') {
      return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
    }
    if (error instanceof Error && error.message === 'PROJECT_NOT_QUOTE_REQUIRED') {
      return NextResponse.json({ ok: false, error: 'This project is not awaiting a Document Workspace quote' }, { status: 400 });
    }
    console.error('[Document Workspace Quote] Failed:', error);
    return NextResponse.json({ ok: false, error: 'The quote could not be approved and frozen' }, { status: 500 });
  }
}
