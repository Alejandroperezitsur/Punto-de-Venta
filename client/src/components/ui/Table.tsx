import React, { useState, useMemo, useCallback } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Input } from './Input';
import { Button } from './Button';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';

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
  pageSize = 10,
  density = 'comfortable',
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
    compact: 'py-2 px-3 text-xs',
    comfortable: 'py-3 px-4 text-sm',
    spacious: 'py-4 px-5 text-base',
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
    if (!active) return <ChevronsUpDown className="size-3.5 opacity-40" />;
    return sortDir === 'asc' ? <ChevronUp className="size-3.5 text-primary" /> : <ChevronDown className="size-3.5 text-primary" />;
  };

  return (
    <div className={cn('w-full space-y-4', className)}>
      {searchable && (
        <div className="flex items-center justify-between gap-4">
          <div className="w-72 max-w-full">
            <Input
              icon={Search}
              placeholder={searchPlaceholder}
              value={query}
              onChange={e => { setQuery(e.target.value); setPage(1); }}
            />
          </div>
          <span className="text-sm text-muted-foreground font-medium whitespace-nowrap">
            {sorted.length} registro{sorted.length !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      <div className={cn(
        'rounded-2xl border border-border overflow-hidden bg-card',
        stickyHeader && 'relative',
      )}>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className={cn(
              'bg-muted/50 border-b border-border',
              stickyHeader && 'sticky top-0 z-10',
            )}>
              <tr>
                {columns.map(col => (
                  <th
                    key={col.key}
                    className={cn(
                      'font-semibold text-muted-foreground uppercase tracking-wider select-none',
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
                    <div className="flex items-center gap-1.5">
                      <span>{col.title}</span>
                      {(col.sortable !== false && globallySortable) && <SortIcon column={col} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={`skel-${i}`}>
                    {columns.map(col => (
                      <td key={col.key} className={cn(densityStyles[density], col.hideOnMobile && 'hidden md:table-cell')}>
                        <div className="h-4 rounded bg-muted/60 animate-[shimmer_1.5s_ease-in-out_infinite] bg-gradient-to-r from-muted/40 via-muted/60 to-muted/40 bg-[length:200%_100%]" style={{ width: `${40 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="p-8">
                    <EmptyState
                      title={emptyTitle}
                      description={emptyDescription}
                      icon={emptyIcon}
                      action={emptyAction}
                    />
                  </td>
                </tr>
              ) : (
                paginated.map((row, i) => (
                  <tr
                    key={rowKey(row)}
                    className={cn(
                      'transition-colors duration-150',
                      striped && i % 2 === 1 && 'bg-muted/20',
                      onRowClick && 'cursor-pointer hover:bg-muted/40',
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={cn(
                          densityStyles[density],
                          col.hideOnMobile && 'hidden md:table-cell',
                          col.className,
                        )}
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
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="size-4" />
            </Button>
            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const pageNum = Math.max(1, Math.min(page - 2, totalPages - 4)) + i;
              if (pageNum > totalPages) return null;
              return (
                <Button
                  key={pageNum}
                  variant={pageNum === page ? 'primary' : 'ghost'}
                  size="sm"
                  className={cn('min-w-[2rem]', pageNum === page ? '' : '')}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { Table };
export type { Column, TableProps };
