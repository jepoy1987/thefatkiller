import { cache } from 'react';
import { redirect } from 'next/navigation';
import type { WebSupabaseClient } from './client';
import { createClient } from './client';

export async function getCurrentUser() {
  return (await createClient()).auth.getUser();
}

export const requireUser = cache(async function requireUser(supabase: WebSupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  return user;
});
