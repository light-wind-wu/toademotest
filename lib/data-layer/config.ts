import type { StorageAdapter } from "./adapters/adapter";
import { createLocalStorageAdapter } from "./adapters/local-storage";
import { createMemoryAdapter } from "./adapters/memory";

/**
 * THE BACKEND SWITCH.
 *
 * This is the one place that decides where data lives. The "we haven't picked a
 * database yet" decision is contained entirely here — nothing above this file
 * knows or cares.
 *
 * Current policy:
 *  - browser  → localStorage (the prototype backend)
 *  - server   → in-memory    (loaders/actions; ephemeral, per-process)
 *
 * To move to a real backend later: write an adapter that implements
 * `StorageAdapter` (e.g. `createHttpAdapter(baseUrl)` calling your API), then
 * return it from `selectAdapter()`. No repository or UI code changes.
 */
function selectAdapter(): StorageAdapter {
  const isBrowser = typeof window !== "undefined" && !!window.localStorage;
  return isBrowser ? createLocalStorageAdapter() : createMemoryAdapter();
}

let active: StorageAdapter | null = null;

/** The active storage adapter (memoised). Repositories call this, not adapters. */
export function getAdapter(): StorageAdapter {
  if (!active) active = selectAdapter();
  return active;
}

/**
 * Override the adapter — for tests, or to force a specific backend.
 * Pass `null` to fall back to {@link selectAdapter} on the next `getAdapter()`.
 */
export function setAdapter(adapter: StorageAdapter | null): void {
  active = adapter;
}
