const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../lib/settings-password.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const compiledModule = { exports: {} };
new Function('require', 'module', 'exports', compiled)(require, compiledModule, compiledModule.exports);
const { settingsPasswordSchema } = compiledModule.exports;

test('All three password fields are required', () => {
  const result = settingsPasswordSchema.safeParse({ currentPassword: '', newPassword: '', confirmPassword: '' });
  assert.equal(result.success, false);
  assert.deepEqual(new Set(result.error.issues.map((issue) => issue.path[0])), new Set(['currentPassword', 'newPassword', 'confirmPassword']));
});

test('Confirmation must match the new password', () => {
  const result = settingsPasswordSchema.safeParse({ currentPassword: 'demo-old', newPassword: 'demo-new', confirmPassword: 'different' });
  assert.equal(result.success, false);
  assert.equal(result.error.issues[0].path[0], 'confirmPassword');
});

test('New password must differ from current password', () => {
  assert.equal(settingsPasswordSchema.safeParse({ currentPassword: 'demo-old', newPassword: 'demo-old', confirmPassword: 'demo-old' }).success, false);
});

test('Matching demo values pass without changing their contents', () => {
  const values = { currentPassword: 'demo-old', newPassword: ' demo-new ', confirmPassword: ' demo-new ' };
  assert.deepEqual(settingsPasswordSchema.parse(values), values);
});
