import { NextResponse } from 'next/server';
import { session } from './auth';
import { q } from './db';
export const IDLE_MINUTES = Number(process.env.IDLE_MINUTES || 30);   // auto sign-out after this many idle minutes
export const fail = (m, status = 400) => { const e = new Error(m); e.status = status; throw e; };
const out = (m, status) => NextResponse.json({ error: m }, { status });
// route(allowedRoles | null, handler): checks the live session, role, idle timeout, parses JSON, handles errors
export const route = (roles, fn) => async (req, ctx) => {
  const s0 = await session();
  if (!s0?.sid) return out('Please sign in again', 401);
  try {
    const [ss] = await q(`select ss.logout_at, u.is_active, u.role, extract(epoch from (now()-ss.last_seen))::float idle
      from staff_sessions ss join users u on u.id=ss.user_id where ss.id=$1`, [s0.sid]);
    if (!ss || ss.logout_at || !ss.is_active) return out('Your session ended. Please sign in again', 401);
    if (ss.idle > IDLE_MINUTES * 60) {
      await q("update staff_sessions set logout_at=last_seen, end_reason='timeout' where id=$1 and logout_at is null", [s0.sid]);
      return out('You were signed out after inactivity', 401);
    }
    if (ss.idle > 30) await q('update staff_sessions set last_seen=now() where id=$1', [s0.sid]);
    const s = { ...s0, role: ss.role };            // role always comes from the database
    if (roles && !roles.includes(s.role)) return out('Your role cannot do this', 403);
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await req.json().catch(() => ({})) : {};
    const r = await fn({ s, body, params: ctx?.params, url: new URL(req.url) });
    return NextResponse.json(r ?? { ok: true });
  } catch (e) {
    console.error(e);
    if (e.code === '23505') return out('That value already exists (duplicate)', 400);
    return out(e.message || 'Server error', e.status || 500);
  }
};
export const MGR = ['owner', 'manager'];
export const SELL = ['owner', 'manager', 'cashier'];
