/* Mock applicant internship application draft (education → availability…).
   Persisted in localStorage for the C-end concept demo. */

export const APPLY_DRAFT_KEY = 'dsta_apply_session_draft';
export const CHAPTER_INTRO_KEY = 'dsta_apply_chapter_intro';

export type ApplicationStepId =
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
    id: 'education',
    label: 'Education Level',
    mobileLabel: 'Education Level',
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

const DEFAULT_EDUCATION: EducationDetails = {
  institution: 'National University of Singapore',
  course: 'Computer Science',
  yearOfStudy: 'Year 3',
  gpa: '4.6',
};

const EMPTY_DRAFT: ApplySessionDraft = {
  transcriptName: '',
  cvName: '',
  education: { ...DEFAULT_EDUCATION },
  startDate: '2026-07-13',
  endDate: '2026-10-31',
  interests: ['AI & Data Analytics', 'Cybersecurity', 'Software Development'],
  rankedProjectIds: [],
  quizAnswers: [null, null, null, null, null, null],
  quizTaken: false,
  bondedScholarship: null,
  scholarshipName: '',
  creditBearing: null,
  creditModuleCode: '',
  programmeTitle: 'Polytechnic Internship 2027',
};

export function defaultEducationDetails(): EducationDetails {
  return { ...DEFAULT_EDUCATION };
}

export function loadApplyDraft(): ApplySessionDraft {
  if (typeof window === 'undefined') return { ...EMPTY_DRAFT, education: { ...DEFAULT_EDUCATION } };
  try {
    const raw = localStorage.getItem(APPLY_DRAFT_KEY);
    if (!raw) return { ...EMPTY_DRAFT, education: { ...DEFAULT_EDUCATION } };
    return { ...EMPTY_DRAFT, education: { ...DEFAULT_EDUCATION }, ...JSON.parse(raw) };
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
