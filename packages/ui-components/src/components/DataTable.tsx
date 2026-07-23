import type { ReactNode } from "react";

// DESIGN.md §7.3 — tabel data list view: header sticky, row density
// nyaman(40px)/padat(32px) per preferensi user, kolom numerik tabular-nums.
export interface DataTableColumn<T> {
  key: string;
  header: string;
  numeric?: boolean;
  render?: (row: T) => ReactNode;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  density?: "comfortable" | "compact";
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, unknown>>({
  columns,
  rows,
  getRowId,
  density = "comfortable",
  emptyMessage = "Belum ada data",
}: DataTableProps<T>) {
  return (
    <div className="qhse-data-table-wrap">
      <table className={`qhse-data-table qhse-data-table--${density}`}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.numeric ? "qhse-col-numeric" : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="qhse-data-table__empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={getRowId(row)}>
                {columns.map((col) => (
                  <td key={col.key} className={col.numeric ? "qhse-col-numeric" : undefined}>
                    {col.render ? col.render(row) : (row[col.key] as ReactNode)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
