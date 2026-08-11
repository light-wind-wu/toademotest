/**
 * Shared utilities for UT scenario reset handlers.
 */

import {
  loadProgrammes,
  loadProjects,
  loadProjectDrafts,
  loadProjectResponseDrafts,
  loadRequests,
  loadSubmissions,
  saveProgrammes,
  saveProjects,
  saveProjectDrafts,
  saveProjectResponseDrafts,
  saveRequests,
  saveSubmissions,
} from '@/lib/storage';
import type { Application, Programme, ProjectEntry } from '@/lib/types';

const APPLICATIONS_KEY = 'dsta_applications';
const APPLICATIONS_VERSION_KEY = 'dsta_applications_seed_v';
const APPLICATIONS_SEED_VERSION = '31';

export function upsertById<T extends { id?: string }>(records: T[], updates: T[]): T[] {
  const updateIds = new Set(updates.map(r => r.id).filter(Boolean));
  const kept = records.filter(r => !updateIds.has(r.id));
  return [...kept, ...updates];
}

export function removeSubmissionsByTokens(tokens: string[]): void {
  const tokenSet = new Set(tokens);
  saveSubmissions(loadSubmissions().filter(b => !tokenSet.has(b.uploadToken)));
}

export function removeProjectDraftsByTokens(tokens: string[]): void {
  const tokenSet = new Set(tokens);
  saveProjectDrafts(
    loadProjectDrafts().filter(
      d => !d.requestToken || !tokenSet.has(d.requestToken),
    ),
  );
}

export function removeProjectResponseDraftsByTokens(tokens: string[]): void {
  const tokenSet = new Set(tokens);
  saveProjectResponseDrafts(
    loadProjectResponseDrafts().filter(
      d => !tokenSet.has(d.requestToken),
    ),
  );
}

export function upsertRequests(requests: import('@/lib/types').ProjectRequest[]): void {
  saveRequests(upsertById(loadRequests(), requests));
}

export function upsertSubmissions(batches: import('@/lib/types').ProjectSubmissionBatch[]): void {
  saveSubmissions(upsertById(loadSubmissions(), batches));
}

export function upsertProgrammes(programmes: Programme[]): void {
  saveProgrammes(upsertById(loadProgrammes(), programmes));
}

export function upsertProjects(projects: ProjectEntry[]): void {
  saveProjects(upsertById(loadProjects(), projects));
}

export function loadApplications(): Application[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    return raw ? (JSON.parse(raw) as Application[]) : [];
  } catch {
    return [];
  }
}

export function saveApplications(applications: Application[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(applications));
  localStorage.setItem(APPLICATIONS_VERSION_KEY, APPLICATIONS_SEED_VERSION);
}

export function upsertApplications(applications: Application[]): void {
  saveApplications(upsertById(loadApplications(), applications));
}

export function clearSessionState(keys: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    for (const key of keys) {
      sessionStorage.removeItem(key);
    }
  } catch {
    /* noop */
  }
}

export function setSessionJSON<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* noop */
  }
}

export function loadSessionJSON<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Common session keys that transient UI state may use across scenarios. */
export const COMMON_TRANSIENT_KEYS = [
  'dsta_flash',
  'dsta_submissions_success_dialog',
  'dsta_sub_review_view',
  'dsta_pending_toast',
  'dsta_request_target_tab',
];
