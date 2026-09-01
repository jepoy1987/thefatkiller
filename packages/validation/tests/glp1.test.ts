import assert from 'node:assert/strict';
import test from 'node:test';
import { glp1DoseLogSchema, glp1MedicationProfileSchema, glp1SymptomLogSchema } from '../src/index.ts';

const baseDose = { medication_profile_id: '11111111-1111-4111-8111-111111111111', event_type: 'taken', taken_at: '2026-09-01T08:00' };
test('Taken requires a positive dose and unit', () => {
  assert.equal(glp1DoseLogSchema.safeParse(baseDose).success, false);
  assert.equal(glp1DoseLogSchema.safeParse({ ...baseDose, dose_amount: '2.5', dose_unit: 'mg' }).success, true);
  assert.equal(glp1DoseLogSchema.safeParse({ ...baseDose, dose_amount: '-1', dose_unit: 'mg' }).success, false);
});
test('Missed and skipped do not require dose details', () => {
  assert.equal(glp1DoseLogSchema.safeParse({ ...baseDose, event_type: 'missed' }).success, true);
  assert.equal(glp1DoseLogSchema.safeParse({ ...baseDose, event_type: 'skipped' }).success, true);
});
test('GLP-1 ratings stay within one to five', () => {
  assert.equal(glp1SymptomLogSchema.safeParse({ logged_at: '2026-09-01T08:00', nausea: '5' }).success, true);
  assert.equal(glp1SymptomLogSchema.safeParse({ logged_at: '2026-09-01T08:00', nausea: '6' }).success, false);
});
test('Other medication requires a meaningful custom name', () => {
  assert.equal(glp1MedicationProfileSchema.safeParse({ medication_name: 'other' }).success, false);
  assert.equal(glp1MedicationProfileSchema.safeParse({ medication_name: 'other', custom_medication_name: 'Prescribed medication' }).success, true);
});
