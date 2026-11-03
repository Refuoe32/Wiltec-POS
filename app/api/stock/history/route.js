import { route, MGR } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(MGR, ({ url }) => {
  const t = url.searchParams.get('type') || '';
  return q(`select m.created_at,m.move_type::text type,m.qty_change,m.unit_cost::float,m.reference,m.note,i.name,i.sku,u.full_name by_user
    from stock_movements m join items i on i.id=m.item_id left join users u on u.id=m.user_id where ($1='' or m.move_type::text=$1) order by m.id desc limit 250`, [t]);
});
