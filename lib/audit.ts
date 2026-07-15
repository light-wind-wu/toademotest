/* ── IM8 access-log / audit trail ──────────────────────────────────────────
   Records who viewed a candidate record and which masked particulars were
   revealed. Persisted in localStorage; capped to keep storage bounded. */

export interface AccessLogEntry {
  ts:        number;                          // epoch ms
  actor:     string;                          // named officer who performed the action
  action:    'view' | 'reveal' | 'decision'; // record open · masked-field reveal · screening decision
  detail:    string;                          // human-readable description (incl. reason for reveals)
  subjectId: string;                          // candidate / application id the entry is about
}

const KEY = 'dsta_access_log';
const CAP = 500;

function readAll(): AccessLogEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AccessLogEntry[]) : [];
  } catch {
    return [];
  }
}

export function logAccess(entry: Omit<AccessLogEntry, 'ts'> & { ts?: number }): void {
  try {
    const all = readAll();
    all.push({ ts: entry.ts ?? Date.now(), ...entry });
    localStorage.setItem(KEY, JSON.stringify(all.slice(-CAP)));
  } catch {
    /* storage unavailable — non-fatal */
  }
}

/** Entries for one candidate, most-recent first. */
export function getAccessLog(subjectId: string): AccessLogEntry[] {
  return readAll()
    .filter(e => e.subjectId === subjectId)
    .sort((a, b) => b.ts - a.ts);
}
