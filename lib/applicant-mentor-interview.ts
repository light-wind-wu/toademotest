import {
  transitionApplicantApplicationToInterview,
  transitionApplicantApplicationToInterviewConfirmed,
} from '@/lib/applicant-applications';
import { saveApplicantHomeScenario } from '@/lib/applicant-home-scenario';
import {
  ensureApplicantInterviewConfirmedNotification,
  ensureApplicantMentorInterviewNotification,
} from '@/lib/notifications';
import type {
  ApplicantInterviewConfirmationEmail,
  ApplicantInterviewSlotSelection,
  ApplicantMockEmail,
} from '@/lib/types';

export const APPLICANT_REVIEW_STARTED_AT_KEY = 'dsta_applicant_review_started_at';
export const APPLICANT_MOCK_GMAIL_KEY = 'dsta_applicant_mock_gmail';
export const APPLICANT_MOCK_GMAIL_CHANGED = 'dsta:applicant-mock-gmail-changed';
export const APPLICANT_INTERVIEW_CONFIRMATION_GMAIL_KEY = 'dsta_applicant_interview_confirmation_gmail';
export const APPLICANT_INTERVIEW_SELECTED_SLOT_KEY = 'dsta_interview_selected_slot';
export const APPLICANT_INTERVIEW_CONFIRMED_EVENT = 'dsta:applicant-interview-confirmed';
export const MENTOR_INTERVIEW_DELAY_MS = 10_000;

function normalizeInterviewToOneHour(value: string): string {
  return value
    .replace('2:30 PM - 3:15 PM', '2:30 PM - 3:30 PM')
    .replace('10:00 AM - 10:45 AM', '10:00 AM - 11:00 AM')
    .replace('4:00 PM - 4:45 PM', '4:00 PM - 5:00 PM')
    .replace('2:00 PM - 2:30 PM', '2:00 PM - 3:00 PM')
    .replace('9:30 AM - 10:00 AM', '9:30 AM - 10:30 AM')
    .replace('11:00 AM - 11:30 AM', '11:00 AM - 12:00 PM');
}

export function getOrStartApplicantReviewTimer(): number {
  try {
    const stored = Number(localStorage.getItem(APPLICANT_REVIEW_STARTED_AT_KEY));
    if (Number.isFinite(stored) && stored > 0) return stored;
    const startedAt = Date.now();
    localStorage.setItem(APPLICANT_REVIEW_STARTED_AT_KEY, String(startedAt));
    return startedAt;
  } catch {
    return Date.now();
  }
}

export function restartApplicantReviewTimer(): number {
  const startedAt = Date.now();
  try {
    localStorage.setItem(APPLICANT_REVIEW_STARTED_AT_KEY, String(startedAt));
  } catch {}
  return startedAt;
}

export function loadApplicantMockEmail(): ApplicantMockEmail | null {
  try {
    const raw = localStorage.getItem(APPLICANT_MOCK_GMAIL_KEY);
    return raw ? JSON.parse(raw) as ApplicantMockEmail : null;
  } catch {
    return null;
  }
}

export function ensureApplicantMockEmailPreview(email: string): ApplicantMockEmail {
  const existing = loadApplicantMockEmail();
  if (existing) return existing;

  const message: ApplicantMockEmail = {
    id: 'gmail-int-01-app-ui-2027',
    subject: 'Interview invitation - University Internship 2027',
    senderName: 'Davina Tan (DSTA)',
    senderEmail: 'Davina.Tan@dsta.gov.sg',
    recipientName: 'Jenny Aw',
    recipientEmail: email,
    programmeName: 'University Internship 2027',
    projectName: 'Designing Mission-Critical Digital Services',
    mentorName: 'Marcus Tan',
    responseDeadline: '28 Aug 2026',
    receivedAt: new Date().toISOString(),
    read: false,
  };

  try {
    localStorage.setItem(APPLICANT_MOCK_GMAIL_KEY, JSON.stringify(message));
  } catch {}
  window.dispatchEvent(new Event(APPLICANT_MOCK_GMAIL_CHANGED));
  return message;
}

export function deliverMentorInterviewInvitation(email: string): ApplicantMockEmail {
  const message = ensureApplicantMockEmailPreview(email);
  ensureApplicantMentorInterviewNotification(email);
  transitionApplicantApplicationToInterview('app-ui-2027');
  saveApplicantHomeScenario('interview-action');
  return message;
}

export function markApplicantMockEmailRead() {
  const email = loadApplicantMockEmail();
  if (!email || email.read) return;
  try {
    localStorage.setItem(APPLICANT_MOCK_GMAIL_KEY, JSON.stringify({ ...email, read: true }));
  } catch {}
  window.dispatchEvent(new Event(APPLICANT_MOCK_GMAIL_CHANGED));
}

export function loadApplicantInterviewSelection(): ApplicantInterviewSlotSelection | null {
  try {
    const raw = localStorage.getItem(APPLICANT_INTERVIEW_SELECTED_SLOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApplicantInterviewSlotSelection;
    return parsed?.displayDateTime ? {
      ...parsed,
      timeLabel: normalizeInterviewToOneHour(parsed.timeLabel),
      displayDateTime: normalizeInterviewToOneHour(parsed.displayDateTime),
    } : null;
  } catch {
    return null;
  }
}

export function loadApplicantInterviewConfirmationEmail(): ApplicantInterviewConfirmationEmail | null {
  try {
    const raw = localStorage.getItem(APPLICANT_INTERVIEW_CONFIRMATION_GMAIL_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ApplicantInterviewConfirmationEmail;
    const interviewDateTime = normalizeInterviewToOneHour(parsed.interviewDateTime);
    return {
      ...parsed,
      subject: normalizeInterviewToOneHour(parsed.subject),
      interviewDateTime,
      duration: '1 hour',
      teamsMeetingPath: parsed.teamsMeetingPath ?? '/teams/interview/app-ui-2027',
      meetingId: parsed.meetingId ?? '482 019 773 224',
      meetingPasscode: parsed.meetingPasscode ?? 'DSTA2027',
    };
  } catch {
    return null;
  }
}

export function confirmApplicantMentorInterview(
  slot: ApplicantInterviewSlotSelection,
  recipientEmail = 'jenny.aw@u.nus.edu',
): ApplicantInterviewConfirmationEmail {
  const message: ApplicantInterviewConfirmationEmail = {
    id: 'gmail-int-02-app-ui-2027',
    subject: `Interview confirmed — ${slot.displayDateTime}`,
    senderName: 'DSTA Talent Acquisition',
    senderEmail: 'talent.acquisition@dsta.gov.sg',
    recipientName: 'Jenny Aw',
    recipientEmail,
    projectName: 'Designing Mission-Critical Digital Services',
    mentorName: 'Marcus Tan',
    interviewDateTime: slot.displayDateTime,
    format: 'Microsoft Teams',
    duration: '1 hour',
    teamsMeetingPath: '/teams/interview/app-ui-2027',
    meetingId: '482 019 773 224',
    meetingPasscode: 'DSTA2027',
    receivedAt: new Date().toISOString(),
    read: false,
  };

  try {
    localStorage.setItem(APPLICANT_INTERVIEW_SELECTED_SLOT_KEY, JSON.stringify(slot));
    localStorage.setItem(APPLICANT_INTERVIEW_CONFIRMATION_GMAIL_KEY, JSON.stringify(message));
  } catch {}
  transitionApplicantApplicationToInterviewConfirmed('app-ui-2027', slot.dateLabel, slot.timeLabel);
  saveApplicantHomeScenario('interview-scheduled');
  ensureApplicantInterviewConfirmedNotification(recipientEmail, slot.displayDateTime);
  window.dispatchEvent(new Event(APPLICANT_MOCK_GMAIL_CHANGED));
  window.dispatchEvent(new Event(APPLICANT_INTERVIEW_CONFIRMED_EVENT));
  return message;
}

export function markApplicantInterviewConfirmationEmailRead() {
  const email = loadApplicantInterviewConfirmationEmail();
  if (!email || email.read) return;
  try {
    localStorage.setItem(
      APPLICANT_INTERVIEW_CONFIRMATION_GMAIL_KEY,
      JSON.stringify({ ...email, read: true }),
    );
  } catch {}
  window.dispatchEvent(new Event(APPLICANT_MOCK_GMAIL_CHANGED));
}
