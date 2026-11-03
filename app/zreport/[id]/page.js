'use client';
import { useEffect, useState } from 'react';
import { api, money, dt, mlabel } from '@/lib/client';
export default function ZReport({ params }) {
  const [d, setD] = useState(null), [err, setErr] = useState('');
  useEffect(() => { api('/api/register/' + params.id).then(setD).catch(e => setErr(e.message)); }, [params.id]);
  if (err) return <p style={{ padding: 20 }}>{err}</p>;
  if (!d) return <p style={{ padding: 20 }}>Loading…</p>;
  const { sess, sum, sales, voids, blind } = d, closed = !!sess.closed_at;
  const R = ({ a, b, bold }) => <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: bold ? 700 : 400 }}><span>{a}</span><span>{b}</span></div>;
  return (
    <div style={{ maxWidth: 380, margin: '0 auto', padding: 14, fontFamily: 'monospace', fontSize: 13 }}>
      <div style={{ textAlign: 'center' }}><b style={{ fontSize: 16 }}>WilTec Solutions</b><br />{closed ? 'Z REPORT - CASH UP' : 'X REPORT - INTERIM (till still open)'}<hr /></div>
      <R a="Till no." b={'#' + sess.id} /><R a="Cashier" b={sess.opener} /><R a="Opened" b={dt(sess.opened_at)} />
      {closed && <R a="Closed" b={dt(sess.closed_at)} />}<R a="Printed" b={dt(new Date())} /><hr />
      <R a="Starting float" b={money(sess.opening_float)} /><R a="Number of sales" b={sum.sales_count} /><R a="TOTAL SALES" b={money(sum.sales_total)} bold />
      <R a="Discounts given" b={money(sum.discounts)} /><R a={`Refunds (${sum.refunds_count})`} b={money(sum.refunds_total)} /><R a="Voids / cancelled" b={sum.voids} /><hr />
      <b>Takings by payment type</b>{sum.methods.map(m => <R key={m.method} a={mlabel(m.method)} b={money(m.total)} />)}<hr />
      <R a="Cash expenses paid" b={money(sum.cash_expenses)} />
      {!blind && <R a="CASH EXPECTED" b={money(sum.expected_cash)} bold />}
      {closed && <><R a="CASH COUNTED" b={money(sess.counted_cash)} bold /><R a="DIFFERENCE" b={money(sess.variance)} bold />{sess.note && <div>Note: {sess.note}</div>}</>}
      {blind && <div style={{ marginTop: 6 }}>Cash expected is shown after you cash up.</div>}<hr />
      <b>Sales ({sales.length})</b>{sales.map(s => <R key={s.sale_no} a={`${s.sale_no}${s.status !== 'completed' ? ' (' + s.status + ')' : ''} ${s.methods || ''}`} b={Number(s.total).toFixed(2)} />)}
      {voids.length > 0 && <><hr /><b>Voids ({voids.length})</b>{voids.map((v, i) => <div key={i}>{new Date(v.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} {v.action === 'pos.cancel_sale' ? 'Order cancelled' : 'Line removed'}: {v.details?.item || (v.details?.lines + ' lines')} {v.details?.total != null && '(' + Number(v.details.total).toFixed(2) + ')'}</div>)}</>}
      <hr /><div style={{ marginTop: 26 }}>Cashier: ________________</div><div style={{ marginTop: 22 }}>Manager: ________________</div>
      <p className="noprint" style={{ textAlign: 'center', marginTop: 20 }}><button className="btn pri" onClick={() => window.print()}>Print</button> <a className="btn" href="/register">Back to till</a></p>
      <style>{`@page{size:80mm auto;margin:4mm}`}</style>
    </div>
  );
}
