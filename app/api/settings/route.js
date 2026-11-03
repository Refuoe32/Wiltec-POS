import { route, MGR } from '@/lib/api';
import { q } from '@/lib/db';
const KEYS = ['business_name', 'business_address', 'business_phone', 'vat_number', 'vat_rate', 'receipt_footer', 'return_policy', 'require_open_till'];
export const GET = route(MGR, async () => Object.fromEntries((await q('select key,value from settings')).map(r => [r.key, r.value])));
export const PUT = route(['owner'], async ({ s, body: b }) => {
  for (const k of KEYS) if (b[k] !== undefined) await q('insert into settings(key,value) values($1,$2) on conflict (key) do update set value=$2', [k, String(b[k]).slice(0, 500)]);
  await q(`insert into audit_log(user_id,action,entity) values($1,'settings.update','settings')`, [s.id]);
});
