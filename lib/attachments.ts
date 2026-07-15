/* ──────────────────────────────────────────────────────────────────────────
   lib/attachments.ts — the late-binding programme↔project pool logic.

   An approved project is a POOLED resource. A programme intake draws from the
   pool by creating a ProjectAttachment row. Eligibility splits into:

   • HARD gate (excluded from the pool entirely):
       – project.educationLevel === programme.educationLevel
       – available placements remain (slots − attachments > 0)
   • SOFT warnings (still shown, amber, IO may attach anyway — the "ghost
     projects" safeguard; mismatches are surfaced with a reason, never hidden):
       – the project's hosting window overlaps the intake's period
       – the project's duration fits the months it overlaps the intake

   See docs/ENTITY-MODEL-TARGET.md and the programme-project-attachment model.
─────────────────────────────────────────────────────────────────────────── */
import type { Programme, ProjectEntry, ProjectAttachment, IntakeWindow } from './types';
import { toEducationLevel } from './data';
import { periodsOverlap, toMonthIndex, parseDurationMonths } from './internship-period';

/** How many intakes a project is currently attached to (across all programmes). */
export function attachedCount(projectId: string, attachments: ProjectAttachment[]): number {
  return attachments.reduce((n, a) => (a.projectId === projectId ? n + 1 : n), 0);
}

/** Placements still available in the SHARED pool. A project's slots are consumed only
    when an applicant is matched (`matched`), NOT by attaching to an intake — so the same
    project can be attached to several intakes while placements remain. */
export function availablePlacements(project: ProjectEntry): number {
  return project.slots - project.matched;
}

/** True when the project clears the HARD gate for a programme: it is an IO-approved
    pool project (every ProjectEntry is post-approval; archived = withdrawn, excluded),
    its Education Level matches, and it still has placements free. */
export function passesHardGate(
  project: ProjectEntry,
  programme: Pick<Programme, 'educationLevel'>,
): boolean {
  if (project.archived) return false;
  if (!project.educationLevel) return false;
  if (toEducationLevel(project.educationLevel) !== programme.educationLevel) return false;
  return availablePlacements(project) > 0;
}

/** The hard-gated pool of projects a programme can draw from.
    `extraIds` are always kept (e.g. projects already attached here in edit mode,
    whose placements may now read as full). */
export function poolFor(
  programme: Pick<Programme, 'educationLevel'>,
  projects: ProjectEntry[],
  extraIds: string[] = [],
): ProjectEntry[] {
  const keep = new Set(extraIds);
  return projects.filter(p => keep.has(p.id) || passesHardGate(p, programme));
}

/** SOFT warnings for attaching a project to a specific intake. Empty = a clean fit.
    Never blocks the attach — it only annotates it. */
export function attachWarnings(project: ProjectEntry, intake: IntakeWindow): string[] {
  const warnings: string[] = [];

  // The project's hosting window must overlap the intake's period (share some months).
  const hasPeriod = !!(project.internshipPeriodStart && project.internshipPeriodEnd);
  const pStart = toMonthIndex(project.internshipPeriodStart);
  const pEnd   = toMonthIndex(project.internshipPeriodEnd);
  const iStart = toMonthIndex(intake.start);
  const iEnd   = toMonthIndex(intake.end);
  if (hasPeriod && !periodsOverlap(intake.start, intake.end, project.internshipPeriodStart, project.internshipPeriodEnd)) {
    warnings.push(`The project's hosting window (${project.internshipPeriodStart}–${project.internshipPeriodEnd}) doesn't overlap this intake's period`);
  }

  // Duration fit: can the project's run fit in the months it shares with the intake?
  const durMonths = parseDurationMonths(project.internshipDuration);
  if (durMonths !== null && pStart !== null && pEnd !== null && iStart !== null && iEnd !== null) {
    const overlapMonths = Math.min(pEnd, iEnd) - Math.max(pStart, iStart) + 1;   // inclusive
    if (overlapMonths > 0 && durMonths > overlapMonths) {
      warnings.push(`Project duration (${durMonths} month${durMonths !== 1 ? 's' : ''}) is longer than the ${overlapMonths} month${overlapMonths !== 1 ? 's' : ''} it overlaps this intake`);
    }
  }

  return warnings;
}
