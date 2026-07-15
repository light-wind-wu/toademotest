'use client';

/* ──────────────────────────────────────────────────────────────────────────
   MonthRangePicker — the month-granularity sibling of DateRangePicker.

   A single trigger that opens one month grid where you pick the start month,
   then the end month — on or after the start; picking the same month again
   makes a single-month period (the months in between shade as a range, live hover
   preview). Values are "MMMYY" strings (e.g. "Jun26"), matching MonthYearPicker
   so it drops into the same internship-period fields. Clicking an earlier month
   than the start restarts the range from there.
─────────────────────────────────────────────────────────────────────────── */
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MONTHS, formatMMMYY, parseMMMYY } from '@/lib/internship-period';
import { cn } from '@/lib/utils';

interface MonthRangePickerProps {
  start: string;                       // "MMMYY"
  end: string;                         // "MMMYY"
  onChange: (start: string, end: string) => void;
  placeholder?: string;
  minMonth?: string;                   // "MMMYY" — months before this are disabled
  error?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}

/** "Jun26" → "Jun 2026" for the trigger label. */
function displayMonth(value: string): string {
  const idx = parseMMMYY(value);
  if (idx === null) return '';
  return `${MONTHS[((idx % 12) + 12) % 12]} ${Math.floor(idx / 12)}`;
}

export default function MonthRangePicker({
  start,
  end,
  onChange,
  placeholder = 'Select months',
  minMonth,
  error = false,
  disabled = false,
  ariaLabel,
}: MonthRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ left: 0, top: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const startIdx = parseMMMYY(start);
  const endIdx = parseMMMYY(end);
  const minIdx = parseMMMYY(minMonth ?? '');

  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [hover, setHover] = useState<number | null>(null);

  const fallbackYear = useMemo(() => {
    if (startIdx !== null) return Math.floor(startIdx / 12);
    if (minIdx !== null) return Math.floor(minIdx / 12);
    return new Date().getFullYear();
  }, [startIdx, minIdx]);
  const [viewYear, setViewYear] = useState(fallbackYear);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (open) {
      setSelecting('start');
      setHover(null);
      setViewYear(fallbackYear);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function updatePopoverPosition() {
      const trigger = rootRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const popoverHeight = popoverRef.current?.offsetHeight ?? 240;
      const gap = 4;
      const top = rect.bottom + gap + popoverHeight > window.innerHeight - 12
        ? Math.max(12, rect.top - popoverHeight - gap)
        : rect.bottom + gap;
      setPopoverPos({
        left: Math.min(Math.max(12, rect.left), window.innerWidth - 268),
        top,
      });
    }
    updatePopoverPosition();
    window.addEventListener('resize', updatePopoverPosition);
    window.addEventListener('scroll', updatePopoverPosition, true);
    return () => {
      window.removeEventListener('resize', updatePopoverPosition);
      window.removeEventListener('scroll', updatePopoverPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setOpen(false);
      }
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

  function handleMonth(cellIdx: number) {
    if (selecting === 'start' || startIdx === null) {
      onChange(formatMMMYY(cellIdx), '');
      setSelecting('end');
      setHover(null);
    } else if (cellIdx < startIdx) {
      // Earlier than the start → restart the range from here.
      onChange(formatMMMYY(cellIdx), '');
      setSelecting('end');
      setHover(null);
    } else if (cellIdx === startIdx) {
      // Same month → a single-month period (the whole of that one month).
      onChange(start, formatMMMYY(cellIdx));
      setOpen(false);
    } else {
      onChange(start, formatMMMYY(cellIdx));
      setOpen(false);
    }
  }

  const previewEndIdx = endIdx
    ?? (selecting === 'end' && startIdx !== null && hover !== null && hover > startIdx ? hover : null);

  const triggerLabel = start
    ? end
      ? `${displayMonth(start)} – ${displayMonth(end)}`
      : `${displayMonth(start)} – Select end month`
    : placeholder;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel ?? placeholder}
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen(current => !current)}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 py-1 text-sm shadow-sm',
          'outline-none transition-colors hover:border-border-strong',
          'focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent',
          error ? 'border-danger' : 'border-border',
          disabled && 'cursor-not-allowed bg-bg-subtle opacity-70',
          start ? 'text-fg' : 'text-fg-subtle',
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <CalendarDays size={16} className="shrink-0 text-fg-muted" />
      </button>

      {open && mounted && createPortal(
        <div
          ref={popoverRef}
          className="fixed z-[300] w-64 rounded-lg border border-border bg-surface-elevated p-2 shadow-md"
          style={{ left: popoverPos.left, top: popoverPos.top }}
        >
          {/* Year navigation */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              aria-label="Previous year"
              onClick={() => setViewYear(y => y - 1)}
              className="grid h-7 w-7 place-items-center rounded-md text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm font-semibold text-fg tabular-nums">{viewYear}</span>
            <button
              type="button"
              aria-label="Next year"
              onClick={() => setViewYear(y => y + 1)}
              className="grid h-7 w-7 place-items-center rounded-md text-fg-muted transition-colors hover:bg-bg-subtle hover:text-fg"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-3 gap-1" onMouseLeave={() => setHover(null)}>
            {MONTHS.map((label, monthIdx) => {
              const cellIdx = viewYear * 12 + monthIdx;
              const isDisabled = minIdx !== null && cellIdx < minIdx;
              const isStart = startIdx === cellIdx;
              const isEnd = previewEndIdx === cellIdx;
              const inRange = startIdx !== null && previewEndIdx !== null
                && cellIdx > startIdx && cellIdx < previewEndIdx;
              const isEdge = isStart || isEnd;
              return (
                <button
                  key={label}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => handleMonth(cellIdx)}
                  onMouseEnter={() => setHover(cellIdx)}
                  aria-selected={isEdge}
                  className={cn(
                    'h-9 rounded-md text-sm transition-colors',
                    isDisabled && 'cursor-not-allowed text-fg-subtle opacity-40',
                    !isDisabled && !isEdge && inRange && 'bg-accent/12 text-fg',
                    !isDisabled && !isEdge && !inRange && 'text-fg hover:bg-bg-subtle',
                    isEdge && 'bg-accent font-semibold text-accent-fg',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>

          {/* Hint footer */}
          <div className="mt-2 border-t border-border pt-2 text-caption text-fg-muted">
            {selecting === 'start' || startIdx === null ? 'Pick the start month.' : 'Now pick the end month.'}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
