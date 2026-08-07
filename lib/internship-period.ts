/* ── Internship period & duration helpers ─────────────────────────────────────
   A project's internship PERIOD is stored at month granularity as "MMMYY"
   (e.g. "Jun26"). Its DURATION is a dropdown label like "6 Months". The two are
   linked by the convention:  end = start + N months  (Jun26 + 6 → Dec26).

   Programme INTAKE windows, by contrast, are stored as "YYYY-MM-DD" dates. The
   containment check (`periodWithinIntake`) bridges the two formats by reducing
   everything to an absolute month index (year * 12 + monthIndex). */

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/* ── MMMYY ↔ absolute month index ─────────────────────────────────────────── */

/** Parse "Jun26" → absolute month index (2026*12 + 5). Returns null on bad input. */
export function parseMMMYY(s: string | undefined | null): number | null {
  if (!s) return null;
  const m = s.trim().match(/^([A-Za-z]{3})\s?(\d{2})$/);
  if (!m) return null;
  const monthIdx = MONTHS.findIndex(mm => mm.toLowerCase() === m[1].toLowerCase());
  if (monthIdx < 0) return null;
  const year = 2000 + parseInt(m[2], 10);
  return year * 12 + monthIdx;
}

/** Format an absolute month index → "Jun26". */
export function formatMMMYY(monthIndex: number): string {
  const year = Math.floor(monthIndex / 12);
  const monthIdx = ((monthIndex % 12) + 12) % 12;
  return `${MONTHS[monthIdx]}${String(year % 100).padStart(2, '0')}`;
}

/** Parse a "YYYY-MM-DD" (intake window) → absolute month index. Returns null on bad input. */
export function monthIndexFromISO(iso: string | undefined | null): number | null {
  if (!iso) return null;
  const m = iso.trim().match(/^(\d{4})-(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) * 12 + (parseInt(m[2], 10) - 1);
}

/** "Jun26" → "2026-06-01" (first of the month). Lets a month-granularity picker store an
    ISO date so downstream date logic (timelines, ordering, containment) keeps working.
    Returns '' on bad input. */
export function mmmyyToISO(mmmyy: string | undefined | null): string {
  const idx = parseMMMYY(mmmyy ?? '');
  if (idx === null) return '';
  const year = Math.floor(idx / 12);
  const month = ((idx % 12) + 12) % 12;
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

/** "Dec27" → "2027-12-31" (LAST day of the month). Used for the END of a month-range
    period so a range covers WHOLE months: Nov→Dec means 1 Nov through 31 Dec. */
export function mmmyyToISOEnd(mmmyy: string | undefined | null): string {
  const idx = parseMMMYY(mmmyy ?? '');
  if (idx === null) return '';
  const year = Math.floor(idx / 12);
  const month = ((idx % 12) + 12) % 12;         // 0-based
  const lastDay = new Date(year, month + 1, 0).getDate();   // day 0 of next month = last day
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
}

/** "2026-06-01" → "Jun26" (inverse of mmmyyToISO, for displaying an ISO value in a MMMYY picker). */
export function isoToMMMYY(iso: string | undefined | null): string {
  const idx = monthIndexFromISO(iso);
  return idx === null ? '' : formatMMMYY(idx);
}

/* ── Duration label ↔ number of months ────────────────────────────────────── */

/** Parse "6 Months" / "1 Month" / "6" → 6. Returns null when no number is present. */
export function parseDurationMonths(s: string | undefined | null): number | null {
  if (!s) return null;
  const m = s.match(/\d+/);
  return m ? parseInt(m[0], 10) : null;
}

/** Format a month count → label, matching the existing dropdown ("6 Months", "1 Month"). */
export function formatDurationMonths(n: number): string {
  return `${n} Month${n === 1 ? '' : 's'}`;
}

/* ── The linked duration ↔ period arithmetic (end = start + N) ─────────────── */

/** addMonths("Jun26", 6) → "Dec26". Returns null if the start can't be parsed. */
export function addMonths(startMMMYY: string, months: number): string | null {
  const start = parseMMMYY(startMMMYY);
  if (start === null) return null;
  return formatMMMYY(start + months);
}

/** monthsBetween("Jun26", "Dec26") → 6. Null if either end can't be parsed. */
export function monthsBetween(startMMMYY: string, endMMMYY: string): number | null {
  const a = parseMMMYY(startMMMYY);
  const b = parseMMMYY(endMMMYY);
  if (a === null || b === null) return null;
  return b - a;
}

/* ── Containment: project period falls WITHIN an intake window ─────────────── */

/** True when the project's MMMYY period is fully contained in the intake's ISO window
    (boundaries inclusive, compared at month granularity). */
/** Tolerant month parser → absolute month index. Accepts ISO ("2027-12-01"),
    "MMMYY" ("Dec27" / "Dec 27"), and friendly "MMM YYYY" ("Dec 2027" / "December 2027").
    Used so period containment works no matter which format a period was stored in. */
export function toMonthIndex(s: string | undefined | null): number | null {
  if (!s) return null;
  const t = s.trim();
  const iso = monthIndexFromISO(t);
  if (iso !== null) return iso;
  const mmmyy = parseMMMYY(t);
  if (mmmyy !== null) return mmmyy;
  const m = t.match(/^(?:\d{1,2}\s+)?([A-Za-z]{3})[A-Za-z]*\.?\s+'?(\d{2,4})$/);   // "1 Jan 2027" / "Dec 2027" / "January 2027"
  if (m) {
    const monthIdx = MONTHS.findIndex(mm => mm.toLowerCase() === m[1].toLowerCase());
    if (monthIdx >= 0) {
      const yrNum = parseInt(m[2], 10);
      const year = yrNum < 100 ? 2000 + yrNum : yrNum;
      return year * 12 + monthIdx;
    }
  }
  return null;
}

export function periodWithinIntake(
  projectStart: string | undefined | null,
  projectEnd:   string | undefined | null,
  intakeStart:  string | undefined | null,
  intakeEnd:    string | undefined | null,
): boolean {
  const pStart = toMonthIndex(projectStart);
  const pEnd   = toMonthIndex(projectEnd);
  const iStart = toMonthIndex(intakeStart);
  const iEnd   = toMonthIndex(intakeEnd);
  if (pStart === null || pEnd === null || iStart === null || iEnd === null) return false;
  return iStart <= pStart && pEnd <= iEnd;
}

/** True when two month ranges OVERLAP — they share at least one whole month. Used to
    match a project to an intake: the project's hosting window ("when it can be hosted")
    and the intake's internship period just need to overlap — the intern does the project
    during the shared months. Handles both a narrow intake inside a broad project window
    (May–Jul project ↔ Jun intake) and a narrow project inside a broad intake window
    (May–Jul project ↔ Jan–Dec intake). Whole-month, inclusive. */
export function periodsOverlap(
  startA: string | undefined | null,
  endA:   string | undefined | null,
  startB: string | undefined | null,
  endB:   string | undefined | null,
): boolean {
  const a1 = toMonthIndex(startA);
  const a2 = toMonthIndex(endA);
  const b1 = toMonthIndex(startB);
  const b2 = toMonthIndex(endB);
  if (a1 === null || a2 === null || b1 === null || b2 === null) return false;
  return a1 <= b2 && b1 <= a2;
}

/** Build the 12 month options for a "MMMYY" picker, spanning [baseYear-1 .. baseYear+2]. */
export function monthOptions(fromMonthIndex: number, count: number): string[] {
  return Array.from({ length: count }, (_, i) => formatMMMYY(fromMonthIndex + i));
}

/* ── Friendly "MMM YYYY" labels (for the Excel template dropdown) ──────────── */

/** Build friendly "MMM YYYY" options (e.g. "Jan 2026") for every month across
    the inclusive [startYear .. endYear] span. Used as the Internship Period
    (start month) dropdown in the project submission template. */
export function monthYearOptions(startYear: number, endYear: number): string[] {
  const out: string[] = [];
  for (let y = startYear; y <= endYear; y++) {
    for (let m = 0; m < 12; m++) out.push(`${MONTHS[m]} ${y}`);
  }
  return out;
}

/** Normalise a period label to canonical "MMMYY". Accepts "Jan 2026", "Jan26",
    "Jan 26", "January 2026". Returns '' when it can't be parsed. */
export function periodLabelToMMMYY(label: string | undefined | null): string {
  if (!label) return '';
  const s = label.trim();
  const direct = parseMMMYY(s);            // already "Jun26" / "Jun 26"
  if (direct !== null) return formatMMMYY(direct);
  const m = s.match(/^(?:\d{1,2}\s+)?([A-Za-z]{3})[A-Za-z]*\.?\s+'?(\d{2,4})$/);  // "1 Jan 2026" / "Jan 2026" / "January 2026"
  if (!m) return '';
  const monthIdx = MONTHS.findIndex(mm => mm.toLowerCase() === m[1].toLowerCase());
  if (monthIdx < 0) return '';
  const yr = parseInt(m[2], 10) % 100;
  return `${MONTHS[monthIdx]}${String(yr).padStart(2, '0')}`;
}

/* ── Intake year (shifts seasonal window presets) ──────────────────────────────
   The internship-window presets are written in a single BASE year (MMMYY like
   "Jun26"). A form's chosen Intake Year shifts every preset forward by whole
   years, so the same seasonal windows work for a later cycle (e.g. Jun26 → Jun27).
   Shared by the programme-create and project-request forms. */
export const INTAKE_BASE_YEAR = 2026;      // the year the MMMYY presets are authored in
export const DEFAULT_INTAKE_YEAR = 2027;   // default selected intake year on new forms
export const INTAKE_YEARS = Array.from({ length: 5 }, (_, i) => INTAKE_BASE_YEAR + i);

/** Shift a "MMMYY" value by whole years, keeping the month (Jun26 +1yr → Jun27). */
export function shiftMMMYY(mmmyy: string, years: number): string {
  const idx = parseMMMYY(mmmyy);
  return idx === null ? mmmyy : formatMMMYY(idx + years * 12);
}

/* ── Internship-window presets per Intern Category (MOM A7) ─────────────────────
   The internship-window options that follow the selected intern category. A
   "Customise" option allows a bespoke range on top. Anchored to the base intake
   year; shift with shiftMMMYY for later cycles. Shared by the project-request and
   project-create forms. */
export type WindowPreset = { label: string; start: string; end: string };
export const INTERNSHIP_WINDOWS: Record<string, WindowPreset[]> = {
  'Junior College Scholar/Junior College Student': [
    { label: 'Jun 2026', start: 'Jun26', end: 'Jun26' },
    { label: 'Dec 2026', start: 'Dec26', end: 'Dec26' },
  ],
  'Post Junior College/Post Polytechnic Student': [
    { label: 'Jan – Jun 2026', start: 'Jan26', end: 'Jun26' },
  ],
  'Polytechnic Scholar/Polytechnic Student': [
    { label: 'Mar – Aug 2026', start: 'Mar26', end: 'Aug26' },
    { label: 'Sep 2026 – Feb 2027', start: 'Sep26', end: 'Feb27' },
    { label: 'Mar 2026 – Feb 2027', start: 'Mar26', end: 'Feb27' },
  ],
  'Undergraduate Scholar/Merit Scholar': [
    { label: 'Jan – Jun 2026', start: 'Jan26', end: 'Jun26' },
    { label: 'May – Sep 2026', start: 'May26', end: 'Sep26' },
    { label: 'Jul – Dec 2026', start: 'Jul26', end: 'Dec26' },
    { label: 'Jan – Dec 2026', start: 'Jan26', end: 'Dec26' },
  ],
  'Young Defence Scientist Programme': [
    { label: 'Sep – Dec 2026', start: 'Sep26', end: 'Dec26' },
  ],
};
// Undergraduate Student and Tech UP share the same three windows (no Jan – Dec, unlike the Scholar/Merit Scholar track).
INTERNSHIP_WINDOWS['Undergraduate Student'] = [
  { label: 'Jan – Jun 2026', start: 'Jan26', end: 'Jun26' },
  { label: 'May – Aug 2026', start: 'May26', end: 'Aug26' },
  { label: 'Jul – Dec 2026', start: 'Jul26', end: 'Dec26' },
];
INTERNSHIP_WINDOWS['Tech UP'] = [
  { label: 'Jan – Jun 2026', start: 'Jan26', end: 'Jun26' },
  { label: 'May – Sep 2026', start: 'May26', end: 'Sep26' },
  { label: 'Jul – Dec 2026', start: 'Jul26', end: 'Dec26' },
  { label: 'Jan – Dec 2026', start: 'Jan26', end: 'Dec26' },
];

