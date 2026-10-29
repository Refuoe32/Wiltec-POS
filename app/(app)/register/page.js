'use client';
import { useEffect, useState } from 'react';
import { api, money, dt } from '@/lib/client';
export default function Register() {
  const [d, setD] = useState(null), [amt, setAmt] = useState(''), [note, setNote] = useState(''), [err, setErr] = useState(''), [day, setDay] = useState(new Date().toISOString().slice(0, 10)), [sales, setSales] = useState([]), [me, setMe] = useState({});
  const load = () => api('/api/register').then(setD).catch(e => setErr(e.message));
  const loadSales = () => api('/api/sales?day=' + day).then(setSales);
  useEffect(() => { load(); api('/api/me').then(setMe); }, []);
  useEffect(() => { loadSales(); }, [day]);
  async function act(action) { setErr(''); try { await api('/api/register', { action, amount: amt, note }); setAmt(''); setNote(''); load(); } catch (e) { setErr(e.message); } }
  async function refund(s) { if (!confirm(`Refund ${s.sale_no} (${money(s.total)}) in full? Stock will be returned.`)) return; try { await api('/api/sales/' + s.id, {}); loadSales(); } catch (e) { alert(e.message); } }
  if (!d) return <p>Loading…</p>;
  const c = d.current, mgr = ['owner', 'manager'].includes(me.role);
  return (
    <div>
      <h1>Till</h1>{err && <div className="err">{err}</div>}
      <div className="card" style={{ marginBottom: 16 }}>
        {!c ? <><h2>Open the till</h2><div className="row"><input type="number" placeholder="Opening cash float (M)" value={amt} onChange={e => setAmt(e.target.value)} /><button className="btn pri" onClick={() => act('open')}>Open till</button></div></> :
          <><h2>Till open since {dt(c.opened_at)} · {c.opener}</h2>
            <div className="grid g4" style={{ marginBottom: 12 }}>
              <div className="stat"><b>{money(c.sales_total)}</b><span>{c.sales_count} sales this session</span></div>
              <div className="stat"><b>{money(c.opening_float)}</b><span>Opening float</span></div>
              <div className="stat"><b>{money(c.expected_cash)}</b><span>Cash expected in drawer</span></div>
            </div>
            <div className="row"><input type="number" placeholder="Cash counted (M)" value={amt} onChange={e => setAmt(e.target.value)} /><input placeholder="Note" value={note} onChange={e => setNote(e.target.value)} /><button className="btn pri" disabled={amt === ''} onClick={() => act('close')}>Close till</button></div></>}
      </div>
      <div className="card scroll" style={{ marginBottom: 16 }}>
        <div className="row"><h2 className="sp">Sales</h2><input type="date" value={day} onChange={e => setDay(e.target.value)} /></div>
        <table><thead><tr><th>Sale</th><th>Time</th><th>Customer</th><th>Paid by</th><th>Cashier</th><th className="n">Total</th><th /></tr></thead>
          <tbody>{sales.map(s => <tr key={s.id}><td><a href={'/receipt/' + s.id} target="_blank">{s.sale_no}</a> {s.status !== 'completed' && <span className="tag bad">{s.status}</span>}</td><td>{dt(s.created_at)}</td><td>{s.customer || 'Walk-in'}</td><td>{s.methods}</td><td>{s.cashier}</td><td className="n">{money(s.total)}</td>
            <td className="n">{mgr && s.status === 'completed' && <button className="btn sm bad" onClick={() => refund(s)}>Refund</button>}</td></tr>)}</tbody></table>
        {!sales.length && <p className="muted">No sales on this day.</p>}
      </div>
      <div className="card scroll"><h2>Past till sessions</h2><table><thead><tr><th>Opened</th><th>By</th><th className="n">Expected</th><th className="n">Counted</th><th className="n">Difference</th></tr></thead>
        <tbody>{d.history.map(h => <tr key={h.id}><td>{dt(h.opened_at)}</td><td>{h.opener}</td><td className="n">{money(h.expected_cash)}</td><td className="n">{money(h.counted_cash)}</td><td className="n"><span className={'tag ' + (Number(h.variance) === 0 ? 'ok' : 'bad')}>{money(h.variance)}</span></td></tr>)}</tbody></table></div>
    </div>
  );
}
