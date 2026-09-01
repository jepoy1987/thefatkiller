import assert from 'node:assert/strict';
import test from 'node:test';
const domain = import('../features/glp1/domain.ts');

test('dose history formatting never interprets correctness', async () => {
  const { doseSummary } = await domain;
  assert.equal(doseSummary({ event_type: 'taken', dose_amount: 2.5, dose_unit: 'mg' }), '2.5 mg');
  assert.equal(doseSummary({ event_type: 'missed', dose_amount: null, dose_unit: null }), 'Missed');
});
test('symptom labels are human readable intensity labels', async () => {
  const { symptomLabel } = await domain;
  assert.equal(symptomLabel(5), 'Severe (5)');
  assert.equal(symptomLabel(1, true), 'Very low (1)');
});
