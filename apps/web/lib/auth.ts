import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Profile, UserGoal } from '@tfk/types';

export async function requireProfile(options: { requireOnboarding?: boolean } = {}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error || !profile) throw new Error('Your profile could not be loaded.');
  if (options.requireOnboarding !== false && !profile.onboarding_completed) redirect('/onboarding');
  return { user, profile: profile as Profile };
}

export async function requireDashboard() {
  const context = await requireProfile();
  const supabase = createClient();
  const { data: goal, error } = await supabase.from('user_goals').select('*').eq('is_active', true).maybeSingle();
  if (error) throw new Error('Your active goal could not be loaded.');
  if (!goal) redirect('/onboarding');
  return { ...context, goal: goal as UserGoal };
}
