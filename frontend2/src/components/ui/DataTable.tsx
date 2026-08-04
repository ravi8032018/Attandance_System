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
  maxHeight?: string;
  textsize?: string;
  onRowClick?: (item: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  loading = false,
  emptyMessage = "No data found.",
  className = "",
  maxHeight = "max-h-[300px]",
  textsize = "text-sm",
  onRowClick,
}: DataTableProps<T>) {
  return (
    <div className={`w-full overflow-hidden rounded-2xl solid-card border border-border ${className}`}>
      <div className={`w-full overflow-auto custom-scrollbar ${maxHeight}`}>
        <table className={`w-full text-center border-collapse min-w-[650px] relative ${textsize}`}>
          <thead className="sticky top-0 z-10 bg-card border-b border-border">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={`py-3.5 px-4 text-[11px] font-extrabold text-muted-foreground uppercase tracking-widest text-center sticky top-0 bg-card shadow-xs ${col.className || ""}`}
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
                    <td key={cIdx} className="py-4 px-4 text-center">
                      <div className="h-4 bg-muted rounded-lg w-3/4 mx-auto" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={`py-10 text-center font-semibold text-muted-foreground ${textsize}`}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={keyExtractor(item)}
                  onClick={() => onRowClick && onRowClick(item)}
                  className={`hover:bg-muted/50 hover:border-l-2 hover:border-l-indigo-600 dark:hover:border-l-indigo-500 transition-colors duration-150 ${onRowClick ? "cursor-pointer" : ""
                    }`}
                >
                  {columns.map((col, cIdx) => (
                    <td key={cIdx} className={`py-3.5 px-4 text-foreground font-semibold text-center ${col.className || ""}`}>
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
