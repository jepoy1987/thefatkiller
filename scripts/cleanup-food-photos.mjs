/** Run daily or more often with a trusted operational runner. This does NOT install a scheduler.
 * node scripts/cleanup-food-photos.mjs --local uses only local Docker credentials.
 * Otherwise requires explicit SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY environment variables.
 * Reports counts only; never prints paths, tokens, images, results or user identities.
 */
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const require=createRequire(new URL('../apps/web/package.json',import.meta.url));
const {createClient}=require('@supabase/supabase-js');
let url=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(process.argv.includes('--local')){const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--output','json'],{encoding:'utf8',stdio:['ignore','pipe','ignore']}));url=status.API_URL;key=status.SERVICE_ROLE_KEY;}
if(!url||!key)throw new Error('Explicit database URL and server credential required.');
const client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await client.from('food_photo_analyses').select('id,user_id,storage_path').neq('status','expired').lte('expires_at',new Date().toISOString()).order('expires_at').limit(100);
if(error)throw new Error('Cleanup query failed.');
let cleared=0,failed=0;
for(const row of data){
 if(row.storage_path){const removal=await client.storage.from('food-analysis').remove([row.storage_path]);if(removal.error){failed++;continue;}const clear=await client.rpc('clear_food_photo_storage',{p_id:row.id,p_user_id:row.user_id,p_path:row.storage_path});if(clear.error){failed++;continue;}}
 const expired=await client.rpc('expire_food_photo',{p_id:row.id,p_user_id:row.user_id});if(expired.error||!expired.data)failed++;else cleared++;
}
console.log(JSON.stringify({examined:data.length,cleared,failed}));
if(failed)process.exitCode=1;
