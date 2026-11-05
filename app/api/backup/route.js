import bcrypt from 'bcryptjs';
import { route, fail } from '@/lib/api';
import { q, tx } from '@/lib/db';
import { session } from '@/lib/auth';
// Parents first (restore order). staff_sessions is not backed up: everyone simply signs in again after a restore.
const TABLES = ['settings', 'users', 'categories', 'brands', 'suppliers', 'customers', 'items', 'item_serials', 'register_sessions', 'repair_jobs', 'sales', 'sale_items', 'payments', 'repair_parts', 'repair_status_log', 'purchase_orders', 'purchase_order_items', 'expenses', 'stock_movements', 'tasks', 'audit_log'];
const SERIAL = ['categories', 'brands', 'suppliers', 'register_sessions', 'sale_items', 'payments', 'repair_parts', 'repair_status_log', 'purchase_order_items', 'expenses', 'stock_movements', 'tasks', 'audit_log'];

// Download a full backup (owner only). ?photos=0 leaves out staff and product pictures to make the file smaller.
export async function GET(req) {
  const s = await session();
  if (!s?.sid) return new Response('Please sign in', { status: 401 });
  const [u] = await q('select role,is_active from users where id=$1', [s.id]);
  if (!u?.is_active || u.role !== 'owner') return new Response('Only the owner can download a backup', { status: 403 });
  const photos = new URL(req.url).searchParams.get('photos') !== '0';
  const tables = {};
  for (const t of TABLES) {
    tables[t] = await q(`select * from ${t}`);
    if (!photos && t === 'items') tables[t].forEach(r => { r.image = null; });
    if (!photos && t === 'users') tables[t].forEach(r => { r.photo = null; });
  }
  await q(`insert into audit_log(user_id,action,entity,details) values($1,'backup.download','system',$2)`, [s.id, JSON.stringify({ photos })]);
  const day = new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Maseru' });
  return new Response(JSON.stringify({ app: 'wiltec-pos', format: 1, created: new Date().toISOString(), tables }), {
    headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="wiltec-backup-${day}.json"` },
  });
}
// Restore a backup file (owner only). Replaces ALL current data.
export const POST = route(['owner'], async ({ s, body: b }) => {
  const [u] = await q('select password_hash from users where id=$1', [s.id]);
  if (b.confirm !== 'RESTORE' || !(await bcrypt.compare(b.password || '', u.password_hash))) fail('Type RESTORE and enter your password to confirm');
  const d = b.data;
  if (!d || d.app !== 'wiltec-pos' || !d.tables || !Array.isArray(d.tables.users) || !d.tables.users.some(x => x.role === 'owner')) fail('This is not a valid WilTec backup file');
  await tx(async c => {
    await c.query(`TRUNCATE ${[...TABLES, 'staff_sessions'].join(', ')} RESTART IDENTITY CASCADE`);
    for (const t of TABLES) {
      const rows = d.tables[t] || [];
      if (rows.length) await c.query(`insert into ${t} select * from jsonb_populate_recordset(null::${t}, $1::jsonb)`, [JSON.stringify(rows)]);
    }
    for (const t of SERIAL) await c.query(`select setval(pg_get_serial_sequence('${t}','id'), greatest(1,(select coalesce(max(id),0) from ${t})), (select count(*)>0 from ${t}))`);
    await c.query("select setval('sale_no_seq', greatest(999,(select coalesce(max(substring(sale_no from 4)::int),999) from sales)), true)");
    await c.query("select setval('repair_no_seq', greatest(499,(select coalesce(max(substring(job_no from 4)::int),499) from repair_jobs)), true)");
    await c.query("select setval('po_no_seq', greatest(99,(select coalesce(max(substring(po_no from 4)::int),99) from purchase_orders)), true)");
  });
  return { ok: true };
});
