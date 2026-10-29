import { route, MGR, fail } from '@/lib/api';
import { q, tx } from '@/lib/db';
export const GET = route(MGR, () => q(`select po.id,po.po_no,po.status,po.total_cost,po.created_at,s.name supplier,
  (select count(*) from purchase_order_items i where i.po_id=po.id) lines
  from purchase_orders po join suppliers s on s.id=po.supplier_id order by po.created_at desc limit 100`));
// Receive stock from a supplier: creates the PO, adds stock, updates cost price
export const POST = route(MGR, ({ s, body: b }) => tx(async c => {
  if (!b.supplier_id || !b.items?.length) fail('Choose a supplier and add at least one item');
  let total = 0;
  const { rows: [po] } = await c.query(`insert into purchase_orders(supplier_id,status,created_by,received_at) values($1,'received',$2,now()) returning id,po_no`, [b.supplier_id, s.id]);
  for (const i of b.items) {
    const qty = parseInt(i.qty), cost = Number(i.unit_cost);
    if (!(qty > 0) || !(cost >= 0)) fail('Check quantities and costs');
    total += qty * cost;
    await c.query('insert into purchase_order_items(po_id,item_id,qty_ordered,qty_received,unit_cost) values($1,$2,$3,$3,$4)', [po.id, i.item_id, qty, cost]);
    await c.query('update items set stock_qty=stock_qty+$1, cost_price=$2, supplier_id=$3, updated_at=now() where id=$4', [qty, cost, b.supplier_id, i.item_id]);
    await c.query(`insert into stock_movements(item_id,move_type,qty_change,reference,user_id) values($1,'purchase',$2,$3,$4)`, [i.item_id, qty, po.po_no, s.id]);
  }
  await c.query('update purchase_orders set total_cost=$1 where id=$2', [total, po.id]);
  return { po_no: po.po_no };
}));
