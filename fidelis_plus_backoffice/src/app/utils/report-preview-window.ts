export type ReportPreviewKpi = { label: string; value: string; accent?: 'brand' | 'error' | 'neutral' };

export type ReportPreviewOptions = {
  title: string;
  subject?: string;
  generatedAt?: string;
  meta?: { label: string; value: string }[];
  kpis?: ReportPreviewKpi[];
  tableTitle?: string;
  columns?: [string, string];
  rows?: { label: string; value: string; hint?: string }[];
};

function escapeHtml(v: any): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export function openReportPreviewWindow(opts: ReportPreviewOptions): void {
  const w = window.open('', '_blank');
  if (!w) return;

  const title = escapeHtml(opts.title);
  const subject = escapeHtml(opts.subject || 'Synthèse');
  const generatedAt = escapeHtml(opts.generatedAt || new Date().toLocaleString());
  const meta = opts.meta ?? [];
  const kpis = opts.kpis ?? [];
  const rows = opts.rows ?? [];
  const tableTitle = escapeHtml(opts.tableTitle || 'Détails');
  const colA = escapeHtml(opts.columns?.[0] || 'Indicateur');
  const colB = escapeHtml(opts.columns?.[1] || 'Valeur');

  const kpiHtml = kpis.length
    ? `<div class="grid">
        ${kpis
          .map((k) => {
            const accentClass = k.accent === 'error' ? 'kpiError' : k.accent === 'neutral' ? 'kpiNeutral' : 'kpiBrand';
            return `<div class="card">
              <div class="label">${escapeHtml(k.label)}</div>
              <div class="valueBig ${accentClass}">${escapeHtml(k.value)}</div>
            </div>`;
          })
          .join('')}
      </div>`
    : '';

  const metaHtml = meta.length
    ? `<div class="metaGrid">
        ${meta
          .map(
            (m) => `<div class="metaCard">
              <div class="label">${escapeHtml(m.label)}</div>
              <div class="metaValue">${escapeHtml(m.value)}</div>
            </div>`
          )
          .join('')}
      </div>`
    : '';

  const rowsHtml = rows
    .map(
      (r) => `<tr>
        <td>
          <div class="rowLabel">${escapeHtml(r.label)}</div>
          ${r.hint ? `<div class="rowHint">${escapeHtml(r.hint)}</div>` : ''}
        </td>
        <td class="right">${escapeHtml(r.value)}</td>
      </tr>`
    )
    .join('');

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    :root { --ink:#0f172a; --muted:#64748b; --brand:#006B5D; --bg:#f8fafc; --card:#ffffff; --line:#e2e8f0; --error:#b91c1c; }
    *{ box-sizing:border-box; }
    body{ margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--ink); background:var(--bg); }
    .toolbar{ position:sticky; top:0; z-index:10; background:rgba(248,250,252,.92); backdrop-filter: blur(10px); border-bottom:1px solid var(--line); padding:14px 18px; display:flex; gap:10px; justify-content:flex-end; }
    .btn{ border:1px solid var(--line); background:var(--card); padding:10px 12px; border-radius:12px; font-weight:900; text-transform:uppercase; letter-spacing:.12em; font-size:11px; cursor:pointer; }
    .btnPrimary{ background:var(--brand); color:#fff; border-color:var(--brand); }
    .page{ width:210mm; min-height:297mm; margin:18px auto; background:var(--card); border:1px solid var(--line); border-radius:18px; overflow:hidden; }
    .header{ padding:28px 34px 18px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:18px; }
    .kicker{ font-size:10px; text-transform:uppercase; letter-spacing:.18em; color:var(--muted); font-weight:1000; }
    h1{ margin:10px 0 0; font-size:28px; letter-spacing:-.02em; }
    .metaRight{ text-align:right; }
    .metaRight .value{ font-weight:1000; margin-top:6px; }
    .metaGrid{ padding:18px 34px 0; display:grid; grid-template-columns: repeat(2, 1fr); gap:10px; }
    .metaCard{ border:1px solid var(--line); border-radius:14px; padding:12px 14px; background: #fff; }
    .metaValue{ font-weight:900; margin-top:6px; }
    .grid{ padding:18px 34px 0; display:grid; grid-template-columns: repeat(3, 1fr); gap:12px; }
    .card{ border:1px solid var(--line); border-radius:16px; padding:16px; }
    .label{ font-size:10px; text-transform:uppercase; letter-spacing:.16em; color:var(--muted); font-weight:1000; }
    .valueBig{ font-size:22px; font-weight:1100; margin-top:8px; }
    .kpiBrand{ color:var(--brand); }
    .kpiError{ color:var(--error); }
    .kpiNeutral{ color:var(--ink); }
    .section{ padding:22px 34px 34px; }
    table{ width:100%; border-collapse:collapse; margin-top:10px; }
    th{ text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.16em; color:var(--muted); padding:10px 0; border-bottom:2px solid var(--ink); }
    td{ padding:10px 0; border-bottom:1px solid var(--line); font-weight:800; vertical-align:top; }
    td.right, th.right{ text-align:right; white-space:nowrap; }
    .rowLabel{ font-weight:1000; }
    .rowHint{ font-size:10px; color:var(--muted); font-weight:800; margin-top:3px; }
    .footer{ padding:14px 34px; border-top:1px solid var(--line); color:var(--muted); font-size:10px; text-transform:uppercase; letter-spacing:.12em; font-weight:900; }
    @media print {
      body{ background:#fff; }
      .toolbar{ display:none; }
      .page{ margin:0; border:none; border-radius:0; width:auto; min-height:auto; }
      @page { size:A4; margin:10mm; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn" onclick="window.close()">Fermer</button>
    <button class="btn btnPrimary" onclick="window.print()">Imprimer</button>
  </div>
  <div class="page">
    <div class="header">
      <div>
        <div class="kicker">Mayelia • Fidelis Plus</div>
        <h1>${title}</h1>
        <div class="kicker" style="margin-top:10px;">${subject}</div>
      </div>
      <div class="metaRight">
        <div class="kicker">Généré le</div>
        <div class="value">${generatedAt}</div>
      </div>
    </div>
    ${metaHtml}
    ${kpiHtml}
    <div class="section">
      <div class="label">${tableTitle}</div>
      <table>
        <thead><tr><th>${colA}</th><th class="right">${colB}</th></tr></thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </div>
    <div class="footer">Document interne — export imprimable</div>
  </div>
</body>
</html>`;

  w.document.open();
  w.document.write(html);
  w.document.close();
}

