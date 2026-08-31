import type { Food, FoodLog, MealType, NutrientTotals, Profile, ProgressSummary, TodayDashboardData, UserGoal, WeightEntry } from '@tfk/types';
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

export const emptyNutritionTotals = (): NutrientTotals => ({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, water_ml: 0 });
export function calculateFoodSnapshot(food: Pick<Food, 'calories'|'protein_g'|'carbs_g'|'fat_g'|'fiber_g'>, servings: number) { const scale = (value: number | null) => value === null ? null : Number((value * servings).toFixed(2)); return { calories: scale(food.calories)!, protein_g: scale(food.protein_g)!, carbs_g: scale(food.carbs_g)!, fat_g: scale(food.fat_g)!, fiber_g: scale(food.fiber_g) }; }
export function totalFoodLogs(logs: FoodLog[]): NutrientTotals { return logs.reduce((sum, log) => ({ ...sum, calories: sum.calories + log.calories, protein_g: sum.protein_g + log.protein_g, carbs_g: sum.carbs_g + log.carbs_g, fat_g: sum.fat_g + log.fat_g }), emptyNutritionTotals()); }
export function mealSubtotals(logs: FoodLog[]): Record<MealType, NutrientTotals> { const totals = { breakfast: emptyNutritionTotals(), lunch: emptyNutritionTotals(), dinner: emptyNutritionTotals(), snack: emptyNutritionTotals() }; for (const log of logs) { const meal = totals[log.meal_type]; meal.calories += log.calories; meal.protein_g += log.protein_g; meal.carbs_g += log.carbs_g; meal.fat_g += log.fat_g; } return totals; }
export function targetStatus(consumed: number, target: number) { const difference = Number(Math.abs(target - consumed).toFixed(2)); return { percent: target > 0 ? Math.round(consumed / target * 100) : 0, difference, state: consumed > target ? 'over' as const : 'remaining' as const }; }
export function zonedDateTimeToIso(localDateTime: string, timeZone: string) { const [date,time='00:00:00']=localDateTime.split('T'); const [year,month,day]=date!.split('-').map(Number); const [hour,minute,second=0]=time.split(':').map(Number); const guess=new Date(Date.UTC(year!,month!-1,day!,hour!,minute!,second!)); const parts=new Intl.DateTimeFormat('en-US',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(guess); const part=(type:Intl.DateTimeFormatPartTypes)=>Number(parts.find((p)=>p.type===type)?.value); const offset=Date.UTC(part('year'),part('month')-1,part('day'),part('hour'),part('minute'),part('second'))-guess.getTime(); return new Date(guess.getTime()-offset).toISOString(); }
export function dateRangeForTimeZone(date: string, timeZone: string) { const next=new Date(`${date}T12:00:00Z`);next.setUTCDate(next.getUTCDate()+1);return {start:zonedDateTimeToIso(`${date}T00:00:00`,timeZone),end:zonedDateTimeToIso(`${next.toISOString().slice(0,10)}T00:00:00`,timeZone)}; }

export function mapTodayDashboard(profile: Profile, goal: UserGoal, latestWeightKg?: number, nutrition: NutrientTotals = emptyNutritionTotals()): TodayDashboardData {
  const waterUnit = profile.unit_system === 'imperial' ? 'fl oz' : 'ml';
  return {
    profile,
    goal,
    welcomeName: profile.display_name ?? profile.first_name ?? 'there',
    targets: [
      { key: 'calories', label: 'Calories', current: nutrition.calories, target: goal.daily_calorie_target, unit: null },
      { key: 'protein', label: 'Protein', current: nutrition.protein_g, target: goal.daily_protein_target, unit: 'g' },
      { key: 'carbs', label: 'Carbs', current: nutrition.carbs_g, target: goal.daily_carbs_target, unit: 'g' },
      { key: 'fat', label: 'Fat', current: nutrition.fat_g, target: goal.daily_fat_target, unit: 'g' },
      { key: 'water', label: 'Water', current: waterFromMilliliters(nutrition.water_ml, profile.unit_system), target: waterFromMilliliters(goal.daily_water_target, profile.unit_system), unit: waterUnit },
      { key: 'steps', label: 'Steps', current: 0, target: goal.daily_step_target, unit: null },
    ],
    weightGoal: {
      starting: weightFromKilograms(goal.starting_weight, profile.unit_system),
      current: weightFromKilograms(latestWeightKg ?? goal.starting_weight, profile.unit_system),
      target: weightFromKilograms(goal.goal_weight, profile.unit_system),
      unit: weightLabel(profile.unit_system),
    },
    nextActions: ['Log today’s meals', 'Add water as you drink it', 'Review your Progress trend'],
  };
}
