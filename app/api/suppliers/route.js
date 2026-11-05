import { route, MGR, fail } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(null, () => q(`select s.*,(select count(*) from items i where i.supplier_id=s.id)::int items,
  (select coalesce(sum(total_cost),0) from purchase_orders p where p.supplier_id=s.id)::float purchased from suppliers s order by s.name`));
export const POST = route(MGR, async ({ body: b }) => {
  if (!(b.name || '').trim()) fail('Supplier name is required');
  await q('insert into suppliers(name,contact,phone,email,address,notes) values($1,$2,$3,$4,$5,$6)', [b.name.trim(), b.contact, b.phone, b.email, b.address, b.notes]);
});
export const PUT = route(MGR, async ({ body: b }) => {
  if (!(b.name || '').trim()) fail('Supplier name is required');
  await q('update suppliers set name=$1,contact=$2,phone=$3,email=$4,address=$5,notes=$6 where id=$7', [b.name.trim(), b.contact, b.phone, b.email, b.address, b.notes, b.id]);
});
export const DELETE = route(MGR, async ({ url }) => {
  const id = url.searchParams.get('id');
  const [c] = await q('select (select count(*) from items where supplier_id=$1)::int i,(select count(*) from purchase_orders where supplier_id=$1)::int p', [id]);
  if (c.i || c.p) fail('This supplier is linked to products or purchases and cannot be deleted.');
  await q('delete from suppliers where id=$1', [id]);
});
