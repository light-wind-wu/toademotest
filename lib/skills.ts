/* ── Skills helpers ────────────────────────────────────────────────────────
   Skills are intentionally free-text (comma-typed), NOT a curated list — see
   the discipline-vs-skills decision. These helpers turn the raw comma string
   into individual skills so the UI can show them as removable pills (matching
   how multiple Discipline of Study values are presented). */

/** Split a raw comma-separated skills string into individual skills. */
export function parseSkills(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Remove one skill from a raw comma string (case-insensitive), re-joined. */
export function removeSkill(value: string | null | undefined, skill: string): string {
  return parseSkills(value)
    .filter((s) => s.toLowerCase() !== skill.toLowerCase())
    .join(', ');
}
