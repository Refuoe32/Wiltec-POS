import bcrypt from 'bcryptjs';
import { route, fail } from '@/lib/api';
import { q } from '@/lib/db';
// A signed-in person changes their own password
export const POST = route(null, async ({ s, body: b }) => {
  const [u] = await q('select password_hash from users where id=$1', [s.id]);
  if (!(await bcrypt.compare(b.current || '', u.password_hash))) fail('Your current password is wrong');
  if (!b.password || b.password.length < 6) fail('New password must be 6+ characters');
  await q('update users set password_hash=$1 where id=$2', [await bcrypt.hash(b.password, 10), s.id]);
});
