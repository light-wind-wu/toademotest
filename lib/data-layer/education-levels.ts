/**
 * The canonical education levels a placement or programme can open to.
 *
 * Single source of truth for the whole product — the project-request flow, the
 * Create Programme wizard, and the project upload forms all read from here, so
 * the list can never drift between pages. Change it once and every dropdown,
 * table, and derived type follows.
 */
export const EDUCATION_LEVELS = [
  "Junior College",
  "Post Junior College / Post Polytechnic",
  "Polytechnic",
  "University",
  "Integrated Programme (IP)",
] as const;

export type EducationLevel = (typeof EDUCATION_LEVELS)[number];
