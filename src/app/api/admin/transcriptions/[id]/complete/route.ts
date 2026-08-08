import { FieldValue } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin';
import {
  PROFESSIONAL_FINISHED_FILE_REQUIRED_MESSAGE,
  professionalCompletionCheck,
} from '@/lib/transcription/professional-completion';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const adminSnapshot = await adminDb.collection('users').doc(decoded.uid).get();
    if (adminSnapshot.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Administrator access required' }, { status: 403 });
    }

    const { id } = await params;
    const jobRef = adminDb.collection('transcriptions').doc(id);
    const jobSnapshot = await jobRef.get();
    if (!jobSnapshot.exists) return NextResponse.json({ error: 'Transcription project not found' }, { status: 404 });

    const job = jobSnapshot.data() || {};
    const completion = professionalCompletionCheck(id, job);
    if (!completion.allowed) {
      return NextResponse.json({ error: completion.error, code: 'FINISHED_TRANSCRIPT_REQUIRED' }, { status: 409 });
    }

    if (completion.requiresStorageVerification) {
      const [exists] = await adminStorage.bucket().file(completion.path).exists();
      if (!exists) {
        return NextResponse.json({
          error: PROFESSIONAL_FINISHED_FILE_REQUIRED_MESSAGE,
          code: 'FINISHED_TRANSCRIPT_REQUIRED',
        }, { status: 409 });
      }
    }

    if (job.status !== 'complete') {
      await jobRef.update({
        status: 'complete',
        completedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }

    return NextResponse.json({ ok: true, status: 'complete' });
  } catch (error) {
    console.error('[Professional Completion] Unable to complete transcription project', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    return NextResponse.json({ error: 'Unable to complete transcription project' }, { status: 500 });
  }
}
