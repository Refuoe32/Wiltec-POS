import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { q } from '@/lib/db';
import { sign } from '@/lib/auth';
export async function POST(req) {
  const { email, password } = await req.json();
  const [u] = await q('select * from users where lower(email)=lower($1)', [(email || '').trim()]);
  const deny = (m, status = 401) => NextResponse.json({ error: m }, { status });
  const ip0 = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
  if (u) {                                       // 5 wrong passwords since the last good sign-in => paused for 15 minutes
    const [f] = await q(`select count(*)::int n from audit_log where action='login.failed' and user_id=$1
      and created_at>greatest(now()-interval '15 minutes', coalesce((select max(login_at) from staff_sessions where user_id=$1),'-infinity'::timestamptz))`, [u.id]);
    if (f.n >= 5) return deny('Too many wrong passwords. This account is paused for 15 minutes. Ask the owner if you need help sooner.', 429);
  }
  if (!u || !(await bcrypt.compare(password || '', u.password_hash))) {
    await q(`insert into audit_log(user_id,action,entity,details) values($1,'login.failed','user',$2)`, [u?.id || null, JSON.stringify({ email: (email || '').slice(0, 80), ip: ip0 })]);
    return deny('Wrong email or password');
  }
  if (u.status === 'pending') return deny('Your registration is waiting for approval by the owner or a manager. You can sign in once it is approved.', 403);
  if (u.status === 'rejected') return deny('Your registration was not approved. Please speak to the owner.', 403);
  if (!u.is_active) return deny('This account has been locked. Please speak to the owner or a manager.', 403);
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null;
  const dev = (req.headers.get('user-agent') || '').slice(0, 120);
  // close any session this user left open, then record the new sign-in
  await q("update staff_sessions set logout_at=last_seen, end_reason='timeout' where user_id=$1 and logout_at is null", [u.id]);
  const [ss] = await q('insert into staff_sessions(user_id,ip,device) values($1,$2,$3) returning id', [u.id, ip, dev]);
  const res = NextResponse.json({ ok: true, role: u.role });
  res.cookies.set('wt', await sign(u, ss.id), { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 43200 });
  return res;
}
