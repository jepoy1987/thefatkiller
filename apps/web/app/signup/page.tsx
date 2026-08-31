import Link from 'next/link';
import { AuthShell } from '../../components/layout/auth-shell';
import { Alert } from '../../components/ui/alert';
import { FormField, Input } from '../../components/ui/form';
import { SubmitButton } from '../../components/forms/submit-button';
import { signup } from '../../server/actions/auth';

export default function SignupPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <AuthShell eyebrow="Start with clarity" title="Create your account" description="Set your daily targets once, then keep the plan simple." footer={<>Already have an account? <Link className="font-bold text-primary hover:underline" href="/login">Log in</Link></>}>
      {searchParams.error ? <Alert variant="error">{searchParams.error}</Alert> : null}
      <form action={signup} className="mt-5 grid gap-5"><FormField id="signup-email" label="Email address"><Input id="signup-email" name="email" required autoComplete="email" type="email" placeholder="you@example.com" /></FormField><FormField id="signup-password" label="Password" hint="Use at least 8 characters."><Input id="signup-password" name="password" required autoComplete="new-password" minLength={8} type="password" placeholder="Create a secure password" /></FormField><SubmitButton className="w-full" pendingLabel="Creating account…">Create account</SubmitButton></form>
    </AuthShell>
  );
}
