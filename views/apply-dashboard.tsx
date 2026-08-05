'use client';

/* Apply dashboard entry — default V1; V2 is the preserved legacy layout.
   Version preference lives in localStorage and can be toggled from Topbar. */
import { useEffect, useState } from 'react';
import ApplyDashboardV1 from '@/views/apply-dashboard-v1';
import ApplyDashboardLegacy from '@/views/apply-dashboard-legacy';
import {
  loadApplyDashboardVersion,
  type ApplyDashboardVersion,
} from '@/lib/apply-dashboard-version';

export default function ApplyDashboardPage() {
  const [version, setVersion] = useState<ApplyDashboardVersion>('v1');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setVersion(loadApplyDashboardVersion());
    setReady(true);

    function onVersion(e: Event) {
      const detail = (e as CustomEvent<ApplyDashboardVersion>).detail;
      if (detail === 'v1' || detail === 'v2') setVersion(detail);
    }
    window.addEventListener('dsta-apply-dashboard-version', onVersion);
    return () => window.removeEventListener('dsta-apply-dashboard-version', onVersion);
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-body-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  return version === 'v2' ? <ApplyDashboardLegacy /> : <ApplyDashboardV1 />;
}
