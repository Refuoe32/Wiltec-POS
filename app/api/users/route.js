import bcrypt from 'bcryptjs';
import { route, fail, MGR, IDLE_MINUTES } from '@/lib/api';
import { q } from '@/lib/db';
const STAFF = ['cashier', 'technician'];
const audit = (uid, action, id, d) => q('insert into audit_log(user_id,action,entity,entity_id,details) values($1,$2,\'user\',$3,$4)', [uid, action, id, JSON.stringify(d || {})]);
export const GET = route(null, ({ s }) => MGR.includes(s.role)
  ? q(`select u.id,u.full_name,u.email,u.phone,u.photo,u.role,u.is_active,u.created_at,
      (select max(login_at) from staff_sessions where user_id=u.id) last_login,
      exists(select 1 from staff_sessions where user_id=u.id and logout_at is null and last_seen>now()-make_interval(mins=>$1::int)) online
      from users u order by u.is_active desc, u.full_name`, [IDLE_MINUTES])
  : q('select id,full_name,role,is_active from users where is_active order by full_name'));
// Owner can add any role; managers can add cashiers and technicians only
export const POST = route(MGR, async ({ s, body: b }) => {
  const role = b.role || 'cashier';
  if (s.role !== 'owner' && !STAFF.includes(role)) fail('Managers can only add cashiers and technicians', 403);
  if (!b.full_name || !b.email || !b.password || b.password.length < 6) fail('Name, email and a password of 6+ characters are required');
  const [u] = await q('insert into users(full_name,email,phone,password_hash,role) values($1,lower($2),$3,$4,$5) returning id',
    [b.full_name, b.email.trim(), b.phone || null, await bcrypt.hash(b.password, 10), role]);
  await audit(s.id, 'staff.add', u.id, { email: b.email, role });
});
export const PUT = route(MGR, async ({ s, body: b }) => {
  const [t] = await q('select id,role,is_active from users where id=$1', [b.id]);
  if (!t) fail('User not found', 404);
  if (s.role !== 'owner' && !STAFF.includes(t.role)) fail('Only the owner can change managers or owners', 403);
  if (b.role && s.role !== 'owner' && !STAFF.includes(b.role)) fail('Only the owner can make someone a manager or owner', 403);
  if (b.id === s.id && ((b.is_active === false) || (b.role && b.role !== s.role))) fail('You cannot lock yourself out or change your own role');
  if (b.password) {
    if (b.password.length < 6) fail('Password must be 6+ characters');
    await q('update users set password_hash=$1 where id=$2', [await bcrypt.hash(b.password, 10), b.id]);
    await audit(s.id, 'staff.password_reset', b.id);
  }
  if (b.role || b.is_active !== undefined) {
    await q('update users set role=coalesce($1::user_role,role), is_active=coalesce($2,is_active) where id=$3', [b.role ?? null, b.is_active ?? null, b.id]);
    await audit(s.id, b.is_active === false ? 'staff.lock' : b.is_active === true ? 'staff.unlock' : 'staff.role_change', b.id, { role: b.role });
  }
  if (b.is_active === false)   // locking someone signs them out immediately
    await q("update staff_sessions set logout_at=now(), end_reason='locked' where user_id=$1 and logout_at is null", [b.id]);
});
