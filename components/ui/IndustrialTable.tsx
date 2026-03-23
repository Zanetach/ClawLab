'use client';

import { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (item: T) => ReactNode;
}

interface IndustrialTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
}

export function IndustrialTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  emptyMessage = 'No data available',
}: IndustrialTableProps<T>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-zinc-700">
            {columns.map((col) => (
              <th
                key={col.key}
                className="uppercase-title text-text-muted text-left py-3 px-4 font-semibold"
                style={{ width: col.width }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center text-text-muted py-12 px-4"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item, index) => (
              <tr
                key={item.id}
                className={`
                  border-b border-zinc-800
                  ${index % 2 === 0 ? 'bg-zinc-900/30' : 'bg-transparent'}
                  ${onRowClick ? 'cursor-pointer hover:bg-zinc-800/50 transition-colors' : ''}
                `}
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((col) => (
                  <td key={col.key} className="py-3 px-4 text-sm">
                    {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as ReactNode}
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
