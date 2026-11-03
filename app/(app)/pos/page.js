'use client';
import { useEffect, useRef, useState } from 'react';
import { api, money, METHODS, imgUrl, initials } from '@/lib/client';
import CameraScanner from '@/components/CameraScanner';
let actx;
function beep(ok = true) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const o = actx.createOscillator(), g = actx.createGain(); o.connect(g); g.connect(actx.destination);
    o.frequency.value = ok ? 880 : 200; g.gain.value = 0.08; o.start(); o.stop(actx.currentTime + (ok ? 0.08 : 0.3));
  } catch {}
}
const REASONS = ['Loyal customer', 'Bulk purchase', 'Promotion', 'Damaged / display item', 'Price match', 'Staff / family', 'Other'];
const stamp = () => new Date().toLocaleString('en-GB', { timeZone: 'Africa/Maseru', hour: '2-digit', minute: '2-digit', weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
export default function POS() {
  const [q, setQ] = useState(''), [cat, setCat] = useState(''), [cats, setCats] = useState([]), [res, setRes] = useState([]), [cart, setCart] = useState([]);
  const [cust, setCust] = useState(''), [custs, setCusts] = useState([]), [note, setNote] = useState('');
  const [pay, setPay] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(null);
  const [cam, setCam] = useState(false), [last, setLast] = useState(''), [me, setMe] = useState({}), [now, setNow] = useState(''), [till, setTill] = useState(null);
  const [sd, setSd] = useState(null), [dm, setDm] = useState(null);   // sd = discount on the sale, dm = discount dialog
  const box = useRef(null);
  useEffect(() => {
    api('/api/customers').then(setCusts).catch(() => {}); api('/api/me').then(setMe).catch(() => {}); api('/api/categories').then(setCats).catch(() => {}); api('/api/register').then(setTill).catch(() => {});
    setNow(stamp()); const t = setInterval(() => setNow(stamp()), 30000); return () => clearInterval(t);
  }, []);
  const loadItems = () => api(`/api/items?q=${encodeURIComponent(q)}&cat=${cat}`).then(setRes).catch(e => setErr(e.message));
  useEffect(() => { const t = setTimeout(loadItems, 180); return () => clearTimeout(t); }, [q, cat]);
  // A USB/Bluetooth scanner "types" the barcode. Keep the search box focused so every scan lands in it.
  useEffect(() => {
    const h = e => {
      const tag = e.target.tagName;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(tag) || e.ctrlKey || e.metaKey || e.altKey || pay || cam || dm) return;
      if (e.key.length === 1) box.current?.focus();
    };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [pay, cam, dm]);

  function add(it) {
    let serial;
    if (it.has_serial) { serial = prompt('Serial number for ' + it.name); if (!serial) return false; }
    setDone(null);
    setCart(c => {
      const i = it.has_serial ? -1 : c.findIndex(l => l.item.id === it.id);
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + 1 }; return n; }
      return [...c, { item: it, qty: 1, price: Number(it.sell_price), disc: 0, serial, edit: false }];
    });
    return true;
  }
  async function scanCode(raw) {          // look the code up fresh (the list on screen may be a moment behind a fast scanner)
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
  const submitSearch = () => { if (q) { scanCode(q); setQ(''); } };
  const upd = (i, k, v) => setCart(c => c.map((l, x) => x === i ? { ...l, [k]: v } : l));

  // ----- totals -----
  const gross = cart.reduce((a, l) => a + l.qty * l.price, 0), lineDisc = cart.reduce((a, l) => a + Number(l.disc || 0), 0), lineNet = gross - lineDisc;
  const calcD = (mode, val) => { const v = Number(val || 0); return mode === 'percent' ? +(lineNet * Math.min(v, 100) / 100).toFixed(2) : Math.min(+v.toFixed(2), lineNet); };
  const saleD = sd ? calcD(sd.mode, sd.value) : 0;
  const total = +(lineNet - saleD).toFixed(2), isMgr = ['owner', 'manager'].includes(me.role);
  const vr = Number(me.vat_rate || 0);
  const vatLines = cart.reduce((a, l) => a + (l.item.vat_applies ? (l.qty * l.price - Number(l.disc || 0)) * vr / (100 + vr) : 0), 0);
  const tax = lineNet > 0 ? vatLines * (total / lineNet) : 0;
  const paid = pay ? pay.reduce((a, p) => a + Number(p.amount || 0), 0) : 0;
  const change = Math.max(0, +(paid - total).toFixed(2)), due = Math.max(0, +(total - paid).toFixed(2));
  const setCash = v => setPay(x => {
    const i = x.findIndex(r => r.method === 'cash'), others = x.filter((r, k) => k !== i).reduce((a, r) => a + Number(r.amount || 0), 0);
    const amt = v === 'exact' ? +(total - others).toFixed(2) : v;
    return i < 0 ? [...x, { method: 'cash', amount: amt, reference: '' }] : x.map((r, k) => k === i ? { ...r, amount: amt } : r);
  });
  const addPay = m => setPay(p => [...p, { method: m, amount: due || '', reference: '' }]);

  async function complete() {
    setBusy(true); setErr('');
    try {
      const payments = pay.map(p => ({ ...p, amount: Number(p.amount) }));   // the server works out the change from the cash tendered
      const r = await api('/api/sales', {
        customer_id: cust || null, note, discount: sd ? { mode: sd.mode, value: sd.value, reason: sd.reason } : null, approval: sd?.approval || null,
        items: cart.map(l => ({ item_id: l.item.id, qty: l.qty, unit_price: l.price, discount: Number(l.disc || 0), serial_no: l.serial })), payments,
      });
      setDone(r); setCart([]); setPay(null); setNote(''); setCust(''); setLast(''); setSd(null);
      loadItems(); setTimeout(() => box.current?.focus(), 100);
    } catch (e) {
      setErr(e.message);
      if (/manager approval/i.test(e.message) && sd) { setPay(null); setDm({ ...sd, approval: null, email: '', password: '' }); }
    }
    setBusy(false);
  }
  const totalItems = cats.reduce((a, c) => a + c.n, 0);

  return (
    <div className="pos">
      <section>
        <h1>Point Of Sales</h1>
        <div className="searchbar">
          <div className="box"><input ref={box} placeholder="Scan a barcode or search product…  (press Enter)" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && submitSearch()} autoFocus /></div>
          <button className="btn pri" onClick={submitSearch}>Search</button>
          <button className="btn out" title="Scan with the camera" onClick={() => { setErr(''); setCam(true); }}>Scan</button>
        </div>
        {last && !err && <div className="okmsg">Added: <b>{last}</b></div>}
        {err && !pay && !dm && <div className="err">{err}</div>}
        {till && !till.current && till.require && <div className="err">Your till is closed. <a href="/register">Open your till</a> with your starting cash float before you sell.</div>}
        <div className="panel" style={{ marginBottom: 16 }}>
          <h2>Categories</h2>
          <div className="cats">
            <button className={'cat' + (cat === '' ? ' on' : '')} onClick={() => setCat('')}><b>All</b><span>{totalItems} Items</span></button>
            {cats.map(c => <button key={c.id} className={'cat' + (cat === String(c.id) ? ' on' : '')} onClick={() => setCat(String(c.id))}><b>{c.name}</b><span>{c.n} Items</span></button>)}
          </div>
        </div>
        <div className="panel">
          <h2>Products</h2>
          <div className="prods">
            {res.map(it => {
              const out = it.track_stock && it.stock_qty <= 0;
              return (
                <div key={it.id} className="prod">
                  <div className="img">{it.has_image ? <img src={imgUrl(it)} alt="" loading="lazy" /> : <span className="ini">{initials(it.name)}</span>}</div>
                  <div className="nm">{it.name}</div>
                  <div className="st">{it.track_stock ? `${it.stock_qty} in stock` : 'Service'} · {it.sku}</div>
                  <div className="pr">{money(it.sell_price)}</div>
                  <button className="btn pri" disabled={out} onClick={() => { add(it) && setLast(it.name); box.current?.focus(); }}>{out ? 'Out of stock' : 'Add'}</button>
                </div>);
            })}
          </div>
          {!res.length && <p className="muted">No products found. Add products under Inventory.</p>}
        </div>
      </section>

      <aside className="side2col">
        <div className="panel">
          <h2 style={{ fontSize: '1.3rem' }}>Order Detail {done ? <span className="muted" style={{ fontSize: '.9rem' }}>· last #{done.sale_no}</span> : ''}</h2>
          <div className="muted" style={{ marginBottom: 12 }}>{now}</div>
          {done && <div className="okmsg">Sale {done.sale_no} completed{done.change > 0 && <> · give change <b>{money(done.change)}</b></>}.{' '}<a href={'/receipt/' + done.id} target="_blank">Print receipt</a></div>}
          <div className="cartbox">
            {!cart.length && <p className="muted">Scan or tap a product to add it.</p>}
            {cart.map((l, i) => (
              <div key={i} className="line">
                <div className="th">{l.item.has_image ? <img src={imgUrl(l.item)} alt="" /> : <span className="ini">{initials(l.item.name)}</span>}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="row" style={{ flexWrap: 'nowrap', gap: 6 }}><div className="nm sp">{l.item.name}</div>
                    <button className="iconbtn" title="Remove" onClick={() => { api('/api/events', { type: 'void_line', detail: { item: l.item.name, qty: l.qty, price: l.price, total: l.qty * l.price - Number(l.disc || 0) } }).catch(() => {}); setCart(c => c.filter((_, x) => x !== i)); }}>Remove</button></div>
                  {l.serial && <div className="muted" style={{ fontSize: '.74rem' }}>S/N {l.serial}</div>}
                  <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', marginTop: 2 }}>
                    <div className="pr">{money(l.qty * l.price - Number(l.disc || 0))}</div>
                    <div className="stepper">
                      <button onClick={() => upd(i, 'qty', Math.max(1, l.qty - 1))} disabled={!!l.serial}>−</button>
                      <input type="number" min="1" value={l.qty} disabled={!!l.serial} onChange={e => upd(i, 'qty', Math.max(1, parseInt(e.target.value) || 1))} />
                      <button className="plus" onClick={() => upd(i, 'qty', l.qty + 1)} disabled={!!l.serial}>+</button>
                    </div>
                  </div>
                  <a href="#" className="muted" style={{ fontSize: '.74rem' }} onClick={e => { e.preventDefault(); upd(i, 'edit', !l.edit); }}>{l.edit ? 'Hide' : 'Edit price / item discount'}</a>
                  {l.edit && <div className="row" style={{ marginTop: 6, flexWrap: 'nowrap' }}>
                    <input type="number" step="0.01" style={{ width: 96 }} value={l.price} onChange={e => upd(i, 'price', e.target.value)} title="Unit price" />
                    <input type="number" step="0.01" min="0" style={{ width: 96 }} placeholder="Discount M" value={l.disc || ''} onChange={e => upd(i, 'disc', e.target.value)} title="Item discount (M)" /></div>}
                </div>
              </div>))}
          </div>
        </div>

        <div className="panel">
          <h2 style={{ fontSize: '1.3rem' }}>Payment Detail</h2>
          <select style={{ width: '100%', marginBottom: 12 }} value={cust} onChange={e => setCust(e.target.value)}>
            <option value="">Customer Name (walk-in)</option>
            {custs.map(c => <option key={c.id} value={c.id}>{c.name}{c.phone ? ' · ' + c.phone : ''}</option>)}
          </select>
          <div className="sumrow"><span>Sub Total</span><span>{money(gross)}</span></div>
          <div className="sumrow"><span>Tax (VAT included)</span><span>{money(tax)}</span></div>
          <div className="sumrow g"><span>Discount{sd ? ` · ${sd.reason}${sd.mode === 'percent' ? ' ' + sd.value + '%' : ''}` : ''}</span><span>{lineDisc + saleD > 0 ? '-' : ''}{money(lineDisc + saleD)}</span></div>
          <div className="sumrow t"><span>Total Payment</span><span>{money(total)}</span></div>
          <div className="grid" style={{ gap: 10, marginTop: 14 }}>
            <button className="btn out block" disabled={!cart.length} onClick={() => { setErr(''); setDm(sd ? { ...sd, email: '', password: '' } : { mode: 'percent', value: '', reason: '', email: '', password: '' }); }}>{sd ? 'Edit Discount' : 'Add Discount'}</button>
            <button className="btn pri block" disabled={!cart.length || (till && !till.current && till.require)} onClick={() => { setErr(''); setPay([{ method: 'cash', amount: total.toFixed(2), reference: '' }]); }}>Purchase</button>
            {cart.length > 0 && <button className="btn block" onClick={() => { if (!confirm('Cancel this whole order?')) return; api('/api/events', { type: 'cancel_sale', detail: { lines: cart.length, total } }).catch(() => {}); setCart([]); setSd(null); }}>Cancel order</button>}
          </div>
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
            {needs && <div className="card" style={{ background: '#fdf3e8', borderColor: '#ecd0b0', marginBottom: 12 }}>
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
          <div className="row" style={{ justifyContent: 'space-between' }}><h2 style={{ margin: 0 }}>Payment</h2><div style={{ textAlign: 'right' }}><div className="muted" style={{ fontSize: '.8rem' }}>Total due</div><b style={{ fontSize: '1.7rem' }}>{money(total)}</b></div></div>
          {err && <div className="err" style={{ marginTop: 10 }}>{err}</div>}
          <div style={{ marginTop: 12 }}>
            {pay.map((p, i) => (
              <div className="row" key={i} style={{ marginBottom: 8 }}>
                <select value={p.method} onChange={e => setPay(x => x.map((r, k) => k === i ? { ...r, method: e.target.value } : r))}>{METHODS.map(m => <option key={m[0]} value={m[0]}>{m[1]}</option>)}</select>
                <input type="number" step="0.01" style={{ width: 120 }} placeholder={p.method === 'cash' ? 'Cash tendered' : 'Amount'} value={p.amount} onChange={e => setPay(x => x.map((r, k) => k === i ? { ...r, amount: e.target.value } : r))} />
                {['mpesa', 'ecocash', 'card', 'bank_transfer'].includes(p.method) && <input placeholder="Transaction code" style={{ width: 150 }} value={p.reference} onChange={e => setPay(x => x.map((r, k) => k === i ? { ...r, reference: e.target.value } : r))} />}
                <button className="btn sm bad" onClick={() => setPay(x => x.filter((_, k) => k !== i))}>×</button>
              </div>))}
          </div>
          <div className="muted" style={{ fontSize: '.78rem', margin: '10px 0 4px' }}>Cash tendered (customer hands over)</div>
          <div className="row" style={{ marginBottom: 10, gap: 6 }}>
            <button className="btn sm" onClick={() => setCash('exact')}>Exact</button>{[10, 20, 50, 100, 200].map(n => <button key={n} className="btn sm" onClick={() => setCash(n)}>M {n}</button>)}
          </div>
          {due > 0 && <div className="row" style={{ marginBottom: 6, gap: 6 }}>{METHODS.slice(1, 4).map(m => <button key={m[0]} className="btn sm" onClick={() => addPay(m[0])}>+ {m[1]} {money(due)}</button>)}</div>}
          <div style={{ background: due > 0 ? '#fdeceb' : '#e3f6ec', borderRadius: 10, padding: '12px 14px', margin: '12px 0' }}>
            <div className="row" style={{ justifyContent: 'space-between' }}><span>Received</span><b>{money(paid)}</b></div>
            <div className="row" style={{ justifyContent: 'space-between', fontSize: '1.3rem' }}>{due > 0 ? <><b style={{ color: 'var(--bad)' }}>Still due</b><b style={{ color: 'var(--bad)' }}>{money(due)}</b></> : <><b style={{ color: 'var(--green2)' }}>CHANGE</b><b style={{ color: 'var(--green2)' }}>{money(change)}</b></>}</div>
          </div>
          <div className="row">
            <button className="btn pri sp block" disabled={busy || due > 0} onClick={complete}>{busy ? 'Saving…' : 'Complete sale'}</button>
            <button className="btn" onClick={() => setPay(null)}>Back</button>
          </div>
        </div></div>)}
    </div>
  );
}
