import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { q } from '@/lib/db';
import { sign } from '@/lib/auth';
export async function POST(req) {
  const { email, password } = await req.json();
  const [u] = await q('select * from users where lower(email)=lower($1) and is_active', [email || '']);
  if (!u || !(await bcrypt.compare(password || '', u.password_hash)))
    return NextResponse.json({ error: 'Wrong email or password' }, { status: 401 });
  const res = NextResponse.json({ ok: true, role: u.role });
  res.cookies.set('wt', await sign(u), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 43200 });
  return res;
}
