import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin endpoint to lookup transcription jobs by filename or userId
 * GET /api/admin/lookup-job?filename=HairMax&userId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);

    // Check if user is admin
    const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const url = new URL(request.url);
    const filename = url.searchParams.get('filename');
    const userId = url.searchParams.get('userId');
    const status = url.searchParams.get('status');
    const limit = parseInt(url.searchParams.get('limit') || '10');

    // Build query
    let query: FirebaseFirestore.Query = adminDb.collection('transcriptions');

    if (userId) {
      query = query.where('userId', '==', userId);
    }

    if (status) {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('createdAt', 'desc').limit(limit);

    const snapshot = await query.get();

    let jobs = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        originalFilename: data.originalFilename,
        status: data.status,
        mode: data.mode,
        duration: data.duration,
        userId: data.userId,
        speechmaticsJobId: data.speechmaticsJobId || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        completedAt: data.completedAt?.toDate?.()?.toISOString() || null,
        error: data.specialInstructions || null,
        hasTranscript: !!data.transcript,
      };
    });

    // Filter by filename if provided (client-side filter since Firestore doesn't support contains)
    if (filename) {
      jobs = jobs.filter(job =>
        job.originalFilename?.toLowerCase().includes(filename.toLowerCase())
      );
    }

    // Get user info for the jobs
    const userIds = [...new Set(jobs.map(j => j.userId))];
    const userEmails: Record<string, string> = {};

    for (const uid of userIds) {
      try {
        const userDoc = await adminDb.collection('users').doc(uid).get();
        if (userDoc.exists) {
          userEmails[uid] = userDoc.data()?.email || 'unknown';
        }
      } catch (e) {
        userEmails[uid] = 'error fetching';
      }
    }

    // Add email to jobs
    const jobsWithEmail = jobs.map(job => ({
      ...job,
      userEmail: userEmails[job.userId] || 'unknown'
    }));

    return NextResponse.json({
      count: jobsWithEmail.length,
      query: { filename, userId, status, limit },
      jobs: jobsWithEmail,
    });

  } catch (error) {
    console.error('[Admin Lookup Job] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
