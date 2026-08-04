import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin';

const STORAGE_PATH_FIELDS = [
  'filePath',
  'templatePath',
  'voiceInstructionsPath',
  'adminTranscriptPath',
  'officeCompletedDocumentPath',
  'finishedTranscriptPath',
  'transcriptStoragePath',
  'storagePath',
  'templateStoragePath',
] as const;

const getAdminUser = async (request: NextRequest) => {
  const cookieToken = request.cookies.get('auth-token')?.value;
  const headerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const token = cookieToken || headerToken;

  if (!token) return null;

  const decodedToken = await adminAuth.verifyIdToken(token);
  const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
  if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') return null;

  return decodedToken;
};

const toIsoString = (value: unknown) => {
  if (value && typeof value === 'object' && 'toDate' in value) {
    const toDate = (value as { toDate?: () => Date }).toDate;
    if (typeof toDate === 'function') return toDate.call(value).toISOString();
  }
  return null;
};

const isAllowedStoredPath = (path: string, userId: string, jobId: string) =>
  path.startsWith(`transcriptions/${userId}/`) ||
  path.startsWith(`transcripts/${jobId}/`);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const jobDoc = await adminDb.collection('transcriptions').doc(id).get();
    if (!jobDoc.exists) {
      return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 });
    }

    const job = jobDoc.data() || {};
    const storedPaths = STORAGE_PATH_FIELDS
      .map(field => ({ field, path: job[field] }))
      .filter((entry): entry is { field: typeof STORAGE_PATH_FIELDS[number]; path: string } =>
        typeof entry.path === 'string' && entry.path.length > 0
      );

    return NextResponse.json({
      ok: true,
      job: {
        id,
        userId: job.userId || null,
        filename: job.originalFilename || job.filename || 'Unknown file',
        status: job.status || 'unknown',
        mode: job.mode || null,
        type: job.type || 'transcription',
        createdAt: toIsoString(job.createdAt),
        completedAt: toIsoString(job.completedAt),
        deletionRequested: Boolean(job.deletionRequested),
        deletionRequestStatus: job.deletionRequestStatus || null,
        deletionStatus: job.deletionStatus || null,
        filesDeletedAt: toIsoString(job.filesDeletedAt),
        storedPaths,
      },
    });
  } catch (error) {
    console.error('[Admin File Deletion] Lookup failed:', error);
    return NextResponse.json({ ok: false, error: 'Failed to load job details' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getAdminUser(request);
    if (!adminUser) {
      return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const confirmedJobId = typeof body.confirmJobId === 'string' ? body.confirmJobId.trim() : '';
    const reason = typeof body.reason === 'string' ? body.reason.trim() : '';

    if (confirmedJobId !== id) {
      return NextResponse.json({ ok: false, error: 'Job ID confirmation does not match.' }, { status: 400 });
    }
    if (!reason) {
      return NextResponse.json({ ok: false, error: 'A deletion reason is required.' }, { status: 400 });
    }

    const jobRef = adminDb.collection('transcriptions').doc(id);
    const jobDoc = await jobRef.get();
    if (!jobDoc.exists) {
      return NextResponse.json({ ok: false, error: 'Job not found' }, { status: 404 });
    }

    const job = jobDoc.data() || {};
    if (!job.userId || typeof job.userId !== 'string') {
      return NextResponse.json({ ok: false, error: 'Job has no client user ID.' }, { status: 400 });
    }
    if (job.filesDeletedAt || job.deletionStatus === 'deleted') {
      return NextResponse.json({ ok: true, alreadyDeleted: true, deleted: [], missing: [], jobId: id });
    }

    const candidatePaths = new Set<string>();
    for (const field of STORAGE_PATH_FIELDS) {
      const path = job[field];
      if (typeof path === 'string' && path && isAllowedStoredPath(path, job.userId, id)) {
        candidatePaths.add(path);
      }
    }

    const bucket = adminStorage.bucket();
    const jobPrefixes = [
      `transcriptions/${job.userId}/${id}/`,
      `transcripts/${id}/`,
    ];

    const prefixFailures: Array<{ path: string; error: string }> = [];
    for (const prefix of jobPrefixes) {
      try {
        const [files] = await bucket.getFiles({ prefix });
        files.forEach(file => candidatePaths.add(file.name));
      } catch (listError) {
        prefixFailures.push({
          path: prefix,
          error: listError instanceof Error ? listError.message : 'Unable to list Storage prefix',
        });
        console.error('[Admin File Deletion] Could not list job prefix', { jobId: id, prefix, error: listError });
      }
    }

    const deleted: string[] = [];
    const missing: string[] = [];
    const failed: Array<{ path: string; error: string }> = [...prefixFailures];

    for (const path of candidatePaths) {
      try {
        const file = bucket.file(path);
        const [exists] = await file.exists();
        if (!exists) {
          missing.push(path);
          continue;
        }
        await file.delete();
        deleted.push(path);
      } catch (deleteError) {
        const message = deleteError instanceof Error ? deleteError.message : 'Unknown Storage error';
        failed.push({ path, error: message });
        console.error('[Admin File Deletion] File deletion failed', { jobId: id, path, error: deleteError });
      }
    }

    if (failed.length > 0) {
      await jobRef.update({
        deletionStatus: 'error',
        deletionLastAttemptAt: FieldValue.serverTimestamp(),
        deletionLastAttemptBy: adminUser.uid,
        deletionReason: reason,
        deletionFailureCount: failed.length,
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json(
        { ok: false, error: 'Some files could not be deleted.', jobId: id, deleted, missing, failed },
        { status: 500 }
      );
    }

    await jobRef.update({
      filesDeletedAt: FieldValue.serverTimestamp(),
      filesDeletedBy: adminUser.uid,
      deletionStatus: 'deleted',
      deletionRequestStatus: 'processed',
      deletionCompletedAt: FieldValue.serverTimestamp(),
      deletionCompletedBy: adminUser.uid,
      deletionReason: reason,
      deletionDeletedPathCount: deleted.length,
      deletionMissingPathCount: missing.length,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true, jobId: id, deleted, missing, failed: [] });
  } catch (error) {
    console.error('[Admin File Deletion] Request failed:', error);
    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json({ ok: false, error: 'Invalid authentication token' }, { status: 401 });
    }
    return NextResponse.json({ ok: false, error: 'Failed to delete job files' }, { status: 500 });
  }
}
