import { z } from 'zod';
import defaults from '@/data/applicant-settings.json';
import type { ApplicantNotificationSettings } from '@/lib/types';

const schema = z.object({ eventsAndOpportunities: z.boolean() });
const key = (email: string) => `dsta_applicant_notification_settings:${email.trim().toLowerCase()}`;

export function loadApplicantNotificationSettings(email: string): ApplicantNotificationSettings {
  const raw = localStorage.getItem(key(email));
  return schema.parse(raw ? JSON.parse(raw) : defaults);
}

export function saveApplicantNotificationSettings(email: string, value: ApplicantNotificationSettings) {
  const next = schema.parse(value);
  localStorage.setItem(key(email), JSON.stringify(next));
  return next;
}
