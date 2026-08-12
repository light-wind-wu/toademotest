/* Apply dashboard version preference (V1–V4 comps). Default V1.
   V3 / V4 are follow-up interview tasks cloned from V1 / V2. */

export type ApplyDashboardBase = 'v1' | 'v2';
export type ApplyDashboardVersion = ApplyDashboardBase | 'v3' | 'v4';

export const APPLY_DASHBOARD_VERSION_KEY = 'dsta_apply_dashboard_version';

export function loadApplyDashboardVersion(): ApplyDashboardVersion {
  if (typeof window === 'undefined') return 'v1';
  try {
    const raw = localStorage.getItem(APPLY_DASHBOARD_VERSION_KEY);
    if (raw === 'v1' || raw === 'v2' || raw === 'v3' || raw === 'v4') return raw;
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

/** V1 → V3, V2 → V4 for the custom-timeslot follow-up task. */
export function followUpDashboardVersion(
  base: ApplyDashboardBase,
): 'v3' | 'v4' {
  return base === 'v1' ? 'v3' : 'v4';
}

/** Map V3/V4 follow-up back to the base layout that still has the 4th timeslot option. */
export function baseDashboardVersion(
  version: ApplyDashboardVersion,
): ApplyDashboardBase {
  if (version === 'v2' || version === 'v4') return 'v2';
  return 'v1';
}

/** After the follow-up task ends, restore V1/V2 so the 4th radio option is available again. */
export function restoreBaseApplyDashboardVersion() {
  const current = loadApplyDashboardVersion();
  const base = baseDashboardVersion(current);
  if (current !== base) saveApplyDashboardVersion(base);
}
