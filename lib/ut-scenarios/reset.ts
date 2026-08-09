/**
 * Unified UT scenario reset dispatcher.
 *
 * Each catalog path + task id owns only the records and transient state it
 * needs. Normal business data created by the participant or other scenarios
 * is left untouched.
 */

import type { UtResetHandler, UtScenarioContext } from './types';
import {
  clearSessionState,
  COMMON_TRANSIENT_KEYS,
  loadSessionJSON,
  removeProjectDraftsByTokens,
  removeProjectResponseDraftsByTokens,
  removeSubmissionsByTokens,
  setSessionJSON,
  upsertRequests,
  upsertSubmissions,
} from './utils';
import {
  AD_PNC_ALL_TOKENS,
  task1ClosedRequests,
  task1OpenRequest,
  task2Batch,
  task2ClosedRequests,
  task2OpenRequest,
  TASK_1_TOKENS,
  TASK_2_OPEN_TOKEN,
  TASK_2_TOKENS,
} from './fixtures/adpnc';

const AD_PNC_TASK_1_ALLOWLIST_KEY = 'dsta_ut_adpnc_allowlist';
const AD_PNC_TASK_2_CLOSED_REQUESTS_KEY = 'dsta_ut_adpnc_task2_closed_requests';

export function getAdPncTask1Allowlist(): string[] {
  return loadSessionJSON(AD_PNC_TASK_1_ALLOWLIST_KEY, []);
}

export function getAdPncTask2ClosedRequests(): import('@/lib/types').ProjectRequest[] {
  return loadSessionJSON(AD_PNC_TASK_2_CLOSED_REQUESTS_KEY, []);
}

export function getAdPncTask2RespondHref(): string {
  const token = TASK_2_OPEN_TOKEN;
  return `/submissions?token=${encodeURIComponent(token)}&mode=upload`;
}

const resetAdPncTask1: UtResetHandler = () => {
  // Remove every AD (P&C) fixture batch first so a previous Task 2 run does not leak into Task 1.
  removeSubmissionsByTokens(AD_PNC_ALL_TOKENS);
  removeProjectDraftsByTokens(AD_PNC_ALL_TOKENS);
  removeProjectResponseDraftsByTokens(AD_PNC_ALL_TOKENS);
  upsertRequests([task1OpenRequest(), ...task1ClosedRequests()]);
  setSessionJSON(AD_PNC_TASK_1_ALLOWLIST_KEY, TASK_1_TOKENS);
  // Remove Task 2 session-only fixtures so they do not leak into Task 1.
  sessionStorage.removeItem(AD_PNC_TASK_2_CLOSED_REQUESTS_KEY);
  clearSessionState(COMMON_TRANSIENT_KEYS);
};

const resetAdPncTask2: UtResetHandler = () => {
  // Remove every AD (P&C) fixture batch first so a previous Task 1 run does not leak into Task 2.
  removeSubmissionsByTokens(AD_PNC_ALL_TOKENS);
  removeProjectDraftsByTokens(AD_PNC_ALL_TOKENS);
  removeProjectResponseDraftsByTokens(AD_PNC_ALL_TOKENS);
  upsertRequests([task2OpenRequest()]);
  upsertSubmissions([task2Batch()]);
  // Closed requests are session-only so they do not appear in other modules or cloud sync.
  setSessionJSON(AD_PNC_TASK_2_CLOSED_REQUESTS_KEY, task2ClosedRequests());
  setSessionJSON(AD_PNC_TASK_1_ALLOWLIST_KEY, TASK_2_TOKENS);
  clearSessionState(COMMON_TRANSIENT_KEYS);
};

const HANDLERS: Record<import('./types').UtCatalogPath, Partial<Record<number, UtResetHandler>>> = {
  'io-admin': {
    // TODO: IO Admin Task 1/2 fixtures (placeholder: no destructive reset yet).
  },
  'io-programme': {
    // TODO: Create Programme fixtures.
  },
  'io-shortlist': {
    // TODO: Shortlist Applicants fixtures.
  },
  'ad-pnc': {
    1: resetAdPncTask1,
    2: resetAdPncTask2,
  },
  applicant: {
    // TODO: Applicant Task 1/2 fixtures.
  },
  probing: {
    // Not in the formal UT schedule; no reset required.
  },
};

export function resetUtScenario(context: UtScenarioContext): void {
  if (typeof window === 'undefined') return;

  const handler = HANDLERS[context.path]?.[context.taskId];
  if (handler) {
    try {
      handler(context);
    } catch (err) {
      // Best-effort reset for a mockup; failures should not block navigation.
      console.warn('[ut-scenarios] reset failed', context, err);
    }
  }
}
