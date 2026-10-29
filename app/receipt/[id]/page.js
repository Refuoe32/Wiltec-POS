'use client';
import { useEffect, useState } from 'react';
import { api, money, dt, mlabel } from '@/lib/client';
export default function Receipt({ params }) {
  const [d, setD] = useState(null), [err, setErr] = useState('');
  useEffect(() => { api('/api/sales/' + params.id).then(setD).catch(e => setErr(e.message)); }, [params.id]);
  if (err) return <p style={{ padding: 20 }}>{err}</p>;
  if (!d) return <p style={{ padding: 20 }}>Loading…</p>;
  const { sale, items, payments, settings: st } = d;
  return (
    <div style={{ maxWidth: 320, margin: '0 auto', padding: 12, fontFamily: 'monospace', fontSize: 13 }}>
      <div style={{ textAlign: 'center' }}>
        <b style={{ fontSize: 16 }}>{st.business_name}</b><br />{st.business_address}<br />
        <hr />Receipt {sale.sale_no}{sale.status !== 'completed' && <b> ({sale.status.toUpperCase()})</b>}<br />{dt(sale.created_at)}<br />Served by {sale.cashier}
        {sale.customer && <><br />Customer: {sale.customer}</>}<hr />
      </div>
      {items.map(i => (
        <div key={i.id} style={{ marginBottom: 6 }}>
          {i.description}{i.serial_no && <> (S/N {i.serial_no})</>}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{i.qty} × {Number(i.unit_price).toFixed(2)}{Number(i.discount) > 0 && ` -${Number(i.discount).toFixed(2)}`}</span><span>{Number(i.line_total).toFixed(2)}</span></div>
        </div>
      ))}
      <hr />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15 }}><b>TOTAL</b><b>{money(sale.total)}</b></div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>incl. VAT {st.vat_rate}%</span><span>{Number(sale.vat_amount).toFixed(2)}</span></div>
      <hr />
      {payments.filter(p => Number(p.amount) > 0).map(p => <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between' }}><span>{mlabel(p.method)}</span><span>{Number(p.amount).toFixed(2)}</span></div>)}
      <hr /><div style={{ textAlign: 'center' }}>{st.receipt_footer}</div>
      <p className="noprint" style={{ textAlign: 'center' }}>
        <button className="btn pri" onClick={() => window.print()}>Print</button>{' '}
        {sale.customer_phone && <a className="btn" href={`https://wa.me/${sale.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`${st.business_name} receipt ${sale.sale_no} — total ${money(sale.total)}. ${st.receipt_footer}`)}`} target="_blank">WhatsApp</a>}
      </p>
      <style>{`@page{size:80mm auto;margin:4mm}`}</style>
    </div>
  );
}
