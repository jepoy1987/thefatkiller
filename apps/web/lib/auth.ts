import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Profile } from '@tfk/types';

export async function requireProfile(options: { requireOnboarding?: boolean } = {}) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (error || !profile) throw new Error('Your profile could not be loaded.');
  if (options.requireOnboarding !== false && !profile.onboarding_completed) redirect('/onboarding');
  return { user, profile: profile as Profile };
}
