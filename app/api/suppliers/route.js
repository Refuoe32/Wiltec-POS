import { route, MGR, fail } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(null, () => q('select * from suppliers order by name'));
export const POST = route(MGR, ({ body: b }) => {
  if (!b.name) fail('Supplier name is required');
  return q('insert into suppliers(name,contact,phone,email,address,notes) values($1,$2,$3,$4,$5,$6)', [b.name, b.contact, b.phone, b.email, b.address, b.notes]);
});
