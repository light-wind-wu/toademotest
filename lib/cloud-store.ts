/* Cloud KV sync over Supabase `app_kv`.
   - Keeps existing sync localStorage API (no page rewrite)
   - Hydrate cloud → localStorage on boot (drops shared keys missing from cloud)
   - Dual-write on localStorage.setItem for shared DATA keys only
   - Ops delete / Realtime DELETE → removeItem for shared keys
   - Seed version stamps (*_seed_v / *_ver) stay LOCAL — syncing them caused
     clear→missing ver→reseed→dual-write to wipe cloud business data
   - localStorage.clear() must NOT wipe cloud (rehydrate; pause dual-write)
*/
import { getSupabaseBrowserClient, isCloudSyncEnabled } from '@/lib/supabase/client';
import { SEED_VERSIONS, STORAGE_KEYS } from '@/lib/storage';

const TABLE = 'app_kv';

/** True for local-only seed/version stamps — never dual-write these to cloud. */
export function isSeedVersionKey(key: string): boolean {
  return key.endsWith('_seed_v') || key.endsWith('_ver');
}

/** Business data shared across browsers. Session / role / theme stay local. */
export const SHARED_CLOUD_KEYS = new Set<string>([
  'dsta_programmes',
  'dsta_projects',
  'dsta_requests',
  'dsta_project_submissions',
  'dsta_attachments',
  'dsta_project_drafts',
  'dsta_project_response_drafts',
  'dsta_request_audit_logs',
  'dsta_applications',
  'dsta_participants',
  'dsta_notifications',
  'dsta_access_log',
  'dsta_system_config',
  'dsta_menu_visibility',
  'dsta_subject_taxonomy',
  'dsta_scoring_weights',
  'dsta_apply_session_draft',
  'dsta_programme_view',
  'dsta_app_form_templates',
]);

export const CLOUD_HYDRATED_EVENT = 'dsta_cloud_hydrated';
export const CLOUD_UPDATED_EVENT = 'dsta_cloud_updated';

let applyingRemote = false;
/** Pause dual-write while recovering from localStorage.clear() / hydrate. */
let dualWritePaused = false;
let bridgeInstalled = false;
let origSetItem: ((key: string, value: string) => void) | null = null;
let origClear: (() => void) | null = null;
/** Ignore Realtime echoes from our own upserts / hydrate window. */
let suppressRealtimeUntil = 0;
const upsertTimers = new Map<string, ReturnType<typeof setTimeout>>();

function bumpRealtimeSuppress(ms = 2500) {
  suppressRealtimeUntil = Math.max(suppressRealtimeUntil, Date.now() + ms);
}

function cancelPendingUpserts() {
  for (const t of upsertTimers.values()) clearTimeout(t);
  upsertTimers.clear();
}

function writeLocalOnly(key: string, value: string) {
  if (origSetItem) origSetItem.call(window.localStorage, key, value);
  else window.localStorage.setItem(key, value);
}

function removeLocalOnly(key: string) {
  window.localStorage.removeItem(key);
}

function cancelPendingUpsert(key: string) {
  const t = upsertTimers.get(key);
  if (t) {
    clearTimeout(t);
    upsertTimers.delete(key);
  }
}

/** Drop a shared key from localStorage and notify listeners (ops delete / realtime). */
function mirrorLocalDelete(key: string) {
  if (isSeedVersionKey(key) || !SHARED_CLOUD_KEYS.has(key)) return;
  cancelPendingUpsert(key);
  removeLocalOnly(key);
  window.dispatchEvent(
    new CustomEvent(CLOUD_UPDATED_EVENT, { detail: { key, deleted: true } }),
  );
}

/**
 * After cloud restore, align local seed version stamps with the running app.
 * Versions are local-only; this prevents loadSeeded() from reseeding and
 * dual-writing seed over real cloud payloads.
 */
function stampLocalSeedVersions(): void {
  const stamps: [string, string][] = [
    [STORAGE_KEYS.programmes.verKey, SEED_VERSIONS.programmes],
    [STORAGE_KEYS.projects.verKey, SEED_VERSIONS.projects],
    [STORAGE_KEYS.requests.verKey, SEED_VERSIONS.requests],
    [STORAGE_KEYS.submissions.verKey, SEED_VERSIONS.submissions],
    [STORAGE_KEYS.attachments.verKey, SEED_VERSIONS.attachments],
    // Match highest in-app stamp used by admin / apply loaders
    ['dsta_applications_seed_v', '31'],
    ['dsta_app_form_templates_seed_v', '23'],
  ];
  for (const [key, value] of stamps) {
    writeLocalOnly(key, value);
  }
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function stableStringify(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function samePayload(localRaw: string | null, incomingValue: unknown): boolean {
  if (localRaw == null) return false;
  try {
    return stableStringify(JSON.parse(localRaw)) === stableStringify(incomingValue);
  } catch {
    return localRaw === stableStringify(incomingValue);
  }
}

async function upsertCloud(key: string, value: unknown): Promise<void> {
  if (isSeedVersionKey(key)) return;
  const sb = getSupabaseBrowserClient();
  if (!sb) return;
  bumpRealtimeSuppress();
  const { error } = await sb.from(TABLE).upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
  if (error) console.warn('[cloud-store] upsert failed', key, error.message);
}

function scheduleUpsert(key: string, value: unknown) {
  if (dualWritePaused || isSeedVersionKey(key)) return;
  const prev = upsertTimers.get(key);
  if (prev) clearTimeout(prev);
  upsertTimers.set(
    key,
    setTimeout(() => {
      upsertTimers.delete(key);
      if (dualWritePaused) return;
      void upsertCloud(key, value);
    }, 400),
  );
}

/** Push every shared key currently in localStorage up to Supabase. */
export async function pushAllSharedKeys(): Promise<void> {
  if (!isCloudSyncEnabled() || typeof window === 'undefined') return;
  const rows: { key: string; value: unknown }[] = [];
  for (const key of SHARED_CLOUD_KEYS) {
    if (isSeedVersionKey(key)) continue;
    const raw = window.localStorage.getItem(key);
    if (raw == null) continue;
    rows.push({ key, value: safeParse(raw) });
  }
  if (rows.length === 0) return;
  const sb = getSupabaseBrowserClient();
  if (!sb) return;
  bumpRealtimeSuppress(5000);
  const { error } = await sb.from(TABLE).upsert(
    rows.map((r) => ({ ...r, updated_at: new Date().toISOString() })),
    { onConflict: 'key' },
  );
  if (error) console.warn('[cloud-store] pushAll failed', error.message);
}

export type CloudKvRow = {
  key: string;
  value: unknown;
  updated_at: string | null;
};

/** Ops: list all `app_kv` rows (admin KV panel). */
export async function listCloudKv(): Promise<{
  enabled: boolean;
  rows: CloudKvRow[];
  error?: string;
}> {
  if (!isCloudSyncEnabled()) {
    return { enabled: false, rows: [] };
  }
  const sb = getSupabaseBrowserClient();
  if (!sb) return { enabled: false, rows: [] };

  const { data, error } = await sb
    .from(TABLE)
    .select('key, value, updated_at')
    .order('key', { ascending: true });

  if (error) {
    return { enabled: true, rows: [], error: error.message };
  }

  const rows: CloudKvRow[] = (data ?? []).map((row) => ({
    key: String(row.key),
    value: row.value,
    updated_at: row.updated_at ? String(row.updated_at) : null,
  }));

  return { enabled: true, rows };
}

/** Ops: upsert one `app_kv` row (JSON value). Also mirrors into localStorage when key is shared. */
export async function upsertCloudKv(
  key: string,
  value: unknown,
): Promise<{ ok: boolean; error?: string }> {
  if (!isCloudSyncEnabled()) {
    return { ok: false, error: 'Cloud sync is not configured.' };
  }
  const sb = getSupabaseBrowserClient();
  if (!sb) return { ok: false, error: 'Cloud sync is not configured.' };

  bumpRealtimeSuppress(2500);
  const { error } = await sb.from(TABLE).upsert(
    { key, value, updated_at: new Date().toISOString() },
    { onConflict: 'key' },
  );
  if (error) return { ok: false, error: error.message };

  if (typeof window !== 'undefined' && SHARED_CLOUD_KEYS.has(key) && !isSeedVersionKey(key)) {
    writeLocalOnly(key, stableStringify(value));
    window.dispatchEvent(
      new CustomEvent(CLOUD_UPDATED_EVENT, { detail: { key } }),
    );
  }

  return { ok: true };
}

/** Ops: delete one `app_kv` row by key. Also clears localStorage for shared keys. */
export async function deleteCloudKv(key: string): Promise<{ ok: boolean; error?: string }> {
  if (!isCloudSyncEnabled()) {
    return { ok: false, error: 'Cloud sync is not configured.' };
  }
  const sb = getSupabaseBrowserClient();
  if (!sb) return { ok: false, error: 'Cloud sync is not configured.' };

  cancelPendingUpsert(key);
  bumpRealtimeSuppress(2500);
  const { error } = await sb.from(TABLE).delete().eq('key', key);
  if (error) return { ok: false, error: error.message };

  if (typeof window !== 'undefined') {
    mirrorLocalDelete(key);
  }

  return { ok: true };
}

/** Ops: wipe every `app_kv` row.
 *  Pass `mirrorLocal: true` to also remove shared keys from this browser
 *  (needed for KV “Delete All”; Reset Demo Data reseeds without it). */
export async function clearAllCloudKv(opts?: {
  mirrorLocal?: boolean;
}): Promise<{
  ok: boolean;
  cleared: boolean;
  error?: string;
}> {
  if (!isCloudSyncEnabled()) {
    return { ok: true, cleared: false };
  }
  const sb = getSupabaseBrowserClient();
  if (!sb) return { ok: true, cleared: false };

  cancelPendingUpserts();
  dualWritePaused = true;
  bumpRealtimeSuppress(8000);

  try {
    // PostgREST requires a filter; neq '' matches every non-empty key.
    const { error } = await sb.from(TABLE).delete().neq('key', '');
    if (error) return { ok: false, cleared: false, error: error.message };

    if (opts?.mirrorLocal && typeof window !== 'undefined') {
      applyingRemote = true;
      try {
        for (const key of SHARED_CLOUD_KEYS) {
          cancelPendingUpsert(key);
          removeLocalOnly(key);
        }
        window.dispatchEvent(
          new CustomEvent(CLOUD_UPDATED_EVENT, { detail: { deleted: true, all: true } }),
        );
      } finally {
        applyingRemote = false;
      }
    }

    return { ok: true, cleared: true };
  } finally {
    dualWritePaused = false;
  }
}

/**
 * Pull cloud KV into localStorage. If cloud is empty, seed it from local.
 * Call once before the rest of the app reads storage.
 */
export async function hydrateFromCloud(): Promise<'skipped' | 'hydrated' | 'seeded'> {
  if (!isCloudSyncEnabled() || typeof window === 'undefined') return 'skipped';
  const sb = getSupabaseBrowserClient();
  if (!sb) return 'skipped';

  cancelPendingUpserts();
  dualWritePaused = true;
  bumpRealtimeSuppress(5000);

  try {
    const { data, error } = await sb.from(TABLE).select('key, value');
    if (error) {
      console.warn('[cloud-store] hydrate failed', error.message);
      return 'skipped';
    }

    if (!data?.length) {
      dualWritePaused = false;
      await pushAllSharedKeys();
      stampLocalSeedVersions();
      return 'seeded';
    }

    applyingRemote = true;
    try {
      const cloudShared = new Set<string>();
      for (const row of data) {
        // Ignore legacy version rows in cloud — stamps are local-only now.
        if (isSeedVersionKey(row.key)) continue;
        if (!SHARED_CLOUD_KEYS.has(row.key)) continue;
        cloudShared.add(row.key);
        const raw = stableStringify(row.value);
        writeLocalOnly(row.key, raw);
      }
      // Drop shared keys that no longer exist in cloud (cold-start delete sync).
      for (const key of SHARED_CLOUD_KEYS) {
        if (!cloudShared.has(key) && window.localStorage.getItem(key) != null) {
          cancelPendingUpsert(key);
          removeLocalOnly(key);
        }
      }
      stampLocalSeedVersions();
    } finally {
      applyingRemote = false;
    }

    window.dispatchEvent(new Event(CLOUD_HYDRATED_EVENT));
    return 'hydrated';
  } finally {
    dualWritePaused = false;
  }
}

/** Intercept localStorage writes; clear() rehydrates instead of wiping cloud. */
export function installLocalStorageBridge(): void {
  if (bridgeInstalled || typeof window === 'undefined' || !isCloudSyncEnabled()) return;
  bridgeInstalled = true;
  origSetItem = window.localStorage.setItem.bind(window.localStorage);
  origClear = window.localStorage.clear.bind(window.localStorage);

  window.localStorage.setItem = (key: string, value: string) => {
    origSetItem!(key, value);
    if (applyingRemote || dualWritePaused) return;
    if (isSeedVersionKey(key)) return;
    if (!SHARED_CLOUD_KEYS.has(key)) return;
    scheduleUpsert(key, safeParse(value));
  };

  // DevTools "Clear" must empty the browser cache only — cloud stays, then refill local.
  window.localStorage.clear = () => {
    cancelPendingUpserts();
    dualWritePaused = true;
    origClear!();
    void (async () => {
      try {
        await hydrateFromCloud();
        window.dispatchEvent(new Event(CLOUD_HYDRATED_EVENT));
      } catch (err) {
        console.warn('[cloud-store] rehydrate after clear failed', err);
      } finally {
        dualWritePaused = false;
      }
    })();
  };
}

/**
 * Subscribe to remote KV changes and mirror into localStorage.
 * Does NOT auto-reload (that caused an infinite Syncing loop via write echoes).
 */
export function subscribeCloudRealtime(): () => void {
  if (!isCloudSyncEnabled() || typeof window === 'undefined') return () => {};
  const sb = getSupabaseBrowserClient();
  if (!sb) return () => {};

  const channel = sb
    .channel('app_kv_sync')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: TABLE },
      (payload) => {
        if (Date.now() < suppressRealtimeUntil) return;

        if (payload.eventType === 'DELETE') {
          const old = payload.old as { key?: string } | null;
          if (!old?.key) return;
          applyingRemote = true;
          try {
            mirrorLocalDelete(old.key);
          } finally {
            applyingRemote = false;
          }
          return;
        }

        const row = payload.new as { key?: string; value?: unknown } | null;
        if (!row?.key || isSeedVersionKey(row.key)) return;
        if (!SHARED_CLOUD_KEYS.has(row.key)) return;
        if (samePayload(window.localStorage.getItem(row.key), row.value)) return;

        applyingRemote = true;
        try {
          const incoming = stableStringify(row.value ?? null);
          writeLocalOnly(row.key, incoming);
        } finally {
          applyingRemote = false;
        }

        window.dispatchEvent(
          new CustomEvent(CLOUD_UPDATED_EVENT, { detail: { key: row.key } }),
        );
      },
    )
    .subscribe();

  return () => {
    void sb.removeChannel(channel);
  };
}
