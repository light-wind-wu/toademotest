import applicantApplicationsSeed from '@/data/applicant-applications.json';
import submissionSeed from '@/data/applicant-submission-details.json';
import type { ApplicantApplicationRecord } from '@/lib/types';

export const APPLICANT_APPLICATIONS_KEY = 'dsta_applicant_application_records';

function withSubmissionDetails(record: ApplicantApplicationRecord): ApplicantApplicationRecord {
  if (record.submissionDetails) return record;
  const details = submissionSeed.applications[record.id as keyof typeof submissionSeed.applications];
  if (!details) return record;
  // Seed each application's own snapshot, never the live profile or current draft.
  return {
    ...record,
    submissionDetails: {
      ...details,
      personal: { ...submissionSeed.personal },
      interests: [...record.summary.interests],
      projectPreferences: [...record.summary.projectPreferences],
      documents: record.documents.map((document) => ({ ...document })),
      declarations: submissionSeed.declarations.map((text) => ({ text, acceptedAt: record.submittedAt })),
    },
  };
}

function normalizeOneHourInterviewText(value: string): string {
  return value
    .replace('2:30 PM - 3:15 PM', '2:30 PM - 3:30 PM')
    .replace('10:00 AM - 10:45 AM', '10:00 AM - 11:00 AM')
    .replace('4:00 PM - 4:45 PM', '4:00 PM - 5:00 PM');
}

function hideInternalApplicantStatuses(record: ApplicantApplicationRecord): ApplicantApplicationRecord {
  return {
    ...record,
    statusMessage: normalizeOneHourInterviewText(record.statusMessage),
    nextStep: normalizeOneHourInterviewText(record.nextStep),
    interviewDetails: record.interviewDetails ? {
      ...record.interviewDetails,
      selectedTime: normalizeOneHourInterviewText(record.interviewDetails.selectedTime),
      duration: '1 hour',
    } : undefined,
    timeline: record.timeline.map((item) =>
      item.title.toLowerCase() === 'shortlisted for interview'
        ? { ...item, title: 'Application progressed', description: normalizeOneHourInterviewText(item.description) }
        : { ...item, description: normalizeOneHourInterviewText(item.description) },
    ),
  };
}

export function loadApplicantApplications(): ApplicantApplicationRecord[] {
  const seeds = (applicantApplicationsSeed as ApplicantApplicationRecord[]).map(withSubmissionDetails);
  if (typeof window === 'undefined') return seeds;

  try {
    const stored = localStorage.getItem(APPLICANT_APPLICATIONS_KEY);
    if (stored) {
      const savedRecords = JSON.parse(stored) as ApplicantApplicationRecord[];
      const savedById = new Map(savedRecords.map((record) => [record.id, record]));
      const merged = (applicantApplicationsSeed as ApplicantApplicationRecord[]).map((seedRecord) => ({
        ...seedRecord,
        ...savedById.get(seedRecord.id),
        interviewDetails: savedById.get(seedRecord.id)?.interviewDetails ?? seedRecord.interviewDetails,
      }));
      const seedIds = new Set(merged.map((record) => record.id));
      const records = [...merged, ...savedRecords.filter((record) => !seedIds.has(record.id))].map(withSubmissionDetails);
      if (records.some((record) => record.submissionDetails && !savedById.get(record.id)?.submissionDetails)) {
        try {
          localStorage.setItem(APPLICANT_APPLICATIONS_KEY, JSON.stringify(records));
        } catch {
          // Keep the saved application visible even if snapshot migration cannot be persisted.
        }
      }
      return records.map(hideInternalApplicantStatuses);
    }
    localStorage.setItem(APPLICANT_APPLICATIONS_KEY, JSON.stringify(seeds));
  } catch {
    return seeds.map(hideInternalApplicantStatuses);
  }

  return seeds.map(hideInternalApplicantStatuses);
}

export function saveApplicantApplications(records: ApplicantApplicationRecord[]) {
  localStorage.setItem(APPLICANT_APPLICATIONS_KEY, JSON.stringify(records));
}

export function transitionApplicantApplicationToUnderReview(applicationId: string) {
  const updatedAt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const next = loadApplicantApplications().map((record) => {
    if (record.id !== applicationId) return record;
    return {
      ...record,
      status: 'UNDER REVIEW' as const,
      filter: 'in-progress' as const,
      updatedAt,
      statusMessage: 'Your application is being reviewed by the internship team.',
      currentStep: 2,
      nextStep: 'We will contact you if you are shortlisted for an interview.',
      deadline: undefined,
      primaryAction: undefined,
      timeline: [
        {
          title: 'Screening in progress',
          description: 'Your application is being reviewed against the programme requirements.',
          date: updatedAt,
          tone: 'current' as const,
        },
        {
          title: 'Application submitted',
          description: 'Your application and supporting documents were received successfully.',
          date: record.submittedAt,
          tone: 'complete' as const,
        },
      ],
    };
  });

  saveApplicantApplications(next);
}

export function transitionApplicantApplicationToInterview(applicationId: string) {
  const updatedAt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const next = loadApplicantApplications().map((record) => {
    if (record.id !== applicationId) return record;
    return {
      ...record,
      status: 'INTERVIEW' as const,
      filter: 'needs-action' as const,
      updatedAt,
      statusMessage: 'You have been invited to a mentor interview. Choose an available timeslot.',
      currentStep: 3,
      nextStep: 'Choose a suitable interview timeslot by 28 Aug 2026.',
      deadline: 'Respond by 28 Aug 2026',
      primaryAction: 'confirm-interview' as const,
      interviewState: 'awaiting-confirmation' as const,
      timeline: [
        {
          title: 'Interview invitation received',
          description: 'Available mentor interview timeslots are ready for your review.',
          date: updatedAt,
          tone: 'current' as const,
        },
        {
          title: 'Application reviewed',
          description: 'Your application progressed to the interview stage.',
          date: updatedAt,
          tone: 'complete' as const,
        },
        {
          title: 'Application submitted',
          description: 'Your application and supporting documents were received successfully.',
          date: record.submittedAt,
          tone: 'complete' as const,
        },
      ],
    };
  });

  saveApplicantApplications(next);
}

export function transitionApplicantApplicationToInterviewConfirmed(
  applicationId: string,
  dateLabel: string,
  timeLabel: string,
) {
  const updatedAt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const next = loadApplicantApplications().map((record) => {
    if (record.id !== applicationId) return record;
    return {
      ...record,
      status: 'INTERVIEW' as const,
      filter: 'in-progress' as const,
      updatedAt,
      statusMessage: `Your mentor interview is confirmed for ${dateLabel} at ${timeLabel}.`,
      currentStep: 3,
      nextStep: 'Review the interview details and join Microsoft Teams 5 minutes early.',
      deadline: undefined,
      primaryAction: 'manage-interview' as const,
      interviewState: 'confirmed' as const,
      interviewDetails: {
        card: 'scheduled' as const,
        selectedDate: dateLabel,
        selectedTime: timeLabel,
        timezone: 'Singapore Time (SGT)',
        mentor: 'Marcus Tan',
        mentorRole: 'Digital Hub',
        format: 'Online interview',
        location: 'Microsoft Teams',
        duration: '1 hour',
      },
      timeline: [
        {
          title: 'Interview confirmed',
          description: `Your mentor interview is scheduled for ${dateLabel} at ${timeLabel}.`,
          date: updatedAt,
          tone: 'current' as const,
        },
        ...record.timeline.map((item) => ({
          ...item,
          tone: item.tone === 'current' ? ('complete' as const) : item.tone,
        })),
      ],
    };
  });

  saveApplicantApplications(next);
}

export function transitionApplicantApplicationToOfferReceived(applicationId: string) {
  const updatedAt = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date());

  const next = loadApplicantApplications().map((record) => {
    if (record.id !== applicationId) return record;
    return {
      ...record,
      status: 'OFFER RECEIVED' as const,
      filter: 'needs-action' as const,
      updatedAt,
      statusMessage: 'Your internship offer is ready. Review the terms and respond by 5 Sep 2026.',
      currentStep: 4,
      nextStep: 'Review and respond to your internship offer by 5 Sep 2026.',
      deadline: 'Respond by 5 Sep 2026',
      primaryAction: 'view-offer' as const,
      interviewState: 'completed' as const,
      timeline: [
        {
          title: 'Offer received',
          description: 'DSTA Talent Acquisition issued your internship offer.',
          date: updatedAt,
          tone: 'current' as const,
        },
        {
          title: 'Interview completed',
          description: 'The interview team completed its review.',
          date: '28 Aug 2026',
          tone: 'complete' as const,
        },
        ...record.timeline.map((item) => ({
          ...item,
          tone: item.tone === 'current' ? ('complete' as const) : item.tone,
        })),
      ],
    };
  });

  saveApplicantApplications(next);
}
