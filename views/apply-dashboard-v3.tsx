'use client';

import ApplyDashboardV1 from '@/views/apply-dashboard-v1';

/** V3 is the V1 follow-up state: only predefined interview slots are available. */
export default function ApplyDashboardV3() {
  return <ApplyDashboardV1 visualVariant="v1" allowCustomRequest={false} />;
}
