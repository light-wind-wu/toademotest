/* Mock Singpass Myinfo profiles + pending onboarding state for the applicant
   account-setup flow. No real NDI / Myinfo API — data is seeded per demo identity. */
import type { UserRole } from './types';

export const MYINFO_PENDING_KEY = 'dsta_myinfo_pending';
export const APPLICANT_PROFILE_KEY = 'dsta_applicant_profile';

export interface MyinfoPersonal {
  name: string;
  sex: string;
  dateOfBirth: string;
  race: string;
  nationality: string;
  residentialStatus: string;
  registeredAddress: string;
}

export interface MyinfoContact {
  mobile: string;
  email: string;
}

export interface MyinfoProfile extends MyinfoPersonal, MyinfoContact {}

export interface MyinfoPending {
  role: Extract<UserRole, 'new-applicant' | 'existing-scholar-applicant'>;
  profile: MyinfoProfile;
  guardian?: boolean;
  at: string;
}

export interface ApplicantProfile extends MyinfoProfile {
  nric: string;
  role: UserRole;
  dataUseConsent: boolean;
  declarationConsent: boolean;
  createdAt: string;
}

const PROFILES: Record<'new-applicant' | 'existing-scholar-applicant', MyinfoProfile> = {
  'new-applicant': {
    name: 'Jenny Aw',
    sex: 'Female',
    dateOfBirth: '22 Aug 2003',
    race: 'Chinese',
    nationality: 'Singapore Citizen',
    residentialStatus: 'Citizen',
    registeredAddress: '123 Clementi Ave 3, #12-34, S120123',
    mobile: '+65 9123 4567',
    email: 'jenny.aw@u.nus.edu',
  },
  'existing-scholar-applicant': {
    name: 'Marcus Tan',
    sex: 'Male',
    dateOfBirth: '15 Mar 2002',
    race: 'Chinese',
    nationality: 'Singapore Citizen',
    residentialStatus: 'Citizen',
    registeredAddress: '45 Bukit Timah Rd, #08-12, S259756',
    mobile: '+65 9876 5432',
    email: 'marcus.tan@u.nus.edu',
  },
};

/** Fields requested on the Myinfo consent screen (Fig 1). */
export const MYINFO_REQUESTED = {
  personal: ['Name', 'Sex', 'Date of Birth', 'Race', 'Nationality', 'Residential Status'] as const,
  contact: ['Mobile No.', 'Email', 'Registered Address'] as const,
};

export function getMyinfoProfile(
  role: 'new-applicant' | 'existing-scholar-applicant',
): MyinfoProfile {
  return { ...PROFILES[role] };
}

export function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

export function saveMyinfoPending(pending: MyinfoPending) {
  try {
    sessionStorage.setItem(MYINFO_PENDING_KEY, JSON.stringify(pending));
  } catch { /* noop */ }
}

export function loadMyinfoPending(): MyinfoPending | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(MYINFO_PENDING_KEY);
    return raw ? (JSON.parse(raw) as MyinfoPending) : null;
  } catch {
    return null;
  }
}

export function clearMyinfoPending() {
  try {
    sessionStorage.removeItem(MYINFO_PENDING_KEY);
  } catch { /* noop */ }
}

export function saveApplicantProfile(profile: ApplicantProfile) {
  try {
    localStorage.setItem(APPLICANT_PROFILE_KEY, JSON.stringify(profile));
  } catch { /* noop */ }
}

export function loadApplicantProfile(): ApplicantProfile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(APPLICANT_PROFILE_KEY);
    return raw ? (JSON.parse(raw) as ApplicantProfile) : null;
  } catch {
    return null;
  }
}

/** Singapore NRIC / FIN shape used by the concept demo. */
export function isValidNric(value: string): boolean {
  return /^[STFGM]\d{7}[A-Z]$/i.test(value.replace(/\s/g, ''));
}
