import { route, fail, MGR } from '@/lib/api';
import { q } from '@/lib/db';
const PRI = "case t.priority when 'urgent' then 0 when 'high' then 1 when 'normal' then 2 else 3 end";
// Staff see only their own tasks and assigned repair jobs. Managers can view everyone (?user=<id>) and assign.
export const GET = route(null, async ({ s, url }) => {
  const who = MGR.includes(s.role) ? (url.searchParams.get('user') || '') : s.id;
  return {
    tasks: await q(`select t.id,t.title,t.description,t.priority,t.status,to_char(t.due_date,'YYYY-MM-DD') due,t.completed_at,t.created_at,t.assigned_to,
      a.full_name assignee,b.full_name assigner,r.job_no from tasks t join users a on a.id=t.assigned_to left join users b on b.id=t.assigned_by
      left join repair_jobs r on r.id=t.repair_job_id where ($1='' or t.assigned_to::text=$1)
      and (t.status in ('todo','in_progress') or t.completed_at>now()-interval '7 days')
      order by (t.status in ('done','cancelled')), ${PRI}, t.due_date nulls last, t.created_at desc limit 300`, [who]),
    repairs: await q(`select r.id,r.job_no,r.device_type,r.brand_model,r.status,to_char(r.promised_date,'YYYY-MM-DD') promised,c.name customer,u.full_name technician
      from repair_jobs r join customers c on c.id=r.customer_id join users u on u.id=r.technician_id
      where r.status not in ('collected','cancelled','unrepairable') and ($1='' or r.technician_id::text=$1)
      order by r.promised_date nulls last, r.received_at`, [who]),
  };
});
export const POST = route(MGR, async ({ s, body: b }) => {
  if (!b.title || !b.assigned_to) fail('A title and a person to assign it to are required');
  await q('insert into tasks(title,description,assigned_to,assigned_by,priority,due_date,repair_job_id) values($1,$2,$3,$4,$5,$6::date,$7)',
    [b.title, b.description || null, b.assigned_to, s.id, b.priority || 'normal', b.due_date || null, b.repair_job_id || null]);
});
// Assignees update the status of their own tasks; managers can also edit details or reassign
export const PATCH = route(null, async ({ s, body: b }) => {
  const [t] = await q('select assigned_to from tasks where id=$1', [b.id]);
  if (!t) fail('Task not found', 404);
  const mgr = MGR.includes(s.role);
  if (!mgr && t.assigned_to !== s.id) fail('This task is not assigned to you', 403);
  if (!mgr && (b.title || b.assigned_to || b.due_date || b.priority)) fail('Only a manager can edit task details', 403);
  await q(`update tasks set status=coalesce($1,status), title=coalesce($2,title), description=coalesce($3,description),
    assigned_to=coalesce($4::uuid,assigned_to), priority=coalesce($5,priority), due_date=coalesce($6::date,due_date),
    completed_at=case when coalesce($1,status)='done' then coalesce(completed_at,now()) else null end where id=$7`,
    [b.status ?? null, b.title ?? null, b.description ?? null, b.assigned_to ?? null, b.priority ?? null, b.due_date ?? null, b.id]);
});
