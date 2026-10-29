import { fail } from './api';
// Creates a sale inside an open transaction `c`. Prices are VAT-inclusive.
export async function createSale(c, s, { customer_id = null, items = [], payments = [], note = null, repair_job_id = null }) {
  if (!items.length) fail('The cart is empty');
  const vat = Number((await c.query("select value from settings where key='vat_rate'")).rows[0]?.value || 0);
  const sess = (await c.query('select id from register_sessions where closed_at is null order by id desc limit 1')).rows[0];
  const isMgr = ['owner', 'manager'].includes(s.role);
  let total = 0, vatT = 0, disc = 0, sub = 0; const lines = [];
  for (const it of items) {
    const { rows: [db] } = await c.query('select * from items where id=$1 for update', [it.item_id]);
    if (!db || !db.is_active) fail('Item not found');
    const qty = parseInt(it.qty);
    if (!(qty > 0)) fail('Quantity must be at least 1');
    if (db.track_stock && db.stock_qty < qty) fail(`Not enough stock for ${db.name} (only ${db.stock_qty} left)`);
    const price = it.unit_price != null ? Number(it.unit_price) : Number(db.sell_price);
    if (price !== Number(db.sell_price) && !(db.kind === 'service' || isMgr)) fail(`Only a manager can change the price of ${db.name}`);
    const d = Math.min(Number(it.discount || 0), price * qty);
    if (d > price * qty * 0.1 + 0.001 && !isMgr) fail('Discounts above 10% need a manager');
    const lt = +(price * qty - d).toFixed(2);
    const v = db.vat_applies ? +((lt * vat) / (100 + vat)).toFixed(2) : 0;
    lines.push({ db, qty, price, d, lt, v, serial: it.serial_no });
    sub += price * qty; disc += d; total += lt; vatT += v;
  }
  total = +total.toFixed(2);
  const pays = payments.filter(p => Number(p.amount) > 0);
  const paid = pays.reduce((a, p) => a + Number(p.amount), 0);
  if (Math.abs(paid - total) > 0.009) fail(`Payments (${paid.toFixed(2)}) must equal the total (${total.toFixed(2)})`);
  const { rows: [sale] } = await c.query(
    `insert into sales(customer_id,cashier_id,session_id,repair_job_id,subtotal,discount,vat_amount,total,note)
     values($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id,sale_no`,
    [customer_id, s.id, sess?.id || null, repair_job_id, sub.toFixed(2), disc.toFixed(2), vatT.toFixed(2), total, note]);
  for (const l of lines) {
    let serialId = null;
    if (l.serial) {
      const r = await c.query(`insert into item_serials(item_id,serial_no,in_stock) values($1,$2,false)
        on conflict (serial_no) do update set in_stock=false returning id`, [l.db.id, l.serial]);
      serialId = r.rows[0].id;
    }
    await c.query(`insert into sale_items(sale_id,item_id,serial_id,description,qty,unit_price,unit_cost,discount,vat_amount,line_total)
      values($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [sale.id, l.db.id, serialId, l.db.name, l.qty, l.price, l.db.cost_price, l.d, l.v, l.lt]);
    if (l.db.track_stock) {
      await c.query('update items set stock_qty=stock_qty-$1, updated_at=now() where id=$2', [l.qty, l.db.id]);
      await c.query(`insert into stock_movements(item_id,move_type,qty_change,reference,user_id) values($1,'sale',$2,$3,$4)`,
        [l.db.id, -l.qty, sale.sale_no, s.id]);
    }
  }
  for (const p of pays) {
    if (p.method === 'credit_account') {
      if (!customer_id) fail('Choose a customer to sell on account');
      const { rows: [cu] } = await c.query('select * from customers where id=$1 for update', [customer_id]);
      if (Number(cu.balance_owing) + Number(p.amount) > Number(cu.credit_limit)) fail(`Credit limit exceeded for ${cu.name}`);
      await c.query('update customers set balance_owing=balance_owing+$1 where id=$2', [p.amount, customer_id]);
    }
    await c.query('insert into payments(sale_id,customer_id,method,amount,reference) values($1,$2,$3,$4,$5)',
      [sale.id, customer_id, p.method, p.amount, p.reference || null]);
  }
  return { id: sale.id, sale_no: sale.sale_no, total };
}
