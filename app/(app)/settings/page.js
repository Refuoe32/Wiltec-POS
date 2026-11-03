'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
export default function Settings() {
  const [s, setS] = useState(null), [err, setErr] = useState(''), [ok, setOk] = useState('');
  useEffect(() => { api('/api/settings').then(setS).catch(e => setErr(e.message)); }, []);
  async function save() { setErr(''); setOk(''); try { await api('/api/settings', s, 'PUT'); setOk('Settings saved. New receipts will use them.'); } catch (e) { setErr(e.message); } }
  if (!s) return err ? <div className="err">{err}</div> : <p>Loading…</p>;
  const f = (k, l, type = 'text') => <div className="f"><label>{l}</label><input type={type} value={s[k] || ''} onChange={e => setS({ ...s, [k]: e.target.value })} /></div>;
  return (
    <div style={{ maxWidth: 720 }}>
      <h1>Settings</h1>{err && <div className="err">{err}</div>}{ok && <div className="okmsg">{ok}</div>}
      <div className="card">
        <h2>Business details (printed on receipts)</h2>
        <div className="grid g2">{f('business_name', 'Business name')}{f('business_phone', 'Telephone')}{f('business_address', 'Address')}{f('vat_number', 'VAT registration number')}{f('vat_rate', 'VAT rate (%)', 'number')}</div>
        <div className="f" style={{ marginTop: 12 }}><label>Return policy (printed at the bottom of the receipt)</label><textarea rows="3" value={s.return_policy || ''} onChange={e => setS({ ...s, return_policy: e.target.value })} /></div>
        <div className="f" style={{ marginTop: 12 }}><label>Thank-you line</label><input value={s.receipt_footer || ''} onChange={e => setS({ ...s, receipt_footer: e.target.value })} /></div>
        <h2 style={{ marginTop: 20 }}>Till control</h2>
        <label style={{ display: 'block', color: 'var(--ink)', fontSize: '.95rem' }}><input type="checkbox" checked={s.require_open_till !== 'no'} onChange={e => setS({ ...s, require_open_till: e.target.checked ? 'yes' : 'no' })} /> A cashier must open their own till (with a cash float) before they can sell</label>
        <button className="btn pri" style={{ marginTop: 16 }} onClick={save}>Save settings</button>
      </div>
    </div>
  );
}
