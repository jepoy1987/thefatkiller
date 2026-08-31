import { redirect } from 'next/navigation';
import type { WebSupabaseClient } from './client';
import { createClient } from './client';

export async function getCurrentUser() {
  return createClient().auth.getUser();
}

export async function requireUser(supabase: WebSupabaseClient) {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) redirect('/login');
  return user;
}
