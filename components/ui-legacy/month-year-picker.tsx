'use client';

/* ──────────────────────────────────────────────────────────────────────────
   MonthYearPicker — a month-granularity picker for internship-period fields.

   Picks a month + year only (no day): tap ◀/▶ to change year, then tap a month
   in the 12-cell grid. Value is a "MMMYY" string (e.g. "Jun26"), matching the
   project internship-period format used across the portal — so it drops in for
   the old <select> month dropdowns with no conversion at the call site.

   `minMonth` (also MMMYY) greys out earlier months, e.g. so an End Month can't
   precede the chosen Start Month.
─────────────────────────────────────────────────────────────────────────── */
import { CalendarDays, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useMemo, useRef, useState } from 'react';
import { MONTHS, formatMMMYY, parseMMMYY } from '@/lib/internship-period';
import { cn } from '@/lib/utils';

interface MonthYearPickerProps {
  value: string;                       // "MMMYY", e.g. "Jun26"
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minMonth?: string;                   // "MMMYY" — months before this are disabled
  error?: boolean;                     // render an error border
  ariaLabel?: string;
}

/** "Jun26" → "Jun 2026" for the trigger label (friendlier than the raw token). */
function displayMonth(value: string): string {
  const idx = parseMMMYY(value);
  if (idx === null) return '';
  return `${MONTHS[((idx % 12) + 12) % 12]} ${Math.floor(idx / 12)}`;
}

export default function MonthYearPicker({
  value,
  onChange,
  placeholder = 'Select month',
  disabled = false,
  minMonth,
  error = false,
  ariaLabel,
}: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ left: 0, top: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const selectedIdx = parseMMMYY(value);
  const minIdx = parseMMMYY(minMonth ?? '');

  // Year shown in the grid: the selected year, else the min year, else "now".
  const fallbackYear = useMemo(() => {
    if (selectedIdx !== null) return Math.floor(selectedIdx / 12);
    if (minIdx !== null) return Math.floor(minIdx / 12);
    return new Date().getFullYear();
  }, [selectedIdx, minIdx]);
  const [viewYear, setViewYear] = useState(fallbackYear);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    function updatePopoverPosition() {
      const trigger = rootRef.current;
      if (!trigger) return;

      const rect = trigger.getBoundingClientRect();
      const popoverHeight = popoverRef.current?.offsetHeight ?? 220;
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

  // Re-anchor the grid's year whenever the popover (re)opens, so it lands on the
  // current value rather than wherever the user last browsed.
  useEffect(() => {
    if (open) setViewYear(fallbackYear);
  }, [open, fallbackYear]);

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

  if (disabled) {
    return (
      <div className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-bg-subtle px-3 py-1 text-sm text-fg shadow-sm opacity-70">
        <span className={value ? 'text-fg' : 'text-fg-subtle'}>{displayMonth(value) || placeholder}</span>
        <Lock size={14} className="shrink-0 text-fg-subtle" />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={ariaLabel ?? placeholder}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border bg-surface px-3 py-1 text-sm shadow-sm',
          'outline-none transition-colors hover:border-border-strong',
          'focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent',
          error ? 'border-danger' : 'border-border',
          value ? 'text-fg' : 'text-fg-subtle',
        )}
      >
        <span>{displayMonth(value) || placeholder}</span>
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
          <div className="grid grid-cols-3 gap-1">
            {MONTHS.map((label, monthIdx) => {
              const cellIdx = viewYear * 12 + monthIdx;
              const isSelected = selectedIdx === cellIdx;
              const isDisabled = minIdx !== null && cellIdx < minIdx;
              return (
                <button
                  key={label}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onChange(formatMMMYY(cellIdx));
                    setOpen(false);
                  }}
                  className={cn(
                    'h-9 rounded-md text-sm transition-colors',
                    isDisabled && 'cursor-not-allowed text-fg-subtle opacity-40',
                    !isDisabled && !isSelected && 'text-fg hover:bg-bg-subtle',
                    isSelected && 'bg-accent font-semibold text-accent-fg',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
