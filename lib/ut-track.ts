/** Usability-test track / catalog path — drives /start-tasks copy & gates. */

export type UtTrack = 'staff' | 'applicant';

/** Which catalog row launched the session (role alone is not enough — two IO rows share `io`). */
export type UtCatalogPath =
  | 'io-admin'
  | 'io-programme'
  | 'io-shortlist'
  | 'ad-pnc'
  | 'applicant'
  | 'probing';

/** Applicant intern flavour under B1.1–B3.2 — used later for task variants. */
export type UtApplicantVariant = 'polytechnic' | 'tech-up' | 'undergraduate';

export const UT_TRACK_KEY = 'dsta_ut_track';
export const UT_CATALOG_PATH_KEY = 'dsta_ut_catalog_path';
export const UT_APPLICANT_VARIANT_KEY = 'dsta_ut_applicant_variant';

export function saveUtTrack(track: UtTrack) {
  try {
    localStorage.setItem(UT_TRACK_KEY, track);
  } catch {
    /* noop */
  }
}

export function loadUtTrack(): UtTrack {
  if (typeof window === 'undefined') return 'staff';
  try {
    const raw = localStorage.getItem(UT_TRACK_KEY);
    return raw === 'applicant' ? 'applicant' : 'staff';
  } catch {
    return 'staff';
  }
}

export function saveUtCatalogPath(path: UtCatalogPath) {
  try {
    localStorage.setItem(UT_CATALOG_PATH_KEY, path);
  } catch {
    /* noop */
  }
}

export function loadUtCatalogPath(): UtCatalogPath {
  if (typeof window === 'undefined') return 'io-admin';
  try {
    const raw = localStorage.getItem(UT_CATALOG_PATH_KEY);
    if (
      raw === 'io-admin' ||
      raw === 'io-programme' ||
      raw === 'io-shortlist' ||
      raw === 'ad-pnc' ||
      raw === 'applicant' ||
      raw === 'probing'
    ) {
      return raw;
    }
  } catch {
    /* noop */
  }
  return 'io-admin';
}

export function saveUtApplicantVariant(variant: UtApplicantVariant) {
  try {
    localStorage.setItem(UT_APPLICANT_VARIANT_KEY, variant);
  } catch {
    /* noop */
  }
}

export function loadUtApplicantVariant(): UtApplicantVariant | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(UT_APPLICANT_VARIANT_KEY);
    if (raw === 'polytechnic' || raw === 'tech-up' || raw === 'undergraduate') return raw;
  } catch {
    /* noop */
  }
  return null;
}
