import { route, SELL, fail } from '@/lib/api';
import { q } from '@/lib/db';
async function current() {
  const [s] = await q(`select r.*,u.full_name opener from register_sessions r join users u on u.id=r.opened_by where closed_at is null order by id desc limit 1`);
  if (!s) return null;
  const [t] = await q(`select
    coalesce((select sum(amount) from payments where method='cash' and created_at>=$1),0) cash_in,
    coalesce((select sum(amount) from expenses where method='cash' and id>0 and spent_on>=$1::date),0) cash_out,
    coalesce((select sum(total) from sales where session_id=$2 and status in ('completed','partially_refunded')),0) sales_total,
    (select count(*) from sales where session_id=$2) sales_count`, [s.opened_at, s.id]);
  return { ...s, ...t, expected_cash: Number(s.opening_float) + Number(t.cash_in) - Number(t.cash_out) };
}
export const GET = route(null, async () => ({
  current: await current(),
  history: await q(`select r.*,u.full_name opener from register_sessions r join users u on u.id=r.opened_by where closed_at is not null order by id desc limit 15`),
}));
export const POST = route(SELL, async ({ s, body: b }) => {
  const cur = await current();
  if (b.action === 'open') {
    if (cur) fail('A till session is already open');
    await q('insert into register_sessions(opened_by,opening_float) values($1,$2)', [s.id, b.amount || 0]);
  } else if (b.action === 'close') {
    if (!cur) fail('No open till session');
    const counted = Number(b.amount);
    await q('update register_sessions set closed_at=now(),closed_by=$1,expected_cash=$2::numeric,counted_cash=$3::numeric,variance=$3::numeric-$2::numeric,note=$4 where id=$5',
      [s.id, cur.expected_cash, counted, b.note || null, cur.id]);
  }
});
