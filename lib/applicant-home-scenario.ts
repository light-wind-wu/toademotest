import type { ApplicantHomeScenario } from '@/lib/types';

export const APPLICANT_HOME_SCENARIO_KEY = 'dsta_applicant_home_scenario';
export const APPLICANT_HOME_SCENARIO_CHANGED = 'dsta-applicant-home-scenario';

export const APPLICANT_HOME_SCENARIOS: ReadonlyArray<{
  value: ApplicantHomeScenario;
  label: string;
}> = [
  { value: 'multiple-applications', label: 'Multiple active applications' },
  { value: 'no-application', label: 'No application yet' },
  { value: 'draft-application', label: 'Draft application' },
  { value: 'submitted', label: 'Application submitted' },
  { value: 'under-review', label: 'Application under review' },
  { value: 'interview-action', label: 'Interview invitation' },
  { value: 'interview-pending-confirmation', label: 'Interview pending confirmation' },
  { value: 'interview-scheduled', label: 'Interview confirmed' },
  { value: 'interview-rescheduling', label: 'Interview rescheduling' },
  { value: 'offer-action', label: 'Offer received' },
  { value: 'onboarding-action', label: 'Onboarding' },
  { value: 'active-internship', label: 'Internship in progress' },
  { value: 'completion-action', label: 'Offboarding required' },
  { value: 'journey-completed', label: 'Internship completed' },
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
