import { NextRequest, NextResponse } from 'next/server';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin';

const MAX_FINISHED_TRANSCRIPT_SIZE = 50 * 1024 * 1024;
const ALLOWED_FILE_TYPES: Record<string, string> = {
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.srt': 'application/x-subrip',
  '.vtt': 'text/vtt',
};

const getExtension = (filename: string) => {
  const extensionIndex = filename.lastIndexOf('.');
  return extensionIndex >= 0 ? filename.slice(extensionIndex).toLowerCase() : '';
};

const sanitizeFilename = (filename: string) =>
  filename
    .replace(/[\\/]/g, '-')
    .replace(/[^a-zA-Z0-9._ -]/g, '_')
    .replace(/\s+/g, ' ')
    .trim() || 'finished-transcript';

const getAuthenticatedUser = async (request: NextRequest) => {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;
  return adminAuth.verifyIdToken(token);
};

const normalizeDeliveryLabel = (value: FormDataEntryValue | null) => {
  const label = typeof value === 'string' ? value.trim() : '';
  return label.slice(0, 80) || 'Completed Transcript';
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decodedToken = await getAuthenticatedUser(request);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const jobDoc = await adminDb.collection('transcriptions').doc(id).get();
    if (!jobDoc.exists) {
      return NextResponse.json({ error: 'Transcript project not found' }, { status: 404 });
    }

    const job = jobDoc.data() || {};
    if (job.type === 'office') {
      return NextResponse.json({ error: 'Finished transcripts are not available for Document Workspace projects' }, { status: 400 });
    }

    const requesterDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const isAdmin = requesterDoc.data()?.role === 'admin';
    if (job.userId !== decodedToken.uid && !isAdmin) {
      return NextResponse.json({ error: 'You do not have permission to download this transcript' }, { status: 403 });
    }

    const explicitlyUnpaid = ['pending', 'failed', 'payment-failed', 'requested'].includes(String(job.paymentStatus || ''));
    if (!isAdmin && explicitlyUnpaid) {
      return NextResponse.json({ error: 'Payment must be confirmed before downloading completed work' }, { status: 402 });
    }

    if (job?.filesDeletedAt || job?.deletionStatus === 'deleted' || job?.deletionRequestStatus === 'processed' || job?.deletionRequestStatus === 'completed') {
      return NextResponse.json({ error: 'Files have expired or been deleted' }, { status: 410 });
    }

    const requestedFileId = request.nextUrl.searchParams.get('fileId');
    const completedFiles = Array.isArray(job?.completedFiles) ? job.completedFiles : [];
    const requestedVersion = requestedFileId
      ? completedFiles.find((entry: { id?: unknown }) => entry?.id === requestedFileId)
      : null;

    if (requestedFileId && !requestedVersion) {
      return NextResponse.json({ error: 'Finished transcript version not found' }, { status: 404 });
    }

    const finishedTranscriptPath = requestedVersion?.path || job?.finishedTranscriptPath;
    if (!finishedTranscriptPath || typeof finishedTranscriptPath !== 'string') {
      return NextResponse.json({ error: 'Finished transcript is not available' }, { status: 404 });
    }

    const expectedPrefix = `transcriptions/${job.userId}/${id}/finished-transcript/`;
    if (!finishedTranscriptPath.startsWith(expectedPrefix)) {
      console.error('[Finished Transcript] Stored path failed ownership check', { jobId: id });
      return NextResponse.json({ error: 'Invalid finished transcript path' }, { status: 403 });
    }

    const file = adminStorage.bucket().file(finishedTranscriptPath);
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json({ error: 'Finished transcript file not found' }, { status: 404 });
    }

    const [contents] = await file.download();
    const [metadata] = await file.getMetadata();
    const filename = sanitizeFilename(
      requestedVersion?.filename || job.finishedTranscriptFilename || metadata.name?.split('/').pop() || 'finished-transcript'
    );

    return new NextResponse(new Uint8Array(contents), {
      status: 200,
      headers: {
        'Content-Type': metadata.contentType || job.finishedTranscriptContentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${filename.replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[Finished Transcript] Download error:', error);
    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to download finished transcript' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decodedToken = await getAuthenticatedUser(request);

    if (!decodedToken) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const adminUserDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (adminUserDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const jobRef = adminDb.collection('transcriptions').doc(id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) {
      return NextResponse.json({ error: 'Transcript project not found' }, { status: 404 });
    }

    const job = jobDoc.data();
    if (job?.type === 'office') {
      return NextResponse.json({ error: 'Use Document Workspace completed-document delivery for this project' }, { status: 400 });
    }

    if (job?.filesDeletedAt || job?.deletionStatus === 'deleted' || job?.deletionRequestStatus === 'processed' || job?.deletionRequestStatus === 'completed') {
      return NextResponse.json({ error: 'Files have expired or been deleted' }, { status: 410 });
    }

    const formData = await request.formData();
    const uploadedFile = formData.get('file');
    const label = normalizeDeliveryLabel(formData.get('label'));
    if (!(uploadedFile instanceof File)) {
      return NextResponse.json({ error: 'A finished transcript file is required' }, { status: 400 });
    }

    const extension = getExtension(uploadedFile.name);
    const contentType = ALLOWED_FILE_TYPES[extension];
    if (!contentType) {
      return NextResponse.json({ error: 'Only DOCX, PDF, TXT, SRT, and VTT files are allowed' }, { status: 400 });
    }

    if (uploadedFile.size <= 0 || uploadedFile.size > MAX_FINISHED_TRANSCRIPT_SIZE) {
      return NextResponse.json({ error: 'Finished transcript files must be between 1 byte and 50 MB' }, { status: 400 });
    }

    const filename = sanitizeFilename(uploadedFile.name);
    const uploadTimestamp = Date.now();
    const fileId = `transcript-${uploadTimestamp}`;
    const storagePath = `transcriptions/${job?.userId}/${id}/finished-transcript/${uploadTimestamp}_${filename}`;
    const expectedPrefix = `transcriptions/${job?.userId}/${id}/finished-transcript/`;
    if (!job?.userId || !storagePath.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: 'Invalid finished transcript storage path' }, { status: 400 });
    }

    const bucket = adminStorage.bucket();
    const storageFile = bucket.file(storagePath);
    await storageFile.save(Buffer.from(await uploadedFile.arrayBuffer()), {
      resumable: false,
      metadata: { contentType },
    });

    const existingVersions = Array.isArray(job.completedFiles) ? job.completedFiles : [];
    const hasLegacyVersion = existingVersions.some((entry: { path?: unknown }) => entry?.path === job.finishedTranscriptPath);
    const legacyVersion = job.finishedTranscriptPath && !hasLegacyVersion
      ? [{
          id: 'legacy-finished-transcript',
          label: 'Completed Transcript',
          filename: job.finishedTranscriptFilename || 'Finished transcript',
          path: job.finishedTranscriptPath,
          contentType: job.finishedTranscriptContentType || 'application/octet-stream',
          size: job.finishedTranscriptSize || 0,
          uploadedAt: job.finishedTranscriptUploadedAt || job.completedAt || Timestamp.now(),
          uploadedBy: job.finishedTranscriptUploadedBy || '',
          versionType: 'transcript',
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
        path: storagePath,
        contentType,
        size: uploadedFile.size,
        uploadedAt: Timestamp.now(),
        uploadedBy: decodedToken.uid,
        versionType: 'transcript',
        isLatest: true,
      },
    ];

    await jobRef.update({
      finishedTranscriptPath: storagePath,
      finishedTranscriptFilename: filename,
      finishedTranscriptUploadedAt: FieldValue.serverTimestamp(),
      finishedTranscriptUploadedBy: decodedToken.uid,
      finishedTranscriptContentType: contentType,
      finishedTranscriptSize: uploadedFile.size,
      completedFiles,
      status: 'complete',
      completedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      ok: true,
      filename,
      path: storagePath,
      contentType,
      size: uploadedFile.size,
      fileId,
      label,
    });
  } catch (error) {
    console.error('[Finished Transcript] Upload error:', error);
    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Failed to upload finished transcript' }, { status: 500 });
  }
}
