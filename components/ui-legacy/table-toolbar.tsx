'use client';

import { useState, useRef } from 'react';
import { Search, Columns, Download } from 'lucide-react';
import { FilterPanel } from '@/components/filter-panel';
import type { FilterDef, ActiveFilter } from '@/components/filter-panel';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import Button from '@/components/ui-legacy/button';

export interface ColDef {
  key:   string;
  label: string;
  locked?: boolean;
}

interface Props {
  search:    string;
  onSearch:  (v: string) => void;
  placeholder?: string;

  filterDefs?:      FilterDef[];
  filters?:         ActiveFilter[];
  onFiltersChange?: (f: ActiveFilter[]) => void;

  colDefs?:     ColDef[];
  visibleCols?: Record<string, boolean>;
  onToggleCol?: (key: string) => void;
  columnsLabel?: string;

  onExport?:     () => void;
  exportLabel?:  string;
  dateRangeControl?: React.ReactNode;
  extraActions?: React.ReactNode;
  className?: string;
}

const BTN_ACTIVE = 'border-accent bg-accent/10 text-accent hover:bg-accent/10 hover:text-accent';

export default function TableToolbar({
  search, onSearch, placeholder = 'Search…',
  filterDefs, filters, onFiltersChange,
  colDefs, visibleCols, onToggleCol,
  columnsLabel = 'Columns',
  onExport, exportLabel = 'Export', dateRangeControl, extraActions, className,
}: Props) {
  const [colOpen, setColOpen] = useState(false);
  const [colPos,  setColPos]  = useState({ top: 0, left: 0 });
  const colBtnRef = useRef<HTMLButtonElement>(null);

  function openColPanel() {
    if (colBtnRef.current) {
      const r = colBtnRef.current.getBoundingClientRect();
      setColPos({ top: r.bottom + 6, left: r.left });
    }
    setColOpen(v => !v);
  }

  const showFilter = filterDefs && filterDefs.length > 0;
  const showCols   = colDefs   && colDefs.length   > 0;

  return (
    <>
      {colOpen && (
        <div className="fixed inset-0 z-[150]" onClick={() => setColOpen(false)} />
      )}

      <div className={cn('p-3 sm:p-4 border-b border-border flex flex-wrap items-center gap-2 sm:gap-3 bg-surface', className)}>
        {/* Search */}
        <div className="relative w-64 shrink-0">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted pointer-events-none" />
          <Input
            value={search}
            onChange={e => onSearch(e.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="pl-9"
          />
        </div>

        {/* Inline filter chips */}
        {showFilter && (
          <FilterPanel
            defs={filterDefs!}
            filters={filters ?? []}
            onChange={onFiltersChange ?? (() => {})}
          />
        )}

        {dateRangeControl}

        {/* Columns */}
        {showCols && (
          <Button
            ref={colBtnRef}
            variant="outline"
            size="md"
            onClick={openColPanel}
            className={cn(colOpen && BTN_ACTIVE)}
          >
            <Columns size={14} />{columnsLabel}
          </Button>
        )}

        {/* Export */}
        {extraActions && <div className="ml-auto flex items-center gap-2">{extraActions}</div>}
        {onExport && (
          <Button variant="outline" size="md" onClick={onExport} className={cn(extraActions ? '' : 'ml-auto')}>
            <Download size={14} />{exportLabel}
          </Button>
        )}
      </div>

      {/* Columns panel */}
      {colOpen && showCols && (
        <div
          className="fixed bg-surface border border-border rounded-xl shadow-lg z-[200] w-52 py-2"
          style={{ top: colPos.top, left: colPos.left }}
          onClick={e => e.stopPropagation()}
        >
          <p className="mb-1 px-4 py-1 text-label-sm font-semibold uppercase tracking-wider text-fg-muted">
            Toggle Columns
          </p>
          {colDefs!.map(col => (
            <button
              key={col.key}
              onClick={() => !col.locked && onToggleCol?.(col.key)}
              className={cn(
                'w-full text-left px-4 py-2 text-body-sm text-fg flex items-center gap-2.5 hover:bg-bg-muted',
                col.locked && 'cursor-not-allowed text-fg-muted select-none',
              )}
            >
              <Checkbox
                checked={col.locked || Boolean(visibleCols?.[col.key])}
                aria-disabled={col.locked}
                aria-label={`Toggle ${col.label} column`}
                tabIndex={-1}
                className={cn(
                  'pointer-events-none',
                  col.locked && 'cursor-not-allowed select-none opacity-50'
                )}
              />
              <span>{col.label}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
