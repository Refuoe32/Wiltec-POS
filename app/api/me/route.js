import { route } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(null, async ({ s }) => {
  const [u] = await q('select email,phone,photo from users where id=$1', [s.id]);
  const st = Object.fromEntries((await q("select key,value from settings where key in ('vat_rate','business_name','business_address')")).map(r => [r.key, r.value]));
  return { ...s, ...u, vat_rate: Number(st.vat_rate || 0), business_name: st.business_name || 'WilTec Solutions', business_address: st.business_address || '' };
});
