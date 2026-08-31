'use server';

import { loginSchema, signupSchema } from '@tfk/validation';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/supabase/server';
import { requireUser } from '../../lib/data/session';
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
  const { error } = await createClient().auth.signUp({ ...parsed.data, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/auth/callback` } });
  if (error) redirectWithError('/signup', error.message);
  redirect('/login?message=Check your email to confirm your account.');
}

export async function forgotPassword(data: FormData) {
  const email = formValue(data, 'email');
  const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/auth/callback?next=/settings/profile` });
  if (error) redirectWithError('/forgot-password', error.message);
  redirect('/forgot-password?message=If the account exists, a reset link has been sent.');
}

export async function logout() {
  const supabase = createClient();
  await requireUser(supabase);
  await supabase.auth.signOut();
  redirect('/login');
}
