'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
export default function Email() {
  const [info, setInfo] = useState(null), [custs, setCusts] = useState([]), [sups, setSups] = useState([]), [staff, setStaff] = useState([]);
  const [f, setF] = useState({ to: '', subject: '', message: '' }), [err, setErr] = useState(''), [ok, setOk] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { api('/api/email').then(setInfo); api('/api/customers').then(setCusts); api('/api/suppliers').then(setSups); api('/api/users').then(setStaff); }, []);
  const add = e => { if (!e) return; setF(x => ({ ...x, to: x.to ? x.to + ', ' + e : e })); };
  async function send() {
    setErr(''); setOk(''); setBusy(true);
    try {
      const r = await api('/api/email', f);
      if (r.configured === false) {          // no SMTP account set up: open the person's own email program instead
        location.href = `mailto:${encodeURIComponent(f.to.split(/[,;\s]+/).filter(Boolean).join(','))}?subject=${encodeURIComponent(f.subject)}&body=${encodeURIComponent(f.message)}`;
        setOk('Your email program was opened with the message ready to send.');
      } else { setOk(`Email sent to ${r.sent} recipient(s).`); setF({ to: '', subject: '', message: '' }); }
    } catch (e) { setErr(e.message); }
    setBusy(false);
  }
  return (
    <div style={{ maxWidth: 760 }}>
      <h1>Send Email</h1>
      {info && !info.configured && <div className="card" style={{ marginBottom: 14, background: '#fffaf3', borderColor: '#f0cfa6' }}>No email account is connected yet, so <b>Send</b> will open your own email program (Gmail, Outlook, phone mail) with the message ready. To send straight from the system, ask your developer to add the SMTP settings (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS) to the system settings.</div>}
      {err && <div className="err">{err}</div>}{ok && <div className="okmsg">{ok}</div>}
      <div className="card">
        <div className="row" style={{ marginBottom: 10 }}>
          <select value="" onChange={e => add(e.target.value)}><option value="">Add a customer…</option>{custs.filter(c => c.email).map(c => <option key={c.id} value={c.email}>{c.name} · {c.email}</option>)}</select>
          <select value="" onChange={e => add(e.target.value)}><option value="">Add a supplier…</option>{sups.filter(c => c.email).map(c => <option key={c.id} value={c.email}>{c.name} · {c.email}</option>)}</select>
          <select value="" onChange={e => add(e.target.value)}><option value="">Add a staff member…</option>{staff.filter(c => c.email).map(c => <option key={c.id} value={c.email}>{c.full_name} · {c.email}</option>)}</select>
        </div>
        <div className="f" style={{ marginBottom: 10 }}><label>To (separate several addresses with commas)</label><input value={f.to} onChange={e => setF({ ...f, to: e.target.value })} /></div>
        <div className="f" style={{ marginBottom: 10 }}><label>Subject</label><input value={f.subject} onChange={e => setF({ ...f, subject: e.target.value })} /></div>
        <div className="f" style={{ marginBottom: 14 }}><label>Message</label><textarea rows="9" value={f.message} onChange={e => setF({ ...f, message: e.target.value })} /></div>
        <button className="btn pri" disabled={busy} onClick={send}>{busy ? 'Sending…' : 'Send email'}</button>
      </div>
    </div>
  );
}
