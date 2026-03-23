import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb, adminStorage } from '@/lib/firebase/admin';

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get the transcription document
    const transcriptionDoc = await adminDb.collection('transcriptions').doc(id).get();

    if (!transcriptionDoc.exists) {
      return NextResponse.json(
        { error: 'Transcription not found' },
        { status: 404 }
      );
    }

    const transcriptionData = transcriptionDoc.data();

    // Verify ownership or admin role
    if (transcriptionData?.userId !== userId) {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      if (userDoc.data()?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
      }
    }

    // Delete associated storage files
    const bucket = adminStorage.bucket();
    const storagePaths = [
      transcriptionData?.storagePath,
      transcriptionData?.transcriptStoragePath,
      transcriptionData?.templateStoragePath,
    ].filter(Boolean);

    // Also try the standard upload path
    if (transcriptionData?.userId) {
      try {
        await bucket.deleteFiles({
          prefix: `transcriptions/${transcriptionData.userId}/${id}`,
        });
      } catch {
        // Best-effort cleanup
      }
    }

    for (const path of storagePaths) {
      try {
        await bucket.file(path).delete();
      } catch {
        // File may not exist
      }
    }

    // Delete the Firestore document
    await adminDb.collection('transcriptions').doc(id).delete();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[API] Error deleting transcription:', error);

    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to delete transcription' },
      { status: 500 }
    );
  }
}
