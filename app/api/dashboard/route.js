import { route, MGR, IDLE_MINUTES } from '@/lib/api';
import { q } from '@/lib/db';
const TZ = "'Africa/Maseru'";
const OK = "('completed','partially_refunded')";
// Everything the Dashboard needs in one call
export const GET = route(MGR, async () => {
  const [t] = await q(`select
    (select count(*) from items where is_active)::int products,
    (select count(*) from items where is_active and track_stock and stock_qty<=reorder_level)::int low_stock,
    (select count(*) from users where is_active and status='active')::int staff,
    (select count(distinct user_id) from staff_sessions where logout_at is null and last_seen>now()-make_interval(mins=>${IDLE_MINUTES}))::int online,
    (select coalesce(sum(total),0) from sales where status in ${OK} and (created_at at time zone ${TZ})::date=(now() at time zone ${TZ})::date)::float today_total,
    (select count(*) from sales where status in ${OK} and (created_at at time zone ${TZ})::date=(now() at time zone ${TZ})::date)::int today_count,
    (select count(*) from repair_jobs where status not in ('collected','cancelled','unrepairable'))::int open_repairs`);
  const daily = await q(`select to_char(d,'DD Mon') as day,
      coalesce((select sum(s.total) from sales s where (s.created_at at time zone ${TZ})::date=d::date and s.status in ${OK}),0)::float sales,
      coalesce((select sum(si.line_total-si.vat_amount-si.unit_cost*si.qty) from sale_items si join sales s on s.id=si.sale_id where (s.created_at at time zone ${TZ})::date=d::date and s.status='completed'),0)::float profit,
      coalesce((select sum(e.amount) from expenses e where e.spent_on=d::date),0)::float expenses
    from generate_series((now() at time zone ${TZ})::date-13,(now() at time zone ${TZ})::date,'1 day') d order by d`);
  const recent = await q(`select s.id,s.sale_no,s.total::float,s.status,s.created_at,u.full_name cashier,
      (select coalesce(sum(qty),0) from sale_items where sale_id=s.id)::int qty,
      (select string_agg(distinct method::text, ', ') from payments p where p.sale_id=s.id and p.amount>0) methods
    from sales s join users u on u.id=s.cashier_id order by s.created_at desc limit 25`);
  return { ...t, daily, recent };
});
