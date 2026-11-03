'use client';
import { useEffect, useRef, useState } from 'react';
import { api, money, dt, mlabel } from '@/lib/client';
export default function Receipt({ params }) {
  const [d, setD] = useState(null), [err, setErr] = useState(''), bar = useRef(null);
  useEffect(() => { api('/api/sales/' + params.id + '?print=1').then(setD).catch(e => setErr(e.message)); }, [params.id]);
  useEffect(() => { if (d && bar.current) import('jsbarcode').then(m => (m.default || m)(bar.current, d.sale.sale_no, { format: 'CODE128', height: 38, fontSize: 12, margin: 0, width: 1.6 })).catch(() => {}); }, [d]);
  if (err) return <p style={{ padding: 20 }}>{err}</p>;
  if (!d) return <p style={{ padding: 20 }}>Loading…</p>;
  const { sale, items, payments, settings: st, reprint } = d;
  const R = ({ a, b, bold, big }) => <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: bold ? 700 : 400, fontSize: big ? 15 : 13 }}><span>{a}</span><span>{b}</span></div>;
  const paid = payments.filter(p => Number(p.amount) > 0), refunded = payments.filter(p => Number(p.amount) < 0);
  const cash = paid.filter(p => p.method === 'cash'), others = paid.filter(p => p.method !== 'cash');
  const tendered = sale.cash_tendered != null ? Number(sale.cash_tendered) : cash.reduce((a, p) => a + Number(p.amount), 0);
  const units = items.reduce((a, i) => a + i.qty, 0), vat = Number(sale.vat_amount), vr = Number(st.vat_rate || 0);
  return (
    <div style={{ maxWidth: 320, margin: '0 auto', padding: 12, fontFamily: 'monospace', fontSize: 13 }}>
      <div style={{ textAlign: 'center' }}>
        <b style={{ fontSize: 17 }}>{st.business_name}</b><br />{st.business_address}{st.business_phone && <><br />Tel: {st.business_phone}</>}{st.vat_number && <><br />VAT Reg No: {st.vat_number}</>}
        <hr />{sale.status === 'refunded' ? <b>REFUNDED SALE</b> : <b>TAX INVOICE</b>}{reprint && <div style={{ border: '1px solid #000', margin: '6px 0', padding: 2 }}><b>DUPLICATE COPY</b></div>}
      </div>
      <R a="Receipt no." b={sale.sale_no} /><R a="Date" b={dt(sale.created_at)} /><R a="Cashier" b={sale.cashier} />{sale.session_id && <R a="Till" b={'#' + sale.session_id} />}{sale.customer && <R a="Customer" b={sale.customer} />}
      <hr />
      {items.map(i => (
        <div key={i.id} style={{ marginBottom: 5 }}>
          <div>{i.description}{i.serial_no && <> (S/N {i.serial_no})</>}</div>
          <R a={`  ${i.qty} x ${Number(i.unit_price).toFixed(2)}`} b={(Number(i.unit_price) * i.qty).toFixed(2)} />
          {Number(i.discount) > 0 && <R a="  Discount" b={'-' + Number(i.discount).toFixed(2)} />}
        </div>))}
      <hr />
      <R a={`Items: ${units}`} b="" />
      {Number(sale.discount) > 0 && <><R a="Subtotal" b={Number(sale.subtotal).toFixed(2)} /><R a={'Discount' + (sale.discount_reason ? ` (${sale.discount_reason})` : '')} b={'-' + Number(sale.discount).toFixed(2)} /></>}
      <R a="TOTAL" b={money(sale.total)} bold big />
      <hr />
      {cash.length > 0 && <><R a="CASH TENDERED" b={money(tendered)} />{Number(sale.change_given) > 0 && <R a="CHANGE" b={money(sale.change_given)} bold />}</>}
      {others.map(p => <R key={p.id} a={mlabel(p.method).toUpperCase() + (p.reference ? ` (${p.reference})` : '')} b={money(p.amount)} />)}
      {refunded.map(p => <R key={p.id} a={'REFUND ' + mlabel(p.method).toUpperCase()} b={money(p.amount)} />)}
      <hr />
      <R a={`VAT ${vr}% included`} b={vat.toFixed(2)} /><R a="Total excl. VAT" b={(Number(sale.total) - vat).toFixed(2)} />
      <hr />
      <div style={{ textAlign: 'center' }}>
        <svg ref={bar} style={{ maxWidth: '100%' }} />
        {st.return_policy && <p style={{ fontSize: 11, margin: '8px 0 4px' }}>{st.return_policy}</p>}
        <div>{st.receipt_footer}</div>
      </div>
      <p className="noprint" style={{ textAlign: 'center' }}>
        <button className="btn pri" onClick={() => window.print()}>Print</button>{' '}
        {sale.customer_phone && <a className="btn" href={`https://wa.me/${sale.customer_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`${st.business_name} receipt ${sale.sale_no} - total ${money(sale.total)}. ${st.receipt_footer}`)}`} target="_blank">WhatsApp</a>}
      </p>
      <style>{`@page{size:80mm auto;margin:4mm}`}</style>
    </div>
  );
}
