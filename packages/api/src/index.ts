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
import type { ExerciseTrackingType, TrainingSummary, UnitSystem, WorkoutAssignment, WorkoutSession } from '@tfk/types';
export function trainingFields(type:ExerciseTrackingType) {
 return {reps:['sets_reps','bodyweight','other'].includes(type),weight:['sets_reps','other'].includes(type),duration:['duration','duration_distance','other'].includes(type),distance:['distance','duration_distance','other'].includes(type),rpe:['sets_reps','bodyweight','other'].includes(type)};
}
// Distance is displayed/input in meters or yards. Storage is always meters.
export const trainingDistanceToMeters=(value:number,units:UnitSystem)=>units==='imperial'?value*0.9144:value;
export const trainingDistanceFromMeters=(value:number,units:UnitSystem)=>units==='imperial'?value/0.9144:value;
export const trainingDistanceLabel=(units:UnitSystem)=>units==='imperial'?'yd':'m';
export function sessionDurationSeconds(session:Pick<WorkoutSession,'started_at'|'completed_at'>,now=new Date()) {
 const end=session.completed_at?new Date(session.completed_at):now;
 return Math.max(0,Math.floor((end.getTime()-new Date(session.started_at).getTime())/1000));
}
export function trainingDate(iso:string,timezone:string) {return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(iso));}
export function summarizeTraining(sessions:WorkoutSession[],assignments:WorkoutAssignment[],timezone:string,now=new Date()):TrainingSummary {
 const today=trainingDate(now.toISOString(),timezone);
 const day=(n:number)=>{const d=new Date(`${today}T12:00:00Z`);d.setUTCDate(d.getUTCDate()-n);return d.toISOString().slice(0,10);};
 const completed=sessions.filter(s=>s.status==='completed'&&s.completed_at&&new Date(s.completed_at)<=now);
 const inWindow=(date:string,days:number)=>date>=day(days-1)&&date<=today;
 const scheduled=assignments.filter(a=>a.status!=='archived'&&a.assigned_for&&inWindow(a.assigned_for,7));
 return {today,completed_7d:completed.filter(s=>inWindow(trainingDate(s.completed_at!,timezone),7)).length,completed_30d:completed.filter(s=>inWindow(trainingDate(s.completed_at!,timezone),30)).length,last_completed_at:completed.map(s=>s.completed_at!).sort().at(-1)??null,assigned_7d:scheduled.length,assigned_completed_7d:scheduled.filter(a=>a.status==='completed').length};
}
export const trainingAdherence=(s:Pick<TrainingSummary,'assigned_7d'|'assigned_completed_7d'>)=>s.assigned_7d?Math.round(100*s.assigned_completed_7d/s.assigned_7d):null;
export const assignmentCanStart=(status:WorkoutAssignment['status'])=>status==='assigned'||status==='in_progress';
