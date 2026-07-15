'use client';

import { format, isValid, parse } from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { buttonVariants } from '@/components/ui-legacy/button';
import { cn } from '@/lib/utils';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

interface DateRangePickerProps {
  /** Range start (ISO yyyy-MM-dd). */
  start: string;
  /** Range end (ISO yyyy-MM-dd). */
  end: string;
  /** Fired whenever the range changes. An incomplete pick passes end = ''. */
  onChange: (start: string, end: string) => void;
  placeholder?: string;
  /** Earliest selectable day (ISO yyyy-MM-dd). */
  minDate?: string;
  /** Which edge the calendar popover aligns to. */
  align?: 'left' | 'right';
  /** Locks the start so only the end is editable (e.g. a running intake in edit mode). */
  lockStart?: boolean;
  error?: boolean;
  /** Renders the trigger read-only (e.g. an already-sent request line). */
  disabled?: boolean;
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const parsed = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : undefined;
}
function iso(date: Date) { return format(date, 'yyyy-MM-dd'); }
function displayDate(date?: Date) { return date ? format(date, 'dd MMM yyyy') : ''; }
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function startOfMonthDay(year: number, month: number) { return new Date(year, month, 1).getDay(); }
function daysInMonth(year: number, month: number) { return new Date(year, month + 1, 0).getDate(); }

export default function DateRangePicker({
  start,
  end,
  onChange,
  placeholder = 'Pick dates',
  minDate,
  align = 'left',
  lockStart = false,
  error = false,
  disabled = false,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const startDate = parseDate(start);
  const endDate = parseDate(end);
  const min = parseDate(minDate);

  // Which edge the next click sets. Reset each time the popover opens.
  const [selecting, setSelecting] = useState<'start' | 'end'>(lockStart ? 'end' : 'start');
  const [hover, setHover] = useState<Date | undefined>(undefined);
  const [viewDate, setViewDate] = useState<Date>(startDate ?? min ?? new Date());

  useEffect(() => {
    if (open) {
      setSelecting(lockStart ? 'end' : 'start');
      setHover(undefined);
      setViewDate(startDate ?? min ?? new Date());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function handleDay(date: Date) {
    if (lockStart) {
      // Only the closing date is editable, and it must fall after the open date.
      if (!startDate || date <= startDate) return;
      onChange(start, iso(date));
      setOpen(false);
      return;
    }
    if (selecting === 'start' || !startDate) {
      // First click: set the opening date, clear any close, then wait for the close.
      onChange(iso(date), '');
      setSelecting('end');
      setHover(undefined);
    } else if (date < startDate) {
      // Clicking before the opening date restarts the range from there.
      onChange(iso(date), '');
      setSelecting('end');
      setHover(undefined);
    } else if (isSameDay(date, startDate)) {
      // The close has to be a later day than the open.
      return;
    } else {
      onChange(start, iso(date));
      setOpen(false);
    }
  }

  // The end edge used for shading: the chosen end, or the hovered day while picking it.
  const previewEnd = endDate
    ?? (selecting === 'end' && startDate && hover && hover > startDate ? hover : undefined);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = startOfMonthDay(year, month);
  const totalDays = daysInMonth(year, month);
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const triggerLabel = startDate
    ? endDate
      ? `${displayDate(startDate)} – ${displayDate(endDate)}`
      : `${displayDate(startDate)} – Select end date`
    : placeholder;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={placeholder}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 py-1 text-sm shadow-sm',
          'outline-none transition-colors hover:border-border-strong',
          'focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent',
          'disabled:pointer-events-none disabled:opacity-50',
          startDate ? 'text-fg' : 'text-fg-subtle',
          error ? 'border-danger' : 'border-border',
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <CalendarDays size={16} className="shrink-0 text-fg-muted" />
      </button>

      {open && (
        <div className={cn(
          'absolute top-full z-50 mt-1 rounded-lg border border-border bg-surface-elevated p-3 shadow-md',
          align === 'right' ? 'right-0' : 'left-0',
        )}>
          {/* Header */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month - 1, 1))}
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7')}
              aria-label="Previous month"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-fg">{MONTHS[month]} {year}</span>
            <button
              type="button"
              onClick={() => setViewDate(new Date(year, month + 1, 1))}
              className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'h-7 w-7')}
              aria-label="Next month"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Day names */}
          <div className="mb-1 grid grid-cols-7">
            {DAYS.map(d => (
              <div key={d} className="flex h-8 w-9 items-center justify-center text-xs font-medium text-fg-muted">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-y-0.5" onMouseLeave={() => setHover(undefined)}>
            {cells.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="h-8 w-9" />;
              const date = new Date(year, month, day);
              const isDisabled = min ? date < min : false;
              const isStart = startDate ? isSameDay(date, startDate) : false;
              const isEnd = previewEnd ? isSameDay(date, previewEnd) : false;
              const inRange = startDate && previewEnd && date > startDate && date < previewEnd;
              const isEdge = isStart || isEnd;

              return (
                <div
                  key={day}
                  className={cn(
                    // The connecting bar: a tinted background that touches its neighbours.
                    (inRange || (isEdge && startDate && previewEnd && !isSameDay(startDate, previewEnd)))
                      && 'bg-accent/12',
                    isStart && startDate && previewEnd && !isSameDay(startDate, previewEnd) && 'rounded-l-md',
                    isEnd && startDate && previewEnd && !isSameDay(startDate, previewEnd) && 'rounded-r-md',
                  )}
                >
                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleDay(date)}
                    onMouseEnter={() => setHover(date)}
                    aria-selected={isEdge}
                    aria-label={date.toLocaleDateString()}
                    className={cn(
                      'flex h-8 w-9 items-center justify-center rounded-md text-sm transition-colors',
                      'focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent',
                      'disabled:pointer-events-none disabled:opacity-30',
                      isEdge && 'bg-accent text-accent-fg font-semibold',
                      !isEdge && inRange && 'text-fg',
                      !isEdge && !inRange && 'text-fg hover:bg-bg-muted',
                    )}
                  >
                    {day}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Hint footer */}
          <div className="mt-2 flex items-center gap-1.5 border-t border-border pt-2 text-caption text-fg-muted">
            {lockStart ? (
              <><Lock size={11} className="shrink-0" />Open date is locked. Pick the closing date.</>
            ) : selecting === 'start' || !startDate ? (
              'Pick the opening date.'
            ) : (
              'Now pick the closing date.'
            )}
          </div>
        </div>
      )}
    </div>
  );
}
