import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { q } from '@/lib/db';
// Public: a new staff member asks for an account. The account stays locked ("pending")
// until the owner or a manager approves it on the Staff page and chooses the access level.
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const bad = m => NextResponse.json({ error: m }, { status: 400 });
  const name = (b.full_name || '').trim(), email = (b.email || '').trim().toLowerCase();
  if (name.length < 3) return bad('Please enter your full name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Please enter a valid email address');
  if ((b.password || '').length < 6) return bad('Password must be at least 6 characters');
  const [{ n }] = await q("select count(*)::int n from users where status='pending'");
  if (n >= 25) return bad('Too many registrations are waiting. Please ask the owner to approve them first.');
  try {
    await q("insert into users(full_name,email,phone,password_hash,role,is_active,status) values($1,$2,$3,$4,'cashier',false,'pending')",
      [name, email, (b.phone || '').trim() || null, await bcrypt.hash(b.password, 10)]);
  } catch (e) {
    if (e.code === '23505') return bad('An account with that email already exists');
    throw e;
  }
  await q("insert into audit_log(action,entity,details) values('staff.registered','user',$1)", [JSON.stringify({ email, name })]);
  return NextResponse.json({ ok: true });
}
