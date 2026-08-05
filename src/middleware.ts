import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
  const pathname = request.nextUrl.pathname;
  const isProductionDebugRoute = process.env.NODE_ENV === 'production' && (
    pathname === '/debug-packages' ||
    pathname.startsWith('/debug-packages/') ||
    pathname === '/test-transcription' ||
    pathname.startsWith('/test-transcription/') ||
    pathname.startsWith('/api/debug/')
  );

  if (isProductionDebugRoute) {
    return new NextResponse(null, { status: 404 });
  }

  const isAuthPage = request.nextUrl.pathname.startsWith('/signin') || 
                     request.nextUrl.pathname.startsWith('/signup');
  const protectedRoutePrefixes = [
    '/admin',
    '/billing',
    '/dashboard',
    '/debug-packages',
    '/office',
    '/profile',
    '/test-transcription',
    '/transcript',
    '/transcriptions',
    '/upload',
  ];
  const isProtectedRoute = protectedRoutePrefixes.some((prefix) =>
    request.nextUrl.pathname === prefix ||
    request.nextUrl.pathname.startsWith(`${prefix}/`)
  );
  const isDocumentWorkspaceProjectRoute = pathname.startsWith('/document-workspace/');

  // Redirect to signin if accessing protected route without token
  if ((isProtectedRoute || isDocumentWorkspaceProjectRoute) && !token) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // Redirect to dashboard if accessing auth pages with token
  if (isAuthPage && token) {
    const requestedNext = request.nextUrl.searchParams.get('next');
    const safeNext = requestedNext?.startsWith('/') && !requestedNext.startsWith('//') && !requestedNext.includes('\\')
      ? requestedNext
      : '/dashboard';
    return NextResponse.redirect(new URL(safeNext, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/billing/:path*',
    '/dashboard/:path*',
    '/debug-packages/:path*',
    '/api/debug/:path*',
    '/document-workspace/:path*',
    '/office/:path*',
    '/profile/:path*',
    '/test-transcription/:path*',
    '/transcript/:path*',
    '/transcriptions/:path*',
    '/upload/:path*',
    '/signin',
    '/signup',
  ],
};
