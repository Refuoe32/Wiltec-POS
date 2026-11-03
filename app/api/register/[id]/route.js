import { route, MGR, fail } from '@/lib/api';
import { q } from '@/lib/db';
import { sessionSummary } from '../route';
// X report (till still open) or Z report (till closed) for one session. Owner/manager, or the cashier who opened it.
export const GET = route(null, async ({ s, params }) => {
  const [sess] = await q('select r.*,u.full_name opener,c.full_name closer from register_sessions r join users u on u.id=r.opened_by left join users c on c.id=r.closed_by where r.id=$1', [params.id]);
  if (!sess) fail('Till session not found', 404);
  if (!MGR.includes(s.role) && sess.opened_by !== s.id) fail('This is not your till', 403);
  const sum = await sessionSummary(sess);
  return {
    sess, sum, blind: !MGR.includes(s.role) && !sess.closed_at,
    sales: await q(`select s.sale_no,s.total::float,s.status,s.created_at,(select string_agg(distinct method::text, ', ') from payments p where p.sale_id=s.id and p.amount>0) methods from sales s where s.session_id=$1 order by s.created_at`, [sess.id]),
    voids: await q(`select details,created_at,action from audit_log where user_id=$1 and action in ('pos.void_line','pos.cancel_sale') and created_at>=$2 and ($3::timestamptz is null or created_at<=$3) order by created_at`, [sess.opened_by, sess.opened_at, sess.closed_at || null]),
  };
});
