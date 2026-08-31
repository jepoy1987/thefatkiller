export type RatingValue = 1 | 2 | 3 | 4 | 5;
export type RatingOption = Readonly<{ value: RatingValue; label: string }>;
export type RatingScale = readonly RatingOption[];

const scale = (labels: readonly [string, string, string, string, string]): RatingScale =>
  labels.map((label, index) => ({ value: (index + 1) as RatingValue, label }));

const qualityScale = scale(['Very poor', 'Poor', 'Okay', 'Good', 'Excellent']);

export const dailyRatingScales = {
  mood: scale(['Very low', 'Low', 'Okay', 'Good', 'Great']),
  energy: scale(['Exhausted', 'Low', 'Moderate', 'Energized', 'Very energized']),
  hunger: scale(['Not hungry', 'Slightly hungry', 'Moderate', 'Hungry', 'Very hungry']),
  sleep_quality: qualityScale,
  stress: scale(['Very low', 'Low', 'Moderate', 'High', 'Very high']),
} as const satisfies Record<'mood' | 'energy' | 'hunger' | 'sleep_quality' | 'stress', RatingScale>;

export const weeklyRatingScales = {
  overall_rating: qualityScale,
  nutrition_rating: qualityScale,
  movement_rating: qualityScale,
  sleep_rating: qualityScale,
} as const satisfies Record<'overall_rating' | 'nutrition_rating' | 'movement_rating' | 'sleep_rating', RatingScale>;

export function formatRating(scaleDefinition: RatingScale, value: number | null | undefined) {
  if (value == null) return 'Not answered';
  const option = scaleDefinition.find((candidate) => candidate.value === value);
  return option ? `${option.label} (${option.value})` : `Unknown (${value})`;
}
