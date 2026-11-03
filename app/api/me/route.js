import { route } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(null, async ({ s }) => {
  const [u] = await q('select email,phone,photo from users where id=$1', [s.id]);
  const [v] = await q("select value from settings where key='vat_rate'");
  return { ...s, ...u, vat_rate: Number(v?.value || 0) };
});
