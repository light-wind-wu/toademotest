'use client';

/* Apply dashboard entry — V1 / V2 comps layouts (catalog probing A / B).
   Version preference lives in localStorage (also set from /catlog A·B). */
import { useEffect, useState } from 'react';
import ApplyDashboardV1 from '@/views/apply-dashboard-v1';
import ApplyDashboardV2 from '@/views/apply-dashboard-v2';
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

  return version === 'v2' ? <ApplyDashboardV2 /> : <ApplyDashboardV1 />;
}
