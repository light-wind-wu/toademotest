import type { Application, ProjectEntry, SharedInterviewSession } from '@/lib/types';

export type MentorApplicantStage =
  | 'shortlisted'
  | 'needs-scheduled'
  | 'interview-invited'
  | 'interview-scheduled'
  | 'interview-completed'
  | 'outcome-submitted';

export function getMentorApplicantStage(
  app: Application,
  sessions: SharedInterviewSession[],
): MentorApplicantStage | 'rescheduling-required' {
  if (app.status === 'Offer Extended' || app.status === 'Offer Accepted') {
    return 'outcome-submitted';
  }
  if (app.status === 'Interview Completed') {
    return app.mentorDecision ? 'outcome-submitted' : 'interview-completed';
  }
  if (app.status === 'Interview Scheduled') return 'interview-scheduled';
  if (app.status === 'Shortlisted for Interview') {
    if (app.interviewSetupMethod === 'direct') return 'needs-scheduled';
    if (
      app.interviewSetupMethod === 'shared' &&
      app.sharedSessionId &&
      sessions.find(s => s.id === app.sharedSessionId)?.status === 'invited'
    ) {
      return 'interview-invited';
    }
    if (app.rescheduleNote) return 'rescheduling-required' as MentorApplicantStage;
    if (app.interviewSlots && app.interviewSlots.length > 0) return 'interview-invited';
    return 'needs-scheduled';
  }
  return 'shortlisted';
}

export const MENTOR_STAGE_LABELS: Record<MentorApplicantStage | 'rescheduling-required', string> = {
  shortlisted: 'Shortlisted',
  'needs-scheduled': 'Needs Scheduled',
  'rescheduling-required': 'Rescheduling Required',
  'interview-invited': 'Interview Invited',
  'interview-scheduled': 'Interview Scheduled',
  'interview-completed': 'Interview Completed',
  'outcome-submitted': 'Outcome Submitted',
};

export function getMentorNextAction(
  stage: MentorApplicantStage | 'rescheduling-required',
  app: Application,
): string {
  switch (stage) {
    case 'shortlisted':
    case 'needs-scheduled':
      return 'Set up interviews';
    case 'rescheduling-required':
      return 'Arrange new slots';
    case 'interview-invited':
      return 'Applicant to confirm one shared slot';
    case 'interview-scheduled':
      return 'Conduct interview';
    case 'interview-completed':
      return 'Complete notes and submit recommendation';
    case 'outcome-submitted':
      return 'Waiting for IO decision';
    default:
      return 'Review';
  }
}

export type ProjectActionSummary = {
  stage: MentorApplicantStage | 'rescheduling-required';
  label: string;
  count: number;
  nextAction: string;
};

export function getProjectActionSummaries(
  projectId: string,
  apps: Application[],
  sessions: SharedInterviewSession[],
): ProjectActionSummary[] {
  const projectApps = apps.filter(a => a.shortlistedFor === projectId);
  const counts = new Map<MentorApplicantStage | 'rescheduling-required', number>();

  for (const app of projectApps) {
    const stage = getMentorApplicantStage(app, sessions);
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }

  return (Array.from(counts.entries()) as [MentorApplicantStage | 'rescheduling-required', number][])
    .filter(([, count]) => count > 0)
    .map(([stage, count]) => ({
      stage,
      label: MENTOR_STAGE_LABELS[stage],
      count,
      nextAction: getMentorNextAction(stage, projectApps[0]),
    }));
}

/* ── My Projects portal grouping (matches UT-02 prototype) ────────────────── */

export type MentorPortalStage = 'shortlisted' | 'rescheduling-required' | 'interview-completed';

export const MENTOR_PORTAL_STAGE_LABELS: Record<MentorPortalStage, string> = {
  shortlisted: 'Shortlisted',
  'rescheduling-required': 'Rescheduling Required',
  'interview-completed': 'Interview Completed',
};

export function getMentorPortalStage(
  app: Application,
  sessions: SharedInterviewSession[],
): MentorPortalStage {
  const stage = getMentorApplicantStage(app, sessions);
  if (stage === 'rescheduling-required') return 'rescheduling-required';
  if (stage === 'interview-completed' || stage === 'outcome-submitted') return 'interview-completed';
  return 'shortlisted';
}

export function getMentorPortalNextAction(stage: MentorPortalStage): string {
  switch (stage) {
    case 'shortlisted':
      return 'Set up interviews';
    case 'rescheduling-required':
      return 'Arrange new slots';
    case 'interview-completed':
      return 'Submit transcripts and feedback';
    default:
      return 'Review';
  }
}

export type ProjectPortalSummary = {
  stage: MentorPortalStage;
  label: string;
  count: number;
  nextAction: string;
};

export function getProjectPortalSummaries(
  projectId: string,
  apps: Application[],
  sessions: SharedInterviewSession[],
): ProjectPortalSummary[] {
  const projectApps = apps.filter(a => a.shortlistedFor === projectId);
  const counts = new Map<MentorPortalStage, number>();

  for (const app of projectApps) {
    const stage = getMentorPortalStage(app, sessions);
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }

  const order: MentorPortalStage[] = ['shortlisted', 'rescheduling-required', 'interview-completed'];
  return order
    .filter(stage => (counts.get(stage) ?? 0) > 0)
    .map(stage => ({
      stage,
      label: MENTOR_PORTAL_STAGE_LABELS[stage],
      count: counts.get(stage)!,
      nextAction: getMentorPortalNextAction(stage),
    }));
}

/* ── Records view styling (matches UT-02 prototype labels / colours) ─────── */

export type MentorRecordsStage =
  | 'shortlisted'
  | 'interview-invited'
  | 'interview-scheduled'
  | 'needs-scheduled'
  | 'interview-completed'
  | 'outcome-submitted';

export function getMentorRecordsStage(
  app: Application,
  sessions: SharedInterviewSession[],
): MentorRecordsStage {
  const stage = getMentorApplicantStage(app, sessions);
  if (stage === 'needs-scheduled') return 'shortlisted';
  if (stage === 'rescheduling-required') return 'needs-scheduled';
  return stage as MentorRecordsStage;
}

export const MENTOR_RECORDS_STAGE_LABELS: Record<MentorRecordsStage, string> = {
  shortlisted: 'Shortlisted',
  'interview-invited': 'Interview Invited',
  'interview-scheduled': 'Interview Scheduled',
  'needs-scheduled': 'Needs Scheduled',
  'interview-completed': 'Interview Completed',
  'outcome-submitted': 'Outcome Submitted',
};

export function getMentorRecordsNextAction(stage: MentorRecordsStage): string {
  switch (stage) {
    case 'shortlisted':
      return 'Review profile and send interview slots';
    case 'interview-invited':
      return 'Applicant to confirm one shared slot';
    case 'interview-scheduled':
      return 'Conduct interview';
    case 'needs-scheduled':
      return 'Send replacement interview slots';
    case 'interview-completed':
      return 'Complete notes and submit recommendation';
    case 'outcome-submitted':
      return 'Waiting for IO decision';
  }
}

export function getMentorRecordsBadgeClass(stage: MentorRecordsStage): string {
  switch (stage) {
    case 'shortlisted':
    case 'needs-scheduled':
    case 'interview-completed':
      return 'bg-warning-bg text-warning border-warning/20';
    case 'interview-invited':
    case 'interview-scheduled':
    case 'outcome-submitted':
      return 'bg-success-bg text-success border-success/20';
  }
}

export function getSchoolShort(school: string): string {
  const map: Record<string, string> = {
    'National University of Singapore': 'NUS',
    'Nanyang Technological University': 'NTU',
    'Singapore Management University': 'SMU',
    'Singapore University of Technology and Design': 'SUTD',
  };
  return map[school] ?? school;
}

export function isMentorProjectActive(project: ProjectEntry): boolean {
  return project.archived !== true;
}

export function formatSlot(
  slot: { date: string; time: string; duration?: string },
  options: { includeTime?: boolean; includeDuration?: boolean } = {},
): string {
  const d = new Date(`${slot.date}T00:00:00`);
  const dateStr = d.toLocaleDateString('en-SG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  if (!options.includeTime) return dateStr;
  const [h, m] = slot.time.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const timeStr = `${h % 12 || 12}:${String(m).padStart(2, '0')} ${suffix}`;
  if (options.includeDuration && slot.duration) {
    return `${dateStr} · ${timeStr} (${slot.duration})`;
  }
  return `${dateStr} · ${timeStr}`;
}

export function getSessionForApplicant(
  app: Application,
  sessions: SharedInterviewSession[],
): SharedInterviewSession | undefined {
  if (!app.sharedSessionId) return undefined;
  return sessions.find(s => s.id === app.sharedSessionId);
}
