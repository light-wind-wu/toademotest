import type { StorageAdapter } from "./adapter";

/**
 * In-memory adapter. Data lives in a process-local Map and vanishes on reload.
 *
 * Two jobs:
 *  - the safe default on the **server** (React Router loaders/actions), where
 *    `localStorage` does not exist — see `config.ts`;
 *  - a clean backend for tests, where you want isolation and no persistence.
 *
 * Records are structurally cloned in and out so callers can't mutate stored
 * state by holding a reference — the same guarantee a real backend gives you.
 */
export function createMemoryAdapter(): StorageAdapter {
  const store = new Map<string, Map<string, unknown>>();

  function collectionMap(collection: string): Map<string, unknown> {
    let map = store.get(collection);
    if (!map) {
      map = new Map();
      store.set(collection, map);
    }
    return map;
  }

  function clone<T>(value: T): T {
    return structuredClone(value);
  }

  return {
    name: "memory",

    async get(collection, id) {
      const value = collectionMap(collection).get(id);
      return value === undefined ? null : clone(value);
    },

    async list(collection) {
      return Array.from(collectionMap(collection).values()).map(clone);
    },

    async put(collection, id, value) {
      collectionMap(collection).set(id, clone(value));
    },

    async remove(collection, id) {
      collectionMap(collection).delete(id);
    },

    async clear(collection) {
      store.delete(collection);
    },
  };
}
