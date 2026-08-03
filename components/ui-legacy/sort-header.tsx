'use client';

import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SortHeader({
  label,
  colId,
  sortCol,
  sortDir,
  onSort,
}: {
  label: string;
  colId: string;
  sortCol: string | null;
  sortDir: 1 | -1;
  onSort: (col: string) => void;
}) {
  const isSorted = sortCol === colId;
  return (
    <button
      type="button"
      onClick={() => onSort(colId)}
      className={cn(
        'flex items-center gap-1 text-left text-xs font-semibold text-fg-muted hover:text-fg',
      )}
    >
      {label}
      {isSorted ? (
        sortDir === 1 ? (
          <ArrowUp size={13} className="text-accent shrink-0" />
        ) : (
          <ArrowDown size={13} className="text-accent shrink-0" />
        )
      ) : (
        <ArrowUpDown size={13} className="text-fg-subtle shrink-0" />
      )}
    </button>
  );
}
