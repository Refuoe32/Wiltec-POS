import { route, SELL, fail } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(null, ({ url }) => {
  const st = url.searchParams.get('status') || '', t = url.searchParams.get('q') || '';
  return q(`select r.*,c.name customer,c.phone customer_phone,u.full_name technician from repair_jobs r
    join customers c on c.id=r.customer_id left join users u on u.id=r.technician_id
    where ($1='' or r.status::text=$1) and ($2='' or r.job_no ilike $3 or c.name ilike $3 or r.brand_model ilike $3 or c.phone ilike $3)
    and ($1<>'' or r.status::text not in ('collected','cancelled') or $2<>'')
    order by r.received_at desc limit 200`, [st, t, `%${t}%`]);
});
export const POST = route(SELL, async ({ s, body: b }) => {
  if (!b.customer_id || !b.device_type || !b.fault_reported) fail('Customer, device and fault are required');
  const [r] = await q(`insert into repair_jobs(customer_id,technician_id,device_type,brand_model,serial_no,accessories,password_pin,fault_reported,quote_amount,deposit_paid,promised_date)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id,job_no`,
    [b.customer_id, b.technician_id || null, b.device_type, b.brand_model, b.serial_no, b.accessories, b.password_pin, b.fault_reported, b.quote_amount || null, b.deposit_paid || 0, b.promised_date || null]);
  await q(`insert into repair_status_log(job_id,status,note,user_id) values($1,'received','Job created',$2)`, [r.id, s.id]);
  return r;
});
