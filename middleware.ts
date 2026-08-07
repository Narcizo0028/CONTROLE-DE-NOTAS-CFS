import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/session';
import { canAccessRoute, getDashboardPath } from '@/lib/permissions';
const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/me', '/api/health'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.endsWith('.ico')) {
    return NextResponse.next();
  }

  const token = request.cookies.get('cfs_session')?.value;

  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  const user = await verifySession(token);
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sessão expirada' }, { status: 401 });
    }
    const response = NextResponse.redirect(new URL('/login', request.url));
    response.cookies.delete('cfs_session');
    return response;
  }

  if (!pathname.startsWith('/api/') && !canAccessRoute(user, pathname)) {
    return NextResponse.redirect(new URL(getDashboardPath(user.role), request.url));
  }

  const response = NextResponse.next();  response.headers.set('x-user-id', user.id);
  response.headers.set('x-user-role', user.role);
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
