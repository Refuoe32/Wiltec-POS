'use client';
import { useState } from 'react';
import { exportCSV, exportPDF } from '@/lib/export';
// build() returns { title, subtitle, sections } for the report currently on screen
export default function ExportBar({ name, build }) {
  const [busy, setBusy] = useState('');
  async function run(kind) {
    setBusy(kind);
    try { const r = build(); if (kind === 'pdf') await exportPDF(name, r); else exportCSV(name, r); }
    catch (e) { alert('Could not create the file: ' + e.message); }
    setBusy('');
  }
  return (
    <div className="row noprint" style={{ gap: 8 }}>
      <button className="btn pri" disabled={!!busy} onClick={() => run('pdf')}>{busy === 'pdf' ? 'Preparing…' : 'Download PDF'}</button>
      <button className="btn" disabled={!!busy} onClick={() => run('csv')}>Download Excel</button>
      <button className="btn" onClick={() => window.print()}>Print</button>
    </div>
  );
}
