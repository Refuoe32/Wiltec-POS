import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
export async function middleware(req) {
  const p = req.nextUrl.pathname;
  if (p === '/login' || p === '/api/login') return NextResponse.next();
  try {
    await jwtVerify(req.cookies.get('wt')?.value, new TextEncoder().encode(process.env.JWT_SECRET));
    return NextResponse.next();
  } catch {
    if (p.startsWith('/api/')) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    return NextResponse.redirect(new URL('/login', req.url));
  }
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg).*)'] };
