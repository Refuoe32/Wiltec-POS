import { route, SELL } from '@/lib/api';
import { q } from '@/lib/db';
// The till reports removed lines and cancelled orders, so managers can see them (fraud control)
export const POST = route(SELL, async ({ s, body: b }) => {
  const type = b.type === 'cancel_sale' ? 'pos.cancel_sale' : 'pos.void_line';
  await q(`insert into audit_log(user_id,action,entity,details) values($1,$2,'pos',$3)`, [s.id, type, JSON.stringify(b.detail || {})]);
});
