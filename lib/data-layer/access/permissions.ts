import type { Actor } from "./actor";
import { ROLES, type Role } from "./roles";

/**
 * The access policy: who may do what, to which resource, under which conditions.
 *
 * Model: Role-Based Access Control with optional row-level conditions.
 *  - A **resource** is an entity name (matches a repository's `resource`, e.g.
 *    "applications"). `"*"` matches any resource.
 *  - An **action** is a CRUD-ish verb. `"*"` matches any action.
 *  - A **rule** grants a role some actions on a resource, optionally narrowed by
 *    a `where` predicate evaluated against the specific record (row-level).
 *
 * **Deny by default.** Nothing is permitted unless a rule grants it. An actor
 * with no matching rule — including the anonymous/no-role caller — is denied.
 *
 * Keep this table the single source of truth for authorisation. Repositories
 * enforce it; they never re-implement checks inline.
 */
export type Action = "create" | "read" | "list" | "update" | "delete";

export interface Rule {
  /** Entity name this rule applies to, or "*" for all. */
  resource: string | "*";
  /** Actions granted, or "*" for all. */
  actions: Action[] | "*";
  /**
   * Optional row-level constraint. Receives the actor and the specific record;
   * return true to allow. Used for ownership ("an applicant sees only their own
   * record"). Omit for resource-wide access.
   *
   * Note: `create` and `list` have no single record to test, so `where` is
   * ignored for `create`, and for `list` it is applied per-row as a filter.
   */
  where?: (actor: Actor, record: unknown) => boolean;
}

/** The policy table: role → the rules granted to it. */
export type Policy = Partial<Record<Role, Rule[]>>;

/**
 * Common ownership predicate: the record's `ownerId` (or `applicantId`) equals
 * the actor's id. Adjust the owner field to your schema, or write per-resource
 * predicates inline.
 */
export function owns(actor: Actor, record: unknown): boolean {
  if (!record || typeof record !== "object") return false;
  const r = record as Record<string, unknown>;
  return r.ownerId === actor.id || r.applicantId === actor.id;
}

/**
 * The active policy.
 *
 * ⚠️ EXAMPLE RULES — these encode a *plausible* reading of the roles, not a
 * confirmed spec. They exist so the pattern is concrete and the example
 * repository works. Replace with the real authorisation matrix once it's
 * defined, keeping the same shape.
 *
 * The "applications" resource below is illustrative (see
 * `repositories/applications.ts`). Add a block per resource as you add repos.
 */
export const POLICY: Policy = {
  [ROLES.applicant]: [
    // An applicant may create applications and list them — but the row-level
    // `owns` rule below means `list`/`read` only ever surface their own records.
    { resource: "applications", actions: ["create", "list"] },
    { resource: "applications", actions: ["read", "update"], where: owns },
  ],
  [ROLES.internshipOfficer]: [
    // IOs handle applications: full read/list/update across the resource.
    { resource: "applications", actions: ["read", "list", "update"] },
    // IOs author and run programmes, and create/manage the live projects under them.
    { resource: "programmes", actions: ["create", "read", "list", "update"] },
    { resource: "projects", actions: ["create", "read", "list", "update"] },
    // IOs raise project requests to Programme Centres and track the ones they've sent.
    { resource: "project-requests", actions: ["create", "read", "list", "update"] },
  ],
  [ROLES.ioAdmin]: [
    // IO Admin: everything IOs can do, plus create and delete.
    { resource: "applications", actions: "*" },
    { resource: "programmes", actions: "*" },
    { resource: "projects", actions: "*" },
    { resource: "project-requests", actions: "*" },
    // Manages who has access. (The auth bootstrap reads users as a system
    // identity; this grant is for an actual user-management screen.)
    { resource: "users", actions: "*" },
  ],
  [ROLES.adPnc]: [
    // People & Culture's surface is the project-submission review: they read and
    // list projects (to approve submissions and track request fulfilment). They
    // also CREATE projects when responding to a request their centre received —
    // the "Create individually" wizard at /project-requests/:id/respond. No
    // applications/programmes grant — so neither the data layer nor the side-nav
    // surfaces those to them. Widen here if their remit grows.
    { resource: "projects", actions: ["create", "read", "list"] },
    // They also see the project requests addressed to them. The actor carries no
    // email, so the row-level match (adPncEmail === the signed-in AD's address)
    // can't be expressed here — the grant is resource-wide and the received-
    // requests loader narrows the list to their own address.
    { resource: "project-requests", actions: ["read", "list"] },
  ],
  [ROLES.director]: [
    // Director: read-wide oversight across every resource.
    { resource: "*", actions: ["read", "list"] },
  ],
};
