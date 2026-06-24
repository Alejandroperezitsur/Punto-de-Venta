import React, { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, CheckSquare, Square } from 'lucide-react';
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
  density?: 'compact' | 'comfortable';
  searchable?: boolean;
  searchPlaceholder?: string;
  pageSize?: number;
  sortable?: boolean;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  emptyIcon?: React.ElementType;
  loading?: boolean;
  className?: string;
  selectable?: boolean;
  selected?: (keyof T extends 'id' ? string[] : string[]);
  onSelectionChange?: (keys: string[]) => void;
  bulkActions?: { label: string; onClick: (keys: string[]) => void; variant?: 'default' | 'danger' }[];
}

const densityStyles = {
  compact: 'py-2 px-3 text-sm',
  comfortable: 'py-3 px-3 text-[var(--text-body)]',
};

function Table<T extends Record<string, any>>({
  columns, data, keyExtractor, density = 'comfortable',
  searchable = false, searchPlaceholder = 'Buscar...', pageSize = 20,
  sortable = true, onRowClick, emptyMessage, emptyIcon, loading = false,
  className, selectable, selected = [], onSelectionChange, bulkActions,
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
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const allSelected = paged.length > 0 && paged.every(item => selected.includes(String(keyExtractor(item))));
  const toggleAll = () => {
    if (!onSelectionChange) return;
    const pageKeys = paged.map(item => String(keyExtractor(item)));
    if (allSelected) onSelectionChange(selected.filter(k => !pageKeys.includes(k)));
    else onSelectionChange([...new Set([...selected, ...pageKeys])]);
  };
  const toggleOne = (key: string) => {
    if (!onSelectionChange) return;
    onSelectionChange(selected.includes(key) ? selected.filter(k => k !== key) : [...selected, key]);
  };

  const hasSelection = selected.length > 0;

  return (
    <div className={cn('flex flex-col rounded-lg bg-bg-surface border border-border-subtle overflow-hidden', className)}>
      {searchable && (
        <div className="p-3 border-b border-border-subtle">
          <Input
            size="sm"
            icon={<Search className="size-3.5" />}
            placeholder={searchPlaceholder}
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0); }}
          />
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-surface-hover/50 sticky top-0 z-10">
              {selectable && (
                <th className={cn('w-12 text-left', densityStyles[density], 'text-text-tertiary')}>
                  <button onClick={toggleAll} className="hover:text-text-primary transition-colors">
                    {allSelected ? <CheckSquare className="size-[18px]" /> : <Square className="size-[18px]" />}
                  </button>
                </th>
              )}
              {columns.map(col => (
                <th
                  key={col.key}
                  className={cn(
                    'text-left font-semibold text-text-tertiary text-[var(--text-label)] tracking-wider select-none',
                    densityStyles[density],
                    col.sortable !== false && sortable && 'cursor-pointer hover:text-text-primary transition-colors',
                    col.hideOnMobile && 'hidden md:table-cell',
                    col.className,
                  )}
                  onClick={() => (col.sortable !== false && sortable) && toggleSort(col.key)}
                >
                  <div className="flex items-center gap-1.5">
                    <span>{col.label}</span>
                    {col.sortable !== false && sortable && (
                      <span className="shrink-0 text-text-disabled">
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

          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border-subtle last:border-0">
                  {selectable && <td className={densityStyles[density]}><div className="h-4 rounded bg-bg-inset shimmer w-4" /></td>}
                  {columns.map(col => (
                    <td key={col.key} className={cn(densityStyles[density], col.hideOnMobile && 'hidden md:table-cell')}>
                      <div className="h-4 rounded bg-bg-inset shimmer w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={selectable ? columns.length + 1 : columns.length} className="p-8">
                  <EmptyState title={emptyMessage || 'No se encontraron registros'} icon={emptyIcon} />
                </td>
              </tr>
            ) : (
              paged.map(item => {
                const key = String(keyExtractor(item));
                const isSelected = selected.includes(key);
                return (
                  <tr
                    key={key}
                    className={cn(
                      'border-b border-border-subtle last:border-0 transition-colors duration-[120ms]',
                      onRowClick && 'cursor-pointer hover:bg-bg-surface-hover',
                      isSelected && 'bg-bg-surface-active',
                      !isSelected && !onRowClick && 'hover:bg-bg-surface-hover',
                    )}
                    onClick={() => onRowClick?.(item)}
                  >
                    {selectable && (
                      <td className={densityStyles[density]} onClick={e => { e.stopPropagation(); toggleOne(key); }}>
                        <button className="hover:text-text-primary transition-colors text-text-tertiary">
                          {isSelected ? <CheckSquare className="size-[18px]" /> : <Square className="size-[18px]" />}
                        </button>
                      </td>
                    )}
                    {columns.map(col => (
                      <td
                        key={col.key}
                        className={cn(
                          densityStyles[density],
                          'text-text-primary',
                          col.hideOnMobile && 'hidden md:table-cell',
                          col.className,
                        )}
                      >
                        {col.render ? col.render(item) : item[col.key]}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Action bar for bulk selection */}
      {selectable && hasSelection && bulkActions && bulkActions.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 border-t border-border-subtle bg-bg-surface-active">
          <span className="text-sm font-medium text-text-secondary">{selected.length} seleccionado{selected.length !== 1 ? 's' : ''}</span>
          <div className="flex-1" />
          {bulkActions.map((action, i) => (
            <button
              key={i}
              onClick={() => action.onClick(selected)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                action.variant === 'danger'
                  ? 'text-semantic-danger hover:bg-semantic-danger-bg'
                  : 'text-text-secondary hover:bg-bg-surface-hover',
              )}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !hasSelection && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border-subtle">
          <span className="text-xs text-text-tertiary">
            {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                'hover:bg-bg-surface-hover',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
            >
              Anterior
            </button>
            {Array.from({ length: Math.min(totalPages, 7) }).map((_, i) => {
              const start = Math.max(0, Math.min(page - 3, totalPages - 7));
              const pageNum = totalPages <= 7 ? i : start + i;
              if (pageNum >= totalPages) return null;
              return (
                <button
                  key={pageNum}
                  onClick={() => setPage(pageNum)}
                  className={cn(
                    'size-8 rounded-md text-xs font-medium transition-colors',
                    pageNum === page
                      ? 'bg-action-primary text-[hsl(var(--bg-surface))]'
                      : 'hover:bg-bg-surface-hover text-text-tertiary',
                  )}
                >
                  {pageNum + 1}
                </button>
              );
            })}
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className={cn(
                'px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors',
                'hover:bg-bg-surface-hover',
                'disabled:opacity-40 disabled:cursor-not-allowed',
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
