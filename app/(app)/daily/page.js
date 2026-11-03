'use client';
import { useEffect, useState } from 'react';
import { api, money, dt, mlabel, today } from '@/lib/client';
import ExportBar from '@/components/ExportBar';
export default function Daily() {
  const [day, setDay] = useState(today()), [cashier, setCashier] = useState(''), [staff, setStaff] = useState([]), [d, setD] = useState(null), [err, setErr] = useState(''), [me, setMe] = useState({});
  useEffect(() => { api('/api/me').then(setMe); api('/api/users').then(setStaff); }, []);
  const load = () => api(`/api/daily?day=${day}&cashier=${cashier}`).then(setD).catch(e => setErr(e.message));
  useEffect(() => { load(); }, [day, cashier]);
  if (err) return <div className="err">{err}</div>;
  if (!d) return <p>Loading…</p>;
  const t = d.totals, mgr = ['owner', 'manager'].includes(me.role);
  const who = cashier ? staff.find(s => s.id === cashier)?.full_name : mgr ? 'All staff' : me.name;
  const build = () => ({
    title: 'Daily Sales Report', subtitle: `${d.day} - ${who} - printed ${dt(new Date())} by ${me.name}`,
    sections: [
      { title: 'Summary', rows: [['Total sales', money(t.total)], ['Number of sales', t.sales_count], ['VAT included', money(t.vat)], ['Discounts given', money(t.discount)], ['Gross profit (ex. VAT)', money(t.profit)], ['Refunds', `${t.refunds_count} sale(s) / ${money(t.refunds_total)}`]] },
      { title: 'Money received by method (net of refunds)', head: ['Method', 'Amount'], rows: [...d.methods.map(m => [mlabel(m.method), money(m.total)]), ...(d.accountPayments || []).map(m => ['Account payment - ' + mlabel(m.method), money(m.total)])] },
      { title: 'Sales by staff', head: ['Staff', 'Sales', 'Total'], rows: d.cashiers.map(c => [c.name, c.n, money(c.total)]) },
      ...(mgr ? [
        { title: 'Expenses', head: ['Category', 'Amount'], rows: (d.expenses || []).map(e => [e.category, money(e.total)]) },
        { title: 'Repairs', rows: [['Jobs received', d.repairs.received], ['Jobs collected / billed', d.repairs.collected]] },
        { title: 'Till sessions', head: ['Opened by', 'Float', 'Expected', 'Counted', 'Difference'], rows: d.tills.map(r => [r.opener, money(r.opening_float), r.closed_at ? money(r.expected_cash) : 'open', r.closed_at ? money(r.counted_cash) : '', r.closed_at ? money(r.variance) : '']) }] : []),
      { title: 'Items sold', head: ['Item', 'Units', 'Value'], rows: d.items.map(i => [i.name, i.units, money(i.revenue)]) },
      { title: 'All sales', head: ['Sale', 'Time', 'Customer', 'Paid by', 'Staff', 'Total'], rows: d.sales.map(s => [s.sale_no + (s.status !== 'completed' ? ' (' + s.status + ')' : ''), new Date(s.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Maseru' }), s.customer || 'Walk-in', s.methods || '', s.cashier, money(s.total)]) },
    ],
  });
  const Row = ({ a, b, bold }) => <tr><td>{bold ? <b>{a}</b> : a}</td><td className="n">{bold ? <b>{b}</b> : b}</td></tr>;
  return (
    <div>
      <div className="row noprint"><h1 className="sp">Daily report</h1>
        <input type="date" value={day} max={today()} onChange={e => setDay(e.target.value)} />
        {mgr && <select value={cashier} onChange={e => setCashier(e.target.value)}><option value="">All staff</option>{staff.filter(s => ['cashier', 'manager', 'owner'].includes(s.role)).map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select>}
        <ExportBar name={'daily-report-' + d.day} build={build} /></div>
      <div className="pr-only" style={{ marginBottom: 10 }}><h1>WilTec Solutions — Mokhotlong, Lesotho</h1></div>
      <p className="muted" style={{ margin: '6px 0 14px' }}>Daily sales report for <b>{d.day}</b> · {who} · printed {dt(new Date())} by {me.name}</p>
      <div className="grid g4" style={{ marginBottom: 14 }}>
        <div className="card stat"><b>{money(t.total)}</b><span>Total sales ({t.sales_count})</span></div>
        <div className="card stat"><b>{money(t.vat)}</b><span>VAT included</span></div>
        <div className="card stat"><b>{money(t.profit)}</b><span>Gross profit (ex. VAT)</span></div>
        <div className="card stat"><b>{money(t.refunds_total)}</b><span>Refunded ({t.refunds_count})</span></div>
      </div>
      <div className="grid g2" style={{ marginBottom: 14 }}>
        <div className="card"><h2>Money received by method (net of refunds)</h2><table><tbody>
          {d.methods.map(m => <Row key={m.method} a={mlabel(m.method)} b={money(m.total)} />)}
          {(d.accountPayments || []).map(m => <Row key={'a' + m.method} a={'Account payments · ' + mlabel(m.method)} b={money(m.total)} />)}
        </tbody></table>{!d.methods.length && <p className="muted">No payments.</p>}</div>
        <div className="card"><h2>{mgr ? 'Sales by staff member' : 'My sales'}</h2><table><tbody>
          {d.cashiers.map(c => <tr key={c.name}><td>{c.name}</td><td className="n">{c.n} sales</td><td className="n">{money(c.total)}</td></tr>)}</tbody></table>
          {!d.cashiers.length && <p className="muted">No sales.</p>}</div>
      </div>
      {mgr && <div className="grid g3" style={{ marginBottom: 14 }}>
        <div className="card"><h2>Expenses</h2><table><tbody>{(d.expenses || []).map(e => <Row key={e.category} a={e.category} b={money(e.total)} />)}</tbody></table>{!d.expenses?.length && <p className="muted">None.</p>}</div>
        <div className="card"><h2>Repairs</h2><table><tbody><Row a="Jobs received" b={d.repairs.received} /><Row a="Jobs collected / billed" b={d.repairs.collected} /></tbody></table></div>
        <div className="card"><h2>Till sessions</h2>{d.tills.map((r, i) => <div key={i} style={{ fontSize: '.9rem' }}>{r.opener}: float {money(r.opening_float)}{r.closed_at ? <> · expected {money(r.expected_cash)} · counted {money(r.counted_cash)} · <b style={{ color: r.variance ? 'var(--bad)' : 'var(--ok)' }}>diff {money(r.variance)}</b></> : ' · still open'}</div>)}{!d.tills.length && <p className="muted">None.</p>}</div>
      </div>}
      <div className="card scroll" style={{ marginBottom: 14 }}><h2>Items sold</h2><table><thead><tr><th>Item</th><th className="n">Units</th><th className="n">Value</th></tr></thead>
        <tbody>{d.items.map(i => <tr key={i.name}><td>{i.name}</td><td className="n">{i.units}</td><td className="n">{money(i.revenue)}</td></tr>)}</tbody></table>{!d.items.length && <p className="muted">Nothing sold.</p>}</div>
      <div className="card scroll"><h2>All sales</h2><table><thead><tr><th>Sale</th><th>Time</th><th>Customer</th><th>Paid by</th><th>Staff</th><th className="n">Total</th></tr></thead>
        <tbody>{d.sales.map(s => <tr key={s.id}><td>{s.sale_no} {s.status !== 'completed' && <span className="tag bad">{s.status}</span>}</td><td>{new Date(s.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Maseru' })}</td><td>{s.customer || 'Walk-in'}</td><td>{s.methods}</td><td>{s.cashier}</td><td className="n">{money(s.total)}</td></tr>)}</tbody></table></div>
    </div>
  );
}
