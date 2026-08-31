import test from 'node:test';
import assert from 'node:assert/strict';
import type { Profile, UserGoal } from '@tfk/types';
import { mapTodayDashboard } from '../src/index.ts';

const profile: Profile = { id: 'user-1', first_name: 'Ada', last_name: 'Lovelace', display_name: 'Ada', avatar_url: null, date_of_birth: '1990-01-01', sex: null, timezone: 'UTC', locale: 'en', unit_system: 'metric', onboarding_completed: true, created_at: '', updated_at: '' };
const goal: UserGoal = { id: 'goal-1', user_id: 'user-1', goal_type: 'lose_weight', starting_weight: 95, goal_weight: 82, height: 178, activity_level: 'moderately_active', daily_calorie_target: 1800, daily_protein_target: 140, daily_carbs_target: 180, daily_fat_target: 60, daily_water_target: 2500, daily_step_target: 10000, is_active: true, created_at: '', updated_at: '' };

test('maps canonical goal data into metric Today data', () => {
  const dashboard = mapTodayDashboard(profile, goal);
  assert.equal(dashboard.welcomeName, 'Ada');
  assert.deepEqual(dashboard.weightGoal, { starting: 95, current: 95, target: 82, unit: 'kg' });
  assert.deepEqual(dashboard.targets.find((target) => target.key === 'water'), { key: 'water', label: 'Water', current: 0, target: 2500, unit: 'ml' });
  assert.equal(dashboard.targets.every((target) => target.current === 0), true);
});

test('formats imperial dashboard boundaries without changing canonical input', () => {
  const dashboard = mapTodayDashboard({ ...profile, unit_system: 'imperial' }, goal);
  assert.deepEqual(dashboard.weightGoal, { starting: 209.4, current: 209.4, target: 180.8, unit: 'lb' });
  assert.deepEqual(dashboard.targets.find((target) => target.key === 'water'), { key: 'water', label: 'Water', current: 0, target: 84.5, unit: 'fl oz' });
  assert.equal(goal.goal_weight, 82);
});

test('maps real nutrition totals into Today while steps remain zero', () => {
  const dashboard = mapTodayDashboard(profile, goal, undefined, { calories: 1250.5, protein_g: 100.5, carbs_g: 120, fat_g: 44.25, water_ml: 1750 });
  assert.equal(dashboard.targets.find((target) => target.key === 'calories')?.current, 1250.5);
  assert.equal(dashboard.targets.find((target) => target.key === 'protein')?.current, 100.5);
  assert.equal(dashboard.targets.find((target) => target.key === 'water')?.current, 1750);
  assert.equal(dashboard.targets.find((target) => target.key === 'steps')?.current, 0);
});
