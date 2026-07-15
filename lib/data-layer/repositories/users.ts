import { z } from "zod";

import { createRepository } from "../repository";
import type { Actor } from "../access/actor";
import { ALL_ROLES, ROLES, type Role } from "../access/roles";

/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  USERS — the people who use the system, and the role each one holds.
 * ─────────────────────────────────────────────────────────────────────────────
 *  This is the one piece of RBAC that is DATA, not code:
 *
 *    - the role registry (what roles exist)      → `access/roles.ts`   (code)
 *    - the policy (what each role may do)         → `access/permissions.ts` (code)
 *    - the users (who exists, and their role)     → THIS repository      (data)
 *
 *  Users are created and change at runtime (people join, leave, get promoted),
 *  so they live in the store. Authentication resolves a user from here and turns
 *  it into the `Actor` that the rest of the data layer authorises against.
 */

export const UserSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  email: z.string().email(),
  /** The single role this user acts as — validated against the role registry. */
  role: z.enum(ALL_ROLES as unknown as [Role, ...Role[]]),
  /**
   * Optional display designation shown in the identity pickers (act-as, logins).
   * Lets two users of the SAME role read differently — e.g. an "Internship
   * Applicant" vs a "Scholarship Applicant" (both role `applicant`), or an
   * "AD (P&C)" (role `ad_pnc`). Falls back to the role's label when unset.
   */
  title: z.string().min(1).optional(),
});
export type User = z.infer<typeof UserSchema>;

export const usersRepository = createRepository<User>({
  resource: "users",
  schema: UserSchema,
  identify: (user) => user.id,
});

/**
 * A privileged identity used ONLY for the auth bootstrap — resolving "who is the
 * caller?" and powering the dev "act as" picker. This read happens *before* we
 * have a real actor (chicken-and-egg), so it cannot itself be actor-gated.
 * It is not exported to UI/route code; treat it as the system performing auth.
 */
const SYSTEM: Actor = { id: "system", role: ROLES.ioAdmin };

/** Resolve a single user by id (auth bootstrap). Returns null if absent/invalid. */
export async function resolveUser(id: string): Promise<User | null> {
  const res = await usersRepository.as(SYSTEM).get(id);
  return res.ok ? res.data : null;
}

/** Every user — for the dev "act as" picker. */
export async function listUsers(): Promise<User[]> {
  const res = await usersRepository.as(SYSTEM).list();
  return res.ok ? res.data : [];
}

/**
 * Directory pick-list: every user holding a given role, e.g. the PC Heads and
 * AD (P&C)s a project request can be addressed to. Reads as the system identity
 * (like `resolveUser`/`listUsers`) — it's a bootstrap directory read, not an
 * actor-gated one, so an IO who lacks the `users` grant can still populate the
 * form's recipient pickers.
 */
export async function listUsersByRole(role: Role): Promise<User[]> {
  const users = await listUsers();
  return users.filter((user) => user.role === role);
}

/**
 * The demo userbase — the identities the "act as" switcher and the login pickers
 * offer. Stable ids so the cookie/pickers survive reseeds (change a person's
 * name/email/role/title freely, but keep their id). `title` is the display
 * designation shown in the pickers; the two applicants share the `applicant`
 * role and are told apart by their title. See `app/auth/demo-identities.ts` for
 * which of these each login screen surfaces.
 */
export function exampleUsers(): User[] {
  return [
    // Back office
    { id: "u-ioadmin", name: "Davina Tan", email: "davina.tan@dsta.gov.sg", role: ROLES.ioAdmin, title: "IO Admin" },
    { id: "u-io", name: "Rachel Koh", email: "rachel.koh@dsta.gov.sg", role: ROLES.internshipOfficer, title: "Internship Officer" },
    { id: "u-adpnc", name: "Ng Shu Qi", email: "shuqi.ng@dsta.gov.sg", role: ROLES.adPnc, title: "AD (P&C)" },
    { id: "u-mentor", name: "Wei Jian Lim", email: "weijian.lim@dsta.gov.sg", role: ROLES.mentor, title: "Mentor" },
    { id: "u-director", name: "Abbey Chua", email: "abbey.chua@dsta.gov.sg", role: ROLES.director, title: "Director" },
    // Programme Centre Heads — the directory a project request is addressed to.
    // The Request Project form's "PC Head" picker lists these.
    { id: "u-pchead-weiming", name: "Tan Wei Ming", email: "weiming.tan@dsta.gov.sg", role: ROLES.pcHead, title: "PC Head" },
    { id: "u-pchead-priya", name: "Priya Nair", email: "priya.nair@dsta.gov.sg", role: ROLES.pcHead, title: "PC Head" },
    { id: "u-pchead-daniel", name: "Daniel Koh", email: "daniel.koh@dsta.gov.sg", role: ROLES.pcHead, title: "PC Head" },
    { id: "u-pchead-siti", name: "Siti Rahman", email: "siti.rahman@dsta.gov.sg", role: ROLES.pcHead, title: "PC Head" },
    { id: "u-pchead-marcus", name: "Marcus Tan", email: "marcust@dsta.gov.sg", role: ROLES.pcHead, title: "PC Head" },
    // AD (P&C) directory — the "AD (P&C)" picker on the same form. Ng Shu Qi
    // (u-adpnc, above) is the one who also signs in; these are addressees too.
    { id: "u-adpnc-benjamin", name: "Benjamin Lee", email: "benjamin.lee@dsta.gov.sg", role: ROLES.adPnc, title: "AD (P&C)" },
    { id: "u-adpnc-farah", name: "Farah Ismail", email: "farah.ismail@dsta.gov.sg", role: ROLES.adPnc, title: "AD (P&C)" },
    { id: "u-adpnc-kelvin", name: "Kelvin Ong", email: "kelvin.ong@dsta.gov.sg", role: ROLES.adPnc, title: "AD (P&C)" },
    { id: "u-adpnc-grace", name: "Grace Wong", email: "grace.wong@dsta.gov.sg", role: ROLES.adPnc, title: "AD (P&C)" },
    // Applicants — both role `applicant`; the title distinguishes the track.
    { id: "u-applicant-internship", name: "Jenny Aw", email: "jenny.aw@u.nus.edu", role: ROLES.applicant, title: "Internship Applicant" },
    { id: "u-applicant-scholarship", name: "Marcus Tan", email: "marcus.tan@dsta.gov.sg", role: ROLES.applicant, title: "Scholarship Applicant" },
  ];
}

/** Seed the demo users once, if the store is empty. Keeps the picker populated. */
export async function ensureUsersSeeded(): Promise<void> {
  const existing = await usersRepository.as(SYSTEM).list();
  if (existing.ok && existing.data.length > 0) return;
  for (const user of exampleUsers()) await usersRepository.as(SYSTEM).create(user);
}
