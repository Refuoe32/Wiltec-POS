import { route, fail, MGR } from '@/lib/api';
import { q, tx } from '@/lib/db';
export const GET = route(null, async ({ s, params, url }) => {
  const [sale] = await q(`select s.*,c.name customer,c.phone customer_phone,u.full_name cashier from sales s
    left join customers c on c.id=s.customer_id join users u on u.id=s.cashier_id where s.id=$1`, [params.id]);
  if (!sale) fail('Sale not found', 404);
  let reprint = false;
  if (url.searchParams.get('print') === '1') {            // first print is the original; every later print is marked DUPLICATE and logged
    const [p] = await q('update sales set print_count=print_count+1 where id=$1 returning print_count-1 prev', [params.id]);
    reprint = p.prev > 0;
    if (reprint) await q(`insert into audit_log(user_id,action,entity,entity_id,details) values($1,'receipt.reprint','sale',$2,$3)`, [s.id, params.id, JSON.stringify({ sale_no: sale.sale_no, copy: p.prev + 1 })]);
  }
  const items = await q('select si.*,sn.serial_no from sale_items si left join item_serials sn on sn.id=si.serial_id where sale_id=$1 order by si.id', [params.id]);
  const payments = await q('select * from payments where sale_id=$1 order by id', [params.id]);
  const settings = Object.fromEntries((await q('select key,value from settings')).map(r => [r.key, r.value]));
  return { sale, items, payments, settings, reprint };
});
// Full refund (managers only): restores stock, reverses payments
export const POST = route(MGR, ({ s, params, body: b }) => tx(async c => {
  const reason = (b.reason || '').trim();
  if (reason.length < 3) fail('Enter a reason for the refund');
  const mine = (await c.query('select id from register_sessions where closed_at is null and opened_by=$1 order by id desc limit 1', [s.id])).rows[0];
  const { rows: [sale] } = await c.query('select * from sales where id=$1 for update', [params.id]);
  if (!sale) fail('Sale not found', 404);
  if (sale.status !== 'completed') fail('This sale was already refunded or voided');
  const { rows: items } = await c.query('select * from sale_items where sale_id=$1', [params.id]);
  for (const i of items) {
    const { rows: [it] } = await c.query('select track_stock from items where id=$1', [i.item_id]);
    if (it.track_stock) {
      await c.query('update items set stock_qty=stock_qty+$1 where id=$2', [i.qty, i.item_id]);
      await c.query(`insert into stock_movements(item_id,move_type,qty_change,reference,user_id) values($1,'refund',$2,$3,$4)`, [i.item_id, i.qty, sale.sale_no, s.id]);
    }
    if (i.serial_id) await c.query('update item_serials set in_stock=true where id=$1', [i.serial_id]);
    await c.query('update sale_items set returned_qty=qty where id=$1', [i.id]);
  }
  const { rows: pays } = await c.query('select * from payments where sale_id=$1 and amount>0', [params.id]);
  for (const p of pays) {
    if (p.method === 'credit_account') await c.query('update customers set balance_owing=greatest(0,balance_owing-$1) where id=$2', [p.amount, sale.customer_id]);
    await c.query('insert into payments(sale_id,customer_id,method,amount,reference,session_id) values($1,$2,$3,$4,$5,$6)', [sale.id, sale.customer_id, p.method, -p.amount, 'Refund', mine?.id || null]);
  }
  await c.query("update sales set status='refunded', note=coalesce(note||' | ','')||$2 where id=$1", [params.id, 'Refund: ' + reason]);
  await c.query(`insert into audit_log(user_id,action,entity,entity_id,details) values($1,'sale.refund','sale',$2,$3)`, [s.id, sale.id, JSON.stringify({ sale_no: sale.sale_no, total: sale.total, reason })]);
  return { ok: true };
}));
