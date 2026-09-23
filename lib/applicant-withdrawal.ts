import { z } from 'zod';

export const APPLICANT_WITHDRAWAL_REASONS = [
  'Not aligned with career goals',
  'Personal reasons',
  'Company benefits unsatisfactory',
  'Remuneration unsatisfactory',
  'Roster unsatisfactory',
  'Travel requirements unsatisfactory',
  'Unable to relocate',
  'Staying with current employer',
  'Continuing study',
  'Other',
] as const;

export const applicantWithdrawalSchema = z.object({
  reason: z.enum(APPLICANT_WITHDRAWAL_REASONS, { error: 'Please select a reason for your withdrawal.' }),
  details: z.string().trim().min(1, 'Please provide details of your withdrawal.'),
});
