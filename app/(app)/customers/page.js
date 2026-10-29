'use client';
import { useEffect, useState } from 'react';
import { api, money, dt, mlabel } from '@/lib/client';
export default function Customers() {
  const [rows, setRows] = useState([]), [q, setQ] = useState(''), [f, setF] = useState(null), [sel, setSel] = useState(null), [hist, setHist] = useState(null), [err, setErr] = useState('');
  const load = () => api('/api/customers?q=' + encodeURIComponent(q)).then(setRows).catch(e => setErr(e.message));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]);
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  async function save() { setErr(''); try { f.id ? await api('/api/customers', f, 'PUT') : await api('/api/customers', f); setF(null); load(); } catch (e) { setErr(e.message); } }
  async function open(c) { setSel(c); setErr(''); setHist(await api('/api/customers/' + c.id)); }
  async function payAcc() {
    const amount = prompt(`${sel.name} owes ${money(sel.balance_owing)}. Amount paid (cash)?`); if (!amount) return;
    try { await api('/api/customers/' + sel.id, { amount, method: 'cash' }); setSel(null); load(); } catch (e) { alert(e.message); }
  }
  return (
    <div>
      <div className="row"><h1 className="sp">Customers</h1><button className="btn pri" onClick={() => { setErr(''); setF({ name: '', phone: '', email: '', address: '', is_business: false, credit_limit: 0, notes: '' }); }}>Add customer</button></div>
      <input style={{ width: '100%', maxWidth: 420, marginBottom: 12 }} placeholder="Search name or phone…" value={q} onChange={e => setQ(e.target.value)} />
      {err && !f && <div className="err">{err}</div>}
      <div className="card scroll"><table>
        <thead><tr><th>Name</th><th>Phone</th><th>Type</th><th className="n">Owes</th></tr></thead>
        <tbody>{rows.map(c => <tr key={c.id} className="click" onClick={() => open(c)}><td><b>{c.name}</b></td><td>{c.phone}</td><td>{c.is_business ? 'Business' : 'Individual'}</td>
          <td className="n">{Number(c.balance_owing) > 0 ? <span className="tag warn">{money(c.balance_owing)}</span> : '—'}</td></tr>)}</tbody>
      </table>{!rows.length && <p className="muted">No customers yet.</p>}</div>

      {sel && hist && <div className="modal wide"><div className="card">
        <div className="row"><h2 className="sp">{sel.name}</h2><button className="btn" onClick={() => { setErr(''); setF({ ...sel }); setSel(null); }}>Edit</button>{Number(sel.balance_owing) > 0 && <button className="btn pri" onClick={payAcc}>Take account payment</button>}<button className="btn" onClick={() => setSel(null)}>Close</button></div>
        <p className="muted">{sel.phone} {sel.email} · Credit limit {money(sel.credit_limit)} · Owes {money(sel.balance_owing)}</p>
        <div className="grid g2"><div><h2>Recent sales</h2>{hist.sales.map(s => <div key={s.id}><a href={'/receipt/' + s.id} target="_blank">{s.sale_no}</a> · {money(s.total)} · <span className="muted">{dt(s.created_at)}</span></div>)}{!hist.sales.length && <p className="muted">None</p>}</div>
          <div><h2>Repairs</h2>{hist.repairs.map(r => <div key={r.id}>{r.job_no} · {r.device_type} {r.brand_model} · <span className="tag">{r.status}</span></div>)}{!hist.repairs.length && <p className="muted">None</p>}</div></div>
      </div></div>}

      {f && <div className="modal"><div className="card"><h2>{f.id ? 'Edit customer' : 'New customer'}</h2>{err && <div className="err">{err}</div>}
        <div className="grid g2">
          <div className="f"><label>Name</label><input value={f.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="f"><label>Phone (with country code, e.g. 26658…)</label><input value={f.phone || ''} onChange={e => set('phone', e.target.value)} /></div>
          <div className="f"><label>Email</label><input value={f.email || ''} onChange={e => set('email', e.target.value)} /></div>
          <div className="f"><label>Address</label><input value={f.address || ''} onChange={e => set('address', e.target.value)} /></div>
          <div className="f"><label>Credit limit (M)</label><input type="number" value={f.credit_limit} onChange={e => set('credit_limit', e.target.value)} /></div>
          <label style={{ alignSelf: 'end' }}><input type="checkbox" checked={f.is_business} onChange={e => set('is_business', e.target.checked)} /> Business / organisation</label>
        </div>
        <div className="row" style={{ marginTop: 14 }}><button className="btn pri sp" onClick={save}>Save customer</button><button className="btn" onClick={() => setF(null)}>Cancel</button></div>
      </div></div>}
    </div>
  );
}
