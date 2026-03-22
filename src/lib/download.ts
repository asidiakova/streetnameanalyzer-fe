import { stringifyCsvRows } from "@/lib/csv";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, data: unknown) {
  downloadBlob(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
    filename
  );
}

export function downloadCsv(filename: string, rows: string[][]) {
  downloadBlob(
    new Blob([stringifyCsvRows(rows)], { type: "text/csv;charset=utf-8" }),
    filename
  );
}
