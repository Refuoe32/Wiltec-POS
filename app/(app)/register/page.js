'use client';
import { useEffect, useState } from 'react';
import { api, money, dt, today, mlabel } from '@/lib/client';
import ExportBar from '@/components/ExportBar';
export default function Till() {
  const [d, setD] = useState(null), [amt, setAmt] = useState(''), [note, setNote] = useState(''), [err, setErr] = useState('');
  const [day, setDay] = useState(today()), [sales, setSales] = useState([]), [me, setMe] = useState({});
  const load = () => api('/api/register').then(setD).catch(e => setErr(e.message));
  const loadSales = () => api('/api/sales?day=' + day).then(setSales).catch(() => {});
  useEffect(() => { load(); api('/api/me').then(setMe); }, []);
  useEffect(() => { loadSales(); }, [day]);
  async function act(action) {
    setErr('');
    try {
      const r = await api('/api/register', { action, amount: amt, note });
      setAmt(''); setNote('');
      if (action === 'close') { location.href = '/zreport/' + r.id; return; }
      load();
    } catch (e) { setErr(e.message); }
  }
  async function refund(s) {
    const reason = prompt(`Refund ${s.sale_no} (${money(s.total)}) in full. Stock will be returned.\n\nReason for the refund:`);
    if (!reason) return;
    try { await api('/api/sales/' + s.id, { reason }); loadSales(); load(); } catch (e) { alert(e.message); }
  }
  if (!d) return <p>Loading…</p>;
  const c = d.current, mgr = ['owner', 'manager'].includes(me.role);
  return (
    <div>
      <h1>Till</h1>{err && <div className="err">{err}</div>}
      <div className="card" style={{ marginBottom: 16 }}>
        {!c ? <>
          <h2>Your till is closed</h2>
          <p className="muted" style={{ marginTop: 0 }}>Enter the cash float you start with, then open your till to begin selling. Each cashier has their own till and cashes up at the end of the shift.</p>
          <div className="row"><input type="number" step="0.01" placeholder="Starting cash float (M)" value={amt} onChange={e => setAmt(e.target.value)} /><button className="btn pri" onClick={() => act('open')}>Open till</button></div></> : <>
          <div className="row"><h2 className="sp" style={{ margin: 0 }}>Your till is open <span className="muted" style={{ fontWeight: 400, fontSize: '.9rem' }}>since {dt(c.opened_at)} · till #{c.id}</span></h2>
            <a className="btn" href={'/zreport/' + c.id} target="_blank">Print X report</a></div>
          <div className="grid g4" style={{ margin: '14px 0' }}>
            <div className="stat"><b>{money(c.sales_total)}</b><span>{c.sales_count} sales</span></div>
            <div className="stat"><b>{money(c.opening_float)}</b><span>Starting float</span></div>
            <div className="stat"><b>{money(c.discounts)}</b><span>Discounts given</span></div>
            <div className="stat"><b>{c.refunds_count} / {c.voids}</b><span>Refunds / voids</span></div>
          </div>
          <table style={{ maxWidth: 420, marginBottom: 14 }}><tbody>{c.methods.map(m => <tr key={m.method}><td>{mlabel(m.method)}</td><td className="n">{money(m.total)}</td></tr>)}</tbody></table>
          {mgr && <p className="muted">Expected cash in drawer: <b>{money(c.expected_cash)}</b></p>}
          <h2>Cash up and close</h2>
          <p className="muted" style={{ marginTop: 0 }}>Count all the cash in your drawer (including the float) and enter the total. {!mgr && 'The system compares it with what it expects and prints your Z report.'}</p>
          <div className="row"><input type="number" step="0.01" placeholder="Cash counted (M)" value={amt} onChange={e => setAmt(e.target.value)} /><input placeholder="Note (optional)" value={note} onChange={e => setNote(e.target.value)} /><button className="btn pri" onClick={() => { if (confirm('Close your till and print the Z report?')) act('close'); }}>Close till (Z report)</button></div></>}
      </div>
      {mgr && d.open.length > 0 && <div className="card scroll" style={{ marginBottom: 16 }}><h2>Tills open now</h2><table><thead><tr><th>Till</th><th>Cashier</th><th>Opened</th><th className="n">Float</th><th /></tr></thead>
        <tbody>{d.open.map(o => <tr key={o.id}><td>#{o.id}</td><td>{o.opener}</td><td>{dt(o.opened_at)}</td><td className="n">{money(o.opening_float)}</td><td className="n"><a href={'/zreport/' + o.id} target="_blank">X report</a></td></tr>)}</tbody></table></div>}
      <div className="card scroll" style={{ marginBottom: 16 }}>
        <div className="row"><h2 className="sp">{mgr ? 'Sales' : 'My sales'}</h2>
          <ExportBar name={'till-sales-' + day} build={() => ({ title: 'Sales for ' + day, subtitle: sales.length + ' sales', sections: [{ title: 'Sales', head: ['Sale', 'Time', 'Customer', 'Paid by', 'Staff', 'Total'], rows: sales.map(s => [s.sale_no + (s.status !== 'completed' ? ' (' + s.status + ')' : ''), dt(s.created_at), s.customer || 'Walk-in', s.methods || '', s.cashier, money(s.total)]) }] })} />
          <input type="date" value={day} onChange={e => setDay(e.target.value)} /></div>
        <table><thead><tr><th>Sale</th><th>Time</th><th>Customer</th><th>Paid by</th><th>Cashier</th><th className="n">Total</th><th /></tr></thead>
          <tbody>{sales.map(s => <tr key={s.id}><td><a href={'/receipt/' + s.id} target="_blank">{s.sale_no}</a> {s.status !== 'completed' && <span className="tag bad">{s.status}</span>}</td><td>{dt(s.created_at)}</td><td>{s.customer || 'Walk-in'}</td><td>{s.methods}</td><td>{s.cashier}</td><td className="n">{money(s.total)}</td>
            <td className="n">{mgr && s.status === 'completed' && <button className="btn sm bad" onClick={() => refund(s)}>Refund</button>}</td></tr>)}</tbody></table>
        {!sales.length && <p className="muted">No sales on this day.</p>}
      </div>
      <div className="card scroll"><h2>Past tills</h2><table><thead><tr><th>Till</th><th>Cashier</th><th>Opened</th><th>Closed</th>{mgr && <th className="n">Expected</th>}<th className="n">Counted</th><th className="n">Difference</th><th /></tr></thead>
        <tbody>{d.history.map(h => <tr key={h.id}><td>#{h.id}</td><td>{h.opener}</td><td>{dt(h.opened_at)}</td><td>{dt(h.closed_at)}</td>{mgr && <td className="n">{money(h.expected_cash)}</td>}<td className="n">{money(h.counted_cash)}</td>
          <td className="n"><span className={'tag ' + (Number(h.variance) === 0 ? 'ok' : 'bad')}>{money(h.variance)}</span></td><td className="n"><a href={'/zreport/' + h.id} target="_blank">Z report</a></td></tr>)}</tbody></table>
        {!d.history.length && <p className="muted">No closed tills yet.</p>}</div>
    </div>
  );
}
