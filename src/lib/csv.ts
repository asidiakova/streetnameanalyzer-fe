const CSV_UTF8_BOM = "\uFEFF";

export function escapeCsvField(value: string): string {
  if (!/[\n",]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

export function stringifyCsvRows(rows: string[][]): string {
  const body = rows
    .map((row) => row.map((cell) => escapeCsvField(String(cell))).join(","))
    .join("\n");
  return `${CSV_UTF8_BOM}${body}`;
}
