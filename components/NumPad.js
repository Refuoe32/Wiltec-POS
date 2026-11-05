'use client';
// Touch number pad: 1-9, Del, 0, "." (same layout as the till screen)
export default function NumPad({ onKey }) {
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', '.'];
  return <div className="tp-pad">{keys.map(k => <button key={k} type="button" className="tbtn tkey" onClick={() => onKey(k)}>{k === 'del' ? 'Del' : k}</button>)}</div>;
}
