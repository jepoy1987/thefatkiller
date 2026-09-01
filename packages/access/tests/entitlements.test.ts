import assert from 'node:assert/strict';
import test from 'node:test';
import type { Feature, Plan, PlanEntitlement, UserSubscription } from '@tfk/types';
import { getFeatureLimit, hasFeature, requireFeature, resolveEntitlementSet } from '../src/index.ts';

const stamp = '2026-08-31T00:00:00Z';
const plans = ['free', 'premium', 'coach'].map((code, index) => ({ id: `00000000-0000-4000-8000-00000000000${index}`, code, name: code[0]!.toUpperCase() + code.slice(1), description: null, is_active: true, sort_order: index, created_at: stamp, updated_at: stamp })) as Plan[];
const features = [{ id: 'f-progress', code: 'progress_tracking' }, { id: 'f-photos', code: 'progress_photos' }, { id: 'f-coach', code: 'coach_access' }] as Pick<Feature, 'id' | 'code'>[];
const entitlements = [
  { plan_id: plans[0]!.id, feature_id: 'f-progress', enabled: true, limits: {} },
  { plan_id: plans[0]!.id, feature_id: 'f-photos', enabled: true, limits: { max_active: 3 } },
  { plan_id: plans[1]!.id, feature_id: 'f-progress', enabled: true, limits: {} },
  { plan_id: plans[1]!.id, feature_id: 'f-photos', enabled: true, limits: { max_active: null } },
  { plan_id: plans[2]!.id, feature_id: 'f-progress', enabled: true, limits: {} },
  { plan_id: plans[2]!.id, feature_id: 'f-photos', enabled: true, limits: { max_active: null } },
  { plan_id: plans[2]!.id, feature_id: 'f-coach', enabled: true, limits: {} },
].map((item, index) => ({ id: `e-${index}`, created_at: stamp, ...item })) as PlanEntitlement[];
const featureCodesById = Object.fromEntries(features.map((feature) => [feature.id, feature.code]));
const subscription = (plan: Plan, status: UserSubscription['status']): UserSubscription => ({ id: 'subscription', user_id: 'user', plan_id: plan.id, status, provider: 'internal', provider_customer_id: null, provider_subscription_id: null, current_period_start: null, current_period_end: null, cancel_at_period_end: false, trial_ends_at: null, created_at: stamp, updated_at: stamp });
const resolve = (latestSubscription: UserSubscription | null) => resolveEntitlementSet({ plans, entitlements, featureCodesById, latestSubscription });

test('no subscription resolves Free with the configured photo limit', () => {
  const result = resolve(null);
  assert.equal(result.plan.code, 'free');
  assert.equal(getFeatureLimit(result, 'progress_photos', 'max_active'), 3);
});

test('active Premium and Coach resolve their feature matrices', () => {
  const premium = resolve(subscription(plans[1]!, 'active'));
  const coach = resolve(subscription(plans[2]!, 'active'));
  assert.equal(premium.plan.code, 'premium');
  assert.equal(getFeatureLimit(premium, 'progress_photos', 'max_active'), null);
  assert.equal(hasFeature(premium, 'coach_access'), false);
  assert.equal(hasFeature(coach, 'coach_access'), true);
});

test('canceled and expired paid subscriptions fall back to Free', () => {
  assert.equal(resolve(subscription(plans[1]!, 'canceled')).plan.code, 'free');
  assert.equal(resolve(subscription(plans[2]!, 'expired')).plan.code, 'free');
});

test('feature helpers enforce access without plan-code comparisons', () => {
  const free = resolve(null);
  assert.doesNotThrow(() => requireFeature(free, 'progress_photos'));
  assert.throws(() => requireFeature(free, 'coach_access'), /Feature not available/);
});
