import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('GLP-1 reads and writes enforce the existing entitlement server-side', async () => {
  const [data, actions] = await Promise.all([readFile(new URL('../lib/data/glp1.ts', import.meta.url), 'utf8'), readFile(new URL('../server/actions/glp1.ts', import.meta.url), 'utf8')]);
  assert.match(data, /hasFeature\(entitlements, 'glp1_journal'\)/);
  assert.match(actions, /requireGLP1Access/);
  assert.doesNotMatch(actions, /service_role|plan_code/);
});

test('TFK Score implementation has no GLP-1 inputs', async () => {
  const scoring = await readFile(new URL('../../../packages/scoring/src/index.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(scoring, /glp1|medication|dose/i);
});
