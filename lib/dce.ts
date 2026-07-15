'use client';

/* DCE batch-approval substrate (TOA / SCI flow).
   The DCE (Deputy Chief Executive) is an optional approval stage AFTER the IO has
   reviewed submitted projects: the IO routes batches to the DCE, who approves or
   rejects them, gating the final Approved List. The stage is OFF by default — it is
   only inserted into the flow when the admin enables it (the SCI "ON/OFF" block).
   This module holds the config flag + the batch state transitions; screens wire the
   UI, notifications and audit on top. */

import type { ProjectSubmissionBatch } from './types';
import { loadSystemConfig, saveSystemConfig } from './portal-config';

const SUBMISSIONS_KEY  = 'dsta_project_submissions';

/* ── ON/OFF config (the SCI "DCE approval" feature switch) ──────────────── */
export function loadDceApprovalEnabled(): boolean {
  return loadSystemConfig().dceApproval === true;
}
export function setDceApprovalEnabled(on: boolean): void {
  saveSystemConfig({ ...loadSystemConfig(), dceApproval: on });
}

/* ── Batch store accessors ─────────────────────────────────────────────── */
export function loadSubmissionBatches(): ProjectSubmissionBatch[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(SUBMISSIONS_KEY) || '[]'); } catch { return []; }
}
export function saveSubmissionBatches(batches: ProjectSubmissionBatch[]): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(SUBMISSIONS_KEY, JSON.stringify(batches)); } catch {}
}

/* ── Transitions ───────────────────────────────────────────────────────── */
/** IO routes a reviewed batch to the DCE for approval. */
export function routeBatchToDce(batchId: string): ProjectSubmissionBatch | null {
  let routed: ProjectSubmissionBatch | null = null;
  const next = loadSubmissionBatches().map(b => {
    if (b.id !== batchId) return b;
    routed = { ...b, dceStatus: 'pending', dceReason: undefined, dceBy: undefined, dceDate: undefined };
    return routed;
  });
  if (routed) saveSubmissionBatches(next);
  return routed;
}

/** DCE approves or rejects a routed batch. Reject requires a reason. */
export function dceDecideBatch(
  batchId: string,
  decision: 'approved' | 'rejected',
  by: string,
  reason?: string,
  todayIso?: string,
): ProjectSubmissionBatch | null {
  const today = todayIso ?? new Date().toISOString().split('T')[0];
  let decided: ProjectSubmissionBatch | null = null;
  const next = loadSubmissionBatches().map(b => {
    if (b.id !== batchId) return b;
    decided = { ...b, dceStatus: decision, dceBy: by, dceDate: today, dceReason: decision === 'rejected' ? (reason || '') : undefined };
    return decided;
  });
  if (decided) saveSubmissionBatches(next);
  return decided;
}

/** Batches currently awaiting a DCE decision. */
export function dcePendingBatches(): ProjectSubmissionBatch[] {
  return loadSubmissionBatches().filter(b => b.dceStatus === 'pending');
}

/** A batch has cleared the DCE gate when DCE approval is OFF, or it was approved. */
export function batchClearedDce(b: ProjectSubmissionBatch): boolean {
  return !loadDceApprovalEnabled() || b.dceStatus === 'approved';
}
