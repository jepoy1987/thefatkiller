'use server';

import { redirect } from 'next/navigation';
import { loginSchema, onboardingSchema, profileSchema, signupSchema } from '@tfk/validation';
import { createClient } from '../lib/supabase/server';

const value = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
const fail = (path: string, message: string): never => redirect(`${path}?error=${encodeURIComponent(message)}`);

export async function login(data: FormData) {
  const parsed = loginSchema.safeParse({ email: value(data, 'email'), password: value(data, 'password') });
  if (!parsed.success) return fail('/login', parsed.error.issues[0]?.message ?? 'Invalid login');
  const { error } = await createClient().auth.signInWithPassword(parsed.data);
  if (error) fail('/login', error.message);
  redirect('/dashboard');
}

export async function signup(data: FormData) {
  const parsed = signupSchema.safeParse({ email: value(data, 'email'), password: value(data, 'password') });
  if (!parsed.success) return fail('/signup', parsed.error.issues[0]?.message ?? 'Invalid signup');
  const { error } = await createClient().auth.signUp({ ...parsed.data, options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/auth/callback` } });
  if (error) fail('/signup', error.message);
  redirect('/login?message=Check your email to confirm your account.');
}

export async function forgotPassword(data: FormData) {
  const email = value(data, 'email');
  const { error } = await createClient().auth.resetPasswordForEmail(email, { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'}/auth/callback?next=/settings/profile` });
  if (error) fail('/forgot-password', error.message);
  redirect('/forgot-password?message=If the account exists, a reset link has been sent.');
}

export async function completeOnboarding(data: FormData) {
  const parsed = onboardingSchema.safeParse({ first_name: value(data, 'first_name'), last_name: value(data, 'last_name'), display_name: value(data, 'display_name'), date_of_birth: value(data, 'date_of_birth'), unit_system: value(data, 'unit_system') });
  if (!parsed.success) return fail('/onboarding', parsed.error.issues[0]?.message ?? 'Invalid profile');
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase.from('profiles').update({ ...parsed.data, onboarding_completed: true }).eq('id', user.id);
  if (error) fail('/onboarding', error.message);
  redirect('/dashboard');
}

export async function updateProfile(data: FormData) {
  const parsed = profileSchema.safeParse({ first_name: value(data, 'first_name'), last_name: value(data, 'last_name'), display_name: value(data, 'display_name'), date_of_birth: value(data, 'date_of_birth') || null, unit_system: value(data, 'unit_system') });
  if (!parsed.success) return fail('/settings/profile', parsed.error.issues[0]?.message ?? 'Invalid profile');
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { error } = await supabase.from('profiles').update(parsed.data).eq('id', user.id);
  if (error) fail('/settings/profile', error.message);
  redirect('/settings/profile?message=Profile saved.');
}

export async function logout() {
  await createClient().auth.signOut();
  redirect('/login');
}
