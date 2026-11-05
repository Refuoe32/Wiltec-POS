'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
export default function Backup() {
  const [photos, setPhotos] = useState(true), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [ok, setOk] = useState(''), [last, setLast] = useState('');
  const [file, setFile] = useState(null), [confirmTxt, setConfirmTxt] = useState(''), [pw, setPw] = useState(''), [me, setMe] = useState({});
  useEffect(() => { api('/api/me').then(setMe); try { setLast(localStorage.getItem('wt_last_backup') || ''); } catch {} }, []);
  async function download() {
    setErr(''); setOk(''); setBusy(true);
    try {
      const r = await fetch('/api/backup?photos=' + (photos ? 1 : 0));
      if (!r.ok) throw new Error(await r.text());
      const blob = await r.blob(), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = (r.headers.get('content-disposition') || '').match(/filename="(.+)"/)?.[1] || 'wiltec-backup.json'; document.body.appendChild(a); a.click(); a.remove();
      const t = new Date().toLocaleString('en-GB', { timeZone: 'Africa/Maseru' }); try { localStorage.setItem('wt_last_backup', t); } catch {} setLast(t);
      setOk('Backup downloaded. Keep the file safe (flash disk, email it to yourself, or Google Drive).');
    } catch (e) { setErr('Could not create the backup: ' + e.message); }
    setBusy(false);
  }
  async function restore() {
    setErr(''); setOk('');
    if (!confirm('This will REPLACE all current data with the backup file. Everyone will be signed out. Continue?')) return;
    setBusy(true);
    try {
      const data = JSON.parse(await file.text());
      await api('/api/backup', { data, confirm: confirmTxt, password: pw });
      alert('Backup restored. Please sign in again.'); location.href = '/login';
    } catch (e) { setErr(e instanceof SyntaxError ? 'That file is not a valid backup.' : e.message); setBusy(false); }
  }
  if (me.role && me.role !== 'owner') return <div className="err">Only the owner can use System Backup.</div>;
  return (
    <div style={{ maxWidth: 720 }}>
      <h1>System Backup</h1>{err && <div className="err">{err}</div>}{ok && <div className="okmsg">{ok}</div>}
      <div className="card" style={{ marginBottom: 16 }}>
        <h2>Download a backup</h2>
        <p className="muted" style={{ marginTop: 0 }}>Saves everything (products, stock, sales, customers, repairs, staff, settings and history) into one file. Do this at the end of every day or at least every week. {last && <b>Last backup from this computer: {last}.</b>}</p>
        <label style={{ color: 'var(--ink)', fontSize: '.95rem' }}><input type="checkbox" checked={photos} onChange={e => setPhotos(e.target.checked)} /> Include staff photos and product pictures (bigger file)</label>
        <button className="btn pri" style={{ marginTop: 12 }} disabled={busy} onClick={download}>{busy ? 'Please wait…' : 'Download backup now'}</button>
      </div>
      <div className="card" style={{ borderColor: '#efc3bf' }}>
        <h2 style={{ color: 'var(--bad)' }}>Restore from a backup file</h2>
        <p className="muted" style={{ marginTop: 0 }}>Replaces <b>all</b> current data with the data in the file. Use only a backup made by this system. Everyone is signed out afterwards.</p>
        <input type="file" accept=".json,application/json" onChange={e => setFile(e.target.files[0] || null)} />
        <div className="grid g2" style={{ marginTop: 12 }}>
          <div className="f"><label>Type RESTORE to confirm</label><input value={confirmTxt} onChange={e => setConfirmTxt(e.target.value)} /></div>
          <div className="f"><label>Your password</label><input type="password" value={pw} onChange={e => setPw(e.target.value)} /></div>
        </div>
        <button className="btn bad" style={{ marginTop: 12 }} disabled={busy || !file || confirmTxt !== 'RESTORE' || !pw} onClick={restore}>Restore this backup</button>
      </div>
    </div>
  );
}
