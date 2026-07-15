/**
 * Timeline scale: how a date range maps to pixels, and the two-tier header
 * ticks that label it.
 *
 * A single constant — `pxPerDay` — drives everything (bar geometry, drag
 * snapping, header widths), so the *same* day-based maths works at every zoom.
 * Changing scale only changes that density and which ticks we draw.
 */

import {
  addDays,
  addMonths,
  daysInMonth,
  diffDays,
  formatDay,
  formatMonthYear,
  monthShort,
  startOfDay,
  startOfMonth,
  startOfWeek,
  startOfYear,
  type DateInput,
} from "./date-utils";

export type GanttScale = "day" | "week" | "month";

/** One labelled cell in a header tier, already positioned in pixels. */
export interface Tick {
  key: string;
  label: string;
  left: number;
  width: number;
}

export interface ScaleModel {
  /** Snapped, inclusive domain the timeline actually draws. */
  domainStart: Date;
  domainEnd: Date;
  pxPerDay: number;
  totalWidth: number;
  /** Coarse top tier (month, or year) and fine bottom tier (day / week / month). */
  groups: Tick[];
  units: Tick[];
}

const PX_PER_DAY: Record<GanttScale, number> = {
  day: 44,
  week: 16,
  month: 4,
};

/** Floor a date to the start of the scale's unit. */
function unitFloor(scale: GanttScale, d: DateInput): Date {
  if (scale === "day") return startOfDay(d);
  if (scale === "week") return startOfWeek(d);
  return startOfMonth(d);
}

/** The next unit boundary strictly after `d` — the exclusive right edge. */
function unitCeilExclusive(scale: GanttScale, d: DateInput): Date {
  if (scale === "day") return addDays(d, 1);
  if (scale === "week") return addDays(startOfWeek(d), 7);
  return addMonths(startOfMonth(d), 1);
}

/** Build the full scale model for a range at a given zoom. */
export function buildScale(
  scale: GanttScale,
  rangeStart: DateInput,
  rangeEnd: DateInput,
): ScaleModel {
  const pxPerDay = PX_PER_DAY[scale];
  const domainStart = unitFloor(scale, rangeStart);
  const domainEnd = unitCeilExclusive(scale, rangeEnd);
  const totalWidth = diffDays(domainEnd, domainStart) * pxPerDay;

  const xOf = (d: DateInput) => diffDays(d, domainStart) * pxPerDay;

  const units: Tick[] = [];
  if (scale === "day") {
    for (let d = domainStart; d < domainEnd; d = addDays(d, 1)) {
      units.push({ key: d.toISOString(), label: String(d.getDate()), left: xOf(d), width: pxPerDay });
    }
  } else if (scale === "week") {
    for (let d = domainStart; d < domainEnd; d = addDays(d, 7)) {
      units.push({ key: d.toISOString(), label: formatDay(d), left: xOf(d), width: pxPerDay * 7 });
    }
  } else {
    for (let d = domainStart; d < domainEnd; d = addMonths(d, 1)) {
      units.push({ key: d.toISOString(), label: monthShort(d), left: xOf(d), width: daysInMonth(d) * pxPerDay });
    }
  }

  // Top tier groups the units: months for day/week, years for month.
  const groups: Tick[] = [];
  if (scale === "month") {
    for (let d = startOfYear(domainStart); d < domainEnd; d = new Date(d.getFullYear() + 1, 0, 1)) {
      const left = Math.max(0, xOf(d));
      const right = Math.min(totalWidth, xOf(new Date(d.getFullYear() + 1, 0, 1)));
      groups.push({ key: d.toISOString(), label: String(d.getFullYear()), left, width: right - left });
    }
  } else {
    for (let d = startOfMonth(domainStart); d < domainEnd; d = addMonths(d, 1)) {
      const left = Math.max(0, xOf(d));
      const right = Math.min(totalWidth, xOf(addMonths(d, 1)));
      groups.push({ key: d.toISOString(), label: formatMonthYear(d), left, width: right - left });
    }
  }

  return { domainStart, domainEnd, pxPerDay, totalWidth, groups, units };
}
