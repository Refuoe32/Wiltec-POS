import { route } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(null, async ({ s }) => {
  const [u] = await q('select email,phone,photo from users where id=$1', [s.id]);
  return { ...s, ...u };
});
