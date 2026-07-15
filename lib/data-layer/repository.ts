import type { z } from "zod";

import { getAdapter } from "./config";
import { authorize, can } from "./access/guard";
import type { MaybeActor } from "./access/actor";
import { err, ok, type Result } from "./types";

/**
 * The repository factory — the only surface the app should touch for data.
 *
 * A repository wraps one entity ("resource") and gives you typed CRUD where
 * every call is:
 *   1. authorised against the policy (deny-by-default, row-level aware),
 *   2. validated with the entity's zod schema on the way in and out,
 *   3. routed through the active storage adapter (localStorage / memory / …).
 *
 * UI and route code never import an adapter, never read access rules inline, and
 * never touch localStorage directly — they call a repository. That is what keeps
 * the storage decision swappable and authorisation consistent.
 */
export interface RepositoryConfig<T> {
  /** Entity name. Used as the storage collection AND the policy resource key. */
  resource: string;
  /** zod schema for one record. Validates writes, and reads (to catch drift). */
  schema: z.ZodType<T>;
  /** Extract the primary key from an entity. */
  identify: (entity: T) => string;
}

export interface Repository<T> {
  readonly resource: string;
  /** Fetch one record by id, if the actor may read it. */
  get(actor: MaybeActor, id: string): Promise<Result<T>>;
  /** Fetch every record the actor may read. */
  list(actor: MaybeActor): Promise<Result<T[]>>;
  /** Create a record. Fails with `conflict` if the id already exists. */
  create(actor: MaybeActor, input: T): Promise<Result<T>>;
  /** Patch an existing record the actor may update. */
  update(actor: MaybeActor, id: string, patch: Partial<T>): Promise<Result<T>>;
  /** Delete a record the actor may delete. */
  remove(actor: MaybeActor, id: string): Promise<Result<void>>;
  /** Bind an actor once, for ergonomic call sites: `repo.as(actor).list()`. */
  as(actor: MaybeActor): BoundRepository<T>;
}

/** A repository with the actor pre-applied. */
export interface BoundRepository<T> {
  get(id: string): Promise<Result<T>>;
  list(): Promise<Result<T[]>>;
  create(input: T): Promise<Result<T>>;
  update(id: string, patch: Partial<T>): Promise<Result<T>>;
  remove(id: string): Promise<Result<void>>;
}

/** Generate a collision-resistant id for new records. */
export function newId(): string {
  return crypto.randomUUID();
}

export function createRepository<T>(config: RepositoryConfig<T>): Repository<T> {
  const { resource, schema, identify } = config;

  /** Parse an adapter record; reads that no longer match the schema are drift. */
  function parseStored(raw: unknown): Result<T> {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      return err("storage", `Stored '${resource}' record failed validation.`, {
        details: parsed.error.issues,
      });
    }
    return ok(parsed.data);
  }

  const repo: Repository<T> = {
    resource,

    async get(actor, id) {
      const adapter = getAdapter();
      let raw: unknown;
      try {
        raw = await adapter.get(resource, id);
      } catch (cause) {
        return err("storage", `Failed to read '${resource}'.`, { cause });
      }
      if (raw === null) return err("not_found", `No '${resource}' with id '${id}'.`);

      const record = parseStored(raw);
      if (!record.ok) return record;

      const allowed = authorize(actor, "read", resource, record.data);
      if (!allowed.ok) return allowed;

      return record;
    },

    // NOTE FOR THE REAL BACKEND — list() is fetch-all-then-filter BY DESIGN:
    // it pulls the whole collection via `adapter.list`, then validates and applies
    // row-level auth (`can`) per row in app memory. That is fine for the file/memory
    // prototype, but it does NOT scale and is why pagination is deferred:
    //   • Cosmetic { limit, offset } can be added here by slicing `visible` — but it
    //     still loads the whole table, so it buys nothing on scale.
    //   • Real pushdown pagination (SQL LIMIT/OFFSET) is blocked by THIS ordering:
    //     paginating before the auth filter yields unstable page sizes (rows the
    //     actor can't read get dropped after the slice). To fix it, the row-level
    //     predicate (`where` in access/permissions.ts — currently a JS closure) must
    //     move INTO the query, and StorageAdapter.list must gain limit/offset/order.
    //   Do that in the SQL adapter + a query-aware list contract, not here.
    async list(actor) {
      const allowed = authorize(actor, "list", resource);
      if (!allowed.ok) return allowed;

      const adapter = getAdapter();
      let rows: unknown[];
      try {
        rows = await adapter.list(resource);
      } catch (cause) {
        return err("storage", `Failed to list '${resource}'.`, { cause });
      }

      // Keep only rows that parse cleanly AND the actor may read (row-level).
      const visible: T[] = [];
      for (const row of rows) {
        const parsed = schema.safeParse(row);
        if (!parsed.success) continue; // skip corrupt/drifted rows rather than fail the list
        if (can(actor, "read", resource, parsed.data)) visible.push(parsed.data);
      }
      return ok(visible);
    },

    async create(actor, input) {
      const allowed = authorize(actor, "create", resource);
      if (!allowed.ok) return allowed;

      const parsed = schema.safeParse(input);
      if (!parsed.success) {
        return err("validation", `Invalid '${resource}'.`, { details: parsed.error.issues });
      }
      const entity = parsed.data;
      const id = identify(entity);
      const adapter = getAdapter();

      try {
        const existing = await adapter.get(resource, id);
        if (existing !== null) {
          return err("conflict", `A '${resource}' with id '${id}' already exists.`);
        }
        await adapter.put(resource, id, entity);
      } catch (cause) {
        return err("storage", `Failed to create '${resource}'.`, { cause });
      }
      return ok(entity);
    },

    async update(actor, id, patch) {
      const adapter = getAdapter();
      let raw: unknown;
      try {
        raw = await adapter.get(resource, id);
      } catch (cause) {
        return err("storage", `Failed to read '${resource}'.`, { cause });
      }
      if (raw === null) return err("not_found", `No '${resource}' with id '${id}'.`);

      const current = parseStored(raw);
      if (!current.ok) return current;

      // Authorise against the EXISTING record (row-level ownership applies here).
      const allowed = authorize(actor, "update", resource, current.data);
      if (!allowed.ok) return allowed;

      const merged = { ...current.data, ...patch };
      const parsed = schema.safeParse(merged);
      if (!parsed.success) {
        return err("validation", `Invalid '${resource}' update.`, { details: parsed.error.issues });
      }
      // Guard against id changes sneaking through a patch.
      if (identify(parsed.data) !== id) {
        return err("validation", `A '${resource}' id cannot be changed via update.`);
      }

      try {
        await adapter.put(resource, id, parsed.data);
      } catch (cause) {
        return err("storage", `Failed to update '${resource}'.`, { cause });
      }
      return ok(parsed.data);
    },

    async remove(actor, id) {
      const adapter = getAdapter();
      let raw: unknown;
      try {
        raw = await adapter.get(resource, id);
      } catch (cause) {
        return err("storage", `Failed to read '${resource}'.`, { cause });
      }
      if (raw === null) return err("not_found", `No '${resource}' with id '${id}'.`);

      const current = parseStored(raw);
      // Even if the stored shape drifted, we still authorise on what we have.
      const allowed = authorize(actor, "delete", resource, current.ok ? current.data : raw);
      if (!allowed.ok) return allowed;

      try {
        await adapter.remove(resource, id);
      } catch (cause) {
        return err("storage", `Failed to delete '${resource}'.`, { cause });
      }
      return ok(undefined);
    },

    as(actor) {
      return {
        get: (id) => repo.get(actor, id),
        list: () => repo.list(actor),
        create: (input) => repo.create(actor, input),
        update: (id, patch) => repo.update(actor, id, patch),
        remove: (id) => repo.remove(actor, id),
      };
    },
  };

  return repo;
}
