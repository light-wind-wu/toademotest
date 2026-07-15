"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/**
 * A month/year picker built from a PRIZM Popover.
 *
 * PRIZM's Calendar selects whole days; the design's Logistics fields want a
 * month granularity ("Internship Start Month"), so this offers a year stepper
 * over a 12-month grid. The value is a plain `{ year, month }` (month 0–11) to
 * keep it serialisable and timezone-free.
 */
export interface MonthValue {
  year: number;
  /** 0 = January … 11 = December. */
  month: number;
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** "Jun 2026", or `undefined` for an empty value. */
export function formatMonth(value?: MonthValue): string | undefined {
  if (!value) return undefined;
  return `${MONTHS_SHORT[value.month]} ${value.year}`;
}

/** A comparable ordinal for ordering/validation (e.g. start ≤ end). */
export function monthOrdinal(value: MonthValue): number {
  return value.year * 12 + value.month;
}

export interface MonthPickerProps {
  value?: MonthValue;
  onChange: (value: MonthValue) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  /** Disable months strictly before this one (e.g. the chosen start month). */
  min?: MonthValue;
}

export function MonthPicker({
  value,
  onChange,
  placeholder = "Select month",
  className,
  id,
  min,
}: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(
    value?.year ?? new Date().getFullYear(),
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-1 text-sm shadow-sm",
          "hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          !value && "text-fg-subtle",
          className,
        )}
      >
        <span className="truncate">{formatMonth(value) ?? placeholder}</span>
        <CalendarDays className="size-4 shrink-0 text-fg-muted" />
      </PopoverTrigger>

      <PopoverContent sideOffset={4} className="w-64 p-3">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setViewYear((y) => y - 1)}
            aria-label="Previous year"
            className="inline-grid size-7 place-items-center rounded-md text-fg-muted outline-none hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ChevronLeft className="size-4" />
          </button>
          <span className="text-sm font-medium text-fg tabular-nums">{viewYear}</span>
          <button
            type="button"
            onClick={() => setViewYear((y) => y + 1)}
            aria-label="Next year"
            className="inline-grid size-7 place-items-center rounded-md text-fg-muted outline-none hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          {MONTHS_SHORT.map((label, index) => {
            const selected = value?.year === viewYear && value?.month === index;
            const disabled =
              min !== undefined &&
              monthOrdinal({ year: viewYear, month: index }) < monthOrdinal(min);
            return (
              <button
                key={label}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onChange({ year: viewYear, month: index });
                  setOpen(false);
                }}
                className={cn(
                  "rounded-md px-2 py-1.5 text-sm text-fg outline-none transition-colors",
                  "hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                  "disabled:pointer-events-none disabled:opacity-40",
                  selected && "bg-accent text-accent-fg hover:bg-accent",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
