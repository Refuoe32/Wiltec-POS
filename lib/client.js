export async function api(url, body, method) {
  const r = await fetch(url, {
    method: method || (body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) {
    if (r.status === 401 && typeof location !== 'undefined') location.href = '/login';
    throw new Error(j.error || 'Request failed');
  }
  return j;
}
export const money = n => 'M ' + Number(n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const dt = d => (d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '');
export const METHODS = [['cash', 'Cash'], ['mpesa', 'M-Pesa'], ['ecocash', 'EcoCash'], ['card', 'Card'], ['bank_transfer', 'Bank transfer'], ['credit_account', 'On account']];
export const mlabel = m => (METHODS.find(x => x[0] === m) || [0, m])[1];
