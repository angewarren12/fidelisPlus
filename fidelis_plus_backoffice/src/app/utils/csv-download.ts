/** Télécharge un fichier CSV (UTF-8 BOM, séparateur ;). */
export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  const escape = (cell: string | number): string => {
    const s = String(cell);
    if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const body = rows.map((r) => r.map(escape).join(';')).join('\r\n');
  const bom = '\uFEFF';
  const blob = new Blob([bom + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
