import { APPLICANT_APPLICATIONS_KEY } from '@/lib/applicant-applications';
import { APPLICANT_HOME_SCENARIO_KEY } from '@/lib/applicant-home-scenario';
import { APPLICANT_INTERNSHIP_KEY } from '@/lib/applicant-internship';
import { APPLY_DRAFT_KEY, CHAPTER_INTRO_KEY } from '@/lib/apply-application';
import { MYINFO_PENDING_KEY } from '@/lib/myinfo';
import { UT_APPLICANT_TASK_KEY } from '@/lib/ut-track';
import { clearApplicantNotifications } from '@/lib/notifications';
import {
  APPLICANT_MOCK_GMAIL_KEY,
  APPLICANT_INTERVIEW_CONFIRMATION_GMAIL_KEY,
  APPLICANT_REVIEW_STARTED_AT_KEY,
} from '@/lib/applicant-mentor-interview';
import {
  APPLICANT_OFFER_GMAIL_KEY,
  APPLICANT_OFFER_STARTED_AT_KEY,
} from '@/lib/applicant-offer';
import { APPLICANT_OFFER_PERIOD_KEY } from '@/lib/applicant-offer-period';
import { APPLICANT_OFFER_RESPONSE_KEY } from '@/lib/applicant-offer-response';

const APPLICANT_LOCAL_KEYS = [
  APPLICANT_APPLICATIONS_KEY,
  APPLICANT_HOME_SCENARIO_KEY,
  APPLICANT_INTERNSHIP_KEY,
  APPLY_DRAFT_KEY,
  UT_APPLICANT_TASK_KEY,
  'dsta_my_applications',
  'dsta_interview_availability_request',
  'dsta_interview_selected_slot',
  'dsta_interview_proposed_from',
  APPLICANT_MOCK_GMAIL_KEY,
  APPLICANT_INTERVIEW_CONFIRMATION_GMAIL_KEY,
  APPLICANT_OFFER_GMAIL_KEY,
  APPLICANT_OFFER_STARTED_AT_KEY,
  APPLICANT_OFFER_PERIOD_KEY,
  APPLICANT_OFFER_RESPONSE_KEY,
  APPLICANT_REVIEW_STARTED_AT_KEY,
] as const;

const APPLICANT_LOCAL_PREFIXES = ['dsta_apply_draft_'] as const;

/** Clear applicant journey progress while preserving the signed-in demo identity. */
export function resetApplicantData() {
  try {
    for (const key of APPLICANT_LOCAL_KEYS) localStorage.removeItem(key);
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key && APPLICANT_LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix))) {
        localStorage.removeItem(key);
      }
    }
  } catch {
    /* Prototype storage may be unavailable in restricted browser modes. */
  }

  clearApplicantNotifications();

  try {
    sessionStorage.removeItem(CHAPTER_INTRO_KEY);
    sessionStorage.removeItem(MYINFO_PENDING_KEY);
  } catch {
    /* Prototype storage may be unavailable in restricted browser modes. */
  }
}
