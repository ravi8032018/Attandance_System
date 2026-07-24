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
    <div className={`w-full overflow-hidden rounded-2xl solid-card border border-border ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse min-w-[650px]">
          <thead>
            <tr className="border-b border-border bg-slate-50 dark:bg-slate-900/50">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`py-3.5 px-4 text-[11px] font-bold text-muted-foreground uppercase tracking-widest ${col.className || ""}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={rIdx} className="animate-pulse">
                  {columns.map((_, cIdx) => (
                    <td key={cIdx} className="py-4 px-4">
                      <div className="h-4 bg-muted rounded-lg w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-10 text-center text-sm font-medium text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 hover:border-l-2 hover:border-l-indigo-600 dark:hover:border-l-indigo-500 transition-colors duration-150"
                >
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className={`py-3.5 px-4 text-foreground font-medium ${col.className || ""}`}>
                      {col.accessor(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
