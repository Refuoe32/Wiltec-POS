import { route, MGR, fail } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(MGR, ({ url }) => {
  const m = url.searchParams.get('month') || new Date().toISOString().slice(0, 7);
  return q(`select e.*,u.full_name as added_by from expenses e left join users u on u.id=e.user_id
    where to_char(spent_on,'YYYY-MM')=$1 order by spent_on desc,id desc`, [m]);
});
export const POST = route(MGR, ({ s, body: b }) => {
  if (!b.category || !(Number(b.amount) > 0)) fail('Category and amount are required');
  return q('insert into expenses(category,description,amount,method,user_id,spent_on) values($1,$2,$3,$4,$5,coalesce($6::date,current_date))',
    [b.category, b.description, b.amount, b.method || 'cash', s.id, b.spent_on || null]);
});
