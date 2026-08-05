import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { AppStatus, CriteriaRule, CriteriaGroup, Application } from './types';

export const SEED_VERSION = 'v24';

/* ── Application seed merge ──────────────────────────────────────────────────
   Instead of wiping localStorage on version mismatch, merge: keep all existing
   records and add any seed records that aren't already present. This preserves
   in-progress test flows (new applications, IO changes) across seed bumps.
   Only a manual Demo Reset wipes everything.
──────────────────────────────────────────────────────────────────────────── */
export function mergeAppsWithSeed(
  existing: Application[],
  seed: Application[],
): Application[] {
  const ids = new Set(existing.map(a => a.id));
  const newFromSeed = seed.filter(a => !ids.has(a.id));
  return newFromSeed.length > 0 ? [...existing, ...newFromSeed] : existing;
}

export function loadAppsFromStorage(
  key: string,
  verKey: string,
  targetVer: string,
  seed: Application[],
): Application[] {
  try {
    const raw = localStorage.getItem(key);
    const ver = localStorage.getItem(verKey);
    const existing: Application[] = raw ? JSON.parse(raw) : [];

    if (ver === targetVer && raw) return existing;

    // Version mismatch — merge seed records in, preserve existing data
    const merged = mergeAppsWithSeed(existing, seed);
    localStorage.setItem(key, JSON.stringify(merged));
    localStorage.setItem(verKey, targetVer);
    return merged;
  } catch {
    return seed;
  }
}

export function formatDate(s: string): string {
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatTimeline(start: string, end: string): string {
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function calcDaysLeft(end: string): number {
  const diff = new Date(end).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86_400_000));
}

/* Today's date in Singapore (UTC+8) as a YYYY-MM-DD string. Used for date-picker
   minimums and validation so "not in the past" is judged in SGT regardless of the
   user's local timezone. en-CA renders the ISO YYYY-MM-DD ordering. */
export function sgToday(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
}

/* Tomorrow's date in Singapore (UTC+8) as a YYYY-MM-DD string. Used to block
   selection of today and earlier dates in date pickers. */
export function sgTomorrow(): string {
  const today = sgToday();
  const [year, month, day] = today.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(date);
}

/* Later of two YYYY-MM-DD strings (ignores empties). Handy for computing a picker
   minimum from several constraints, e.g. max(today, openDate). */
export function maxDateStr(...dates: (string | undefined | null)[]): string {
  return dates.filter((d): d is string => !!d).reduce((a, b) => (b > a ? b : a), '');
}

/* Does a project's stored mentor identifier match the logged-in mentor's email?
   Accepts the full email (case-insensitive, trimmed) or its local-part prefix,
   so legacy id-style values and email values both resolve. */
export function mentorIdMatches(stored: string | undefined | null, email: string): boolean {
  if (!stored) return false;
  const s = stored.trim().toLowerCase();
  const e = email.trim().toLowerCase();
  return s === e || s === e.split('@')[0];
}

/* Vacancy status derived from live placements — single source of truth for the
   "Vacancy" column. Confirmed = all slots filled, Partial = some, Open = none. */
export type VacancyStatus = 'open' | 'in-progress' | 'confirmed';
export function vacancyStatus(matched: number, slots: number): VacancyStatus {
  if (slots > 0 && matched >= slots) return 'confirmed';
  if (matched > 0)                   return 'in-progress';
  return 'open';
}

export function generateProgId(existingIds: string[]): string {
  const max = existingIds
    .map(id => parseInt(id.replace('PROG-', ''), 10))
    .filter(n => !isNaN(n))
    .reduce((a, b) => Math.max(a, b), 0);
  return `PROG-${String(max + 1).padStart(4, '0')}`;
}

export function cn(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}

/* ── Natural-language eligibility engine ────────────────────────────────── */
export function joinAnd(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
}
export function joinOr(parts: string[]): string {
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} or ${parts[1]}`;
  return `${parts.slice(0, -1).join(', ')}, or ${parts[parts.length - 1]}`;
}

export function ruleToNatural(rule: CriteriaRule): string {
  const val = rule.value;
  const op  = rule.operator;
  switch (rule.type) {
    case 'citizenship': {
      // Stored as an array ("is any of" / "is one of"); tolerate legacy scalar too.
      const vals = Array.isArray(val) ? (val as string[]) : (val ? [val as string] : []);
      if (vals.length === 0) return '';
      const phrase = (c: string) =>
        c === 'Singapore Citizen'  ? 'a Singapore Citizen'  :
        c === 'Singapore PR'       ? 'a Singapore PR'       :
        c === 'Foreigner'          ? 'a foreign national'   :
        `a ${c} national`;
      const list = vals.length === 1 ? phrase(vals[0]) : joinOr(vals.map(phrase));
      return op === 'is not' ? `not be ${list}` : `be ${list}`;
    }
    case 'institution': {
      const vals = Array.isArray(val) ? (val as string[]) : [];
      if (vals.length === 0) return '';
      const names = vals.map(s => s.replace(/\s*\([A-Z]+\)\s*$/, '').trim());
      return names.length === 1 ? `be from ${names[0]}` : `be from ${joinOr(names)}`;
    }
    case 'race': {
      const vals = Array.isArray(val) ? (val as string[]) : (val ? [val as string] : []);
      if (vals.length === 0) return '';
      const list = vals.length === 1 ? vals[0] : joinOr(vals);
      return op === 'is not' ? `not be of ${list} ethnicity` : `be of ${list} ethnicity`;
    }
    case 'education': {
      const v = val as string;
      if (!v) return '';
      const map: Record<string, string> = {
        'Junior College':      'be a Junior College student',
        'IB Diploma':          'be enrolled in the IB Diploma programme',
        'Polytechnic':         'be a polytechnic student',
        'University (Year 1)': 'be in their first year of university',
        'University (Year 2)': 'be in their second year of university',
        'University (Year 3)': 'be in their third year of university',
        'University (Year 4)': 'be in their fourth year of university',
      };
      return op === 'is' ? (map[v] ?? `be studying at ${v} level`) : `not be a ${v} student`;
    }
    case 'gpa': {
      const v = val as string;
      if (!v) return '';
      const scope = rule.institutions?.length ? ` (${rule.institutions.join(' / ')} applicants)` : '';
      if (op === 'at least') return `have a minimum GPA of ${v}${scope}`;
      if (op === 'at most')  return `have a GPA of no more than ${v}${scope}`;
      return `have a GPA of ${v}${scope}`;
    }
    case 'major': {
      const v = val as string;
      if (!v) return '';
      if (op === 'contains')   return `be studying a course related to ${v}`;
      if (op === 'is exactly') return `be studying ${v}`;
      return `have a major in ${v}`;
    }
    case 'alevel_subject_grade': {
      const subjects = Array.isArray(val) ? (val as string[]) : [];
      const grade = rule.gradeValue ?? '';
      if (subjects.length === 0 || !grade) return '';
      const article = ['A', 'E'].includes(grade.toUpperCase()) ? 'an' : 'a';
      return `have achieved at least ${article} ${grade} in ${joinAnd(subjects)}`;
    }
    case 'ib_subject_grade': {
      const subjects = Array.isArray(val) ? (val as string[]) : [];
      const grade = rule.gradeValue ?? '';
      if (subjects.length === 0 || !grade) return '';
      return `have scored at least ${grade} in ${joinAnd(subjects)}`;
    }
    case 'ib_score': {
      const v = val as string;
      if (!v) return '';
      if (op === 'at least') return `have a minimum IB total score of ${v} points`;
      if (op === 'at most')  return `have an IB total score of no more than ${v} points`;
      return `have an IB score of ${v}`;
    }
    case 'clearance': {
      const v = val as string;
      if (!v) return '';
      if (op === 'is')     return `hold a ${v} security clearance`;
      if (op === 'is not') return `not hold a ${v} security clearance`;
      return '';
    }
    case 'age': {
      const v = val as string;
      if (!v) return '';
      if (op === 'at most')  return `be no older than ${v} years`;
      if (op === 'at least') return `be at least ${v} years old`;
      return `be ${v} years old`;
    }
    default:
      return '';
  }
}

export function groupToNatural(group: CriteriaGroup): string {
  if (group.matchType === 'ALL') {
    if (group.rules.length === 0) return '';
    const frags = group.rules.map(ruleToNatural).filter(Boolean);
    return joinAnd(frags);
  }
  const pathways = group.pathways ?? [];
  if (pathways.length === 0) return '';
  const pathwayFrags = pathways.map(p => {
    const frags = p.rules.map(ruleToNatural).filter(Boolean);
    return frags.length > 1 ? `(${joinAnd(frags)})` : frags[0] ?? '';
  }).filter(Boolean);
  return joinOr(pathwayFrags);
}

export function deriveAppStatus(appOpen: string, appDeadline: string): AppStatus {
  if (!appOpen || !appDeadline) return 'Closed';
  const d = new Date();
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (appOpen <= today && appDeadline >= today) return 'Open';
  return 'Closed';
}

export async function exportProjectTemplateXLSX(
  columns: { name: string; example: string; fieldType?: string; dropdownValues?: string[] }[],
): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Project Submission');

  // Hidden lookup sheet — stores dropdown lists to avoid Excel's 255-char inline limit
  const lookups = wb.addWorksheet('_Lookups');
  lookups.state = 'veryHidden';

  // Header row — DSTA blue background, white bold text
  const headerRow = ws.addRow(columns.map(c => c.name));
  headerRow.eachCell(cell => {
    cell.font  = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF00328A' } };
    cell.alignment = { vertical: 'middle', wrapText: true };
  });
  headerRow.height = 20;

  // Sample row — italicised, light grey background
  const sampleRow = ws.addRow(columns.map(c => c.example));
  sampleRow.eachCell(cell => {
    cell.font  = { italic: true, color: { argb: 'FF666666' }, size: 10 };
    cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
  });

  // Column widths
  ws.columns = columns.map(c => ({ width: Math.max(c.name.length + 6, 22) }));

  // Dropdown validation for rows 3–300
  // Values are written to _Lookups sheet and referenced by range to bypass the 255-char limit
  let lookupCol = 1;
  columns.forEach((col, colIdx) => {
    if (col.fieldType !== 'dropdown' || !col.dropdownValues?.length) return;

    // Write dropdown values into the lookups sheet
    col.dropdownValues.forEach((val, rowIdx) => {
      lookups.getCell(rowIdx + 1, lookupCol).value = val;
    });
    const lookupLetter = lookups.getColumn(lookupCol).letter;
    const rangeRef = `_Lookups!$${lookupLetter}$1:$${lookupLetter}$${col.dropdownValues.length}`;
    lookupCol++;

    const letter = ws.getColumn(colIdx + 1).letter;
    for (let r = 3; r <= 300; r++) {
      ws.getCell(`${letter}${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [rangeRef],
        showErrorMessage: true,
        errorStyle: 'stop',
        errorTitle: 'Invalid selection',
        error: 'Please select a value from the approved list.',
      };
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = 'DSTA_Project_Submission_Template.xlsx';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escape = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export async function exportToXLSX(filename: string, headers: string[], rows: (string | number)[][]): Promise<void> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');
  ws.addRow(headers);
  rows.forEach(r => ws.addRow(r));
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer as ArrayBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateEligibilitySummary(groups: CriteriaGroup[]): string[] {
  if (groups.length === 0) {
    return ['No eligibility restrictions have been set. All applicants are welcome to apply.'];
  }
  const frags = groups.map(groupToNatural).filter(Boolean);
  if (frags.length === 0) {
    return ['Eligibility criteria are configured but appear incomplete — please review before publishing.'];
  }
  if (frags.length === 1) return [`Applicants must ${frags[0]}.`];
  if (frags.length === 2) return [`Applicants must ${frags[0]}, and also ${frags[1]}.`];
  return [
    'Applicants must meet all of the following groups of criteria:',
    ...frags.map((f, i) => `${i + 1}. Must ${f}.`),
  ];
}
