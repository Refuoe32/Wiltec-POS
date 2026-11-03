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
// Same result on the server and in the browser (no locale differences): M 1,234.50
export const money = n => {
  const v = Number(n || 0), neg = v < 0, [i, d] = Math.abs(v).toFixed(2).split('.');
  return (neg ? '-' : '') + 'M ' + i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + '.' + d;
};
export const dt = d => (d ? new Date(d).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Maseru' }) : '');   // always Lesotho time
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
// Product picture: centred square crop, 240x240 JPEG (about 10-20 KB)
export function imageToSquare(file, size = 240) {
  return new Promise((res, rej) => {
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const c = document.createElement('canvas'); c.width = size; c.height = size;
      const x = c.getContext('2d'), r = Math.max(size / img.width, size / img.height), w = img.width * r, h = img.height * r;
      x.fillStyle = '#fff'; x.fillRect(0, 0, size, size); x.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', 0.8));
    };
    img.onerror = () => rej(new Error('Could not read that image'));
    img.src = url;
  });
}
export const imgUrl = it => `/api/items/image?id=${it.id}&v=${it.v}`;
export const initials = n => (n || '?').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
