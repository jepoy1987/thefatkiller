const assert = require('node:assert/strict');
const test = require('node:test');

const scales = import('../features/accountability/rating-scales.ts');

test('daily rating scales expose the required human-readable labels', async () => {
  const { dailyRatingScales } = await scales;
  assert.deepEqual(dailyRatingScales.mood.map(({ label }) => label), ['Very low', 'Low', 'Okay', 'Good', 'Great']);
  assert.deepEqual(dailyRatingScales.energy.map(({ label }) => label), ['Exhausted', 'Low', 'Moderate', 'Energized', 'Very energized']);
  assert.deepEqual(dailyRatingScales.hunger.map(({ label }) => label), ['Not hungry', 'Slightly hungry', 'Moderate', 'Hungry', 'Very hungry']);
  assert.deepEqual(dailyRatingScales.sleep_quality.map(({ label }) => label), ['Very poor', 'Poor', 'Okay', 'Good', 'Excellent']);
  assert.deepEqual(dailyRatingScales.stress.map(({ label }) => label), ['Very low', 'Low', 'Moderate', 'High', 'Very high']);
});

test('weekly rating scales use the shared quality labels', async () => {
  const { weeklyRatingScales } = await scales;
  const expected = ['Very poor', 'Poor', 'Okay', 'Good', 'Excellent'];
  for (const scale of Object.values(weeklyRatingScales)) assert.deepEqual(scale.map(({ label }) => label), expected);
});

test('stored integer values map to labels without changing their values', async () => {
  const { dailyRatingScales, formatRating, weeklyRatingScales } = await scales;
  assert.deepEqual(dailyRatingScales.mood.map(({ value }) => value), [1, 2, 3, 4, 5]);
  assert.equal(formatRating(dailyRatingScales.mood, 4), 'Good (4)');
  assert.equal(formatRating(dailyRatingScales.hunger, 5), 'Very hungry (5)');
  assert.equal(formatRating(dailyRatingScales.stress, 1), 'Very low (1)');
  assert.equal(formatRating(weeklyRatingScales.overall_rating, null), 'Not answered');
});
