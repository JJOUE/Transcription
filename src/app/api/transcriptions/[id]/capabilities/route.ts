import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { resolveTranscriptCapabilities } from '@/lib/transcript-access/entitlements';
import { isProfessionalEditorMembershipActive } from '@/lib/billing/transcription-rates';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const { id } = await params;
    const [jobSnapshot, userSnapshot] = await Promise.all([
      adminDb.collection('transcriptions').doc(id).get(),
      adminDb.collection('users').doc(decoded.uid).get(),
    ]);
    if (!jobSnapshot.exists) return NextResponse.json({ error: 'Transcription not found' }, { status: 404 });
    const job = jobSnapshot.data() || {};
    const user = userSnapshot.data() || {};
    const isAdmin = user.role === 'admin';
    if (job.userId !== decoded.uid && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json(resolveTranscriptCapabilities({
      job,
      isAdmin,
      membershipActive: isProfessionalEditorMembershipActive(user.professionalEditorMembership),
    }));
  } catch {
    return NextResponse.json({ error: 'Unable to resolve transcript access' }, { status: 401 });
  }
}
