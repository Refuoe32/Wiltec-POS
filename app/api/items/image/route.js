import { q } from '@/lib/db';
import { session } from '@/lib/auth';
// Serves a product picture as a normal image (cached by the browser; the ?v= number changes when the picture changes)
export async function GET(req) {
  if (!(await session())) return new Response('Please sign in', { status: 401 });
  const id = new URL(req.url).searchParams.get('id');
  const [r] = await q('select image from items where id=$1', [id]).catch(() => []);
  if (!r?.image) return new Response('', { status: 404 });
  return new Response(Buffer.from(r.image.split(',')[1], 'base64'), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'private, max-age=31536000, immutable' } });
}
