'use client';
import { useEffect, useState } from 'react';
import { api, money, METHODS } from '@/lib/client';
export default function POS() {
  const [q, setQ] = useState(''), [res, setRes] = useState([]), [cart, setCart] = useState([]);
  const [cust, setCust] = useState(''), [custs, setCusts] = useState([]), [note, setNote] = useState('');
  const [pay, setPay] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(null);
  const loadCusts = () => api('/api/customers').then(setCusts).catch(() => {});
  useEffect(() => { loadCusts(); }, []);
  useEffect(() => {
    const t = setTimeout(() => api('/api/items?q=' + encodeURIComponent(q)).then(setRes).catch(e => setErr(e.message)), 180);
    return () => clearTimeout(t);
  }, [q]);

  function add(it) {
    let serial;
    if (it.has_serial) { serial = prompt('Serial number for ' + it.name); if (!serial) return; }
    setDone(null);
    setCart(c => {
      const i = it.has_serial ? -1 : c.findIndex(l => l.item.id === it.id);
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...c, { item: it, qty: 1, price: Number(it.sell_price), disc: 0, serial }];
    });
  }
  const onKey = e => {            // barcode scanners "type" the code then press Enter
    if (e.key !== 'Enter' || !q) return;
    const m = res.find(r => r.barcode === q || r.sku.toLowerCase() === q.toLowerCase()) || (res.length === 1 ? res[0] : null);
    if (m) { add(m); setQ(''); }
  };
  const upd = (i, k, v) => setCart(c => c.map((l, x) => x === i ? { ...l, [k]: v } : l));
  const total = cart.reduce((a, l) => a + l.qty * l.price - Number(l.disc || 0), 0);

  const paid = pay ? pay.reduce((a, p) => a + Number(p.amount || 0), 0) : 0;
  const change = Math.max(0, +(paid - total).toFixed(2)), due = Math.max(0, +(total - paid).toFixed(2));
  const addPay = m => setPay(p => [...p, { method: m, amount: due || '', reference: '' }]);

  async function complete() {
    setBusy(true); setErr('');
    try {
      let payments = pay.map(p => ({ ...p, amount: Number(p.amount) }));
      if (change > 0) {            // change is handed back from cash
        const ci = payments.findIndex(p => p.method === 'cash' && p.amount >= change);
        if (ci < 0) throw new Error('Overpayment must be taken in cash so change can be given');
        payments[ci].amount = +(payments[ci].amount - change).toFixed(2);
      }
      const r = await api('/api/sales', {
        customer_id: cust || null, note,
        items: cart.map(l => ({ item_id: l.item.id, qty: l.qty, unit_price: l.price, discount: Number(l.disc || 0), serial_no: l.serial })),
        payments,
      });
      setDone({ ...r, change }); setCart([]); setPay(null); setNote(''); setCust('');
      api('/api/items?q=' + encodeURIComponent(q)).then(setRes);
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }

  return (
    <div className="pos">
      <section>
        <h1>Sell</h1>
        <input style={{ width: '100%', fontSize: '1.05rem', padding: 12 }} placeholder="Search name, SKU or scan barcode…" value={q}
          onChange={e => setQ(e.target.value)} onKeyDown={onKey} autoFocus />
        {err && !pay && <div className="err" style={{ marginTop: 10 }}>{err}</div>}
        <div className="tiles">
          {res.map(it => (
            <button key={it.id} className="tile" onClick={() => add(it)} disabled={it.track_stock && it.stock_qty <= 0}>
              <b>{it.name}</b>
              <span className="muted" style={{ fontSize: '.8rem' }}>{it.sku}{it.track_stock ? ` · ${it.stock_qty} in stock` : ' · service'}</span>
              <div className="p">{money(it.sell_price)}</div>
            </button>
          ))}
          {!res.length && <p className="muted">No items match. Add products under Inventory.</p>}
        </div>
      </section>

      <aside className="card cart">
        <h2>Current sale</h2>
        {done && <div className="okmsg">Sale {done.sale_no} completed{done.change > 0 && <> · give change <b>{money(done.change)}</b></>}.{' '}
          <a href={'/receipt/' + done.id} target="_blank">Print receipt</a></div>}
        <div className="f" style={{ marginBottom: 10 }}>
          <label>Customer (optional)</label>
          <select value={cust} onChange={e => setCust(e.target.value)}>
            <option value="">Walk-in customer</option>
            {custs.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ' · ' + c.phone : ''}</option>)}
          </select>
        </div>
        {!cart.length && <p className="muted">Tap an item to add it.</p>}
        {cart.map((l, i) => (
          <div key={i} style={{ borderBottom: '1px solid var(--line)', padding: '8px 0' }}>
            <div className="row"><b className="sp">{l.item.name}</b><button className="btn sm bad" onClick={() => setCart(c => c.filter((_, x) => x !== i))}>Remove</button></div>
            {l.serial && <div className="muted" style={{ fontSize: '.8rem' }}>S/N {l.serial}</div>}
            <div className="row" style={{ marginTop: 6 }}>
              <input type="number" min="1" style={{ width: 62 }} value={l.qty} disabled={!!l.serial} onChange={e => upd(i, 'qty', Math.max(1, parseInt(e.target.value) || 1))} title="Quantity" />
              <span>×</span>
              <input type="number" step="0.01" style={{ width: 90 }} value={l.price} onChange={e => upd(i, 'price', e.target.value)} title="Unit price" />
              <input type="number" step="0.01" min="0" style={{ width: 80 }} placeholder="Disc." value={l.disc || ''} onChange={e => upd(i, 'disc', e.target.value)} title="Discount (M)" />
              <b className="sp n" style={{ textAlign: 'right' }}>{money(l.qty * l.price - Number(l.disc || 0))}</b>
            </div>
          </div>
        ))}
        <div className="f" style={{ margin: '10px 0' }}><input placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} /></div>
        <div className="row"><span className="muted sp">Total (VAT included)</span><span className="total">{money(total)}</span></div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn pri sp" disabled={!cart.length} onClick={() => { setErr(''); setPay([{ method: 'cash', amount: total.toFixed(2), reference: '' }]); }}>Take payment</button>
          <button className="btn" disabled={!cart.length} onClick={() => setCart([])}>Clear</button>
        </div>
      </aside>

      {pay && (
        <div className="modal"><div className="card">
          <h2>Payment · {money(total)}</h2>
          {err && <div className="err">{err}</div>}
          {pay.map((p, i) => (
            <div className="row" key={i} style={{ marginBottom: 8 }}>
              <select value={p.method} onChange={e => setPay(x => x.map((r, k) => k === i ? { ...r, method: e.target.value } : r))}>
                {METHODS.map(m => <option key={m[0]} value={m[0]}>{m[1]}</option>)}
              </select>
              <input type="number" step="0.01" style={{ width: 110 }} value={p.amount} onChange={e => setPay(x => x.map((r, k) => k === i ? { ...r, amount: e.target.value } : r))} />
              {['mpesa', 'ecocash', 'card', 'bank_transfer'].includes(p.method) &&
                <input placeholder="Transaction code" style={{ width: 150 }} value={p.reference} onChange={e => setPay(x => x.map((r, k) => k === i ? { ...r, reference: e.target.value } : r))} />}
              <button className="btn sm bad" onClick={() => setPay(x => x.filter((_, k) => k !== i))}>×</button>
            </div>
          ))}
          <div className="row" style={{ margin: '4px 0 12px' }}>
            {due > 0 && METHODS.slice(0, 4).map(m => <button key={m[0]} className="btn sm" onClick={() => addPay(m[0])}>+ {m[1]} {money(due)}</button>)}
          </div>
          <div className="row"><span>Paid {money(paid)}</span><span className="sp" />
            {due > 0 ? <b style={{ color: 'var(--bad)' }}>Still due {money(due)}</b> : <b style={{ color: 'var(--ok)' }}>Change {money(change)}</b>}</div>
          <div className="row" style={{ marginTop: 16 }}>
            <button className="btn pri sp" disabled={busy || due > 0} onClick={complete}>{busy ? 'Saving…' : 'Complete sale'}</button>
            <button className="btn" onClick={() => setPay(null)}>Back</button>
          </div>
        </div></div>
      )}
    </div>
  );
}
