/* ── Zod 4 form validation schemas ───────────────────────────────────────────
   All new form submissions are validated with Zod 4. Schemas mirror the shape
   the views already collect, and return field-level errors that the UI maps
   back to its existing `Record<string, string>` error maps. */

import { z } from 'zod';
import { parseDisciplines } from '@/lib/disciplines';
import { parseDurationMonths, toMonthIndex } from '@/lib/internship-period';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const emailSchema = z
  .string({ message: 'Email is required.' })
  .trim()
  .min(1, 'Email is required.')
  .refine((v) => EMAIL_RE.test(v), { message: 'Enter a valid email address.' });

export const optionalEmailSchema = z
  .string()
  .trim()
  .optional()
  .refine((v) => !v || EMAIL_RE.test(v), {
    message: 'Enter a valid email address.',
  });

/* ── Project creation wizard ──────────────────────────────────────────────── */

export const projectStep1Schema = z.object({
  title: z.string().trim().min(1, 'Project title is required.'),
  description: z.string().trim().min(1, 'Project scope is required.'),
  pc: z.string().trim().min(1, 'PC is required.'),
  educationLevel: z.string().trim().min(1, 'Intern category is required.'),
  skills: z.array(z.string()).min(1, 'Select at least one tech competency.'),
});

export type ProjectStep1Input = z.infer<typeof projectStep1Schema>;

export const projectStep2Schema = z
  .object({
    discipline: z.string().trim().refine((v) => parseDisciplines(v).length > 0, {
      message: 'Select at least one discipline.',
    }),
    slots: z.coerce.number().int().min(1, 'At least 1 placement slot is required.'),
    internshipDuration: z.string().trim().min(1, 'Project duration is required.'),
    internshipPeriodStart: z.string().trim().min(1, 'Internship start date is required.'),
    internshipPeriodEnd: z.string().trim().min(1, 'Internship end date is required.'),
  })
  .refine(
    (data) => {
      if (!data.internshipPeriodStart || !data.internshipPeriodEnd) return true;
      const start = data.internshipPeriodStart;
      const end = data.internshipPeriodEnd;
      const endBeforeStart =
        /^\d{4}-\d{2}-\d{2}$/.test(start) && /^\d{4}-\d{2}-\d{2}$/.test(end)
          ? end < start
          : (toMonthIndex(end) ?? 0) < (toMonthIndex(start) ?? 0);
      return !endBeforeStart;
    },
    {
      message: 'End date must be on or after the start date.',
      path: ['internshipPeriodEnd'],
    }
  )
  .refine(
    (data) => {
      const s = toMonthIndex(data.internshipPeriodStart);
      const en = toMonthIndex(data.internshipPeriodEnd);
      const windowMonths = s !== null && en !== null ? en - s + 1 : null;
      const dur = parseDurationMonths(data.internshipDuration);
      if (windowMonths === null || dur === null) return true;
      return dur <= windowMonths;
    },
    {
      message: 'Duration is longer than the hosting window.',
      path: ['internshipDuration'],
    }
  );

export type ProjectStep2Input = z.infer<typeof projectStep2Schema>;

export const projectStep3Schema = z.object({
  mentor: z.string().trim().min(1, 'Mentor name is required.'),
  mentorAppointment: z.string().trim().min(1, 'Mentor appointment is required.'),
  mentorUserId: emailSchema,
  secondaryMentorEmail: optionalEmailSchema,
});

export type ProjectStep3Input = z.infer<typeof projectStep3Schema>;

export const projectSimpleAdSchema = z.object({
  title: z.string().trim().min(1, 'Project title is required.'),
  description: z.string().trim().min(1, 'Project scope is required.'),
  pc: z.string().trim().min(1, 'Programme centre is required.'),
  educationLevel: z.string().trim().min(1, 'Intern category is required.'),
  skills: z.array(z.string()).min(1, 'Select at least one tech competency.'),
  discipline: z.string().trim().refine((v) => parseDisciplines(v).length > 0, {
    message: 'Select at least one discipline of study.',
  }),
  mentor: z.string().trim().min(1, 'Primary mentor name is required.'),
  mentorAppointment: z.string().trim().min(1, 'Primary mentor appointment is required.'),
  mentorUserId: emailSchema,
  secondaryMentorEmail: optionalEmailSchema,
  slots: z.coerce.number().int().min(1, 'At least 1 placement is required.'),
});

export type ProjectSimpleAdInput = z.infer<typeof projectSimpleAdSchema>;

/* ── Programme creation wizard ────────────────────────────────────────────── */

export const programmeStep1Schema = z.object({
  title: z.string().trim().min(1, 'Programme title is required.'),
  category: z.array(z.string()).min(1, 'Internship category is required.'),
});

export type ProgrammeStep1Input = z.infer<typeof programmeStep1Schema>;

const intakeWindowSchema = z.object({
  id: z.string().optional(),
  intakeTitle: z.string().optional(),
  appOpen: z.string().trim(),
  appClose: z.string().trim(),
  start: z.string().trim(),
  end: z.string().trim(),
});

export const programmeStep2Schema = (isEdit: boolean, today: string) =>
  z
    .object({
      intakes: z.array(intakeWindowSchema),
    })
    .superRefine((data, ctx) => {
      const todayMonth = today.slice(0, 7);

      data.intakes.forEach((intake, i) => {
        // Application Open Date
        if (!isEdit || i > 0) {
          if (!intake.appOpen) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Application Open Date is required.',
              path: ['intakes', i, 'appOpen'],
            });
          } else if (intake.appOpen < today) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Application Open Date cannot be in the past.',
              path: ['intakes', i, 'appOpen'],
            });
          }
        }

        // Application Close Date
        if (!intake.appClose) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Application Close Date is required.',
            path: ['intakes', i, 'appClose'],
          });
        } else {
          if (intake.appClose < today) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Application Close Date cannot be in the past.',
              path: ['intakes', i, 'appClose'],
            });
          } else if (intake.appOpen && intake.appClose <= intake.appOpen) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Application Close Date must be after Open Date.',
              path: ['intakes', i, 'appClose'],
            });
          } else if (intake.end && intake.appClose > intake.end) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Application Close Date cannot be after the Internship End Date.',
              path: ['intakes', i, 'appClose'],
            });
          }
        }

        // Internship Start Month
        if (!intake.start) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Internship Start Month is required.',
            path: ['intakes', i, 'start'],
          });
        } else {
          if (intake.start.slice(0, 7) < todayMonth) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Internship Start Month cannot be in the past.',
              path: ['intakes', i, 'start'],
            });
          }
        }

        // Internship End Month
        if (!intake.end) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: 'Internship End Month is required.',
            path: ['intakes', i, 'end'],
          });
        } else {
          if (intake.end.slice(0, 7) < todayMonth) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Internship End Month cannot be in the past.',
              path: ['intakes', i, 'end'],
            });
          } else if (intake.appClose && intake.end.slice(0, 7) < intake.appClose.slice(0, 7)) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Internship End Month cannot be before the Application Close month.',
              path: ['intakes', i, 'end'],
            });
          } else if (intake.start && intake.end < intake.start) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              message: 'Internship End Month must be on or after the Start Month.',
              path: ['intakes', i, 'end'],
            });
          }
        }
      });
    });

export type ProgrammeStep2Input = z.infer<ReturnType<typeof programmeStep2Schema>>;

/* ── Helpers ──────────────────────────────────────────────────────────────── */

export function flattenErrors(
  result: z.ZodSafeParseResult<unknown>,
  keyMap?: (path: (string | number)[]) => string
): Record<string, string> {
  if (result.success) return {};
  const errors: Record<string, string> = {};
  const flattened = result.error.flatten();

  const mapKey = keyMap ?? ((path) => path.join('.'));

  Object.entries(flattened.fieldErrors as Record<string, string[] | undefined>).forEach(([key, messages]) => {
    const first = messages?.[0];
    if (first) errors[key] = first;
  });

  return errors;
}

export function formatIntakeErrors(
  result: z.ZodSafeParseResult<unknown>
): Record<string, string> {
  if (result.success) return {};

  const errors: Record<string, string> = {};

  result.error.issues.forEach((issue: z.core.$ZodIssue) => {
    const path = issue.path as (string | number)[];
    if (path.length >= 3 && path[0] === 'intakes' && typeof path[1] === 'number') {
      const key = `intake_${path[1]}_${path[2]}`;
      if (!errors[key]) errors[key] = issue.message;
    } else {
      const key = path.map(String).join('.');
      if (!errors[key]) errors[key] = issue.message;
    }
  });

  return errors;
}
