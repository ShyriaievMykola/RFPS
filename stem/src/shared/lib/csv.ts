type Cell = string | number;

/**
 * Екранує клітинку за RFC 4180. Рядки, що починаються з =, +, -, @, отримують апостроф,
 * щоб Excel не виконав їх як формулу (CSV-ін'єкція).
 */
function escapeCell(cell: Cell): string {
  if (typeof cell === 'number') return String(cell).replace('.', ',');
  const safe = /^[=+\-@\t\r]/.test(cell) ? `'${cell}` : cell;
  return /[";\n\r]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

/** Роздільник «;» і десяткова кома — так CSV коректно відкривається в Excel з українською локаллю. */
export function toCsv(rows: readonly (readonly Cell[])[]): string {
  return rows.map((row) => row.map(escapeCell).join(';')).join('\r\n');
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function downloadCsv(rows: readonly (readonly Cell[])[], filename: string): void {
  // BOM потрібен, щоб Excel розпізнав UTF-8 і не зіпсував кирилицю.
  const blob = new Blob(['﻿', toCsv(rows)], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, filename);
}
