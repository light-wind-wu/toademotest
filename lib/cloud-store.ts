/* Cloud KV sync over Supabase `app_kv`.
   - Keeps existing sync localStorage API (no page rewrite)
   - Hydrate cloud → localStorage on boot
   - Dual-write on localStorage.setItem for shared keys
   - Realtime: remote change → localStorage (no reload loop)
   - localStorage.clear() must NOT wipe cloud (rehydrate; pause dual-write)
*/
import { getSupabaseBrowserClient, isCloudSyncEnabled } from '@/lib/supabase/client';
import { SEED_VERSIONS, STORAGE_KEYS } from '@/lib/storage';

const TABLE = 'app_kv';

/** Business data shared across browsers. Session / role / theme stay local. */
export const SHARED_CLOUD_KEYS = new Set<string>([
  'dsta_programmes',
  'dsta_programmes_ver',
  'dsta_projects',
  'dsta_projects_seed_v',
  'dsta_requests',
  'dsta_requests_seed_v',
  'dsta_project_submissions',
  'dsta_submissions_seed_v',
  'dsta_attachments',
  'dsta_attachments_seed_v',
  'dsta_project_drafts',
  'dsta_project_response_drafts',
  'dsta_request_audit_logs',
  'dsta_applications',
  'dsta_applications_seed_v',
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
  'dsta_app_form_templates_seed_v',
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

/**
 * After cloud restore, align local seed version stamps with the running app.
 * Otherwise loadSeeded() treats missing/stale ver as "reseed" and setItem(seed)
 * dual-writes over the real cloud payload (wiping user data).
 */
function stampLocalSeedVersions(): void {
  const stamps: [string, string][] = [
    [STORAGE_KEYS.programmes.verKey, SEED_VERSIONS.programmes],
    [STORAGE_KEYS.projects.verKey, SEED_VERSIONS.projects],
    [STORAGE_KEYS.requests.verKey, SEED_VERSIONS.requests],
    [STORAGE_KEYS.submissions.verKey, SEED_VERSIONS.submissions],
    [STORAGE_KEYS.attachments.verKey, SEED_VERSIONS.attachments],
    // Keep in sync with admin-settings / loadAppsFromStorage callers
    ['dsta_applications_seed_v', '30'],
    ['dsta_app_form_templates_seed_v', '23'],
  ];
  for (const [key, value] of stamps) {
    if (origSetItem) origSetItem.call(window.localStorage, key, value);
    else window.localStorage.setItem(key, value);
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
  if (dualWritePaused) return;
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

/**
 * Pull cloud KV into localStorage. If cloud is empty, seed it from local.
 * Call once before the rest of the app reads storage.
 */
export async function hydrateFromCloud(): Promise<'skipped' | 'hydrated' | 'seeded'> {
  if (!isCloudSyncEnabled() || typeof window === 'undefined') return 'skipped';
  const sb = getSupabaseBrowserClient();
  if (!sb) return 'skipped';

  bumpRealtimeSuppress(5000);

  const { data, error } = await sb.from(TABLE).select('key, value');
  if (error) {
    console.warn('[cloud-store] hydrate failed', error.message);
    return 'skipped';
  }

  if (!data?.length) {
    await pushAllSharedKeys();
    return 'seeded';
  }

  applyingRemote = true;
  try {
    for (const row of data) {
      if (!SHARED_CLOUD_KEYS.has(row.key)) continue;
      const raw = stableStringify(row.value);
      if (origSetItem) origSetItem.call(window.localStorage, row.key, raw);
      else window.localStorage.setItem(row.key, raw);
    }
    // Cloud is source of truth — prevent local seed OVERWRITE from clobbering it.
    stampLocalSeedVersions();
  } finally {
    applyingRemote = false;
  }

  window.dispatchEvent(new Event(CLOUD_HYDRATED_EVENT));
  return 'hydrated';
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

        const row = payload.new as { key?: string; value?: unknown } | null;
        if (!row?.key || !SHARED_CLOUD_KEYS.has(row.key)) return;
        if (samePayload(window.localStorage.getItem(row.key), row.value)) return;

        applyingRemote = true;
        try {
          const incoming = stableStringify(row.value ?? null);
          if (origSetItem) origSetItem.call(window.localStorage, row.key, incoming);
          else window.localStorage.setItem(row.key, incoming);
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
