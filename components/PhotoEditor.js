'use client';
import { useEffect, useRef, useState } from 'react';
const FW = 260, FH = Math.round(260 * 45 / 35);          // on-screen frame, passport ratio 35:45
const OUT_W = 413, OUT_H = 531;                           // saved size = 35x45 mm at 300 dpi
const base = im => Math.max(FW / im.width, FH / im.height);
// place the point (cx,cy) of the picture on the frame's eye-line, then keep the picture covering the frame
const place = (im, z, cx, cy) => {
  const s = base(im) * z, dw = im.width * s, dh = im.height * s;
  return { x: Math.min(0, Math.max(FW - dw, FW / 2 - cx * s)), y: Math.min(0, Math.max(FH - dh, FH * 0.42 - cy * s)) };
};
// Finds the person on a plain background by comparing every pixel with the colour of the picture's edges
function subjectBox(img) {
  const W = 80, H = Math.max(8, Math.round(80 * img.height / img.width)), c = document.createElement('canvas'); c.width = W; c.height = H;
  const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, W, H);
  const d = x.getImageData(0, 0, W, H).data, px = (i, j) => { const k = (j * W + i) * 4; return [d[k], d[k + 1], d[k + 2]]; };
  let r = 0, g = 0, b = 0, n = 0; const add = p => { r += p[0]; g += p[1]; b += p[2]; n++; };
  for (let i = 0; i < W; i++) { add(px(i, 0)); add(px(i, 1)); add(px(i, H - 1)); add(px(i, H - 2)); }
  for (let j = 0; j < H; j++) { add(px(0, j)); add(px(1, j)); add(px(W - 1, j)); add(px(W - 2, j)); }
  r /= n; g /= n; b /= n;
  const cols = Array(W).fill(0), rows = Array(H).fill(0);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const p = px(i, j); if (Math.abs(p[0] - r) + Math.abs(p[1] - g) + Math.abs(p[2] - b) > 90) { cols[i]++; rows[j]++; } }
  const mc = Math.max(2, H * 0.04), mr = Math.max(2, W * 0.04);
  const x0 = cols.findIndex(v => v >= mc), y0 = rows.findIndex(v => v >= mr);
  const x1 = W - 1 - [...cols].reverse().findIndex(v => v >= mc), y1 = H - 1 - [...rows].reverse().findIndex(v => v >= mr);
  if (x0 < 0 || y0 < 0 || x1 <= x0 || y1 <= y0) return null;
  const k = img.width / W; return { x0: x0 * k, x1: (x1 + 1) * k, y0: y0 * k, y1: (y1 + 1) * k };
}
export default function PhotoEditor({ file, onSave, onCancel }) {
  const [im, setIm] = useState(null), [zoom, setZoom] = useState(1), [pos, setPos] = useState({ x: 0, y: 0 }), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false);
  const drag = useRef(null);
  const s = im ? base(im) * zoom : 1;

  async function autoFit(img) {            // centre the face (browsers that can detect faces), otherwise centre the upper body
    let z = 1, cx = img.width / 2, cy = img.height * 0.38; setMsg('');
    try {      // person on a plain background: centre on them and zoom so head and shoulders fill the frame
      const sb = subjectBox(img);
      if (sb) { const bh = sb.y1 - sb.y0; cx = (sb.x0 + sb.x1) / 2; cy = sb.y0 + 0.2 * bh; z = Math.min(2.2, Math.max(1, (0.9 * img.height) / bh)); setMsg('Photo fitted automatically. Adjust if you like, then save.'); }
    } catch {}
    try {
      if ('FaceDetector' in window) {
        const f = await new window.FaceDetector({ fastMode: true, maxDetectedFaces: 1 }).detect(img);
        if (f[0]) { const b = f[0].boundingBox; cx = b.x + b.width / 2; cy = b.y + b.height / 2; z = Math.min(3, Math.max(1, (FH * 0.4) / (b.height * base(img)))); setMsg('Face found and centred automatically.'); }
      }
    } catch {}
    setZoom(z); setPos(place(img, z, cx, cy));
  }
  useEffect(() => {
    const url = URL.createObjectURL(file), img = new Image();
    img.onload = () => { setIm(img); autoFit(img); };
    img.src = url; return () => URL.revokeObjectURL(url);
  }, [file]);

  const clampPos = (p, z) => { const sc = base(im) * z; return { x: Math.min(0, Math.max(FW - im.width * sc, p.x)), y: Math.min(0, Math.max(FH - im.height * sc, p.y)) }; };
  function onZoom(z) {                     // zoom around the middle of the frame
    const cx = (FW / 2 - pos.x) / s, cy = (FH / 2 - pos.y) / s, sc = base(im) * z;
    setZoom(z); setPos(clampPos({ x: FW / 2 - cx * sc, y: FH / 2 - cy * sc }, z));
  }
  const down = e => { drag.current = { sx: e.clientX, sy: e.clientY, p: pos }; e.currentTarget.setPointerCapture(e.pointerId); };
  const move = e => { if (drag.current) setPos(clampPos({ x: drag.current.p.x + e.clientX - drag.current.sx, y: drag.current.p.y + e.clientY - drag.current.sy }, zoom)); };
  const up = () => { drag.current = null; };
  async function save() {
    setBusy(true);
    const c = document.createElement('canvas'); c.width = OUT_W; c.height = OUT_H; const k = OUT_W / FW, x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, OUT_W, OUT_H); x.drawImage(im, pos.x * k, pos.y * k, im.width * s * k, im.height * s * k);
    try { await onSave(c.toDataURL('image/jpeg', 0.88)); } finally { setBusy(false); }
  }
  return (
    <div className="modal"><div className="card" style={{ maxWidth: 380 }}>
      <h2>Passport photo</h2>
      {!im ? <p className="muted">Loading picture…</p> : <>
        <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ width: FW, height: FH, position: 'relative', overflow: 'hidden', borderRadius: 6, background: '#ddd', margin: '0 auto', touchAction: 'none', cursor: 'grab', border: '2px solid var(--green)' }}>
          <img src={im.src} alt="" draggable={false} style={{ position: 'absolute', left: pos.x, top: pos.y, width: im.width * s, height: im.height * s, maxWidth: 'none', userSelect: 'none', pointerEvents: 'none' }} />
          <div style={{ position: 'absolute', left: '50%', top: '9%', width: '54%', height: '46%', transform: 'translateX(-50%)', border: '2px dashed rgba(255,255,255,.9)', borderRadius: '50%', pointerEvents: 'none', boxShadow: '0 0 0 1px rgba(0,0,0,.25)' }} />
        </div>
        <p className="muted" style={{ fontSize: '.82rem', textAlign: 'center' }}>{msg || 'Drag the picture so the face sits inside the oval. Zoom with the slider.'}</p>
        <div className="row" style={{ flexWrap: 'nowrap' }}><span className="muted">−</span><input type="range" min="1" max="3" step="0.01" value={zoom} onChange={e => onZoom(Number(e.target.value))} style={{ flex: 1, padding: 0 }} /><span className="muted">+</span></div>
        <div className="row" style={{ marginTop: 14 }}>
          <button className="btn pri sp" disabled={busy} onClick={save}>{busy ? 'Saving…' : 'Save photo'}</button>
          <button className="btn" onClick={() => autoFit(im)}>Auto-fit</button><button className="btn" onClick={onCancel}>Cancel</button></div></>}
    </div></div>
  );
}
