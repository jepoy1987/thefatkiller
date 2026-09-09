import { calculateHabitStreak, calculateTFKScore, habitAdherence, localDate, localDateWindow, mondayFor } from '@tfk/scoring';
import type { AccountabilitySummary, DailyCheckIn, Habit, HabitCompletion, ScoreInput, WeeklyCheckIn } from '@tfk/types';
import { redirect } from 'next/navigation';
import { createClient } from './client';
import { getActiveGoal } from './goals';
import { getProfile } from './profile';
import { requireUser } from './session';

export async function getAccountabilityFoundation() {
  const supabase = createClient();
  const user = await requireUser(supabase);
  const [profile, goal] = await Promise.all([getProfile(supabase, user.id), getActiveGoal(supabase)]);
  if (!profile.onboarding_completed || !goal) redirect('/onboarding');
  const today = localDate(profile.timezone);
  const startDate = localDateWindow(today)[0]!;
  const [habitsResult, completionsResult, dailyResult, weeklyResult, scoreResult] = await Promise.all([
    supabase.from('habits').select('*').order('sort_order').order('created_at'),
    supabase.from('habit_completions').select('*').gte('completed_on', startDate).lte('completed_on', today),
    supabase.from('daily_check_ins').select('*').lte('check_in_date', today).order('check_in_date', { ascending: false }).limit(7),
    supabase.from('weekly_check_ins').select('*').order('week_start', { ascending: false }).limit(8),
    supabase.rpc('get_accountability_score_input'),
  ]);
  if ([habitsResult, completionsResult, dailyResult, weeklyResult, scoreResult].some(result => result.error) || !scoreResult.data) {
    throw new Error('Accountability data could not be loaded.');
  }
  const habits = (habitsResult.data ?? []) as Habit[];
  const activeHabits = habits.filter(habit => habit.is_active && habit.frequency === 'daily' && localDate(profile.timezone, new Date(habit.created_at)) <= today);
  const completions = (completionsResult.data ?? []) as HabitCompletion[];
  const daily = (dailyResult.data ?? []) as DailyCheckIn[];
  const weekly = (weeklyResult.data ?? []) as WeeklyCheckIn[];
  const summary: AccountabilitySummary = {
    today, weekStart: mondayFor(today), activeHabits: activeHabits.length,
    completedHabits: completions.filter(row => row.completed_on === today && activeHabits.some(habit => habit.id === row.habit_id)).length,
    dailyCheckInComplete: daily.some(row => row.check_in_date === today),
    streaks: habits.filter(habit => habit.is_active).map(habit => {
      const dates = completions.filter(row => row.habit_id === habit.id).map(row => row.completed_on);
      const streak = calculateHabitStreak(habit.id, dates, today, 7, localDate(profile.timezone, new Date(habit.created_at)));
      return { ...streak, completion_rate: habitAdherence(habit, dates, today, profile.timezone).rate ?? 0 };
    }),
    // Owner and coach consume the same SQL daily aggregates and Sprint 5 formula.
    score: calculateTFKScore(scoreResult.data as unknown as ScoreInput),
  };
  return { user, profile, goal, habits, activeHabits, completions, dailyCheckIns: daily, weeklyCheckIns: weekly, summary };
}
export async function getAccountabilitySummary() { return (await getAccountabilityFoundation()).summary; }
