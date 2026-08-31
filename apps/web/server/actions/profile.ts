'use server';

import { profileSchema } from '@tfk/validation';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/data/client';
import { updateCurrentProfile } from '../../lib/data/profile';
import { requireUser } from '../../lib/data/session';
import { formValue, redirectWithError } from './form';

export async function updateProfile(data: FormData) {
  const parsed = profileSchema.safeParse({ first_name: formValue(data, 'first_name'), last_name: formValue(data, 'last_name'), display_name: formValue(data, 'display_name'), date_of_birth: formValue(data, 'date_of_birth') || null, unit_system: formValue(data, 'unit_system') });
  if (!parsed.success) return redirectWithError('/settings/profile', parsed.error.issues[0]?.message ?? 'Invalid profile');
  const supabase = createClient();
  const user = await requireUser(supabase);
  const { error } = await updateCurrentProfile(supabase, user.id, parsed.data);
  if (error) redirectWithError('/settings/profile', error.message);
  redirect('/settings/profile?message=Profile saved.');
}
