'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import PhotoEditor from '@/components/PhotoEditor';
import Avatar from '@/components/Avatar';
export default function Account() {
  const [me, setMe] = useState({}), [f, setF] = useState({ current: '', password: '', again: '' }), [err, setErr] = useState(''), [ok, setOk] = useState(''), [edit, setEdit] = useState(null);
  const load = () => api('/api/me').then(setMe);
  useEffect(() => { load(); }, []);
  async function savePhoto(photo) { setErr(''); try { await api('/api/users/photo', { photo }); setEdit(null); setOk('Photo updated.'); load(); setTimeout(() => location.reload(), 600); } catch (e) { setErr(e.message); setEdit(null); } }
  async function save() {
    setErr(''); setOk('');
    if (f.password !== f.again) return setErr('The two new passwords do not match');
    try { await api('/api/account', { current: f.current, password: f.password }); setOk('Password changed.'); setF({ current: '', password: '', again: '' }); } catch (e) { setErr(e.message); }
  }
  return (
    <div style={{ maxWidth: 440 }}>
      <h1>My account</h1>
      {err && <div className="err">{err}</div>}{ok && <div className="okmsg">{ok}</div>}
      <div className="card row" style={{ marginBottom: 16, alignItems: 'flex-start' }}>
        <Avatar photo={me.photo} name={me.name} size={110} />
        <div className="sp"><h2 style={{ marginBottom: 2 }}>{me.name}</h2><div className="muted">{me.role}<br />{me.email}</div>
          <label className="btn" style={{ display: 'inline-block', marginTop: 10 }}>{me.photo ? 'Change photo' : 'Upload passport photo'}
            <input type="file" accept="image/*" capture="user" hidden onChange={e => { setEdit(e.target.files[0] || null); e.target.value = ''; }} /></label>
          {me.photo && <button className="btn bad" style={{ marginLeft: 8 }} onClick={async () => { await api('/api/users/photo', { photo: null }); load(); }}>Remove</button>}
          <p className="muted" style={{ fontSize: '.8rem', marginBottom: 0 }}>Use a plain background, face centered. The picture is cropped to passport size automatically.</p></div>
      </div>
      <div className="card">
        <h2>Change my password</h2>
        {[['current', 'Current password'], ['password', 'New password (6+ characters)'], ['again', 'Type the new password again']].map(([k, l]) =>
          <div className="f" key={k} style={{ marginBottom: 10 }}><label>{l}</label><input type="password" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></div>)}
        <button className="btn pri" onClick={save}>Save new password</button>
      </div>
      {edit && <PhotoEditor file={edit} onSave={savePhoto} onCancel={() => setEdit(null)} />}
    </div>
  );
}
