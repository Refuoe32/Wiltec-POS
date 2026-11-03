import { route, MGR, IDLE_MINUTES } from '@/lib/api';
import { q } from '@/lib/db';
const TZ = "'Africa/Maseru'";
// Who signed in / out and when, plus an audit trail of sensitive actions
export const GET = route(MGR, async ({ url }) => {
  const [r] = await q(`select to_char(coalesce(nullif($1,'')::date,(now() at time zone ${TZ})::date),'YYYY-MM-DD') f,
    to_char(coalesce(nullif($2,'')::date,(now() at time zone ${TZ})::date),'YYYY-MM-DD') t`, [url.searchParams.get('from') || '', url.searchParams.get('to') || '']);
  const P = [r.f, r.t];
  const between = col => `(${col} at time zone ${TZ})::date between $1::date and $2::date`;
  return {
    from: r.f, to: r.t,
    sessions: await q(`select ss.id,u.full_name,u.role,ss.login_at,ss.last_seen,ss.logout_at,ss.end_reason,ss.device,ss.ip,
      (ss.logout_at is null and ss.last_seen>now()-make_interval(mins=>${IDLE_MINUTES})) online,
      extract(epoch from (coalesce(ss.logout_at,ss.last_seen)-ss.login_at))::float seconds
      from staff_sessions ss join users u on u.id=ss.user_id where ${between('ss.login_at')} order by ss.login_at desc limit 500`, P),
    summary: await q(`select u.id,u.full_name,u.role,
      (select count(*) from staff_sessions ss where ss.user_id=u.id and ${between('ss.login_at')})::int sessions,
      (select coalesce(sum(extract(epoch from (coalesce(ss.logout_at,ss.last_seen)-ss.login_at))),0) from staff_sessions ss where ss.user_id=u.id and ${between('ss.login_at')})::float seconds,
      (select count(*) from audit_log a where a.user_id=u.id and a.action in ('pos.void_line','pos.cancel_sale') and ${between('a.created_at')})::int voids,
      (select count(*) from audit_log a where a.user_id=u.id and a.action='sale.refund' and ${between('a.created_at')})::int refunds,
      (select count(*) from audit_log a where a.user_id=u.id and a.action='sale.discount' and ${between('a.created_at')})::int discounts,
      (select count(*) from audit_log a where a.user_id=u.id and a.action in ('sale.price_override','receipt.reprint') and ${between('a.created_at')})::int overrides,
      (select count(*) from audit_log a where a.user_id=u.id and a.action='login.failed' and ${between('a.created_at')})::int failed_logins,
      (select count(*) from tasks t where t.assigned_to=u.id and t.status='done' and ${between('t.completed_at')})::int tasks_done,
      (select count(*) from sales s where s.cashier_id=u.id and s.status in ('completed','partially_refunded') and ${between('s.created_at')})::int sales_count,
      (select coalesce(sum(total),0) from sales s where s.cashier_id=u.id and s.status in ('completed','partially_refunded') and ${between('s.created_at')})::float sales_total
      from users u order by u.full_name`, P),
    audit: await q(`select a.action,a.entity,a.details,a.created_at,u.full_name from audit_log a left join users u on u.id=a.user_id
      where ${between('a.created_at')} order by a.created_at desc limit 200`, P),
  };
});
