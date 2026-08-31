import test from 'node:test';
import assert from 'node:assert/strict';
import type { Food, FoodLog } from '@tfk/types';
import { calculateFoodSnapshot, dateRangeForTimeZone, mealSubtotals, targetStatus, totalFoodLogs, zonedDateTimeToIso } from '../src/index.ts';

const food = { calories: 210, protein_g: 12.5, carbs_g: 24, fat_g: 7.25, fiber_g: 3 } as Food;
const log = (meal_type: FoodLog['meal_type'], calories: number, protein_g: number, carbs_g: number, fat_g: number): FoodLog => ({
  id: crypto.randomUUID(), user_id: 'user-1', food_id: null, meal_type, food_name_snapshot: 'Test food', brand_snapshot: null,
  servings: 1, serving_size_snapshot: 1, serving_unit_snapshot: 'serving', calories, protein_g, carbs_g, fat_g,
  fiber_g: null, logged_at: '2026-08-31T12:00:00Z', notes: null, created_at: '', updated_at: '',
});

test('scales immutable food snapshots for decimal servings', () => {
  assert.deepEqual(calculateFoodSnapshot(food, 1.5), { calories: 315, protein_g: 18.75, carbs_g: 36, fat_g: 10.88, fiber_g: 4.5 });
});

test('aggregates daily and meal totals and keeps an empty day at zero', () => {
  const logs = [log('breakfast', 300, 20, 30, 10), log('dinner', 500, 35, 45, 18)];
  assert.deepEqual(totalFoodLogs(logs), { calories: 800, protein_g: 55, carbs_g: 75, fat_g: 28, water_ml: 0 });
  assert.equal(mealSubtotals(logs).breakfast.calories, 300);
  assert.equal(mealSubtotals(logs).dinner.protein_g, 35);
  assert.deepEqual(totalFoodLogs([]), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, water_ml: 0 });
});

test('reports target remaining and over states', () => {
  assert.deepEqual(targetStatus(1400, 1800), { percent: 78, difference: 400, state: 'remaining' });
  assert.deepEqual(targetStatus(1900, 1800), { percent: 106, difference: 100, state: 'over' });
});

test('converts local nutrition dates across UTC, Manila, and Chicago', () => {
  assert.equal(zonedDateTimeToIso('2026-08-31T00:00:00', 'UTC'), '2026-08-31T00:00:00.000Z');
  assert.equal(zonedDateTimeToIso('2026-08-31T00:00:00', 'Asia/Manila'), '2026-08-30T16:00:00.000Z');
  assert.equal(zonedDateTimeToIso('2026-08-31T00:00:00', 'America/Chicago'), '2026-08-31T05:00:00.000Z');
  assert.deepEqual(dateRangeForTimeZone('2026-11-01', 'America/Chicago'), { start: '2026-11-01T05:00:00.000Z', end: '2026-11-02T06:00:00.000Z' });
});
