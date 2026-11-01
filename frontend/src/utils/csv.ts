// Celdas CSV seguras: además de escapar comillas, neutraliza los prefijos
// que Excel/Sheets interpretan como fórmula.
export function csvCell(value: unknown): string {
  const text = String(value ?? '');
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export function toCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(csvCell).join(';')).join('\r\n');
}
