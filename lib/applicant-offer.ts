import { transitionApplicantApplicationToOfferReceived } from '@/lib/applicant-applications';
import { saveApplicantHomeScenario } from '@/lib/applicant-home-scenario';
import { APPLICANT_MOCK_GMAIL_CHANGED } from '@/lib/applicant-mentor-interview';
import { ensureApplicantOfferReceivedNotification } from '@/lib/notifications';
import type { ApplicantOfferEmail } from '@/lib/types';

export const APPLICANT_OFFER_GMAIL_KEY = 'dsta_applicant_offer_gmail';
export const APPLICANT_OFFER_STARTED_AT_KEY = 'dsta_applicant_offer_started_at';
export const APPLICANT_OFFER_CHANGED = 'dsta:applicant-offer-changed';
export const APPLICANT_OFFER_DELAY_MS = 10_000;

export function getOrStartApplicantOfferTimer(): number {
  try {
    const stored = Number(localStorage.getItem(APPLICANT_OFFER_STARTED_AT_KEY));
    if (Number.isFinite(stored) && stored > 0) return stored;
    const startedAt = Date.now();
    localStorage.setItem(APPLICANT_OFFER_STARTED_AT_KEY, String(startedAt));
    return startedAt;
  } catch {
    return Date.now();
  }
}

export function restartApplicantOfferTimer(): number {
  const startedAt = Date.now();
  try {
    localStorage.setItem(APPLICANT_OFFER_STARTED_AT_KEY, String(startedAt));
  } catch {}
  return startedAt;
}

export function loadApplicantOfferEmail(): ApplicantOfferEmail | null {
  try {
    const raw = localStorage.getItem(APPLICANT_OFFER_GMAIL_KEY);
    return raw ? JSON.parse(raw) as ApplicantOfferEmail : null;
  } catch {
    return null;
  }
}

export function deliverApplicantOffer(recipientEmail: string): ApplicantOfferEmail {
  const message: ApplicantOfferEmail = {
    id: 'gmail-off-01-app-ui-2027',
    subject: 'Internship offer — University Internship 2027',
    senderName: 'Davina Tan (DSTA)',
    senderEmail: 'Davina.Tan@dsta.gov.sg',
    recipientName: 'Jenny Aw',
    recipientEmail,
    programmeName: 'University Internship 2027',
    projectName: 'Designing Mission-Critical Digital Services',
    internshipPeriod: '14 Sep - 11 Dec 2026',
    reportingLocation: 'DSTA Digital Hub',
    workArrangement: 'Hybrid',
    allowance: 'S$1,500 per month',
    responseDeadline: '5 Sep 2026',
    offerId: 'OFFER-UI27-0008',
    receivedAt: new Date().toISOString(),
    read: false,
  };

  try {
    localStorage.setItem(APPLICANT_OFFER_GMAIL_KEY, JSON.stringify(message));
  } catch {}
  transitionApplicantApplicationToOfferReceived('app-ui-2027');
  saveApplicantHomeScenario('offer-action');
  ensureApplicantOfferReceivedNotification(recipientEmail, message.responseDeadline);
  window.dispatchEvent(new Event(APPLICANT_MOCK_GMAIL_CHANGED));
  window.dispatchEvent(new Event(APPLICANT_OFFER_CHANGED));
  return message;
}

export function markApplicantOfferEmailRead() {
  const email = loadApplicantOfferEmail();
  if (!email || email.read) return;
  try {
    localStorage.setItem(APPLICANT_OFFER_GMAIL_KEY, JSON.stringify({ ...email, read: true }));
  } catch {}
  window.dispatchEvent(new Event(APPLICANT_MOCK_GMAIL_CHANGED));
}
