import { z } from 'zod';
import { differenceInCalendarMonths } from 'date-fns';
import seed from '@/data/applicant-profile.json';
import type { ProfileEmployment } from '@/lib/types';

export const EMPLOYMENT_MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function newProfileEmployment(id = crypto.randomUUID()): ProfileEmployment {
  return { ...seed.employmentDefaults, id, skills: [] };
}
const text = z.string().trim().max(200, 'Use no more than 200 characters.');
const month = z.string().refine((value) => !value || EMPLOYMENT_MONTHS.includes(value), 'Select a month.');
const year = z.string().refine((value) => !value || /^(19|20)\d{2}$/.test(value), 'Select a valid year.');
export const employmentShape = z.object({
  id: z.string().min(1), jobTitle: text, organization: text, location: text,
  locationType: text.refine((value) => !value || seed.locationTypes.includes(value), 'Select a location type.'),
  employmentType: text.refine((value) => !value || seed.employmentTypes.includes(value), 'Select an employment type.'),
  current: z.boolean(), startMonth: month, startYear: year, endMonth: month, endYear: year,
  highlights: z.string().trim().max(2000, 'Use no more than 2,000 characters.'),
  skills: z.array(z.string().trim().min(1).max(80, 'Use no more than 80 characters per skill.')).max(20, 'Add up to 20 skills.'),
});
export const profileEmploymentSchema = employmentShape.transform((value) => value.current ? { ...value, endMonth: '', endYear: '' } : value).superRefine((value, ctx) => {
  const error = (field: string, message: string) => ctx.addIssue({ code: 'custom', path: [field], message });
  if (!value.jobTitle) error('jobTitle', 'Job title is required.');
  if (!value.startYear) error('startYear', 'Start year is required.');
  if (!value.current && !value.endYear) error('endYear', 'End year is required.');
  const now = new Date();
  for (const part of ['start', 'end'] as const) {
    if (part === 'end' && value.current) continue;
    const y = value[`${part}Year`], m = value[`${part}Month`];
    if (Number(y) > now.getFullYear() || (Number(y) === now.getFullYear() && m && EMPLOYMENT_MONTHS.indexOf(m) > now.getMonth())) error(`${part}Year`, 'Date must not be in the future.');
  }
  if (!value.current && value.startYear && value.endYear && (value.endYear < value.startYear || (value.endYear === value.startYear && value.startMonth && value.endMonth && EMPLOYMENT_MONTHS.indexOf(value.endMonth) < EMPLOYMENT_MONTHS.indexOf(value.startMonth)))) error('endYear', 'End date must not be before the start date.');
  if (new Set(value.skills.map((skill) => skill.toLowerCase())).size !== value.skills.length) error('skills', 'Each skill can only be added once.');
});

export function employmentPeriod(value: ProfileEmployment, today = new Date()): string {
  const label = (month: string, year: string) => [month.slice(0, 3), year].filter(Boolean).join(' ');
  const range = `${label(value.startMonth, value.startYear)} – ${value.current ? 'Present' : label(value.endMonth, value.endYear)}`;
  if (!value.startMonth || !value.startYear || (!value.current && (!value.endMonth || !value.endYear))) return range;
  const start = new Date(Number(value.startYear), EMPLOYMENT_MONTHS.indexOf(value.startMonth), 1);
  const end = value.current ? today : new Date(Number(value.endYear), EMPLOYMENT_MONTHS.indexOf(value.endMonth), 1);
  const months = differenceInCalendarMonths(end, start) + 1;
  if (months <= 0) return range;
  const years = Math.floor(months / 12), remaining = months % 12;
  const duration = [years ? `${years} ${years === 1 ? 'yr' : 'yrs'}` : '', remaining ? `${remaining} ${remaining === 1 ? 'mo' : 'mos'}` : ''].filter(Boolean).join(' ');
  return `${range} · ${duration}`;
}
