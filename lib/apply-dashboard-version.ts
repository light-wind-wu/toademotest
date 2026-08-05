/* Apply dashboard version preference (V1 comps / V2 legacy). Default V1. */

export type ApplyDashboardVersion = 'v1' | 'v2';

export const APPLY_DASHBOARD_VERSION_KEY = 'dsta_apply_dashboard_version';

export function loadApplyDashboardVersion(): ApplyDashboardVersion {
  if (typeof window === 'undefined') return 'v1';
  try {
    const raw = localStorage.getItem(APPLY_DASHBOARD_VERSION_KEY);
    if (raw === 'v1' || raw === 'v2') return raw;
  } catch {
    /* ignore */
  }
  return 'v1';
}

export function saveApplyDashboardVersion(version: ApplyDashboardVersion) {
  try {
    localStorage.setItem(APPLY_DASHBOARD_VERSION_KEY, version);
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('dsta-apply-dashboard-version', { detail: version }));
  }
}
