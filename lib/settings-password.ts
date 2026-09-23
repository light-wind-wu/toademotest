import { z } from 'zod';

export const settingsPasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password.'),
  newPassword: z.string().min(1, 'Enter a new password.'),
  confirmPassword: z.string().min(1, 'Confirm your new password.'),
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ['confirmPassword'], message: 'Passwords do not match.',
}).refine((value) => !value.newPassword || value.newPassword !== value.currentPassword, {
  path: ['newPassword'], message: 'Choose a different password from your current password.',
});
