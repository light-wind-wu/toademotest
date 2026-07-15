/**
 * Pure, timezone-light date helpers for the Gantt timeline.
 *
 * Everything works in *local* time at day granularity. Dates are normalised to
 * the start of their day before any arithmetic, so a bar that spans "1 Jun → 5
 * Jun" is five whole days wide regardless of the clock time on the inputs. This
 * keeps the coordinate maths integer-clean and free of off-by-one drift from
 * daylight-saving or sub-day noise.
 */

export const MS_PER_DAY = 86_400_000;

const MONTHS_LONG = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** Accept anything the public API allows and return a real Date. */
export type DateInput = Date | string | number;

/**
 * Coerce a `DateInput` to a Date. A bare `YYYY-MM-DD` string is read as a
 * *local* calendar day (not UTC midnight), so it lands on the day the author
 * meant rather than slipping a day west of GMT.
 */
export function toDate(input: DateInput): Date {
  if (input instanceof Date) return input;
  if (typeof input === "string") {
    const ymd = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input);
    if (ymd) {
      return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
    }
  }
  return new Date(input);
}

export function startOfDay(input: DateInput): Date {
  const d = toDate(input);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(input: DateInput, days: number): Date {
  const d = startOfDay(input);
  d.setDate(d.getDate() + days);
  return d;
}

/** Whole days from `b` to `a` (i.e. `a - b`), each floored to its day. */
export function diffDays(a: DateInput, b: DateInput): number {
  return Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / MS_PER_DAY);
}

export function isSameDay(a: DateInput, b: DateInput): boolean {
  return diffDays(a, b) === 0;
}

/** Monday-anchored week start. */
export function startOfWeek(input: DateInput): Date {
  const d = startOfDay(input);
  const dow = (d.getDay() + 6) % 7; // 0 = Monday … 6 = Sunday
  return addDays(d, -dow);
}

export function startOfMonth(input: DateInput): Date {
  const d = toDate(input);
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function addMonths(input: DateInput, months: number): Date {
  const d = startOfDay(input);
  return new Date(d.getFullYear(), d.getMonth() + months, d.getDate());
}

export function startOfYear(input: DateInput): Date {
  return new Date(toDate(input).getFullYear(), 0, 1);
}

export function daysInMonth(input: DateInput): number {
  const d = toDate(input);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Inclusive whole-day span of a bar — a single-day task reads as 1. */
export function spanDays(start: DateInput, end: DateInput): number {
  return diffDays(end, start) + 1;
}

/** "3 Jun" */
export function formatDay(input: DateInput): string {
  const d = toDate(input);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

/** "3 Jun 2026" */
export function formatFull(input: DateInput): string {
  return `${formatDay(input)} ${toDate(input).getFullYear()}`;
}

/** "June 2026" */
export function formatMonthYear(input: DateInput): string {
  const d = toDate(input);
  return `${MONTHS_LONG[d.getMonth()]} ${d.getFullYear()}`;
}

export function monthShort(input: DateInput): string {
  return MONTHS_SHORT[toDate(input).getMonth()];
}

/** "3 Jun – 5 Jun 2026" (inclusive range, year shown once where it can be). */
export function formatRange(start: DateInput, end: DateInput): string {
  const s = toDate(start);
  const e = toDate(end);
  if (isSameDay(s, e)) return formatFull(s);
  const sameYear = s.getFullYear() === e.getFullYear();
  return `${sameYear ? formatDay(s) : formatFull(s)} – ${formatFull(e)}`;
}
