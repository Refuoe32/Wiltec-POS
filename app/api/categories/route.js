import { route, MGR } from '@/lib/api';
import { q } from '@/lib/db';
export const GET = route(null, () => q(`select c.id,c.name,(select count(*) from items i where i.category_id=c.id and i.is_active)::int n from categories c order by c.name`));
export const POST = route(MGR, ({ body }) => q('insert into categories(name) values($1) on conflict do nothing', [body.name]));
