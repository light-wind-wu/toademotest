'use client';

import { format, isValid, parse } from 'date-fns';
import { CalendarDays, Lock } from 'lucide-react';
import { useState } from 'react';
import { Calendar } from '@/components/calendar';
import { cn } from '@/lib/utils';
import { Popover as BasePopover } from '@base-ui-components/react/popover';

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
  /** Called when the picker popover closes, whether or not a date was chosen. */
  onClose?: () => void;
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
  onClose,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = parseDate(value);
  const min = parseDate(minDate);

  if (disabled) {
    return (
      <div className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-bg-subtle px-3 py-1 text-sm text-fg shadow-sm opacity-70">
        <span className={value ? 'text-fg' : 'text-fg-subtle'}>{displayDate(value) || placeholder}</span>
        <Lock size={14} className="shrink-0 text-fg-subtle" />
      </div>
    );
  }

  return (
    <BasePopover.Root open={open} onOpenChange={next => { setOpen(next); if (!next) onClose?.(); }}>
      <BasePopover.Trigger
        type="button"
        aria-label={placeholder}
        aria-expanded={open}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-md border border-border bg-surface px-3 py-1 text-sm shadow-sm',
          'outline-none transition-colors hover:border-border-strong',
          'focus-visible:outline-1 focus-visible:outline-offset-0 focus-visible:outline-accent',
          value ? 'text-fg' : 'text-fg-subtle',
          error && 'border-danger',
        )}
      >
        <span className="min-w-0 flex-1 truncate text-left">{displayDate(value) || placeholder}</span>
        <CalendarDays size={16} className="shrink-0 text-fg-muted" />
      </BasePopover.Trigger>
      <BasePopover.Portal>
        <BasePopover.Positioner
          side="bottom"
          align={align === 'right' ? 'end' : 'start'}
          sideOffset={4}
          collisionAvoidance={{ side: 'flip' }}
        >
          <BasePopover.Popup
            className={cn(
              'z-50 w-auto rounded-lg border border-border bg-surface-elevated p-1 shadow-md',
              'data-[starting-style]:opacity-0 data-[starting-style]:scale-95',
              'data-[ending-style]:opacity-0 data-[ending-style]:scale-95',
              'transition-all duration-150',
            )}
          >
            <Calendar
              selected={selected}
              defaultMonth={selected ?? min}
              captionLayout="dropdown"
              className="w-full"
              disabled={date => (min ? date < min : false)}
              onSelect={date => {
                onChange(format(date, 'yyyy-MM-dd'));
                setOpen(false);
              }}
            />
          </BasePopover.Popup>
        </BasePopover.Positioner>
      </BasePopover.Portal>
    </BasePopover.Root>
  );
}
