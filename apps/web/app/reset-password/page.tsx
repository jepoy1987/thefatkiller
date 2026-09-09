import Link from 'next/link';
import { SubmitButton } from '../../components/forms/submit-button';
import { AuthShell } from '../../components/layout/auth-shell';
import { Alert } from '../../components/ui/alert';
import { FormField, Input } from '../../components/ui/form';
import { createClient } from '../../lib/data/client';
import { requireUser } from '../../lib/data/session';
import { updateRecoveredPassword } from '../../server/actions/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ResetPasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  if (cookies().get('tfk_recovery')?.value !== '1') redirect('/forgot-password?error=Start%20from%20a%20valid%20password%20recovery%20link.');
  await requireUser(createClient());
  return <AuthShell eyebrow="Account recovery" title="Choose a new password" description="Set a secure password for future sign-ins." footer={<Link className="font-bold text-primary hover:underline" href="/dashboard">Return to dashboard</Link>}>
    {searchParams.error ? <Alert variant="error">{searchParams.error}</Alert> : null}
    <form action={updateRecoveredPassword} className="mt-5 grid gap-5">
      <FormField id="new-password" label="New password" hint="Use at least 8 characters."><Input id="new-password" name="password" required minLength={8} type="password" autoComplete="new-password" /></FormField>
      <FormField id="confirm-password" label="Confirm new password"><Input id="confirm-password" name="confirm_password" required minLength={8} type="password" autoComplete="new-password" /></FormField>
      <SubmitButton className="w-full" pendingLabel="Saving…">Save password</SubmitButton>
    </form>
  </AuthShell>;
}
