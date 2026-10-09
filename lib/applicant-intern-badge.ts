import type { ApplicantDashboardState, ApplicantInternBadge, InternBadgeStatus } from '@/lib/types';

const ELIGIBLE_APPLICATION_STATES: readonly ApplicantDashboardState[] = [
  'draft_application',
  'application_submitted',
  'application_under_review',
  'interview_invitation',
  'interview_pending_confirmation',
  'interview_confirmed',
  'interview_rescheduling',
  'offer_received',
  'onboarding',
];

export function resolveInternBadgeStatus(
  state: ApplicantDashboardState,
  programmeIsBadgeEligible = true,
): InternBadgeStatus | null {
  if (!programmeIsBadgeEligible) return null;
  if (ELIGIBLE_APPLICATION_STATES.includes(state)) return 'eligible';
  if (state === 'internship_in_progress' || state === 'offboarding_required') return 'in_progress';
  if (state === 'internship_completed') return 'earned';
  return null;
}

export function resolveInternBadges(
  state: ApplicantDashboardState,
  programmes: ReadonlyArray<{ id: string; name: string; badgeEligible: boolean }> = [
    { id: 'university-internship-2027', name: 'University Internship 2027', badgeEligible: true },
  ],
): ApplicantInternBadge[] {
  return programmes.flatMap((programme) => {
    const status = resolveInternBadgeStatus(state, programme.badgeEligible);
    if (!status) return [];

    return [{
      id: `dsta-intern-${programme.id}`,
      name: status === 'earned' ? 'DSTA Intern' : 'DSTA Intern Badge',
      programmeName: programme.name,
      status,
      earnedAt: status === 'earned' ? '31 Jul 2027' : undefined,
    }];
  });
}
