import test from 'node:test';
import assert from 'node:assert/strict';
import { foodLogSchema, foodSchema, quickAddSchema, savedMealDetailsSchema, savedMealSchema, waterLogSchema, waterToMilliliters } from '../src/index.ts';

test('accepts decimal food nutrition and serving values', () => {
  assert.equal(foodSchema.safeParse({ name: 'Yogurt', serving_size: 1.5, serving_unit: 'cup', calories: 120.5, protein_g: 12.5, carbs_g: 9.25, fat_g: 2.5, fiber_g: '' }).success, true);
  assert.equal(foodLogSchema.safeParse({ food_id: crypto.randomUUID(), meal_type: 'breakfast', servings: 1.25, logged_at: '2026-08-31T08:00' }).success, true);
});

test('validates quick-add, saved meal, and saved-meal edits', () => {
  assert.equal(quickAddSchema.safeParse({ name: 'Lunch', meal_type: 'lunch', calories: 450.5, protein_g: 30.5, carbs_g: 40, fat_g: 12, logged_at: '2026-08-31T12:00' }).success, true);
  assert.equal(savedMealSchema.safeParse({ name: 'Breakfast', food_ids: [] }).success, false);
  assert.equal(savedMealDetailsSchema.safeParse({ id: crypto.randomUUID(), name: 'Updated meal', description: 'Weekday option' }).success, true);
});

test('requires positive water and converts display units to canonical milliliters', () => {
  assert.equal(waterLogSchema.safeParse({ amount: 0, unit_system: 'metric', logged_at: '2026-08-31T12:00' }).success, false);
  assert.equal(waterToMilliliters(16, 'imperial'), 473);
  assert.equal(waterToMilliliters(500.5, 'metric'), 501);
});
