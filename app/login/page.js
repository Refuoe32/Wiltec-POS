'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
export default function Login() {
  const [email, setEmail] = useState(''), [timedOut, setTimedOut] = useState(false), [password, setPassword] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { setTimedOut(location.search.includes('timeout')); }, []);
  async function go(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try { await api('/api/login', { email, password }); location.href = '/pos'; }
    catch (x) { setErr(x.message); setBusy(false); }
  }
  return (
    <div className="login"><form className="card" onSubmit={go}>
      <h1 style={{ marginBottom: 4 }}>WilTec POS</h1>
      <p className="muted" style={{ marginTop: 0 }}>Sign in to start selling</p>
      {timedOut && !err && <div className="err">You were signed out after a period of inactivity. Please sign in again.</div>}
      {err && <div className="err">{err}</div>}
      <div className="f" style={{ marginBottom: 10 }}><label>Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus /></div>
      <div className="f" style={{ marginBottom: 14 }}><label>Password</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
      <button className="btn pri" style={{ width: '100%' }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
    </form></div>
  );
}
