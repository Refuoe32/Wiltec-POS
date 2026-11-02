'use client';
import { useEffect, useRef, useState } from 'react';
// Scans barcodes with the phone/laptop camera. Needs https (or localhost) and camera permission.
export default function CameraScanner({ onScan, onClose, title = 'Scan barcode', keepOpen = false }) {
  const video = useRef(null); const [err, setErr] = useState(''), [last, setLast] = useState('');
  useEffect(() => {
    let controls, stopped = false, prev = '', prevT = 0;
    (async () => {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        controls = await new BrowserMultiFormatReader().decodeFromConstraints({ video: { facingMode: 'environment' } }, video.current, res => {
          if (!res || stopped) return;
          const t = res.getText(), now = Date.now();
          if (t === prev && now - prevT < 1800) return;      // ignore the same code read twice in a row
          prev = t; prevT = now; setLast(t); onScan(t);
          if (!keepOpen) onClose();
        });
      } catch (e) { setErr('Cannot open the camera: ' + (e.message || e) + '. Allow camera permission (and use https or localhost).'); }
    })();
    return () => { stopped = true; try { controls?.stop(); } catch {} };
  }, []);
  return (
    <div className="modal"><div className="card">
      <h2>{title}</h2>
      {err ? <div className="err">{err}</div> : <video ref={video} style={{ width: '100%', borderRadius: 8, background: '#000' }} muted playsInline />}
      {last && <p className="muted">Last scanned: <b>{last}</b></p>}
      <p className="muted" style={{ fontSize: '.85rem' }}>Hold the barcode steady inside the camera view.{keepOpen && ' The camera stays open so you can scan the next item.'}</p>
      <button className="btn pri" style={{ width: '100%' }} onClick={onClose}>Done</button>
    </div></div>
  );
}
