'use client';
import { useEffect, useRef, useState } from 'react';
import { api, money, METHODS } from '@/lib/client';
import CameraScanner from '@/components/CameraScanner';
let actx;
function beep(ok = true) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination);
    o.frequency.value = ok ? 880 : 200; g.gain.value = 0.08; o.start(); o.stop(actx.currentTime + (ok ? 0.08 : 0.3));
  } catch {}
}
export default function POS() {
  const [q, setQ] = useState(''), [res, setRes] = useState([]), [cart, setCart] = useState([]);
  const [cust, setCust] = useState(''), [custs, setCusts] = useState([]), [note, setNote] = useState('');
  const [pay, setPay] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(null);
  const [cam, setCam] = useState(false), [last, setLast] = useState(''), [me, setMe] = useState({});
  const [sd, setSd] = useState(null), [dm, setDm] = useState(null);   // sd = discount applied to the sale, dm = discount dialog
  const box = useRef(null);
  useEffect(() => { api('/api/customers').then(setCusts).catch(() => {}); api('/api/me').then(setMe).catch(() => {}); }, []);
  useEffect(() => {
    const t = setTimeout(() => api('/api/items?q=' + encodeURIComponent(q)).then(setRes).catch(e => setErr(e.message)), 180);
    return () => clearTimeout(t);
  }, [q]);
  // A USB/Bluetooth scanner "types" the barcode. Keep the search box focused so every scan lands in it.
  useEffect(() => {
    const h = e => {
      const tag = e.target.tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag) || e.ctrlKey || e.metaKey || e.altKey || pay || cam) return;
      if (e.key.length === 1) box.current?.focus();
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [pay, cam]);

  function add(it) {
    let serial;
    if (it.has_serial) { serial = prompt('Serial number for ' + it.name); if (!serial) return false; }
    setDone(null);
    setCart(c => {
      const i = it.has_serial ? -1 : c.findIndex(l => l.item.id === it.id);
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...c, { item: it, qty: 1, price: Number(it.sell_price), disc: 0, serial }];
    });
    return true;
  }
  // Look the code up fresh (the list on screen may be a moment behind a fast scanner)
  async function scanCode(raw) {
    const code = (raw || '').trim(); if (!code) return;
    setErr('');
    try {
      const rows = await api('/api/items?q=' + encodeURIComponent(code));
      const m = rows.find(r => r.barcode === code || r.sku.toLowerCase() === code.toLowerCase()) || (rows.length === 1 ? rows[0] : null);
      if (!m) { beep(false); setErr(`No product found for "${code}". Add it under Inventory and put this number in its Barcode field.`); return; }
      if (m.track_stock && m.stock_qty <= 0) { beep(false); setErr(`${m.name} is out of stock.`); return; }
      if (add(m)) { beep(true); setLast(m.name); }
    } catch (e) { setErr(e.message); }
  }
  const onKey = e => { if (e.key === 'Enter' && q) { scanCode(q); setQ(''); } };
  const upd = (i, k, v) => setCart(c => c.map((l, x) => x === i ? { ...l, [k]: v } : l));
  const gross = cart.reduce((a, l) => a + l.qty * l.price, 0), lineDisc = cart.reduce((a, l) => a + Number(l.disc || 0), 0), lineNet = gross - lineDisc;
  const calcD = (mode, val) => { const v = Number(val || 0); return mode === 'percent' ? +(lineNet * Math.min(v, 100) / 100).toFixed(2) : Math.min(+v.toFixed(2), lineNet); };
  const saleD = sd ? calcD(sd.mode, sd.value) : 0;
  const total = +(lineNet - saleD).toFixed(2);
  const isMgr = ['owner', 'manager'].includes(me.role);
  const REASONS = ['Loyal customer', 'Bulk purchase', 'Promotion', 'Damaged / display item', 'Price match', 'Staff / family', 'Other'];
  const paid = pay ? pay.reduce((a, p) => a + Number(p.amount || 0), 0) : 0;
  const change = Math.max(0, +(paid - total).toFixed(2)), due = Math.max(0, +(total - paid).toFixed(2));
  const addPay = m => setPay(p => [...p, { method: m, amount: due || '', reference: '' }]);

  async function complete() {
    setBusy(true); setErr('');
    try {
      let payments = pay.map(p => ({ ...p, amount: Number(p.amount) }));
      if (change > 0) {
        const ci = payments.findIndex(p => p.method === 'cash' && p.amount >= change);
        if (ci < 0) throw new Error('Overpayment must be taken in cash so change can be given');
        payments[ci].amount = +(payments[ci].amount - change).toFixed(2);
      }
      const r = await api('/api/sales', {
        customer_id: cust || null, note, discount: sd ? { mode: sd.mode, value: sd.value, reason: sd.reason } : null, approval: sd?.approval || null,
        items: cart.map(l => ({ item_id: l.item.id, qty: l.qty, unit_price: l.price, discount: Number(l.disc || 0), serial_no: l.serial })),
        payments,
      });
      setDone({ ...r, change }); setCart([]); setPay(null); setNote(''); setCust(''); setLast(''); setSd(null);
      api('/api/items?q=' + encodeURIComponent(q)).then(setRes);
      setTimeout(() => box.current?.focus(), 100);
    } catch (e) {
      setErr(e.message);
      if (/manager approval/i.test(e.message) && sd) { setPay(null); setDm({ ...sd, approval: null, email: '', password: '' }); }
    }
    setBusy(false);
  }

  return (
    <div className="pos">
      <section>
        <div className="row"><h1 className="sp">Sell</h1><button className="btn" onClick={() => { setErr(''); setCam(true); }}>Scan with camera</button></div>
        <input ref={box} style={{ width: '100%', fontSize: '1.05rem', padding: 12 }} placeholder="Scan a barcode, or type a name / SKU and press Enter…" value={q}
          onChange={e => setQ(e.target.value)} onKeyDown={onKey} autoFocus />
        {last && !err && <div className="okmsg" style={{ marginTop: 10 }}>Added: <b>{last}</b></div>}
        {err && !pay && <div className="err" style={{ marginTop: 10 }}>{err}</div>}
        <div className="tiles">
          {res.map(it => (
            <button key={it.id} className="tile" onClick={() => { add(it) && setLast(it.name); box.current?.focus(); }} disabled={it.track_stock && it.stock_qty <= 0}>
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
        {!cart.length && <p className="muted">Scan or tap an item to add it.</p>}
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
        {(lineDisc > 0 || saleD > 0) && <div className="muted" style={{ fontSize: '.9rem', borderTop: '1px solid var(--line)', paddingTop: 8 }}>
          <div className="row"><span className="sp">Subtotal</span><span>{money(gross)}</span></div>
          {lineDisc > 0 && <div className="row"><span className="sp">Item discounts</span><span>-{money(lineDisc)}</span></div>}
          {saleD > 0 && <div className="row"><span className="sp">Discount · {sd.reason}{sd.mode === 'percent' ? ` (${sd.value}%)` : ''}</span><span>-{money(saleD)}</span></div>}
        </div>}
        <div className="row"><span className="muted sp">Total (VAT included)</span><span className="total">{money(total)}</span></div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn pri sp" disabled={!cart.length} onClick={() => { setErr(''); setPay([{ method: 'cash', amount: total.toFixed(2), reference: '' }]); }}>Take payment</button>
          <button className="btn" disabled={!cart.length} onClick={() => { setErr(''); setDm(sd ? { ...sd, email: '', password: '' } : { mode: 'percent', value: '', reason: '', email: '', password: '' }); }}>{sd ? 'Edit discount' : 'Discount'}</button>
          <button className="btn" disabled={!cart.length} onClick={() => { setCart([]); setSd(null); }}>Clear</button>
        </div>
      </aside>

      {dm && (() => {
        const D = calcD(dm.mode, dm.value), pct = gross > 0 ? (lineDisc + D) / gross * 100 : 0, needs = pct > 10 && !isMgr;
        const apply = () => {
          if (!(Number(dm.value) > 0)) return setErr('Enter a discount amount');
          if (!dm.reason) return setErr('Choose a reason for the discount');
          if (needs && (!dm.email || !dm.password)) return setErr('A manager must approve this discount: enter their email and password');
          setErr(''); setSd({ mode: dm.mode, value: dm.value, reason: dm.reason, approval: needs ? { email: dm.email, password: dm.password } : null }); setDm(null);
        };
        return (
          <div className="modal"><div className="card">
            <h2>Discount</h2>{err && <div className="err">{err}</div>}
            <div className="row" style={{ marginBottom: 10 }}>
              {[['percent', '% off the sale'], ['amount', 'M off the sale']].map(([k, l]) => <button key={k} className={'btn' + (dm.mode === k ? ' pri' : '')} onClick={() => setDm({ ...dm, mode: k, value: '' })}>{l}</button>)}
              {dm.mode === 'percent' && [5, 10, 15, 20].map(n => <button key={n} className="btn sm" onClick={() => setDm({ ...dm, value: String(n) })}>{n}%</button>)}
            </div>
            <div className="grid g2">
              <div className="f"><label>{dm.mode === 'percent' ? 'Percentage' : 'Amount (M)'}</label><input type="number" min="0" step="0.01" value={dm.value} onChange={e => setDm({ ...dm, value: e.target.value })} autoFocus /></div>
              <div className="f"><label>Reason (required)</label><select value={dm.reason} onChange={e => setDm({ ...dm, reason: e.target.value })}><option value="">Choose…</option>{REASONS.map(r => <option key={r}>{r}</option>)}</select></div>
            </div>
            <p style={{ margin: '12px 0' }}>Discount <b>{money(D)}</b> · new total <b>{money(lineNet - D)}</b> <span className="muted">({pct.toFixed(1)}% off the original price)</span></p>
            {needs && <div className="card" style={{ background: '#fbf3ea', borderColor: '#e8cfb3', marginBottom: 12 }}>
              <b style={{ color: 'var(--warn)' }}>Manager approval needed (over 10%)</b>
              <div className="grid g2" style={{ marginTop: 8 }}>
                <div className="f"><label>Manager email</label><input type="email" value={dm.email} onChange={e => setDm({ ...dm, email: e.target.value })} /></div>
                <div className="f"><label>Manager password</label><input type="password" value={dm.password} onChange={e => setDm({ ...dm, password: e.target.value })} /></div>
              </div></div>}
            <div className="row"><button className="btn pri sp" onClick={apply}>Apply discount</button>
              {sd && <button className="btn bad" onClick={() => { setSd(null); setDm(null); setErr(''); }}>Remove</button>}
              <button className="btn" onClick={() => { setDm(null); setErr(''); }}>Cancel</button></div>
          </div></div>);
      })()}

      {cam && <CameraScanner title="Scan products" keepOpen onScan={scanCode} onClose={() => { setCam(false); setTimeout(() => box.current?.focus(), 100); }} />}

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
