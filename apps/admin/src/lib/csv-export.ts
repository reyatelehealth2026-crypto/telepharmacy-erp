/**
 * CSV Export Utility
 *
 * Generates CSV strings from data arrays and triggers browser downloads.
 */

export interface CsvColumn<T> {
  /** Column header label */
  header: string;
  /** Accessor function to extract the cell value from a row */
  accessor: (row: T) => string | number | boolean | null | undefined;
  /** Optional numeric precision for number values */
  precision?: number;
}

/**
 * Escape a CSV cell value according to RFC 4180.
 * Wraps in double-quotes if the value contains commas, quotes, or newlines.
 */
function escapeCsvCell(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Format a cell value to string with optional numeric precision.
 */
function formatCellValue(
  value: string | number | boolean | null | undefined,
  precision?: number,
): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    return precision !== undefined ? value.toFixed(precision) : String(value);
  }
  return String(value);
}

/**
 * Generate a CSV string from an array of data rows and column definitions.
 */
export function generateCsv<T>(data: T[], columns: CsvColumn<T>[]): string {
  const headerRow = columns.map((col) => escapeCsvCell(col.header)).join(',');

  const dataRows = data.map((row) =>
    columns
      .map((col) => {
        const raw = col.accessor(row);
        const formatted = formatCellValue(raw, col.precision);
        return escapeCsvCell(formatted);
      })
      .join(','),
  );

  return [headerRow, ...dataRows].join('\n');
}

/**
 * Trigger a browser download of a CSV string as a file.
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const BOM = '\uFEFF'; // UTF-8 BOM for Thai character support in Excel
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Convenience: generate CSV from data + columns and trigger download.
 */
export function exportToCsv<T>(data: T[], columns: CsvColumn<T>[], filename: string): void {
  const csv = generateCsv(data, columns);
  downloadCsv(csv, filename);
}
