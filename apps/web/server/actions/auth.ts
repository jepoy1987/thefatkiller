'use server';

import { emailSchema, loginSchema, resetPasswordSchema, signupSchema } from '@tfk/validation';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { createClient } from '../../lib/supabase/server';
import { requireUser } from '../../lib/data/session';
import { getAppOrigin } from '../../lib/origin';
import { formValue, redirectWithError } from './form';

const LOGIN_ERROR = 'Email or password is incorrect, or the account is unavailable.';
const SIGNUP_ERROR = 'Account creation is temporarily unavailable. Please wait and try again.';
const RECOVERY_SEND_ERROR = 'Reset email could not be sent right now. Please wait and try again.';
const PASSWORD_UPDATE_ERROR = 'Password could not be updated. Request a new recovery link and try again.';

async function getRequestAppOrigin() {
  return getAppOrigin((await headers()).get('origin') ?? undefined);
}

export async function login(data: FormData) {
  const parsed = loginSchema.safeParse({ email: formValue(data, 'email'), password: formValue(data, 'password') });
  if (!parsed.success) return redirectWithError('/login', parsed.error.issues[0]?.message ?? 'Invalid login');
  const { error } = await (await createClient()).auth.signInWithPassword(parsed.data);
  if (error) redirectWithError('/login', LOGIN_ERROR);
  redirect('/dashboard');
}

export async function signup(data: FormData) {
  const parsed = signupSchema.safeParse({ email: formValue(data, 'email'), password: formValue(data, 'password') });
  if (!parsed.success) return redirectWithError('/signup', parsed.error.issues[0]?.message ?? 'Invalid signup');
  const { error } = await (await createClient()).auth.signUp({ ...parsed.data, options: { emailRedirectTo: `${await getRequestAppOrigin()}/auth/callback` } });
  if (error) redirectWithError('/signup', SIGNUP_ERROR);
  redirect('/login?message=Check your email to confirm your account.');
}

export async function forgotPassword(data: FormData) {
  const parsed = emailSchema.safeParse(formValue(data, 'email'));
  if (!parsed.success) return redirectWithError('/forgot-password', 'Enter a valid email address.');
  const { error } = await (await createClient()).auth.resetPasswordForEmail(parsed.data, { redirectTo: `${await getRequestAppOrigin()}/auth/recovery-callback` });
  if (error) redirectWithError('/forgot-password', RECOVERY_SEND_ERROR);
  redirect('/forgot-password?message=If the account exists, a reset link has been sent.');
}

export async function updateRecoveredPassword(data: FormData) {
  if ((await cookies()).get('tfk_recovery')?.value !== '1') redirect('/forgot-password?error=Start%20from%20a%20valid%20password%20recovery%20link.');
  const parsed = resetPasswordSchema.safeParse({ password: String(data.get('password') ?? ''), confirm_password: String(data.get('confirm_password') ?? '') });
  if (!parsed.success) redirectWithError('/reset-password', parsed.error.issues[0]?.message ?? 'Invalid password.');
  const supabase = (await createClient());
  await requireUser(supabase);
  const { error } = await supabase.auth.updateUser({ password: parsed.data!.password });
  if (error) redirectWithError('/reset-password', PASSWORD_UPDATE_ERROR);
  (await cookies()).delete('tfk_recovery');
  redirect('/dashboard?message=Password%20updated%20successfully.');
}

export async function logout() {
  const supabase = (await createClient());
  await requireUser(supabase);
  const { error } = await supabase.auth.signOut();
  if (error) redirectWithError('/dashboard', 'Logout could not be completed. Please try again.');
  redirect('/login');
}
