import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
const key = () => new TextEncoder().encode(process.env.JWT_SECRET);
export const sign = u => new SignJWT({ id: u.id, name: u.full_name, role: u.role })
  .setProtectedHeader({ alg: 'HS256' }).setExpirationTime('12h').sign(key());
export async function session() {
  const t = cookies().get('wt')?.value;
  if (!t) return null;
  try { return (await jwtVerify(t, key())).payload; } catch { return null; }
}
