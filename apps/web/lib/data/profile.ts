import type { Profile } from '@tfk/types';
import type { ProfileInput as ValidatedProfileInput } from '@tfk/validation';
import { redirect } from 'next/navigation';
import { createClient, type WebSupabaseClient } from './client';
import { requireUser } from './session';

export async function getProfile(supabase: WebSupabaseClient, userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) throw new Error('Your profile could not be loaded.');
  return data as Profile;
}

export async function getCurrentProfile(options: { requireOnboarding?: boolean } = {}) {
  const supabase = createClient();
  const user = await requireUser(supabase);
  const profile = await getProfile(supabase, user.id);
  if (options.requireOnboarding !== false && !profile.onboarding_completed) redirect('/onboarding');
  return { supabase, user, profile };
}

export async function updateCurrentProfile(supabase: WebSupabaseClient, userId: string, input: ValidatedProfileInput) {
  return supabase.from('profiles').update(input).eq('id', userId);
}
