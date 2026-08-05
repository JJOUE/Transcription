import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

function bearerToken(request: NextRequest) {
  return request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
    request.cookies.get('auth-token')?.value;
}

export async function POST(request: NextRequest) {
  try {
    const token = bearerToken(request);
    if (!token) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });

    const decoded = await adminAuth.verifyIdToken(token);
    const body = await request.json().catch(() => ({})) as { action?: string; name?: string };
    const userRef = adminDb.collection('users').doc(decoded.uid);

    if (body.action === 'initialize') {
      await adminDb.runTransaction(async transaction => {
        const snapshot = await transaction.get(userRef);
        if (snapshot.exists) return;
        transaction.create(userRef, {
          uid: decoded.uid,
          email: decoded.email || '',
          name: typeof body.name === 'string' ? body.name.trim().slice(0, 120) : '',
          role: 'user',
          createdAt: FieldValue.serverTimestamp(),
          lastLogin: FieldValue.serverTimestamp(),
          walletBalance: 0,
          totalSpent: 0,
          freeTrialMinutes: 60,
          freeTrialMinutesTotal: 60,
          freeTrialMinutesUsed: 0,
          freeTrialActive: true,
        });
      });
    } else if (body.action === 'touch-login') {
      const snapshot = await userRef.get();
      if (snapshot.exists) await userRef.update({ lastLogin: FieldValue.serverTimestamp() });
    } else {
      return NextResponse.json({ ok: false, error: 'Unsupported profile action' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Auth Profile] Server profile operation failed:', error);
    return NextResponse.json({ ok: false, error: 'Profile initialization failed' }, { status: 500 });
  }
}
