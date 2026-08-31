const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const components = readFileSync(new URL('../features/nutrition/components.tsx', `file://${__filename}`), 'utf8');
const logForm = readFileSync(new URL('../features/nutrition/log-food-form.tsx', `file://${__filename}`), 'utf8');
const actions = readFileSync(new URL('../server/actions/nutrition.ts', `file://${__filename}`), 'utf8');

test('all nutrition mutations expose pending feedback through SubmitButton', () => {
  for (const label of ['Saving…', 'Logging…', 'Deleting…', 'Adding water…']) assert.match(components + logForm, new RegExp(label));
});

test('nutrition mutations redirect with explicit success feedback', () => {
  for (const message of ['Food saved.', 'Food logged.', 'Food updated.', 'Food deleted.', 'Meal saved.', 'Meal logged.', 'Meal updated.', 'Meal deleted.', 'Water added.', 'Water deleted.']) assert.match(actions, new RegExp(message.replace('.', '\\.')));
});
