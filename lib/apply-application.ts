/* Mock applicant internship application draft (education → availability…).
   Persisted in localStorage for the C-end concept demo. */

export const APPLY_DRAFT_KEY = 'dsta_apply_session_draft';
export const CHAPTER_INTRO_KEY = 'dsta_apply_chapter_intro';

export type ApplicationStepId =
  | 'personal'
  | 'education'
  | 'availability'
  | 'project-fit'
  | 'additional'
  | 'review';

export interface ApplicationNavStep {
  id: ApplicationStepId;
  label: string;
  /** PC sidebar: force wrap so long labels stay narrow (e.g. two lines). */
  labelLines?: readonly [string, string];
  mobileLabel: string;
}

export const APPLICATION_STEPS: ApplicationNavStep[] = [
  {
    id: 'personal',
    label: 'Personal Detail',
    mobileLabel: 'Personal Detail',
  },
  {
    id: 'education',
    label: 'Education',
    mobileLabel: 'Education',
  },
  { id: 'availability', label: 'Availability', mobileLabel: 'Availability' },
  {
    id: 'project-fit',
    label: 'Find Your Project Fit',
    mobileLabel: 'Find Your Project Fit',
  },
  {
    id: 'additional',
    label: 'Additional Details',
    mobileLabel: 'Additional Details',
  },
  { id: 'review', label: 'Review', mobileLabel: 'Review' },
];

export interface EducationDetails {
  institution: string;
  course: string;
  yearOfStudy: string;
  gpa: string;
  /** Shown for Tech Up / Undergraduate paths (not Polytechnic). */
  expectedGraduation?: string;
}

export interface ApplySessionDraft {
  transcriptName: string;
  cvName: string;
  education: EducationDetails;
  startDate: string; // ISO date yyyy-mm-dd
  endDate: string;
  interests: string[];
  rankedProjectIds: string[];
  quizAnswers: (number | null)[];
  /** True when the applicant completed (or started) the archetype quiz. */
  quizTaken: boolean;
  bondedScholarship: boolean | null;
  scholarshipName: string;
  creditBearing: boolean | null;
  creditModuleCode: string;
  programmeTitle: string;
}

/** Polytechnic Intern (catalog option 1). */
export const POLY_EDUCATION: EducationDetails = {
  institution: 'Nanyang Polytechnic',
  course: 'Infocomm & Security',
  yearOfStudy: 'Year 1',
  gpa: '4.6',
};

/** Tech Up / Undergraduate Intern (catalog options 2–3). */
export const UNI_EDUCATION: EducationDetails = {
  institution: 'National University of Singapore',
  course: 'Computer Science',
  yearOfStudy: 'Year 3',
  gpa: '4.6',
  expectedGraduation: '2027-05-31',
};

const MOCK_TRANSCRIPT = 'Chen_academic transcript.pdf';
const MOCK_CV = 'Chen1230_CV2026.pdf';

const DEFAULT_EDUCATION: EducationDetails = { ...UNI_EDUCATION };

const EMPTY_DRAFT: ApplySessionDraft = {
  transcriptName: '',
  cvName: '',
  education: { ...DEFAULT_EDUCATION },
  startDate: '2026-07-13',
  endDate: '2026-10-31',
  interests: ['Advanced Systems', 'Air Systems', 'Simulation & Training Systems'],
  rankedProjectIds: [],
  quizAnswers: [null, null, null, null, null, null],
  quizTaken: false,
  bondedScholarship: null,
  scholarshipName: '',
  creditBearing: null,
  creditModuleCode: '',
  programmeTitle: 'Undergraduate Internship 2027',
};

export function defaultEducationDetails(
  variant?: 'polytechnic' | 'tech-up' | 'undergraduate' | null,
): EducationDetails {
  if (variant === 'polytechnic') return { ...POLY_EDUCATION };
  return { ...UNI_EDUCATION };
}

export function programmeTitleForVariant(
  variant: 'polytechnic' | 'tech-up' | 'undergraduate',
): string {
  if (variant === 'polytechnic') return 'Polytechnic Internship 2027';
  if (variant === 'tech-up') return 'Tech Up Internship 2027';
  return 'Undergraduate Internship 2027';
}

/** Align draft education / programme fields to the catalog applicant path. */
export function syncApplyDraftToVariant(
  draft: ApplySessionDraft,
  variant: 'polytechnic' | 'tech-up' | 'undergraduate' | null,
): ApplySessionDraft {
  if (!variant) return draft;
  const education = defaultEducationDetails(variant);
  return {
    ...draft,
    education,
    programmeTitle: programmeTitleForVariant(variant),
    bondedScholarship: variant === 'polytechnic' ? false : draft.bondedScholarship,
    scholarshipName: variant === 'polytechnic' ? '' : draft.scholarshipName,
  };
}

/** Seed a fresh draft when picking an applicant path on /catlog. */
export function seedApplyDraftForVariant(
  variant: 'polytechnic' | 'tech-up' | 'undergraduate',
): ApplySessionDraft {
  const draft: ApplySessionDraft = syncApplyDraftToVariant(
    {
      ...EMPTY_DRAFT,
      /* Pre-fill uploads so education details match comps immediately. */
      transcriptName: MOCK_TRANSCRIPT,
      cvName: MOCK_CV,
      creditBearing: null,
      creditModuleCode: '',
      bondedScholarship: variant === 'polytechnic' ? false : null,
      scholarshipName: '',
    },
    variant,
  );
  saveApplyDraft(draft);
  return draft;
}

export function loadApplyDraft(): ApplySessionDraft {
  if (typeof window === 'undefined') {
    return { ...EMPTY_DRAFT, education: { ...DEFAULT_EDUCATION } };
  }
  try {
    const raw = localStorage.getItem(APPLY_DRAFT_KEY);
    if (!raw) return { ...EMPTY_DRAFT, education: { ...DEFAULT_EDUCATION } };
    const parsed = JSON.parse(raw) as Partial<ApplySessionDraft>;
    const education = {
      ...DEFAULT_EDUCATION,
      ...(parsed.education ?? {}),
    };
    /* Drop stale graduation when poly draft has empty/undefined graduation. */
    if (!parsed.education?.expectedGraduation) {
      delete education.expectedGraduation;
    }
    return {
      ...EMPTY_DRAFT,
      ...parsed,
      education,
    };
  } catch {
    return { ...EMPTY_DRAFT, education: { ...DEFAULT_EDUCATION } };
  }
}

export function saveApplyDraft(draft: ApplySessionDraft) {
  try {
    localStorage.setItem(APPLY_DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* noop */
  }
}

/** Reset education uploads so “Check your education details” stays hidden until upload. */
export function clearApplyDraft() {
  try {
    localStorage.removeItem(APPLY_DRAFT_KEY);
  } catch {
    /* noop */
  }
}

export type ChapterIntroSession = 'session-1' | 'session-2' | 'session-3';

function asChapterSession(v: string | null): ChapterIntroSession | null {
  if (v === 'session-1' || v === 'session-2' || v === 'session-3') return v;
  return null;
}

export function markChapterIntro(session: ChapterIntroSession) {
  try {
    sessionStorage.setItem(CHAPTER_INTRO_KEY, session);
  } catch {
    /* noop */
  }
}

/** Read pending intro without clearing — safe under React Strict Mode remounts. */
export function peekChapterIntro(): ChapterIntroSession | null {
  if (typeof window === 'undefined') return null;
  try {
    return asChapterSession(sessionStorage.getItem(CHAPTER_INTRO_KEY));
  } catch {
    return null;
  }
}

/** Clear after the intro animation finishes (not on mount). */
export function clearChapterIntro() {
  try {
    sessionStorage.removeItem(CHAPTER_INTRO_KEY);
  } catch {
    /* noop */
  }
}

/** @deprecated prefer peek + clearChapterIntro after animation */
export function consumeChapterIntro(): ChapterIntroSession | null {
  const v = peekChapterIntro();
  if (v) clearChapterIntro();
  return v;
}

export const CHAPTER_INTROS = {
  'session-1': {
    label: 'NEXT: SESSION 1 • START AND QUALIFY',
    title: 'Let’s start with the essentials.',
    description:
      'Share your education details and tell us when you are available for the internship.',
  },
  'session-2': {
    label: 'NEXT: SESSION 2 • DISCOVER AND RANK PROJECTS',
    title: 'Find the projects that fit you.',
    description:
      'Explore your interests or discover your Defender Archetype, then rank the projects you prefer.',
  },
  'session-3': {
    label: 'NEXT: SESSION 3 • COMPLETE AND SUBMIT',
    title: 'You’re almost there.',
    description: 'Answer the final questions, review your application and submit it to DSTA.',
  },
} as const;
