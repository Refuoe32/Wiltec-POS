import { NextResponse } from 'next/server';
import { session } from './auth';
export const fail = (m, status = 400) => { const e = new Error(m); e.status = status; throw e; };
// route(allowedRoles | null, handler) -> checks login + role, parses JSON, handles errors
export const route = (roles, fn) => async (req, ctx) => {
  const s = await session();
  if (!s) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
  if (roles && !roles.includes(s.role)) return NextResponse.json({ error: 'Your role cannot do this' }, { status: 403 });
  try {
    const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await req.json().catch(() => ({})) : {};
    const r = await fn({ s, body, params: ctx?.params, url: new URL(req.url) });
    return NextResponse.json(r ?? { ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: e.message || 'Server error' }, { status: e.status || 500 });
  }
};
export const MGR = ['owner', 'manager'];
export const SELL = ['owner', 'manager', 'cashier'];
