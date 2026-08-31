import Link from 'next/link';
import { AuthShell } from '../../components/layout/auth-shell';
import { Alert } from '../../components/ui/alert';
import { FormField, Input } from '../../components/ui/form';
import { SubmitButton } from '../../components/forms/submit-button';
import { forgotPassword } from '../../server/actions/auth';

export default function ForgotPasswordPage({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  return (
    <AuthShell eyebrow="Account recovery" title="Reset your password" description="We’ll send a secure reset link to your account email." footer={<Link className="font-bold text-primary hover:underline" href="/login">Back to log in</Link>}>
      <div className="grid gap-4">{searchParams.error ? <Alert variant="error">{searchParams.error}</Alert> : null}{searchParams.message ? <Alert variant="success">{searchParams.message}</Alert> : null}</div>
      <form action={forgotPassword} className="mt-5 grid gap-5"><FormField id="reset-email" label="Email address"><Input id="reset-email" name="email" required autoComplete="email" type="email" placeholder="you@example.com" /></FormField><SubmitButton className="w-full" pendingLabel="Sending link…">Send reset link</SubmitButton></form>
    </AuthShell>
  );
}
