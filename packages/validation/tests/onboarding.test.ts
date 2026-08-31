import test from 'node:test';
import assert from 'node:assert/strict';
import {
  goalSettingsSchema, onboardingSchema, weightFromKilograms, weightToKilograms,
  heightFromCentimeters, heightToCentimeters, waterFromMilliliters, waterToMilliliters,
} from '../src/index.ts';

const metric = {
  first_name: 'Test', last_name: 'User', display_name: 'Tester', date_of_birth: '1990-01-01',
  unit_system: 'metric', goal_type: 'lose_weight', starting_weight: 95, goal_weight: 82,
  height: 178, activity_level: 'moderately_active', daily_calorie_target: 1800,
  daily_protein_target: 140, daily_carbs_target: 180, daily_fat_target: 60,
  daily_water_target: 2500, daily_step_target: 10000,
} as const;

const goalSettings = {
  unit_system: metric.unit_system,
  goal_type: metric.goal_type,
  goal_weight: metric.goal_weight,
  activity_level: metric.activity_level,
  daily_calorie_target: metric.daily_calorie_target,
  daily_protein_target: metric.daily_protein_target,
  daily_carbs_target: metric.daily_carbs_target,
  daily_fat_target: metric.daily_fat_target,
  daily_water_target: metric.daily_water_target,
  daily_step_target: metric.daily_step_target,
} as const;

const firstMessage = (result: ReturnType<typeof onboardingSchema.safeParse> | ReturnType<typeof goalSettingsSchema.safeParse>) =>
  result.success ? undefined : result.error.issues[0]?.message;

test('accepts valid metric onboarding', () => assert.equal(onboardingSchema.safeParse(metric).success, true));
test('accepts valid imperial onboarding', () => assert.equal(onboardingSchema.safeParse({ ...metric, unit_system: 'imperial', starting_weight: 210, goal_weight: 180, height: 70, daily_water_target: 84 }).success, true));
test('rejects negative weight', () => assert.equal(onboardingSchema.safeParse({ ...metric, starting_weight: -1 }).success, false));
test('rejects non-positive calories', () => assert.equal(onboardingSchema.safeParse({ ...metric, daily_calorie_target: 0 }).success, false));
test('rejects invalid activity level', () => assert.equal(onboardingSchema.safeParse({ ...metric, activity_level: 'sometimes' }).success, false));
test('rejects missing goal data', () => {
  const { goal_weight: _removed, ...missingGoal } = metric;
  assert.equal(onboardingSchema.safeParse(missingGoal).success, false);
});
test('accepts decimal weight', () => {
  assert.equal(onboardingSchema.safeParse({ ...metric, starting_weight: 100, goal_weight: 90 }).success, true);
  assert.equal(onboardingSchema.safeParse({ ...metric, starting_weight: 100.5, goal_weight: 90.5 }).success, true);
  assert.equal(goalSettingsSchema.safeParse({ ...goalSettings, goal_weight: 90.5 }).success, true);
});
test('accepts decimal height', () => assert.equal(onboardingSchema.safeParse({ ...metric, height: 178.5 }).success, true));
test('accepts decimal protein', () => {
  assert.equal(onboardingSchema.safeParse({ ...metric, daily_protein_target: 140.5 }).success, true);
  assert.equal(goalSettingsSchema.safeParse({ ...goalSettings, daily_protein_target: 140.5 }).success, true);
});
test('accepts decimal carbs', () => {
  assert.equal(onboardingSchema.safeParse({ ...metric, daily_carbs_target: 180.5 }).success, true);
  assert.equal(goalSettingsSchema.safeParse({ ...goalSettings, daily_carbs_target: 180.5 }).success, true);
});
test('accepts decimal fat', () => {
  assert.equal(onboardingSchema.safeParse({ ...metric, daily_fat_target: 60.5 }).success, true);
  assert.equal(goalSettingsSchema.safeParse({ ...goalSettings, daily_fat_target: 60.5 }).success, true);
});
test('accepts decimal water', () => {
  assert.equal(onboardingSchema.safeParse({ ...metric, daily_water_target: 2500.5 }).success, true);
  assert.equal(goalSettingsSchema.safeParse({ ...goalSettings, daily_water_target: 2500.5 }).success, true);
});
test('rejects decimal calories with a clear message', () => {
  assert.equal(firstMessage(onboardingSchema.safeParse({ ...metric, daily_calorie_target: 1800.5 })), 'Calories must be a whole number.');
  assert.equal(firstMessage(goalSettingsSchema.safeParse({ ...goalSettings, daily_calorie_target: 1800.5 })), 'Calories must be a whole number.');
});
test('rejects decimal steps with a clear message', () => {
  assert.equal(firstMessage(onboardingSchema.safeParse({ ...metric, daily_step_target: 10000.5 })), 'Steps must be a whole number.');
  assert.equal(firstMessage(goalSettingsSchema.safeParse({ ...goalSettings, daily_step_target: 10000.5 })), 'Steps must be a whole number.');
});
test('converts canonical units at boundaries', () => {
  assert.ok(Math.abs(weightFromKilograms(weightToKilograms(210, 'imperial'), 'imperial') - 210) < 0.1);
  assert.ok(Math.abs(heightFromCentimeters(heightToCentimeters(70, 'imperial'), 'imperial') - 70) < 0.1);
  assert.ok(Math.abs(waterFromMilliliters(waterToMilliliters(84, 'imperial'), 'imperial') - 84) < 0.1);
});
