'use client';

import ApplyDashboardV1 from '@/views/apply-dashboard-v1';

/** V2 keeps the alternate hero treatment while sharing the canonical scenario data. */
export default function ApplyDashboardV2() {
  return <ApplyDashboardV1 visualVariant="v2" allowCustomRequest />;
}
