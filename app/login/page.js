'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
export default function Login() {
  const [mode, setMode] = useState('login'), [busy, setBusy] = useState(false), [err, setErr] = useState(''), [done, setDone] = useState(false), [timedOut, setTimedOut] = useState(false);
  const [f, setF] = useState({ email: '', password: '' }), [remember, setRemember] = useState(true);
  const [r, setR] = useState({ full_name: '', email: '', phone: '', password: '', again: '' });
  useEffect(() => {
    setTimedOut(location.search.includes('timeout'));
    try { const e = localStorage.getItem('wt_email'); if (e) setF(x => ({ ...x, email: e })); } catch {}
  }, []);
  async function login(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const res = await api('/api/login', f);
      try { remember ? localStorage.setItem('wt_email', f.email) : localStorage.removeItem('wt_email'); } catch {}
      location.href = res.role === 'technician' ? '/tasks' : '/pos';
    } catch (x) { setErr(x.message); setBusy(false); }
  }
  async function register(e) {
    e.preventDefault(); setErr('');
    if (r.password !== r.again) return setErr('The two passwords do not match');
    setBusy(true);
    try { await api('/api/signup', r); setDone(true); } catch (x) { setErr(x.message); }
    setBusy(false);
  }
  const go = m => { setMode(m); setErr(''); setDone(false); };
  return (
    <div className="auth">
      <div className="auth-left">
        <div className="auth-brand"><h1>WilTec Solutions</h1><p>Point of sale and shop management system</p><p className="muted" style={{ fontSize: '.9rem' }}>IT Services, Repairs &amp; Tech Shop · Mokhotlong, Lesotho</p></div>
        <div className="auth-card">
          {mode === 'login' ? (
            <form onSubmit={login}>
              <h2>Login</h2>
              {timedOut && !err && <div className="err">You were signed out after a period of inactivity. Please sign in again.</div>}
              {err && <div className="err">{err}</div>}
              <div className="afield"><label>Email address</label><input type="email" value={f.email} onChange={e => setF({ ...f, email: e.target.value })} placeholder="name@example.com" required autoFocus /></div>
              <div className="afield"><label>Password</label><input type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} placeholder="Your password" required /></div>
              <div className="row" style={{ margin: '4px 0 20px', gap: 10 }}><label className="switch"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /><span /></label><span style={{ fontSize: '.88rem' }}>Remember my email</span></div>
              <button className="abtn" disabled={busy}>{busy ? 'Signing in…' : 'Log in'}</button>
              <div className="alt">New staff member?</div>
              <button type="button" className="btn out block" onClick={() => go('register')}>Register</button>
            </form>
          ) : done ? (
            <div>
              <h2>Registration received</h2>
              <div className="okmsg">Thank you, {r.full_name.split(' ')[0]}. The owner or a manager must approve your account before you can sign in.</div>
              <p className="muted">Ask them to open <b>Staff</b> in the system and approve “{r.email}”. After that, come back here and log in with your email and password.</p>
              <button className="abtn" onClick={() => { setF({ email: r.email, password: '' }); go('login'); }}>Back to login</button>
            </div>
          ) : (
            <form onSubmit={register}>
              <h2>Register</h2>
              {err && <div className="err">{err}</div>}
              <div className="afield"><label>Full name</label><input value={r.full_name} onChange={e => setR({ ...r, full_name: e.target.value })} required autoFocus /></div>
              <div className="afield"><label>Email address</label><input type="email" value={r.email} onChange={e => setR({ ...r, email: e.target.value })} required /></div>
              <div className="afield"><label>Phone (optional)</label><input value={r.phone} onChange={e => setR({ ...r, phone: e.target.value })} /></div>
              <div className="grid g2" style={{ gap: 12 }}>
                <div className="afield"><label>Password</label><input type="password" value={r.password} onChange={e => setR({ ...r, password: e.target.value })} minLength={6} required /></div>
                <div className="afield"><label>Repeat password</label><input type="password" value={r.again} onChange={e => setR({ ...r, again: e.target.value })} required /></div>
              </div>
              <p className="muted" style={{ fontSize: '.8rem', margin: '0 0 16px' }}>Your account will be active after the owner or a manager approves it.</p>
              <button className="abtn" disabled={busy}>{busy ? 'Sending…' : 'Submit registration'}</button>
              <div className="alt">Already registered?</div>
              <button type="button" className="btn out block" onClick={() => go('login')}>Back to login</button>
            </form>
          )}
        </div>
      </div>
      <div className="auth-art">
        <span className="ring r1" /><span className="ring r2" /><span className="ring r3" />
        <div className="tag-line">WILTEC SOLUTIONS · MOKHOTLONG, LESOTHO</div>
        <div className="copy">
          <h2>Sales, repairs and stock in one system.</h2>
          <ul><li>Fast checkout with barcode scanning</li><li>Repair jobs from intake to collection</li><li>Stock, staff and daily reports you can print or download</li></ul>
        </div>
      </div>
    </div>
  );
}
