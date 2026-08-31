import assert from 'node:assert/strict';
import test from 'node:test';
import { billingProviderSchema, entitlementLimitsSchema, featureCodeSchema, planCodeSchema, subscriptionStatusSchema } from '../src/index.ts';

test('accepts stable provider-agnostic plan and feature codes', () => {
  assert.equal(planCodeSchema.safeParse('premium').success, true);
  assert.equal(featureCodeSchema.safeParse('progress_photos').success, true);
  assert.equal(billingProviderSchema.safeParse('internal').success, true);
  assert.equal(subscriptionStatusSchema.safeParse('trialing').success, true);
});

test('rejects unknown billing values and unsafe limits', () => {
  assert.equal(planCodeSchema.safeParse('premium-monthly-stripe').success, false);
  assert.equal(billingProviderSchema.safeParse('unknown').success, false);
  assert.equal(entitlementLimitsSchema.safeParse({ max_active: -1 }).success, false);
  assert.equal(entitlementLimitsSchema.safeParse({ max_active: 3 }).success, true);
});
