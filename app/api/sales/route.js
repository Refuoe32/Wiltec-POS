import { route, SELL } from '@/lib/api';
import { q, tx } from '@/lib/db';
import { createSale } from '@/lib/sales';
export const POST = route(SELL, ({ s, body }) => tx(c => createSale(c, s, body)));
export const GET = route(null, async ({ url }) => {
  const day = url.searchParams.get('day') || new Date().toISOString().slice(0, 10);
  return q(`select s.id,s.sale_no,s.total,s.status,s.created_at,c.name customer,u.full_name cashier,
    (select string_agg(distinct method::text, ', ') from payments p where p.sale_id=s.id) methods
    from sales s left join customers c on c.id=s.customer_id join users u on u.id=s.cashier_id
    where s.created_at::date=$1::date order by s.created_at desc limit 300`, [day]);
});
