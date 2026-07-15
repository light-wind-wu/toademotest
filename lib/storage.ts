/* ──────────────────────────────────────────────────────────────────────────
   lib/storage.ts — central localStorage seed + load/save layer.

   Single source of truth for the prototype's persisted data. Replaces the
   ~50 per-view `loadProjects()/loadApps()` reimplementations and the scattered
   `*_SEED_VER` constants (see docs/COHERENCE-AUDIT.md, P1/P3).

   Two seeding strategies, assigned per entity by intent:
   • OVERWRITE (reference data — programmes/projects/requests/submissions):
     a version bump reseeds from the JSON seed. This IS the demo-reset signal.
   • MERGE (applications): keep all existing records, add only unseen seed ids,
     so in-progress applicant/IO flows survive a seed bump. (lives in utils.ts)

   All readers are SSR-safe: on the server (no `window`) they return the seed.
─────────────────────────────────────────────────────────────────────────── */
import type {
  Programme,
  ProjectEntry,
  ProjectDraft,
  ProjectResponseDraft,
  ProjectRequest,
  ProjectRequestAuditEntry,
  ProjectSubmissionBatch,
  ProjectAttachment,
} from './types';
import {
  DEFAULT_PROGRAMMES,
  ALL_PROJECTS,
  ALL_REQUESTS,
  SUBMISSION_SEED,
} from './data';
import { SEED_VERSION } from './utils';

const isBrowser = (): boolean => typeof window !== 'undefined';

/** Current seed version per entity. Bump one to force a reseed of that store. */
export const SEED_VERSIONS = {
  programmes:  SEED_VERSION, // 'v17' (stored under the legacy `_ver` suffix)
  projects:    '24',         // bump: every seed project now carries an internship period
  requests:    '14',         // bump: sample IO requests (all statuses, PC4/6/8/10) for the demo
  submissions: '12',         // bump: linked all submissions to seeded requests + mentor emails
  attachments: '1',          // late-binding programme↔project join; seeds empty
} as const;

/** localStorage key + version-stamp key for each seeded store. */
export const STORAGE_KEYS = {
  programmes:  { key: 'dsta_programmes',          verKey: 'dsta_programmes_ver' },
  projects:    { key: 'dsta_projects',            verKey: 'dsta_projects_seed_v' },
  requests:    { key: 'dsta_requests',            verKey: 'dsta_requests_seed_v' },
  submissions: { key: 'dsta_project_submissions', verKey: 'dsta_submissions_seed_v' },
  attachments: { key: 'dsta_attachments',          verKey: 'dsta_attachments_seed_v' },
  projectDrafts: { key: 'dsta_project_drafts' },
  projectResponseDrafts: { key: 'dsta_project_response_drafts' },
  requestAuditLogs: { key: 'dsta_request_audit_logs' },
} as const;

/**
 * Load a seeded store with the OVERWRITE strategy: when the stored version
 * differs from `version`, rewrite the store from `seed` and re-stamp; otherwise
 * return persisted data (falling back to `seed` if absent or corrupt).
 */
function loadSeeded<T>(key: string, verKey: string, version: string, seed: T[]): T[] {
  if (!isBrowser()) return seed;
  try {
    if (localStorage.getItem(verKey) !== version) {
      localStorage.setItem(key, JSON.stringify(seed));
      localStorage.setItem(verKey, version);
      return seed;
    }
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : seed;
  } catch {
    return seed;
  }
}

/** Persist a value to a key. SSR-safe no-op; swallows quota/disabled errors. */
export function save<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded or storage disabled — non-fatal for a mockup */
  }
}

/** Read an arbitrary (non-seeded) JSON value — UI state, drafts, prefs. */
export function loadJSON<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/* ── Per-entity typed accessors ──────────────────────────────────────────── */

export const loadProgrammes = (): Programme[] =>
  loadSeeded(STORAGE_KEYS.programmes.key, STORAGE_KEYS.programmes.verKey, SEED_VERSIONS.programmes, DEFAULT_PROGRAMMES);
export const saveProgrammes = (v: Programme[]): void => save(STORAGE_KEYS.programmes.key, v);

export const loadProjects = (): ProjectEntry[] =>
  loadSeeded(STORAGE_KEYS.projects.key, STORAGE_KEYS.projects.verKey, SEED_VERSIONS.projects, ALL_PROJECTS);
export const saveProjects = (v: ProjectEntry[]): void => save(STORAGE_KEYS.projects.key, v);

export const loadRequests = (): ProjectRequest[] =>
  loadSeeded(STORAGE_KEYS.requests.key, STORAGE_KEYS.requests.verKey, SEED_VERSIONS.requests, ALL_REQUESTS);
export const saveRequests = (v: ProjectRequest[]): void => save(STORAGE_KEYS.requests.key, v);

export const loadSubmissions = (): ProjectSubmissionBatch[] =>
  loadSeeded(STORAGE_KEYS.submissions.key, STORAGE_KEYS.submissions.verKey, SEED_VERSIONS.submissions, SUBMISSION_SEED);
export const saveSubmissions = (v: ProjectSubmissionBatch[]): void => save(STORAGE_KEYS.submissions.key, v);

export const loadAttachments = (): ProjectAttachment[] =>
  loadSeeded(STORAGE_KEYS.attachments.key, STORAGE_KEYS.attachments.verKey, SEED_VERSIONS.attachments, []);
export const saveAttachments = (v: ProjectAttachment[]): void => save(STORAGE_KEYS.attachments.key, v);

export const loadProjectDrafts = (): ProjectDraft[] =>
  loadJSON<ProjectDraft[]>(STORAGE_KEYS.projectDrafts.key, []);
export const saveProjectDrafts = (v: ProjectDraft[]): void =>
  save(STORAGE_KEYS.projectDrafts.key, v);

export const loadProjectResponseDrafts = (): ProjectResponseDraft[] =>
  loadJSON<ProjectResponseDraft[]>(STORAGE_KEYS.projectResponseDrafts.key, []);
export const saveProjectResponseDrafts = (v: ProjectResponseDraft[]): void =>
  save(STORAGE_KEYS.projectResponseDrafts.key, v);

export const loadRequestAuditLogs = (): ProjectRequestAuditEntry[] =>
  loadJSON<ProjectRequestAuditEntry[]>(STORAGE_KEYS.requestAuditLogs.key, []);
export const saveRequestAuditLogs = (v: ProjectRequestAuditEntry[]): void =>
  save(STORAGE_KEYS.requestAuditLogs.key, v);
