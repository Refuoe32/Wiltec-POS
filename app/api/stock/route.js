import { route, MGR, fail } from '@/lib/api';
import { tx } from '@/lib/db';
// Manual stock adjustment: damage, stock-take correction, etc.
export const POST = route(MGR, ({ s, body: b }) => tx(async c => {
  const n = parseInt(b.qty_change);
  if (!n) fail('Enter a quantity (use a minus sign to remove stock)');
  const { rows: [it] } = await c.query('select stock_qty,track_stock from items where id=$1 for update', [b.item_id]);
  if (!it?.track_stock) fail('This item does not track stock');
  if (it.stock_qty + n < 0) fail('Stock cannot go below zero');
  await c.query('update items set stock_qty=stock_qty+$1 where id=$2', [n, b.item_id]);
  await c.query('insert into stock_movements(item_id,move_type,qty_change,note,user_id) values($1,$2,$3,$4,$5)',
    [b.item_id, b.type === 'damage' ? 'damage' : 'adjustment', n, b.note || null, s.id]);
}));
