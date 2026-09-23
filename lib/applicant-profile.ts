import { z } from 'zod';
import { format, isValid, parse } from 'date-fns';
import { isValidNric } from '@/lib/myinfo';
import seed from '@/data/applicant-profile.json';
import type { ApplicantEditableProfile, ProfileDocument, ProfilePhoto, ProfileEducation, ProfileQualification, ProfileTestScore, ProfileLanguage } from '@/lib/types';
import extractionSeed from '@/data/applicant-document-extraction.json';
import { employmentShape, profileEmploymentSchema } from '@/lib/profile-employment';

export const PROFILE_QUALIFICATIONS = ['Undergraduate', 'A-level', 'Polytechnic', 'NUS High', 'IB', 'O-level', 'Secondary', 'Other Qualification'] as const;
export const PROFILE_STUDY_STATUSES = ['Currently studying', 'Completed', 'Discontinued'] as const;
export const PROFILE_EXAMS = ['SAT', 'TOEFL', 'GMAT', 'GRE', 'IELTS'] as const;
export const PROFILE_SEX_OPTIONS = ['Male', 'Female', 'Undisclosed', 'Others'] as const;
export const PROFILE_LANGUAGE_LEVELS = ['Basic', 'Intermediate', 'Advanced'] as const;
export function newProfileLanguage(): ProfileLanguage {
  return { language: '', speaking: '', reading: '', writing: '' };
}
export const profileStorageKey = (email: string) => `dsta_applicant_profile_${email}`;
export const hasProfileProgramme = (qualification: ProfileQualification) => ['Undergraduate', 'Polytechnic', 'Other Qualification'].includes(qualification);

export function newProfileEducation(id = crypto.randomUUID()): ProfileEducation {
  return { ...seed.educationDefaults, id } as ProfileEducation;
}
export function newProfileTest(id = crypto.randomUUID()): ProfileTestScore {
  return { id, exam: 'SAT', version: '', testDate: '', score: '', maximumScore: '' };
}

const text = z.string().trim().max(200, 'Use no more than 200 characters.');
const profileSexSchema = text.default('').transform((value) => value === 'Other' ? 'Others' : value === 'Prefer not to say' ? 'Undisclosed' : value);
const restoredPersonalFields = ['nric', 'countryOfBirth', 'dateOfBirth', 'sex', 'residentialStatus', 'registeredAddress'] as const;
function normalizeBirthDate(value: string) {
  if (!value || /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = parse(value, 'd MMM yyyy', new Date());
  return isValid(parsed) ? format(parsed, 'yyyy-MM-dd') : value;
}
const month = z.string().refine((value) => !value || /^\d{4}-(0[1-9]|1[0-2])$/.test(value), 'Enter a valid month and year.');
const numeric = (value: string) => /^(?:\d+\.?\d*|\.\d+)$/.test(value) && Number.isFinite(Number(value));

// Keep superseded assessment data out of the editable history without losing saved records.
const legacyEducationFields = [
  'examinationYear', 'resultsStatus', 'scoringSystem', 'score', 'maximumScore',
  'otherScoringSystem', 'resultType', 'subjects', 'qualificationName', 'subjectMajor', 'secondCourse',
] as const;

function migrateEducationHistory(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return raw;
  const value = raw as Record<string, unknown>;
  const archive = { ...(value.legacyQualificationDetails as Record<string, unknown> | undefined) };
  for (const key of legacyEducationFields) if (value[key] !== undefined) archive[key] = value[key];
  return {
    ...value,
    major: value.major ?? '',
    secondMajor: value.secondMajor ?? value.secondCourse ?? '',
    course: value.course || (value.qualification === 'Other Qualification' ? value.qualificationName ?? '' : ''),
    ...(Object.keys(archive).length ? { legacyQualificationDetails: archive } : {}),
  };
}

export function normalizeProfileEducation(value: ProfileEducation): ProfileEducation {
  const next = { ...value };
  if (next.status === 'Currently studying') next.endDate = '';
  else { next.expectedGraduation = ''; next.currentYear = ''; }
  if (next.qualification !== 'Undergraduate') { next.major = ''; next.secondMajor = ''; next.minor = ''; }
  if (!hasProfileProgramme(next.qualification)) next.course = '';
  if (next.expectedGraduation || next.endDate) delete next.legacyGraduationYear;
  return next;
}

const educationShape = z.preprocess(migrateEducationHistory, z.object({
  id: z.string().min(1), qualification: z.enum(PROFILE_QUALIFICATIONS), institution: text,
  country: text, status: z.enum(PROFILE_STUDY_STATUSES), currentYear: text,
  startDate: month, expectedGraduation: z.string(), endDate: z.string(),
  course: text, major: text, secondMajor: text, minor: text,
  legacyGraduationYear: z.string().optional(),
  legacyQualificationDetails: z.record(z.string(), z.unknown()).optional(),
}));

export const profileEducationSchema = educationShape.transform(normalizeProfileEducation).superRefine((value, ctx) => {
  const error = (field: string, message: string) => ctx.addIssue({ code: 'custom', path: [field], message });
  if (!value.institution) error('institution', 'Institution name is required.');
  if (!value.country) error('country', 'Country is required.');
  const dateField = value.status === 'Currently studying' ? 'expectedGraduation' : 'endDate';
  if (value[dateField] && !month.safeParse(value[dateField]).success) error(dateField, 'Enter a valid month and year.');
  if (value.startDate && value[dateField] && value.startDate > value[dateField]) error(dateField, 'End date must not be before the start date.');
});

const testShape = z.object({ id: z.string().min(1), exam: z.enum(PROFILE_EXAMS), version: text, testDate: z.string(), score: text, maximumScore: z.string().default('') });
export const profileTestSchema = testShape.superRefine((value, ctx) => {
  const error = (field: string, message: string) => ctx.addIssue({ code: 'custom', path: [field], message });
  const date = new Date(`${value.testDate}T12:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.testDate) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value.testDate) error('testDate', 'Enter a valid test date.');
  else if (value.testDate > new Date().toISOString().slice(0, 10)) error('testDate', 'Test date must not be in the future.');
  if (!numeric(value.score)) error('score', 'Enter a valid non-negative score.');
});

const languageShape = z.object({
  language: text.refine((value) => !value || seed.languages.includes(value), 'Select a language from the list.'),
  speaking: z.enum(['', ...PROFILE_LANGUAGE_LEVELS]),
  reading: z.enum(['', ...PROFILE_LANGUAGE_LEVELS]),
  writing: z.enum(['', ...PROFILE_LANGUAGE_LEVELS]),
});
const languagesShape = z.array(languageShape).default([]);
export const profileLanguagesSchema = languagesShape.superRefine((rows, ctx) => {
  const selected = new Set<string>();
  rows.forEach((row, index) => {
    if (!row.language) {
      ctx.addIssue({ code: 'custom', path: [index, 'language'], message: 'Select a language.' });
      return;
    }
    if (selected.has(row.language)) ctx.addIssue({ code: 'custom', path: [index, 'language'], message: 'This language is already listed.' });
    selected.add(row.language);
    for (const field of ['speaking', 'reading', 'writing'] as const) {
      if (!row[field]) ctx.addIssue({ code: 'custom', path: [index, field], message: 'Select a proficiency level.' });
    }
  });
});

const documentSchema = z.object({ id: z.string().min(1), name: z.string(), uploadedAt: z.string() }).passthrough();
export const profilePhotoSchema = z.object({
  dataUrl: z.string().max(700000).regex(/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/=]+$/),
  updatedAt: z.iso.datetime(),
});
const documentsSchema = z.preprocess((value) => {
  if (Array.isArray(value)) return value;
  if (!value || typeof value !== 'object') return value;
  return Object.entries(value).filter(([key, document]) => ['cv', 'transcript', 'other'].includes(key) && document)
    .map(([key, document]) => ({ ...(document as object), id: `legacy-${key}` }))
    .sort((a, b) => String((a as ProfileDocument).uploadedAt).localeCompare(String((b as ProfileDocument).uploadedAt)));
}, z.array(documentSchema));
const profileShape = z.object({
  version: z.literal(2), fullName: text, email: z.email(), accountEmail: z.email().optional(), phone: text, nationality: text,
  nric: text.default(''), countryOfBirth: text.default(''), dateOfBirth: z.string().default('').transform(normalizeBirthDate),
  sex: profileSexSchema, residentialStatus: text.default(''), registeredAddress: z.string().trim().max(500).default(''),
  education: z.array(educationShape), testScores: z.array(testShape),
  languages: languagesShape.transform((rows) => rows.filter((row) => row.language || row.speaking || row.reading || row.writing)),
  employment: z.array(employmentShape).default([]),
  documents: documentsSchema,
  photo: profilePhotoSchema.optional(),
}).passthrough();
const personalShape = z.object({
  email: z.email(),
  sex: profileSexSchema.pipe(text.min(1, 'Sex is required.')).pipe(z.enum(PROFILE_SEX_OPTIONS)),
  fullName: text.min(1, 'Full name is required.'), nationality: text.min(1, 'Nationality is required.'),
  nric: text.min(1, 'NRIC / FIN is required. Contact support to update your identity details.'),
  countryOfBirth: text.min(1, 'Country of birth is required.'),
  dateOfBirth: z.string().trim().min(1, 'Date of birth is required.').transform(normalizeBirthDate),
  phone: text.min(1, 'Mobile number is required.'),
  residentialStatus: text.min(1, 'Residential status is required.'),
  registeredAddress: z.string().trim().min(1, 'Registered address is required.').max(500),
});
function validatePersonal(value: z.infer<typeof personalShape>, ctx: z.RefinementCtx) {
  if (value.nric && !isValidNric(value.nric)) ctx.addIssue({ code: 'custom', path: ['nric'], message: 'Enter a valid NRIC / FIN.' });
  if (value.dateOfBirth) {
    const parsed = parse(value.dateOfBirth, 'yyyy-MM-dd', new Date());
    if (!isValid(parsed) || format(parsed, 'yyyy-MM-dd') !== value.dateOfBirth) ctx.addIssue({ code: 'custom', path: ['dateOfBirth'], message: 'Enter a valid date of birth.' });
    else if (value.dateOfBirth > format(new Date(), 'yyyy-MM-dd')) ctx.addIssue({ code: 'custom', path: ['dateOfBirth'], message: 'Date of birth must not be in the future.' });
  }
}
export const profilePersonalSchema = personalShape.superRefine(validatePersonal);
export const applicantProfileSchema = profileShape.extend({
  ...personalShape.shape,
  education: z.array(profileEducationSchema), testScores: z.array(profileTestSchema),
  languages: profileLanguagesSchema,
  employment: z.array(profileEmploymentSchema).default([]),
}).superRefine(validatePersonal);

export function defaultApplicantProfile(email: string, name: string): ApplicantEditableProfile {
  const preset = seed.profiles[email as keyof typeof seed.profiles];
  return {
    version: 2, fullName: name, email, phone: preset?.phone ?? '', nationality: preset?.nationality ?? '',
    nric: preset?.nric ?? '', countryOfBirth: preset?.countryOfBirth ?? '', dateOfBirth: preset?.dateOfBirth ?? '',
    sex: preset?.sex ?? '', residentialStatus: preset?.residentialStatus ?? '', registeredAddress: preset?.registeredAddress ?? '',
    education: (preset?.education ?? []).map((entry) => ({ ...newProfileEducation(entry.id), ...entry }) as ProfileEducation),
    testScores: [], languages: [], employment: [], documents: [],
  };
}

export function migrateApplicantProfile(raw: unknown, email: string, name: string): ApplicantEditableProfile {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('The saved profile could not be read.');
  const value = raw as Record<string, unknown>;
  if ((value.accountEmail ?? value.email) && (value.accountEmail ?? value.email) !== email) throw new Error('The saved profile belongs to another account.');
  if (value.version === 2) return profileShape.parse(value) as ApplicantEditableProfile;
  if (value.version !== undefined) throw new Error('This profile version is not supported.');
  const str = (key: string) => typeof value[key] === 'string' ? value[key] as string : '';
  const legacy = newProfileEducation('legacy-education');
  legacy.institution = str('institution'); legacy.course = str('course'); legacy.currentYear = str('yearOfStudy');
  if (legacy.currentYear === 'Graduate') { legacy.status = 'Completed'; legacy.currentYear = ''; }
  legacy.legacyGraduationYear = str('graduationYear') || undefined;
  if (str('cgpa')) {
    const parts = str('cgpa').split('/').map((part) => part.trim());
    legacy.legacyQualificationDetails = { resultsStatus: 'Available', score: parts[0], maximumScore: parts[1] ?? '' };
  }
  return profileShape.parse({
    ...value, version: 2, fullName: str('fullName') || name, email, phone: str('phone'), nationality: str('nationality'),
    education: [legacy.institution, legacy.course, legacy.currentYear, legacy.legacyGraduationYear, legacy.legacyQualificationDetails].some(Boolean) ? [legacy] : [],
    testScores: [], documents: value.documents ?? {},
  }) as ApplicantEditableProfile;
}

export function loadEditableApplicantProfile(email: string, name: string): ApplicantEditableProfile {
  const raw = localStorage.getItem(profileStorageKey(email));
  const stored = raw ? JSON.parse(raw) : null;
  const profile = defaultApplicantProfile(email, name);
  // Only use Myinfo belonging to this identity; never copy the latest other applicant's form.
  const myinfoRaw = localStorage.getItem('dsta_applicant_profile');
  if (myinfoRaw) {
    try {
      const personal = JSON.parse(myinfoRaw);
      if (personal?.email === email) {
        if (typeof personal.name === 'string') profile.fullName = personal.name;
        if (typeof personal.mobile === 'string') profile.phone = personal.mobile;
        if (typeof personal.nationality === 'string') profile.nationality = personal.nationality;
        for (const field of restoredPersonalFields) if (typeof personal[field] === 'string') profile[field] = personal[field];
        profile.dateOfBirth = normalizeBirthDate(profile.dateOfBirth);
      }
    } catch { /* An unrelated Myinfo record must not prevent opening this profile. */ }
  }
  profile.sex = profileSexSchema.parse(profile.sex);
  if (raw) {
    const migrated = migrateApplicantProfile(stored, email, name);
    // Fill only newly introduced fields; an explicitly cleared value must stay cleared.
    for (const field of restoredPersonalFields) if (stored[field] === undefined) migrated[field] = profile[field];
    return migrated;
  }
  return profile;
}

export function saveEditableApplicantProfile(email: string, value: ApplicantEditableProfile): ApplicantEditableProfile {
  const current = loadEditableApplicantProfile(email, value.fullName);
  if ((value.accountEmail ?? value.email) !== email || value.email !== current.email) throw new Error('The profile account has changed. Please reopen My Profile.');
  const result = applicantProfileSchema.parse(value) as ApplicantEditableProfile;
  localStorage.setItem(profileStorageKey(email), JSON.stringify(result));
  return result;
}

// Modal saves touch only their own fields, preserving stored data in every other section.
export function saveProfilePersonal(email: string, name: string, value: z.input<typeof personalShape>): ApplicantEditableProfile {
  const current = loadEditableApplicantProfile(email, name);
  const personal = profilePersonalSchema.parse({ ...value, email: current.email, nric: current.nric });
  const next = { ...current, ...personal };
  localStorage.setItem(profileStorageKey(email), JSON.stringify(next));
  return next;
}

export function saveProfileEmployment(email: string, name: string, value: z.input<typeof profileEmploymentSchema>, adding: boolean): ApplicantEditableProfile {
  const current = loadEditableApplicantProfile(email, name);
  const employment = profileEmploymentSchema.parse(value);
  const exists = current.employment.some((item) => item.id === employment.id);
  if (adding === exists) throw new Error('This employment record changed. Reopen My Profile and try again.');
  const next = { ...current, employment: adding ? [...current.employment, employment] : current.employment.map((item) => item.id === employment.id ? employment : item) };
  localStorage.setItem(profileStorageKey(email), JSON.stringify(next));
  return next;
}

function findProfileLanguage(rows: ProfileLanguage[], previous: ProfileLanguage) {
  return rows.findIndex((row) => row.language === previous.language && row.speaking === previous.speaking && row.reading === previous.reading && row.writing === previous.writing);
}

export function saveProfileLanguage(email: string, name: string, value: ProfileLanguage, previous: ProfileLanguage | null): ApplicantEditableProfile {
  const current = loadEditableApplicantProfile(email, name);
  const language = profileLanguagesSchema.parse([value])[0];
  const index = previous ? findProfileLanguage(current.languages, previous) : -1;
  if (previous && index < 0) throw new Error('This language changed. Reopen My Profile and try again.');
  if (current.languages.some((row, rowIndex) => rowIndex !== index && row.language === language.language)) throw new Error('This language is already listed.');
  const next = { ...current, languages: previous ? current.languages.map((row, rowIndex) => rowIndex === index ? language : row) : [...current.languages, language] };
  localStorage.setItem(profileStorageKey(email), JSON.stringify(next));
  return next;
}

export function removeProfileLanguage(email: string, name: string, previous: ProfileLanguage): ApplicantEditableProfile {
  const current = loadEditableApplicantProfile(email, name);
  const index = findProfileLanguage(current.languages, previous);
  if (index < 0) throw new Error('This language changed. Reopen My Profile and try again.');
  const next = { ...current, languages: current.languages.filter((_, rowIndex) => rowIndex !== index) };
  localStorage.setItem(profileStorageKey(email), JSON.stringify(next));
  return next;
}

export function removeProfileRecord(email: string, name: string, section: 'education' | 'employment' | 'testScores', id: string): ApplicantEditableProfile {
  const current = loadEditableApplicantProfile(email, name);
  if (!current[section].some((item) => item.id === id)) throw new Error('This record no longer exists. Reopen My Profile and try again.');
  const next = { ...current, [section]: current[section].filter((item) => item.id !== id) };
  localStorage.setItem(profileStorageKey(email), JSON.stringify(next));
  return next;
}

export function saveProfileTestScore(email: string, name: string, value: ProfileTestScore, adding: boolean): ApplicantEditableProfile {
  const current = loadEditableApplicantProfile(email, name);
  const test = profileTestSchema.parse(value);
  const exists = current.testScores.some((item) => item.id === test.id);
  if (adding === exists) throw new Error('This test score changed. Reopen My Profile and try again.');
  const next = { ...current, testScores: adding ? [...current.testScores, test] : current.testScores.map((item) => item.id === test.id ? test : item) };
  localStorage.setItem(profileStorageKey(email), JSON.stringify(next));
  return next;
}

export function saveProfileEducation(email: string, name: string, value: ProfileEducation, adding: boolean): ApplicantEditableProfile {
  const current = loadEditableApplicantProfile(email, name);
  const education = profileEducationSchema.parse(value);
  const exists = current.education.some((item) => item.id === education.id);
  if (adding === exists) throw new Error('This education record changed. Reopen My Profile and try again.');
  const next = { ...current, education: adding ? [...current.education, education] : current.education.map((item) => item.id === education.id ? education : item) };
  localStorage.setItem(profileStorageKey(email), JSON.stringify(next));
  return next;
}

// Keep the original account key stable so applications, files and preferences remain linked.
export function saveVerifiedProfileEmail(accountEmail: string, name: string, previousEmail: string, nextEmail: string): ApplicantEditableProfile {
  const email = z.email().parse(nextEmail);
  const current = loadEditableApplicantProfile(accountEmail, name);
  if (current.email !== previousEmail) throw new Error('Your email changed in another window. Reopen My Profile and try again.');
  if (email.toLowerCase() === current.email.toLowerCase()) throw new Error('Enter a different email address.');
  const next = profileShape.parse({ ...current, accountEmail, email }) as ApplicantEditableProfile;
  localStorage.setItem(profileStorageKey(accountEmail), JSON.stringify(next));
  return next;
}

// Document actions are independent of unsaved form edits and commit atomically with profile updates.
export function saveProfileDocument(email: string, name: string, id: string | null, document: Omit<ProfileDocument, 'id'> | null, updateProfile = false): ApplicantEditableProfile {
  const current = loadEditableApplicantProfile(email, name);
  if (id && !current.documents.some((item) => item.id === id)) throw new Error('This file no longer exists. Reopen My Profile.');
  const next = { ...current, documents: [...current.documents] };
  if (document) {
    const file = z.object({ name: z.string().min(1), uploadedAt: z.iso.datetime(), size: z.number().positive().max(2 * 1024 * 1024), mimeType: z.string(), dataUrl: z.string().regex(/^data:[^,]*;base64,[A-Za-z0-9+/=]+$/), scanStatus: z.literal('demo-passed') }).parse(document);
    const entry = { ...file, id: id ?? crypto.randomUUID() };
    next.documents = id ? current.documents.map((item) => item.id === id ? entry : item) : [...current.documents, entry];
    if (updateProfile) {
      // This prototype uses explicit, identity-scoped fixtures, not a real document parser.
      const samples = extractionSeed.profiles[email as keyof typeof extractionSeed.profiles];
      const extracted = samples?.cv;
      if (extracted) {
        if ('phone' in extracted && extracted.phone) next.phone = text.parse(extracted.phone);
        if ('education' in extracted) next.education = current.education.map((education) => {
          const patch = extracted.education.find((item) => item.institution === education.institution && item.qualification === education.qualification);
          if (!patch) return education;
          const updated = { ...education, ...patch, id: education.id };
          return profileEducationSchema.parse(updated);
        });
      }
    }
  } else next.documents = current.documents.filter((item) => item.id !== id);
  const result = profileShape.parse(next) as ApplicantEditableProfile;
  localStorage.setItem(profileStorageKey(email), JSON.stringify(result));
  return result;
}

export function saveProfilePhoto(email: string, name: string, photo: ProfilePhoto | null): ApplicantEditableProfile {
  const current = loadEditableApplicantProfile(email, name);
  const next = { ...current };
  if (photo) next.photo = profilePhotoSchema.parse(photo);
  else delete next.photo;
  localStorage.setItem(profileStorageKey(email), JSON.stringify(next));
  return next;
}
