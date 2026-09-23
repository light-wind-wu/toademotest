const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../lib/applicant-settings.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
const compiledModule = { exports: {} };
new Function('require', 'module', 'exports', compiled)(
  (name) => name.startsWith('@/') ? require(path.join(__dirname, '..', name.slice(2))) : require(name),
  compiledModule, compiledModule.exports,
);
const { loadApplicantNotificationSettings: load, saveApplicantNotificationSettings: save } = compiledModule.exports;
let storage;
beforeEach(() => {
  storage = new Map();
  global.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) };
});

test('Optional emails default off and preferences stay account scoped', () => {
  assert.equal(load('one@example.test').eventsAndOpportunities, false);
  save('one@example.test', { eventsAndOpportunities: true });
  assert.equal(load(' ONE@example.test ').eventsAndOpportunities, true);
  assert.equal(load('two@example.test').eventsAndOpportunities, false);
});

test('Toggle off persists and no mandatory notification switch is stored', () => {
  save('one@example.test', { eventsAndOpportunities: true });
  save('one@example.test', { eventsAndOpportunities: false, applicationUpdates: false });
  assert.deepEqual(load('one@example.test'), { eventsAndOpportunities: false });
});

test('Invalid input cannot overwrite saved preferences', () => {
  save('one@example.test', { eventsAndOpportunities: true });
  assert.throws(() => save('one@example.test', { eventsAndOpportunities: 'no' }));
  assert.equal(load('one@example.test').eventsAndOpportunities, true);
});

test('Storage errors are surfaced to allow the UI to keep the previous state', () => {
  global.localStorage.setItem = () => { throw new Error('Storage unavailable'); };
  assert.throws(() => save('one@example.test', { eventsAndOpportunities: true }), /Storage unavailable/);
});
