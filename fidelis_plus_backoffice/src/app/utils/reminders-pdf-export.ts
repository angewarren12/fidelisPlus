import { TechnicalVisitReminderRow } from '../services/technical-visit-reminder.service';

function escapeHtml(v: any): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'En attente',
  contacted: 'Contacté',
  done: 'Terminé',
};

const ALERT_LABELS: Record<string, string> = {
  '2_semaines': '2 semaines avant',
  '1_semaine': '1 semaine avant',
  veille: 'La veille',
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('fr-FR');
}

export interface RemindersPdfFilters {
  status?: string;
  visitDateFrom?: string;
  visitDateTo?: string;
}

/** Ouvre une fenêtre imprimable listant les rappels visite technique (respecte les filtres actifs). */
export function openRemindersPdfExport(rows: TechnicalVisitReminderRow[], filters: RemindersPdfFilters): void {
  const w = window.open('', '_blank');
  if (!w) return;

  const filterParts: string[] = [];
  filterParts.push(`Statut : ${filters.status ? (STATUS_LABELS[filters.status] || filters.status) : 'Tous'}`);
  if (filters.visitDateFrom || filters.visitDateTo) {
    filterParts.push(`Visite technique du ${filters.visitDateFrom ? fmtDate(filters.visitDateFrom) : '…'} au ${filters.visitDateTo ? fmtDate(filters.visitDateTo) : '…'}`);
  }

  const rowsHtml = rows
    .map((r) => {
      const vehicles = (r.vehicles || [])
        .map((v) => `${escapeHtml(v.registration)} (exp. ${fmtDate(v.visit_expiration_date)})`)
        .join('<br>');
      return `<tr>
        <td>
          <div class="rowLabel">${escapeHtml(r.full_name)}</div>
          <div class="rowHint">${escapeHtml(r.contact)} · ${escapeHtml(r.contact_method)}</div>
        </td>
        <td>${vehicles || '—'}</td>
        <td>${escapeHtml(r.station?.name || '—')}</td>
        <td>${escapeHtml(ALERT_LABELS[r.alert_period] || r.alert_period)}</td>
        <td>${fmtDate(r.created_at)}</td>
        <td><span class="badge badge-${escapeHtml(r.status)}">${escapeHtml(STATUS_LABELS[r.status] || r.status)}</span></td>
      </tr>`;
    })
    .join('');

  const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Rappels Visite Technique</title>
  <style>
    :root { --ink:#0f172a; --muted:#64748b; --brand:#006B5D; --bg:#f8fafc; --card:#ffffff; --line:#e2e8f0; --amber:#b45309; --blue:#1d4ed8; --green:#15803d; }
    *{ box-sizing:border-box; }
    body{ margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; color:var(--ink); background:var(--bg); }
    .toolbar{ position:sticky; top:0; z-index:10; background:rgba(248,250,252,.92); backdrop-filter: blur(10px); border-bottom:1px solid var(--line); padding:14px 18px; display:flex; gap:10px; justify-content:flex-end; }
    .btn{ border:1px solid var(--line); background:var(--card); padding:10px 12px; border-radius:12px; font-weight:900; text-transform:uppercase; letter-spacing:.12em; font-size:11px; cursor:pointer; }
    .btnPrimary{ background:var(--brand); color:#fff; border-color:var(--brand); }
    .page{ width:297mm; min-height:210mm; margin:18px auto; background:var(--card); border:1px solid var(--line); border-radius:18px; overflow:hidden; }
    .header{ padding:28px 34px 18px; border-bottom:1px solid var(--line); display:flex; justify-content:space-between; gap:18px; }
    .kicker{ font-size:10px; text-transform:uppercase; letter-spacing:.18em; color:var(--muted); font-weight:1000; }
    h1{ margin:10px 0 0; font-size:26px; letter-spacing:-.02em; }
    .metaRight{ text-align:right; }
    .metaRight .value{ font-weight:1000; margin-top:6px; }
    .filters{ padding:16px 34px 0; display:flex; gap:10px; flex-wrap:wrap; }
    .filterChip{ border:1px solid var(--line); border-radius:999px; padding:6px 14px; font-size:11px; font-weight:800; color:var(--muted); background:#fff; }
    .section{ padding:22px 34px 34px; }
    table{ width:100%; border-collapse:collapse; margin-top:10px; }
    th{ text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:.12em; color:var(--muted); padding:10px 8px; border-bottom:2px solid var(--ink); }
    td{ padding:10px 8px; border-bottom:1px solid var(--line); font-weight:700; vertical-align:top; font-size:12px; }
    .rowLabel{ font-weight:1000; }
    .rowHint{ font-size:10px; color:var(--muted); font-weight:800; margin-top:3px; }
    .badge{ display:inline-block; padding:4px 10px; border-radius:999px; font-size:10px; font-weight:1000; text-transform:uppercase; letter-spacing:.06em; }
    .badge-pending{ background:#fef3c7; color:var(--amber); }
    .badge-contacted{ background:#dbeafe; color:var(--blue); }
    .badge-done{ background:#dcfce7; color:var(--green); }
    .footer{ padding:14px 34px; border-top:1px solid var(--line); color:var(--muted); font-size:10px; text-transform:uppercase; letter-spacing:.12em; font-weight:900; }
    @media print {
      body{ background:#fff; }
      .toolbar{ display:none; }
      .page{ margin:0; border:none; border-radius:0; width:auto; min-height:auto; }
      @page { size:A4 landscape; margin:10mm; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="btn" onclick="window.close()">Fermer</button>
    <button class="btn btnPrimary" onclick="window.print()">Imprimer / PDF</button>
  </div>
  <div class="page">
    <div class="header">
      <div>
        <div class="kicker">Mayelia • Fidelis Plus</div>
        <h1>Rappels Visite Technique</h1>
        <div class="kicker" style="margin-top:10px;">${rows.length} rappel(s)</div>
      </div>
      <div class="metaRight">
        <div class="kicker">Généré le</div>
        <div class="value">${escapeHtml(new Date().toLocaleString('fr-FR'))}</div>
      </div>
    </div>
    <div class="filters">
      ${filterParts.map((f) => `<span class="filterChip">${escapeHtml(f)}</span>`).join('')}
    </div>
    <div class="section">
      <table>
        <thead>
          <tr>
            <th>Contact</th>
            <th>Véhicules</th>
            <th>Station</th>
            <th>Alerte</th>
            <th>Reçu le</th>
            <th>Statut</th>
          </tr>
        </thead>
        <tbody>${rowsHtml || '<tr><td colspan="6" style="text-align:center; color:var(--muted); padding:24px;">Aucun rappel pour ce filtre.</td></tr>'}</tbody>
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
