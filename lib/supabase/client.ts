/* Browser Supabase client — build-time NEXT_PUBLIC_* or runtime /api/cloud-config. */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { cleanEnv, readSupabaseKey, readSupabaseUrl } from '@/lib/supabase/env';

let client: SupabaseClient | null | undefined;
let runtimeUrl = '';
let runtimeKey = '';
let configPromise: Promise<boolean> | null = null;

function supabaseUrl(): string {
  return readSupabaseUrl() || runtimeUrl;
}

function supabaseKey(): string {
  return readSupabaseKey() || runtimeKey;
}

export function isCloudSyncEnabled(): boolean {
  return Boolean(supabaseUrl() && supabaseKey());
}

/**
 * Resolves credentials from the client bundle, or falls back to /api/cloud-config
 * (Vercel Runtime env) when NEXT_PUBLIC_* was not inlined at build time.
 */
export async function ensureCloudConfig(): Promise<boolean> {
  if (isCloudSyncEnabled()) return true;
  if (typeof window === 'undefined') return false;

  if (!configPromise) {
    configPromise = (async () => {
      try {
        const res = await fetch('/api/cloud-config', { cache: 'no-store' });
        if (!res.ok) return false;
        const data = (await res.json()) as { url?: string; key?: string };
        runtimeUrl = cleanEnv(data.url);
        runtimeKey = cleanEnv(data.key);
        client = undefined;
        return Boolean(runtimeUrl && runtimeKey);
      } catch {
        return false;
      }
    })();
  }

  return configPromise;
}

/** Returns null when cloud sync is not configured (local-only mode). */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = supabaseUrl();
  const key = supabaseKey();
  if (!url || !key) {
    client = null;
    return null;
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
