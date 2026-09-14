import assert from 'node:assert/strict';
import test from 'node:test';
import type { WorkoutAssignment, WorkoutSession } from '@tfk/types';
import { assignmentCanStart, sessionDurationSeconds, summarizeTraining, trainingAdherence, trainingDate, trainingDistanceFromMeters, trainingDistanceToMeters, trainingFields } from '../src/index.ts';
const session = (completed_at: string, status = 'completed') => ({ started_at: '2026-09-14T00:00:00Z', completed_at, status }) as WorkoutSession;
const assignment = (assigned_for: string, status = 'assigned') => ({ assigned_for, status }) as WorkoutAssignment;
test('Distance round-trips yards/meters without early rounding', () => {
  assert.equal(trainingDistanceToMeters(100, 'imperial'), 91.44);
  assert.equal(trainingDistanceFromMeters(91.44, 'imperial'), 100);
  assert.equal(trainingDistanceToMeters(100, 'metric'), 100);
});
test('Tracking types show only relevant fields', () => {
  assert.deepEqual(trainingFields('bodyweight'), { reps: true, weight: false, duration: false, distance: false, rpe: true });
  assert.deepEqual(trainingFields('duration_distance'), { reps: false, weight: false, duration: true, distance: true, rpe: false });
  assert.equal(trainingFields('sets_reps').weight, true);
  assert.equal(trainingFields('duration').distance, false);
  assert.equal(trainingFields('distance').duration, false);
});
test('Duration ends at completion and clamps negative duration', () => {
  assert.equal(sessionDurationSeconds(session('2026-09-14T00:30:45Z')), 1845);
  assert.equal(sessionDurationSeconds(session('2026-09-13T00:00:00Z')), 0);
  assert.equal(sessionDurationSeconds({ started_at: '2026-09-14T00:00:00Z', completed_at: null }, new Date('2026-09-14T00:01:00Z')), 60);
});
test('Client timezone determines calendar date across UTC boundary', () => {
  assert.equal(trainingDate('2026-09-13T20:00:00Z', 'Asia/Manila'), '2026-09-14');
  assert.equal(trainingDate('2026-09-14T02:00:00Z', 'America/Los_Angeles'), '2026-09-13');
});
test('Consistency uses inclusive 7/30 local dates and ignores incomplete/future sessions', () => {
  const result = summarizeTraining([session('2026-09-14T01:00:00Z'), session('2026-09-08T01:00:00Z'), session('2026-09-07T01:00:00Z'), session('2026-08-16T01:00:00Z'), session('2026-08-15T01:00:00Z'), session('2026-09-14T01:00:00Z', 'abandoned'), session('2026-09-15T01:00:00Z')], [], 'UTC', new Date('2026-09-14T12:00:00Z'));
  assert.equal(result.completed_7d, 2); assert.equal(result.completed_30d, 4); assert.equal(result.last_completed_at, '2026-09-14T01:00:00Z');
});
test('Adherence includes skipped sessions, excludes archived and unscheduled', () => {
  const result = summarizeTraining([], [assignment('2026-09-14', 'completed'), assignment('2026-09-14', 'skipped'), assignment('2026-09-14', 'archived'), assignment('2026-09-07')], 'UTC', new Date('2026-09-14T12:00:00Z'));
  assert.equal(result.assigned_7d, 2); assert.equal(result.assigned_completed_7d, 1); assert.equal(trainingAdherence(result), 50);
});
test('Empty history has no adherence percentage or last completion', () => {
  const result = summarizeTraining([], [], 'UTC', new Date('2026-09-14T12:00:00Z'));
  assert.equal(trainingAdherence(result), null); assert.equal(result.last_completed_at, null);
});
test('Only assigned or in-progress assignments can start/resume', () => {
  assert.ok(assignmentCanStart('assigned')); assert.ok(assignmentCanStart('in_progress'));
  for (const status of ['completed', 'skipped', 'archived'] as const) assert.equal(assignmentCanStart(status), false);
});
