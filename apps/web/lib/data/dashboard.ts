import { mapTodayDashboard } from '@tfk/api';
import { redirect } from 'next/navigation';
import { createClient } from './client';
import { getActiveGoal } from './goals';
import { getProfile } from './profile';
import { requireUser } from './session';
import { getLatestWeight } from './progress';

export async function getDashboardFoundation() {
  const supabase = createClient();
  const user = await requireUser(supabase);
  const [profile, goal, latestWeight] = await Promise.all([getProfile(supabase, user.id), getActiveGoal(supabase), getLatestWeight(supabase)]);
  if (!profile.onboarding_completed || !goal) redirect('/onboarding');
  return { user, dashboard: mapTodayDashboard(profile, goal, latestWeight) };
}

export async function getOnboardingFoundation() {
  const supabase = createClient();
  const user = await requireUser(supabase);
  const [profile, goal] = await Promise.all([getProfile(supabase, user.id), getActiveGoal(supabase)]);
  if (profile.onboarding_completed && goal) redirect('/dashboard');
  return { user, profile };
}
