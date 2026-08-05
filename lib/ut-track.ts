/** Usability-test track chosen on /catlog — drives /start-tasks copy & gates. */
export type UtTrack = 'staff' | 'applicant';

export const UT_TRACK_KEY = 'dsta_ut_track';

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
