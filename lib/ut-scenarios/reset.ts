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
  loadApplications,
  loadSessionJSON,
  removeProjectDraftsByTokens,
  removeProjectResponseDraftsByTokens,
  removeSubmissionsByTokens,
  saveApplications,
  setSessionJSON,
  upsertApplications,
  upsertProgrammes,
  upsertProjects,
  upsertRequests,
  upsertSubmissions,
} from './utils';
import {
  loadProjects,
  saveProjects,
  loadSharedInterviewSessions,
  saveSharedInterviewSessions,
} from '@/lib/storage';
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
import {
  IO_SHORTLIST_APPLICANT_IDS,
  IO_SHORTLIST_CATEGORIES,
  IO_SHORTLIST_PROJECT_IDS,
  ioShortlistApplications,
  ioShortlistProgrammes,
  ioShortlistProjects,
  type IoShortlistCategoryFixture,
} from './fixtures/io-shortlist';
import {
  MENTOR_APPLICATION_IDS,
  MENTOR_PROJECT_IDS,
  MENTOR_SESSION_IDS,
  mentorApplications,
  mentorProgramme,
  mentorProjects,
  mentorSharedInterviewSessions,
} from './fixtures/mentor';
import { loadNotifications, NOTIF_CHANGED_EVENT } from '@/lib/notifications';

const AD_PNC_TASK_1_ALLOWLIST_KEY = 'dsta_ut_adpnc_allowlist';
const AD_PNC_TASK_2_CLOSED_REQUESTS_KEY = 'dsta_ut_adpnc_task2_closed_requests';
const IO_SHORTLIST_TASK_1_SESSION_KEY = 'dsta_ut_io_shortlist_task1';

export type IoShortlistTask1Session = {
  active: true;
  projectIds: string[];
  applicantIds: string[];
  year: string;
  category: string;
  windowValue: string;
  categories: IoShortlistCategoryFixture[];
};

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

export function getIoShortlistTask1Session(): IoShortlistTask1Session | null {
  return loadSessionJSON<IoShortlistTask1Session | null>(IO_SHORTLIST_TASK_1_SESSION_KEY, null);
}

const resetIoShortlistTask1: UtResetHandler = () => {
  const projects = ioShortlistProjects();
  upsertProgrammes(ioShortlistProgrammes());
  upsertProjects(projects);
  upsertApplications(ioShortlistApplications());

  // Remove only notifications produced by a previous run of this shortlist fixture.
  const ownedTitles = new Set(projects.map(project => project.title));
  const notifications = loadNotifications().filter(notification =>
    !Array.from(ownedTitles).some(title =>
      notification.title.includes(title) || notification.body.includes(title),
    ),
  );
  localStorage.setItem('dsta_notifications', JSON.stringify(notifications));
  window.dispatchEvent(new Event(NOTIF_CHANGED_EVENT));

  const defaultCategory = IO_SHORTLIST_CATEGORIES[0];
  setSessionJSON<IoShortlistTask1Session>(IO_SHORTLIST_TASK_1_SESSION_KEY, {
    active: true,
    projectIds: [...IO_SHORTLIST_PROJECT_IDS],
    applicantIds: [...IO_SHORTLIST_APPLICANT_IDS],
    year: defaultCategory.year,
    category: defaultCategory.category,
    windowValue: defaultCategory.windowValue,
    categories: IO_SHORTLIST_CATEGORIES,
  });
  clearSessionState(COMMON_TRANSIENT_KEYS);
};

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

const resetMentorTask: UtResetHandler = () => {
  upsertProgrammes([mentorProgramme()]);

  const projects = loadProjects().filter(project => !MENTOR_PROJECT_IDS.includes(project.id));
  const applications = loadApplications().filter(application =>
    !MENTOR_APPLICATION_IDS.includes(application.id),
  );
  const sessions = loadSharedInterviewSessions().filter(
    session => !MENTOR_SESSION_IDS.includes(session.id),
  );

  saveProjects([...projects, ...mentorProjects()]);
  saveApplications([...applications, ...mentorApplications()]);
  saveSharedInterviewSessions([...sessions, ...mentorSharedInterviewSessions()]);
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
    1: resetIoShortlistTask1,
  },
  'ad-pnc': {
    1: resetAdPncTask1,
    2: resetAdPncTask2,
  },
  applicant: {
    // TODO: Applicant Task 1/2 fixtures.
  },
  mentor: {
    1: resetMentorTask,
    2: resetMentorTask,
    3: resetMentorTask,
  },
  probing: {
    // Not in the formal UT schedule; no reset required.
  },
};

export function resetUtScenario(context: UtScenarioContext): void {
  if (typeof window === 'undefined') return;

  if (context.path !== 'io-shortlist') {
    sessionStorage.removeItem(IO_SHORTLIST_TASK_1_SESSION_KEY);
  }

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
