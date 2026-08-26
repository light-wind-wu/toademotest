'use client';

/* Apply dashboard entry — V1–V4 comps layouts.
   V1/V2 from catalog A·B; V3/V4 from custom timeslot follow-up task. */
import { useEffect, useState } from 'react';
import ApplyDashboardV1 from '@/views/apply-dashboard-v1';
import ApplyDashboardV2 from '@/views/apply-dashboard-v2';
import ApplyDashboardV3 from '@/views/apply-dashboard-v3';
import ApplyDashboardV4 from '@/views/apply-dashboard-v4';
import ApplyDashboardV5 from '@/views/apply-dashboard-v5';
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
      if (detail === 'v1' || detail === 'v2' || detail === 'v3' || detail === 'v4' || detail === 'v5') {
        setVersion(detail);
      }
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

  if (version === 'v5') return <ApplyDashboardV5 />;
  if (version === 'v4') return <ApplyDashboardV4 />;
  if (version === 'v3') return <ApplyDashboardV3 />;
  if (version === 'v2') return <ApplyDashboardV2 />;
  return <ApplyDashboardV1 />;
}
