import { z } from "zod";

import { createRepository, newId } from "../repository";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  PROJECT — the BA's agreed field model (see the data diagram).
 * ─────────────────────────────────────────────────────────────────────────────
 *  A project a PC offers for one education level. It carries matching tags, an
 *  internship period, mentor details, and a small set of review/system fields.
 *  There is NO FK to Project Request — projects reconcile to a request via
 *  pc_code + education_level (soft match). `intakeId` is null until the project
 *  is attached to a programme intake.
 *
 *  Naming + optionality conventions are documented in `programmes.ts`.
 */

export const ProjectSchema = z.object({
  // USER FIELDS — PROJECT INFO
  projectTitle: z.string().min(1),
  /** project_scope — TEXT, Required. */
  projectScope: z.string().min(1),
  /** pc_code — Programme Centre code. */
  pcCode: z.string().min(1),
  /** education_level — ENUM, Required; value set TBD. */
  educationLevel: z.string().min(1),
  /** placement — INT placements offered for this education level. */
  placement: z.number().int().nonnegative(),

  // USER FIELDS — MATCHING TAGS (predefined lists; selection widgets, not marked
  // required on the diagram → optional here).
  /** discipline_of_study — ENUM[] multi-select; value set TBD. */
  disciplineOfStudy: z.array(z.string()).optional(),
  /** skills — ENUM[] multi-select; value set TBD. */
  skills: z.array(z.string()).optional(),
  /** tech_domain — ENUM single-select; value set TBD. */
  techDomain: z.string().optional(),
  /** emerging_areas — ENUM single-select; value set TBD. */
  emergingAreas: z.string().optional(),

  // USER FIELDS — INTERNSHIP PERIOD
  /** internship_start — MONTH/YEAR (YYYY-MM). */
  internshipStart: z.string().min(1),
  /** internship_end — MONTH/YEAR (YYYY-MM). */
  internshipEnd: z.string().min(1),
  /** duration_months — INT, Required. */
  durationMonths: z.number().int().nonnegative(),

  // USER FIELDS — MENTOR
  mentorName: z.string().min(1),
  mentorEmail: z.string().email(),
  mentorDesignation: z.string().min(1),
  /** mentor_writeup — TEXT, Optional. */
  mentorWriteup: z.string().optional(),

  // SYSTEM FIELDS
  /** project_id — PK. */
  projectId: z.string().min(1),
  /** intake_id — Nullable FK → Intake (null until attached). */
  intakeId: z.string().nullish(),
  /** review_status — ENUM, System-set; value set TBD. */
  reviewStatus: z.string().optional(),
  /** submitted_by — FK → User (the AD (P&C) who created the project). */
  submittedBy: z.string().optional(),
  /**
   * submitted_by_email — the submitting AD (P&C)'s email, captured at create time
   * from the signed-in user. Gives reviewers a durable reply-to that survives the
   * AD's account changing; the counterpart to `requestedByEmail` on a project
   * request. Optional: older projects predate its capture.
   */
  submittedByEmail: z.string().email().optional(),
  /** reviewed_by — FK → User (IO Admin). */
  reviewedBy: z.string().optional(),
  /**
   * review_remarks — the reviewer's note, captured when a project is rejected and
   * sent back to the submitter so they know what to change. Optional: set only on
   * rejection, cleared on approval.
   */
  reviewRemarks: z.string().optional(),
  /** submitted_at — TIMESTAMP, Auto (ISO string). */
  submittedAt: z.string().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const projectsRepository = createRepository<Project>({
  resource: "projects",
  schema: ProjectSchema,
  identify: (project) => project.projectId,
});

/** A minimal valid project, for seeding the dev store. */
export function exampleProject(overrides: Partial<Project> = {}): Project {
  return {
    projectTitle: "Acoustic signal classification with ML",
    projectScope:
      "Build and evaluate ML models that classify acoustic signatures from field sensors.",
    pcCode: "DSO",
    educationLevel: "University (Undergraduate)",
    placement: 3,
    disciplineOfStudy: ["Computer Science", "Electrical Engineering"],
    skills: ["Python", "Machine Learning"],
    techDomain: "Artificial Intelligence",
    emergingAreas: "Edge AI",
    internshipStart: "2026-06",
    internshipEnd: "2026-08",
    durationMonths: 3,
    mentorName: "Dr Lim Wei",
    mentorEmail: "wei.lim@dso.org.sg",
    mentorDesignation: "Principal Member of Technical Staff",
    projectId: newId(),
    intakeId: null,
    reviewStatus: "pending",
    submittedBy: "u-adpnc",
    submittedByEmail: "shuqi.ng@dsta.gov.sg",
    submittedAt: "2026-01-15T00:00:00.000Z",
    ...overrides,
  };
}
