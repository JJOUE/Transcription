import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { adminAuth, adminDb } from '@/lib/firebase/admin';

async function requireDebugPaymentAccess(request: NextRequest): Promise<NextResponse | null> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const token = request.cookies.get('auth-token')?.value;
  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    const adminDoc = await adminDb.collection('users').doc(decodedToken.uid).get();

    if (!adminDoc.exists || adminDoc.data()?.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    return null;
  } catch (error) {
    console.error('[Simulate Payment] Access check failed:', error);
    return NextResponse.json({ error: 'Invalid authentication token' }, { status: 401 });
  }
}

/**
 * Simulates a Stripe webhook to test the complete payment flow
 * WITHOUT making an actual payment
 */
export async function POST(request: NextRequest) {
  try {
    const accessResponse = await requireDebugPaymentAccess(request);
    if (accessResponse) return accessResponse;

    const body = await request.json();
    const {
      userId,
      amount = 50,
      type = 'wallet',
      testOnly = true,
      packageData
    } = body;

    if (!userId) {
      return NextResponse.json({
        error: 'userId is required - get this from Firebase Auth'
      }, { status: 400 });
    }

    // Get webhook configuration
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      return NextResponse.json({
        error: 'STRIPE_WEBHOOK_SECRET not configured - cannot simulate webhook',
        recommendation: 'Add STRIPE_WEBHOOK_SECRET from Stripe Dashboard to Vercel environment variables'
      }, { status: 500 });
    }

    // Construct the webhook URL
    const host = request.headers.get('host');
    const protocol = request.headers.get('x-forwarded-proto') || 'https';
    const webhookUrl = `${protocol}://${host}/api/billing/webhook`;

    // Create a realistic Stripe event payload
    const timestamp = Math.floor(Date.now() / 1000);
    const eventId = `evt_simulated_${Date.now()}`;

    const payload = {
      id: eventId,
      object: 'event',
      api_version: '2025-08-27',
      created: timestamp,
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_test_simulated_${Date.now()}`,
          object: 'checkout.session',
          amount_total: amount * 100, // Convert to cents
          currency: 'cad',
          customer: null,
          customer_email: testOnly ? 'test@example.com' : null,
          payment_status: 'paid',
          status: 'complete',
          success_url: `${protocol}://${host}/billing?success=true`,
          cancel_url: `${protocol}://${host}/billing?canceled=true`,
          metadata: type === 'package' && packageData ? {
            userId,
            type: 'package',
            packageType: packageData.type,
            packageMinutes: packageData.minutes?.toString(),
            packageRate: packageData.rate?.toString(),
            packageName: packageData.name,
            simulated: 'true'
          } : {
            userId,
            type: 'wallet',
            simulated: 'true'
          },
          created: timestamp,
          expires_at: timestamp + 86400,
        }
      },
      livemode: !testOnly,
      pending_webhooks: 1,
      request: {
        id: null,
        idempotency_key: null
      }
    };

    // Generate a valid Stripe webhook signature
    const payloadString = JSON.stringify(payload);
    const signedPayload = `${timestamp}.${payloadString}`;

    // Parse the webhook secret properly
    // Stripe webhook secrets after 'whsec_' are base64 encoded
    let secretBytes;
    try {
      // Remove 'whsec_' prefix and decode from base64
      const secretPart = webhookSecret.replace('whsec_', '');
      secretBytes = Buffer.from(secretPart, 'base64');
    } catch (e) {
      // If base64 decode fails, try using it as-is
      console.log('[Simulate] Using webhook secret as-is (not base64)');
      secretBytes = webhookSecret.replace('whsec_', '');
    }

    // Create signature using webhook secret
    const expectedSignature = crypto
      .createHmac('sha256', secretBytes)
      .update(signedPayload, 'utf8')
      .digest('hex');

    const signature = `t=${timestamp},v1=${expectedSignature}`;

    console.log('[Simulate] Webhook secret prefix:', webhookSecret.substring(0, 10));
    console.log('[Simulate] Generated signature:', signature.substring(0, 50) + '...');

    // Log what we're about to send
    console.log('[Simulate Payment] Sending webhook to:', webhookUrl);
    console.log('[Simulate Payment] User ID:', userId);
    console.log('[Simulate Payment] Amount:', amount);
    console.log('[Simulate Payment] Type:', type);

    // Send the simulated webhook to your actual webhook endpoint
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature,
        'User-Agent': 'Stripe/1.0 (simulated-webhook)'
      },
      body: payloadString
    });

    const responseText = await response.text();
    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Check if the webhook was processed successfully
    const success = response.status === 200;

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Payment simulation successful!',
        details: {
          webhookUrl,
          userId,
          amount: `CA$${amount}`,
          type,
          response: {
            status: response.status,
            data: responseData
          }
        },
        nextSteps: [
          '1. Check your user account balance in Firebase',
          '2. Check the transactions collection for the new record',
          '3. Verify the balance updated on the website UI',
          '4. If successful, your production payment flow is working!'
        ]
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Webhook processing failed',
        error: responseData,
        details: {
          webhookUrl,
          responseStatus: response.status,
          responseText: responseText.substring(0, 500)
        },
        troubleshooting: response.status === 400 ? [
          'Signature verification failed - check STRIPE_WEBHOOK_SECRET',
          'Ensure webhook secret in Vercel matches Stripe Dashboard',
          'Try refreshing the webhook signing secret in Stripe'
        ] : [
          'Check Vercel function logs for errors',
          'Verify Firebase Admin SDK is configured',
          'Check user exists in Firebase'
        ]
      });
    }

  } catch (error) {
    console.error('[Simulate Payment] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Simulation failed',
      type: error instanceof Error ? error.constructor.name : 'Unknown'
    }, { status: 500 });
  }
}

// GET endpoint to provide instructions
export async function GET(request: NextRequest) {
  const accessResponse = await requireDebugPaymentAccess(request);
  if (accessResponse) return accessResponse;

  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'https';

  return NextResponse.json({
    title: 'Payment Simulation Endpoint',
    description: 'Test your complete payment flow without making real payments',
    warning: '⚠️ This will create real records in your database - use carefully!',
    usage: {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        userId: 'YOUR_FIREBASE_USER_ID (required)',
        amount: 50, // Amount in CAD (optional, default 50)
        type: 'wallet', // or 'package'
        packageData: { // Only for type='package'
          type: 'ai',
          name: 'AI Package Test',
          minutes: 60,
          rate: 1.0
        }
      }
    },
    example: {
      curl: `curl -X POST ${protocol}://${host}/api/debug/simulate-payment \\
  -H "Content-Type: application/json" \\
  -d '{
    "userId": "YOUR_USER_ID",
    "amount": 25,
    "type": "wallet"
  }'`
    },
    steps: [
      '1. Get your userId from Firebase Auth or your user profile',
      '2. Send POST request with your userId',
      '3. Check if webhook processes successfully',
      '4. Verify balance updated in Firebase and website',
      '5. If all works, your payment system is fully functional!'
    ],
    configuration: {
      hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
      webhookUrl: `${protocol}://${host}/api/billing/webhook`,
      environment: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV
    }
  });
}
