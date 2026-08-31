import test from 'node:test';
import assert from 'node:assert/strict';
import { bodyMeasurementSchema, progressPhotoSchema, weightEntrySchema } from '../src/index.ts';
test('accepts decimal weight and body measurements', () => { assert.equal(weightEntrySchema.safeParse({ weight: 99.5, recorded_at: '2026-08-31' }).success, true); assert.equal(bodyMeasurementSchema.safeParse({ measurement_type: 'waist', value: 81.25, recorded_at: '2026-08-31' }).success, true); });
test('rejects invalid progress values and types', () => { assert.equal(weightEntrySchema.safeParse({ weight: 0, recorded_at: '2026-08-31' }).success, false); assert.equal(bodyMeasurementSchema.safeParse({ measurement_type: 'unknown', value: 1, recorded_at: '2026-08-31' }).success, false); });
test('accepts optional photo weight', () => { assert.equal(progressPhotoSchema.safeParse({ photo_type: 'front', recorded_at: '2026-08-31', weight: '' }).success, true); });
