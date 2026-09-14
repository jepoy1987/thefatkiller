import assert from 'node:assert/strict';
import test from 'node:test';
import { exerciseSchema, workoutTemplateSchema, workoutAssignmentSchema, workoutSetSchema, trainingProgramSchema } from '../src/index.ts';
import { weightFromKilograms, weightToKilograms } from '../src/index.ts';
const id = '11111111-1111-4111-8111-111111111111';
const exercise = { name: 'Squat', category: 'strength', equipment: 'dumbbell', tracking_type: 'sets_reps' };
const set = { session_exercise_id: id, set_number: 1, reps: 8 };
test('Exercise requires meaningful name and valid tracking/category/equipment', () => {
  assert.ok(exerciseSchema.safeParse(exercise).success);
  for (const override of [{ name: ' ' }, { category: 'invalid' }, { equipment: 'invalid' }, { tracking_type: 'invalid' }]) assert.equal(exerciseSchema.safeParse({ ...exercise, ...override }).success, false);
});
test('Exercise and template reject caller ownership fields', () => {
  assert.equal(exerciseSchema.safeParse({ ...exercise, owner_user_id: id }).success, false);
  assert.equal(workoutTemplateSchema.safeParse({ name: 'Workout', items: [{ exercise_id: id }], user_id: id }).success, false);
});
test('Workout items preserve order and accept absent optional targets', () => {
  const parsed = workoutTemplateSchema.parse({ name: 'Workout', items: [{ exercise_id: id, notes: 'first' }, { exercise_id: id, notes: 'second', target_rest_seconds: 0 }] });
  assert.deepEqual(parsed.items.map(i => i.notes), ['first', 'second']);
  assert.equal(parsed.items[0]?.target_sets, null);
});
test('Workout rejects empty/oversized lists and invalid rep ranges', () => {
  for (const items of [[], Array.from({ length: 31 }, () => ({ exercise_id: id })), [{ exercise_id: id, target_reps_min: 10, target_reps_max: 5 }], [{ exercise_id: id, target_sets: 0 }]]) assert.equal(workoutTemplateSchema.safeParse({ name: 'Workout', items }).success, false);
});
test('Sets accept each measurement without forcing unrelated fields', () => {
  for (const measurement of [{ reps: 8 }, { duration_seconds: 60 }, { distance_meters: 100 }, { duration_seconds: 60, distance_meters: 100 }]) assert.ok(workoutSetSchema.safeParse({ session_exercise_id: id, set_number: 1, ...measurement }).success);
});
test('Set requires measurement and positive bounded values', () => {
  assert.equal(workoutSetSchema.safeParse({ session_exercise_id: id, set_number: 1 }).success, false);
  for (const override of [{ reps: 0 }, { weight_kg: -1 }, { duration_seconds: 1.5 }, { distance_meters: 0 }, { set_number: 101 }, { set_number: 0 }, { weight_kg: 2001 }]) assert.equal(workoutSetSchema.safeParse({ ...set, ...override }).success, false);
});
test('RPE endpoints accepted, out of range rejected', () => {
  for (const rpe of [1, 10, '', null]) assert.ok(workoutSetSchema.safeParse({ ...set, rpe }).success);
  for (const rpe of [0, 10.1]) assert.equal(workoutSetSchema.safeParse({ ...set, rpe }).success, false);
});
test('Assignment allows target client but never caller coach, relationship or completion', () => {
  const base = { workout_template_id: id, client_id: id, assigned_for: '2026-09-14' };
  assert.ok(workoutAssignmentSchema.safeParse(base).success);
  for (const field of ['coach_user_id', 'relationship_id', 'completed_at', 'status']) assert.equal(workoutAssignmentSchema.safeParse({ ...base, [field]: id }).success, false);
  assert.equal(workoutAssignmentSchema.safeParse({ ...base, assigned_for: '2026-02-30' }).success, false);
});
test('Notes lengths and unknown fields bounded', () => {
  assert.equal(workoutSetSchema.safeParse({ ...set, notes: 'x'.repeat(1001) }).success, false);
  assert.equal(workoutSetSchema.safeParse({ ...set, started_at: '2026-09-14' }).success, false);
});
test('Programs validate ordered own-template references and week/day bounds', () => {
  const base = { name: 'Starter program', duration_weeks: 4, workouts: [{ workout_template_id: id, week_number: 1, day_number: 2 }] };
  assert.ok(trainingProgramSchema.safeParse(base).success);
  assert.equal(trainingProgramSchema.safeParse({ ...base, workouts: [{ workout_template_id: id, day_number: 8 }] }).success, false);
});
test('Weight conversion uses existing kg/lb helpers', () => {
  assert.equal(weightToKilograms(100, 'metric'), 100);
  assert.equal(weightFromKilograms(weightToKilograms(100, 'imperial'), 'imperial'), 100);
});
