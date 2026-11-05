'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api, money, dt, mlabel } from '@/lib/client';
import Icon from '@/components/Icon';
import LineChart from '@/components/LineChart';
export default function Dashboard() {
  const [d, setD] = useState(null), [err, setErr] = useState(''), [me, setMe] = useState({});
  const load = () => api('/api/dashboard').then(setD).catch(e => setErr(e.message));
  useEffect(() => { load(); api('/api/me').then(setMe); const t = setInterval(load, 60000); return () => clearInterval(t); }, []);
  if (err) return <div className="err">{err}</div>;
  if (!d) return <p>Loading…</p>;
  const tile = (cls, href, icon, label, sub) => <Link href={href} className={'tilec ' + cls}><Icon name={icon} size={46} />{label}<small>{sub}</small></Link>;
  return (
    <div>
      <div className="dash-title">Dashboard</div>
      <div className="tiles4">
        {tile('t1', '/inventory', 'products', 'Products', `${d.products} items · ${d.low_stock} low stock`)}
        {tile('t2', '/users', 'customers', 'Users', `${d.staff} staff · ${d.online} online`)}
        {tile('t3', '/reports', 'reports', 'Reports', `Today ${money(d.today_total)} (${d.today_count} sales)`)}
        {tile('t4', me.role === 'owner' ? '/settings' : '/account', 'settings', 'Settings', `${d.open_repairs} open repair jobs`)}
      </div>
      <div className="sect">Sales, profit and expenses · last 14 days</div>
      <LineChart labels={d.daily.map(x => x.day)} series={[
        { name: 'Expenses', color: '#772727', values: d.daily.map(x => x.expenses) },
        { name: 'Sales', color: '#4aa3df', values: d.daily.map(x => x.sales) },
        { name: 'Gross profit', color: '#f0ad5a', values: d.daily.map(x => x.profit) }]} />
      <div className="legend"><span><i style={{ background: '#4aa3df' }} />Sales</span><span><i style={{ background: '#f0ad5a' }} />Gross profit</span><span><i style={{ background: '#772727' }} />Expenses</span></div>
      <div className="sect">RECENT TRANSACTIONS<button className="refresh" title="Refresh" onClick={load}>⟳</button></div>
      <div className="tbl-wrap"><table>
        <thead><tr><th>Receipt</th><th className="n">Total</th><th>Date</th><th className="n">Items</th><th>Payment</th><th>Cashier</th><th>Status</th></tr></thead>
        <tbody>{d.recent.map(r => <tr key={r.id} className="click" onClick={() => window.open('/receipt/' + r.id, '_blank')}>
          <td><b>{r.sale_no}</b></td><td className="n">{money(r.total)}</td><td>{dt(r.created_at)}</td><td className="n">{r.qty}</td><td>{(r.methods || '').split(', ').map(mlabel).join(', ')}</td><td>{r.cashier}</td>
          <td>{r.status === 'completed' ? <span className="tag ok">paid</span> : <span className="tag bad">{r.status}</span>}</td></tr>)}</tbody></table>
        {!d.recent.length && <p className="muted" style={{ padding: 14 }}>No sales yet. Open your till and make the first sale on the POS screen.</p>}</div>
    </div>
  );
}
