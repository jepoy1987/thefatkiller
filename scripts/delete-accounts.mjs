/** Trusted operator runner; never logs identities, paths or credentials. */
import {execFileSync} from 'node:child_process';
import {processAccountDeletions} from '../apps/web/server/account/deletion.ts';
let url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(process.argv.includes('--local')){const s=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));url=s.API_URL;key=s.SERVICE_ROLE_KEY;}
if(!url||!key)throw new Error('Explicit worker configuration required');
try {const result=await processAccountDeletions({url,key});console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;} catch {console.error('Account deletion worker failed');process.exitCode=1;}
