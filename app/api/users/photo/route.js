import { route, fail, MGR } from '@/lib/api';
import { q } from '@/lib/db';
// Set or remove a passport-size photo. Anyone can set their own; managers can set a cashier's/technician's; the owner anyone's.
export const POST = route(null, async ({ s, body: b }) => {
  const id = b.id || s.id;
  if (id !== s.id) {
    if (!MGR.includes(s.role)) fail('You can only change your own photo', 403);
    const [t] = await q('select role from users where id=$1', [id]);
    if (!t) fail('User not found', 404);
    if (s.role !== 'owner' && !['cashier', 'technician'].includes(t.role)) fail('Only the owner can change this photo', 403);
  }
  if (b.photo && (!/^data:image\/jpeg;base64,/.test(b.photo) || b.photo.length > 250000)) fail('Photo must be a small JPEG image');
  await q('update users set photo=$1 where id=$2', [b.photo || null, id]);
});
