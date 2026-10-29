import { route, SELL, fail } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(null, ({ url }) => {
  const t = url.searchParams.get('q') || '';
  return q('select * from customers where $1=\'\' or name ilike $2 or phone ilike $2 order by name limit 300', [t, `%${t}%`]);
});
export const POST = route(SELL, async ({ body: b }) => {
  if (!b.name) fail('Customer name is required');
  const [r] = await q('insert into customers(name,phone,email,address,is_business,credit_limit,notes) values($1,$2,$3,$4,$5,$6,$7) returning id',
    [b.name, b.phone || null, b.email || null, b.address || null, !!b.is_business, b.credit_limit || 0, b.notes || null]);
  return r;
});
export const PUT = route(['owner', 'manager'], ({ body: b }) =>
  q('update customers set name=$1,phone=$2,email=$3,address=$4,is_business=$5,credit_limit=$6,notes=$7 where id=$8',
    [b.name, b.phone, b.email, b.address, !!b.is_business, b.credit_limit || 0, b.notes, b.id]));
