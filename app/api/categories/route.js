import { route, MGR } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(null, () => q('select * from categories order by name'));
export const POST = route(MGR, ({ body }) => q('insert into categories(name) values($1) on conflict do nothing', [body.name]));
