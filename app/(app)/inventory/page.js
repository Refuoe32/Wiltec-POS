'use client';
import { useEffect, useState } from 'react';
import { api, money } from '@/lib/client';
const blank = { kind: 'product', sku: '', barcode: '', name: '', category_id: '', cost_price: '', sell_price: '', stock_qty: '', reorder_level: 2, has_serial: false, warranty_days: 0, vat_applies: true, is_active: true };
export default function Inventory() {
  const [rows, setRows] = useState([]), [cats, setCats] = useState([]), [q, setQ] = useState(''), [f, setF] = useState(null), [adj, setAdj] = useState(null), [err, setErr] = useState(''), [me, setMe] = useState({});
  const mgr = ['owner', 'manager'].includes(me.role);
  const load = () => api('/api/items?all=1&q=' + encodeURIComponent(q)).then(setRows).catch(e => setErr(e.message));
  useEffect(() => { api('/api/me').then(setMe); api('/api/categories').then(setCats); }, []);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [q]);
  async function save() {
    setErr('');
    try { f.id ? await api('/api/items', f, 'PUT') : await api('/api/items', f); setF(null); load(); } catch (e) { setErr(e.message); }
  }
  async function doAdj() {
    setErr('');
    try { await api('/api/stock', adj); setAdj(null); load(); } catch (e) { setErr(e.message); }
  }
  async function newCat() { const name = prompt('New category name'); if (name) { await api('/api/categories', { name }); setCats(await api('/api/categories')); } }
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  return (
    <div>
      <div className="row"><h1 className="sp">Inventory</h1>{mgr && <button className="btn pri" onClick={() => { setErr(''); setF({ ...blank }); }}>Add item</button>}</div>
      <input style={{ width: '100%', maxWidth: 420, marginBottom: 12 }} placeholder="Search…" value={q} onChange={e => setQ(e.target.value)} />
      {err && !f && !adj && <div className="err">{err}</div>}
      <div className="card scroll"><table>
        <thead><tr><th>Item</th><th>SKU</th><th>Category</th>{mgr && <th className="n">Cost</th>}<th className="n">Price</th><th className="n">Stock</th><th /></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.id} style={{ opacity: r.is_active ? 1 : .5 }}>
            <td><b>{r.name}</b> {r.kind === 'service' && <span className="tag">service</span>}{!r.is_active && <span className="tag bad">hidden</span>}</td>
            <td>{r.sku}</td><td>{r.category}</td>{mgr && <td className="n">{money(r.cost_price)}</td>}<td className="n">{money(r.sell_price)}</td>
            <td className="n">{r.track_stock ? <span className={'tag ' + (r.stock_qty <= 0 ? 'bad' : r.stock_qty <= r.reorder_level ? 'warn' : '')}>{r.stock_qty}</span> : '—'}</td>
            <td className="n">{mgr && <>{r.track_stock && <button className="btn sm" onClick={() => { setErr(''); setAdj({ item_id: r.id, name: r.name, qty_change: '', type: 'adjustment', note: '' }); }}>Adjust stock</button>} <button className="btn sm" onClick={() => { setErr(''); setF({ ...r }); }}>Edit</button></>}</td>
          </tr>))}</tbody>
      </table>{!rows.length && <p className="muted">No items yet.</p>}</div>

      {f && <div className="modal"><div className="card">
        <h2>{f.id ? 'Edit item' : 'New item'}</h2>{err && <div className="err">{err}</div>}
        <div className="grid g2">
          {!f.id && <div className="f"><label>Type</label><select value={f.kind} onChange={e => set('kind', e.target.value)}><option value="product">Product (tracks stock)</option><option value="service">Service</option></select></div>}
          <div className="f"><label>Name</label><input value={f.name} onChange={e => set('name', e.target.value)} /></div>
          <div className="f"><label>SKU</label><input value={f.sku} onChange={e => set('sku', e.target.value)} /></div>
          <div className="f"><label>Barcode</label><input value={f.barcode || ''} onChange={e => set('barcode', e.target.value)} /></div>
          <div className="f"><label>Category <a href="#" onClick={e => { e.preventDefault(); newCat(); }}>+ new</a></label><select value={f.category_id || ''} onChange={e => set('category_id', e.target.value)}><option value="">—</option>{cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div className="f"><label>Cost price (M)</label><input type="number" step="0.01" value={f.cost_price} onChange={e => set('cost_price', e.target.value)} /></div>
          <div className="f"><label>Selling price (M, VAT included)</label><input type="number" step="0.01" value={f.sell_price} onChange={e => set('sell_price', e.target.value)} /></div>
          {!f.id && f.kind === 'product' && <div className="f"><label>Opening stock</label><input type="number" value={f.stock_qty} onChange={e => set('stock_qty', e.target.value)} /></div>}
          <div className="f"><label>Low-stock alert at</label><input type="number" value={f.reorder_level} onChange={e => set('reorder_level', e.target.value)} /></div>
          <div className="f"><label>Warranty (days)</label><input type="number" value={f.warranty_days} onChange={e => set('warranty_days', e.target.value)} /></div>
        </div>
        <div className="row" style={{ margin: '12px 0' }}>
          <label><input type="checkbox" checked={f.has_serial} onChange={e => set('has_serial', e.target.checked)} /> Record serial number when sold</label>
          <label><input type="checkbox" checked={f.vat_applies} onChange={e => set('vat_applies', e.target.checked)} /> VAT applies</label>
          {f.id && <label><input type="checkbox" checked={f.is_active} onChange={e => set('is_active', e.target.checked)} /> Active</label>}
        </div>
        <div className="row"><button className="btn pri sp" onClick={save}>Save item</button><button className="btn" onClick={() => setF(null)}>Cancel</button></div>
      </div></div>}

      {adj && <div className="modal"><div className="card">
        <h2>Adjust stock · {adj.name}</h2>{err && <div className="err">{err}</div>}
        <div className="grid g2">
          <div className="f"><label>Change (+ add, − remove)</label><input type="number" value={adj.qty_change} onChange={e => setAdj({ ...adj, qty_change: e.target.value })} /></div>
          <div className="f"><label>Reason</label><select value={adj.type} onChange={e => setAdj({ ...adj, type: e.target.value })}><option value="adjustment">Stock-take correction</option><option value="damage">Damaged / lost</option></select></div>
        </div>
        <div className="f" style={{ margin: '10px 0' }}><label>Note</label><input value={adj.note} onChange={e => setAdj({ ...adj, note: e.target.value })} /></div>
        <div className="row"><button className="btn pri sp" onClick={doAdj}>Save adjustment</button><button className="btn" onClick={() => setAdj(null)}>Cancel</button></div>
      </div></div>}
    </div>
  );
}
