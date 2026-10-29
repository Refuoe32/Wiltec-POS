import { route, SELL, fail } from '@/lib/api';
import { q, tx } from '@/lib/db';
import { createSale } from '@/lib/sales';
export const GET = route(null, async ({ params }) => ({
  job: (await q(`select r.*,c.name customer,c.phone customer_phone from repair_jobs r join customers c on c.id=r.customer_id where r.id=$1`, [params.id]))[0],
  parts: await q('select p.*,i.name from repair_parts p join items i on i.id=p.item_id where job_id=$1', [params.id]),
  log: await q('select l.*,u.full_name from repair_status_log l left join users u on u.id=l.user_id where job_id=$1 order by l.created_at desc', [params.id]),
}));
// Update job details / status
export const PATCH = route(null, async ({ s, params, body: b }) => {
  const [j] = await q('select status from repair_jobs where id=$1', [params.id]);
  if (!j) fail('Job not found', 404);
  await q(`update repair_jobs set diagnosis=coalesce($1,diagnosis), work_done=coalesce($2,work_done), quote_amount=coalesce($3,quote_amount),
    technician_id=coalesce($4,technician_id), status=coalesce($5::text::repair_status,status),
    completed_at=case when $5::text='ready' then now() else completed_at end where id=$6`,
    [b.diagnosis ?? null, b.work_done ?? null, b.quote_amount ?? null, b.technician_id ?? null, b.status ?? null, params.id]);
  if (b.status && b.status !== j.status)
    await q('insert into repair_status_log(job_id,status,note,user_id) values($1,$2,$3,$4)', [params.id, b.status, b.note || null, s.id]);
});
export const POST = route(SELL, ({ s, params, body: b }) => tx(async c => {
  const { rows: [job] } = await c.query('select * from repair_jobs where id=$1 for update', [params.id]);
  if (!job) fail('Job not found', 404);
  if (b.action === 'part') {            // take a part from stock for this job
    const qty = parseInt(b.qty || 1);
    const { rows: [it] } = await c.query('select * from items where id=$1 for update', [b.item_id]);
    if (!it || it.stock_qty < qty) fail('Not enough stock for that part');
    await c.query('update items set stock_qty=stock_qty-$1 where id=$2', [qty, it.id]);
    await c.query('insert into repair_parts(job_id,item_id,qty,unit_price) values($1,$2,$3,$4)', [job.id, it.id, qty, it.sell_price]);
    await c.query(`insert into stock_movements(item_id,move_type,qty_change,reference,user_id) values($1,'repair_use',$2,$3,$4)`, [it.id, -qty, job.job_no, s.id]);
    return { ok: true };
  }
  if (b.action === 'bill') {            // customer collects the device and pays
    if (['collected', 'cancelled'].includes(job.status)) fail('This job is already closed');
    const quote = Number(job.quote_amount || 0);
    if (!(quote > 0)) fail('Set the final price (quote) before billing');
    const dep = Math.min(Number(job.deposit_paid), quote), bal = +(quote - dep).toFixed(2);
    const { rows: [srv] } = await c.query("select id from items where sku='SRV-REPAIR'");
    if (!srv) fail('Missing SRV-REPAIR item - re-run schema.sql');
    const payments = [];
    if (dep > 0) payments.push({ method: 'cash', amount: dep, reference: 'Deposit' });
    if (bal > 0) payments.push({ method: b.method || 'cash', amount: bal, reference: b.reference });
    const sale = await createSale(c, s, { customer_id: job.customer_id, repair_job_id: job.id, note: `Repair ${job.job_no}: ${job.device_type} ${job.brand_model || ''}`,
      items: [{ item_id: srv.id, qty: 1, unit_price: quote }], payments });
    await c.query("update repair_jobs set status='collected', collected_at=now() where id=$1", [job.id]);
    await c.query(`insert into repair_status_log(job_id,status,note,user_id) values($1,'collected','Billed '||$2,$3)`, [job.id, sale.sale_no, s.id]);
    return sale;
  }
  fail('Unknown action');
}));
