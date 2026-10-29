'use client';
import { useEffect, useState } from 'react';
import { api, money, METHODS, mlabel } from '@/lib/client';
const CATS = ['Rent', 'Electricity', 'Airtime & data', 'Transport', 'Salaries', 'Supplies', 'Marketing', 'Other'];
export default function Expenses() {
  const [rows, setRows] = useState([]), [month, setMonth] = useState(new Date().toISOString().slice(0, 7)), [f, setF] = useState({ category: CATS[0], description: '', amount: '', method: 'cash' }), [err, setErr] = useState('');
  const load = () => api('/api/expenses?month=' + month).then(setRows).catch(e => setErr(e.message));
  useEffect(() => { load(); }, [month]);
  async function add() { setErr(''); try { await api('/api/expenses', f); setF({ ...f, description: '', amount: '' }); load(); } catch (e) { setErr(e.message); } }
  return (
    <div>
      <h1>Expenses</h1>{err && <div className="err">{err}</div>}
      <div className="card row" style={{ marginBottom: 16 }}>
        <select value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>{CATS.map(c => <option key={c}>{c}</option>)}</select>
        <input placeholder="Description" value={f.description} onChange={e => setF({ ...f, description: e.target.value })} />
        <input type="number" step="0.01" placeholder="Amount (M)" style={{ width: 120 }} value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} />
        <select value={f.method} onChange={e => setF({ ...f, method: e.target.value })}>{METHODS.slice(0, 5).map(m => <option key={m[0]} value={m[0]}>{m[1]}</option>)}</select>
        <button className="btn pri" onClick={add}>Add expense</button>
      </div>
      <div className="card scroll"><div className="row"><h2 className="sp">Month total {money(rows.reduce((a, r) => a + Number(r.amount), 0))}</h2><input type="month" value={month} onChange={e => setMonth(e.target.value)} /></div>
        <table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Paid by</th><th className="n">Amount</th></tr></thead>
          <tbody>{rows.map(r => <tr key={r.id}><td>{r.spent_on.slice(0, 10)}</td><td>{r.category}</td><td>{r.description}</td><td>{mlabel(r.method)}</td><td className="n">{money(r.amount)}</td></tr>)}</tbody></table>
        {!rows.length && <p className="muted">No expenses this month.</p>}</div>
    </div>
  );
}
