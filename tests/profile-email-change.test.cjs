const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(name) {
  if (!name.startsWith('@/')) return require(name);
  const target = path.join(root, name.slice(2));
  if (name.endsWith('.json')) return require(target);
  const module = { exports: {} };
  const compiled = ts.transpileModule(fs.readFileSync(`${target}.ts`, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  new Function('require', 'module', 'exports', compiled)(load, module, module.exports);
  return module.exports;
}
const { DemoProfileEmailChange, maskProfileEmail } = load('@/lib/profile-email-change');
const api = load('@/lib/applicant-profile');
const email = 'jenny.aw@u.nus.edu';
const nextEmail = 'jenny.new@example.test';
let storage, now, sequence;
beforeEach(() => {
  storage = new Map(); now = 1000000; sequence = 100000;
  global.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
});
const session = () => new DemoProfileEmailChange(email, 'Jenny Aw', email, () => now, () => String(++sequence));
function verifyCurrent(flow) { const challenge = flow.sendCurrent(); flow.verifyCurrent(challenge.code); }

test('both verifications are required; incomplete flows do not persist changes', () => {
  const flow = session();
  assert.throws(() => flow.sendNew(nextEmail), /verification has expired/);
  assert.throws(() => flow.confirm('123456'), /verification has expired/);
  verifyCurrent(flow);
  const challenge = flow.sendNew(nextEmail);
  assert.throws(() => flow.confirm('999999'), /Incorrect code/);
  assert.equal(storage.size, 0);
  assert.equal(api.loadEditableApplicantProfile(email, 'Jenny Aw').email, email);
  assert.equal(flow.confirm(challenge.code).email, nextEmail);
  assert.throws(() => flow.confirm(challenge.code), /complete/);
});

test('changed contact email keeps stable account key, documents and education', () => {
  let before = api.defaultApplicantProfile(email, 'Jenny Aw');
  before = api.saveEditableApplicantProfile(email, before);
  before = api.saveProfileDocument(email, 'Jenny Aw', null, { name: 'grades.pdf', uploadedAt: '2026-09-22T10:00:00.000Z', size: 4, mimeType: 'application/pdf', dataUrl: 'data:application/pdf;base64,dGVzdA==', scanStatus: 'demo-passed' });
  const flow = session(); verifyCurrent(flow);
  const challenge = flow.sendNew(nextEmail);
  const after = flow.confirm(challenge.code);
  assert.deepEqual(after, { ...before, accountEmail: email, email: nextEmail });
  assert.equal(storage.has(api.profileStorageKey(nextEmail)), false);
  assert.deepEqual(api.loadEditableApplicantProfile(email, 'Jenny Aw'), after);
  const saved = api.saveEditableApplicantProfile(email, { ...after, phone: '+65 8888 1111' });
  assert.equal(saved.email, nextEmail);
  assert.equal(api.saveProfileDocument(email, 'Jenny Aw', saved.documents[0].id, null).email, nextEmail);
  assert.equal(api.saveProfilePhoto(email, 'Jenny Aw', null).email, nextEmail);
});

test('normal profile save cannot bypass verification or revert to a stale email', () => {
  const old = api.defaultApplicantProfile(email, 'Jenny Aw');
  assert.throws(() => api.saveEditableApplicantProfile(email, { ...old, email: nextEmail }), /account has changed/);
  const flow = session(); verifyCurrent(flow); flow.confirm(flow.sendNew(nextEmail).code);
  assert.throws(() => api.saveEditableApplicantProfile(email, old), /account has changed/);
  assert.throws(() => api.migrateApplicantProfile({ ...old, accountEmail: 'other@example.test' }, email, 'Jenny'), /another account/);
});

test('invalid and unchanged new addresses are rejected, surrounding whitespace is trimmed', () => {
  const flow = session(); verifyCurrent(flow);
  assert.throws(() => flow.sendNew('bad'), /valid email/);
  assert.throws(() => flow.sendNew(` ${email.toUpperCase()} `), /different email/);
  assert.equal(flow.confirm(flow.sendNew(` ${nextEmail} `).code).email, nextEmail);
});

test('resend cooldown, expiry and invalidation of earlier codes', () => {
  const flow = session();
  const first = flow.sendCurrent();
  assert.throws(() => flow.sendCurrent(), /wait/);
  now += 60000;
  const second = flow.sendCurrent();
  assert.throws(() => flow.verifyCurrent(first.code), /Incorrect/);
  now += 300000;
  assert.throws(() => flow.verifyCurrent(second.code), /expired/);
  flow.verifyCurrent(flow.sendCurrent().code);
  const old = flow.sendNew(nextEmail);
  assert.throws(() => flow.sendNew('other@example.test'), /wait/);
  now += 60000;
  const replacement = flow.sendNew('other@example.test');
  assert.throws(() => flow.confirm(old.code), /Incorrect/);
  assert.equal(flow.confirm(replacement.code).email, 'other@example.test');
});

test('current verification expires and attempts are bounded across resends', () => {
  const flow = session(); flow.sendCurrent();
  for (let i = 0; i < 5; i++) assert.throws(() => flow.verifyCurrent('999999'));
  now += 60000;
  assert.throws(() => flow.sendCurrent(), /Too many/);
  const another = session(); verifyCurrent(another);
  const challenge = another.sendNew(nextEmail);
  now += 600000;
  assert.throws(() => another.confirm(challenge.code), /verification has expired/);
});

test('storage failures leave existing email intact and permit retry', () => {
  api.saveEditableApplicantProfile(email, api.defaultApplicantProfile(email, 'Jenny Aw'));
  const flow = session(); verifyCurrent(flow); const challenge = flow.sendNew(nextEmail);
  const write = localStorage.setItem;
  localStorage.setItem = () => { throw new Error('quota'); };
  assert.throws(() => flow.confirm(challenge.code), /could not be updated/);
  assert.equal(api.loadEditableApplicantProfile(email, 'Jenny Aw').email, email);
  localStorage.setItem = write;
  assert.equal(flow.confirm(challenge.code).email, nextEmail);
});

test('a stale email change cannot overwrite another completed change', () => {
  const first = session(), second = session(); verifyCurrent(first); verifyCurrent(second);
  const challenge = second.sendNew('second@example.test');
  first.confirm(first.sendNew(nextEmail).code);
  assert.throws(() => second.confirm(challenge.code), /could not be updated/);
  assert.equal(api.loadEditableApplicantProfile(email, 'Jenny Aw').email, nextEmail);
});

test('partial profile and documents remain intact when email is committed independently', () => {
  const partial = { ...api.defaultApplicantProfile(email, 'Jenny Aw'), nationality: '' };
  storage.set(api.profileStorageKey(email), JSON.stringify(partial));
  const flow = session(); verifyCurrent(flow); const next = flow.confirm(flow.sendNew(nextEmail).code);
  assert.equal(next.nationality, '');
  assert.equal(next.fullName, 'Jenny Aw');
  assert.deepEqual(next.education, partial.education);
});

test('email masking does not expose the full local part', () => {
  assert.equal(maskProfileEmail(email), 'j***@u.nus.edu');
});
