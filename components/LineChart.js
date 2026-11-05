'use client';
// Smooth multi-line chart (no libraries). series = [{ name, color, values: [] }], labels = []
const W = 900, H = 250, L = 56, R = 18, T = 14, B = 34;
function curve(pts) {                       // smooth curve through the points (Catmull-Rom converted to Bezier)
  let d = `M${pts[0][0]},${pts[0][1]}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
    const cl = y => Math.min(H - B, Math.max(T, y));
    d += ` C${p1[0] + (p2[0] - p0[0]) / 6},${cl(p1[1] + (p2[1] - p0[1]) / 6)} ${p2[0] - (p3[0] - p1[0]) / 6},${cl(p2[1] - (p3[1] - p1[1]) / 6)} ${p2[0]},${p2[1]}`;
  }
  return d;
}
const nice = v => v >= 1000 ? (v / 1000).toFixed(v >= 10000 ? 0 : 1) + 'k' : String(Math.round(v));
export default function LineChart({ series, labels }) {
  const max = Math.max(1, ...series.flatMap(s => s.values)), n = labels.length;
  const x = i => L + (n === 1 ? 0 : (i * (W - L - R)) / (n - 1)), y = v => H - B - (v / max) * (H - B - T);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }} role="img" aria-label="Sales, profit and expenses chart">
      {[0, 0.5, 1].map(f => <g key={f}><line x1={L} x2={W - R} y1={y(max * f)} y2={y(max * f)} stroke="#e4eaf0" /><text x={L - 8} y={y(max * f) + 4} fontSize="11" fill="#8a98a1" textAnchor="end">{nice(max * f)}</text></g>)}
      {labels.map((l, i) => i % 2 === 0 && <text key={i} x={x(i)} y={H - 10} fontSize="10.5" fill="#8a98a1" textAnchor="middle">{l}</text>)}
      {series.map(s => {
        const pts = s.values.map((v, i) => [x(i), y(v)]);
        return <g key={s.name}><path d={curve(pts)} fill="none" stroke={s.color} strokeWidth="2.2" strokeLinecap="round" />
          {pts.map((p, i) => <circle key={i} cx={p[0]} cy={p[1]} r="4" fill={s.color}><title>{`${labels[i]} · ${s.name}: M ${s.values[i].toFixed(2)}`}</title></circle>)}</g>;
      })}
    </svg>
  );
}
