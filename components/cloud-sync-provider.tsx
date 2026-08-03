'use client';

/* Boots Supabase KV sync when Supabase env is available (build-time or /api/cloud-config).
   Without credentials this is a no-op and the app stays localStorage-only. */
import { useEffect, useState, type ReactNode } from 'react';
import {
  hydrateFromCloud,
  installLocalStorageBridge,
  subscribeCloudRealtime,
} from '@/lib/cloud-store';
import { ensureCloudConfig } from '@/lib/supabase/client';

export default function CloudSyncProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};
    let cancelled = false;

    (async () => {
      const enabled = await ensureCloudConfig();
      if (cancelled) return;

      if (!enabled) {
        console.info(
          '[cloud-sync] OFF — set NEXT_PUBLIC_SUPABASE_URL + PUBLISHABLE/ANON key on Vercel (Production), then Redeploy.',
        );
        setReady(true);
        return;
      }

      console.info('[cloud-sync] ON — hydrating from Supabase…');
      installLocalStorageBridge();
      await hydrateFromCloud();
      if (cancelled) return;
      unsubscribe = subscribeCloudRealtime();
      console.info('[cloud-sync] ready');
      setReady(true);
    })().catch((err) => {
      console.warn('[CloudSyncProvider]', err);
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-body-sm text-fg-muted">
        Syncing shared data…
      </div>
    );
  }

  return <>{children}</>;
}
