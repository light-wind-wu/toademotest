import type { UserRole } from './types';

export type NotifTier = 'action' | 'info';
export type NotifForRole = 'io' | 'mentor' | 'ad-pnc' | 'director' | 'dce' | 'applicant';

export interface AppNotification {
  id:           string;
  forRole:      NotifForRole;
  forEmail?:    string; // applicant-specific
  forMentorId?: string; // mentor-specific (mentorUserId)
  title:        string;
  body:         string;
  href:         string;
  ctaLabel?:    string;
  tier:         NotifTier;
  createdAt:    string;
  read:         boolean;
}

const KEY = 'dsta_notifications';
export const NOTIF_CHANGED_EVENT = 'dsta:notifications-changed';
export const APPLICANT_UNDER_REVIEW_NOTIFICATION_ID = 'notif-app-ui-2027-under-review';
export const APPLICANT_MENTOR_INTERVIEW_NOTIFICATION_ID = 'notif-app-ui-2027-mentor-interview';
export const APPLICANT_INTERVIEW_CONFIRMED_NOTIFICATION_ID = 'notif-app-ui-2027-interview-confirmed';
export const APPLICANT_OFFER_RECEIVED_NOTIFICATION_ID = 'notif-app-ui-2027-offer-received';

export function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]).map((notification) => ({
      ...notification,
      body: notification.body
        .replace('2:30 PM - 3:15 PM', '2:30 PM - 3:30 PM')
        .replace('10:00 AM - 10:45 AM', '10:00 AM - 11:00 AM')
        .replace('4:00 PM - 4:45 PM', '4:00 PM - 5:00 PM'),
    })) : [];
  } catch { return []; }
}

export function addNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>): void {
  try {
    const existing = loadNotifications();
    const n: AppNotification = {
      ...notif,
      id:        `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      read:      false,
    };
    localStorage.setItem(KEY, JSON.stringify([n, ...existing]));
    window.dispatchEvent(new Event(NOTIF_CHANGED_EVENT));
  } catch {}
}

/** Seed the deterministic Applicant UT notification without duplicating it on reload. */
export function ensureApplicantUnderReviewNotification(email: string): void {
  try {
    const existing = loadNotifications();
    if (existing.some((notification) => notification.id === APPLICANT_UNDER_REVIEW_NOTIFICATION_ID)) return;

    const notification: AppNotification = {
      id: APPLICANT_UNDER_REVIEW_NOTIFICATION_ID,
      forRole: 'applicant',
      forEmail: email,
      title: 'Application under review',
      body: 'Your application has moved to the review stage. No action is required.',
      href: '/apply/applications/app-ui-2027',
      ctaLabel: 'View application',
      tier: 'info',
      createdAt: new Date().toISOString(),
      read: false,
    };
    localStorage.setItem(KEY, JSON.stringify([notification, ...existing]));
    window.dispatchEvent(new Event(NOTIF_CHANGED_EVENT));
  } catch {}
}

export function ensureApplicantMentorInterviewNotification(email: string): void {
  try {
    const existing = loadNotifications();
    if (existing.some((notification) => notification.id === APPLICANT_MENTOR_INTERVIEW_NOTIFICATION_ID)) return;

    const notification: AppNotification = {
      id: APPLICANT_MENTOR_INTERVIEW_NOTIFICATION_ID,
      forRole: 'applicant',
      forEmail: email,
      title: 'Interview invitation received',
      body: 'Choose a timeslot for your Designing Mission-Critical Digital Services interview with Marcus Tan by 28 Aug 2026.',
      href: '/apply/applicant-interview-review?applicationId=app-ui-2027',
      ctaLabel: 'Choose a timeslot',
      tier: 'action',
      createdAt: new Date().toISOString(),
      read: false,
    };
    localStorage.setItem(KEY, JSON.stringify([notification, ...existing]));
    window.dispatchEvent(new Event(NOTIF_CHANGED_EVENT));
  } catch {}
}

export function ensureApplicantInterviewConfirmedNotification(
  email: string,
  interviewDateTime: string,
): void {
  try {
    const existing = loadNotifications().filter(
      (notification) => notification.id !== APPLICANT_INTERVIEW_CONFIRMED_NOTIFICATION_ID,
    );
    const notification: AppNotification = {
      id: APPLICANT_INTERVIEW_CONFIRMED_NOTIFICATION_ID,
      forRole: 'applicant',
      forEmail: email,
      title: 'Interview confirmed',
      body: `Your interview is scheduled for ${interviewDateTime}.`,
      href: '/apply/interviews',
      ctaLabel: 'View interview',
      tier: 'info',
      createdAt: new Date().toISOString(),
      read: false,
    };
    localStorage.setItem(KEY, JSON.stringify([notification, ...existing]));
    window.dispatchEvent(new Event(NOTIF_CHANGED_EVENT));
  } catch {}
}

export function ensureApplicantOfferReceivedNotification(
  email: string,
  responseDeadline: string,
): void {
  try {
    const existing = loadNotifications().filter(
      (notification) => notification.id !== APPLICANT_OFFER_RECEIVED_NOTIFICATION_ID,
    );
    const notification: AppNotification = {
      id: APPLICANT_OFFER_RECEIVED_NOTIFICATION_ID,
      forRole: 'applicant',
      forEmail: email,
      title: 'Offer received',
      body: `Review and respond to your internship offer by ${responseDeadline}.`,
      href: '/apply/applicant-offer-detail?applicationId=app-ui-2027',
      ctaLabel: 'Review offer',
      tier: 'action',
      createdAt: new Date().toISOString(),
      read: false,
    };
    localStorage.setItem(KEY, JSON.stringify([notification, ...existing]));
    window.dispatchEvent(new Event(NOTIF_CHANGED_EVENT));
  } catch {}
}

export function markRead(id: string): void {
  try {
    const next = loadNotifications().map(n => n.id === id ? { ...n, read: true } : n);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(NOTIF_CHANGED_EVENT));
  } catch {}
}

export function markAllRead(role: UserRole): void {
  try {
    const forRole = roleToNotifRole(role);
    const next = loadNotifications().map(n =>
      n.forRole === forRole ? { ...n, read: true } : n
    );
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(NOTIF_CHANGED_EVENT));
  } catch {}
}

export function clearAllNotifications(): void {
  try {
    localStorage.setItem(KEY, '[]');
    window.dispatchEvent(new Event(NOTIF_CHANGED_EVENT));
  } catch {}
}

export function clearApplicantNotifications(): void {
  try {
    const next = loadNotifications().filter((notification) => notification.forRole !== 'applicant');
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(NOTIF_CHANGED_EVENT));
  } catch {}
}

function roleToNotifRole(role: UserRole): NotifForRole {
  if (role === 'io-admin' || role === 'io') return 'io';
  if (role === 'mentor')                    return 'mentor';
  if (role === 'ad-pnc')                    return 'ad-pnc';
  if (role === 'director')                  return 'director';
  return 'applicant';
}

export function getNotificationsForRole(
  role: UserRole,
  email: string,
  mentorId: string,
): AppNotification[] {
  const all = loadNotifications();
  return all.filter(n => {
    if (n.forRole === 'io')    return role === 'io' || role === 'io-admin';
    if (n.forRole === 'mentor') {
      if (role !== 'mentor') return false;
      // mentorId is the mentor's email; accept a match on the full email or its prefix
      if (n.forMentorId && n.forMentorId !== mentorId && n.forMentorId !== mentorId.split('@')[0]) return false;
      return true;
    }
    if (n.forRole === 'applicant') {
      if (role !== 'new-applicant' && role !== 'existing-scholar-applicant') return false;
      if (n.forEmail && n.forEmail !== email) return false;
      return true;
    }
    if (n.forRole === 'ad-pnc')   return role === 'ad-pnc';
    if (n.forRole === 'director')  return role === 'director';
    // 'dce' notifications are dormant — no role can read them (DCE role removed).
    return false;
  });
}

export function getUnreadCount(role: UserRole, email: string, mentorId: string): number {
  return getNotificationsForRole(role, email, mentorId).filter(n => !n.read).length;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1)  return 'Just now';
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  if (days  ===1)  return 'Yesterday';
  return `${days}d ago`;
}
