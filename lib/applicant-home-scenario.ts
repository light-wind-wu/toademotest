import type { ApplicantHomeScenario } from '@/lib/types';

export const APPLICANT_HOME_SCENARIO_KEY = 'dsta_applicant_home_scenario';
export const APPLICANT_HOME_SCENARIO_CHANGED = 'dsta-applicant-home-scenario';

export const APPLICANT_HOME_SCENARIOS: ReadonlyArray<{
  value: ApplicantHomeScenario;
  label: string;
  group: 'Overview' | 'Application' | 'Interview' | 'Offer and onboarding' | 'Closed outcomes' | 'Internship and completion';
}> = [
  { value: 'multiple-applications', label: 'Multiple active applications', group: 'Overview' },
  { value: 'no-application', label: 'No application yet', group: 'Overview' },
  { value: 'draft-application', label: 'Draft application', group: 'Application' },
  { value: 'submitted', label: 'Application submitted', group: 'Application' },
  { value: 'under-review', label: 'Application under review', group: 'Application' },
  { value: 'interview-action', label: 'Interview action required', group: 'Interview' },
  { value: 'interview-pending-confirmation', label: 'Interview pending confirmation', group: 'Interview' },
  { value: 'interview-scheduled', label: 'Interview confirmed', group: 'Interview' },
  { value: 'interview-rescheduling', label: 'Interview rescheduling required', group: 'Interview' },
  { value: 'offer-action', label: 'Offer action required', group: 'Offer and onboarding' },
  { value: 'onboarding-action', label: 'Onboarding action required', group: 'Offer and onboarding' },
  { value: 'application-unsuccessful', label: 'Application unsuccessful', group: 'Closed outcomes' },
  { value: 'application-withdrawn', label: 'Application withdrawn', group: 'Closed outcomes' },
  { value: 'offer-declined', label: 'Offer declined', group: 'Closed outcomes' },
  { value: 'offer-expired', label: 'Offer expired', group: 'Closed outcomes' },
  { value: 'active-internship', label: 'Active internship', group: 'Internship and completion' },
  { value: 'completion-action', label: 'Completion action required', group: 'Internship and completion' },
  { value: 'journey-completed', label: 'Journey completed', group: 'Internship and completion' },
];

const VALID_SCENARIOS = new Set<ApplicantHomeScenario>(
  APPLICANT_HOME_SCENARIOS.map(({ value }) => value),
);

export function isApplicantHomeScenario(value: unknown): value is ApplicantHomeScenario {
  return typeof value === 'string' && VALID_SCENARIOS.has(value as ApplicantHomeScenario);
}

export function loadApplicantHomeScenario(): ApplicantHomeScenario {
  if (typeof window === 'undefined') return 'interview-action';
  try {
    const value = localStorage.getItem(APPLICANT_HOME_SCENARIO_KEY);
    if (value === 'interview-completed') return 'interview-pending-confirmation';
    return isApplicantHomeScenario(value) ? value : 'interview-action';
  } catch {
    return 'interview-action';
  }
}

export function saveApplicantHomeScenario(scenario: ApplicantHomeScenario) {
  try {
    localStorage.setItem(APPLICANT_HOME_SCENARIO_KEY, scenario);
  } catch {
    /* Prototype storage may be unavailable in restricted browser modes. */
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent<ApplicantHomeScenario>(APPLICANT_HOME_SCENARIO_CHANGED, {
        detail: scenario,
      }),
    );
  }
}
