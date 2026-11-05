import { route, MGR, fail } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(null, () => q(`select b.id,b.name,(select count(*) from items i where i.brand_id=b.id and i.is_active)::int n from brands b order by b.name`));
export const POST = route(MGR, async ({ body }) => { const n = (body.name || '').trim(); if (!n) fail('Enter a name'); await q('insert into brands(name) values($1) on conflict do nothing', [n]); });
export const PUT = route(MGR, async ({ body }) => { const n = (body.name || '').trim(); if (!n) fail('Enter a name'); await q('update brands set name=$1 where id=$2', [n, body.id]); });
export const DELETE = route(MGR, async ({ url }) => {
  const id = url.searchParams.get('id');
  const [c] = await q('select count(*)::int n from items where brand_id=$1', [id]);
  if (c.n > 0) fail(`This brand has ${c.n} product(s). Change their brand first.`);
  await q('delete from brands where id=$1', [id]);
});
