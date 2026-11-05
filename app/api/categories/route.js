import { route, MGR, fail } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(null, () => q(`select c.id,c.name,(select count(*) from items i where i.category_id=c.id and i.is_active)::int n from categories c order by c.name`));
export const POST = route(MGR, async ({ body }) => { const n = (body.name || '').trim(); if (!n) fail('Enter a name'); await q('insert into categories(name) values($1) on conflict do nothing', [n]); });
export const PUT = route(MGR, async ({ body }) => { const n = (body.name || '').trim(); if (!n) fail('Enter a name'); await q('update categories set name=$1 where id=$2', [n, body.id]); });
export const DELETE = route(MGR, async ({ url }) => {
  const id = url.searchParams.get('id');
  const [c] = await q('select count(*)::int n from items where category_id=$1', [id]);
  if (c.n > 0) fail(`This category has ${c.n} product(s). Move or delete them first.`);
  await q('delete from categories where id=$1', [id]);
});
