import { route, SELL } from '@/lib/api';
import { q, tx } from '@/lib/db';
import { createSale } from '@/lib/sales';
export const POST = route(SELL, ({ s, body }) => tx(c => createSale(c, s, body)));
export const GET = route(null, async ({ s, url }) => {
  const only = s.role === 'cashier' || s.role === 'technician' ? s.id : null;   // cashiers only see their own sales
  const day = url.searchParams.get('day') || new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Maseru' });
  return q(`select s.id,s.sale_no,s.total,s.status,s.created_at,c.name customer,u.full_name cashier,
    (select string_agg(distinct method::text, ', ') from payments p where p.sale_id=s.id) methods
    from sales s left join customers c on c.id=s.customer_id join users u on u.id=s.cashier_id
    where (s.created_at at time zone 'Africa/Maseru')::date=$1::date and ($2::uuid is null or s.cashier_id=$2::uuid) order by s.created_at desc limit 300`, [day, only]);
});
