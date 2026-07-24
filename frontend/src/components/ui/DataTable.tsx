import React from "react";

export interface Column<T> {
  header: string;
  accessor: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = "No data found.",
  className = "",
}: DataTableProps<T>) {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-border bg-card shadow-xs ${className}`}>
      <table className="w-full text-left text-sm border-collapse min-w-[600px]">
        <thead>
          <tr className="border-b border-border bg-muted/50">
            {columns.map((col, idx) => (
              <th
                key={idx}
                className={`py-3 px-4 text-[12px] font-semibold text-muted-foreground uppercase tracking-wider ${col.className || ""}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {loading ? (
            Array.from({ length: 4 }).map((_, rIdx) => (
              <tr key={rIdx} className="animate-pulse">
                {columns.map((_, cIdx) => (
                  <td key={cIdx} className="py-3.5 px-4">
                    <div className="h-4 bg-muted rounded w-3/4" />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="py-8 text-center text-sm text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => (
              <tr
                key={keyExtractor(item)}
                className="hover:bg-muted/30 transition-colors"
              >
                {columns.map((col, cIdx) => (
                  <td key={cIdx} className={`py-3 px-4 text-foreground ${col.className || ""}`}>
                    {col.accessor(item)}
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
