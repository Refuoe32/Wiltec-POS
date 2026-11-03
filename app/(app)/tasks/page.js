'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, today } from '@/lib/client';
import Avatar from '@/components/Avatar';
const PRI = { urgent: 'bad', high: 'warn', normal: '', low: '' };
const ST = { todo: 'To do', in_progress: 'In progress', done: 'Done', cancelled: 'Cancelled' };
export default function Tasks() {
  const [me, setMe] = useState({}), [staff, setStaff] = useState([]), [who, setWho] = useState(''), [d, setD] = useState(null), [f, setF] = useState(null), [err, setErr] = useState('');
  const mgr = ['owner', 'manager'].includes(me.role);
  useEffect(() => { api('/api/me').then(m => { setMe(m); if (['owner', 'manager'].includes(m.role)) setWho(m.id); }); api('/api/users').then(u => setStaff(u.filter(x => x.is_active))); }, []);
  const load = () => me.id && api('/api/tasks?user=' + who).then(setD).catch(e => setErr(e.message));
  useEffect(() => { load(); }, [who, me.id]);
  async function set(t, status) { setErr(''); try { await api('/api/tasks', { id: t.id, status }, 'PATCH'); load(); } catch (e) { setErr(e.message); } }
  async function create() { setErr(''); try { await api('/api/tasks', f); setF(null); load(); } catch (e) { setErr(e.message); } }
  const person = staff.find(s => s.id === (mgr ? who : me.id));
  return (
    <div>
      <div className="row"><h1 className="sp">{mgr && who !== me.id ? (who ? 'Tasks · ' + (person?.full_name || '') : 'All tasks') : 'My tasks'}</h1>
        {mgr && <><select value={who} onChange={e => setWho(e.target.value)}><option value="">Everyone</option><option value={me.id}>My own tasks</option>{staff.filter(s => s.id !== me.id).map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}</select>
          <button className="btn pri" onClick={() => { setErr(''); setF({ title: '', description: '', assigned_to: who || '', priority: 'normal', due_date: '' }); }}>Assign a task</button></>}
      </div>
      {err && !f && <div className="err">{err}</div>}
      {!mgr && <div className="card row" style={{ margin: '12px 0' }}><Avatar photo={me.photo} name={me.name} size={44} /><div><b>{me.name}</b><div className="muted">{me.role} · {d ? d.tasks.filter(t => ['todo', 'in_progress'].includes(t.status)).length : 0} open tasks</div></div></div>}
      {!d ? <p>Loading…</p> : <>
        <div className="card scroll" style={{ margin: '14px 0' }}><h2>Tasks</h2>
          <table><thead><tr><th>Task</th>{(mgr && !who) && <th>Assigned to</th>}<th>Priority</th><th>Due</th><th>Status</th><th /></tr></thead>
            <tbody>{d.tasks.map(t => (
              <tr key={t.id} style={{ opacity: ['done', 'cancelled'].includes(t.status) ? .55 : 1 }}>
                <td><b>{t.title}</b>{t.job_no && <> <span className="tag">{t.job_no}</span></>}{t.description && <div className="muted" style={{ fontSize: '.85rem' }}>{t.description}</div>}<div className="muted" style={{ fontSize: '.78rem' }}>from {t.assigner || '—'}</div></td>
                {(mgr && !who) && <td>{t.assignee}</td>}
                <td><span className={'tag ' + PRI[t.priority]}>{t.priority}</span></td>
                <td>{t.due ? <span style={{ color: t.due < today() && !['done', 'cancelled'].includes(t.status) ? 'var(--bad)' : 'inherit' }}>{t.due}</span> : '—'}</td>
                <td>{ST[t.status]}</td>
                <td className="n">{t.status === 'todo' && <button className="btn sm" onClick={() => set(t, 'in_progress')}>Start</button>}{' '}
                  {['todo', 'in_progress'].includes(t.status) && <button className="btn sm pri" onClick={() => set(t, 'done')}>Done</button>}
                  {mgr && ['todo', 'in_progress'].includes(t.status) && <> <button className="btn sm bad" onClick={() => set(t, 'cancelled')}>Cancel</button></>}
                  {t.status === 'done' && <button className="btn sm" onClick={() => set(t, 'todo')}>Reopen</button>}</td>
              </tr>))}</tbody></table>{!d.tasks.length && <p className="muted">No tasks.</p>}</div>
        <div className="card scroll"><h2>Repair jobs assigned {mgr && !who ? 'to staff' : 'to me'}</h2>
          <table><thead><tr><th>Job</th><th>Customer</th><th>Device</th>{(mgr && !who) && <th>Technician</th>}<th>Status</th><th>Promised</th></tr></thead>
            <tbody>{d.repairs.map(r => <tr key={r.id}><td><Link href="/repairs"><b>{r.job_no}</b></Link></td><td>{r.customer}</td><td>{r.device_type} {r.brand_model}</td>{(mgr && !who) && <td>{r.technician}</td>}<td><span className="tag">{r.status.replace('_', ' ')}</span></td><td>{r.promised || '—'}</td></tr>)}</tbody></table>
          {!d.repairs.length && <p className="muted">No repair jobs assigned.</p>}</div></>}
      {f && <div className="modal"><div className="card"><h2>Assign a task</h2>{err && <div className="err">{err}</div>}
        <div className="grid g2">
          <div className="f" style={{ gridColumn: '1/-1' }}><label>Task</label><input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="e.g. Count stock of laptops" /></div>
          <div className="f" style={{ gridColumn: '1/-1' }}><label>Details (optional)</label><textarea rows="2" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
          <div className="f"><label>Assign to</label><select value={f.assigned_to} onChange={e => setF({ ...f, assigned_to: e.target.value })}><option value="">Choose…</option>{staff.map(s => <option key={s.id} value={s.id}>{s.full_name} ({s.role})</option>)}</select></div>
          <div className="f"><label>Priority</label><select value={f.priority} onChange={e => setF({ ...f, priority: e.target.value })}>{['low', 'normal', 'high', 'urgent'].map(p => <option key={p}>{p}</option>)}</select></div>
          <div className="f"><label>Due date</label><input type="date" value={f.due_date} onChange={e => setF({ ...f, due_date: e.target.value })} /></div>
        </div>
        <div className="row" style={{ marginTop: 14 }}><button className="btn pri sp" onClick={create}>Assign task</button><button className="btn" onClick={() => setF(null)}>Cancel</button></div>
      </div></div>}
    </div>
  );
}
