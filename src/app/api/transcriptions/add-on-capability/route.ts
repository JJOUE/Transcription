import { NextResponse } from 'next/server';
import { isPackageAddOnCheckoutEnabled } from '@/lib/billing/package-add-on-feature';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(
    { packageAddOnCheckoutEnabled: isPackageAddOnCheckoutEnabled() },
    { headers: { 'Cache-Control': 'private, no-store' } }
  );
}
