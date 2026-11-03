import { route, SELL, MGR, fail } from '@/lib/api';
import { q } from '@/lib/db';
const OK = "('completed','partially_refunded')";
// Totals for one till session (used for the X report, the Z report and cashing up)
export async function sessionSummary(sess) {
  const [t] = await q(`select
    (select count(*) from sales where session_id=$1 and status in ${OK})::int sales_count,
    (select coalesce(sum(total),0) from sales where session_id=$1 and status in ${OK})::float sales_total,
    (select coalesce(sum(discount),0) from sales where session_id=$1 and status in ${OK})::float discounts,
    (select count(*) from sales where session_id=$1 and status='refunded')::int refunds_count,
    (select coalesce(sum(total),0) from sales where session_id=$1 and status='refunded')::float refunds_total,
    (select count(*) from audit_log where user_id=$2 and action in ('pos.void_line','pos.cancel_sale') and created_at>=$3 and ($4::timestamptz is null or created_at<=$4))::int voids,
    (select coalesce(sum(amount),0) from payments where session_id=$1 and method='cash')::float cash_net,
    (select coalesce(sum(amount),0) from expenses where method='cash' and user_id=$2 and created_at>=$3 and ($4::timestamptz is null or created_at<=$4))::float cash_expenses`,
    [sess.id, sess.opened_by, sess.opened_at, sess.closed_at || null]);
  const methods = await q('select method::text, sum(amount)::float total from payments where session_id=$1 group by 1 order by 2 desc', [sess.id]);
  return { ...t, methods, expected_cash: +(Number(sess.opening_float) + t.cash_net - t.cash_expenses).toFixed(2) };
}
const openOf = uid => q('select r.*,u.full_name opener from register_sessions r join users u on u.id=r.opened_by where r.closed_at is null and r.opened_by=$1 order by r.id desc limit 1', [uid]).then(r => r[0]);
export const GET = route(SELL, async ({ s }) => {
  const mgr = MGR.includes(s.role), cur = await openOf(s.id);
  const current = cur ? { ...cur, ...(await sessionSummary(cur)) } : null;
  if (current && !mgr) delete current.expected_cash;            // cashiers count their cash "blind", like a supermarket cash-up
  const require = (await q("select value from settings where key='require_open_till'"))[0]?.value !== 'no';
  return {
    current, require,
    open: mgr ? await q('select r.id,r.opened_at,r.opening_float,u.full_name opener from register_sessions r join users u on u.id=r.opened_by where r.closed_at is null order by r.opened_at') : [],
    history: await q(`select r.*,u.full_name opener from register_sessions r join users u on u.id=r.opened_by where r.closed_at is not null and ($1 or r.opened_by=$2) order by r.id desc limit 30`, [mgr, s.id]),
  };
});
export const POST = route(SELL, async ({ s, body: b }) => {
  const cur = await openOf(s.id);
  if (b.action === 'open') {
    if (cur) fail('You already have a till open');
    const f = Number(b.amount);
    if (!(f >= 0)) fail('Enter your starting cash float (0 if none)');
    const [r] = await q('insert into register_sessions(opened_by,opening_float) values($1,$2) returning id', [s.id, f]);
    await q(`insert into audit_log(user_id,action,entity,entity_id,details) values($1,'till.open','till',$2,$3)`, [s.id, r.id, JSON.stringify({ float: f })]);
    return { id: r.id };
  }
  if (b.action === 'close') {
    if (!cur) fail('You have no open till');
    if (b.amount === '' || b.amount == null || !(Number(b.amount) >= 0)) fail('Count the cash in your drawer and enter the total');
    const sum = await sessionSummary(cur), counted = Number(b.amount);
    await q('update register_sessions set closed_at=now(),closed_by=$1,expected_cash=$2::numeric,counted_cash=$3::numeric,variance=$3::numeric-$2::numeric,note=$4 where id=$5',
      [s.id, sum.expected_cash, counted, b.note || null, cur.id]);
    await q(`insert into audit_log(user_id,action,entity,entity_id,details) values($1,'till.close','till',$2,$3)`, [s.id, cur.id, JSON.stringify({ expected: sum.expected_cash, counted, variance: +(counted - sum.expected_cash).toFixed(2) })]);
    return { id: cur.id };
  }
  fail('Unknown action');
});
