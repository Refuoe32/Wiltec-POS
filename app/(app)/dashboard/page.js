'use client';
import { useEffect, useState } from 'react';
import { api, money, mlabel } from '@/lib/client';
export default function Dashboard() {
  const [d, setD] = useState(null), [err, setErr] = useState('');
  useEffect(() => { api('/api/reports').then(setD).catch(e => setErr(e.message)); }, []);
  if (err) return <div className="err">{err}</div>;
  if (!d) return <p>Loading…</p>;
  const max = Math.max(1, ...d.daily.map(x => x.total));
  const net = d.profit - d.expenses;
  return (
    <div>
      <h1>Reports</h1>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <div className="card stat"><b>{money(d.today.total)}</b><span>Sales today ({d.today.n})</span></div>
        <div className="card stat"><b>{money(d.month.total)}</b><span>Sales this month ({d.month.n})</span></div>
        <div className="card stat"><b>{money(d.profit)}</b><span>Gross profit this month (ex. VAT)</span></div>
        <div className="card stat"><b style={{ color: net < 0 ? 'var(--bad)' : 'inherit' }}>{money(net)}</b><span>After expenses {money(d.expenses)}</span></div>
        <div className="card stat"><b>{d.openRepairs}</b><span>Open repair jobs</span></div>
        <div className="card stat"><b>{money(d.owing)}</b><span>Owed by customers</span></div>
        <div className="card stat"><b>{money(d.month.vat)}</b><span>VAT collected this month</span></div>
        <div className="card stat"><b>{money(d.stockValue.cost)}</b><span>Stock at cost (retail {money(d.stockValue.retail)})</span></div>
      </div>
      <div className="card" style={{ marginBottom: 16 }}><h2>Sales, last 14 days</h2>
        <div className="bars">{d.daily.map(x => <i key={x.day} style={{ height: (x.total / max) * 100 + '%' }} title={`${x.day}: ${money(x.total)}`} />)}</div>
        <div className="row muted" style={{ justifyContent: 'space-between', fontSize: '.8rem' }}><span>{d.daily[0]?.day}</span><span>{d.daily.at(-1)?.day}</span></div></div>
      <div className="grid g3">
        <div className="card scroll"><h2>Best sellers (30 days)</h2><table><tbody>{d.top.map(t => <tr key={t.name}><td>{t.name}</td><td className="n">{t.units}</td><td className="n">{money(t.revenue)}</td></tr>)}</tbody></table></div>
        <div className="card scroll"><h2>Payments by method (30 days)</h2><table><tbody>{d.methods.map(m => <tr key={m.method}><td>{mlabel(m.method)}</td><td className="n">{money(m.total)}</td></tr>)}</tbody></table></div>
        <div className="card scroll"><h2>Low stock</h2><table><tbody>{d.low.map(l => <tr key={l.id}><td>{l.name}</td><td className="n"><span className={'tag ' + (l.stock_qty <= 0 ? 'bad' : 'warn')}>{l.stock_qty}</span></td></tr>)}</tbody></table>{!d.low.length && <p className="muted">All stocked up.</p>}</div>
      </div>
    </div>
  );
}
