'use client';
import { useEffect, useState } from 'react';
import { api, money, dt, hm, today } from '@/lib/client';
const WHY = { signout: 'signed out', timeout: 'timed out (inactive)', locked: 'access removed' };
export default function Activity() {
  const [from, setFrom] = useState(today()), [to, setTo] = useState(today()), [d, setD] = useState(null), [err, setErr] = useState('');
  const load = () => api(`/api/activity?from=${from}&to=${to}`).then(setD).catch(e => setErr(e.message));
  useEffect(() => { load(); }, [from, to]);
  if (err) return <div className="err">{err}</div>;
  if (!d) return <p>Loading…</p>;
  return (
    <div>
      <div className="row noprint"><h1 className="sp">Staff activity</h1>
        <label style={{ margin: 0 }}>From</label><input type="date" value={from} onChange={e => setFrom(e.target.value)} />
        <label style={{ margin: 0 }}>To</label><input type="date" value={to} onChange={e => setTo(e.target.value)} />
        <button className="btn" onClick={load}>Refresh</button><button className="btn pri" onClick={() => window.print()}>Print</button></div>
      <div className="pr-only"><h1>WilTec Solutions — Staff activity {d.from} to {d.to}</h1></div>
      <div className="card scroll" style={{ margin: '14px 0' }}><h2>Summary per person</h2>
        <table><thead><tr><th>Name</th><th>Access</th><th className="n">Sign-ins</th><th className="n">Time signed in</th><th className="n">Sales</th><th className="n">Sales value</th><th className="n">Tasks done</th></tr></thead>
          <tbody>{d.summary.filter(u => u.sessions || u.sales_count || u.tasks_done).map(u => <tr key={u.id}><td><b>{u.full_name}</b></td><td>{u.role}</td><td className="n">{u.sessions}</td><td className="n">{hm(u.seconds)}</td><td className="n">{u.sales_count}</td><td className="n">{money(u.sales_total)}</td><td className="n">{u.tasks_done}</td></tr>)}</tbody></table>
        {!d.summary.some(u => u.sessions || u.sales_count || u.tasks_done) && <p className="muted">No activity in this period.</p>}</div>
      <div className="card scroll" style={{ marginBottom: 14 }}><h2>Sign-in and sign-out times</h2>
        <table><thead><tr><th>Name</th><th>Signed in</th><th>Signed out / last active</th><th className="n">Duration</th><th>How it ended</th><th>Device</th></tr></thead>
          <tbody>{d.sessions.map(s => <tr key={s.id}><td><b>{s.full_name}</b> <span className="muted">{s.role}</span></td><td>{dt(s.login_at)}</td>
            <td>{s.online ? <span className="tag ok">online now</span> : dt(s.logout_at || s.last_seen)}</td><td className="n">{hm(s.seconds)}</td>
            <td>{s.online ? '' : s.end_reason ? WHY[s.end_reason] : 'closed browser (no sign-out)'}</td><td className="muted" style={{ fontSize: '.8rem' }}>{(s.device || '').slice(0, 50)}</td></tr>)}</tbody></table></div>
      <div className="card scroll"><h2>Sensitive actions (refunds, price changes, staff changes)</h2>
        <table><thead><tr><th>When</th><th>Who</th><th>Action</th><th>Details</th></tr></thead>
          <tbody>{d.audit.map((a, i) => <tr key={i}><td>{dt(a.created_at)}</td><td>{a.full_name}</td><td>{a.action}</td><td className="muted" style={{ fontSize: '.8rem' }}>{a.details ? JSON.stringify(a.details) : ''}</td></tr>)}</tbody></table>
        {!d.audit.length && <p className="muted">Nothing recorded.</p>}</div>
    </div>
  );
}
