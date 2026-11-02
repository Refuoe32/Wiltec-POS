import { NextResponse } from 'next/server';
import { q } from '@/lib/db';
import { session } from '@/lib/auth';
export async function POST(req) {
  const s = await session();
  const b = await req.json().catch(() => ({}));
  if (s?.sid) await q(`update staff_sessions set logout_at=case when $2='timeout' then last_seen else now() end,
    end_reason=$2 where id=$1 and logout_at is null`, [s.sid, b.reason === 'timeout' ? 'timeout' : 'signout']);
  const res = NextResponse.json({ ok: true });
  res.cookies.set('wt', '', { path: '/', maxAge: 0 });
  return res;
}
