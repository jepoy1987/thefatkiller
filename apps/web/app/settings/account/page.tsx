import { SettingsShell } from '../../../components/layout/settings-shell';
import { SubmitButton } from '../../../components/forms/submit-button';
import { createClient } from '../../../lib/data/client';
import { requireUser } from '../../../lib/data/session';
import { requestAccountDeletion } from '../../../server/actions/account';
export default async function AccountSettings(props:{searchParams:Promise<{error?:string}>}){
 await requireUser(await createClient());const params=await props.searchParams;
 return <SettingsShell active="account"><section className="max-w-xl space-y-4"><h1 className="text-2xl font-bold">Delete account</h1><p>This permanently removes your private photos, insights, logs, training and coaching data, and account identity. Shared records follow their existing ownership rules. It cannot be undone.</p><p>Deletion runs after private photo cleanup. If cleanup fails, your account remains queued with new writes blocked.</p>{params.error?<p role="alert">Deletion was not requested. Check the confirmation and try again.</p>:null}<form action={requestAccountDeletion} className="grid gap-4"><label htmlFor="delete-confirmation">Type DELETE MY ACCOUNT to confirm</label><input id="delete-confirmation" name="confirmation" required pattern="DELETE MY ACCOUNT" autoComplete="off" className="rounded border p-3"/><SubmitButton variant="danger" pendingLabel="Requesting deletion…">Permanently delete my account</SubmitButton></form></section></SettingsShell>;
}
