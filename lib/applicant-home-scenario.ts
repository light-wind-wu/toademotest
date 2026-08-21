import type { ApplicantHomeScenario } from '@/lib/types';

export const APPLICANT_HOME_SCENARIO_KEY = 'dsta_applicant_home_scenario';
export const APPLICANT_HOME_SCENARIO_CHANGED = 'dsta-applicant-home-scenario';

export const APPLICANT_HOME_SCENARIOS: ReadonlyArray<{
  value: ApplicantHomeScenario;
  label: string;
}> = [
  { value: 'no-application', label: 'No application yet' },
  { value: 'draft-application', label: 'Draft application' },
  { value: 'under-review', label: 'Application under review' },
  { value: 'interview-action', label: 'Interview action required' },
  { value: 'interview-scheduled', label: 'Interview slot selected' },
  { value: 'interview-rescheduling', label: 'Alternative interview time suggested' },
  { value: 'offer-action', label: 'Offer action required' },
  { value: 'onboarding-action', label: 'Onboarding action required' },
  { value: 'active-internship', label: 'Active internship' },
  { value: 'completion-action', label: 'Completion action required' },
  { value: 'journey-completed', label: 'Journey completed' },
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
