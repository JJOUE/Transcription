import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token');
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

  // Redirect to signin if accessing protected route without token
  if (isProtectedRoute && !token) {
    return NextResponse.redirect(new URL('/signin', request.url));
  }

  // Redirect to dashboard if accessing auth pages with token
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/billing/:path*',
    '/dashboard/:path*',
    '/debug-packages/:path*',
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
