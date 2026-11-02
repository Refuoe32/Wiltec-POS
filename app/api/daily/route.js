import { route, SELL, MGR } from '@/lib/api';
import { q } from '@/lib/db';
const TZ = "'Africa/Maseru'";
const OK = "('completed','partially_refunded')";
// End-of-day report for one date (Lesotho time). Cashiers only see their own sales.
export const GET = route(SELL, async ({ s, url }) => {
  const [r] = await q(`select to_char(coalesce(nullif($1,'')::date,(now() at time zone ${TZ})::date),'YYYY-MM-DD') d`, [url.searchParams.get('day') || '']);
  const day = r.d, isMgr = MGR.includes(s.role);
  const cashier = isMgr ? (url.searchParams.get('cashier') || null) : s.id;
  const W = `(s.created_at at time zone ${TZ})::date=$1::date and ($2::uuid is null or s.cashier_id=$2::uuid)`;
  const P = [day, cashier];
  const [tot] = await q(`select count(*) filter (where s.status in ${OK})::int sales_count,
    coalesce(sum(total) filter (where s.status in ${OK}),0)::float total, coalesce(sum(vat_amount) filter (where s.status in ${OK}),0)::float vat,
    coalesce(sum(discount) filter (where s.status in ${OK}),0)::float discount,
    count(*) filter (where s.status='refunded')::int refunds_count, coalesce(sum(total) filter (where s.status='refunded'),0)::float refunds_total
    from sales s where ${W}`, P);
  const [profit] = await q(`select coalesce(sum(si.line_total-si.vat_amount-si.unit_cost*si.qty),0)::float gross from sale_items si
    join sales s on s.id=si.sale_id where ${W} and s.status='completed'`, P);
  const out = {
    day, totals: { ...tot, profit: profit.gross }, mine: !isMgr,
    methods: await q(`select p.method::text, sum(p.amount)::float total from payments p join sales s on s.id=p.sale_id where ${W} group by 1 order by 2 desc`, P),
    cashiers: await q(`select u.full_name name, count(*)::int n, sum(s.total)::float total from sales s join users u on u.id=s.cashier_id
      where ${W} and s.status in ${OK} group by 1 order by 3 desc`, P),
    items: await q(`select si.description name, sum(si.qty-si.returned_qty)::int units, sum(si.line_total)::float revenue from sale_items si
      join sales s on s.id=si.sale_id where ${W} and s.status in ${OK} group by 1 order by 3 desc limit 60`, P),
    sales: await q(`select s.id,s.sale_no,s.total::float,s.status,s.created_at,c.name customer,u.full_name cashier,
      (select string_agg(distinct method::text, ', ') from payments p where p.sale_id=s.id and p.amount>0) methods
      from sales s left join customers c on c.id=s.customer_id join users u on u.id=s.cashier_id where ${W} order by s.created_at`, P),
  };
  if (isMgr) {
    out.accountPayments = await q(`select method::text, sum(amount)::float total from payments where sale_id is null
      and (created_at at time zone ${TZ})::date=$1::date group by 1`, [day]);
    out.expenses = await q('select category, sum(amount)::float total from expenses where spent_on=$1::date group by 1 order by 2 desc', [day]);
    out.repairs = (await q(`select (select count(*) from repair_jobs where (received_at at time zone ${TZ})::date=$1::date)::int received,
      (select count(*) from repair_jobs where (collected_at at time zone ${TZ})::date=$1::date)::int collected`, [day]))[0];
    out.tills = await q(`select r.opening_float::float,r.expected_cash::float,r.counted_cash::float,r.variance::float,r.opened_at,r.closed_at,u.full_name opener
      from register_sessions r join users u on u.id=r.opened_by where (r.opened_at at time zone ${TZ})::date=$1::date order by r.opened_at`, [day]);
  }
  return out;
});
