const test = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

const source = readFileSync(new URL('../features/goals/numeric-input.ts', `file://${__filename}`), 'utf8');

test('decimal numeric inputs do not create a shifted step grid', () => {
  assert.match(source, /step: integer \? '1' : 'any'/);
  assert.match(source, /inputMode: integer \? 'numeric' : 'decimal'/);
});

test('integer numeric inputs use whole-number-aligned constraints', () => {
  assert.match(source, /integer \? \(allowZero \? '0' : '1'\)/);
});
