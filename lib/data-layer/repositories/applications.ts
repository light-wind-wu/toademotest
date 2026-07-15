import { z } from "zod";

import { createRepository, newId } from "../repository";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  EXAMPLE REPOSITORY — a template, not a finalised model.
 * ─────────────────────────────────────────────────────────────────────────────
 *  This shows the end-to-end pattern: a zod schema → `createRepository` → a typed,
 *  policy-enforced, backend-agnostic data API. The "applications" entity and its
 *  fields are illustrative. Replace/extend with real entities once the data model
 *  is decided, and update the matching block in `access/permissions.ts`.
 *
 *  Note the `applicantId` field: it is what the `owns` predicate in the policy
 *  uses to scope an applicant to their own record (row-level access).
 */

export const APPLICATION_STATUSES = ["draft", "submitted", "under_review", "accepted", "rejected"] as const;

export const ApplicationSchema = z.object({
  id: z.string().min(1),
  /** The applicant who owns this record — drives ownership checks. */
  applicantId: z.string().min(1),
  fullName: z.string().min(1),
  status: z.enum(APPLICATION_STATUSES),
  /** ISO timestamp; store as string so it survives JSON round-trips. */
  createdAt: z.string(),
});

export type Application = z.infer<typeof ApplicationSchema>;

export const applicationsRepository = createRepository<Application>({
  resource: "applications",
  schema: ApplicationSchema,
  identify: (application) => application.id,
});

/**
 * Convenience factory for a new draft. Callers still go through the repository's
 * `create`, which validates and authorises. `createdAt` is stamped by the caller
 * so the value is testable/deterministic where needed.
 */
export function draftApplication(input: {
  applicantId: string;
  fullName: string;
  createdAt: string;
}): Application {
  return {
    id: newId(),
    applicantId: input.applicantId,
    fullName: input.fullName,
    status: "draft",
    createdAt: input.createdAt,
  };
}
