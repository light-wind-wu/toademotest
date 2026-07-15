import type { StorageAdapter } from "./adapter";

/**
 * Browser `localStorage` adapter — the current backend for the prototype.
 *
 * Layout: one JSON blob per collection, under `"<prefix>:<collection>"`, mapping
 * id → record. One key per collection (rather than per record) keeps `list()` a
 * single read and avoids scanning the whole localStorage keyspace.
 *
 * This adapter is **browser-only**. It throws on the server instead of silently
 * doing nothing, so SSR misuse surfaces loudly. In practice you won't hit that:
 * `config.ts` hands out the memory adapter on the server. Keep data access in
 * client effects/event handlers while localStorage is the backend.
 *
 * localStorage has no durability or capacity guarantees (~5MB, user-clearable).
 * It is fine for a showcase; it is not your eventual source of truth.
 */
export function createLocalStorageAdapter(prefix = "toa"): StorageAdapter {
  function keyFor(collection: string): string {
    return `${prefix}:${collection}`;
  }

  function readCollection(collection: string): Record<string, unknown> {
    if (typeof window === "undefined" || !window.localStorage) {
      throw new Error(
        "localStorage is unavailable (server render or disabled storage). " +
          "Access data from client code, or swap the backend in config.ts.",
      );
    }
    const raw = window.localStorage.getItem(keyFor(collection));
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
    } catch {
      // Corrupt blob — treat as empty rather than wedging every read.
      return {};
    }
  }

  function writeCollection(collection: string, records: Record<string, unknown>): void {
    window.localStorage.setItem(keyFor(collection), JSON.stringify(records));
  }

  return {
    name: "local-storage",

    async get(collection, id) {
      const records = readCollection(collection);
      return Object.prototype.hasOwnProperty.call(records, id) ? records[id] : null;
    },

    async list(collection) {
      return Object.values(readCollection(collection));
    },

    async put(collection, id, value) {
      const records = readCollection(collection);
      records[id] = value;
      writeCollection(collection, records);
    },

    async remove(collection, id) {
      const records = readCollection(collection);
      delete records[id];
      writeCollection(collection, records);
    },

    async clear(collection) {
      if (typeof window === "undefined" || !window.localStorage) return;
      window.localStorage.removeItem(keyFor(collection));
    },
  };
}
