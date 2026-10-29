import { route, SELL, fail } from '@/lib/api';
import { q, tx } from '@/lib/db';
export const GET = route(null, async ({ params }) => ({
  sales: await q('select id,sale_no,total,status,created_at from sales where customer_id=$1 order by created_at desc limit 50', [params.id]),
  repairs: await q('select id,job_no,device_type,brand_model,status,received_at from repair_jobs where customer_id=$1 order by received_at desc limit 50', [params.id]),
}));
// Customer pays off part of their account balance
export const POST = route(SELL, ({ params, body: b }) => tx(async c => {
  const amt = Number(b.amount);
  if (!(amt > 0)) fail('Enter an amount');
  const { rows: [cu] } = await c.query('select balance_owing from customers where id=$1 for update', [params.id]);
  if (amt > Number(cu.balance_owing)) fail('That is more than the customer owes');
  await c.query('update customers set balance_owing=balance_owing-$1 where id=$2', [amt, params.id]);
  await c.query('insert into payments(customer_id,method,amount,reference) values($1,$2,$3,$4)', [params.id, b.method || 'cash', amt, b.reference || 'Account payment']);
}));
