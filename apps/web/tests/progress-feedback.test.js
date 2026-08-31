const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const components = readFileSync(new URL('../features/progress/components.tsx', `file://${__filename}`), 'utf8');
const photoForm = readFileSync(new URL('../features/progress/photo-upload-form.tsx', `file://${__filename}`), 'utf8');
const actions = readFileSync(new URL('../server/actions/progress.ts', `file://${__filename}`), 'utf8');

test('all progress save and delete controls expose consistent pending feedback', () => {
  assert.equal((components.match(/pendingLabel="Saving…"/g) ?? []).length, 4);
  assert.equal((components.match(/pendingLabel="Deleting…"/g) ?? []).length, 3);
  assert.match(photoForm, /pendingLabel="Uploading…"/);
});

test('photo upload exposes the selected filename', () => {
  assert.match(photoForm, /event\.target\.files\?\.\[0\]\?\.name/);
  assert.match(photoForm, /aria-live="polite"/);
});

test('progress mutations return explicit success messages', () => {
  for (const message of ['Weight saved.', 'Weight updated.', 'Weight deleted.', 'Measurement saved.', 'Measurement updated.', 'Measurement deleted.', 'Photo uploaded.', 'Photo deleted.']) {
    assert.match(actions, new RegExp(message.replace('.', '\\.')));
  }
});
