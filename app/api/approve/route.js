import bcrypt from 'bcryptjs';
import { route, SELL, fail } from '@/lib/api';
import { q } from '@/lib/db';
// Checks a manager's email and password (used when a cashier needs approval, e.g. to change a price). Changes nothing.
export const POST = route(SELL, async ({ s, body: b }) => {
  const [m] = await q("select id,full_name,password_hash from users where lower(email)=lower($1) and is_active and status='active' and role in ('owner','manager')", [(b.email || '').trim()]);
  if (!m || !(await bcrypt.compare(b.password || '', m.password_hash))) {
    await q(`insert into audit_log(user_id,action,entity,details) values($1,'approval.failed','user',$2)`, [s.id, JSON.stringify({ email: (b.email || '').slice(0, 80) })]);
    fail('Wrong manager email or password', 403);
  }
  return { ok: true, manager: m.full_name };
});
