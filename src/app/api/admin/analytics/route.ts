import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { adminAuth, adminDb } from '@/lib/firebase/admin';
import { BetaAnalyticsDataClient } from '@google-analytics/data';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// In-memory cache
let cachedData: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function GET() {
  try {
    // Verify admin auth
    const cookieStore = await cookies();
    const token = cookieStore.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
    const userData = userDoc.exists ? userDoc.data() : null;

    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Check cache
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return NextResponse.json(cachedData.data);
    }

    // Check if GA4 credentials are configured
    const propertyId = process.env.GA4_PROPERTY_ID;
    const clientEmail = process.env.GOOGLE_ANALYTICS_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_ANALYTICS_PRIVATE_KEY;

    if (!propertyId || !clientEmail || !privateKey) {
      return NextResponse.json(
        { error: 'GA4 not configured', configured: false },
        { status: 503 }
      );
    }

    const analyticsDataClient = new BetaAnalyticsDataClient({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
    });

    const property = `properties/${propertyId}`;

    // Run today and 7-day queries in parallel
    const [todayReport, weekReport, topPagesReport] = await Promise.all([
      // Today's metrics
      analyticsDataClient.runReport({
        property,
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        metrics: [
          { name: 'activeUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
        ],
      }),

      // Last 7 days metrics
      analyticsDataClient.runReport({
        property,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [
          { name: 'totalUsers' },
          { name: 'screenPageViews' },
          { name: 'sessions' },
          { name: 'averageSessionDuration' },
        ],
      }),

      // Top pages (last 7 days)
      analyticsDataClient.runReport({
        property,
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 5,
      }),
    ]);

    const todayRow = todayReport[0]?.rows?.[0]?.metricValues || [];
    const weekRow = weekReport[0]?.rows?.[0]?.metricValues || [];

    const topPages = (topPagesReport[0]?.rows || []).map(row => ({
      path: row.dimensionValues?.[0]?.value || '/',
      views: parseInt(row.metricValues?.[0]?.value || '0', 10),
    }));

    const avgDurationSeconds = parseFloat(weekRow[3]?.value || '0');
    const avgDurationFormatted = avgDurationSeconds >= 60
      ? `${Math.floor(avgDurationSeconds / 60)}m ${Math.round(avgDurationSeconds % 60)}s`
      : `${Math.round(avgDurationSeconds)}s`;

    const responseData = {
      configured: true,
      today: {
        activeUsers: parseInt(todayRow[0]?.value || '0', 10),
        pageViews: parseInt(todayRow[1]?.value || '0', 10),
        sessions: parseInt(todayRow[2]?.value || '0', 10),
      },
      week: {
        totalUsers: parseInt(weekRow[0]?.value || '0', 10),
        pageViews: parseInt(weekRow[1]?.value || '0', 10),
        sessions: parseInt(weekRow[2]?.value || '0', 10),
        avgSessionDuration: avgDurationFormatted,
      },
      topPages,
    };

    // Cache the result
    cachedData = { data: responseData, timestamp: Date.now() };

    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics', configured: true },
      { status: 500 }
    );
  }
}
