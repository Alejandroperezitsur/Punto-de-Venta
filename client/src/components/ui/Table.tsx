import React, { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Input } from './Input';
import { EmptyState } from './EmptyState';

type SortDirection = 'asc' | 'desc' | null;

interface Column<T> {
  key: string;
  title: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
  width?: string;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  density?: 'compact' | 'comfortable' | 'spacious';
  striped?: boolean;
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyIcon?: React.ElementType;
  emptyAction?: { label: string; onClick: () => void };
  onRowClick?: (row: T) => void;
  rowKey?: (row: T) => string | number;
  className?: string;
  sortable?: boolean;
  stickyHeader?: boolean;
}

function Table<T extends Record<string, any>>({
  columns,
  data,
  searchable = true,
  searchPlaceholder = 'Buscar...',
  pageSize = 20,
  density = 'compact',
  striped = true,
  loading = false,
  emptyTitle = 'No se encontraron resultados',
  emptyDescription,
  emptyIcon,
  emptyAction,
  onRowClick,
  rowKey = (row: T) => row.id ?? row._id ?? JSON.stringify(row),
  className,
  sortable: globallySortable = true,
  stickyHeader = true,
}: TableProps<T>) {
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>(null);

  const densityStyles = {
    compact: 'py-1.5 px-2.5 text-xs',
    comfortable: 'py-2 px-3 text-sm',
    spacious: 'py-3 px-4 text-base',
  };

  const filtered = useMemo(() => {
    if (!query) return data;
    const q = query.toLowerCase();
    return data.filter(row =>
      columns.some(col => {
        const val = row[col.key];
        return String(val ?? '').toLowerCase().includes(q);
      }),
    );
  }, [data, query, columns]);

  const sorted = useMemo(() => {
    if (!sortKey || !sortDir) return filtered;
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number'
        ? aVal - bVal
        : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = useMemo(
    () => sorted.slice((page - 1) * pageSize, page * pageSize),
    [sorted, page, pageSize],
  );

  const handleSort = useCallback((key: string) => {
    setSortKey(prev => {
      if (prev !== key) { setSortDir('asc'); return key; }
      setSortDir(prevDir => {
        if (prevDir === 'asc') return 'desc';
        if (prevDir === 'desc') return null;
        return 'asc';
      });
      return key;
    });
    setPage(1);
  }, []);

  const SortIcon = ({ column }: { column: Column<T> }) => {
    if (!column.sortable && !globallySortable) return null;
    const active = sortKey === column.key;
    if (!active) return <ChevronsUpDown className="size-3 opacity-20" />;
    return sortDir === 'asc' ? <ChevronUp className="size-3 text-primary" /> : <ChevronDown className="size-3 text-primary" />;
  };

  return (
    <div className={cn('w-full space-y-2', className)}>
      {searchable && (
        <div className="flex items-center justify-between gap-3">
          <div className="w-64 max-w-full">
            <Input
              icon={Search}
              placeholder={searchPlaceholder}
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
            />
          </div>
          <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
            {sorted.length} registro{sorted.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className={cn(
        'rounded-lg border border-border/20 overflow-hidden bg-card',
        stickyHeader && 'relative',
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className={cn('bg-muted/30 border-b border-border/30', stickyHeader && 'sticky top-0 z-10')}>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={cn(
                      'font-semibold text-muted-foreground uppercase tracking-wider select-none text-[10px]',
                      densityStyles[density],
                      col.sortable !== false && globallySortable && 'cursor-pointer hover:text-foreground transition-colors',
                      col.hideOnMobile && 'hidden md:table-cell',
                      col.className,
                    )}
                    style={col.width ? { width: col.width } : undefined}
                    onClick={() => {
                      if (col.sortable !== false && globallySortable) handleSort(col.key);
                    }}
                    scope="col"
                  >
                    <div className="flex items-center gap-1">
                      <span>{col.title}</span>
                      {(col.sortable !== false && globallySortable) && <SortIcon column={col} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    {columns.map(col => (
                      <td key={col.key} className={cn(densityStyles[density], 'opacity-20', col.hideOnMobile && 'hidden md:table-cell')}>
                        <div className="h-3 rounded bg-muted/60" style={{ width: `${40 + (i * 7) % 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="py-8">
                      <EmptyState
                        title={emptyTitle}
                        description={emptyDescription}
                        icon={emptyIcon}
                        action={emptyAction}
                      />
                    </div>
                  </td>
                </tr>
              ) : (
                paginated.map((row, i) => (
                  <tr
                    key={rowKey(row)}
                    className={cn(
                      'transition-colors',
                      striped && i % 2 === 1 && 'bg-foreground/[0.02]',
                      onRowClick && 'cursor-pointer hover:bg-muted/30',
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={cn(densityStyles[density], col.hideOnMobile && 'hidden md:table-cell', col.className)}
                      >
                        {col.render ? col.render(row) : row[col.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              if (pageNum > totalPages) return null;
              return (
                <button
                  key={pageNum}
                  className={cn(
                    'size-7 rounded-md text-[10px] font-semibold transition-colors',
                    pageNum === page ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-surface-hover',
                  )}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="size-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors disabled:opacity-30"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { Table };
export type { Column, TableProps };
