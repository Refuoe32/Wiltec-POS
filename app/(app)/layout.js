'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/client';
import Avatar from '@/components/Avatar';
const IDLE_MIN = 30;   // keep equal to IDLE_MINUTES on the server (default 30)
const NAV = [
  ['/pos', 'Sell', ['owner', 'manager', 'cashier']],
  ['/tasks', 'My tasks', ['owner', 'manager', 'cashier', 'technician']],
  ['/repairs', 'Repairs', ['owner', 'manager', 'cashier', 'technician']],
  ['/inventory', 'Inventory', ['owner', 'manager', 'cashier', 'technician']],
  ['/customers', 'Customers', ['owner', 'manager', 'cashier']],
  ['/purchasing', 'Purchasing', ['owner', 'manager']],
  ['/register', 'Till', ['owner', 'manager', 'cashier']],
  ['/daily', 'Daily report', ['owner', 'manager', 'cashier']],
  ['/expenses', 'Expenses', ['owner', 'manager']],
  ['/dashboard', 'Reports', ['owner', 'manager']],
  ['/activity', 'Staff activity', ['owner', 'manager']],
  ['/users', 'Staff', ['owner', 'manager']],
  ['/account', 'My account', ['owner', 'manager', 'cashier', 'technician']],
];
export default function AppLayout({ children }) {
  const [me, setMe] = useState(null); const path = usePathname(); const lastAct = useRef(Date.now());
  useEffect(() => { api('/api/me').then(setMe).catch(() => {}); }, []);
  // Auto sign-out after inactivity + a heartbeat so active people are never timed out
  useEffect(() => {
    const mark = () => { lastAct.current = Date.now(); };
    const ev = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    ev.forEach(e => window.addEventListener(e, mark, { passive: true }));
    const t = setInterval(async () => {
      const idle = Date.now() - lastAct.current;
      if (idle > IDLE_MIN * 60000) { await api('/api/logout', { reason: 'timeout' }).catch(() => {}); location.href = '/login?timeout=1'; }
      else if (idle < 4 * 60000) api('/api/me').catch(() => {});
    }, 60000);
    return () => { ev.forEach(e => window.removeEventListener(e, mark)); clearInterval(t); };
  }, []);
  async function out() { await api('/api/logout', {}); location.href = '/login'; }
  return (
    <div className="app">
      <nav className="side noprint">
        <div className="brand">WilTec POS<small>Mokhotlong, Lesotho</small></div>
        {me && NAV.filter(n => n[2].includes(me.role)).map(([h, l]) => <Link key={h} href={h} className={path.startsWith(h) ? 'on' : ''}>{l}</Link>)}
        <div className="who">{me && <Avatar photo={me.photo} name={me.name} size={46} />}<div style={{ marginTop: 6 }}>{me?.name}</div>{me?.role} · <a href="#" onClick={e => { e.preventDefault(); out(); }} style={{ color: '#9fd8cf' }}>Sign out</a></div>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
