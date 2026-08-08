import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getStorage } from 'firebase-admin/storage';
import { FieldValue } from 'firebase-admin/firestore';
import { AI_STANDARD_TRANSCRIPT_STYLE_ID, APPROVED_TRANSCRIPT_STYLE_IDS, resolveTranscriptCapabilities, transcriptStyleAllowed } from '@/lib/transcript-access/entitlements';
import { isProfessionalEditorMembershipActive } from '@/lib/billing/transcription-rates';

async function authorizeTranscript(request: NextRequest, id: string) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.cookies.get('auth-token')?.value;
  if (!token) throw new Error('AUTH_REQUIRED');
  const decoded = await adminAuth.verifyIdToken(token);
  const [jobSnapshot, userSnapshot] = await Promise.all([
    adminDb.collection('transcriptions').doc(id).get(),
    adminDb.collection('users').doc(decoded.uid).get(),
  ]);
  if (!jobSnapshot.exists) throw new Error('NOT_FOUND');
  const job = jobSnapshot.data() || {};
  const user = userSnapshot.data() || {};
  const isAdmin = user.role === 'admin';
  if (job.userId !== decoded.uid && !isAdmin) throw new Error('FORBIDDEN');
  return {
    job,
    capabilities: resolveTranscriptCapabilities({
      job,
      isAdmin,
      membershipActive: isProfessionalEditorMembershipActive(user.professionalEditorMembership),
    }),
  };
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const { job: transcriptionData, capabilities } = await authorizeTranscript(request, id);
    if (!capabilities.canEditTranscript) {
      return NextResponse.json({ error: 'Transcript content editing requires a Transcript Editor Membership' }, { status: 403 });
    }

    // Get the updated transcript data from request body
    const body = await request.json();
    const { timestampedTranscript, transcript } = body;
    if (typeof transcript !== 'string' || (timestampedTranscript !== undefined && !Array.isArray(timestampedTranscript))) {
      return NextResponse.json({ error: 'Invalid transcript update' }, { status: 400 });
    }

    console.log('[API PUT] Received update request:', {
      transcriptionId: id,
      hasTimestampedTranscript: !!timestampedTranscript,
      segmentsCount: timestampedTranscript?.length,
      transcriptLength: transcript?.length,
      firstSegmentSample: timestampedTranscript?.[0]?.text?.substring(0, 50)
    });

    // Check if transcript is in Storage
    const transcriptStoragePath = transcriptionData?.transcriptStoragePath;

    if (!transcriptStoragePath) {
      await adminDb.collection('transcriptions').doc(id).update({
        transcript,
        timestampedTranscript,
        updatedAt: FieldValue.serverTimestamp(),
      });
      return NextResponse.json({ success: true, message: 'Transcript updated successfully' });
    }

    console.log('[API PUT] Updating Storage file:', transcriptStoragePath);

    // Update transcript in Storage
    const bucket = getStorage().bucket();
    const file = bucket.file(transcriptStoragePath);

    const updatedTranscriptData = {
      transcript,
      timestampedTranscript
    };

    console.log('[API PUT] Writing data to Storage:', {
      dataSize: JSON.stringify(updatedTranscriptData).length,
      segmentsCount: timestampedTranscript?.length
    });

    await file.save(JSON.stringify(updatedTranscriptData), {
      contentType: 'application/json',
      metadata: {
        updated: new Date().toISOString()
      }
    });

    console.log(`[API PUT] Successfully updated transcript in Storage: ${transcriptStoragePath}`);

    return NextResponse.json({
      success: true,
      message: 'Transcript updated successfully'
    });

  } catch (error) {
    console.error('[API] Error updating transcript in Storage:', error);

    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to update transcript',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { capabilities } = await authorizeTranscript(request, id);
    const body = await request.json();
    const keys = Object.keys(body);
    if (keys.length === 0 || keys.some(key => !['speakerNames', 'timestampFrequency', 'transcriptStyleId'].includes(key))) {
      return NextResponse.json({ error: 'Unsupported transcript metadata update' }, { status: 400 });
    }
    const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if ('speakerNames' in body) {
      if (!capabilities.canRenameSpeakers || !body.speakerNames || typeof body.speakerNames !== 'object' || Array.isArray(body.speakerNames)) {
        return NextResponse.json({ error: 'Invalid speaker names' }, { status: 403 });
      }
      const entries = Object.entries(body.speakerNames);
      if (entries.length > 100 || entries.some(([key, value]) => !key || typeof value !== 'string' || value.length > 120)) {
        return NextResponse.json({ error: 'Invalid speaker names' }, { status: 400 });
      }
      updates.speakerNames = body.speakerNames;
    }
    if ('timestampFrequency' in body) {
      if (!capabilities.canChangeTimecodes || !['none', 30, 60, 300].includes(body.timestampFrequency)) {
        return NextResponse.json({ error: 'Invalid timestamp frequency' }, { status: 400 });
      }
      updates.timestampFrequency = body.timestampFrequency;
    }
    if ('transcriptStyleId' in body) {
      if (typeof body.transcriptStyleId !== 'string' || !APPROVED_TRANSCRIPT_STYLE_IDS.includes(body.transcriptStyleId as typeof APPROVED_TRANSCRIPT_STYLE_IDS[number]) || !transcriptStyleAllowed(capabilities, body.transcriptStyleId)) {
        return NextResponse.json({ error: 'This transcript style requires a Transcript Editor Membership' }, { status: 403 });
      }
      updates.transcriptStyleId = capabilities.accessLevel === 'standard' ? AI_STANDARD_TRANSCRIPT_STYLE_ID : body.transcriptStyleId;
    }
    await adminDb.collection('transcriptions').doc(id).update(updates);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const status = message === 'AUTH_REQUIRED' ? 401 : message === 'NOT_FOUND' ? 404 : message === 'FORBIDDEN' ? 403 : 500;
    return NextResponse.json({ error: status === 500 ? 'Unable to update transcript metadata' : message }, { status });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get auth token from cookie
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Verify the token
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

    // Check if user owns this transcription
    if (transcriptionData?.userId !== userId) {
      // Check if user is admin
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const userData = userDoc.data();

      if (userData?.role !== 'admin') {
        return NextResponse.json(
          { error: 'You do not have permission to view this transcription' },
          { status: 403 }
        );
      }
    }

    // Check if transcript is in Storage or Firestore
    const transcriptStoragePath = transcriptionData?.transcriptStoragePath;

    if (transcriptStoragePath) {
      // Fetch transcript from Storage
      const bucket = getStorage().bucket();
      const file = bucket.file(transcriptStoragePath);

      const [exists] = await file.exists();
      if (!exists) {
        return NextResponse.json(
          { error: 'Transcript file not found in Storage' },
          { status: 404 }
        );
      }

      const [fileContents] = await file.download();
      const transcriptData = JSON.parse(fileContents.toString('utf-8'));

      return NextResponse.json(transcriptData);
    } else if (transcriptionData?.transcript || transcriptionData?.timestampedTranscript) {
      // Transcript is stored directly in Firestore
      return NextResponse.json({
        transcript: transcriptionData.transcript,
        timestampedTranscript: transcriptionData.timestampedTranscript
      });
    } else {
      return NextResponse.json(
        { error: 'No transcript data found' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('[API] Error fetching transcript from Storage:', error);

    if (error instanceof Error && error.message.includes('ID token')) {
      return NextResponse.json(
        { error: 'Invalid authentication token' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to fetch transcript',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
