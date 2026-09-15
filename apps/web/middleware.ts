import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import type { JwtPayload } from '@compliance/shared';
import { UserRole } from '@compliance/shared';

/**
 * Path prefixes that are publicly accessible without authentication.
 */
const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/activate-account',
  '/first-access',
  '/accept-terms',
  '/terms',
  '/privacy',
  '/unauthorized',
  '/certificate/validate',
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function verifyAccessToken(token: string): Promise<JwtPayload | null> {
  const secret = process.env['JWT_ACCESS_SECRET'];
  if (!secret) return null;

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    return payload as unknown as JwtPayload;
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get('access_token')?.value;

  if (!accessToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const payload = await verifyAccessToken(accessToken);

  if (!payload) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based route protection
  if (pathname.startsWith('/admin')) {
    if (payload.role === UserRole.STUDENT) {
      return NextResponse.redirect(new URL('/student', request.url));
    }
  }

  if (pathname.startsWith('/student')) {
    if (payload.role === UserRole.MASTER_ADMIN || payload.role === UserRole.STORE_ADMIN) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - api routes (handled by NestJS)
     * - _next/static / _next/image
     * - favicon.ico
     * - Files with extensions (png, svg, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};

