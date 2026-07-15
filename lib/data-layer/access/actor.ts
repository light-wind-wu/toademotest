import type { Role } from "./roles";

/**
 * The "who is doing this" object. Every data operation takes an Actor so the
 * access layer can decide what it may see and do.
 *
 * Passing the actor *explicitly* (rather than reading a global) is deliberate:
 * it is the only design that is safe on the server, where one process handles
 * many users concurrently and a module-level "current user" would leak between
 * requests. Resolve the actor per request (from the session/auth) and thread it
 * through your loader/action/component.
 */
export interface Actor {
  /** Stable identifier for this principal (user id). */
  id: string;
  /** The single role this actor is acting as. */
  role: Role;
  /**
   * Optional extra attributes for row-level rules — e.g. the team/department an
   * IO belongs to, so they only see their own applicants. Kept open on purpose.
   */
  attributes?: Record<string, unknown>;
}

/**
 * An unauthenticated caller. It has no role, so deny-by-default rejects every
 * protected operation. Use this as the resting state before sign-in.
 */
export const ANONYMOUS = Object.freeze({ id: "anonymous", role: null }) as {
  readonly id: "anonymous";
  readonly role: null;
};

export type MaybeActor = Actor | typeof ANONYMOUS;

/** True when there is an authenticated actor with a role. */
export function isAuthenticated(actor: MaybeActor): actor is Actor {
  return actor.role !== null;
}
