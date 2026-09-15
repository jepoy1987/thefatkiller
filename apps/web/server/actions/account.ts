'use server';
import { redirect } from 'next/navigation';
import { createClient } from '../../lib/data/client';
import { requireUser } from '../../lib/data/session';
export async function requestAccountDeletion(form: FormData) {
 const client=await createClient();await requireUser(client);
 if(form.get('confirmation')!=='DELETE MY ACCOUNT') redirect('/settings/account?error=confirmation');
 const {error}=await client.rpc('request_account_deletion',{p_confirmation:'DELETE MY ACCOUNT'});
 if(error) redirect('/settings/account?error=unavailable');
 await client.auth.signOut({scope:'global'});
 redirect('/account-deletion-requested');
}
