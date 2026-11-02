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
// Today's date in Lesotho (YYYY-MM-DD), independent of the computer's time zone
export const today = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Maseru' });
export const hm = secs => { const m = Math.round((secs || 0) / 60); return Math.floor(m / 60) + 'h ' + (m % 60) + 'm'; };
// Turns a chosen photo into a passport-size (35x45 mm ratio) JPEG data URL, about 20-40 KB
export function photoFromFile(file) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const W = 300, H = 386, c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d'), r = Math.max(W / img.width, H / img.height), w = img.width * r, h = img.height * r;
      x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); x.drawImage(img, (W - w) / 2, (H - h) / 3, w, h);   // crop keeps the top (face)
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = () => rej(new Error('Could not read that image'));
    img.src = url;
  });
}
