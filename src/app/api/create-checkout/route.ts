import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-08-27.basil',
});

export async function POST(request: NextRequest) {
  try {
    // Get user authentication
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      const authHeader = request.headers.get('authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({
          error: 'Authentication required',
          message: 'You must be logged in to make a payment'
        }, { status: 401 });
      }

      const headerToken = authHeader.split('Bearer ')[1];
      try {
        const decodedToken = await adminAuth.verifyIdToken(headerToken);
        return createCheckoutSession(request, decodedToken);
      } catch (error) {
        return NextResponse.json({
          error: 'Invalid authentication token'
        }, { status: 401 });
      }
    }

    // Verify cookie token
    try {
      const decodedToken = await adminAuth.verifyIdToken(token);
      return createCheckoutSession(request, decodedToken);
    } catch (error) {
      return NextResponse.json({
        error: 'Session expired, please login again'
      }, { status: 401 });
    }

  } catch (error) {
    console.error('[Create Checkout] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session'
    }, { status: 500 });
  }
}

async function createCheckoutSession(request: NextRequest, decodedToken: any) {
  try {
    const { amount, type = 'wallet', packageId } = await request.json();

    console.log('[Create Checkout] Request:', { type, packageId });

    if (type !== 'package' && (!amount || amount < 1)) {
      return NextResponse.json({
        error: 'Invalid amount'
      }, { status: 400 });
    }

    const userId = decodedToken.uid;
    const userEmail = decodedToken.email;

    let verifiedPackage: {
      type: 'ai' | 'hybrid' | 'human';
      name: string;
      minutes: number;
      rate: number;
      price: number;
      id: string;
    } | null = null;

    if (type === 'package') {
      if (!packageId || typeof packageId !== 'string') {
        return NextResponse.json({ error: 'A valid package selection is required' }, { status: 400 });
      }

      const packageSnapshot = await adminDb.collection('packages').doc(packageId).get();
      if (!packageSnapshot.exists) {
        return NextResponse.json({ error: 'The selected package is no longer available' }, { status: 400 });
      }

      const catalogPackage = packageSnapshot.data();
      const packageType = catalogPackage?.type;
      if (!catalogPackage?.active || !['ai', 'hybrid', 'human'].includes(packageType)) {
        return NextResponse.json({ error: 'The selected package is not available' }, { status: 400 });
      }

      const minutes = Number(catalogPackage.minutes);
      const rate = Number(catalogPackage.perMinuteRate);
      const price = Number(catalogPackage.price);
      if (![minutes, rate, price].every(Number.isFinite) || minutes <= 0 || rate <= 0 || price <= 0) {
        console.error('[Create Checkout] Invalid package catalog data:', packageId);
        return NextResponse.json({ error: 'The selected package is not configured correctly' }, { status: 500 });
      }

      verifiedPackage = {
        id: packageSnapshot.id,
        type: packageType,
        name: typeof catalogPackage.name === 'string' && catalogPackage.name.trim()
          ? catalogPackage.name.trim()
          : `${packageType === 'ai' ? 'AI Transcription' : packageType === 'hybrid' ? 'Hybrid Transcription' : 'Human Transcription'} - ${minutes} minutes`,
        minutes,
        rate,
        price,
      };
    }

    console.log(`[Create Checkout] Creating session for user ${userId} (${userEmail})`);

  // Create line items based on type
  const lineItems = type === 'package' && verifiedPackage ? [{
    price_data: {
      currency: 'cad',
      product_data: {
        name: verifiedPackage.name,
        description: `${verifiedPackage.minutes} minutes of ${verifiedPackage.type} transcription`
      },
      unit_amount: Math.round(verifiedPackage.price * 100),
    },
    quantity: 1,
  }] : [{
    price_data: {
      currency: 'cad',
      product_data: {
        name: 'Pay-as-you-go Transcription',
        description: `Prepayment for pay-as-you-go transcription services (CA$${amount})`
      },
      unit_amount: Math.round(amount * 100),
    },
    quantity: 1,
  }];

    // Create Stripe checkout session with userId ALWAYS included
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: lineItems,
      mode: 'payment',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL || getBaseUrl(request)}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || getBaseUrl(request)}/billing?canceled=true`,
      customer_email: userEmail, // Pre-fill with account email
      metadata: {
        // ALWAYS include these - this is foolproof!
        userId: userId,
        userEmail: userEmail,
        type: type,
        // Package-specific metadata
        ...(type === 'package' && verifiedPackage ? {
          packageType: verifiedPackage.type,
          packageId: verifiedPackage.id,
          packageMinutes: String(verifiedPackage.minutes),
          packageRate: String(verifiedPackage.rate),
          packageName: verifiedPackage.name
        } : {})
      },
      // Prevent customer from changing email during checkout
      customer_creation: 'always',
      billing_address_collection: 'required',
    });

    console.log(`[Create Checkout] Session created: ${session.id} with metadata:`, session.metadata);

    return NextResponse.json({
      checkoutUrl: session.url,
      sessionId: session.id,
      message: 'Redirecting to secure checkout...',
      metadata: {
        userId: userId,
        email: userEmail,
        amount: amount
      }
    });
  } catch (error) {
    console.error('[Create Checkout] Session creation failed:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

function getBaseUrl(request: NextRequest): string {
  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  return `${protocol}://${host}`;
}

// GET endpoint to check if authenticated
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        message: 'Please login to make payments'
      });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);

    return NextResponse.json({
      authenticated: true,
      userId: decodedToken.uid,
      email: decodedToken.email,
      message: 'Ready to create checkout session'
    });

  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      message: 'Session expired'
    });
  }
}
