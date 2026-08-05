"use client";

/* ────────────────────────────────────────────────────────────────────────────
 * Local copy of PRIZM's Calendar (`@/components/ui/calendar`), customised for
 * this app. The vendored PRIZM component is left untouched — this lives in app
 * code (`~/`) so the design system stays pristine and re-pullable.
 *
 * Based on: components/ui/calendar.tsx (PRIZM 4.0)
 * Added:    an optional `captionLayout="dropdown"` header that turns the month +
 *           year into PRIZM `Select`s, plus `fromYear`/`toYear`/`yearRange` to
 *           bound the year list. The default `captionLayout="label"` reproduces
 *           upstream exactly.
 * Note:     PRIZM's range-capable Date Picker is still a `planned` slug; if it
 *           ships (with a dropdown header), prefer it over this copy.
 * ──────────────────────────────────────────────────────────────────────────── */

import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function startOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export interface CalendarProps {
  className?: string;
  /** Controlled selected date. Pair with `onSelect`. */
  selected?: Date;
  /** Initial selection in uncontrolled mode. */
  defaultSelected?: Date;
  onSelect?: (date: Date) => void;
  disabled?: (date: Date) => boolean;
  defaultMonth?: Date;
  /* ── Added in this local copy ─────────────────────────────────────────── */
  /**
   * Header style. `"label"` (default) shows a static month/year label with
   * prev/next arrows; `"dropdown"` makes the month and year clickable selects.
   */
  captionLayout?: "label" | "dropdown";
  /** First selectable year in the year dropdown. Defaults from `yearRange`. */
  fromYear?: number;
  /** Last selectable year in the year dropdown. Defaults from `yearRange`. */
  toYear?: number;
  /**
   * How many years the dropdown offers when `fromYear`/`toYear` are omitted —
   * centred on the current year. Default 10.
   */
  yearRange?: number;
  /** Tighter layout for fixed panels (e.g. apply availability 271×266). */
  compact?: boolean;
}

export function Calendar({
  className,
  selected,
  defaultSelected,
  onSelect,
  disabled,
  defaultMonth,
  captionLayout = "label",
  fromYear,
  toYear,
  yearRange = 10,
  compact = false,
}: CalendarProps) {
  const today = new Date();
  const isControlled = selected !== undefined;
  const [internalSelected, setInternalSelected] = useState<Date | undefined>(defaultSelected);
  const activeSelected = isControlled ? selected : internalSelected;
  const [viewDate, setViewDate] = useState(defaultMonth ?? activeSelected ?? today);

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDay = startOfMonth(year, month);
  const totalDays = daysInMonth(year, month);

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  // Year dropdown bounds: explicit from/to, else a window centred on this year.
  const startYear = fromYear ?? today.getFullYear() - Math.floor((yearRange - 1) / 2);
  const endYear = toYear ?? startYear + yearRange - 1;
  const years = Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i);

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div
      className={cn(
        "select-none",
        compact ? "box-border flex h-full w-full flex-col p-2.5" : "w-fit p-3",
        className,
      )}
    >
      {/* Header */}
      <div className={cn("flex items-center justify-between", compact ? "mb-1.5" : "mb-2")}>
        <button
          type="button"
          onClick={prevMonth}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-7 w-7 shrink-0")}
          aria-label="Previous month"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {captionLayout === "dropdown" ? (
          <div className="flex min-w-0 items-center gap-1">
            <Select
              value={MONTHS[month]}
              onValueChange={(value) =>
                setViewDate(new Date(year, MONTHS.indexOf(value as string), 1))
              }
            >
              <SelectTrigger
                aria-label="Month"
                className={cn(
                  "h-7 justify-start gap-1 px-2 py-0 text-sm font-medium shadow-none",
                  compact
                    ? "w-auto rounded-md border border-border bg-surface hover:bg-bg-muted"
                    : "w-auto border-0 bg-transparent hover:bg-bg-muted",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-calendar-dropdown>
                {MONTHS.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={String(year)}
              onValueChange={(value) =>
                setViewDate(new Date(Number(value), month, 1))
              }
            >
              <SelectTrigger
                aria-label="Year"
                className={cn(
                  "h-7 justify-start gap-1 px-2 py-0 text-sm font-medium shadow-none",
                  compact
                    ? "w-auto rounded-md border border-border bg-surface hover:bg-bg-muted"
                    : "w-auto border-0 bg-transparent hover:bg-bg-muted",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent data-calendar-dropdown>
                {years.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <span className="text-sm font-medium text-fg">
            {MONTHS[month]} {year}
          </span>
        )}
        <button
          type="button"
          onClick={nextMonth}
          className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-7 w-7 shrink-0")}
          aria-label="Next month"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Day names */}
      <div className={cn("grid grid-cols-7", compact ? "mb-0.5" : "mb-1")}>
        {DAYS.map((d) => (
          <div
            key={d}
            className={cn(
              "flex items-center justify-center text-xs font-medium text-fg-muted",
              compact ? "h-7" : "h-8",
            )}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className={cn("grid flex-1 grid-cols-7", compact ? "gap-y-0" : "gap-y-0.5")}>
        {cells.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} />;
          const date = new Date(year, month, day);
          const isToday = isSameDay(date, today);
          const isSelected = activeSelected ? isSameDay(date, activeSelected) : false;
          const isDisabled = disabled?.(date) ?? false;

          const handleClick = () => {
            if (!isControlled) setInternalSelected(date);
            onSelect?.(date);
          };

          return (
            <button
              key={day}
              type="button"
              disabled={isDisabled}
              onClick={handleClick}
              aria-selected={isSelected}
              aria-label={date.toLocaleDateString()}
              className={cn(
                "mx-auto flex items-center justify-center rounded-md text-sm transition-colors",
                compact ? "h-7 w-7" : "h-8 w-8",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
                "disabled:pointer-events-none disabled:opacity-30",
                isSelected && "bg-accent text-accent-fg font-semibold",
                !isSelected && isToday && "border border-accent text-accent font-semibold",
                !isSelected && !isToday && "text-fg hover:bg-bg-muted",
              )}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
