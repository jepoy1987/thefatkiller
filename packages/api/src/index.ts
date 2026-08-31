import type { Profile, ProgressSummary, TodayDashboardData, UserGoal, WeightEntry } from '@tfk/types';
import { waterFromMilliliters, weightFromKilograms, weightLabel } from '@tfk/validation';

export type ApiResponse<T> = {
  data: T | null;
  error: string | null;
};

export type ProfileApiState = {
  id: string;
  email: string | null;
  onboarding_completed: boolean;
  unit_system: 'metric' | 'imperial';
};

export function calculateProgress(profile: Profile, goal: UserGoal, entries: WeightEntry[]): ProgressSummary {
  const ordered = [...entries].sort((a, b) => Date.parse(a.recorded_at) - Date.parse(b.recorded_at));
  const currentKg = ordered.at(-1)?.weight_kg ?? goal.starting_weight;
  const start = goal.starting_weight;
  const target = goal.goal_weight;
  const direction = goal.goal_type === 'lose_weight' ? -1 : goal.goal_type === 'gain_weight' ? 1 : 0;
  const desired = direction === 0 ? Math.abs(start - target) : Math.abs(target - start);
  const progress = direction === 0 ? Math.max(0, 0.5 - Math.abs(currentKg - target)) : Math.max(0, direction * (currentKg - start));
  const remaining = direction === 0 ? Math.max(0, Math.abs(currentKg - target) - 0.5) : Math.max(0, direction * (target - currentKg));
  const elapsedWeeks = ordered.length > 1 ? (Date.parse(ordered.at(-1)!.recorded_at) - Date.parse(ordered[0]!.recorded_at)) / 604800000 : 0;
  const delta = currentKg - start;
  const shown = (kg: number) => weightFromKilograms(kg, profile.unit_system);
  return { current: shown(currentKg), starting: shown(start), goal: shown(target), change: shown(Math.abs(delta)) * Math.sign(delta), remaining: shown(remaining), percent: desired === 0 ? (remaining === 0 ? 100 : 0) : Math.min(100, Math.round((progress / desired) * 100)), weeklyRate: elapsedWeeks > 0 ? shown(delta / elapsedWeeks) : null, trend: Math.abs(delta) < 0.01 ? 'steady' : delta > 0 ? 'up' : 'down', unit: weightLabel(profile.unit_system) };
}

export function mapTodayDashboard(profile: Profile, goal: UserGoal, latestWeightKg?: number): TodayDashboardData {
  const waterUnit = profile.unit_system === 'imperial' ? 'fl oz' : 'ml';
  return {
    profile,
    goal,
    welcomeName: profile.display_name ?? profile.first_name ?? 'there',
    targets: [
      { key: 'calories', label: 'Calories', current: 0, target: goal.daily_calorie_target, unit: null },
      { key: 'protein', label: 'Protein', current: 0, target: goal.daily_protein_target, unit: 'g' },
      { key: 'carbs', label: 'Carbs', current: 0, target: goal.daily_carbs_target, unit: 'g' },
      { key: 'fat', label: 'Fat', current: 0, target: goal.daily_fat_target, unit: 'g' },
      { key: 'water', label: 'Water', current: 0, target: waterFromMilliliters(goal.daily_water_target, profile.unit_system), unit: waterUnit },
      { key: 'steps', label: 'Steps', current: 0, target: goal.daily_step_target, unit: null },
    ],
    weightGoal: {
      starting: weightFromKilograms(goal.starting_weight, profile.unit_system),
      current: weightFromKilograms(latestWeightKg ?? goal.starting_weight, profile.unit_system),
      target: weightFromKilograms(goal.goal_weight, profile.unit_system),
      unit: weightLabel(profile.unit_system),
    },
    nextActions: ['Set up complete', 'Nutrition tracking coming next', 'Water tracking coming next', 'Progress tracking coming next'],
  };
}
