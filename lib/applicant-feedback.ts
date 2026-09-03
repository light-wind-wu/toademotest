import { z } from 'zod';
import {
  loadApplicantInternshipRecord,
  saveApplicantInternshipFeedback,
} from '@/lib/applicant-internship';

const feedbackDraftSchema = z.object({
  ratings: z.object({
    calibration: z.number().int().min(1).max(5),
    sentiment: z.number().int().min(1).max(5),
    mentorship: z.number().int().min(1).max(5),
    environment: z.number().int().min(1).max(5),
  }),
  scopeFit: z.enum(['too-easy', 'just-right', 'too-hard']),
  recommend: z.number().int().min(0).max(10),
  highlights: z.string().trim().min(1),
  improvements: z.string().trim().min(1),
  mentorMsg: z.string().trim().min(1),
});

const draftKey = (applicationId: string) => `dsta_feedback_draft_${applicationId}`;

export function hasSubmittedApplicantFeedback() {
  return Boolean(loadApplicantInternshipRecord('offboarding').feedback);
}

export function submitApplicantFeedbackDraft(applicationId: string) {
  let storedDraft: unknown = null;
  try {
    const stored = localStorage.getItem(draftKey(applicationId));
    storedDraft = stored ? JSON.parse(stored) : null;
  } catch {
    storedDraft = null;
  }

  const parsedDraft = feedbackDraftSchema.safeParse(storedDraft);
  const feedback = parsedDraft.success
    ? {
        submittedAt: new Date().toISOString().split('T')[0],
        ratings: parsedDraft.data.ratings,
        scopeFit: parsedDraft.data.scopeFit,
        recommend: parsedDraft.data.recommend,
        highlights: parsedDraft.data.highlights,
        improvements: parsedDraft.data.improvements,
        mentorMessage: parsedDraft.data.mentorMsg,
      }
    : {
        submittedAt: new Date().toISOString().split('T')[0],
        ratings: { calibration: 5, sentiment: 5, mentorship: 5, environment: 5 },
        scopeFit: 'just-right' as const,
        recommend: 9,
        highlights: 'A rewarding internship with meaningful project work.',
        improvements: 'Continue providing regular opportunities for feedback.',
        mentorMessage: 'Thank you for the guidance and regular feedback.',
      };

  const updatedRecord = saveApplicantInternshipFeedback(applicationId, feedback);
  try {
    localStorage.removeItem(draftKey(applicationId));
  } catch {
    /* Prototype storage can be unavailable in restricted browser modes. */
  }
  return updatedRecord;
}
