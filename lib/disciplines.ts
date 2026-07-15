/* ── Discipline of Study options ───────────────────────────────────────────
   A project may require more than one discipline, so the field is multi-select.
   For storage compatibility the selection is kept as a single delimited string
   (joined by " / ") — the same shape the seed data and the scoring/matching
   engine already use (see lib/scoring.ts and views/apply-form.tsx, which split
   discipline on "/" and ","). This keeps the type as `string` everywhere while
   the UI offers a proper multi-select dropdown.

   The option list is aligned with the disciplines the scoring engine recognises
   (DISCIPLINE_RELATED / DISCIPLINE_SUBJECTS in lib/scoring.ts). Keep entries
   atomic (no slashes) so a joined selection round-trips unambiguously. */

export const DISCIPLINE_OPTIONS: string[] = [
  'Computer Science',
  'Computer Engineering',
  'Software Engineering',
  'Information Technology',
  'Information Systems',
  'Cybersecurity',
  'Artificial Intelligence',
  'Data Science',
  'Business Analytics',
  'Statistics',
  'Operations Research',
  'Mathematics',
  'Electrical Engineering',
  'Electronic Engineering',
  'Mechanical Engineering',
  'Aerospace Engineering',
  'Mechatronics',
  'Robotics',
  'Systems Engineering',
  'Biomedical Engineering',
  'Physics',
  'Human-Computer Interaction',
  'Psychology',
];

/** Split a stored discipline string into its individual disciplines. */
export function parseDisciplines(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/\s*\/\s*|\s*,\s*/)
    .map((d) => d.trim())
    .filter(Boolean);
}

/** Join selected disciplines back into the canonical " / "-delimited string. */
export function joinDisciplines(values: string[]): string {
  return values.join(' / ');
}

/** Merge several discipline cells (e.g. the 3 template columns) into one
    canonical " / "-delimited string, de-duplicated case-insensitively. */
export function mergeDisciplines(values: (string | null | undefined)[]): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    for (const d of parseDisciplines(v)) {
      const key = d.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        out.push(d);
      }
    }
  }
  return joinDisciplines(out);
}

/** Toggle one discipline in/out of a delimited string (case-insensitive match). */
export function toggleDiscipline(value: string | null | undefined, opt: string): string {
  const set = parseDisciplines(value);
  const i = set.findIndex((d) => d.toLowerCase() === opt.toLowerCase());
  if (i >= 0) set.splice(i, 1);
  else set.push(opt);
  return joinDisciplines(set);
}
