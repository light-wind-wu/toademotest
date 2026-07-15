import { z } from "zod";

import { createRepository, newId } from "../repository";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PROGRAMME SETUP — the BA's agreed field model (see the data diagram).
 * ─────────────────────────────────────────────────────────────────────────────
 *  A programme groups its details, intake windows, eligibility criteria and
 *  attached projects. Intakes and criteria are repeating CHILD ROWS (the diagram
 *  surfaces their `*_id` fields as "Child ID"), so they are modelled as nested
 *  arrays with their own ids rather than flat columns.
 *
 *  CONVENTIONS (shared by all three diagram entities):
 *   - Naming: the diagram is snake_case (DB-facing); keys here are camelCase to
 *     match the rest of the TS/Zod codebase (programme_title → programmeTitle).
 *   - Optionality follows each field's diagram "kind":
 *       • User "Required" and the PK  → required
 *       • everything else (Optional / Derived / Auto / Calculated / System-set /
 *         Child ID / FK)              → optional, so partial records still
 *         validate while the model settles. Tighten as the spec firms up.
 *   - ENUMs whose member set the diagram does not pin down are typed `z.string()`
 *     with a comment, rather than inventing values.
 */

export const PROG_STATUSES = ["Draft", "Active", "Completed"] as const;
export type ProgStatus = (typeof PROG_STATUSES)[number];

/** match_type — how a criteria group's rules combine. */
export const MATCH_TYPES = ["ALL", "ANY"] as const;
export type MatchType = (typeof MATCH_TYPES)[number];

// ── Eligibility criteria (child rows: criteria_group_id / criteria_rule_id) ───

/** A single eligibility check. */
export const CriteriaRuleSchema = z.object({
  /** criteria_rule_id — Child ID. */
  criteriaRuleId: z.string().optional(),
  /** criteria_type — ENUM (e.g. GPA, institution, citizenship); value set TBD. */
  criteriaType: z.string(),
  /** operator — ENUM (e.g. equals, contains, greater than, between); value set TBD. */
  operator: z.string(),
  /** value — JSON: the configured target value(s). */
  value: z.unknown(),
  /** grade_value — used when the rule checks grades / GPA. */
  gradeValue: z.string().optional(),
  /** institutions — selected schools when the rule is institution-based. */
  institutions: z.array(z.string()).optional(),
  /** option_id — groups alternative options under an ANY rule. */
  optionId: z.string().optional(),
});
export type CriteriaRule = z.infer<typeof CriteriaRuleSchema>;

/** One criteria group. `matchType` defines how its rules combine (ALL / ANY). */
export const CriteriaGroupSchema = z.object({
  /** criteria_group_id — Child ID. */
  criteriaGroupId: z.string().optional(),
  matchType: z.enum(MATCH_TYPES),
  rules: z.array(CriteriaRuleSchema),
});
export type CriteriaGroup = z.infer<typeof CriteriaGroupSchema>;

// ── Intake windows (child rows: intake_id) ────────────────────────────────────

/** A single application intake; a programme may run several. */
export const IntakeWindowSchema = z.object({
  /** intake_id — Child ID. */
  intakeId: z.string().optional(),
  /** intake_title — Auto, editable. */
  intakeTitle: z.string().optional(),
  /** application_open — DATE (YYYY-MM-DD). */
  applicationOpen: z.string(),
  /** application_close — DATE (YYYY-MM-DD). */
  applicationClose: z.string(),
  /** internship_start — MONTH/YEAR (YYYY-MM). */
  internshipStart: z.string().optional(),
  /** internship_end — MONTH/YEAR (YYYY-MM). */
  internshipEnd: z.string().optional(),
  /** duration_months — Calculated. */
  durationMonths: z.number().int().nonnegative().optional(),
});
export type IntakeWindow = z.infer<typeof IntakeWindowSchema>;

// ── Attached projects (child rows) ────────────────────────────────────────────

/** A project attached to the programme, with its system-resolved match state. */
export const AttachedProjectSchema = z.object({
  /** project_id — Required. */
  projectId: z.string().min(1),
  /** project_intake_id — Auto, editable. */
  projectIntakeId: z.string().optional(),
  /** attach_selected — Required. */
  attachSelected: z.boolean(),
  /** eligible_project_pool — UUID[], Calculated. */
  eligibleProjectPool: z.array(z.string()).optional(),
  /** education_level_match — Calculated. */
  educationLevelMatch: z.boolean().optional(),
  /** period_within_intake — Calculated. */
  periodWithinIntake: z.boolean().optional(),
  /** project_approval_status — ENUM, System-set; value set TBD. */
  projectApprovalStatus: z.string().optional(),
});
export type AttachedProject = z.infer<typeof AttachedProjectSchema>;

// ── Programme Setup ───────────────────────────────────────────────────────────

export const ProgrammeSchema = z.object({
  // PROGRAMME DETAILS
  /** education_level — ENUM, Required; value set TBD (programme taxonomy). */
  educationLevel: z.string().min(1),
  programmeTitle: z.string().min(1),
  /** programme_desc — Optional. */
  programmeDesc: z.string().optional(),
  /** form_template — Derived. */
  formTemplate: z.string().optional(),

  // INTAKE WINDOWS — repeating child rows.
  intakeWindows: z.array(IntakeWindowSchema),

  // ELIGIBILITY CRITERIA — repeating child rows. Groups are AND'd together.
  eligibilityCriteria: z.array(CriteriaGroupSchema),

  // ATTACHED PROJECTS — repeating child rows.
  attachedProjects: z.array(AttachedProjectSchema),

  // SYSTEM FIELDS
  /** programme_id — PK. */
  programmeId: z.string().min(1),
  /** status — ENUM, System-set. */
  status: z.enum(PROG_STATUSES),
  /** placements — INT, Calculated (total across attached projects). */
  placements: z.number().int().nonnegative().optional(),
  /**
   * applications_count — INT, Calculated (total submitted applications for this
   * programme). No applications↔programme link exists in the model yet, so for
   * the prototype this is seeded directly; derive it once applications carry a
   * `programmeId`.
   */
  applicationsCount: z.number().int().nonnegative().optional(),
  /** created_by — FK → User. */
  createdBy: z.string().optional(),
  /** created_at — TIMESTAMP, Auto (ISO string). */
  createdAt: z.string().optional(),
  /** updated_at — TIMESTAMP, Auto (ISO string). */
  updatedAt: z.string().optional(),
});
export type Programme = z.infer<typeof ProgrammeSchema>;

export const programmesRepository = createRepository<Programme>({
  resource: "programmes",
  schema: ProgrammeSchema,
  identify: (programme) => programme.programmeId,
});

/** A minimal valid programme, for seeding the dev store. */
export function exampleProgramme(overrides: Partial<Programme> = {}): Programme {
  return {
    programmeId: newId(),
    educationLevel: "University (Undergraduate)",
    programmeTitle: "YDSP Research Attachment",
    programmeDesc:
      "An eight-week research attachment under the Young Defence Scientists Programme.",
    status: "Active",
    placements: 20,
    intakeWindows: [
      {
        intakeId: newId(),
        intakeTitle: "2026 Main Intake",
        applicationOpen: "2026-01-01",
        applicationClose: "2026-03-31",
        internshipStart: "2026-06",
        internshipEnd: "2026-08",
        durationMonths: 3,
      },
    ],
    eligibilityCriteria: [
      {
        criteriaGroupId: newId(),
        matchType: "ALL",
        rules: [
          {
            criteriaRuleId: newId(),
            criteriaType: "education_level",
            operator: "is",
            value: "University",
          },
        ],
      },
      {
        criteriaGroupId: newId(),
        matchType: "ANY",
        rules: [
          {
            criteriaRuleId: newId(),
            criteriaType: "citizenship",
            operator: "is",
            value: "Singapore Citizen",
            optionId: "opt-citizenship",
          },
          {
            criteriaRuleId: newId(),
            criteriaType: "citizenship",
            operator: "is",
            value: "PR",
            optionId: "opt-citizenship",
          },
        ],
      },
    ],
    attachedProjects: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
