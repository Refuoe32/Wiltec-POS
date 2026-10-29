'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '@/lib/client';
const NAV = [
  ['/pos', 'Sell', ['owner', 'manager', 'cashier']],
  ['/repairs', 'Repairs', ['owner', 'manager', 'cashier', 'technician']],
  ['/inventory', 'Inventory', ['owner', 'manager', 'cashier', 'technician']],
  ['/customers', 'Customers', ['owner', 'manager', 'cashier']],
  ['/purchasing', 'Purchasing', ['owner', 'manager']],
  ['/register', 'Till', ['owner', 'manager', 'cashier']],
  ['/expenses', 'Expenses', ['owner', 'manager']],
  ['/dashboard', 'Reports', ['owner', 'manager']],
  ['/users', 'Staff', ['owner']],
];
export default function AppLayout({ children }) {
  const [me, setMe] = useState(null); const path = usePathname();
  useEffect(() => { api('/api/me').then(setMe).catch(() => {}); }, []);
  async function out() { await api('/api/logout', {}); location.href = '/login'; }
  return (
    <div className="app">
      <nav className="side noprint">
        <div className="brand">WilTec POS<small>Mokhotlong, Lesotho</small></div>
        {me && NAV.filter(n => n[2].includes(me.role)).map(([h, l]) => <Link key={h} href={h} className={path.startsWith(h) ? 'on' : ''}>{l}</Link>)}
        <div className="who">{me?.name}<br />{me?.role} · <a href="#" onClick={e => { e.preventDefault(); out(); }} style={{ color: '#9fd8cf' }}>Sign out</a></div>
      </nav>
      <main className="main">{children}</main>
    </div>
  );
}
