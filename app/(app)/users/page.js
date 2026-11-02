'use client';
import { useEffect, useState } from 'react';
import { api, dt, photoFromFile } from '@/lib/client';
import Avatar from '@/components/Avatar';
const ROLES = { cashier: 'Cashier: sells, takes payments, opens/closes till, repairs intake, own daily report', technician: 'Technician: sees and updates repair jobs and stock (cannot sell)', manager: 'Manager: everything except managing owners/managers; can refund, adjust stock, see reports', owner: 'Owner: full access including staff management' };
const gen = () => 'Wt' + Math.random().toString(36).slice(2, 8) + Math.floor(10 + Math.random() * 89);
export default function Users() {
  const blank = () => ({ full_name: '', email: '', phone: '', password: gen(), role: 'cashier' });
  const [rows, setRows] = useState([]), [f, setF] = useState(blank()), [err, setErr] = useState(''), [ok, setOk] = useState(''), [me, setMe] = useState({});
  const load = () => api('/api/users').then(setRows);
  useEffect(() => { load(); api('/api/me').then(setMe); }, []);
  const isOwner = me.role === 'owner';
  const roles = isOwner ? ['cashier', 'technician', 'manager', 'owner'] : ['cashier', 'technician'];
  async function add() {
    setErr(''); setOk('');
    try { await api('/api/users', f); setOk(`${f.full_name} added. Give them: email ${f.email} and password ${f.password} — they can change it under "My account".`); setF(blank()); load(); }
    catch (e) { setErr(e.message); }
  }
  async function upd(u, body) { setErr(''); setOk(''); try { await api('/api/users', { id: u.id, ...body }, 'PUT'); load(); } catch (e) { setErr(e.message); } }
  async function setPhoto(u, file) { if (!file) return; setErr(''); try { await api('/api/users/photo', { id: u.id, photo: await photoFromFile(file) }); load(); } catch (e) { setErr(e.message); } }
  const canEdit = u => isOwner || ['cashier', 'technician'].includes(u.role);
  return (
    <div>
      <h1>Staff</h1>
      {err && <div className="err">{err}</div>}{ok && <div className="okmsg">{ok}</div>}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Add a staff member</h2>
        <div className="grid g3">
          <div className="f"><label>Full name</label><input value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} /></div>
          <div className="f"><label>Email (their login)</label><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} /></div>
          <div className="f"><label>Phone</label><input value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /></div>
          <div className="f"><label>Starting password (they can change it)</label><div className="row" style={{ flexWrap: 'nowrap' }}><input value={f.password} onChange={e => setF({ ...f, password: e.target.value })} /><button className="btn sm" onClick={() => setF({ ...f, password: gen() })}>New</button></div></div>
          <div className="f"><label>Access level</label><select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>{roles.map(r => <option key={r}>{r}</option>)}</select></div>
          <div className="f" style={{ justifyContent: 'flex-end' }}><button className="btn pri" onClick={add}>Add staff member</button></div>
        </div>
        <p className="muted" style={{ marginBottom: 0 }}>{ROLES[f.role]}</p>
      </div>
      <div className="card scroll"><table>
        <thead><tr><th>Photo</th><th>Name</th><th>Email</th><th>Access</th><th>Last sign-in</th><th>Status</th><th /></tr></thead>
        <tbody>{rows.map(u => (
          <tr key={u.id} style={{ opacity: u.is_active ? 1 : .55 }}>
            <td><Avatar photo={u.photo} name={u.full_name} size={34} /></td><td><b>{u.full_name}</b> {u.online && <span className="tag ok">online</span>}</td><td>{u.email}</td>
            <td>{canEdit(u) && u.id !== me.id ? <select value={u.role} onChange={e => upd(u, { role: e.target.value })}>{roles.map(r => <option key={r}>{r}</option>)}</select> : u.role}</td>
            <td>{u.last_login ? dt(u.last_login) : <span className="muted">never</span>}</td>
            <td><span className={'tag ' + (u.is_active ? 'ok' : 'bad')}>{u.is_active ? 'active' : 'locked'}</span></td>
            <td className="n">{canEdit(u) && <>
              <label className="btn sm" style={{ display: 'inline-block' }}>Photo<input type="file" accept="image/*" hidden onChange={e => setPhoto(u, e.target.files[0])} /></label>{' '}
              <button className="btn sm" onClick={() => { const p = prompt('New password for ' + u.full_name + ' (6+ characters)'); if (p) upd(u, { password: p }); }}>Reset password</button>{' '}
              {u.id !== me.id && <button className="btn sm" onClick={() => upd(u, { is_active: !u.is_active })}>{u.is_active ? 'Remove access' : 'Restore access'}</button>}</>}</td>
          </tr>))}</tbody></table></div>
      <p className="muted">“Remove access” locks the account and signs the person out immediately. Their past sales and records are kept.</p>
    </div>
  );
}
