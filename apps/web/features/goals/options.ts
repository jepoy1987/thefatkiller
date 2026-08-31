import type { ActivityLevel, GoalType, UnitSystem } from '@tfk/types';

export const unitOptions: Array<{ value: UnitSystem; label: string }> = [
  { value: 'metric', label: 'Metric (kg, cm, ml)' },
  { value: 'imperial', label: 'Imperial (lb, in, fl oz)' },
];

export const goalTypeOptions: Array<{ value: GoalType; label: string }> = [
  { value: 'lose_weight', label: 'Lose weight' },
  { value: 'maintain_weight', label: 'Maintain weight' },
  { value: 'gain_weight', label: 'Gain weight' },
];

export const activityOptions: Array<{ value: ActivityLevel; label: string }> = [
  { value: 'sedentary', label: 'Sedentary' },
  { value: 'lightly_active', label: 'Lightly active' },
  { value: 'moderately_active', label: 'Moderately active' },
  { value: 'very_active', label: 'Very active' },
  { value: 'extra_active', label: 'Extra active' },
];
