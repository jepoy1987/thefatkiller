// Local-only HTTP benchmark. Credentials and synthetic health records never leave
// this process/local Supabase. The disposable account is removed in finally.
import { createRequire } from 'node:module';
import { execFileSync, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync, openSync, closeSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
const require=createRequire(process.cwd()+'/apps/web/package.json');
const {createClient}=require('@supabase/supabase-js');
const {createServerClient}=require('@supabase/ssr');
const config=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--output','json'],{stdio:['ignore','pipe','ignore'],encoding:'utf8'}));
if(!/^http:\/\/(127\.0\.0\.1|localhost):/.test(config.API_URL))throw new Error('Local database required');
const webDirectory=process.cwd()+'/apps/web';
const nextBinary=webDirectory+'/node_modules/next/dist/bin/next';
const label=process.argv[2]||'baseline';
if(!/^[a-z-]+$/.test(label))throw new Error('Invalid label');
const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,{auth:{persistSession:false}});
const env={...process.env,TFK_PERFORMANCE_LOGS:'1',NEXT_PUBLIC_SUPABASE_URL:config.API_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY:config.ANON_KEY,SUPABASE_SERVICE_ROLE_KEY:config.SERVICE_ROLE_KEY,OPENAI_API_KEY:'',AI_WEEKLY_MODEL:'',AI_FOOD_MODEL:'',NEXT_PUBLIC_APP_URL:'http://localhost:3014'};
const output='/tmp/tfk-s14-'+label;
const buildLog=openSync(output+'-build.log','w',0o600);
try {execFileSync(process.execPath,[nextBinary,'build'],{env,cwd:webDirectory,stdio:['ignore',buildLog,buildLog]});}finally{closeSync(buildLog);}
const log=openSync(output+'-server.log','w',0o600);
const server=spawn(process.execPath,[nextBinary,'start','-p','3014'],{env,cwd:webDirectory,stdio:['ignore',log,log]});
let uid; let secondUid;
const sql=q=>execFileSync('docker',['exec','-i','supabase_db_tfk','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:q,encoding:'utf8',stdio:['pipe','pipe','pipe']});
try{
 for(let i=0;i<120;i++){try{await fetch('http://localhost:3014/login');break;}catch{await new Promise(r=>setTimeout(r,250));}}
 const password=randomUUID()+'aA!1',email='launch-perf-'+randomUUID()+'@local.test';
 const made=await admin.auth.admin.createUser({email,password,email_confirm:true});if(made.error)throw new Error('Fixture creation failed');uid=made.data.user.id;
 sql(`update public.profiles set timezone='Asia/Manila',onboarding_completed=true where id='${uid}';
 insert into public.user_subscriptions(user_id,plan_id,status,provider) select '${uid}',id,'active','internal' from public.plans where code='premium';
 insert into public.user_goals(user_id,goal_type,starting_weight,goal_weight,height,activity_level,daily_calorie_target,daily_protein_target,daily_carbs_target,daily_fat_target,daily_water_target,daily_step_target) values('${uid}','maintain_weight',80,80,175,'moderately_active',2000,120,250,60,2000,8000);
 insert into public.weight_entries(user_id,weight_kg,recorded_at) select '${uid}',80+(i%10)*.1,now()-i*interval '1 day' from generate_series(0,399)i;
 insert into public.food_logs(user_id,meal_type,food_name_snapshot,servings,serving_size_snapshot,serving_unit_snapshot,calories,protein_g,carbs_g,fat_g,logged_at) select '${uid}','lunch','Synthetic meal',1,1,'serving',400,25,50,10,now()-i*interval '2 hours' from generate_series(0,4799)i;
 insert into public.water_logs(user_id,amount_ml,logged_at) select '${uid}',250,now()-i*interval '3 hours' from generate_series(0,3199)i;
 insert into public.habits(user_id,name,created_at) select '${uid}','Synthetic habit '||i,now()-interval '400 days' from generate_series(1,10)i;
 insert into public.habit_completions(habit_id,user_id,completed_on) select h.id,'${uid}',current_date-i from public.habits h cross join generate_series(0,399)i where h.user_id='${uid}';
 insert into public.daily_check_ins(user_id,check_in_date) select '${uid}',current_date-i from generate_series(0,399)i;
 insert into public.workout_sessions(user_id,name_snapshot,started_at,completed_at,status) select '${uid}','Synthetic workout',now()-i*interval '1 day'-interval '1 hour',now()-i*interval '1 day','completed' from generate_series(0,199)i;
 insert into public.workout_session_exercises(workout_session_id,exercise_name_snapshot,tracking_type_snapshot,position) select id,'Synthetic exercise','sets_reps',0 from public.workout_sessions where user_id='${uid}';
 insert into public.workout_set_logs(workout_session_exercise_id,set_number,reps,weight_kg) select e.id,i,10,20 from public.workout_session_exercises e join public.workout_sessions s on s.id=e.workout_session_id cross join generate_series(1,5)i where s.user_id='${uid}';
 insert into public.notifications(user_id,type,title,message,dedupe_key,created_at) select '${uid}','system','Synthetic notice','Benchmark fixture','benchmark-'||i,now()-i*interval '1 hour' from generate_series(1,2000)i;`);
 const jar=new Map();const owner=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))}});
 const login=await owner.auth.signInWithPassword({email,password});if(login.error)throw new Error('Fixture login failed');
 const cookie=[...jar].map(([n,v])=>n+'='+v).join('; ');
 const routes=['/dashboard','/progress','/nutrition','/check-ins','/glp1','/training','/notifications','/reports','/insights','/coaching','/settings/profile'];const results=[];
 for(const route of routes){const samples=[];for(let i=0;i<6;i++){const logStart=readFileSync(output+'-server.log','utf8').length;const t=performance.now();const r=await fetch('http://localhost:3014'+route,{headers:{cookie},redirect:'manual'});const headersMs=performance.now()-t;const body=await r.text();const totalMs=performance.now()-t;const dataCalls=readFileSync(output+'-server.log','utf8').slice(logStart).split('\n').filter(x=>x.startsWith('{"event":"data_request"')).map(x=>JSON.parse(x));if(i)samples.push({status:r.status,headersMs:Math.round(headersMs),totalMs:Math.round(totalMs),bytes:Buffer.byteLength(body),dataCalls});}results.push({route,samples});}
 const secondPassword=randomUUID()+'aA!1',secondEmail='launch-isolation-'+randomUUID()+'@local.test';
 const second=await admin.auth.admin.createUser({email:secondEmail,password:secondPassword,email_confirm:true});if(second.error)throw new Error('Isolation fixture creation failed');secondUid=second.data.user.id;
 sql(`update public.profiles set first_name='Local Alpha' where id='${uid}';update public.profiles set first_name='Local Bravo',onboarding_completed=true where id='${secondUid}';`);
 const jarB=new Map();const ownerB=createServerClient(config.API_URL,config.ANON_KEY,{cookies:{getAll:()=>[...jarB].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jarB.set(c.name,c.value))}});
 if((await ownerB.auth.signInWithPassword({email:secondEmail,password:secondPassword})).error)throw new Error('Isolation login failed');
 const cookieB=[...jarB].map(([n,v])=>n+'='+v).join('; ');
 await Promise.all(Array.from({length:10},async(_,i)=>{const isA=i%2===0;const response=await fetch('http://localhost:3014/settings/profile',{headers:{cookie:isA?cookie:cookieB},redirect:'manual'});const body=await response.text();if(response.status!==200||!body.includes(isA?'Local Alpha':'Local Bravo')||body.includes(isA?'Local Bravo':'Local Alpha'))throw new Error('Request cache isolation failed');}));
 console.log('Concurrent authenticated HTTP cache isolation: 10/10 passed');
 const plans=sql(`begin;set local role authenticated;select set_config('request.jwt.claim.sub','${uid}',true);explain (analyze,buffers,format json) select weight_kg from public.weight_entries order by recorded_at desc limit 1;rollback;`);
 // UUID is synthetic but still redact from stored query-plan artifacts.
 writeFileSync(output+'-plan.json',plans.replaceAll(uid,'LOCAL_FIXTURE'),{mode:0o600});
 writeFileSync(output+'.json',JSON.stringify({label,kind:'authenticated local HTTP; not browser click timing',fixture:{weights:400,foodLogs:4800,waterLogs:3200,habitCompletions:4000,checkIns:400,workouts:200,sets:1000,notifications:2000},results},null,2),{mode:0o600});
 console.log(JSON.stringify(results.map(x=>({route:x.route,statuses:[...new Set(x.samples.map(s=>s.status))],medianMs:[...x.samples.map(s=>s.totalMs)].sort((a,b)=>a-b)[2]}))));
} finally {if(secondUid){const r=await admin.auth.admin.deleteUser(secondUid);if(r.error)throw new Error('Isolation cleanup failed');}if(uid){const r=await admin.auth.admin.deleteUser(uid);if(r.error)throw new Error('Fixture cleanup failed');}server.kill('SIGTERM');closeSync(log);console.log('Local benchmark fixture removed');}
