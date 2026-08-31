import Link from 'next/link';
import { AuthShell } from '../../components/layout/auth-shell';
import { Alert } from '../../components/ui/alert';
import { FormField, Input } from '../../components/ui/form';
import { SubmitButton } from '../../components/forms/submit-button';
import { login } from '../../server/actions/auth';

export default function LoginPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  return (
    <AuthShell eyebrow="Welcome back" title="Log in to your plan" description="Pick up where you left off and see what matters today." footer={<>New to TFK? <Link className="font-bold text-primary hover:underline" href="/signup">Create an account</Link></>}>
      <div className="grid gap-4">{searchParams.error ? <Alert variant="error">{searchParams.error}</Alert> : null}{searchParams.message ? <Alert variant="success">{searchParams.message}</Alert> : null}</div>
      <form action={login} className="mt-5 grid gap-5"><FormField id="login-email" label="Email address"><Input id="login-email" name="email" required autoComplete="email" type="email" placeholder="you@example.com" /></FormField><FormField id="login-password" label="Password"><Input id="login-password" name="password" required autoComplete="current-password" minLength={8} type="password" placeholder="Enter your password" /></FormField><div className="flex justify-end"><Link className="text-sm font-semibold text-primary hover:underline" href="/forgot-password">Forgot password?</Link></div><SubmitButton className="w-full" pendingLabel="Logging in…">Continue</SubmitButton></form>
    </AuthShell>
  );
}
