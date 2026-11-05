'use client';
import { useEffect, useState } from 'react';
import { api, money } from '@/lib/client';
const blank = { name: '', contact: '', phone: '', email: '', address: '', notes: '' };
export default function Suppliers() {
  const [rows, setRows] = useState([]), [f, setF] = useState(null), [err, setErr] = useState('');
  const load = () => api('/api/suppliers').then(setRows).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  async function save() { setErr(''); try { f.id ? await api('/api/suppliers', f, 'PUT') : await api('/api/suppliers', f); setF(null); load(); } catch (e) { setErr(e.message); } }
  async function del(r) { if (!confirm(`Delete supplier "${r.name}"?`)) return; setErr(''); try { await api('/api/suppliers?id=' + r.id, null, 'DELETE'); load(); } catch (e) { setErr(e.message); } }
  return (
    <div>
      <div className="row"><h1 className="sp">Suppliers</h1><button className="btn pri" onClick={() => { setErr(''); setF({ ...blank }); }}>Add supplier</button></div>
      {err && !f && <div className="err">{err}</div>}
      <div className="scroll"><table><thead><tr><th>Supplier</th><th>Contact</th><th>Phone</th><th>Email</th><th className="n">Products</th><th className="n">Bought so far</th><th /></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id}><td><b>{r.name}</b></td><td>{r.contact}</td><td>{r.phone}</td><td>{r.email}</td><td className="n">{r.items}</td><td className="n">{money(r.purchased)}</td>
          <td className="n"><button className="btn sm" onClick={() => { setErr(''); setF({ ...r }); }}>Edit</button> <button className="btn sm bad" onClick={() => del(r)}>Delete</button></td></tr>)}</tbody></table>
        {!rows.length && <p className="muted">No suppliers yet.</p>}</div>
      {f && <div className="modal"><div className="card"><h2>{f.id ? 'Edit supplier' : 'New supplier'}</h2>{err && <div className="err">{err}</div>}
        <div className="grid g2">
          <div className="f"><label>Supplier name</label><input value={f.name} onChange={e => set('name', e.target.value)} autoFocus /></div>
          <div className="f"><label>Contact person</label><input value={f.contact || ''} onChange={e => set('contact', e.target.value)} /></div>
          <div className="f"><label>Phone</label><input value={f.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
          <div className="f"><label>Email</label><input type="email" value={f.email || ''} onChange={e => set('email', e.target.value)} /></div>
          <div className="f" style={{ gridColumn: '1/-1' }}><label>Address</label><input value={f.address || ''} onChange={e => set('address', e.target.value)} /></div>
          <div className="f" style={{ gridColumn: '1/-1' }}><label>Notes</label><textarea rows="2" value={f.notes || ''} onChange={e => set('notes', e.target.value)} /></div>
        </div>
        <div className="row" style={{ marginTop: 14 }}><button className="btn pri sp" onClick={save}>Save supplier</button><button className="btn" onClick={() => setF(null)}>Cancel</button></div>
      </div></div>}
    </div>
  );
}
