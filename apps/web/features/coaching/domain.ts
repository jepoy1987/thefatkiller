import type { CoachClientSummary, CoachGoalStatus, UnitSystem } from '@tfk/types';
import { calculateTFKScore, localDate, localDateWindow } from '@tfk/scoring';
import { weightFromKilograms, weightLabel } from '@tfk/validation';

export function coachingScore(client: CoachClientSummary) {
  return client.score_input ? calculateTFKScore(client.score_input) : null;
}

export function attentionLabel(client: CoachClientSummary) {
  const dates = localDateWindow(client.today);
  const accountability = client.availability.accountability ? client.accountability : null;
  if (accountability && (!accountability.last_check_in || accountability.last_check_in < dates[3]!)) return 'Check-in overdue';
  const score = coachingScore(client);
  if ((score && score.overall < 60) || (accountability && accountability.habit_opportunities > 0 && accountability.habit_completion_pct < 60)) return 'Low recent consistency';
  if (client.availability.nutrition && client.nutrition && client.nutrition.logged_days_7d < 4) return 'Low recent consistency';
  if (client.availability.progress && client.progress && (!client.progress.last_weigh_in || localDate(client.timezone, new Date(client.progress.last_weigh_in)) < dates[0]!)) return 'Needs review';
  return score ? 'On track' : 'Some summaries not shared';
}

export function displayWeight(value: number | null | undefined, units: UnitSystem) {
  return value == null ? 'Not shared or recorded' : `${weightFromKilograms(value, units).toFixed(1)} ${weightLabel(units)}`;
}
export function canArchiveGoal(status: CoachGoalStatus) { return status === 'active' || status === 'completed'; }
