import type { Profile, TodayDashboardData, UserGoal } from '@tfk/types';
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

export function mapTodayDashboard(profile: Profile, goal: UserGoal): TodayDashboardData {
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
      target: weightFromKilograms(goal.goal_weight, profile.unit_system),
      unit: weightLabel(profile.unit_system),
    },
    nextActions: ['Set up complete', 'Nutrition tracking coming next', 'Water tracking coming next', 'Progress tracking coming next'],
  };
}
