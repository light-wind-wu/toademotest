"use client";

import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

import { formatMonth, monthOrdinal, type MonthValue } from "./month-picker";

/**
 * A start-and-end month range picker, built on the same year-stepper + 12-month
 * grid as {@link MonthPicker}. The Logistics "Internship Period" field wants a
 * whole-month window (e.g. "Aug 2026 – Dec 2026").
 *
 * Two layouts, chosen with `variant`:
 * - `"dual"` (default) — two grids side by side, Start month and End month, like
 *   the {@link DateRangePicker}. The end grid disables months before the start.
 * - `"single"` — one grid where the first click sets the start and the next on
 *   or after it sets the end, with the in-between months highlighted. Compact for
 *   tight rows.
 *
 * Values are plain `{ year, month }`, timezone-free and serialisable.
 */

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export interface MonthRange {
  start?: MonthValue;
  end?: MonthValue;
}

export interface MonthRangePickerProps {
  value: MonthRange;
  onChange: (value: MonthRange) => void;
  placeholder?: string;
  className?: string;
  id?: string;
  /** Popover layout. Defaults to `"dual"` — two grids side by side. */
  variant?: "dual" | "single";
}

/** "Aug 2026 – Dec 2026", "Aug 2026 – …", or the placeholder when empty. */
function formatRange(value: MonthRange, placeholder: string): string {
  if (!value.start) return placeholder;
  return `${formatMonth(value.start)} – ${
    value.end ? formatMonth(value.end) : "…"
  }`;
}

/** How a month cell should read: a range endpoint, an in-between month, or plain. */
type Highlight = "endpoint" | "range" | null;

/**
 * One year-stepper grid of twelve months. Presentation only — the parent owns
 * selection, so it drives both the dual and single layouts.
 */
function MonthGrid({
  label,
  viewYear,
  onYearChange,
  onPick,
  highlight,
  isDisabled,
}: {
  label?: string;
  viewYear: number;
  onYearChange: (year: number) => void;
  onPick: (value: MonthValue) => void;
  highlight: (ordinal: number) => Highlight;
  isDisabled?: (ordinal: number) => boolean;
}) {
  return (
    <div className="p-3">
      {label ? (
        <Text size="xs" variant="muted" weight="medium" className="mb-2 px-1">
          {label}
        </Text>
      ) : null}

      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onYearChange(viewYear - 1)}
          aria-label="Previous year"
          className="inline-grid size-7 place-items-center rounded-md text-fg-muted outline-none hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-medium text-fg tabular-nums">{viewYear}</span>
        <button
          type="button"
          onClick={() => onYearChange(viewYear + 1)}
          aria-label="Next year"
          className="inline-grid size-7 place-items-center rounded-md text-fg-muted outline-none hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>

      <div className="grid w-48 grid-cols-3 gap-1">
        {MONTHS_SHORT.map((m, index) => {
          const ordinal = monthOrdinal({ year: viewYear, month: index });
          const kind = highlight(ordinal);
          const disabled = isDisabled?.(ordinal) ?? false;
          return (
            <button
              key={m}
              type="button"
              disabled={disabled}
              onClick={() => onPick({ year: viewYear, month: index })}
              className={cn(
                "rounded-md px-2 py-1.5 text-sm text-fg outline-none transition-colors",
                "hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                "disabled:pointer-events-none disabled:opacity-40",
                kind === "range" && "bg-accent-subtle text-accent-fg",
                kind === "endpoint" && "bg-accent text-accent-fg hover:bg-accent",
              )}
            >
              {m}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MonthRangePicker({
  value,
  onChange,
  placeholder = "Select start and end month",
  className,
  id,
  variant = "dual",
}: MonthRangePickerProps) {
  const [open, setOpen] = useState(false);
  const currentYear = new Date().getFullYear();
  const [singleViewYear, setSingleViewYear] = useState(
    value.start?.year ?? currentYear,
  );
  const [startViewYear, setStartViewYear] = useState(
    value.start?.year ?? currentYear,
  );
  const [endViewYear, setEndViewYear] = useState(
    value.end?.year ?? value.start?.year ?? currentYear,
  );

  const startOrd = value.start ? monthOrdinal(value.start) : undefined;
  const endOrd = value.end ? monthOrdinal(value.end) : undefined;

  // ── Selection ──────────────────────────────────────────────────────────────

  /** Single-grid: first click is the start, the next on/after it is the end. */
  function pickSingle(month: MonthValue) {
    if (!value.start || value.end) {
      onChange({ start: month, end: undefined });
      return;
    }
    if (monthOrdinal(month) < monthOrdinal(value.start)) {
      onChange({ start: month, end: undefined });
      return;
    }
    onChange({ start: value.start, end: month });
    setOpen(false);
  }

  /** Dual-grid: the start grid. Clears an end that would fall before it. */
  function pickStart(month: MonthValue) {
    const keepEnd =
      value.end && monthOrdinal(value.end) >= monthOrdinal(month)
        ? value.end
        : undefined;
    onChange({ start: month, end: keepEnd });
  }

  /** Dual-grid: the end grid (months before the start are disabled). */
  function pickEnd(month: MonthValue) {
    onChange({ start: value.start, end: month });
  }

  const rangeHighlight = (ordinal: number): Highlight => {
    if (ordinal === startOrd || ordinal === endOrd) return "endpoint";
    if (
      startOrd !== undefined &&
      endOrd !== undefined &&
      ordinal > startOrd &&
      ordinal < endOrd
    ) {
      return "range";
    }
    return null;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border border-border bg-surface px-3 py-1 text-sm shadow-sm",
          "hover:bg-bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          !value.start && "text-fg-subtle",
          className,
        )}
      >
        <span className="truncate">{formatRange(value, placeholder)}</span>
        <CalendarDays className="size-4 shrink-0 text-fg-muted" />
      </PopoverTrigger>

      <PopoverContent sideOffset={4} className="w-auto p-0">
        {variant === "single" ? (
          <>
            <MonthGrid
              viewYear={singleViewYear}
              onYearChange={setSingleViewYear}
              onPick={pickSingle}
              highlight={rangeHighlight}
            />
            <Separator />
            <p className="px-3 py-2 text-xs text-fg-muted">
              {!value.start
                ? "Pick the first month."
                : !value.end
                  ? "Now pick the last month."
                  : "Pick a new first month to change the range."}
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-col divide-y divide-border sm:flex-row sm:divide-x sm:divide-y-0">
              <MonthGrid
                label="Start month"
                viewYear={startViewYear}
                onYearChange={setStartViewYear}
                onPick={pickStart}
                highlight={(ordinal) =>
                  ordinal === startOrd ? "endpoint" : null
                }
              />
              <MonthGrid
                label="End month"
                viewYear={endViewYear}
                onYearChange={setEndViewYear}
                onPick={pickEnd}
                highlight={(ordinal) => (ordinal === endOrd ? "endpoint" : null)}
                isDisabled={(ordinal) =>
                  startOrd !== undefined && ordinal < startOrd
                }
              />
            </div>

            <Separator />
            <div className="flex items-center justify-between gap-2 p-3">
              <Text size="xs" variant="muted">
                {formatRange(value, "No range selected")}
              </Text>
              <Button
                variant="ghost"
                size="sm"
                disabled={!value.start && !value.end}
                onClick={() => onChange({})}
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
