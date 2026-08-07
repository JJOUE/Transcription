import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { authoritativeAiRate, isProfessionalEditorMembershipActive } from '@/lib/billing/transcription-rates';

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const snapshot = await adminDb.collection('users').doc(decoded.uid).get();
    const membership = snapshot.data()?.professionalEditorMembership;
    return NextResponse.json({ active: isProfessionalEditorMembershipActive(membership), aiRate: authoritativeAiRate(membership) });
  } catch {
    return NextResponse.json({ active: false, aiRate: 0.05 });
  }
}
