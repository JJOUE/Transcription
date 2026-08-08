import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { getOrCreateStripeCustomer, stripe } from '@/lib/stripe/client';
import { PROFESSIONAL_EDITOR_MEMBERSHIP_TYPE, professionalEditorPriceId } from '@/lib/billing/professional-editor-membership';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || request.cookies.get('auth-token')?.value;
    if (!token) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const decoded = await adminAuth.verifyIdToken(token);
    const priceId = professionalEditorPriceId();
    if (!priceId) return NextResponse.json({ error: 'Transcript Editor Membership checkout is not configured.' }, { status: 503 });
    const snapshot = await adminDb.collection('users').doc(decoded.uid).get();
    if (!snapshot.exists) return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    const user = snapshot.data() || {};
    const email = user.email || decoded.email;
    if (!email) return NextResponse.json({ error: 'User email not found' }, { status: 400 });
    const customer = await getOrCreateStripeCustomer(decoded.uid, email, user.displayName || user.name);
    const origin = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin');
    if (!origin) return NextResponse.json({ error: 'Application URL is not configured.' }, { status: 503 });
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription', customer: customer.id, client_reference_id: decoded.uid,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing/success?membership=professional-editor&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?membership_canceled=true`,
      metadata: { type: PROFESSIONAL_EDITOR_MEMBERSHIP_TYPE, userId: decoded.uid },
      subscription_data: { metadata: { type: PROFESSIONAL_EDITOR_MEMBERSHIP_TYPE, userId: decoded.uid } },
    });
    return NextResponse.json({ sessionId: session.id, url: session.url });
  } catch (error) {
    console.error('[Professional Editor Checkout] Failed:', error);
    return NextResponse.json({ error: 'Unable to start Transcript Editor Membership checkout.' }, { status: 500 });
  }
}
