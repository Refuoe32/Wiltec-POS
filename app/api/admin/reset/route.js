import bcrypt from 'bcryptjs';
import { route, fail } from '@/lib/api';
import { q, tx } from '@/lib/db';
// OWNER ONLY. Clears test/old data so the shop can start fresh. Needs the owner's password and the word RESET.
export const POST = route(['owner'], async ({ s, body: b }) => {
  const [u] = await q('select password_hash from users where id=$1', [s.id]);
  if (b.confirm !== 'RESET' || !(await bcrypt.compare(b.password || '', u.password_hash))) fail('Type RESET and enter your password to confirm');
  if (!b.transactions && !b.zeroStock && !b.products) fail('Choose what to clear');
  await tx(async c => {
    const wipe = b.transactions || b.products;                 // products can only go once the history that uses them is gone
    if (wipe) {
      for (const t of ['sale_items', 'payments', 'sales', 'repair_parts', 'repair_status_log']) await c.query(`delete from ${t}`);
      await c.query('update tasks set repair_job_id=null');
      for (const t of ['repair_jobs', 'register_sessions', 'expenses', 'purchase_order_items', 'purchase_orders', 'stock_movements', 'item_serials']) await c.query(`delete from ${t}`);
      await c.query("update customers set balance_owing=0");
      await c.query('alter sequence sale_no_seq restart with 1000'); await c.query('alter sequence repair_no_seq restart with 500'); await c.query('alter sequence po_no_seq restart with 100');
    }
    if (b.zeroStock && !b.products) {
      await c.query(`insert into stock_movements(item_id,move_type,qty_change,unit_cost,note,user_id) select id,'writeoff',-stock_qty,cost_price,'Cleared: start fresh',$1 from items where track_stock and stock_qty>0`, [s.id]);
      await c.query('update items set stock_qty=0, updated_at=now() where track_stock');
    }
    if (b.products) {
      await c.query('delete from items'); await c.query('delete from brands'); await c.query('delete from categories'); await c.query('delete from suppliers');
      const [cat] = (await c.query("insert into categories(name) values('Repair Services') returning id")).rows;
      await c.query("insert into items(kind,sku,name,category_id,sell_price,cost_price,track_stock,vat_applies) values('service','SRV-REPAIR','Repair job (labour & parts)',$1,0,0,false,true)", [cat.id]);
      await c.query("insert into items(kind,sku,name,sell_price,cost_price,track_stock,vat_applies) values('service','SRV-MISC','Miscellaneous item',0,0,false,true)");
    }
    if (b.customers && wipe) await c.query('delete from customers');
    await c.query(`insert into audit_log(user_id,action,entity,details) values($1,'system.reset','system',$2)`, [s.id, JSON.stringify({ transactions: !!b.transactions, zeroStock: !!b.zeroStock, products: !!b.products, customers: !!(b.customers && wipe) })]);
  });
  return { ok: true };
});
