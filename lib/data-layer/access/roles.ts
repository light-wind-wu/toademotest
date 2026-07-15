/**
 * The role registry.
 *
 * Roles are an **open but fixed** set: the system has a known list, but it is
 * still being finalised. Add or rename roles here in one place — every policy
 * and guard reads from this registry, so the type system will flag any rule
 * that references a role you remove.
 *
 * The values below are the known roles at time of writing. They are NOT the
 * generic admin/user/guest trio — they are domain roles. Treat the exact set as
 * provisional and confirm against the product spec before relying on it.
 */
export const ROLES = {
  /** A candidate applying for / enrolled in an attachment. Owns their own data. */
  applicant: "applicant",
  /** Internship Officer (IO) — day-to-day case handling. */
  internshipOfficer: "internship_officer",
  /** IO Admin — elevated IO with administrative reach. */
  ioAdmin: "io_admin",
  /** AD (P&C) — Assistant Director, People & Culture. */
  adPnc: "ad_pnc",
  /** PC Head — Programme Centre Head; a project request is addressed to one. */
  pcHead: "pc_head",
  /** Mentor — a project supervisor named on a placement. */
  mentor: "mentor",
  /** Director — oversight, typically read-wide. */
  director: "director",
} as const;

/** A valid role value. Anything outside the registry is not a role. */
export type Role = (typeof ROLES)[keyof typeof ROLES];

/** All role values, e.g. for iterating in a role switcher. */
export const ALL_ROLES: readonly Role[] = Object.values(ROLES);

/** Human-readable labels for UI. British English. */
export const ROLE_LABELS: Record<Role, string> = {
  [ROLES.applicant]: "Applicant",
  [ROLES.internshipOfficer]: "Internship Officer",
  [ROLES.ioAdmin]: "IO Admin",
  [ROLES.adPnc]: "AD (P&C)",
  [ROLES.pcHead]: "PC Head",
  [ROLES.mentor]: "Mentor",
  [ROLES.director]: "Director",
};

/** Runtime guard for untrusted input (e.g. a value read from storage or a URL). */
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ALL_ROLES as string[]).includes(value);
}
