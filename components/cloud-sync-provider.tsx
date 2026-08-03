'use client';

/* Boots Supabase KV sync when NEXT_PUBLIC_SUPABASE_* is set.
   Without env vars this is a no-op and the app stays localStorage-only. */
import { useEffect, useState, type ReactNode } from 'react';
import {
  hydrateFromCloud,
  installLocalStorageBridge,
  subscribeCloudRealtime,
} from '@/lib/cloud-store';
import { isCloudSyncEnabled } from '@/lib/supabase/client';

export default function CloudSyncProvider({ children }: { children: ReactNode }) {
  const enabled = isCloudSyncEnabled();
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;

    let unsubscribe = () => {};
    let cancelled = false;

    (async () => {
      installLocalStorageBridge();
      await hydrateFromCloud();
      if (cancelled) return;
      unsubscribe = subscribeCloudRealtime();
      setReady(true);
    })().catch((err) => {
      console.warn('[CloudSyncProvider]', err);
      if (!cancelled) setReady(true);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [enabled]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-bg text-body-sm text-fg-muted">
        Syncing shared data…
      </div>
    );
  }

  return <>{children}</>;
}
