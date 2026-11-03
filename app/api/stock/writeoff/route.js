import { route, MGR, fail } from '@/lib/api';
import { tx } from '@/lib/db';
// Clear old stock: remove all (or some) units of items from stock with a reason. The value lost (at cost) is recorded.
export const POST = route(MGR, ({ s, body: b }) => tx(async c => {
  if (!b.items?.length) fail('Select at least one item');
  if (!b.reason) fail('Choose a reason');
  let units = 0, value = 0, lines = 0;
  for (const i of b.items) {
    const { rows: [it] } = await c.query('select id,name,stock_qty,cost_price,track_stock from items where id=$1 for update', [i.item_id]);
    if (!it || !it.track_stock) continue;
    const n = i.qty == null || i.qty === '' ? it.stock_qty : Math.min(parseInt(i.qty), it.stock_qty);
    if (!(n > 0)) continue;
    await c.query('update items set stock_qty=stock_qty-$1, updated_at=now() where id=$2', [n, it.id]);
    await c.query(`insert into stock_movements(item_id,move_type,qty_change,unit_cost,note,user_id) values($1,'writeoff',$2,$3,$4,$5)`,
      [it.id, -n, it.cost_price, b.reason + (b.note ? ': ' + b.note : ''), s.id]);
    units += n; value += n * Number(it.cost_price); lines++;
  }
  if (!lines) fail('Nothing to clear: the selected items have no stock');
  await c.query(`insert into audit_log(user_id,action,entity,details) values($1,'stock.writeoff','stock',$2)`, [s.id, JSON.stringify({ items: lines, units, value, reason: b.reason })]);
  return { items: lines, units, value };
}));
