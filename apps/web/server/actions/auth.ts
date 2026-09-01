'use server';

import { loginSchema, resetPasswordSchema, signupSchema } from '@tfk/validation';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '../../lib/supabase/server';
import { requireUser } from '../../lib/data/session';
import { getAppOrigin } from '../../lib/origin';
import { formValue, redirectWithError } from './form';

export async function login(data: FormData) {
  const parsed = loginSchema.safeParse({ email: formValue(data, 'email'), password: formValue(data, 'password') });
  if (!parsed.success) return redirectWithError('/login', parsed.error.issues[0]?.message ?? 'Invalid login');
  const { error } = await createClient().auth.signInWithPassword(parsed.data);
  if (error) redirectWithError('/login', error.message);
  redirect('/dashboard');
}

export async function signup(data: FormData) {
  const parsed = signupSchema.safeParse({ email: formValue(data, 'email'), password: formValue(data, 'password') });
  if (!parsed.success) return redirectWithError('/signup', parsed.error.issues[0]?.message ?? 'Invalid signup');
  const { error } = await createClient().auth.signUp({ ...parsed.data, options: { emailRedirectTo: `${getAppOrigin()}/auth/callback` } });
  if (error) redirectWithError('/signup', error.message);
  redirect('/login?message=Check your email to confirm your account.');
}

export async function forgotPassword(data: FormData) {
  const email = formValue(data, 'email');
  const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${getAppOrigin()}/auth/recovery-callback` });
  if (error) redirectWithError('/forgot-password', error.message);
  redirect('/forgot-password?message=If the account exists, a reset link has been sent.');
}

export async function updateRecoveredPassword(data: FormData) {
  if (cookies().get('tfk_recovery')?.value !== '1') redirect('/forgot-password?error=Start%20from%20a%20valid%20password%20recovery%20link.');
  const parsed = resetPasswordSchema.safeParse({ password: String(data.get('password') ?? ''), confirm_password: String(data.get('confirm_password') ?? '') });
  if (!parsed.success) redirectWithError('/reset-password', parsed.error.issues[0]?.message ?? 'Invalid password.');
  const supabase = createClient();
  await requireUser(supabase);
  const { error } = await supabase.auth.updateUser({ password: parsed.data!.password });
  if (error) redirectWithError('/reset-password', error.message);
  cookies().delete('tfk_recovery');
  redirect('/dashboard?message=Password%20updated%20successfully.');
}

export async function logout() {
  const supabase = createClient();
  await requireUser(supabase);
  await supabase.auth.signOut();
  redirect('/login');
}
