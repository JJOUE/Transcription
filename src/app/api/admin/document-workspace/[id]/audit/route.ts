import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) return NextResponse.json({ ok: false, error: 'Authentication required' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const admin = await adminDb.collection('users').doc(decoded.uid).get();
    if (admin.data()?.role !== 'admin') return NextResponse.json({ ok: false, error: 'Admin access required' }, { status: 403 });
    const { id } = await params;
    const project = await adminDb.collection('transcriptions').doc(id).get();
    if (!project.exists || project.data()?.type !== 'office') return NextResponse.json({ ok: false, error: 'Project not found' }, { status: 404 });
    const events = await project.ref.collection('auditEvents').orderBy('timestamp', 'desc').limit(100).get();
    return NextResponse.json({ ok: true, events: events.docs.map(doc => ({ id: doc.id, ...doc.data() })) });
  } catch (error) {
    console.error('[Document Workspace Audit] Failed:', error);
    return NextResponse.json({ ok: false, error: 'Audit history could not be loaded' }, { status: 500 });
  }
}
