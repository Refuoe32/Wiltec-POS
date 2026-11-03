'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/client';
import Avatar from '@/components/Avatar';
const IDLE_MIN = 30;   // keep equal to IDLE_MINUTES on the server (default 30)
const ALL = ['owner', 'manager', 'cashier', 'technician'], MGR = ['owner', 'manager'], SELL = ['owner', 'manager', 'cashier'];
const NAV = [
  ['/pos', 'POS', SELL], ['/repairs', 'Repairs', ALL], ['/inventory', 'Inventory', ALL], ['/stock', 'Stock', MGR], ['/customers', 'Customers', SELL],
  ['/purchasing', 'Purchasing', MGR], ['/register', 'Till', SELL], ['/daily', 'Daily report', SELL], ['/expenses', 'Expenses', MGR],
  ['/dashboard', 'Reports', MGR], ['/activity', 'Staff activity', MGR], ['/users', 'Staff', MGR], ['/tasks', 'My tasks', ALL],
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
        <div className="brand">WILTEC SYSTEMS<small>Mokhotlong, Lesotho</small></div>
        {me && NAV.filter(n => n[2].includes(me.role)).map(([h, l]) => <Link key={h} href={h} className={path.startsWith(h) ? 'on' : ''}>{l}</Link>)}
        <div className="fill" />
        {me?.role === 'owner' && <Link href="/settings" className={path.startsWith('/settings') ? 'on' : ''}>Settings</Link>}
        <Link href="/account" className={path.startsWith('/account') ? 'on' : ''}>My account</Link>
        <button className="lnk" onClick={out}>Logout</button>
      </nav>
      <div className="wrap">
        <header className="top noprint">
          <span>Hello, <b>{me?.name || '…'}</b> <span className="muted">· {me?.role}</span></span>
          {me && <Link href="/account"><Avatar photo={me.photo} name={me.name} size={38} round /></Link>}
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
