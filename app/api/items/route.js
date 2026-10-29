import { route, MGR, fail } from '@/lib/api';
import { q, tx } from '@/lib/db';
const COLS = `id,kind,sku,barcode,name,description,category_id,(select name from categories c where c.id=category_id) category,
  cost_price,sell_price,vat_applies,track_stock,stock_qty,reorder_level,has_serial,warranty_days,is_active`;
export const GET = route(null, async ({ s, url }) => {
  const t = url.searchParams.get('q') || '';
  const all = url.searchParams.get('all') === '1' && ['owner', 'manager'].includes(s.role);
  const rows = await q(`select ${COLS} from items where ($3 or is_active) and ($1='' or name ilike $2 or sku ilike $2 or barcode=$1)
    order by name limit 300`, [t, `%${t}%`, all]);
  return ['owner', 'manager'].includes(s.role) ? rows : rows.map(({ cost_price, ...r }) => r);
});
export const POST = route(MGR, ({ s, body: b }) => tx(async c => {
  if (!b.name || !b.sku) fail('Name and SKU are required');
  const { rows: [it] } = await c.query(`insert into items(kind,sku,barcode,name,description,category_id,cost_price,sell_price,vat_applies,track_stock,reorder_level,has_serial,warranty_days)
    values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) returning id`,
    [b.kind || 'product', b.sku, b.barcode || null, b.name, b.description || null, b.category_id || null, b.cost_price || 0, b.sell_price || 0,
     b.vat_applies !== false, b.kind === 'service' ? false : b.track_stock !== false, b.reorder_level ?? 2, !!b.has_serial, b.warranty_days || 0]);
  const qty = parseInt(b.stock_qty || 0);
  if (qty > 0) {
    await c.query('update items set stock_qty=$1 where id=$2', [qty, it.id]);
    await c.query(`insert into stock_movements(item_id,move_type,qty_change,note,user_id) values($1,'adjustment',$2,'Opening stock',$3)`, [it.id, qty, s.id]);
  }
  return { id: it.id };
}));
export const PUT = route(MGR, async ({ s, body: b }) => {
  await q(`update items set name=$1,sku=$2,barcode=$3,category_id=$4,cost_price=$5,sell_price=$6,vat_applies=$7,reorder_level=$8,has_serial=$9,warranty_days=$10,is_active=$11,updated_at=now() where id=$12`,
    [b.name, b.sku, b.barcode || null, b.category_id || null, b.cost_price || 0, b.sell_price || 0, b.vat_applies !== false, b.reorder_level ?? 2, !!b.has_serial, b.warranty_days || 0, b.is_active !== false, b.id]);
  await q(`insert into audit_log(user_id,action,entity,entity_id,details) values($1,'item.update','item',$2,$3)`, [s.id, b.id, JSON.stringify({ sell_price: b.sell_price })]);
});
