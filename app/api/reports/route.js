import { route, MGR } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(MGR, async () => {
  const ok = "status in ('completed','partially_refunded')";
  const [today] = await q(`select count(*)::int n, coalesce(sum(total),0) total from sales where ${ok} and created_at::date=current_date`);
  const [month] = await q(`select count(*)::int n, coalesce(sum(total),0) total, coalesce(sum(vat_amount),0) vat from sales where ${ok} and date_trunc('month',created_at)=date_trunc('month',now())`);
  const [profit] = await q(`select coalesce(sum((si.unit_price*si.qty-si.discount-si.unit_cost*si.qty) - si.vat_amount),0) gross from sale_items si join sales s on s.id=si.sale_id
    where s.status='completed' and date_trunc('month',s.created_at)=date_trunc('month',now())`);
  const [exp] = await q(`select coalesce(sum(amount),0) total from expenses where date_trunc('month',spent_on)=date_trunc('month',now())`);
  const [owing] = await q('select coalesce(sum(balance_owing),0) total from customers');
  const [rep] = await q(`select count(*)::int n from repair_jobs where status not in ('collected','cancelled')`);
  const [stockv] = await q('select coalesce(sum(stock_qty*cost_price),0) cost, coalesce(sum(stock_qty*sell_price),0) retail from items where track_stock and is_active');
  return {
    today, month, profit: Number(profit.gross), expenses: Number(exp.total), owing: Number(owing.total), openRepairs: rep.n, stockValue: stockv,
    daily: await q(`select to_char(d,'DD Mon') as day, coalesce(sum(s.total),0)::float total from generate_series(current_date-13,current_date,'1 day') d
      left join sales s on s.created_at::date=d and s.status in ('completed','partially_refunded') group by d order by d`),
    top: await q(`select si.description name, sum(si.qty-si.returned_qty)::int units, sum(si.line_total)::float revenue from sale_items si join sales s on s.id=si.sale_id
      where s.status='completed' and s.created_at>now()-interval '30 days' group by 1 order by revenue desc limit 8`),
    methods: await q(`select method::text, sum(amount)::float total from payments where created_at>now()-interval '30 days' and sale_id is not null group by 1 order by 2 desc`),
    low: await q('select id,sku,name,stock_qty,reorder_level from v_low_stock order by stock_qty limit 15'),
  };
});
