'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
export default function Users() {
  const [rows, setRows] = useState([]), [f, setF] = useState({ full_name: '', email: '', password: '', role: 'cashier' }), [err, setErr] = useState(''), [me, setMe] = useState({});
  const load = () => api('/api/users').then(setRows);
  useEffect(() => { load(); api('/api/me').then(setMe); }, []);
  async function add() { setErr(''); try { await api('/api/users', f); setF({ full_name: '', email: '', password: '', role: 'cashier' }); load(); } catch (e) { setErr(e.message); } }
  async function upd(u, body) { setErr(''); try { await api('/api/users', { id: u.id, role: u.role, ...body }, 'PUT'); load(); } catch (e) { setErr(e.message); } }
  if (me.role && me.role !== 'owner') return <div className="err">Only the owner can manage staff.</div>;
  return (
    <div>
      <h1>Staff</h1>{err && <div className="err">{err}</div>}
      <div className="card row" style={{ marginBottom: 16 }}>
        <input placeholder="Full name" value={f.full_name} onChange={e => setF({ ...f, full_name: e.target.value })} />
        <input type="email" placeholder="Email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} />
        <input type="password" placeholder="Password (6+)" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} />
        <select value={f.role} onChange={e => setF({ ...f, role: e.target.value })}>{['cashier', 'technician', 'manager', 'owner'].map(r => <option key={r}>{r}</option>)}</select>
        <button className="btn pri" onClick={add}>Add staff</button>
      </div>
      <div className="card scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th /></tr></thead>
        <tbody>{rows.map(u => <tr key={u.id}><td><b>{u.full_name}</b></td><td>{u.email}</td>
          <td><select value={u.role} onChange={e => upd(u, { role: e.target.value })}>{['cashier', 'technician', 'manager', 'owner'].map(r => <option key={r}>{r}</option>)}</select></td>
          <td><span className={'tag ' + (u.is_active ? 'ok' : 'bad')}>{u.is_active ? 'active' : 'locked'}</span></td>
          <td className="n"><button className="btn sm" onClick={() => { const p = prompt('New password for ' + u.full_name); if (p) upd(u, { password: p }); }}>Reset password</button> <button className="btn sm" onClick={() => upd(u, { is_active: !u.is_active })}>{u.is_active ? 'Lock' : 'Unlock'}</button></td></tr>)}</tbody></table></div>
    </div>
  );
}
