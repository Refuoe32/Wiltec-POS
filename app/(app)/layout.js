'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/client';
import Avatar from '@/components/Avatar';
import Icon from '@/components/Icon';
const IDLE_MIN = 30;   // keep equal to IDLE_MINUTES on the server (default 30)
const ALL = ['owner', 'manager', 'cashier', 'technician'], MGR = ['owner', 'manager'], SELL = ['owner', 'manager', 'cashier'], OWN = ['owner'];
const MENU = [
  ['MAIN', [['/dashboard', 'Dashboard', 'dashboard', MGR], ['/pos', 'POS', 'pos', SELL], ['/touch', 'Keypad POS', 'pos', SELL], ['/repairs', 'Repairs', 'repairs', ALL], ['/tasks', 'My tasks', 'tasks', ALL]]],
  ['CATALOGUE', [['/inventory', 'Products', 'products', ALL], ['/categories', 'Categories', 'categories', MGR], ['/brands', 'Brands', 'brands', MGR], ['/suppliers', 'Suppliers', 'suppliers', MGR], ['/stock', 'Inventory', 'inventory', MGR], ['/purchasing', 'Purchasing', 'purchasing', MGR]]],
  ['SALES', [['/customers', 'Customers', 'customers', SELL], ['/register', 'Till', 'till', SELL], ['/daily', 'Daily report', 'daily', SELL], ['/expenses', 'Expenses', 'expenses', MGR]]],
  ['REPORTS', [['/reports', 'Reports', 'reports', MGR], ['/activity', 'Staff activity', 'activity', MGR], ['/users', 'Staff', 'staff', MGR]]],
  ['SYSTEM', [['/email', 'Send Email', 'mail', MGR], ['/backup', 'System Backup', 'backup', OWN], ['/settings', 'System Settings', 'settings', OWN], ['/account', 'User Settings', 'user', ALL]]],
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
  if (path.startsWith('/touch')) return <>{children}</>;      // the keypad till screen uses the whole screen
  return (
    <div className="app">
      <nav className="side noprint">
        <div className="profile">
          <Link href="/account" className="av" style={{ width: 78, height: 78 }}>{me ? <Avatar photo={me.photo} name={me.name} size={72} round /> : <span style={{ display: 'block', width: 72, height: 72 }} />}</Link>
          <div className="role">{me ? me.role.toUpperCase() + ':' : ' '}</div><div className="nm">{me?.name}</div>
        </div>
        {me && MENU.map(([g, items]) => {
          const vis = items.filter(i => i[3].includes(me.role));
          return vis.length ? <div key={g}><div className="grp">{g}</div>{vis.map(([h, l, ic]) => <Link key={h} href={h} className={path.startsWith(h) ? 'on' : ''}><Icon name={ic} />{l}</Link>)}</div> : null;
        })}
        <div className="fill" />
        <button className="lnk logout" onClick={out}>LOGOUT</button>
      </nav>
      <div className="wrap">
        <header className="top noprint">
          <h2 className="title">WilTec POS System</h2>
          {me && <Link href="/account" className="chip"><span>{me.name}</span></Link>}
        </header>
        <main className="main">{children}</main>
      </div>
    </div>
  );
}
