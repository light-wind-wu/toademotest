/**
 * The storage adapter contract.
 *
 * This is the seam that absorbs the "where does data actually live?" decision.
 * Repositories talk *only* to this interface; they never know whether records
 * sit in localStorage, an in-memory map, IndexedDB, or a remote API. Swapping
 * the backend later means writing one new adapter and changing one line in
 * `config.ts` — no repository or UI code changes.
 *
 * Everything is async on purpose: a future HTTP/DB adapter is naturally async,
 * so committing to Promises now means the rest of the codebase needs no rewrite
 * when the backend stops being synchronous localStorage.
 *
 * Adapters are deliberately dumb: they store and retrieve opaque records keyed
 * by `collection` + `id`. All typing, validation, and access control live above
 * them in the repository and access layers.
 */
export interface StorageAdapter {
  /** Identifies the adapter in errors/logs, e.g. "local-storage", "memory". */
  readonly name: string;

  /** Fetch a single record, or `null` if absent. */
  get(collection: string, id: string): Promise<unknown | null>;

  /** Fetch every record in a collection. Order is not guaranteed. */
  list(collection: string): Promise<unknown[]>;

  /** Create or overwrite a record. Callers (repositories) decide id and shape. */
  put(collection: string, id: string, value: unknown): Promise<void>;

  /** Remove a record. A no-op if it does not exist. */
  remove(collection: string, id: string): Promise<void>;

  /** Remove every record in a collection. */
  clear(collection: string): Promise<void>;
}
