import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { q } from '@/lib/db';
import { sign } from '@/lib/auth';
export async function POST(req) {
  const { email, password } = await req.json();
  const [u] = await q('select * from users where lower(email)=lower($1) and is_active', [email || '']);
  if (!u || !(await bcrypt.compare(password || '', u.password_hash)))
    return NextResponse.json({ error: 'Wrong email or password, or the account is locked' }, { status: 401 });
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
  const dev = (req.headers.get('user-agent') || '').slice(0, 120);
  // close any session this user left open, then record the new sign-in
  await q("update staff_sessions set logout_at=last_seen, end_reason='timeout' where user_id=$1 and logout_at is null", [u.id]);
  const [ss] = await q('insert into staff_sessions(user_id,ip,device) values($1,$2,$3) returning id', [u.id, ip, dev]);
  const res = NextResponse.json({ ok: true, role: u.role });
  res.cookies.set('wt', await sign(u, ss.id), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 43200 });
  return res;
}
