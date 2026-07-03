import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin';

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
        { error: 'Voice instructions are only available for Document Workspace projects' },
        { status: 400 }
      );
    }

    if (job.userId !== userId) {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (userData?.role !== 'admin') {
        return NextResponse.json(
          { error: 'You do not have permission to access these voice instructions' },
          { status: 403 }
        );
      }
    }

    if (job.filesDeletedAt || job.deletionStatus === 'deleted') {
      return NextResponse.json(
        { error: 'Files have expired or been deleted' },
        { status: 410 }
      );
    }

    const voicePath = job.voiceInstructionsPath;

    if (!voicePath || typeof voicePath !== 'string') {
      return NextResponse.json(
        { error: 'Voice instructions are not available' },
        { status: 404 }
      );
    }

    const expectedPrefix = `transcriptions/${job.userId}/`;
    if (!voicePath.startsWith(expectedPrefix)) {
      console.error('[Document Workspace Voice Instructions] Stored path failed ownership check', {
        jobId: id,
        userId: job.userId,
        voicePath,
      });

      return NextResponse.json(
        { error: 'Invalid voice instructions path' },
        { status: 403 }
      );
    }

    const bucket = adminStorage.bucket();
    const file = bucket.file(voicePath);
    const [exists] = await file.exists();

    if (!exists) {
      return NextResponse.json(
        { error: 'Voice instructions file not found' },
        { status: 404 }
      );
    }

    const [contents] = await file.download();
    const [metadata] = await file.getMetadata();
    const filename = job.voiceInstructionsFilename || metadata.name?.split('/').pop() || 'voice-instructions.webm';
    const contentType = metadata.contentType || 'audio/webm';

    return new NextResponse(contents, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename.replace(/"/g, '')}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('[Document Workspace Voice Instructions] Error:', error);

    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to access voice instructions' },
      { status: 500 }
    );
  }
}
