/**
 * Shared result and error types for the data access layer (DAL).
 *
 * Every operation that can be denied, fail validation, or hit the storage
 * backend returns a {@link Result} rather than throwing. Access denial and
 * validation are *expected* outcomes here — modelling them as values forces
 * callers to handle them, instead of an uncaught throw leaking to the UI.
 */

/** The categories of failure a DAL operation can produce. */
export type DataErrorCode =
  /** The actor is not permitted to perform this action on this resource. */
  | "forbidden"
  /** No record exists for the given id. */
  | "not_found"
  /** The input (or a stored record) failed its zod schema. */
  | "validation"
  /** A uniqueness/identity clash (e.g. creating an id that already exists). */
  | "conflict"
  /** The storage backend itself failed (quota, unavailable, SSR misuse…). */
  | "storage"
  /** Anything uncategorised. */
  | "unknown";

export interface DataError {
  code: DataErrorCode;
  /** Human-readable, British English, safe to surface in dev logs. */
  message: string;
  /** Optional structured detail (e.g. zod issues) for debugging. */
  details?: unknown;
  /** The original error, when wrapping a throw. */
  cause?: unknown;
}

/** Discriminated union returned by every repository operation. */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: DataError };

/** Build a success result. */
export function ok<T>(data: T): Result<T> {
  return { ok: true, data };
}

/** Build a failure result. */
export function err<T = never>(
  code: DataErrorCode,
  message: string,
  extra?: Pick<DataError, "details" | "cause">,
): Result<T> {
  return { ok: false, error: { code, message, ...extra } };
}

/**
 * Narrowing helper for call sites that prefer early-returns:
 *   const res = await repo.get(actor, id);
 *   if (!isOk(res)) return handle(res.error);
 *   use(res.data);
 */
export function isOk<T>(result: Result<T>): result is { ok: true; data: T } {
  return result.ok;
}
