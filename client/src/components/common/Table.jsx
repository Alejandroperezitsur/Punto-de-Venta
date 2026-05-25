import React, { memo, useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from './Button';
import { Input } from './Input';
import { cn } from '../../utils/cn';

const TableRow = memo(function TableRow({ row, columns, index }) {
  return (
    <tr key={row.id || index} className="hover:bg-[var(--bg-muted)]/50 transition-colors">
      {columns.map((col) => (
        <td key={col.key} className="px-6 py-3">
          {col.render ? col.render(row) : row[col.key]}
        </td>
      ))}
    </tr>
  );
});

const TableBody = memo(function TableBody({ rows, columns }) {
  if (rows.length === 0) {
    return (
      <tr>
        <td colSpan={columns.length} className="px-6 py-8 text-center text-[var(--muted-foreground)]">
          No se encontraron resultados
        </td>
      </tr>
    );
  }
  return rows.map((row, i) => (
    <TableRow key={row.id || i} row={row} columns={columns} index={i} />
  ));
});

export const Table = ({
  columns,
  data = [],
  searchable = true,
  searchPlaceholder = "Buscar...",
  pageSize = 10,
  className
}) => {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');

  const filteredData = useMemo(() => {
    if (!query) return data;
    const lowerQuery = query.toLowerCase();
    return data.filter((row) =>
      Object.values(row).some(
        val => String(val).toLowerCase().includes(lowerQuery)
      )
    );
  }, [data, query]);

  const totalPages = Math.ceil(filteredData.length / pageSize);
  const paginatedData = useMemo(() =>
    filteredData.slice((page - 1) * pageSize, page * pageSize),
    [filteredData, page, pageSize]
  );

  const handleSearch = (e) => {
    setQuery(e.target.value);
    setPage(1);
  };

  return (
    <div className={cn("w-full space-y-4", className)}>
      {searchable && (
        <div className="flex justify-between items-center">
          <div className="w-72">
            <Input
              icon={Search}
              placeholder={searchPlaceholder}
              value={query}
              onChange={handleSearch}
            />
          </div>
          <div className="text-sm text-[var(--muted-foreground)]">
            Total: {filteredData.length} registros
          </div>
        </div>
      )}

      <div className="rounded-lg border border-[var(--border)] overflow-hidden bg-[var(--card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-[var(--bg-muted)] text-[var(--muted-foreground)] uppercase text-xs font-semibold py-3 border-b border-[var(--border)]">
              <tr>
                {columns.map((col) => (
                  <th key={col.key || Math.random()} className={cn("px-6 py-3 whitespace-nowrap", col.className)}>
                    {col.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              <TableBody rows={paginatedData} columns={columns} />
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-[var(--muted-foreground)]">
            Página {page} de {totalPages}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
