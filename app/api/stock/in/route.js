import { route, MGR, fail } from '@/lib/api';
import { tx } from '@/lib/db';
// Add new stock (delivery from a supplier, opening stock, etc.)
export const POST = route(MGR, ({ s, body: b }) => tx(async c => {
  if (!b.items?.length) fail('Add at least one item');
  const ref = (b.reference || '').trim() || null;
  let po = null, total = 0;
  if (b.supplier_id) po = (await c.query(`insert into purchase_orders(supplier_id,status,created_by,received_at) values($1,'received',$2,now()) returning id,po_no`, [b.supplier_id, s.id])).rows[0];
  let units = 0;
  for (const i of b.items) {
    const qty = parseInt(i.qty), cost = Number(i.unit_cost ?? 0);
    if (!(qty > 0) || !(cost >= 0)) fail('Check the quantities and costs');
    const { rows: [it] } = await c.query('select id,name,track_stock from items where id=$1 for update', [i.item_id]);
    if (!it) fail('Item not found');
    if (!it.track_stock) fail(`${it.name} is a service and does not hold stock`);
    await c.query(`update items set stock_qty=stock_qty+$1, cost_price=case when $2::boolean then $3::numeric else cost_price end, supplier_id=coalesce($4,supplier_id), updated_at=now() where id=$5`,
      [qty, b.update_cost !== false, cost, b.supplier_id || null, it.id]);
    await c.query(`insert into stock_movements(item_id,move_type,qty_change,unit_cost,reference,note,user_id) values($1,'purchase',$2,$3,$4,$5,$6)`,
      [it.id, qty, cost, po?.po_no || ref || 'Stock in', b.note || null, s.id]);
    if (po) await c.query('insert into purchase_order_items(po_id,item_id,qty_ordered,qty_received,unit_cost) values($1,$2,$3,$3,$4)', [po.id, it.id, qty, cost]);
    units += qty; total += qty * cost;
  }
  if (po) await c.query('update purchase_orders set total_cost=$1 where id=$2', [total, po.id]);
  await c.query(`insert into audit_log(user_id,action,entity,details) values($1,'stock.in','stock',$2)`, [s.id, JSON.stringify({ lines: b.items.length, units, value: total, reference: ref, po: po?.po_no })]);
  return { units, value: total, po_no: po?.po_no || null };
}));
