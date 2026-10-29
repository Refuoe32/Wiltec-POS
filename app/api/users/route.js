import bcrypt from 'bcryptjs';
import { route, fail } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(['owner', 'manager', 'cashier', 'technician'], () => q('select id,full_name,email,phone,role,is_active,created_at from users order by full_name'));
export const POST = route(['owner'], async ({ body: b }) => {
  if (!b.email || !b.password || b.password.length < 6) fail('Email and a password of 6+ characters are required');
  await q('insert into users(full_name,email,phone,password_hash,role) values($1,$2,$3,$4,$5)', [b.full_name, b.email, b.phone, await bcrypt.hash(b.password, 10), b.role || 'cashier']);
});
export const PUT = route(['owner'], async ({ s, body: b }) => {
  if (b.id === s.id && (b.is_active === false || b.role !== 'owner')) fail('You cannot lock yourself out');
  if (b.password) await q('update users set password_hash=$1 where id=$2', [await bcrypt.hash(b.password, 10), b.id]);
  await q('update users set role=coalesce($1::user_role,role), is_active=coalesce($2,is_active) where id=$3', [b.role ?? null, b.is_active ?? null, b.id]);
});
