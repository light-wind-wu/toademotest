'use client';

import ApplyDashboardV1 from '@/views/apply-dashboard-v1';

/** V4 is the V2 follow-up state: only predefined interview slots are available. */
export default function ApplyDashboardV4() {
  return <ApplyDashboardV1 visualVariant="v2" allowCustomRequest={false} />;
}
