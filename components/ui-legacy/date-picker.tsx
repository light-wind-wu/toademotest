'use client';

import { format, isValid, parse } from 'date-fns';
import { CalendarDays, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: string;
  /** Which edge the calendar popover aligns to. Use 'right' when the field sits
   *  in a right-hand column so the calendar opens inward and isn't clipped. */
  align?: 'left' | 'right';
  /** Highlights the trigger with a danger border for inline validation. */
  error?: boolean;
}

function displayDate(value: string) {
  const parsed = value ? parse(value, 'yyyy-MM-dd', new Date()) : null;
  return parsed && isValid(parsed) ? format(parsed, 'dd MMM yyyy') : '';
}

function parseDate(value?: string) {
  if (!value) return undefined;
  const parsed = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : undefined;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  disabled = false,
  minDate,
  align = 'left',
  error = false,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = parseDate(value);
  const min = parseDate(minDate);

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

  if (disabled) {
    return (
      <div className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-bg-subtle px-3 py-1 text-sm text-fg shadow-sm opacity-70">
        <span className={value ? 'text-fg' : 'text-fg-subtle'}>{displayDate(value) || placeholder}</span>
        <Lock size={14} className="shrink-0 text-fg-subtle" />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={placeholder}
        aria-expanded={open}
        onClick={() => setOpen(current => !current)}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-1 text-sm shadow-sm',
          'outline-none transition-colors hover:border-border-strong',
          'focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent',
          value ? 'text-fg' : 'text-fg-subtle',
          error && 'border-danger',
        )}
      >
        <span>{displayDate(value) || placeholder}</span>
        <CalendarDays size={16} className="shrink-0 text-fg-muted" />
      </button>
      {open && (
        <div className={cn(
          'absolute top-full z-50 mt-1 rounded-lg border border-border bg-surface-elevated p-1 shadow-md',
          align === 'right' ? 'right-0' : 'left-0',
        )}>
          <Calendar
            selected={selected}
            defaultMonth={selected ?? min}
            disabled={date => (min ? date < min : false)}
            onSelect={date => {
              onChange(format(date, 'yyyy-MM-dd'));
              setOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
