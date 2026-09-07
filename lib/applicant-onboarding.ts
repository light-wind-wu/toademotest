import type { ApplicantOnboardingDraft } from '@/lib/types';

export const APPLICANT_ONBOARDING_DRAFT_KEY = 'dsta_applicant_onboarding_draft';

export const APPLICANT_ONBOARDING_DRAFT_SEED: ApplicantOnboardingDraft = {
  bankName: '',
  bankAccountNumber: '',
  bankAccountHolderName: 'Jenny Aw',
  bankSupportingDocumentName: '',
  profilePhotographRequired: false,
  profilePhotographName: '',
  bringingMobileDevice: false,
  mobileDeviceImeiNumber: '',
  mobileDeclarationAccepted: false,
  acceptableUsePolicyAccepted: false,
  completedTasks: [],
};

export function loadApplicantOnboardingDraft(): ApplicantOnboardingDraft {
  try {
    const raw = localStorage.getItem(APPLICANT_ONBOARDING_DRAFT_KEY);
    if (!raw) return { ...APPLICANT_ONBOARDING_DRAFT_SEED, completedTasks: [] };
    const stored = JSON.parse(raw) as Partial<ApplicantOnboardingDraft>;
    return {
      ...APPLICANT_ONBOARDING_DRAFT_SEED,
      ...stored,
      completedTasks: Array.isArray(stored.completedTasks) ? stored.completedTasks : [],
    };
  } catch {
    return { ...APPLICANT_ONBOARDING_DRAFT_SEED, completedTasks: [] };
  }
}

export function saveApplicantOnboardingDraft(draft: ApplicantOnboardingDraft): void {
  try {
    localStorage.setItem(APPLICANT_ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* Prototype storage can be unavailable in restricted browser modes. */
  }
}

export function submitApplicantOnboardingDraft(): ApplicantOnboardingDraft {
  const submitted = { ...loadApplicantOnboardingDraft(), submittedAt: new Date().toISOString() };
  saveApplicantOnboardingDraft(submitted);
  return submitted;
}
