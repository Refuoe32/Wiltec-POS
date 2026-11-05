'use client';
import { useEffect, useRef, useState } from 'react';
import { api, money, METHODS, imgUrl, initials } from '@/lib/client';
import CameraScanner from '@/components/CameraScanner';
import NumPad from '@/components/NumPad';
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
export default function PosScreen({ mode = 'grid' }) {
  const [q, setQ] = useState(''), [cat, setCat] = useState(''), [cats, setCats] = useState([]), [res, setRes] = useState([]), [cart, setCart] = useState([]);
  const [cust, setCust] = useState(''), [custs, setCusts] = useState([]), [note, setNote] = useState('');
  const [pay, setPay] = useState(null), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [done, setDone] = useState(null);
  const [cam, setCam] = useState(false), [last, setLast] = useState(''), [me, setMe] = useState({}), [now, setNow] = useState(''), [till, setTill] = useState(null);
  const [sd, setSd] = useState(null), [dm, setDm] = useState(null);   // sd = discount on the sale, dm = discount dialog
  const box = useRef(null);
  const [selKey, setSelKey] = useState(null), [mult, setMult] = useState(1), [entry, setEntry] = useState('');
  const [ps, setPs] = useState(null), [cm, setCm] = useState(null), [pc, setPc] = useState(null), [hm, setHm] = useState(null), [ap, setAp] = useState(null);
  const [priceApproval, setPriceApproval] = useState(null), [payRow, setPayRow] = useState(0), [padFresh, setPadFresh] = useState(true), [autoPrint, setAutoPrint] = useState(false);
  useEffect(() => { try { setAutoPrint(localStorage.getItem('wt_autoprint') === '1'); } catch {} }, []);
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

  function add(it, qty = 1, opts = {}) {
    let serial;
    if (it.has_serial) { serial = prompt('Serial number for ' + it.name); if (!serial) return false; }
    setDone(null);
    const uniq = it.has_serial || opts.unique, key = uniq ? Math.random().toString(36).slice(2) : it.id;
    setCart(c => {
      const i = uniq ? -1 : c.findIndex(l => l.key === it.id);
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + qty }; return n; }
      return [...c, { key, item: it, qty, price: opts.price ?? Number(it.sell_price), disc: 0, serial, edit: false }];
    });
    setSelKey(key);
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
      if (add(m, mult)) { beep(true); setLast(m.name); setMult(1); }
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
        customer_id: cust || null, note, discount: sd ? { mode: sd.mode, value: sd.value, reason: sd.reason } : null, approval: sd?.approval || priceApproval || null,
        items: cart.map(l => ({ item_id: l.item.id, qty: l.qty, unit_price: l.price, discount: Number(l.disc || 0), serial_no: l.serial })), payments,
      });
      setDone(r); setCart([]); setPay(null); setNote(''); setCust(''); setLast(''); setSd(null); setPriceApproval(null); setSelKey(null); setMult(1); setEntry('');
      if (mode === 'keypad' && autoPrint) silentPrint(r.id);
      loadItems(); setTimeout(() => box.current?.focus(), 100);
    } catch (e) {
      setErr(e.message);
      if (/manager approval needed for discounts/i.test(e.message) && sd) { setPay(null); setDm({ ...sd, approval: null, email: '', password: '' }); }
      else if (/manager approval needed for a price change/i.test(e.message)) { setPay(null); setErr(''); setAp({ title: 'Manager approval: price change', then: () => { if (mode === 'keypad') setTimeout(startPay, 50); } }); }
    }
    setBusy(false);
  }
  const totalItems = cats.reduce((a, c) => a + c.n, 0);


  // ===== keypad till screen =====
  const msg = m => { setErr(m); setLast(''); beep(false); };
  const ok = m => { setErr(''); setLast(m); };
  const selLine = cart.find(l => l.key === selKey) || null;
  const nItems = cart.length, nQty = cart.reduce((a, l) => a + l.qty, 0);
  const hidden = it => it.sku === 'SRV-REPAIR' || it.sku === 'SRV-MISC';
  const tillBlocked = till && !till.current && till.require;
  const custName = (custs.find(c => c.id === cust) || {}).name;
  useEffect(() => { if (!ps) return; const t = setTimeout(() => api('/api/items?q=' + encodeURIComponent(ps.q)).then(r => setPs(p => p ? { ...p, rows: r.filter(x => !hidden(x)) } : p)).catch(() => {}), 150); return () => clearTimeout(t); }, [ps?.q, !!ps]);

  function pressKey(k) { setErr(''); setEntry(e => k === 'del' ? e.slice(0, -1) : (k === '.' && e.includes('.') ? e : e + k)); }
  function startPay() {
    if (!cart.length) return msg('The ticket is empty');
    if (tillBlocked) return msg('Your till is closed. Press Cash Up / Till to open it first.');
    setErr(''); setLast(''); setPadFresh(true); setPayRow(0); setPay([{ method: 'cash', amount: total.toFixed(2), reference: '' }]);
  }
  function enter() { const v = entry.trim(); if (!v) return startPay(); scanCode(v); setEntry(''); }
  function times() {                                   // type a number, press x: sets the selected line's quantity (or the next item's)
    const n = Math.floor(Number(entry));
    if (!(n > 0)) return msg('Type a quantity on the keypad, then press ×');
    if (selLine && !selLine.serial) { setCart(c => c.map(l => l.key === selLine.key ? { ...l, qty: n } : l)); ok(`${selLine.item.name} × ${n}`); }
    else { setMult(n); ok(`The next item will be added × ${n}`); }
    setEntry('');
  }
  function removeLine() {
    if (!selLine) return msg('Touch a line on the ticket first');
    api('/api/events', { type: 'void_line', detail: { item: selLine.item.name, qty: selLine.qty, price: selLine.price, total: selLine.qty * selLine.price - Number(selLine.disc || 0) } }).catch(() => {});
    setCart(c => c.filter(l => l.key !== selLine.key)); setSelKey(null); ok('Line removed');
  }
  function priceChange() {
    if (!selLine) return msg('Touch a line on the ticket first');
    const p = Number(entry);
    if (entry === '' || !(p >= 0)) return msg('Type the new price on the keypad, then press Price Change');
    const apply = () => { setCart(c => c.map(l => l.key === selLine.key ? { ...l, price: p } : l)); setEntry(''); ok(`${selLine.item.name} price changed to ${money(p)}`); };
    if (isMgr || selLine.item.kind === 'service') apply(); else setAp({ title: 'Manager approval: price change', then: apply });
  }
  async function approveGo() {
    try { await api('/api/approve', { email: ap.email, password: ap.password }); setPriceApproval({ email: ap.email, password: ap.password }); const f = ap.then; setAp(null); f(); }
    catch (e) { setAp({ ...ap, err: e.message }); }
  }
  async function miscItem() {
    const p = Number(entry);
    if (!(p > 0)) return msg('Type the price on the keypad, then press Misc Item');
    try {
      const it = (await api('/api/items?q=SRV-MISC')).find(r => r.sku === 'SRV-MISC');
      if (!it) return msg('The Miscellaneous item is missing. Run npm run db:migrate.');
      add(it, 1, { unique: true, price: p }); setEntry(''); beep(true); ok('Miscellaneous item ' + money(p));
    } catch (e) { msg(e.message); }
  }
  function voidSale() {
    if (!cart.length) return msg('The ticket is empty');
    if (!confirm('Void (cancel) this whole sale?')) return;
    api('/api/events', { type: 'cancel_sale', detail: { lines: cart.length, total } }).catch(() => {});
    setCart([]); setSd(null); setSelKey(null); setMult(1); setPriceApproval(null); setCust(''); setErr(''); setLast('');
  }
  function openDiscount() { if (!cart.length) return msg('The ticket is empty'); setErr(''); setDm(sd ? { ...sd, email: '', password: '' } : { mode: 'percent', value: '', reason: '', email: '', password: '' }); }
  const readHeld = () => { try { return JSON.parse(localStorage.getItem('wt_held') || '[]'); } catch { return []; } };
  function holdSale() {
    if (!cart.length) return msg('The ticket is empty');
    const h = readHeld(); h.push({ id: Date.now(), at: new Date().toISOString(), cust, total, cart: cart.map(({ key, item, qty, price, disc, serial }) => ({ key, item, qty, price, disc, serial })) });
    try { localStorage.setItem('wt_held', JSON.stringify(h)); } catch { return msg('Could not hold the sale on this computer'); }
    setCart([]); setSd(null); setSelKey(null); setCust(''); setPriceApproval(null); ok('Sale held. Press Recall to bring it back.');
  }
  function recallOpen() { const h = readHeld(); if (!h.length) return msg('There are no held sales'); setHm(h); }
  function recall(h) {
    if (cart.length && !confirm('Replace the sale on the ticket?')) return;
    setCart(h.cart.map(l => ({ ...l, edit: false }))); setCust(h.cust || ''); setSelKey(null); setDone(null);
    try { localStorage.setItem('wt_held', JSON.stringify(readHeld().filter(x => x.id !== h.id))); } catch {}
    setHm(null); ok('Held sale recalled');
  }
  async function lastReceipt() {
    let id = done?.id;
    if (!id) { try { id = (await api('/api/sales'))[0]?.id; } catch {} }
    if (!id) return msg('There is no receipt yet today');
    window.open('/receipt/' + id, '_blank');
  }
  function silentPrint(id) {             // prints the slip without a preview when the browser runs in kiosk-printing mode
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
    f.src = '/receipt/' + id + '?auto=1'; document.body.appendChild(f); setTimeout(() => f.remove(), 90000);
  }
  async function priceCheck() {
    const code = (pc.code || '').trim(); if (!code) return;
    try {
      const rows = await api('/api/items?q=' + encodeURIComponent(code));
      const m = rows.find(r => r.barcode === code || r.sku.toLowerCase() === code.toLowerCase()) || (rows.length === 1 ? rows[0] : null);
      setPc(p => ({ ...p, code: '', row: m, err: m ? '' : `No product found for "${code}"` }));
    } catch (e) { setPc(p => ({ ...p, err: e.message })); }
  }
  const padPay = k => {                    // the on-screen keypad inside the payment window
    setPay(x => x.map((r, i) => {
      if (i !== (payRow < x.length ? payRow : 0)) return r;
      const cur = padFresh ? '' : String(r.amount ?? '');
      return { ...r, amount: k === 'del' ? cur.slice(0, -1) : (k === '.' && cur.includes('.') ? cur : cur + k) };
    }));
    setPadFresh(false);
  };

  const modals = (<>
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
                <input type="number" step="0.01" style={{ width: 120 }} placeholder={p.method === 'cash' ? 'Cash tendered' : 'Amount'} value={p.amount} onFocus={() => { setPayRow(i); setPadFresh(true); }} inputMode={mode === 'keypad' ? 'none' : undefined} onChange={e => setPay(x => x.map((r, k) => k === i ? { ...r, amount: e.target.value } : r))} />
                {['mpesa', 'ecocash', 'card', 'bank_transfer'].includes(p.method) && <input placeholder="Transaction code" style={{ width: 150 }} value={p.reference} onChange={e => setPay(x => x.map((r, k) => k === i ? { ...r, reference: e.target.value } : r))} />}
                <button className="btn sm bad" onClick={() => setPay(x => x.filter((_, k) => k !== i))}>×</button>
              </div>))}
          </div>
          <div className="muted" style={{ fontSize: '.78rem', margin: '10px 0 4px' }}>Cash tendered (customer hands over)</div>
          <div className="row" style={{ marginBottom: 10, gap: 6 }}>
            <button className="btn sm" onClick={() => setCash('exact')}>Exact</button>{[10, 20, 50, 100, 200].map(n => <button key={n} className="btn sm" onClick={() => setCash(n)}>M {n}</button>)}
          </div>
          {mode === 'keypad' && <div style={{ margin: '8px 0 12px' }}><NumPad onKey={padPay} /></div>}
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
    {ap && <div className="modal"><div className="card">
      <h2>{ap.title}</h2><p className="muted" style={{ marginTop: 0 }}>A manager must enter their email and password.</p>{ap.err && <div className="err">{ap.err}</div>}
      <div className="grid g2">
        <div className="f"><label>Manager email</label><input type="email" value={ap.email || ''} onChange={e => setAp({ ...ap, email: e.target.value })} autoFocus /></div>
        <div className="f"><label>Manager password</label><input type="password" value={ap.password || ''} onChange={e => setAp({ ...ap, password: e.target.value })} onKeyDown={e => e.key === 'Enter' && approveGo()} /></div>
      </div>
      <div className="row" style={{ marginTop: 14 }}><button className="btn pri sp" onClick={approveGo}>Approve</button><button className="btn" onClick={() => setAp(null)}>Cancel</button></div></div></div>}
    </>);

  const touchModals = (<>
    {ps && <div className="modal"><div className="card" style={{ width: 'min(640px,100%)' }}>
      <h2>Product Search</h2>
      <input autoFocus style={{ width: '100%', marginBottom: 10 }} placeholder="Type a name, SKU or barcode" value={ps.q} onChange={e => setPs({ ...ps, q: e.target.value })} />
      <div style={{ maxHeight: '48vh', overflowY: 'auto' }}>
        {ps.rows.map(it => { const out = it.track_stock && it.stock_qty <= 0; return (
          <div key={it.id} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', flexWrap: 'nowrap' }}>
            <div className="sp"><b>{it.name}</b><div className="muted" style={{ fontSize: '.78rem' }}>{it.sku}{it.track_stock ? ` · ${it.stock_qty} in stock` : ' · service'}</div></div>
            <b>{money(it.sell_price)}</b>
            <button className="btn pri" disabled={out} onClick={() => { if (add(it, mult)) { beep(true); setLast(it.name); setMult(1); } setPs(null); }}>{out ? 'Out' : 'Add'}</button>
          </div>); })}
        {!ps.rows.length && <p className="muted">Type to search…</p>}
      </div>
      <button className="btn" style={{ marginTop: 12 }} onClick={() => setPs(null)}>Close</button></div></div>}
    {cm && <div className="modal"><div className="card" style={{ width: 'min(560px,100%)' }}>
      <h2>Customer</h2>
      <input autoFocus style={{ width: '100%', marginBottom: 10 }} placeholder="Search name or phone" value={cm.q} onChange={e => setCm({ q: e.target.value })} />
      <div style={{ maxHeight: '48vh', overflowY: 'auto' }}>
        <div className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}><b className="sp">Walk-in customer (none)</b><button className="btn" onClick={() => { setCust(''); setCm(null); }}>Select</button></div>
        {custs.filter(c => (c.name + ' ' + (c.phone || '')).toLowerCase().includes(cm.q.toLowerCase())).slice(0, 60).map(c => (
          <div key={c.id} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', flexWrap: 'nowrap' }}>
            <div className="sp"><b>{c.name}</b><div className="muted" style={{ fontSize: '.78rem' }}>{c.phone}{Number(c.balance_owing) > 0 && ` · owes ${money(c.balance_owing)}`}</div></div>
            <button className="btn pri" onClick={() => { setCust(c.id); setCm(null); }}>Select</button>
          </div>))}
      </div>
      <button className="btn" style={{ marginTop: 12 }} onClick={() => setCm(null)}>Close</button></div></div>}
    {pc && <div className="modal"><div className="card" style={{ width: 'min(420px,100%)' }}>
      <h2>Price Check</h2>
      <input className="tp-entry" inputMode="none" autoFocus value={pc.code} placeholder="Scan or type the code" onChange={e => setPc({ ...pc, code: e.target.value, row: null, err: '' })} onKeyDown={e => e.key === 'Enter' && priceCheck()} />
      <div style={{ minHeight: 84, margin: '10px 0' }}>
        {pc.row ? <div><b style={{ fontSize: '1.1rem' }}>{pc.row.name}</b><div style={{ fontSize: '1.9rem', fontWeight: 700 }}>{money(pc.row.sell_price)}</div><div className="muted">{pc.row.track_stock ? `${pc.row.stock_qty} in stock` : 'Service'} · {pc.row.sku}</div></div>
          : pc.err ? <span style={{ color: 'var(--bad)' }}>{pc.err}</span> : <span className="muted">Scan a product to see its price.</span>}
      </div>
      <NumPad onKey={k => setPc({ ...pc, row: null, err: '', code: k === 'del' ? pc.code.slice(0, -1) : pc.code + k })} />
      <div className="row" style={{ marginTop: 12 }}><button className="btn pri sp" onClick={priceCheck}>Check</button><button className="btn" onClick={() => setPc(null)}>Close</button></div></div></div>}
    {hm && <div className="modal"><div className="card" style={{ width: 'min(520px,100%)' }}>
      <h2>Held sales</h2>
      {hm.map(h => <div key={h.id} className="row" style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', flexWrap: 'nowrap' }}>
        <div className="sp"><b>{h.cart.length} item(s) · {money(h.total)}</b><div className="muted" style={{ fontSize: '.78rem' }}>{new Date(h.at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Maseru' })}{h.cust ? ' · ' + (custs.find(c => c.id === h.cust)?.name || '') : ''}</div></div>
        <button className="btn pri" onClick={() => recall(h)}>Recall</button>
        <button className="btn bad" onClick={() => { const rest = hm.filter(x => x.id !== h.id); try { localStorage.setItem('wt_held', JSON.stringify(rest)); } catch {} setHm(rest.length ? rest : null); }}>Delete</button></div>)}
      <button className="btn" style={{ marginTop: 12 }} onClick={() => setHm(null)}>Close</button></div></div>}
  </>);

  if (mode === 'keypad') return (
    <div className="tp">
      <header className="tp-head">
        <div className="tp-brand"><div className="tp-logo">WT</div><div className="tp-name">WILTEC</div></div>
        <div className="tp-info"><b>{me.business_name || 'WilTec Solutions'}</b><br />{me.business_address}<br />Cashier: <b>{me.name}</b> · Till {till?.current ? '#' + till.current.id : <b style={{ color: 'var(--bad)' }}>closed</b>}<br />{now}{custName && <> · Customer: <b>{custName}</b></>}</div>
        <div className="tp-total"><small>Sale Total</small><b>{money(total)}</b></div>
      </header>
      <div className="tp-main">
        <div className="tp-left">
          <div className="tp-ticket">
            {cart.length ? (
              <table className="tp-table"><thead><tr><th>Description</th><th className="n">Price</th><th className="n">Qty</th><th className="n">Total</th></tr></thead>
                <tbody>{cart.map(l => (
                  <tr key={l.key} className={l.key === selKey ? 'sel' : ''} onClick={() => setSelKey(l.key)}>
                    <td>{l.item.name}{l.serial && <div className="muted" style={{ fontSize: '.72rem' }}>S/N {l.serial}</div>}</td>
                    <td className="n">{Number(l.price).toFixed(2)}</td><td className="n">{l.qty}</td><td className="n">{(l.qty * l.price - Number(l.disc || 0)).toFixed(2)}</td>
                  </tr>))}</tbody></table>
            ) : done ? (
              <div className="tp-done">Sale {done.sale_no} complete{done.change > 0 ? <><br />CHANGE DUE<b>{money(done.change)}</b></> : <b>Thank you</b>}<a href={'/receipt/' + done.id} target="_blank">Print slip</a></div>
            ) : <div className="tp-empty">Scan a product, or type its code and press Enter</div>}
          </div>
          <div className="tp-under">
            <button className="tbtn sq" onClick={holdSale}>Hold</button>
            <button className="tbtn sq" onClick={recallOpen}>Recall</button>
            <button className="tbtn sq" onClick={miscItem}>Misc Item</button>
            <button className="tbtn sq red" onClick={removeLine}>Remove</button>
            <div className="sums">Total Items: <b>{nItems}</b><br />Total Qty: <b>{nQty}</b>{lineDisc + saleD > 0 && <><br />Discount: <b>-{money(lineDisc + saleD)}</b></>}<br />
              <label style={{ margin: 0, color: '#4a5963', fontSize: '.8rem' }}><input type="checkbox" checked={autoPrint} onChange={e => { setAutoPrint(e.target.checked); try { localStorage.setItem('wt_autoprint', e.target.checked ? '1' : '0'); } catch {} }} /> Auto-print slip</label></div>
          </div>
        </div>
        <div className="tp-mid">
          <div className="tp-lab">Barcode / Stock Code / Price{mult > 1 && <span className="badge">next × {mult}</span>}</div>
          <input ref={box} className="tp-entry" inputMode="none" value={entry} onChange={e => setEntry(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); enter(); } }} autoFocus />
          <div className="tp-msg">{err ? <span className="e">{err}</span> : last ? <span className="o">{last}</span> : tillBlocked ? <span className="e">Your till is closed. Press Cash Up / Till to open it.</span> : null}</div>
          <NumPad onKey={pressKey} />
          <div className="tp-enter"><button className="tbtn wide tall" onClick={enter}>Enter</button><button className="tbtn sq" style={{ height: 78, width: 78, fontSize: '1.9rem' }} onClick={times} title="Quantity">×</button></div>
        </div>
        <div className="tp-right">
          <button className="tbtn tall" onClick={startPay}>Pay</button>
          <button className="tbtn tall" onClick={() => setPs({ q: '', rows: [] })}>Product Search</button>
          <button className="tbtn tall" onClick={priceChange}>Price Change</button>
          <button className="tbtn tall" onClick={openDiscount}>Discount</button>
          <button className="tbtn tall" onClick={() => setCm({ q: '' })}>Customer{custName ? ': ' + custName.slice(0, 12) : ''}</button>
          <button className="tbtn tall red" onClick={voidSale}>Void Sale</button>
        </div>
      </div>
      <div className="tp-bottom">
        <button className="tbtn" onClick={() => setPc({ code: '', row: null, err: '' })}>Price Check</button>
        <button className="tbtn" onClick={lastReceipt}>Last Receipt</button>
        <button className="tbtn" onClick={() => { location.href = '/register'; }}>Cash Up / Till</button>
        <button className="tbtn" onClick={() => { location.href = '/pos'; }}>Product Grid</button>
        <button className="tbtn" onClick={async () => { if (cart.length && !confirm('There is a sale on the ticket. Log out anyway?')) return; await api('/api/logout', {}); location.href = '/login'; }}>Log Out</button>
      </div>
      {modals}{touchModals}
    </div>
  );

  return (
    <div className="pos">
      <section>
        <div className="row"><h1 className="sp">Point Of Sales</h1><a className="btn out" href="/touch">Keypad screen</a></div>
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
            {res.filter(it => !hidden(it)).map(it => {
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

      {modals}
    </div>
  );
}
