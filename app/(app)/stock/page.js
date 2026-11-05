'use client';
import { useEffect, useRef, useState } from 'react';
import { api, money, dt } from '@/lib/client';
const WHY = ['Old / obsolete stock', 'Damaged', 'Expired', 'Lost or stolen', 'Returned to supplier', 'Clearance finished', 'Stock-take correction'];
const TYPES = { purchase: 'Stock in', sale: 'Sale', refund: 'Refund', adjustment: 'Adjustment', damage: 'Damaged', repair_use: 'Repair use', stocktake: 'Stock-take', writeoff: 'Cleared / written off' };
export default function Stock() {
  const [tab, setTab] = useState('in'), [me, setMe] = useState({}), [msg, setMsg] = useState(''), [err, setErr] = useState('');
  useEffect(() => { api('/api/me').then(setMe); }, []);
  const tabs = [['in', 'Add new stock'], ['clear', 'Clear old stock'], ['moves', 'Stock history'], ...(me.role === 'owner' ? [['fresh', 'Start fresh']] : [])];
  return (
    <div>
      <h1>Inventory (stock control)</h1>
      <div className="row" style={{ marginBottom: 14 }}>{tabs.map(([k, l]) => <button key={k} className={'btn' + (tab === k ? ' pri' : '')} onClick={() => { setTab(k); setMsg(''); setErr(''); }}>{l}</button>)}</div>
      {msg && <div className="okmsg">{msg}</div>}{err && <div className="err">{err}</div>}
      {tab === 'in' && <AddStock done={setMsg} fail={setErr} />}
      {tab === 'clear' && <ClearStock done={setMsg} fail={setErr} />}
      {tab === 'moves' && <History />}
      {tab === 'fresh' && <Fresh done={setMsg} fail={setErr} />}
    </div>
  );
}
function AddStock({ done, fail }) {
  const [items, setItems] = useState([]), [sup, setSup] = useState([]), [lines, setLines] = useState([]), [code, setCode] = useState(''), [supplier, setSupplier] = useState(''), [ref, setRef] = useState(''), [note, setNote] = useState(''), [upd, setUpd] = useState(true);
  const box = useRef(null);
  useEffect(() => { api('/api/items?all=1&q=').then(r => setItems(r.filter(i => i.track_stock && i.is_active))); api('/api/suppliers').then(setSup); }, []);
  function addItem(it) {
    setLines(l => { const i = l.findIndex(x => x.item_id === it.id); if (i >= 0) return l.map((x, k) => k === i ? { ...x, qty: Number(x.qty) + 1 } : x); return [...l, { item_id: it.id, name: it.name, sku: it.sku, qty: 1, unit_cost: it.cost_price }]; });
  }
  function submitCode() {            // a barcode scanner types the code and presses Enter
    const c = code.trim().toLowerCase(); if (!c) return;
    const m = items.find(i => (i.barcode || '').toLowerCase() === c || i.sku.toLowerCase() === c) || (items.filter(i => i.name.toLowerCase().includes(c)).length === 1 ? items.find(i => i.name.toLowerCase().includes(c)) : null);
    if (m) { addItem(m); fail(''); } else fail(`No product found for "${code}". Add it under Inventory first.`);
    setCode(''); box.current?.focus();
  }
  const set = (i, k, v) => setLines(l => l.map((x, n) => n === i ? { ...x, [k]: v } : x));
  const total = lines.reduce((a, l) => a + Number(l.qty || 0) * Number(l.unit_cost || 0), 0);
  async function save() {
    fail(''); done('');
    try { const r = await api('/api/stock/in', { supplier_id: supplier || null, reference: ref, note, update_cost: upd, items: lines }); done(`${r.units} units added to stock (${money(r.value)} at cost)${r.po_no ? ' · ' + r.po_no : ''}.`); setLines([]); setRef(''); setNote(''); api('/api/items?all=1&q=').then(x => setItems(x.filter(i => i.track_stock && i.is_active))); }
    catch (e) { fail(e.message); }
  }
  return (
    <div className="card">
      <h2>Receive new stock</h2>
      <p className="muted" style={{ marginTop: 0 }}>Scan each product (or type its name or SKU) and press Enter. Scanning the same product again adds one more unit.</p>
      <div className="row" style={{ marginBottom: 12 }}>
        <input ref={box} style={{ flex: 1, minWidth: 240 }} placeholder="Scan barcode or type name / SKU, then Enter" value={code} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitCode()} autoFocus />
        <select value="" onChange={e => { const it = items.find(i => i.id === e.target.value); if (it) addItem(it); }}><option value="">Or pick from the list…</option>{items.map(i => <option key={i.id} value={i.id}>{i.name} ({i.stock_qty} in stock)</option>)}</select>
      </div>
      {lines.length > 0 && <table style={{ marginBottom: 12 }}><thead><tr><th>Item</th><th className="n">Quantity</th><th className="n">Cost each (M)</th><th className="n">Line cost</th><th /></tr></thead>
        <tbody>{lines.map((l, i) => <tr key={l.item_id}><td><b>{l.name}</b> <span className="muted">{l.sku}</span></td>
          <td className="n"><input type="number" min="1" style={{ width: 80 }} value={l.qty} onChange={e => set(i, 'qty', e.target.value)} /></td>
          <td className="n"><input type="number" step="0.01" min="0" style={{ width: 100 }} value={l.unit_cost} onChange={e => set(i, 'unit_cost', e.target.value)} /></td>
          <td className="n">{money(Number(l.qty || 0) * Number(l.unit_cost || 0))}</td><td className="n"><button className="btn sm bad" onClick={() => setLines(x => x.filter((_, n) => n !== i))}>Remove</button></td></tr>)}</tbody></table>}
      <div className="grid g3">
        <div className="f"><label>Supplier (optional)</label><select value={supplier} onChange={e => setSupplier(e.target.value)}><option value="">No supplier</option>{sup.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="f"><label>Invoice / delivery note no.</label><input value={ref} onChange={e => setRef(e.target.value)} /></div>
        <div className="f"><label>Note</label><input value={note} onChange={e => setNote(e.target.value)} /></div>
      </div>
      <div className="row" style={{ marginTop: 12 }}><label style={{ margin: 0 }}><input type="checkbox" checked={upd} onChange={e => setUpd(e.target.checked)} /> Update each item's cost price to the cost above</label><span className="sp" />
        <b>Total {money(total)}</b><button className="btn pri" disabled={!lines.length} onClick={save}>Add to stock</button></div>
    </div>
  );
}
function ClearStock({ done, fail }) {
  const [rows, setRows] = useState([]), [view, setView] = useState('old'), [days, setDays] = useState(90), [q, setQ] = useState(''), [sel, setSel] = useState({}), [why, setWhy] = useState(WHY[0]), [note, setNote] = useState('');
  const load = () => api(`/api/stock/list?view=${view}&days=${days}&q=${encodeURIComponent(q)}`).then(r => { setRows(r); setSel({}); }).catch(e => fail(e.message));
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [view, days, q]);
  const chosen = rows.filter(r => sel[r.id]), units = chosen.reduce((a, r) => a + r.stock_qty, 0), value = chosen.reduce((a, r) => a + r.stock_qty * r.cost_price, 0);
  async function clear() {
    if (!confirm(`Clear ${units} units of ${chosen.length} item(s), worth ${money(value)} at cost?\n\nReason: ${why}\n\nThis cannot be undone (it is recorded in the stock history).`)) return;
    fail(''); done('');
    try { const r = await api('/api/stock/writeoff', { items: chosen.map(c => ({ item_id: c.id })), reason: why, note }); done(`Cleared ${r.units} units of ${r.items} item(s), ${money(r.value)} at cost, recorded as "${why}".`); load(); } catch (e) { fail(e.message); }
  }
  return (
    <div className="card scroll">
      <h2>Clear old stock</h2>
      <p className="muted" style={{ marginTop: 0 }}>Find stock that has not sold for a long time, tick it, and clear it from the system. Cleared stock goes to zero and is recorded with the reason and its value at cost.</p>
      <div className="row" style={{ marginBottom: 12 }}>
        <select value={view} onChange={e => setView(e.target.value)}><option value="old">Old stock (no sale or delivery)</option><option value="out">Out of stock</option><option value="low">Low stock</option><option value="all">All stock</option></select>
        {view === 'old' && <><span className="muted">for</span><input type="number" min="1" style={{ width: 80 }} value={days} onChange={e => setDays(e.target.value)} /><span className="muted">days or more</span></>}
        <input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <table><thead><tr><th><input type="checkbox" checked={rows.length > 0 && rows.every(r => sel[r.id] || r.stock_qty <= 0)} onChange={e => setSel(e.target.checked ? Object.fromEntries(rows.filter(r => r.stock_qty > 0).map(r => [r.id, true])) : {})} /></th><th>Item</th><th className="n">In stock</th><th className="n">Cost</th><th className="n">Value</th><th>Last sold</th><th className="n">Idle days</th></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id}><td><input type="checkbox" disabled={r.stock_qty <= 0} checked={!!sel[r.id]} onChange={e => setSel({ ...sel, [r.id]: e.target.checked })} /></td><td><b>{r.name}</b> <span className="muted">{r.sku}</span></td>
          <td className="n">{r.stock_qty}</td><td className="n">{money(r.cost_price)}</td><td className="n">{money(r.stock_qty * r.cost_price)}</td><td>{r.last_sold ? dt(r.last_sold) : <span className="muted">never</span>}</td><td className="n">{r.idle_days > 100000 ? '-' : r.idle_days}</td></tr>)}</tbody></table>
      {!rows.length && <p className="muted">Nothing matches.</p>}
      {chosen.length > 0 && <div className="row" style={{ marginTop: 14, padding: 12, background: '#fff6ee', borderRadius: 10 }}>
        <b>{chosen.length} selected · {units} units · {money(value)} at cost</b><span className="sp" />
        <select value={why} onChange={e => setWhy(e.target.value)}>{WHY.map(w => <option key={w}>{w}</option>)}</select><input placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} />
        <button className="btn bad" onClick={clear}>Clear selected stock</button></div>}
    </div>
  );
}
function History() {
  const [rows, setRows] = useState([]), [type, setType] = useState('');
  useEffect(() => { api('/api/stock/history?type=' + type).then(setRows); }, [type]);
  return (
    <div className="card scroll"><div className="row"><h2 className="sp">Stock history</h2><select value={type} onChange={e => setType(e.target.value)}><option value="">All movements</option>{Object.entries(TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
      <table><thead><tr><th>When</th><th>Item</th><th>Type</th><th className="n">Change</th><th className="n">Cost</th><th>Reference / note</th><th>By</th></tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}><td>{dt(r.created_at)}</td><td>{r.name} <span className="muted">{r.sku}</span></td><td>{TYPES[r.type] || r.type}</td><td className="n" style={{ color: r.qty_change < 0 ? 'var(--bad)' : 'var(--green2)' }}>{r.qty_change > 0 ? '+' : ''}{r.qty_change}</td><td className="n">{r.unit_cost != null ? money(r.unit_cost) : ''}</td><td>{[r.reference, r.note].filter(Boolean).join(' · ')}</td><td>{r.by_user}</td></tr>)}</tbody></table>
      {!rows.length && <p className="muted">No stock movements yet.</p>}</div>
  );
}
function Fresh({ done, fail }) {
  const [o, setO] = useState({ transactions: false, zeroStock: false, products: false, customers: false, confirm: '', password: '' });
  async function go() {
    fail(''); done('');
    if (!confirm('Last warning: this permanently deletes data. Continue?')) return;
    try { await api('/api/admin/reset', o); done('Done. The selected data has been cleared.'); setO({ ...o, confirm: '', password: '' }); } catch (e) { fail(e.message); }
  }
  const c = (k, l, sub) => <label style={{ display: 'block', margin: '8px 0', fontSize: '.95rem', color: 'var(--ink)' }}><input type="checkbox" checked={o[k]} onChange={e => setO({ ...o, [k]: e.target.checked })} /> <b>{l}</b><div className="muted" style={{ marginLeft: 22, fontSize: '.82rem' }}>{sub}</div></label>;
  return (
    <div className="card" style={{ maxWidth: 640, borderColor: '#efc3bf' }}>
      <h2 style={{ color: 'var(--bad)' }}>Start fresh (owner only)</h2>
      <p className="muted" style={{ marginTop: 0 }}>Use this before you go live, to remove test sales and old stock. Staff accounts, settings and the audit log are always kept. <b>This cannot be undone.</b></p>
      {c('zeroStock', 'Set all stock quantities to zero', 'Keeps your products and prices; just empties the shelves in the system.')}
      {c('transactions', 'Delete all sales, repairs, tills, expenses, purchases and stock history', 'Receipt numbers start again from WT-1000.')}
      {c('products', 'Also delete all products, categories and suppliers', 'Removes the whole product list (this also clears the history above).')}
      {c('customers', 'Also delete all customers', 'Only works together with the history option.')}
      <div className="grid g2" style={{ marginTop: 10 }}>
        <div className="f"><label>Type RESET to confirm</label><input value={o.confirm} onChange={e => setO({ ...o, confirm: e.target.value })} /></div>
        <div className="f"><label>Your password</label><input type="password" value={o.password} onChange={e => setO({ ...o, password: e.target.value })} /></div>
      </div>
      <button className="btn bad" style={{ marginTop: 14 }} onClick={go} disabled={o.confirm !== 'RESET' || !o.password}>Clear selected data</button>
    </div>
  );
}
