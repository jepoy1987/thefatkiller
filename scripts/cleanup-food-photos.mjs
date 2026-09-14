/** Trusted manual entrypoint. Scheduled execution uses the protected web endpoint. */
import {execFileSync} from 'node:child_process';
import {cleanupFoodPhotoBatch} from '../apps/web/server/food-photo/cleanup.ts';
let url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(process.argv.includes('--local')){const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));url=status.API_URL;key=status.SERVICE_ROLE_KEY;}
if(!url||!key)throw new Error('Explicit database URL and server credential required.');
try{const result=await cleanupFoodPhotoBatch({url,key});console.log(JSON.stringify(result));if(result.failed)process.exitCode=1;}catch{console.error('Cleanup failed');process.exitCode=1;}
