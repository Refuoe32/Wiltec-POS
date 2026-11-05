'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
// Simple list manager (used for Categories and Brands): add, rename, delete (only when no product uses it)
export default function NameList({ title, noun, endpoint }) {
  const [rows, setRows] = useState([]), [name, setName] = useState(''), [err, setErr] = useState(''), [ok, setOk] = useState('');
  const load = () => api(endpoint).then(setRows).catch(e => setErr(e.message));
  useEffect(() => { load(); }, []);
  async function add() { setErr(''); setOk(''); try { await api(endpoint, { name }); setName(''); load(); setOk(noun + ' saved.'); } catch (e) { setErr(e.message); } }
  async function rename(r) { const n = prompt('New name for "' + r.name + '"', r.name); if (!n || n === r.name) return; setErr(''); try { await api(endpoint, { id: r.id, name: n }, 'PUT'); load(); } catch (e) { setErr(e.message); } }
  async function del(r) { if (!confirm(`Delete ${noun.toLowerCase()} "${r.name}"?`)) return; setErr(''); try { await api(endpoint + '?id=' + r.id, null, 'DELETE'); load(); } catch (e) { setErr(e.message); } }
  return (
    <div style={{ maxWidth: 720 }}>
      <h1>{title}</h1>{err && <div className="err">{err}</div>}{ok && <div className="okmsg">{ok}</div>}
      <div className="card row" style={{ marginBottom: 16 }}>
        <input style={{ flex: 1, minWidth: 220 }} placeholder={`New ${noun.toLowerCase()} name`} value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <button className="btn pri" onClick={add}>Add {noun.toLowerCase()}</button>
      </div>
      <div className="scroll"><table><thead><tr><th>{noun}</th><th className="n">Products</th><th /></tr></thead>
        <tbody>{rows.map(r => <tr key={r.id}><td><b>{r.name}</b></td><td className="n">{r.n}</td>
          <td className="n"><button className="btn sm" onClick={() => rename(r)}>Rename</button> <button className="btn sm bad" onClick={() => del(r)}>Delete</button></td></tr>)}</tbody></table>
        {!rows.length && <p className="muted">Nothing here yet.</p>}</div>
    </div>
  );
}
