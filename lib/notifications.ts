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
  tier:         NotifTier;
  createdAt:    string;
  read:         boolean;
}

const KEY = 'dsta_notifications';
export const NOTIF_CHANGED_EVENT = 'dsta:notifications-changed';

export function loadNotifications(): AppNotification[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
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
