'use client';
import { useEffect, useState } from 'react';
import { api, money, dt, METHODS } from '@/lib/client';
const STATUSES = ['received', 'diagnosing', 'quoted', 'approved', 'waiting_parts', 'in_repair', 'ready', 'collected', 'cancelled', 'unrepairable'];
const label = s => s.replace('_', ' ');
export default function Repairs() {
  const [rows, setRows] = useState([]), [st, setSt] = useState(''), [q, setQ] = useState(''), [custs, setCusts] = useState([]), [techs, setTechs] = useState([]), [items, setItems] = useState([]);
  const [f, setF] = useState(null), [d, setD] = useState(null), [err, setErr] = useState(''), [method, setMethod] = useState('cash');
  const load = () => api(`/api/repairs?status=${st}&q=${encodeURIComponent(q)}`).then(setRows).catch(e => setErr(e.message));
  useEffect(() => { api('/api/customers').then(setCusts); api('/api/users').then(u => setTechs(u.filter(x => x.is_active))); api('/api/items?q=').then(setItems); }, []);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [st, q]);
  const open = async id => { setErr(''); setD(await api('/api/repairs/' + id)); };
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  async function create() { setErr(''); try { await api('/api/repairs', f); setF(null); load(); } catch (e) { setErr(e.message); } }
  async function patch(body) { setErr(''); try { await api('/api/repairs/' + d.job.id, body, 'PATCH'); await open(d.job.id); load(); } catch (e) { setErr(e.message); } }
  async function post(body) { setErr(''); try { const r = await api('/api/repairs/' + d.job.id, body); await open(d.job.id); load(); return r; } catch (e) { setErr(e.message); } }
  async function addPart() { const id = prompt('Part SKU or name (exact SKU)?'); if (!id) return; const it = items.find(i => i.sku.toLowerCase() === id.toLowerCase() || i.name.toLowerCase() === id.toLowerCase()); if (!it) return alert('Part not found'); const qty = prompt('Quantity?', '1'); if (qty) post({ action: 'part', item_id: it.id, qty }); }
  async function bill() { if (!confirm('Bill this job and mark it collected?')) return; const r = await post({ action: 'bill', method }); if (r) window.open('/receipt/' + r.id, '_blank'); }
  const wa = j => `https://wa.me/${(j.customer_phone || '').replace(/\D/g, '')}?text=${encodeURIComponent(`Hello ${j.customer}, your ${j.brand_model || j.device_type} (job ${j.job_no}) is ready for collection at WilTec Solutions.${j.quote_amount ? ' Balance: ' + money(j.quote_amount - j.deposit_paid) + '.' : ''}`)}`;
  const j = d?.job;
  return (
    <div>
      <div className="row"><h1 className="sp">Repair jobs</h1><button className="btn pri" onClick={() => { setErr(''); setF({ customer_id: '', device_type: 'Laptop', brand_model: '', serial_no: '', accessories: '', password_pin: '', fault_reported: '', quote_amount: '', deposit_paid: '', technician_id: '', promised_date: '' }); }}>New job</button></div>
      <div className="row" style={{ marginBottom: 12 }}>
        <input placeholder="Search job, customer, device…" value={q} onChange={e => setQ(e.target.value)} style={{ width: 300 }} />
        <select value={st} onChange={e => setSt(e.target.value)}><option value="">Open jobs</option>{STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}</select>
      </div>
      {err && !f && !d && <div className="err">{err}</div>}
      <div className="card scroll"><table>
        <thead><tr><th>Job</th><th>Customer</th><th>Device</th><th>Fault</th><th>Status</th><th>Promised</th><th className="n">Quote</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id} className="click" onClick={() => open(r.id)}><td><b>{r.job_no}</b></td><td>{r.customer}</td><td>{r.device_type} {r.brand_model}</td><td>{r.fault_reported.slice(0, 40)}</td>
          <td><span className={'tag ' + (r.status === 'ready' ? 'ok' : r.status === 'waiting_parts' ? 'warn' : '')}>{label(r.status)}</span></td><td>{r.promised_date?.slice(0, 10)}</td><td className="n">{r.quote_amount ? money(r.quote_amount) : '—'}</td></tr>)}</tbody>
      </table>{!rows.length && <p className="muted">No jobs.</p>}</div>

      {f && <div className="modal wide"><div className="card"><h2>New repair job</h2>{err && <div className="err">{err}</div>}
        <div className="grid g2">
          <div className="f"><label>Customer (add new ones under Customers)</label><select value={f.customer_id} onChange={e => set('customer_id', e.target.value)}><option value="">Choose…</option>{custs.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone}</option>)}</select></div>
          <div className="f"><label>Device type</label><select value={f.device_type} onChange={e => set('device_type', e.target.value)}>{['Laptop', 'Desktop', 'Phone', 'Tablet', 'Printer', 'Network device', 'Other'].map(x => <option key={x}>{x}</option>)}</select></div>
          <div className="f"><label>Brand / model</label><input value={f.brand_model} onChange={e => set('brand_model', e.target.value)} /></div>
          <div className="f"><label>Serial number</label><input value={f.serial_no} onChange={e => set('serial_no', e.target.value)} /></div>
          <div className="f"><label>Accessories left with us</label><input value={f.accessories} onChange={e => set('accessories', e.target.value)} placeholder="charger, bag…" /></div>
          <div className="f"><label>Device password / PIN</label><input value={f.password_pin} onChange={e => set('password_pin', e.target.value)} /></div>
          <div className="f" style={{ gridColumn: '1/-1' }}><label>Fault reported</label><textarea rows="2" value={f.fault_reported} onChange={e => set('fault_reported', e.target.value)} /></div>
          <div className="f"><label>Estimated price (M)</label><input type="number" value={f.quote_amount} onChange={e => set('quote_amount', e.target.value)} /></div>
          <div className="f"><label>Deposit taken now (cash, M)</label><input type="number" value={f.deposit_paid} onChange={e => set('deposit_paid', e.target.value)} /></div>
          <div className="f"><label>Technician</label><select value={f.technician_id} onChange={e => set('technician_id', e.target.value)}><option value="">Unassigned</option>{techs.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}</select></div>
          <div className="f"><label>Promised date</label><input type="date" value={f.promised_date} onChange={e => set('promised_date', e.target.value)} /></div>
        </div>
        <div className="row" style={{ marginTop: 14 }}><button className="btn pri sp" onClick={create}>Create job</button><button className="btn" onClick={() => setF(null)}>Cancel</button></div>
      </div></div>}

      {j && <div className="modal wide"><div className="card">
        <div className="row"><h2 className="sp">{j.job_no} · {j.customer}</h2><span className="tag">{label(j.status)}</span><button className="btn" onClick={() => setD(null)}>Close</button></div>
        {err && <div className="err">{err}</div>}
        <p className="muted">{j.device_type} {j.brand_model} {j.serial_no && '· S/N ' + j.serial_no} · received {dt(j.received_at)}<br />Fault: {j.fault_reported}{j.accessories && <><br />Accessories: {j.accessories}</>}{j.password_pin && <><br />Password/PIN: {j.password_pin}</>}</p>
        <div className="grid g2">
          <div className="f"><label>Status</label><select value={j.status} onChange={e => patch({ status: e.target.value })}>{STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></div>
          <div className="f"><label>Final price to charge (M) · deposit paid {money(j.deposit_paid)}</label><input type="number" defaultValue={j.quote_amount || ''} onBlur={e => e.target.value && patch({ quote_amount: e.target.value })} /></div>
          <div className="f"><label>Diagnosis</label><textarea rows="2" defaultValue={j.diagnosis || ''} onBlur={e => patch({ diagnosis: e.target.value })} /></div>
          <div className="f"><label>Work done</label><textarea rows="2" defaultValue={j.work_done || ''} onBlur={e => patch({ work_done: e.target.value })} /></div>
        </div>
        <div className="row" style={{ margin: '12px 0' }}><h2 style={{ margin: 0 }}>Parts used</h2><button className="btn sm" onClick={addPart}>Add part from stock</button></div>
        {d.parts.map(p => <div key={p.id}>{p.qty} × {p.name}</div>)}{!d.parts.length && <span className="muted">None</span>}
        <div className="row" style={{ marginTop: 16 }}>
          {j.status === 'ready' && j.customer_phone && <a className="btn" href={wa(j)} target="_blank">WhatsApp: ready for collection</a>}
          <span className="sp" />
          {!['collected', 'cancelled'].includes(j.status) && <><select value={method} onChange={e => setMethod(e.target.value)}>{METHODS.map(m => <option key={m[0]} value={m[0]}>{m[1]}</option>)}</select><button className="btn pri" onClick={bill}>Bill & hand over</button></>}
        </div>
        <h2 style={{ marginTop: 16 }}>History</h2>{d.log.map(l => <div key={l.id} className="muted">{dt(l.created_at)} · {label(l.status)} · {l.full_name} {l.note}</div>)}
      </div></div>}
    </div>
  );
}
