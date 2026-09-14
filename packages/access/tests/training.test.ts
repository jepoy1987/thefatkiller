import assert from 'node:assert/strict';
import test from 'node:test';
import type { EntitlementSet } from '@tfk/types';
import { hasFeature, requireFeature } from '../src/index.ts';
const access = (features: EntitlementSet['features']) => ({ features }) as EntitlementSet;
test('Workout entitlement gates reads/writes independently of plan labels', () => {
  assert.equal(hasFeature(access([]), 'workouts'), false);
  assert.throws(() => requireFeature(access([]), 'workouts'));
  assert.doesNotThrow(() => requireFeature(access(['workouts']), 'workouts'));
});
test('Workout access alone never implies coach access', () => {
  assert.equal(hasFeature(access(['workouts']), 'coach_access'), false);
  assert.equal(hasFeature(access(['workouts', 'coach_access']), 'coach_access'), true);
});
