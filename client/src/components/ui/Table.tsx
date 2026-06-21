import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '../../utils/cn';
import { Input } from './Input';
import { EmptyState } from './EmptyState';

interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (item: T) => React.ReactNode;
  className?: string;
  hideOnMobile?: boolean;
}

interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string | number;
  variant?: 'default' | 'glass' | 'bordered';
  density?: 'compact' | 'comfortable' | 'spacious';
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  sortable?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  emptyIcon?: React.ElementType;
  loading?: boolean;
  className?: string;
  stickyHeader?: boolean;
}

const densityStyles = {
  compact: 'py-1.5 px-2 text-xs',
  comfortable: 'py-2.5 px-3 text-sm',
  spacious: 'py-4 px-4 text-sm',
};

function Table<T extends Record<string, any>>({
  columns, data, keyExtractor, variant = 'default', density = 'comfortable',
  searchable = false, searchPlaceholder = 'Buscar...', pageSize = 20,
  sortable = true, onRowClick, emptyMessage, emptyIcon, loading = false,
  className, stickyHeader = true,
}: TableProps<T>) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let items = data;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(item =>
        columns.some(col => String(item[col.key] ?? '').toLowerCase().includes(q))
      );
    }
    if (sortKey) {
      items = [...items].sort((a, b) => {
        const aVal = a[sortKey] ?? '';
        const bVal = b[sortKey] ?? '';
        const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
        return sortDir === 'asc' ? cmp : -cmp;
      });
    }
    return items;
  }, [data, search, sortKey, sortDir, columns]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const variantStyles = {
    default: 'bg-card border border-border/40 rounded-xl overflow-hidden shadow-xs',
    glass: 'backdrop-blur-lg bg-surface-glass/40 border border-border/20 rounded-xl overflow-hidden shadow-sm table-glass',
    bordered: 'border border-border/30 rounded-xl overflow-hidden',
  };

  return (
    <div className={cn('flex flex-col', variantStyles[variant], className)}>
      {/* Search */}
      {searchable && (
        <div className="p-3 border-b border-border/20">
          <Input
            size="sm"
            icon={<Search className="size-3.5" />}
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
      )}

      {/* Table wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full">
          {/* Header */}
          <thead>
            <tr className={cn(
              'border-b border-border/20',
              stickyHeader && 'sticky top-0 z-10',
              variant === 'glass' ? 'bg-surface-glass/60 backdrop-blur-md' : 'bg-muted/50',
            )}>
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left font-semibold text-muted-foreground text-xs uppercase tracking-[0.08em] select-none',
                    densityStyles[density],
                    col.sortable !== false && sortable && 'cursor-pointer hover:text-foreground transition-colors',
                    col.hideOnMobile && 'hidden md:table-cell',
                    col.className,
                  )}
                  onClick={() => (col.sortable !== false && sortable) && toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    {col.sortable !== false && sortable && (
                      <span className="shrink-0 text-muted-foreground/30">
                        {sortKey === col.key
                          ? (sortDir === 'asc' ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />)
                          : <ChevronsUpDown className="size-3" />
                        }
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border/10 last:border-0">
                  {columns.map(col => (
                    <td key={col.key} className={cn(densityStyles[density], col.hideOnMobile && 'hidden md:table-cell')}>
                      <div className="h-4 rounded bg-muted/50 shimmer w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="p-8">
                  <EmptyState
                    title={emptyMessage || 'No se encontraron registros'}
                    icon={emptyIcon}
                  />
                </td>
              </tr>
            ) : (
              paged.map((item, idx) => (
                <tr
                  key={keyExtractor(item)}
                  className={cn(
                    'border-b border-border/10 last:border-0 transition-colors duration-150',
                    onRowClick && 'cursor-pointer hover:bg-muted/40 active:bg-muted/60',
                    idx % 2 === 0 ? 'bg-transparent' : 'bg-muted/20',
                  )}
                  onClick={() => onRowClick?.(item)}
                >
                  {columns.map(col => (
                    <td
                      key={col.key}
                      className={cn(
                        densityStyles[density],
                        'text-foreground',
                        col.hideOnMobile && 'hidden md:table-cell',
                        col.className,
                      )}
                    >
                      {col.render ? col.render(item) : item[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border/20 bg-muted/25">
          <span className="text-xs text-muted-foreground/70">
            {filtered.length} registro{(filtered.length !== 1) ? 's' : ''}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                'hover:bg-muted/50 active:bg-muted',
                'disabled:opacity-30 disabled:cursor-not-allowed',
              )}
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn(
                  'size-7 rounded-md text-xs font-medium transition-all',
                  i === page
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
                    : 'hover:bg-muted/50 text-muted-foreground',
                )}
              >
                {i + 1}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium transition-all',
                'hover:bg-muted/50 active:bg-muted',
                'disabled:opacity-30 disabled:cursor-not-allowed',
              )}
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { Table };
export type { Column, TableProps };