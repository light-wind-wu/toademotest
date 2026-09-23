const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'lib/applicant-profile.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const compiledModule = { exports: {} };
function requireLocal(name) {
  if (!name.startsWith('@/')) return require(name);
  const target = path.join(root, name.slice(2));
  if (name.endsWith('.json')) return require(target);
  const child = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(`${target}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', output)(requireLocal, child, child.exports);
  return child.exports;
}
new Function('require', 'module', 'exports', compiled)(
  requireLocal, compiledModule, compiledModule.exports,
);
const api = compiledModule.exports;
const completeLanguage = (language = 'English') => ({ language, speaking: 'Advanced', reading: 'Intermediate', writing: 'Basic' });
test('Language modal saves, renames and removes only the selected record immediately', () => {
  const original = api.defaultApplicantProfile(email, 'Jenny Aw');
  api.saveEditableApplicantProfile(email, original);
  const english = completeLanguage();
  const malay = completeLanguage('Malay');
  api.saveProfileLanguage(email, 'Jenny Aw', english, null);
  api.saveProfileLanguage(email, 'Jenny Aw', malay, null);
  const renamed = { ...english, language: 'Tamil', writing: 'Advanced' };
  const updated = api.saveProfileLanguage(email, 'Jenny Aw', renamed, english);
  assert.deepEqual(updated.languages, [renamed, malay]);
  assert.deepEqual(updated.education, original.education);
  assert.deepEqual(api.loadEditableApplicantProfile(email, 'Jenny Aw').languages, [renamed, malay]);
  const removed = api.removeProfileLanguage(email, 'Jenny Aw', renamed);
  assert.deepEqual(removed.languages, [malay]);
  api.removeProfileLanguage(email, 'Jenny Aw', malay);
  assert.deepEqual(api.loadEditableApplicantProfile(email, 'Jenny Aw').languages, []);
});
test('Language modal rejects incomplete, duplicate and stale edits without changing storage', () => {
  const english = completeLanguage();
  const malay = completeLanguage('Malay');
  api.saveProfileLanguage(email, 'Jenny Aw', english, null);
  api.saveProfileLanguage(email, 'Jenny Aw', malay, null);
  const before = storage.get(api.profileStorageKey(email));
  for (const field of ['language', 'speaking', 'reading', 'writing']) {
    assert.throws(() => api.saveProfileLanguage(email, 'Jenny Aw', { ...english, [field]: '' }, english));
  }
  assert.throws(() => api.saveProfileLanguage(email, 'Jenny Aw', english, null));
  assert.throws(() => api.saveProfileLanguage(email, 'Jenny Aw', english, malay));
  assert.throws(() => api.saveProfileLanguage(email, 'Jenny Aw', english, { ...english, writing: 'Advanced' }));
  assert.throws(() => api.removeProfileLanguage(email, 'Jenny Aw', { ...english, writing: 'Advanced' }));
  assert.equal(storage.get(api.profileStorageKey(email)), before);
});
test('Language saves tolerate incomplete unrelated records without losing them', () => {
  const original = api.defaultApplicantProfile(email, 'Jenny Aw');
  original.phone = '';
  original.education = [api.newProfileEducation('incomplete')];
  original.languages = [{ language: 'Malay', speaking: '', reading: '', writing: '' }];
  storage.set(api.profileStorageKey(email), JSON.stringify(original));
  const next = api.saveProfileLanguage(email, 'Jenny Aw', completeLanguage(), null);
  assert.equal(next.phone, '');
  assert.deepEqual(next.education, original.education);
  assert.deepEqual(next.languages[0], original.languages[0]);
});
test('Language save and removal failures preserve original records', () => {
  const english = completeLanguage();
  api.saveProfileLanguage(email, 'Jenny Aw', english, null);
  const before = storage.get(api.profileStorageKey(email));
  const setItem = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('Storage full'); };
  try {
    assert.throws(() => api.saveProfileLanguage(email, 'Jenny Aw', { ...english, writing: 'Advanced' }, english));
    assert.throws(() => api.removeProfileLanguage(email, 'Jenny Aw', english));
    assert.equal(storage.get(api.profileStorageKey(email)), before);
  } finally { localStorage.setItem = setItem; }
});
for (const section of ['education', 'employment', 'testScores']) {
  test(`${section} deletion commits immediately and cannot remove an identically named record elsewhere`, () => {
    const original = api.defaultApplicantProfile(email, 'Jenny Aw');
    original.education = [{ ...api.newProfileEducation('same-id'), institution: 'Test University', country: 'Singapore' }];
    original.employment = [employment({ id: 'same-id' })];
    original.testScores = [{ ...api.newProfileTest('same-id'), testDate: '2025-09-14', score: '1450' }];
    original.languages = [completeLanguage()];
    api.saveEditableApplicantProfile(email, original);
    const next = api.removeProfileRecord(email, 'Jenny Aw', section, 'same-id');
    assert.deepEqual(next[section], []);
    for (const other of ['education', 'employment', 'testScores', 'languages'].filter((item) => item !== section)) assert.deepEqual(next[other], original[other]);
    assert.deepEqual(api.loadEditableApplicantProfile(email, 'Jenny Aw')[section], []);
    const before = storage.get(api.profileStorageKey(email));
    assert.throws(() => api.removeProfileRecord(email, 'Jenny Aw', section, 'same-id'));
    assert.equal(storage.get(api.profileStorageKey(email)), before);
  });
}
test('Record deletion works with incomplete profile fields and reports storage failure', () => {
  const original = api.defaultApplicantProfile(email, 'Jenny Aw');
  original.phone = '';
  original.testScores = [api.newProfileTest('incomplete')];
  storage.set(api.profileStorageKey(email), JSON.stringify(original));
  const before = storage.get(api.profileStorageKey(email));
  const setItem = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('Storage full'); };
  try {
    assert.throws(() => api.removeProfileRecord(email, 'Jenny Aw', 'testScores', 'incomplete'));
    assert.equal(storage.get(api.profileStorageKey(email)), before);
  } finally { localStorage.setItem = setItem; }
  assert.deepEqual(api.removeProfileRecord(email, 'Jenny Aw', 'testScores', 'incomplete').testScores, []);
});
test('Language proficiency defaults to zero rows; added rows are independent', () => {
  assert.deepEqual(api.defaultApplicantProfile(email, 'Jenny Aw').languages, []);
  const rows = [api.newProfileLanguage(), api.newProfileLanguage()];
  rows[0].language = 'English';
  assert.equal(rows[1].language, '');
  assert.ok(api.profileLanguagesSchema.safeParse([]).success);
  assert.equal(api.profileLanguagesSchema.safeParse([api.newProfileLanguage()]).success, false);
});
test('Selected languages require three proficiency values and reject duplicates', () => {
  assert.ok(api.profileLanguagesSchema.safeParse([completeLanguage()]).success);
  for (const field of ['speaking', 'reading', 'writing']) {
    const result = api.profileLanguagesSchema.safeParse([{ ...completeLanguage(), [field]: '' }]);
    assert.equal(result.success, false);
    assert.ok(result.error.issues.some((issue) => issue.path.join('.') === `0.${field}`));
  }
  for (const rows of [[completeLanguage(), completeLanguage()], [{ ...completeLanguage(), language: '' }], [{ ...completeLanguage(), speaking: 'Expert' }], [{ ...completeLanguage(), language: 'Not a language' }], Array.from({ length: 5 }, () => completeLanguage())]) {
    assert.equal(api.profileLanguagesSchema.safeParse(rows).success, false);
  }
});
test('Language proficiency persists independently of education, documents and email', () => {
  const profile = api.defaultApplicantProfile(email, 'Jenny Aw');
  profile.languages = [completeLanguage(), completeLanguage('Malay'), completeLanguage('Tamil'), completeLanguage('Mandarin')];
  api.saveEditableApplicantProfile(email, profile);
  const loaded = api.loadEditableApplicantProfile(email, 'Jenny Aw');
  assert.deepEqual(loaded.languages, profile.languages);
  assert.deepEqual(loaded.education, profile.education);
  assert.deepEqual(loaded.documents, profile.documents);
  assert.equal(loaded.email, profile.email);
  loaded.languages.splice(1, 1);
  api.saveEditableApplicantProfile(email, loaded);
  assert.deepEqual(api.loadEditableApplicantProfile(email, 'Jenny Aw').languages, loaded.languages);
});
test('Existing profiles default to zero language rows without rewriting stored data', () => {
  const original = api.defaultApplicantProfile(email, 'Jenny Aw');
  delete original.languages;
  const raw = JSON.stringify(original);
  storage.set(api.profileStorageKey(email), raw);
  assert.deepEqual(api.loadEditableApplicantProfile(email, 'Jenny Aw').languages, []);
  assert.equal(storage.get(api.profileStorageKey(email)), raw);
});
test('Old automatic blank language rows disappear, preserving all populated rows', () => {
  const profile = api.defaultApplicantProfile(email, 'Jenny Aw');
  profile.languages = [api.newProfileLanguage(), completeLanguage('Tamil'), api.newProfileLanguage(), completeLanguage()];
  const raw = JSON.stringify(profile);
  storage.set(api.profileStorageKey(email), raw);
  assert.deepEqual(api.loadEditableApplicantProfile(email, 'Jenny Aw').languages, [completeLanguage('Tamil'), completeLanguage()]);
  assert.equal(storage.get(api.profileStorageKey(email)), raw);
});
test('Language rows are no longer limited to four', () => {
  assert.ok(api.profileLanguagesSchema.safeParse(['English', 'Malay', 'Tamil', 'Mandarin', 'French'].map(completeLanguage)).success);
});

const employmentApi = requireLocal('@/lib/profile-employment');
test('Test score modal adds and edits only its record, preserving legacy values and other sections', () => {
  const original = api.defaultApplicantProfile(email, 'Jenny Aw');
  original.languages = [completeLanguage()];
  api.saveEditableApplicantProfile(email, original);
  const entry = { ...api.newProfileTest('modal-test'), testDate: '2025-09-14', score: '1450', version: 'legacy', maximumScore: '1600' };
  api.saveProfileTestScore(email, 'Jenny Aw', entry, true);
  api.saveProfileTestScore(email, 'Jenny Aw', { ...entry, id: 'second-test', exam: 'TOEFL', score: '118' }, true);
  const next = api.saveProfileTestScore(email, 'Jenny Aw', { ...entry, score: '1500' }, false);
  assert.deepEqual(next.testScores.map((item) => item.score), ['1500', '118']);
  assert.equal(next.testScores[0].version, 'legacy');
  assert.equal(next.testScores[0].maximumScore, '1600');
  assert.deepEqual(next.education, original.education);
  assert.deepEqual(next.languages, original.languages);
  assert.deepEqual(api.loadEditableApplicantProfile(email, 'Jenny Aw').testScores, next.testScores);
});
test('Test score modal rejects invalid, future and stale saves without changing storage', () => {
  const entry = { ...api.newProfileTest('modal-test'), testDate: '2025-09-14', score: '1450' };
  api.saveProfileTestScore(email, 'Jenny Aw', entry, true);
  const before = storage.get(api.profileStorageKey(email));
  for (const patch of [{ testDate: '' }, { score: '' }, { score: '-1' }, { testDate: '2999-01-01' }, { exam: 'Invalid' }]) {
    assert.throws(() => api.saveProfileTestScore(email, 'Jenny Aw', { ...entry, ...patch }, false));
  }
  assert.throws(() => api.saveProfileTestScore(email, 'Jenny Aw', entry, true));
  assert.throws(() => api.saveProfileTestScore(email, 'Jenny Aw', { ...entry, id: 'missing' }, false));
  assert.equal(storage.get(api.profileStorageKey(email)), before);
});
test('Test score modal tolerates incomplete unrelated fields and surfaces storage errors', () => {
  const original = api.defaultApplicantProfile(email, 'Jenny Aw');
  original.phone = '';
  original.education = [api.newProfileEducation('incomplete')];
  storage.set(api.profileStorageKey(email), JSON.stringify(original));
  const entry = { ...api.newProfileTest('modal-test'), testDate: '2025-09-14', score: '1450' };
  const next = api.saveProfileTestScore(email, 'Jenny Aw', entry, true);
  assert.equal(next.phone, '');
  assert.deepEqual(next.education, original.education);
  const before = storage.get(api.profileStorageKey(email));
  const setItem = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('Storage full'); };
  try {
    assert.throws(() => api.saveProfileTestScore(email, 'Jenny Aw', { ...entry, score: '1500' }, false));
    assert.equal(storage.get(api.profileStorageKey(email)), before);
  } finally { localStorage.setItem = setItem; }
});
test('Education modal adds and edits one record independently of other profile sections', () => {
  const original = api.defaultApplicantProfile(email, 'Jenny Aw');
  original.languages = [completeLanguage()];
  api.saveEditableApplicantProfile(email, original);
  const entry = { ...api.newProfileEducation('modal-education'), institution: 'Test University', country: 'Singapore' };
  const added = api.saveProfileEducation(email, 'Jenny Aw', entry, true);
  assert.equal(added.education.length, original.education.length + 1);
  const updated = api.saveProfileEducation(email, 'Jenny Aw', { ...entry, institution: 'Updated University' }, false);
  assert.equal(updated.education.at(-1).institution, 'Updated University');
  assert.deepEqual(updated.education.slice(0, -1), original.education);
  assert.deepEqual(updated.languages, original.languages);
  assert.deepEqual(updated.documents, original.documents);
  assert.equal(api.loadEditableApplicantProfile(email, 'Jenny Aw').education.at(-1).institution, 'Updated University');
});
test('Education modal rejects invalid and stale saves without overwriting stored data', () => {
  const entry = { ...api.newProfileEducation('modal-education'), institution: 'Test University', country: 'Singapore' };
  api.saveProfileEducation(email, 'Jenny Aw', entry, true);
  const before = storage.get(api.profileStorageKey(email));
  assert.throws(() => api.saveProfileEducation(email, 'Jenny Aw', { ...entry, institution: '' }, false));
  assert.throws(() => api.saveProfileEducation(email, 'Jenny Aw', { ...entry, startDate: '2026-01', expectedGraduation: '2025-01' }, false));
  assert.throws(() => api.saveProfileEducation(email, 'Jenny Aw', entry, true));
  assert.throws(() => api.saveProfileEducation(email, 'Jenny Aw', { ...entry, id: 'missing' }, false));
  assert.equal(storage.get(api.profileStorageKey(email)), before);
});
test('Education modal saves despite incomplete unrelated sections and preserves archived results', () => {
  const original = api.defaultApplicantProfile(email, 'Jenny Aw');
  original.phone = '';
  original.testScores = [api.newProfileTest('incomplete-test')];
  storage.set(api.profileStorageKey(email), JSON.stringify(original));
  const entry = { ...api.newProfileEducation('modal-education'), institution: 'Test University', country: 'Singapore', legacyQualificationDetails: { score: '4.5' } };
  const next = api.saveProfileEducation(email, 'Jenny Aw', entry, true);
  assert.equal(next.phone, '');
  assert.deepEqual(next.testScores, original.testScores);
  assert.deepEqual(next.education.at(-1).legacyQualificationDetails, entry.legacyQualificationDetails);
});
test('Education modal surfaces storage failures without saving the record', () => {
  const original = api.defaultApplicantProfile(email, 'Jenny Aw');
  api.saveEditableApplicantProfile(email, original);
  const before = storage.get(api.profileStorageKey(email));
  const setItem = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('Storage full'); };
  try {
    assert.throws(() => api.saveProfileEducation(email, 'Jenny Aw', { ...api.newProfileEducation('modal-education'), institution: 'Test University', country: 'Singapore' }, true));
    assert.equal(storage.get(api.profileStorageKey(email)), before);
  } finally { localStorage.setItem = setItem; }
});
const employment = (patch = {}) => ({ ...employmentApi.newProfileEmployment('role-1'), jobTitle: 'Senior Consultant', organization: 'NTT DATA', startMonth: 'September', startYear: '2021', ...patch });
test('Personal modal saves only personal fields and preserves locked identity fields', () => {
  const original = api.defaultApplicantProfile(email, 'Jenny Aw');
  original.languages = [completeLanguage()];
  api.saveEditableApplicantProfile(email, original);
  const draft = { ...original, fullName: 'Updated name', nric: 'INVALID', email: 'other@example.com', languages: [], education: [], employment: [employment()] };
  const next = api.saveProfilePersonal(email, 'Jenny Aw', draft);
  assert.equal(next.fullName, 'Updated name');
  assert.equal(next.nric, original.nric);
  assert.equal(next.email, original.email);
  assert.deepEqual(next.languages, original.languages);
  assert.deepEqual(next.education, original.education);
  assert.deepEqual(next.employment, []);
  assert.equal(api.loadEditableApplicantProfile(email, 'Jenny Aw').fullName, 'Updated name');
});
test('Personal modal validation failure does not change stored profile', () => {
  const original = api.defaultApplicantProfile(email, 'Jenny Aw');
  api.saveEditableApplicantProfile(email, original);
  const before = storage.get(api.profileStorageKey(email));
  assert.throws(() => api.saveProfilePersonal(email, 'Jenny Aw', { ...original, phone: '' }));
  assert.equal(storage.get(api.profileStorageKey(email)), before);
});
test('Employment modal adds and edits one record without changing other sections', () => {
  const original = api.defaultApplicantProfile(email, 'Jenny Aw');
  original.languages = [completeLanguage()];
  api.saveEditableApplicantProfile(email, original);
  api.saveProfileEmployment(email, 'Jenny Aw', employment(), true);
  api.saveProfileEmployment(email, 'Jenny Aw', employment({ id: 'role-2', jobTitle: 'Intern' }), true);
  const next = api.saveProfileEmployment(email, 'Jenny Aw', employment({ jobTitle: 'Updated role' }), false);
  assert.deepEqual(next.employment.map((entry) => entry.jobTitle), ['Updated role', 'Intern']);
  assert.deepEqual(next.education, original.education);
  assert.deepEqual(next.languages, original.languages);
  assert.equal(next.email, original.email);
});
test('Independent modal saves tolerate incomplete unrelated sections', () => {
  const original = api.defaultApplicantProfile(email, 'Jenny Aw');
  original.education = [api.newProfileEducation('incomplete')];
  storage.set(api.profileStorageKey(email), JSON.stringify(original));
  assert.equal(api.saveProfilePersonal(email, 'Jenny Aw', { ...original, fullName: 'Updated name' }).education[0].id, 'incomplete');
  assert.equal(api.saveProfileEmployment(email, 'Jenny Aw', employment(), true).education[0].id, 'incomplete');
});
test('Invalid or stale employment modal saves leave storage unchanged', () => {
  api.saveProfileEmployment(email, 'Jenny Aw', employment(), true);
  const before = storage.get(api.profileStorageKey(email));
  assert.throws(() => api.saveProfileEmployment(email, 'Jenny Aw', employment({ jobTitle: '' }), false));
  assert.throws(() => api.saveProfileEmployment(email, 'Jenny Aw', employment(), true));
  assert.throws(() => api.saveProfileEmployment(email, 'Jenny Aw', employment({ id: 'missing' }), false));
  assert.equal(storage.get(api.profileStorageKey(email)), before);
});
test('Both modal saves report storage failures without changing saved data', () => {
  const original = api.defaultApplicantProfile(email, 'Jenny Aw');
  api.saveEditableApplicantProfile(email, original);
  const before = storage.get(api.profileStorageKey(email));
  const setItem = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('Storage full'); };
  try {
    assert.throws(() => api.saveProfilePersonal(email, 'Jenny Aw', { ...original, fullName: 'Not saved' }));
    assert.throws(() => api.saveProfileEmployment(email, 'Jenny Aw', employment(), true));
    assert.equal(storage.get(api.profileStorageKey(email)), before);
  } finally { localStorage.setItem = setItem; }
});
test('Employment requires title and start year, leaving other screenshot fields optional', () => {
  assert.ok(employmentApi.profileEmploymentSchema.safeParse(employment({ organization: '', startMonth: '' })).success);
  for (const patch of [{ jobTitle: ' ' }, { startYear: '' }, { startYear: '202x' }, { startMonth: 'Not a month' }, { locationType: 'Unknown' }, { employmentType: 'Unknown' }]) {
    assert.equal(employmentApi.profileEmploymentSchema.safeParse(employment(patch)).success, false);
  }
});
test('Employment dates reject reversed and future dates; completed jobs require an end year', () => {
  for (const patch of [{ startYear: '2099' }, { current: false }, { current: false, endYear: '2020' }, { current: false, endYear: '2021', endMonth: 'August' }, { current: false, endYear: '2099' }]) {
    assert.equal(employmentApi.profileEmploymentSchema.safeParse(employment(patch)).success, false);
  }
  assert.ok(employmentApi.profileEmploymentSchema.safeParse(employment({ current: false, endYear: '2021', endMonth: 'September' })).success);
  assert.ok(employmentApi.profileEmploymentSchema.safeParse(employment({ current: false, startMonth: '', endYear: '2021', endMonth: 'January' })).success);
});
test('Current employment clears obsolete end dates without changing the editor draft', () => {
  const draft = employment({ endYear: '2024', endMonth: 'May' });
  const parsed = employmentApi.profileEmploymentSchema.parse(draft);
  assert.equal(parsed.endYear, ''); assert.equal(parsed.endMonth, '');
  assert.equal(draft.endYear, '2024');
});
test('Highlights and skills have bounded lengths and reject duplicate skills', () => {
  assert.ok(employmentApi.profileEmploymentSchema.safeParse(employment({ highlights: 'a'.repeat(2000), skills: ['Product Design', 'Digital Marketing'] })).success);
  for (const patch of [{ highlights: 'a'.repeat(2001) }, { skills: ['Design', 'design'] }, { skills: [' '] }, { skills: ['a'.repeat(81)] }, { skills: Array.from({ length: 21 }, (_, i) => `Skill ${i}`) }]) {
    assert.equal(employmentApi.profileEmploymentSchema.safeParse(employment(patch)).success, false);
  }
});
test('Employment cards show inclusive duration only when months are known', () => {
  assert.equal(employmentApi.employmentPeriod(employment(), new Date(2026, 8, 23)), 'Sep 2021 – Present · 5 yrs 1 mo');
  assert.equal(employmentApi.employmentPeriod(employment({ current: false, endMonth: 'September', endYear: '2021' })), 'Sep 2021 – Sep 2021 · 1 mo');
  assert.equal(employmentApi.employmentPeriod(employment({ startMonth: '' })), '2021 – Present');
});
test('Multiple employment records survive edit, save, reload and deletion without changing other sections', () => {
  const profile = api.defaultApplicantProfile(email, 'Jenny Aw');
  profile.employment = [employment(), employment({ id: 'role-2', jobTitle: 'Intern', current: false, startYear: '2019', endYear: '2020' })];
  const saved = api.saveEditableApplicantProfile(email, profile);
  const loaded = api.loadEditableApplicantProfile(email, 'Jenny Aw');
  assert.deepEqual(loaded.employment, saved.employment);
  assert.deepEqual(loaded.education, profile.education);
  assert.deepEqual(loaded.languages, profile.languages);
  loaded.employment[0].jobTitle = 'Lead Consultant';
  loaded.employment.splice(1, 1);
  api.saveEditableApplicantProfile(email, loaded);
  assert.equal(api.loadEditableApplicantProfile(email, 'Jenny Aw').employment.length, 1);
  assert.equal(api.loadEditableApplicantProfile(email, 'Jenny Aw').employment[0].jobTitle, 'Lead Consultant');
});
test('Old profiles load with no employment; invalid employment saves leave storage unchanged', () => {
  const profile = api.defaultApplicantProfile(email, 'Jenny Aw');
  delete profile.employment;
  const raw = JSON.stringify(profile);
  storage.set(api.profileStorageKey(email), raw);
  const loaded = api.loadEditableApplicantProfile(email, 'Jenny Aw');
  assert.deepEqual(loaded.employment, []);
  loaded.employment.push(employment({ jobTitle: '' }));
  assert.throws(() => api.saveEditableApplicantProfile(email, loaded));
  assert.equal(storage.get(api.profileStorageKey(email)), raw);
});
const email = 'jenny.aw@u.nus.edu';
let storage;
beforeEach(() => {
  storage = new Map();
  global.localStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
});

function education(qualification = 'Undergraduate', status = 'Currently studying') {
  return {
    ...api.newProfileEducation('education-test'), qualification, status,
    institution: 'Test institution', country: 'Singapore', currentYear: 'Year 3', course: 'Computer Science',
    major: 'Computing', secondMajor: 'Physics', minor: 'Art',
    startDate: '2023-01', expectedGraduation: '2028-05', endDate: '2026-06',
  };
}

for (const qualification of api.PROFILE_QUALIFICATIONS) {
  for (const status of api.PROFILE_STUDY_STATUSES) {
    test(`${qualification} / ${status}: basic history needs no assessment data`, () => {
      const parsed = api.profileEducationSchema.parse(education(qualification, status));
      if (status !== 'Currently studying') { assert.equal(parsed.currentYear, ''); assert.equal(parsed.expectedGraduation, ''); }
      else assert.equal(parsed.endDate, '');
      if (!api.hasProfileProgramme(qualification)) assert.equal(parsed.course, '');
      if (qualification !== 'Undergraduate') {
        assert.equal(parsed.major, ''); assert.equal(parsed.secondMajor, ''); assert.equal(parsed.minor, '');
      }
      for (const field of ['subjects', 'score', 'scoringSystem', 'resultsStatus', 'examinationYear', 'resultType']) assert.equal(field in parsed, false);
    });
  }
}

test('Only education level, institution and country are required from the user', () => {
  const value = { ...api.newProfileEducation('minimal'), institution: 'School', country: 'Singapore' };
  assert.ok(api.profileEducationSchema.safeParse(value).success);
  for (const field of ['institution', 'country', 'qualification']) {
    assert.equal(api.profileEducationSchema.safeParse({ ...value, [field]: '  ' }).success, false);
  }
});
test('Month validation and chronology cover studying, completed and discontinued records', () => {
  for (const status of api.PROFILE_STUDY_STATUSES) {
    const endField = status === 'Currently studying' ? 'expectedGraduation' : 'endDate';
    for (const patch of [{ startDate: '2029-01' }, { [endField]: '2028-13' }, { startDate: '2020-00' }, { [endField]: '2028-02-01' }]) {
      assert.equal(api.profileEducationSchema.safeParse({ ...education('Undergraduate', status), ...patch }).success, false);
    }
    assert.ok(api.profileEducationSchema.safeParse({ ...education('Undergraduate', status), startDate: '', [endField]: '' }).success);
  }
});
test('Switching levels clears inactive fields only on save, without mutating the draft', () => {
  const draft = education('A-level');
  const result = api.profileEducationSchema.parse(draft);
  assert.equal(result.course, ''); assert.equal(result.major, ''); assert.equal(result.secondMajor, ''); assert.equal(result.minor, '');
  assert.equal(draft.minor, 'Art');
});
test('Existing assessment details are archived, not validated, displayed or lost on save', () => {
  const legacy = { ...education(), secondCourse: 'Mathematics', score: 'invalid old score', scoringSystem: 'GPA', examinationYear: '2022', subjects: [{ id: 's', name: 'Math', grade: 'A' }] };
  delete legacy.secondMajor;
  const raw = { ...api.defaultApplicantProfile(email, 'Jenny Aw'), education: [legacy] };
  storage.set(api.profileStorageKey(email), JSON.stringify(raw));
  const loaded = api.loadEditableApplicantProfile(email, 'Jenny Aw');
  assert.equal(loaded.education[0].secondMajor, 'Mathematics');
  assert.equal(loaded.education[0].score, undefined);
  assert.equal(loaded.education[0].legacyQualificationDetails.score, 'invalid old score');
  assert.deepEqual(JSON.parse(storage.get(api.profileStorageKey(email))), raw);
  const saved = api.saveEditableApplicantProfile(email, loaded);
  assert.deepEqual(api.loadEditableApplicantProfile(email, 'Jenny Aw'), saved);
  assert.deepEqual(saved.education[0].legacyQualificationDetails.subjects, legacy.subjects);
});
test('Other qualification names migrate into programme without adding programme to school qualifications', () => {
  const other = api.profileEducationSchema.parse({ ...education('Other Qualification'), course: '', qualificationName: 'Professional certificate' });
  assert.equal(other.course, 'Professional certificate');
  assert.equal(api.profileEducationSchema.parse({ ...education('NUS High'), qualificationName: 'Diploma' }).course, '');
});

const application = requireLocal('@/lib/apply-application');
const freshDraft = () => ({ education: { institution: '', course: '', yearOfStudy: '', gpa: '', expectedGraduation: '' }, educationManual: false, transcriptName: '', cvName: '', profileEducationPrefillPending: true });
test('New application prefills matching basic education without assessment data or an invented graduation day', () => {
  const draft = freshDraft();
  const source = education();
  const result = application.prefillNewApplyDraft(draft, [source], 'undergraduate');
  assert.deepEqual(result.education, { institution: source.institution, course: source.course, yearOfStudy: source.currentYear, gpa: '', expectedGraduation: '' });
  assert.equal(result.profileEducationPrefillPending, false);
  assert.equal(result.educationManual, true);
  assert.deepEqual(draft, freshDraft());
  assert.deepEqual(source, education());
});
test('Prefill prefers current, most recent study of the matching level and excludes discontinued education', () => {
  const entries = [
    { ...education('Undergraduate', 'Completed'), institution: 'Completed', startDate: '2026-01' },
    { ...education(), institution: 'Older', startDate: '2022-01' },
    { ...education(), institution: 'Current', startDate: '2024-01' },
    { ...education('Undergraduate', 'Discontinued'), institution: 'Stopped', startDate: '2025-01' },
    { ...education('Polytechnic'), institution: 'Poly' },
  ];
  for (const variant of ['undergraduate', 'tech-up']) assert.equal(application.prefillNewApplyDraft(freshDraft(), entries, variant).education.institution, 'Current');
  assert.equal(application.prefillNewApplyDraft(freshDraft(), entries, 'polytechnic').education.institution, 'Poly');
  assert.equal(application.prefillNewApplyDraft(freshDraft(), [entries[0]], 'undergraduate').education.yearOfStudy, 'Graduate');
  assert.equal(application.prefillNewApplyDraft(freshDraft(), [entries[3]], 'undergraduate').education.institution, '');
});
test('Existing or manually edited application drafts are never overwritten or repeatedly prefilled', () => {
  for (const patch of [{ profileEducationPrefillPending: undefined }, { educationManual: true }, { transcriptName: 'my.pdf' }, { education: { ...freshDraft().education, gpa: '4' } }]) {
    const draft = { ...freshDraft(), ...patch };
    assert.deepEqual(application.prefillNewApplyDraft(draft, [education()], 'undergraduate').education, draft.education);
  }
  const first = application.prefillNewApplyDraft(freshDraft(), [education()], 'undergraduate');
  const next = application.prefillNewApplyDraft(first, [{ ...education(), institution: 'Changed later' }], 'undergraduate');
  assert.equal(next, first);
});
test('Fresh draft eligibility is explicit; loading an existing blank draft does not opt it into prefill', () => {
  global.window = {};
  try {
    assert.equal(application.loadApplyDraft().profileEducationPrefillPending, true);
    storage.set(application.APPLY_DRAFT_KEY, JSON.stringify({ education: freshDraft().education }));
    assert.equal(application.loadApplyDraft().profileEducationPrefillPending, undefined);
    assert.equal(application.seedApplyDraftForVariant('polytechnic').profileEducationPrefillPending, true);
    storage.set(application.APPLY_DRAFT_KEY, 'broken json');
    assert.equal(application.loadApplyDraft().profileEducationPrefillPending, undefined);
  } finally { delete global.window; }
});

test('All five additional exams validate dates and scores', () => {
  for (const exam of api.PROFILE_EXAMS) {
    const value = { ...api.newProfileTest('test'), exam, testDate: '2026-01-01', score: '7', maximumScore: '9' };
    assert.equal(api.profileTestSchema.safeParse(value).success, true);
    for (const patch of [{ testDate: '2099-01-01' }, { testDate: '2026-02-30' }, { score: '-1' }, { score: 'NaN' }, { score: '' }]) {
      assert.equal(api.profileTestSchema.safeParse({ ...value, ...patch }).success, false);
    }
  }
});
test('Removed maximum score does not block saving new or legacy test records', () => {
  for (const maximumScore of [undefined, '', '0', '5', 'not recorded']) {
    const profile = api.defaultApplicantProfile(email, 'Jenny Aw');
    profile.testScores = [{ ...api.newProfileTest('exam1'), testDate: '2026-01-01', score: '7', maximumScore }];
    api.saveEditableApplicantProfile(email, profile);
    const restored = api.loadEditableApplicantProfile(email, 'Jenny Aw').testScores[0];
    assert.equal(restored.score, '7');
    assert.equal(restored.maximumScore, maximumScore ?? '');
  }
});
test('Multiple education and exam records survive saving and reloading', () => {
  const profile = api.defaultApplicantProfile(email, 'Jenny Aw');
  profile.education = [education(), { ...education('O-level', 'Completed'), id: 'school' }];
  profile.testScores = [{ ...api.newProfileTest('exam1'), testDate: '2026-01-01', score: '1500' }];
  api.saveEditableApplicantProfile(email, profile);
  const restored = api.loadEditableApplicantProfile(email, 'Jenny Aw');
  assert.equal(restored.education.length, 2); assert.equal(restored.testScores[0].score, '1500');
  restored.education = restored.education.slice(0, 1);
  api.saveEditableApplicantProfile(email, restored);
  assert.equal(api.loadEditableApplicantProfile(email, 'Jenny Aw').education.length, 1);
});
test('Submitted applications and existing drafts are never modified by profile writes', () => {
  for (const key of ['dsta_applicant_application_records', 'dsta_my_applications', 'dsta_apply_session_draft', 'dsta_applicant_profile']) storage.set(key, '{"original":true}');
  const before = new Map(storage);
  api.saveEditableApplicantProfile(email, api.defaultApplicantProfile(email, 'Jenny Aw'));
  for (const [key, value] of before) assert.equal(storage.get(key), value);
  assert.equal(storage.size, before.size + 1);
});
test('Legacy profile and document metadata migrate without fabricating a graduation month', () => {
  const old = { fullName: 'Jenny', email, phone: '91234567', nationality: 'Singapore Citizen', institution: 'Legacy college', course: 'Engineering', yearOfStudy: 'Year 2', graduationYear: '2028', cgpa: '4.1 / 5', documents: { cv: { name: 'original.pdf', uploadedAt: '2026-01-01' } }, extraField: 'preserve' };
  storage.set(api.profileStorageKey(email), JSON.stringify(old));
  const migrated = api.loadEditableApplicantProfile(email, 'Jenny Aw');
  assert.equal(migrated.education[0].legacyGraduationYear, '2028');
  assert.equal(migrated.education[0].expectedGraduation, '');
  assert.equal(migrated.education[0].legacyQualificationDetails.score, '4.1');
  assert.equal(migrated.documents[0].name, 'original.pdf');
  assert.equal(migrated.extraField, 'preserve');
  assert.deepEqual(JSON.parse(storage.get(api.profileStorageKey(email))), old);
});
test('Identity separation: never bootstrap from another applicant or leak into another account', () => {
  storage.set('dsta_applicant_profile', JSON.stringify({ email: 'other@example.test', name: 'Other', mobile: '123', nationality: 'Other' }));
  storage.set('dsta_my_applications', JSON.stringify([{ formValues: { name: 'Other', name_of_institution: 'Private college' } }]));
  const profile = api.loadEditableApplicantProfile(email, 'Jenny Aw');
  assert.equal(profile.fullName, 'Jenny Aw');
  assert.notEqual(profile.education[0].institution, 'Private college');
  assert.throws(() => api.saveEditableApplicantProfile('other@example.test', profile));
  assert.equal(api.defaultApplicantProfile('other@example.test', 'Other').education.length, 0);
});
test('Invalid or unavailable storage does not silently replace saved data', () => {
  storage.set(api.profileStorageKey(email), 'broken json');
  assert.throws(() => api.loadEditableApplicantProfile(email, 'Jenny'));
  assert.equal(storage.get(api.profileStorageKey(email)), 'broken json');
  localStorage.setItem = () => { throw new Error('Quota exceeded'); };
  assert.throws(() => api.saveEditableApplicantProfile(email, api.defaultApplicantProfile(email, 'Jenny')));
});
test('Optional education and additional tests do not force an entire education history', () => {
  const profile = { ...api.defaultApplicantProfile(email, 'Jenny'), education: [], testScores: [] };
  assert.equal(api.applicantProfileSchema.safeParse(profile).success, true);
});

const fileModule = { exports: {} };
new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(path.join(root, 'lib/profile-document-files.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true },
}).outputText)(require, fileModule, fileModule.exports);
const files = fileModule.exports;
const document = () => ({ name: 'sample.pdf', uploadedAt: '2026-09-22T01:00:00.000Z', size: 5, mimeType: 'application/pdf', dataUrl: 'data:application/pdf;base64,aGVsbG8=', scanStatus: 'demo-passed' });

test('File validation accepts supported extensions and rejects empty, oversized and unsupported files', () => {
  for (const extension of ['pdf', 'PDF', 'doc', 'docx', 'png', 'jpg', 'jpeg']) assert.ok(files.profileFileSchema.safeParse({ name: `sample.${extension}`, size: 10 }).success);
  for (const value of [{ name: 'file.exe', size: 10 }, { name: 'file.pdf', size: 0 }, { name: 'file.pdf', size: 2 * 1024 * 1024 + 1 }]) assert.equal(files.profileFileSchema.safeParse(value).success, false);
});
test('Upload-only persists actual file bytes and leaves profile fields unchanged', () => {
  const before = api.defaultApplicantProfile(email, 'Jenny Aw');
  api.saveEditableApplicantProfile(email, before);
  const after = api.saveProfileDocument(email, 'Jenny Aw', null, document());
  assert.deepEqual({ ...after, documents: {} }, { ...before, documents: {} });
  assert.equal(api.loadEditableApplicantProfile(email, 'Jenny Aw').documents[0].dataUrl, document().dataUrl);
});
test('Simulated extraction updates matching fields while preserving other records and submitted applications', () => {
  const before = api.defaultApplicantProfile(email, 'Jenny Aw');
  before.phone = 'unchanged'; before.education[0].minor = 'Economics'; before.education.push(education());
  api.saveEditableApplicantProfile(email, before);
  storage.set('dsta_applicant_application_records', '{"original":true}');
  const after = api.saveProfileDocument(email, 'Jenny Aw', null, document(), true);
  assert.equal(after.education[0].score, undefined); assert.equal(after.education[0].minor, 'Mathematics');
  assert.equal(after.phone, '+65 9123 4567'); assert.deepEqual(after.education[1], api.profileEducationSchema.parse(before.education[1]));
  assert.equal(storage.get('dsta_applicant_application_records'), '{"original":true}');
});
test('Extraction fixtures are identity-scoped and never copy Jenny into another profile', () => {
  const other = 'test@example.test';
  const result = api.saveProfileDocument(other, 'Test', null, document(), true);
  assert.equal(result.fullName, 'Test'); assert.equal(result.phone, ''); assert.deepEqual(result.education, []);
});
test('Replacement storage failure preserves both the original file and profile', () => {
  const saved = api.saveProfileDocument(email, 'Jenny Aw', null, document());
  const original = storage.get(api.profileStorageKey(email));
  localStorage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => api.saveProfileDocument(email, 'Jenny Aw', saved.documents[0].id, { ...document(), name: 'new.pdf' }, true));
  assert.equal(storage.get(api.profileStorageKey(email)), original);
});
test('Unscanned or invalid file data cannot replace an existing document', () => {
  const saved = api.saveProfileDocument(email, 'Jenny Aw', null, document());
  const original = storage.get(api.profileStorageKey(email));
  for (const patch of [{ scanStatus: 'failed' }, { scanStatus: undefined }, { dataUrl: 'javascript:alert(1)' }, { size: 0 }]) {
    assert.throws(() => api.saveProfileDocument(email, 'Jenny Aw', saved.documents[0].id, { ...document(), ...patch }, true));
    assert.equal(storage.get(api.profileStorageKey(email)), original);
  }
});
test('Invalid extracted profile fails without replacing the original file', () => {
  const old = api.defaultApplicantProfile(email, 'Jenny Aw'); old.education[0].startDate = '2030-01';
  storage.set(api.profileStorageKey(email), JSON.stringify(old));
  const original = storage.get(api.profileStorageKey(email));
  assert.throws(() => api.saveProfileDocument(email, 'Jenny Aw', null, document(), true));
  assert.equal(storage.get(api.profileStorageKey(email)), original);
});
test('Delete removes only the selected attachment, retaining profile data and other attachments', () => {
  api.saveProfileDocument(email, 'Jenny Aw', null, document(), true);
  const before = api.saveProfileDocument(email, 'Jenny Aw', null, document());
  const after = api.saveProfileDocument(email, 'Jenny Aw', before.documents[0].id, null);
  assert.equal(after.documents.length, 1); assert.deepEqual(after.documents[0], before.documents[1]);
  assert.deepEqual(after.education, before.education); assert.equal(after.phone, before.phone);
});
test('Document-only changes can be saved independently of incomplete legacy education', () => {
  storage.set(api.profileStorageKey(email), JSON.stringify({ email, institution: 'Legacy college', documents: {} }));
  const result = api.saveProfileDocument(email, 'Jenny Aw', null, document());
  assert.equal(result.education[0].institution, 'Legacy college'); assert.equal(result.education[0].expectedGraduation, '');
  assert.ok(result.documents[0].dataUrl);
});
test('Download produces the original bytes and filename, and refuses metadata-only files', async () => {
  let blob, clicked = false;
  const originalCreate = URL.createObjectURL, originalRevoke = URL.revokeObjectURL;
  const anchor = { click() { clicked = true; }, remove() {} };
  global.window = { document: { createElement: () => anchor, body: { appendChild() {} } } };
  URL.createObjectURL = (value) => { blob = value; return 'blob:test'; };
  URL.revokeObjectURL = () => {};
  try {
    files.downloadProfileFile(document());
    assert.equal(anchor.download, 'sample.pdf'); assert.equal(clicked, true); assert.equal(await blob.text(), 'hello');
    assert.throws(() => files.downloadProfileFile({ name: 'old.pdf', uploadedAt: '' }));
  } finally { URL.createObjectURL = originalCreate; URL.revokeObjectURL = originalRevoke; delete global.window; }
});

test('Legacy category attachments migrate into an ordered list without changing stored bytes', () => {
  const original = { ...api.defaultApplicantProfile(email, 'Jenny Aw'), documents: { cv: { ...document(), uploadedAt: '2026-09-20T00:00:00.000Z' }, transcript: { ...document(), uploadedAt: '2026-09-19T00:00:00.000Z' } } };
  storage.set(api.profileStorageKey(email), JSON.stringify(original));
  const migrated = api.loadEditableApplicantProfile(email, 'Jenny Aw');
  assert.deepEqual(migrated.documents.map((item) => item.id), ['legacy-transcript', 'legacy-cv']);
  assert.ok(migrated.documents.every((item) => item.dataUrl === document().dataUrl));
  assert.deepEqual(JSON.parse(storage.get(api.profileStorageKey(email))), original);
});
test('Same-name files append; replacement retains identity and list position', () => {
  api.saveProfileDocument(email, 'Jenny Aw', null, document());
  const before = api.saveProfileDocument(email, 'Jenny Aw', null, document());
  assert.equal(before.documents.length, 2); assert.notEqual(before.documents[0].id, before.documents[1].id);
  const result = api.saveProfileDocument(email, 'Jenny Aw', before.documents[0].id, { ...document(), name: 'replacement.pdf' });
  assert.deepEqual(result.documents.map((item) => item.id), before.documents.map((item) => item.id));
  assert.equal(result.documents[0].name, 'replacement.pdf'); assert.equal(result.documents[1].name, 'sample.pdf');
});
test('Missing replacement and delete targets never create or remove a different document', () => {
  api.saveProfileDocument(email, 'Jenny Aw', null, document());
  const before = storage.get(api.profileStorageKey(email));
  assert.throws(() => api.saveProfileDocument(email, 'Jenny Aw', 'missing', document()));
  assert.throws(() => api.saveProfileDocument(email, 'Jenny Aw', 'missing', null));
  assert.equal(storage.get(api.profileStorageKey(email)), before);
});
test('Photo save and removal are independent of documents, application records and profile fields', () => {
  const before = api.saveProfileDocument(email, 'Jenny Aw', null, document());
  const photo = { dataUrl: 'data:image/jpeg;base64,aGVsbG8=', updatedAt: '2026-09-22T00:00:00.000Z' };
  storage.set('dsta_applicant_application_records', 'original');
  const saved = api.saveProfilePhoto(email, 'Jenny Aw', photo);
  assert.deepEqual(saved, { ...before, photo });
  const removed = api.saveProfilePhoto(email, 'Jenny Aw', null);
  assert.deepEqual(removed, before);
  assert.equal(storage.get('dsta_applicant_application_records'), 'original');
});
test('Failed and invalid photo replacements preserve the previous profile', () => {
  const photo = { dataUrl: 'data:image/png;base64,aGVsbG8=', updatedAt: '2026-09-22T00:00:00.000Z' };
  api.saveProfilePhoto(email, 'Jenny Aw', photo);
  const before = storage.get(api.profileStorageKey(email));
  for (const dataUrl of ['https://example.test/photo.png', 'data:image/svg+xml;base64,aGVsbG8=', 'data:image/jpeg;base64,']) assert.throws(() => api.saveProfilePhoto(email, 'Jenny Aw', { ...photo, dataUrl }));
  localStorage.setItem = () => { throw new Error('Quota'); };
  assert.throws(() => api.saveProfilePhoto(email, 'Jenny Aw', null));
  assert.equal(storage.get(api.profileStorageKey(email)), before);
});

test('Restored personal fields survive save and reload', () => {
  const profile = api.defaultApplicantProfile(email, 'Jenny Aw');
  Object.assign(profile, { nric: 'T0123456A', countryOfBirth: 'Malaysia', dateOfBirth: '2002-03-15', sex: 'Male', residentialStatus: 'Permanent Resident', registeredAddress: 'Test address' });
  api.saveEditableApplicantProfile(email, profile);
  const after = api.loadEditableApplicantProfile(email, 'Jenny Aw');
  for (const field of ['nric', 'countryOfBirth', 'dateOfBirth', 'sex', 'residentialStatus', 'registeredAddress']) assert.equal(after[field], profile[field]);
});
test('Sex options use the requested order and preserve all four values', () => {
  assert.deepEqual(api.PROFILE_SEX_OPTIONS, ['Male', 'Female', 'Undisclosed', 'Others']);
  for (const sex of api.PROFILE_SEX_OPTIONS) {
    const profile = { ...api.defaultApplicantProfile(email, 'Jenny Aw'), sex };
    api.saveEditableApplicantProfile(email, profile);
    assert.equal(api.loadEditableApplicantProfile(email, 'Jenny Aw').sex, sex);
  }
  assert.equal(api.applicantProfileSchema.safeParse({ ...api.defaultApplicantProfile(email, 'Jenny Aw'), sex: 'Unknown' }).success, false);
});
test('Legacy sex values map to the new labels without changing storage on read', () => {
  for (const [previous, next] of [['Other', 'Others'], ['Prefer not to say', 'Undisclosed']]) {
    const raw = JSON.stringify({ ...api.defaultApplicantProfile(email, 'Jenny Aw'), sex: previous });
    storage.set(api.profileStorageKey(email), raw);
    assert.equal(api.loadEditableApplicantProfile(email, 'Jenny Aw').sex, next);
    assert.equal(storage.get(api.profileStorageKey(email)), raw);
    storage.delete(api.profileStorageKey(email));
    storage.set('dsta_applicant_profile', JSON.stringify({ email, sex: previous }));
    assert.equal(api.loadEditableApplicantProfile(email, 'Jenny Aw').sex, next);
  }
});
test('Required NRIC and birth date fields retain format validation', () => {
  const profile = api.defaultApplicantProfile(email, 'Jenny Aw');
  for (const patch of [{ nric: 'invalid' }, { dateOfBirth: '2003-02-30' }, { dateOfBirth: '2099-01-01' }]) assert.equal(api.applicantProfileSchema.safeParse({ ...profile, ...patch }).success, false);
  assert.equal(api.applicantProfileSchema.safeParse({ ...profile, nric: '', dateOfBirth: '' }).success, false);
});
test('Every personal information field rejects empty or whitespace values without changing storage', () => {
  const profile = api.defaultApplicantProfile(email, 'Jenny Aw');
  api.saveEditableApplicantProfile(email, profile);
  const original = storage.get(api.profileStorageKey(email));
  for (const field of ['fullName', 'nric', 'nationality', 'countryOfBirth', 'dateOfBirth', 'sex', 'phone', 'email', 'residentialStatus', 'registeredAddress']) {
    for (const value of ['', '   ']) {
      const invalid = { ...profile, [field]: value };
      const result = api.applicantProfileSchema.safeParse(invalid);
      assert.equal(result.success, false, field);
      assert.ok(result.error.issues.some((issue) => issue.path[0] === field), field);
      assert.throws(() => api.saveEditableApplicantProfile(email, invalid));
      assert.equal(storage.get(api.profileStorageKey(email)), original);
    }
  }
});
test('Incomplete legacy personal information can still load without overwriting saved data', () => {
  const profile = { ...api.defaultApplicantProfile(email, 'Jenny Aw'), phone: '', countryOfBirth: '', residentialStatus: '' };
  const original = JSON.stringify(profile);
  storage.set(api.profileStorageKey(email), original);
  const loaded = api.loadEditableApplicantProfile(email, 'Jenny Aw');
  assert.equal(loaded.phone, '');
  assert.equal(loaded.countryOfBirth, '');
  assert.equal(loaded.residentialStatus, '');
  assert.equal(storage.get(api.profileStorageKey(email)), original);
  assert.equal(api.applicantProfileSchema.safeParse(loaded).success, false);
});
test('Only missing new fields are restored from the same identity and legacy dates are normalized', () => {
  const profile = api.defaultApplicantProfile(email, 'Jenny Aw');
  delete profile.dateOfBirth; delete profile.registeredAddress;
  profile.countryOfBirth = ''; profile.nric = 'T0123456A';
  storage.set(api.profileStorageKey(email), JSON.stringify(profile));
  storage.set('dsta_applicant_profile', JSON.stringify({ email, dateOfBirth: '15 Mar 2002', registeredAddress: 'Same identity address', nric: 'S1234567A', countryOfBirth: 'Singapore' }));
  const restored = api.loadEditableApplicantProfile(email, 'Jenny Aw');
  assert.equal(restored.dateOfBirth, '2002-03-15'); assert.equal(restored.registeredAddress, 'Same identity address');
  assert.equal(restored.countryOfBirth, ''); assert.equal(restored.nric, 'T0123456A');
  assert.deepEqual(JSON.parse(storage.get(api.profileStorageKey(email))), profile);
});
test('Missing personal fields never use another account and invalid saved objects are not reset', () => {
  storage.set('dsta_applicant_profile', JSON.stringify({ email, nric: 'S1234567A', countryOfBirth: 'Singapore' }));
  const other = api.loadEditableApplicantProfile('other@example.test', 'Other');
  assert.equal(other.nric, ''); assert.equal(other.countryOfBirth, '');
  for (const raw of ['null', 'false', '42']) {
    storage.set(api.profileStorageKey(email), raw);
    assert.throws(() => api.loadEditableApplicantProfile(email, 'Jenny Aw'));
    assert.equal(storage.get(api.profileStorageKey(email)), raw);
  }
});
