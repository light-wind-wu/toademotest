'use client';

import * as React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type Row,
  type Table as TanStackTable,
} from '@tanstack/react-table';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TruncatedTooltip } from '@/components/ui-legacy/truncated-tooltip';
import { TooltipProvider } from '@/components/ui/tooltip';
import { ArrowUp, ArrowDown, ArrowUpDown } from 'lucide-react';

export type ColumnSize = 'short' | 'medium' | 'long' | 'icon' | 'fill';

export const DEFAULT_MIN_WIDTHS: Record<Exclude<ColumnSize, 'fill'>, number> = {
  short: 104,
  medium: 128,
  long: 176,
  icon: 48,
};

const FILL_MIN_WIDTH = 200;

export function getSizeValue(size: ColumnSize | number | undefined): number {
  if (typeof size === 'number') return size;
  if (size === 'fill') return FILL_MIN_WIDTH;
  if (size && size in DEFAULT_MIN_WIDTHS) return DEFAULT_MIN_WIDTHS[size as Exclude<ColumnSize, 'fill'>];
  return DEFAULT_MIN_WIDTHS.medium;
}

export interface DataTableColumnMeta<TData = unknown, TValue = unknown> {
  size?: ColumnSize | number;
  truncate?: boolean;
  lineClamp?: number;
  headerClassName?: string;
  labelClassName?: string;
  thClassName?: string;
  noResizable?: boolean;
  sticky?: 'left' | 'right';
}

declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> extends DataTableColumnMeta<TData, TValue> {}
}

export interface DataTableProps<T> {
  tableKey: string;
  columns: ColumnDef<T, any>[];
  data: T[];
  enableSorting?: boolean;
  enableResizing?: boolean;
  getRowId?: (row: T, index: number) => string;
  onRowClick?: (row: T) => void;
  className?: string;
  wrapperClassName?: string;
  emptyState?: React.ReactNode;
  renderSubRows?: (row: Row<T>, table: TanStackTable<T>) => React.ReactNode;
}

export function DataTable<T>({
  tableKey,
  columns,
  data,
  enableSorting = true,
  enableResizing = true,
  getRowId,
  onRowClick,
  className,
  wrapperClassName,
  emptyState,
  renderSubRows,
}: DataTableProps<T>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const tableColumns = React.useMemo<ColumnDef<T, any>[]>(() => {
    return columns.map((col) => {
      const size = col.meta?.size;
      const minSize = getSizeValue(size);
      return {
        ...col,
        minSize,
        size: col.size ?? minSize,
        enableResizing: col.meta?.noResizable !== true,
      };
    });
  }, [columns]);

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    enableColumnResizing: enableResizing,
    columnResizeMode: 'onChange',
    getRowId,
  });

  const rows = table.getRowModel().rows;
  const totalWidth = table.getTotalSize();
  const fillCount = table.getAllColumns().filter(col => col.columnDef.meta?.size === 'fill').length;
  const rightStickyOffsets = React.useMemo(() => {
    const offsets = new Map<string, number>();
    const cols = table.getAllColumns();
    let acc = 0;
    for (let i = cols.length - 1; i >= 0; i--) {
      const col = cols[i];
      if (col.columnDef.meta?.sticky === 'right') {
        offsets.set(col.id, acc);
        acc += col.getSize();
      }
    }
    return offsets;
  }, [table.getState().columnSizing]);

  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>;
  }

  return (
    <div className={wrapperClassName}>
      <TooltipProvider>
        <Table style={{ minWidth: totalWidth }} className={cn('w-full table-fixed text-left', className)}>
      <TableHeader className="bg-bg-subtle">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const size = header.column.columnDef.meta?.size;
              const isFill = size === 'fill';
              const minWidth = getSizeValue(size);
              const width = isFill
                ? (fillCount === 1 ? '100%' : `${100 / fillCount}%`)
                : header.getSize();
              const isResizing = header.column.getIsResizing();
              const canSort = enableSorting && header.column.getCanSort();
              const labelClassName = header.column.columnDef.meta?.labelClassName;
              const headerClassName = header.column.columnDef.meta?.headerClassName;
              const sticky = header.column.columnDef.meta?.sticky;
              const isStickyRight = sticky === 'right';
              const rightOffset = isStickyRight ? rightStickyOffsets.get(header.column.id) : undefined;
              const allowWrap =
                typeof labelClassName === 'string' &&
                (labelClassName.includes('whitespace-normal') ||
                  labelClassName.includes('whitespace-pre-wrap') ||
                  labelClassName.includes('whitespace-pre-line'));

              return (
                <TableHead
                  key={header.id}
                  className={cn(
                    'relative select-none',
                    canSort && 'cursor-pointer',
                    header.column.columnDef.meta?.thClassName,
                  )}
                  style={{
                    minWidth,
                    width,
                    boxSizing: 'border-box',
                    position: isStickyRight ? 'sticky' : undefined,
                    right: rightOffset,
                    zIndex: isStickyRight ? 10 : undefined,
                  }}
                  onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                >
                  <div
                    className={cn(
                      'flex items-center gap-1',
                      allowWrap ? 'min-h-10' : 'h-10 overflow-hidden',
                      headerClassName,
                    )}
                  >
                    <span
                      className={cn(
                        'flex-1',
                        !allowWrap && 'truncate',
                        labelClassName,
                      )}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </span>
                    {canSort && (
                      <span className="shrink-0">
                        {header.column.getIsSorted() === 'asc' ? (
                          <ArrowUp size={13} className="text-accent" />
                        ) : header.column.getIsSorted() === 'desc' ? (
                          <ArrowDown size={13} className="text-accent" />
                        ) : (
                          <ArrowUpDown size={13} className="text-fg-subtle" />
                        )}
                      </span>
                    )}
                  </div>
                  {enableResizing && header.column.getCanResize() && (
                    <div
                      onMouseDown={header.getResizeHandler()}
                      onTouchStart={header.getResizeHandler()}
                      className={cn(
                        'absolute right-0 top-0 h-full w-4 cursor-col-resize z-10',
                        'flex justify-end items-center',
                        'hover:bg-accent/10',
                        isResizing && 'bg-accent/15',
                      )}
                    >
                      <div
                        className={cn(
                          'h-full transition-all',
                          isResizing ? 'w-0.5 bg-accent' : 'w-0 bg-border hover:bg-accent',
                        )}
                      />
                    </div>
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <React.Fragment key={row.id}>
            <TableRow
              onClick={onRowClick ? () => onRowClick(row.original) : undefined}
              className={cn('group', onRowClick && 'cursor-pointer')}
            >
              {row.getVisibleCells().map((cell) => {
                const size = cell.column.columnDef.meta?.size;
                const isFill = size === 'fill';
                const minWidth = getSizeValue(size);
                const width = isFill
                  ? (fillCount === 1 ? '100%' : `${100 / fillCount}%`)
                  : cell.column.getSize();
                const truncate = cell.column.columnDef.meta?.truncate;
                const lineClamp = cell.column.columnDef.meta?.lineClamp;
                const sticky = cell.column.columnDef.meta?.sticky;
                const isStickyRight = sticky === 'right';
                const rightOffset = isStickyRight ? rightStickyOffsets.get(cell.column.id) : undefined;
                const content = flexRender(cell.column.columnDef.cell, cell.getContext());

                return (
                  <TableCell
                    key={cell.id}
                    style={{
                      minWidth,
                      width,
                      boxSizing: 'border-box',
                      position: isStickyRight ? 'sticky' : undefined,
                      right: rightOffset,
                      zIndex: isStickyRight ? 10 : undefined,
                    }}
                  >
                    {truncate ? (
                      <TruncatedTooltip>{content}</TruncatedTooltip>
                    ) : lineClamp ? (
                      <span className={cn(`line-clamp-${lineClamp}`)}>{content}</span>
                    ) : (
                      content
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
            {renderSubRows && renderSubRows(row, table)}
          </React.Fragment>
        ))}
      </TableBody>
    </Table>
      </TooltipProvider>
    </div>
  );
}

export { createColumnHelper };
export type { ColumnDef, Row };
