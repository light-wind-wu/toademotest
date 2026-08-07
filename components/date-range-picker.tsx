"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui-legacy/popover";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

// Local customised copy of PRIZM's Calendar (adds the dropdown header).
import { Calendar } from "@/components/calendar";

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface DateRangePickerProps {
  /** Controlled value. Pair with `onChange`. */
  value?: DateRange;
  /** Initial value in uncontrolled mode. */
  defaultValue?: DateRange;
  onChange?: (range: DateRange) => void;
  /** Shown on the trigger when no range is selected. */
  placeholder?: string;
  className?: string;
  /** Disables the whole control (the trigger). */
  disabled?: boolean;
  /**
   * Marks individual calendar days as unselectable. Applied to both the start
   * and end calendars, on top of the built-in "end can't precede start" rule.
   * Compose the exported `isPast` / `withinRanges` helpers here.
   */
  isDateDisabled?: (date: Date) => boolean;
  /**
   * How many years the header's year dropdown offers, centred on the current
   * year. Default 10. Use `fromYear`/`toYear` for an explicit span instead.
   */
  yearRange?: number;
  /** First selectable year in the header dropdown (overrides `yearRange`). */
  fromYear?: number;
  /** Last selectable year in the header dropdown (overrides `yearRange`). */
  toYear?: number;
  /** Hides the "Start date" / "End date" labels above each calendar. */
  hideLabels?: boolean;
  /** Hides the footer showing the selected range and the Clear button. */
  hideFooter?: boolean;
  /** Positions the calendar icon on the left (default) or right side of the trigger. */
  iconPosition?: 'left' | 'right';
  /** Called whenever the popover opens or closes (close = interaction end). */
  onOpenChange?: (open: boolean) => void;
}

/** Midnight today — the boundary for "no dates in the past" rules. */
export function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Predicate: any date strictly before today. Pass as `isDateDisabled`. */
export function isPast(date: Date) {
  return date < startOfToday();
}

/**
 * Builds a predicate that disables every day falling inside any of the given
 * ranges (inclusive of both ends). Use it to keep ranges from overlapping —
 * pass the *other* ranges so the one being edited stays selectable.
 */
export function withinRanges(ranges: DateRange[]) {
  return (date: Date) =>
    ranges.some((r) => r.from && r.to && date >= r.from && date <= r.to);
}

/** Formats a single date in British style, e.g. "21 Jun 2026". */
function formatDate(date?: Date) {
  if (!date) return undefined;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Renders the trigger label for a range, e.g. "21 Jun 2026 – 28 Jun 2026". */
export function formatRange(range?: DateRange, placeholder = "Select a date range") {
  const from = formatDate(range?.from);
  const to = formatDate(range?.to);
  if (from && to) return `${from} – ${to}`;
  if (from) return `${from} – …`;
  return placeholder;
}

/**
 * A date-range picker built from PRIZM primitives.
 *
 * PRIZM's Calendar is single-date only and the range-capable Date Picker is a
 * planned slug with no source yet, so this composes two stable Calendars (start
 * + end) inside a Popover. The end calendar disables any date before the chosen
 * start, keeping the range valid by construction.
 */
export function DateRangePicker({
  value,
  defaultValue,
  onChange,
  placeholder = "Select a date range",
  className,
  disabled,
  isDateDisabled,
  yearRange,
  fromYear,
  toYear,
  hideLabels = false,
  hideFooter = false,
  iconPosition = 'left',
  onOpenChange,
}: DateRangePickerProps) {
  // Forwarded to both calendars; relies on the local Calendar fork's dropdown header.
  const calendarYearProps = {
    captionLayout: "dropdown" as const,
    yearRange,
    fromYear,
    toYear,
  };
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState<DateRange>(defaultValue ?? {});
  const range = isControlled ? value : internal;

  const setRange = (next: DateRange) => {
    if (!isControlled) setInternal(next);
    onChange?.(next);
  };

  const handleFrom = (from: Date) => {
    // If the new start is after the current end, clear the end.
    const to = range?.to && range.to < from ? undefined : range?.to;
    setRange({ from, to });
  };

  const handleTo = (to: Date) => {
    setRange({ from: range?.from, to });
  };

  return (
    <Popover onOpenChange={onOpenChange}>
      <PopoverTrigger
        disabled={disabled}
        className={cn(
          "inline-flex h-9 min-w-64 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm text-fg shadow-sm",
          "hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          "disabled:cursor-not-allowed disabled:opacity-50",
          iconPosition === 'right' && "flex-row-reverse",
          !range?.from && "text-fg-muted",
          className,
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-fg-muted" />
        <span className="min-w-0 flex-1 truncate text-left">{formatRange(range, placeholder)}</span>
      </PopoverTrigger>

      <PopoverContent className="w-auto p-0">
        <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
          <div>
            {!hideLabels && (
              <Text size="xs" variant="muted" className="px-3 pt-3 font-medium">
                Start date
              </Text>
            )}
            <Calendar
              {...calendarYearProps}
              selected={range?.from}
              defaultMonth={range?.from}
              onSelect={handleFrom}
              disabled={isDateDisabled}
            />
          </div>
          <div>
            {!hideLabels && (
              <Text size="xs" variant="muted" className="px-3 pt-3 font-medium">
                End date
              </Text>
            )}
            <Calendar
              {...calendarYearProps}
              selected={range?.to}
              defaultMonth={range?.to ?? range?.from}
              onSelect={handleTo}
              disabled={(date) =>
                (range?.from ? date < range.from : false) ||
                (isDateDisabled?.(date) ?? false)
              }
            />
          </div>
        </div>

        {!hideFooter && (
          <>
            <Separator />
            <div className="flex items-center justify-between gap-2 p-3">
              <Text size="xs" variant="muted">
                {formatRange(range, "No range selected")}
              </Text>
              <Button
                variant="ghost"
                size="sm"
                disabled={!range?.from && !range?.to}
                onClick={() => setRange({})}
              >
                Clear
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}
