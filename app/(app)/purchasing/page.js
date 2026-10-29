'use client';
import { useEffect, useState } from 'react';
import { api, money, dt } from '@/lib/client';
export default function Purchasing() {
  const [sup, setSup] = useState([]), [items, setItems] = useState([]), [pos, setPos] = useState([]), [supplier, setSupplier] = useState(''), [lines, setLines] = useState([]), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  const load = () => { api('/api/suppliers').then(setSup); api('/api/purchase').then(setPos); };
  useEffect(() => { load(); api('/api/items?all=1&q=').then(r => setItems(r.filter(i => i.track_stock))); }, []);
  const upd = (i, k, v) => setLines(l => l.map((x, n) => n === i ? { ...x, [k]: v } : x));
  async function addSup() {
    const name = prompt('Supplier name'); if (!name) return;
    await api('/api/suppliers', { name, phone: prompt('Phone (optional)') || null }); load();
  }
  async function receive() {
    setErr(''); setMsg('');
    try { const r = await api('/api/purchase', { supplier_id: supplier, items: lines }); setMsg(`Stock received on ${r.po_no}`); setLines([]); load(); api('/api/items?all=1&q=').then(r => setItems(r.filter(i => i.track_stock))); }
    catch (e) { setErr(e.message); }
  }
  return (
    <div>
      <h1>Purchasing</h1>
      {err && <div className="err">{err}</div>}{msg && <div className="okmsg">{msg}</div>}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Receive stock from a supplier</h2>
        <div className="row" style={{ marginBottom: 10 }}>
          <select value={supplier} onChange={e => setSupplier(e.target.value)}><option value="">Choose supplier…</option>{sup.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
          <button className="btn sm" onClick={addSup}>+ New supplier</button>
          <select value="" onChange={e => { const it = items.find(i => i.id === e.target.value); if (it) setLines(l => [...l, { item_id: it.id, name: it.name, qty: 1, unit_cost: it.cost_price }]); }}>
            <option value="">Add item…</option>{items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.stock_qty} in stock)</option>)}
          </select>
        </div>
        {lines.map((l, i) => <div className="row" key={i} style={{ marginBottom: 6 }}><b className="sp">{l.name}</b>
          <input type="number" min="1" style={{ width: 80 }} value={l.qty} onChange={e => upd(i, 'qty', e.target.value)} title="Quantity" />
          <input type="number" step="0.01" style={{ width: 110 }} value={l.unit_cost} onChange={e => upd(i, 'unit_cost', e.target.value)} title="Unit cost" />
          <button className="btn sm bad" onClick={() => setLines(x => x.filter((_, n) => n !== i))}>×</button></div>)}
        {lines.length > 0 && <div className="row"><b className="sp">Total {money(lines.reduce((a, l) => a + l.qty * l.unit_cost, 0))}</b><button className="btn pri" disabled={!supplier} onClick={receive}>Receive stock</button></div>}
      </div>
      <div className="card scroll"><h2>Recent purchases</h2><table><thead><tr><th>PO</th><th>Supplier</th><th>Date</th><th className="n">Lines</th><th className="n">Total</th></tr></thead>
        <tbody>{pos.map(p => <tr key={p.id}><td>{p.po_no}</td><td>{p.supplier}</td><td>{dt(p.created_at)}</td><td className="n">{p.lines}</td><td className="n">{money(p.total_cost)}</td></tr>)}</tbody></table></div>
    </div>
  );
}
