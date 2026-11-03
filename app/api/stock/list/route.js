import { route, MGR } from '@/lib/api';
import { q } from '@/lib/db';
// Stock list with the number of days each item has been idle (no sale and no delivery)
export const GET = route(MGR, async ({ url }) => {
  const t = url.searchParams.get('q') || '', view = url.searchParams.get('view') || 'all', days = Math.max(1, parseInt(url.searchParams.get('days') || '90'));
  const rows = await q(`select * from (select i.id,i.sku,i.barcode,i.name,i.stock_qty,i.reorder_level,i.cost_price::float,i.sell_price::float,
      (select max(s.created_at) from sale_items si join sales s on s.id=si.sale_id where si.item_id=i.id and s.status<>'voided') last_sold,
      extract(epoch from (now()-greatest(coalesce((select max(s.created_at) from sale_items si join sales s on s.id=si.sale_id where si.item_id=i.id and s.status<>'voided'),'-infinity'::timestamptz),
        coalesce((select max(m.created_at) from stock_movements m where m.item_id=i.id and m.move_type='purchase'),'-infinity'::timestamptz), i.created_at)))/86400 idle_days
    from items i where i.track_stock and i.is_active and ($1='' or i.name ilike $2 or i.sku ilike $2 or i.barcode=$1)) x order by name limit 600`, [t, `%${t}%`]);
  const f = r => view === 'old' ? r.stock_qty > 0 && r.idle_days >= days : view === 'out' ? r.stock_qty <= 0 : view === 'low' ? r.stock_qty <= r.reorder_level : true;
  return rows.filter(f).map(r => ({ ...r, idle_days: Math.floor(r.idle_days) }));
});
