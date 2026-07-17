import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type CSSProperties } from 'react';

export default function SortTh({
  col,
  label,
  sortCol,
  sortDir,
  onSort,
  right = false,
  center = false,
  className,
  children,
  filter,
  minWidth,
  maxWidth,
}: {
  col: string;
  label: string;
  sortCol: string | null;
  sortDir: 1 | -1;
  onSort: (col: string) => void;
  right?: boolean;
  center?: boolean;
  className?: string;
  children?: React.ReactNode;
  /* Optional filter control (e.g. a funnel button) rendered beside the sort
     button. When provided, the header lays the sort button and filter out in a
     flex row instead of a single full-width button. */
  filter?: React.ReactNode;
  minWidth?: number | string;
  maxWidth?: number | string;
}) {
  const active = sortCol === col;
  const computedStyle: CSSProperties = {
    minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth,
    maxWidth: typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth,
  };
  const sortButton = (
    <button
      type="button"
      onClick={() => onSort(col)}
      className={cn(
        'flex h-10 items-center gap-1 px-3 select-none rounded-sm whitespace-nowrap',
        !filter && 'w-full',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
        right && 'justify-end',
        center && 'justify-center',
      )}
    >
      {label}
      {active
        ? (sortDir === 1 ? <ArrowUp size={13} className="text-accent" /> : <ArrowDown size={13} className="text-accent" />)
        : <ArrowUpDown size={13} className="text-fg-subtle" />
      }
      {children}
    </button>
  );
  return (
    <th
      scope="col"
      aria-sort={active ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}
      className={cn(
        'text-left align-middle text-xs font-semibold hover:bg-bg-muted/50 transition-colors',
        active ? 'text-accent' : 'text-fg-muted',
        className,
      )}
      style={computedStyle}
    >
      {filter ? (
        <div
          className={cn(
            'flex items-center pr-1',
            right && 'justify-end',
            center && 'justify-center',
          )}
        >
          {sortButton}
          {filter}
        </div>
      ) : (
        sortButton
      )}
    </th>
  );
}
