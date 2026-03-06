import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';
import { FieldValue } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Admin endpoint to manually add a package to a user's account
 * Use this when a Stripe payment succeeded but the webhook failed
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const {
      targetUserId,
      packageType,
      packageMinutes,
      packageRate,
      packageName,
      stripeSessionId
    } = body;

    if (!targetUserId || !packageType || !packageMinutes || !packageRate) {
      return NextResponse.json({
        error: 'Missing required fields: targetUserId, packageType, packageMinutes, packageRate'
      }, { status: 400 });
    }

    // Create package object
    const packageId = `pkg_manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const newPackage = {
      id: packageId,
      type: packageType,
      name: packageName || `${packageType.charAt(0).toUpperCase() + packageType.slice(1)} Package`,
      minutesTotal: packageMinutes,
      minutesUsed: 0,
      minutesRemaining: packageMinutes,
      rate: packageRate,
      purchasedAt: now,
      expiresAt: expiresAt,
      active: true,
      manuallyAdded: true,
      addedBy: decodedToken.uid,
      stripeSessionId: stripeSessionId || 'manual_addition',
    };

    // Get target user
    const userRef = adminDb.collection('users').doc(targetUserId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: `User not found: ${targetUserId}` }, { status: 404 });
    }

    const userData = userDoc.data();
    const currentPackages = userData?.packages || [];

    // Update user with new package
    await userRef.update({
      packages: [...currentPackages, newPackage],
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Create transaction record
    await adminDb.collection('transactions').add({
      userId: targetUserId,
      type: 'package_purchase',
      amount: packageMinutes * packageRate,
      packageMinutes,
      description: `${newPackage.name}: ${packageMinutes} minutes (manually added)`,
      packageId,
      createdAt: FieldValue.serverTimestamp(),
      manuallyAdded: true,
      addedBy: decodedToken.uid,
      stripeSessionId: stripeSessionId || 'manual_addition',
    });

    console.log('[Admin] Package manually added:', {
      adminId: decodedToken.uid,
      targetUserId,
      packageId,
      packageType,
      packageMinutes,
    });

    return NextResponse.json({
      success: true,
      message: `Package added successfully`,
      package: newPackage,
    });

  } catch (error) {
    console.error('[Admin Add Package] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
