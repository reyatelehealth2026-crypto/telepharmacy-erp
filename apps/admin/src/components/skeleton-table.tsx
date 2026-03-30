interface SkeletonTableProps {
  columns: string[];
  rows?: number;
}

export function SkeletonTable({ columns, rows = 5 }: SkeletonTableProps) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 text-left font-medium text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, i) => (
              <tr key={i} className="border-b last:border-0">
                {columns.map((col) => (
                  <td key={col} className="px-4 py-3">
                    <div className="h-4 w-24 animate-pulse rounded bg-muted" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
