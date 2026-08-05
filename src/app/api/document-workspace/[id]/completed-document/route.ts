import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { sendDocumentWorkspaceClientEmail } from '@/lib/email/simple-email';
import { publicProjectUrl, recordDocumentWorkspaceAudit } from '@/lib/document-workspace/workflow';

const MAX_COMPLETED_DOCUMENT_SIZE = 50 * 1024 * 1024;
const ALLOWED_COMPLETED_DOCUMENT_TYPES = new Map([
  ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  ['pdf', 'application/pdf'],
  ['txt', 'text/plain'],
]);

const sanitizeFilename = (filename: string) => {
  const cleaned = filename
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned || 'completed-document';
};

const normalizeDeliveryLabel = (value: FormDataEntryValue | null) => {
  const label = typeof value === 'string' ? value.trim() : '';
  return label.slice(0, 80) || 'Completed Document';
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const jobDoc = await adminDb.collection('transcriptions').doc(id).get();

    if (!jobDoc.exists) {
      return NextResponse.json(
        { error: 'Document Workspace project not found' },
        { status: 404 }
      );
    }

    const job = jobDoc.data();

    if (job?.type !== 'office') {
      return NextResponse.json(
        { error: 'Completed document is only available for Document Workspace projects' },
        { status: 400 }
      );
    }

    const userDoc = await adminDb.collection('users').doc(userId).get();
    const isAdmin = userDoc.data()?.role === 'admin';
    if (job.userId !== userId && !isAdmin) {
        return NextResponse.json(
          { error: 'You do not have permission to download this document' },
          { status: 403 }
        );
    }

    if (job.filesDeletedAt || job.deletionStatus === 'deleted' || job.deletionRequestStatus === 'processed' || job.deletionRequestStatus === 'completed') {
      return NextResponse.json(
        { error: 'Files have expired or been deleted' },
        { status: 410 }
      );
    }

    const requestedFileId = request.nextUrl.searchParams.get('fileId');
    const completedFiles = Array.isArray(job.completedFiles) ? job.completedFiles : [];
    const requestedVersion = requestedFileId
      ? completedFiles.find((entry: { id?: unknown }) => entry?.id === requestedFileId)
      : null;

    if (requestedFileId && !requestedVersion) {
      return NextResponse.json({ error: 'Completed document version not found' }, { status: 404 });
    }

    if (!isAdmin && job.officeQuote) {
      const quoteTotal = Number(job.acceptedQuoteSnapshot?.total ?? job.officeQuote.total ?? 0);
      const paid = job.paymentStatus === 'paid';
      const courtesyApproved = quoteTotal === 0 && Boolean(job.courtesyApprovedAt);
      if (quoteTotal > 0 && !paid) {
        return NextResponse.json({ error: 'Payment is required before download' }, { status: 402 });
      }
      if (quoteTotal === 0 && !courtesyApproved) {
        return NextResponse.json({ error: 'Courtesy approval is required before download' }, { status: 423 });
      }
    }

    const documentPath = requestedVersion?.path || job.officeCompletedDocumentPath;

    if (!documentPath || typeof documentPath !== 'string') {
      return NextResponse.json(
        { error: 'Completed document is not available' },
        { status: 404 }
      );
    }

    const expectedPrefix = `transcriptions/${job.userId}/${id}/completed-document/`;
    if (!documentPath.startsWith(expectedPrefix)) {
      console.error('[Document Workspace Download] Stored path failed ownership check', {
        jobId: id,
        userId: job.userId,
        documentPath,
      });

      return NextResponse.json(
        { error: 'Invalid completed document path' },
        { status: 403 }
      );
    }

    const bucket = adminStorage.bucket();
    const file = bucket.file(documentPath);
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json(
        { error: 'Completed document file not found' },
        { status: 404 }
      );
    }

    const [contents] = await file.download();
    const [metadata] = await file.getMetadata();
    const filename = requestedVersion?.filename || job.officeCompletedFilename || metadata.name?.split('/').pop() || 'completed-document';
    const contentType = metadata.contentType || 'application/octet-stream';

    await recordDocumentWorkspaceAudit(id, 'completed-file-released', userId, {
      fileId: requestedFileId || 'latest', adminAccess: isAdmin,
    });

    return new NextResponse(new Uint8Array(contents), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[Document Workspace Download] Error:', error);

    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to download completed document' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    const jobRef = adminDb.collection('transcriptions').doc(id);
    const jobDoc = await jobRef.get();

    if (!jobDoc.exists) {
      return NextResponse.json({ ok: false, error: 'Document Workspace project not found' }, { status: 404 });
    }

    const job = jobDoc.data();
    if (job?.type !== 'office') {
      return NextResponse.json(
        { ok: false, error: 'This manual delivery tool only supports Document Workspace projects.' },
        { status: 400 }
      );
    }

    if (!job.userId || typeof job.userId !== 'string') {
      return NextResponse.json({ ok: false, error: 'The project has no client user ID.' }, { status: 400 });
    }

    if (job.filesDeletedAt || job.deletionStatus === 'deleted' || job.deletionRequestStatus === 'processed' || job.deletionRequestStatus === 'completed') {
      return NextResponse.json(
        { ok: false, error: 'Files for this project have already been deleted.' },
        { status: 410 }
      );
    }

    const formData = await request.formData();
    const uploadedFile = formData.get('file');
    const label = normalizeDeliveryLabel(formData.get('label'));

    if (!(uploadedFile instanceof File) || uploadedFile.size === 0) {
      return NextResponse.json({ ok: false, error: 'Select a completed document to upload.' }, { status: 400 });
    }

    if (uploadedFile.size > MAX_COMPLETED_DOCUMENT_SIZE) {
      return NextResponse.json({ ok: false, error: 'The completed document must be 50 MB or smaller.' }, { status: 400 });
    }

    const filename = sanitizeFilename(uploadedFile.name);
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    const expectedContentType = ALLOWED_COMPLETED_DOCUMENT_TYPES.get(extension);

    if (!expectedContentType) {
      return NextResponse.json(
        { ok: false, error: 'Completed documents must be DOCX, PDF, or TXT files.' },
        { status: 400 }
      );
    }

    const contentType = expectedContentType;
    const uploadTimestamp = Date.now();
    const fileId = `document-${uploadTimestamp}`;
    const documentPath = `transcriptions/${job.userId}/${id}/completed-document/${uploadTimestamp}_${filename}`;
    const buffer = Buffer.from(await uploadedFile.arrayBuffer());

    await adminStorage.bucket().file(documentPath).save(buffer, {
      resumable: false,
      contentType,
      metadata: {
        cacheControl: 'private, no-store',
      },
    });

    const existingVersions = Array.isArray(job.completedFiles) ? job.completedFiles : [];
    const hasLegacyVersion = existingVersions.some((entry: { path?: unknown }) => entry?.path === job.officeCompletedDocumentPath);
    const legacyVersion = job.officeCompletedDocumentPath && !hasLegacyVersion
      ? [{
          id: 'legacy-office-completed-file',
          label: 'Completed Document',
          filename: job.officeCompletedFilename || 'Completed document',
          path: job.officeCompletedDocumentPath,
          contentType: job.officeCompletedDocumentContentType || 'application/octet-stream',
          size: job.officeCompletedDocumentSize || 0,
          uploadedAt: job.officeCompletedDocumentUploadedAt || job.completedAt || Timestamp.now(),
          uploadedBy: job.officeCompletedDocumentUploadedBy || '',
          versionType: 'document',
          isLatest: false,
        }]
      : [];
    const completedFiles = [
      ...existingVersions.map((entry: Record<string, unknown>) => ({ ...entry, isLatest: false })),
      ...legacyVersion,
      {
        id: fileId,
        label,
        filename,
        path: documentPath,
        contentType,
        size: uploadedFile.size,
        uploadedAt: Timestamp.now(),
        uploadedBy: decodedToken.uid,
        versionType: 'document',
        isLatest: true,
      },
    ];
    const quoteTotalBeforeUpload = Number(job.acceptedQuoteSnapshot?.total ?? job.officeQuote?.total ?? 0);
    const hasQuote = Boolean(job.officeQuote);
    const deliveryAllowedBeforeUpload = !hasQuote || job.paymentStatus === 'paid' || (quoteTotalBeforeUpload === 0 && Boolean(job.courtesyApprovedAt));

    await jobRef.update({
      status: deliveryAllowedBeforeUpload ? 'complete' : 'pending-review',
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      officeStatus: deliveryAllowedBeforeUpload ? 'completed' : 'waiting_review',
      officeCompletedDocumentPath: documentPath,
      officeCompletedFilename: filename,
      officeCompletedDocumentContentType: contentType,
      officeCompletedDocumentSize: uploadedFile.size,
      officeCompletedDocumentUploadedAt: FieldValue.serverTimestamp(),
      officeCompletedDocumentUploadedBy: decodedToken.uid,
      completedFiles,
    });

    await recordDocumentWorkspaceAudit(id, 'completed-file-uploaded', decodedToken.uid, { fileId, filename, size: uploadedFile.size });
    const quoteTotal = Number(job.acceptedQuoteSnapshot?.total ?? job.officeQuote?.total ?? 0);
    const deliveryAllowed = job.paymentStatus === 'paid' || (quoteTotal === 0 && Boolean(job.courtesyApprovedAt));
    if (deliveryAllowed && job.completionEmailStatus !== 'sent') {
      const client = await adminDb.collection('users').doc(job.userId).get();
      const clientEmail = client.data()?.email;
      if (clientEmail) {
        try {
          const email = await sendDocumentWorkspaceClientEmail({ kind: 'payment-received-ready', clientEmail, projectId: id, serviceLabel: job.acceptedQuoteSnapshot?.outputType || job.officeQuote?.outputType, total: quoteTotal, dashboardUrl: publicProjectUrl(id) });
          await jobRef.update({ completionEmailStatus: email.ok ? 'sent' : 'failed', completionEmailSentAt: email.ok ? FieldValue.serverTimestamp() : null, completionEmailMessageId: email.messageId || null });
          await recordDocumentWorkspaceAudit(id, email.ok ? 'email-sent' : 'email-failed', decodedToken.uid, { notification: 'payment-received-ready', messageId: email.messageId || null });
        } catch (emailError) {
          console.error('[Manual Document Delivery] File delivered but notification tracking failed:', emailError);
        }
      }
    }

    return NextResponse.json({
      ok: true,
      jobId: id,
      filename,
      documentPath,
      fileId,
      label,
    });
  } catch (error) {
    console.error('[Manual Document Delivery] Upload failed:', error);

    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json({ ok: false, error: 'Invalid authentication token' }, { status: 401 });
    }

    return NextResponse.json(
      { ok: false, error: 'Failed to deliver the completed document.' },
      { status: 500 }
    );
  }
}
