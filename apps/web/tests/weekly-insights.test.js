import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import * as validation from '@tfk/validation';
import * as scoring from '@tfk/scoring';
async function load(path,imports={}){
 const source=await readFile(new URL(path,import.meta.url),'utf8');
 const context={exports:{},console,Date,AbortController,setTimeout,clearTimeout,fetch:()=>{throw new Error('Tests must not access a real provider');},require(name){if(name==='zod')return validationZod;if(name==='@tfk/validation')return validation;if(name==='@tfk/scoring')return scoring;if(name in imports)return imports[name];throw new Error('Unexpected import '+name);}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
 return context.exports;
}
const validationZod=await import('zod');
const domain=await load('../features/insights/domain.ts');
const provider=await load('../server/insights/provider.ts',{'../../features/insights/domain':domain});
const safety=await load('../server/ai/output-safety.ts');
const generation=await load('../server/insights/generation.ts',{'./provider':provider,'../../features/insights/domain':domain,'../ai/output-safety':safety});
function source(timezone='Asia/Manila',asOf='2026-09-14T14:00:00Z'){
 const end=scoring.localDate(timezone,new Date(asOf)),dates=scoring.localDateWindow(end);
 return {period:{start:dates[0],end,timezone,as_of:asOf,includes_today:true},unit_system:'metric',goal_type:'lose_weight',
 features:['ai_insights','progress_tracking','nutrition_tracking','water_tracking','habits','daily_check_ins','weekly_check_ins','tfk_score','workouts','glp1_journal'],
 starting_weight:90,latest_weight:89,first_period_weight:90,weigh_ins:2,water_logged_days:6,weekly_check_ins:1,coaching_available:true,coaching:{active_goals:2,completed_goals:1},training:{assigned:3,assigned_completed:2,completed:4,completed_days:3},
 score_input:{days:dates.map((date,i)=>({date,calories:i<6?2000:0,calorieTarget:2000,protein:i<5?150:0,proteinTarget:150,water:i<6?2500:0,waterTarget:2500,habitCompleted:i<4?1:0,habitAvailable:1,checkedIn:i<5,logged:i<6})),progressLogged:true,windowDays:7}};
}
function output(input){
 const fact=domain.insightFacts(input).find(f=>f.category==='nutrition')??domain.insightFacts(input)[0];
 return {...domain.weeklyNarrative,wins:[{title:domain.evidenceTitles[fact.category],evidence:fact.text,category:fact.category}],watch_items:[],next_week_focus:[{title:domain.focusTitles[fact.category],reason:fact.text,category:fact.category}],data_gaps:domain.insightDataGaps(input)};
}
const clean=x=>JSON.parse(JSON.stringify(x));
for(const [timezone,asOf] of [['UTC','2026-09-14T23:30:00Z'],['Asia/Manila','2026-09-14T23:30:00Z'],['America/Chicago','2026-03-09T04:30:00Z'],['America/Chicago','2026-11-02T05:30:00Z']]){
 test('exact seven local dates including DST: '+timezone+' '+asOf,()=>{
  const raw=source(timezone,asOf),input=domain.buildWeeklyInsightInput(raw);
  assert.deepEqual(clean(input.period.dates),scoring.localDateWindow(scoring.localDate(timezone,new Date(asOf))));
  assert.equal(new Set(input.period.dates).size,7);assert.equal(input.period.includes_today,true);
 });
}
test('nutrition, water, habits, check-ins, training and coaching aggregate deterministically',()=>{
 const i=domain.buildWeeklyInsightInput(source());
 assert.equal(i.nutrition.logged_days,6);assert.equal(i.nutrition.calorie_target_days,6);assert.equal(i.nutrition.protein_target_days,5);
 assert.equal(i.hydration.logged_days,6);assert.equal(i.hydration.target_days,6);assert.equal(i.habits.completed,4);assert.equal(i.habits.opportunities,7);
 assert.equal(i.daily_check_ins.completed_days,5);assert.equal(i.weekly_check_ins.completed_weeks,1);assert.equal(i.weekly_check_ins.eligible_weeks,2);
 assert.deepEqual(clean(i.training),{assigned:3,assigned_completed:2,completed:4,completed_days:3});assert.equal(i.coaching.completed_goals,1);
});
test('score exactly reuses canonical scorer, including breakdown',()=>{
 const raw=source();assert.deepEqual(clean(domain.buildWeeklyInsightInput(raw).score),scoring.calculateTFKScore(raw.score_input));
});
test('unavailable categories are null, not fabricated zeroes; partial score is withheld',()=>{
 const raw=source();raw.features=['ai_insights'];raw.coaching_available=false;
 const input=domain.buildWeeklyInsightInput(raw);
 for(const k of Object.keys(input.availability)){assert.equal(input.availability[k],false);assert.equal(input[k],null);}
});
test('missing logged data and targets are distinct from measured adherence',()=>{
 const raw=source();raw.weigh_ins=0;raw.latest_weight=null;raw.first_period_weight=null;
 raw.score_input.days.forEach(d=>Object.assign(d,{logged:false,calories:0,calorieTarget:0,protein:0,proteinTarget:0,habitAvailable:0,habitCompleted:0}));
 const i=domain.buildWeeklyInsightInput(raw);assert.equal(i.nutrition.logged_days,0);assert.equal(i.nutrition.calorie_target_days,null);assert.equal(i.progress.change,null);assert.equal(i.habits.completion_pct,null);
 assert.ok(domain.insightDataGaps(i).some(g=>g.includes('not zero intake')));
});
test('GLP-1, notes, photo URLs, billing identifiers and auth metadata never enter payload',()=>{
 const raw={...source(),glp1:{dose:2,notes:'PRIVATE_SENTINEL'},notes:'PRIVATE_SENTINEL',photo_url:'https://private.invalid/PRIVATE_SENTINEL',provider_id:'PRIVATE_SENTINEL',auth_metadata:'PRIVATE_SENTINEL'};
 raw.score_input.days[0].notes='PRIVATE_SENTINEL';
 const serialized=JSON.stringify(domain.buildWeeklyInsightInput(raw));
 assert.doesNotMatch(serialized,/PRIVATE_SENTINEL|glp1|notes|photo|provider_id|auth_metadata/);
});
test('weight is neutral and correctly converted to profile units',()=>{
 const raw=source();raw.unit_system='imperial';const i=domain.buildWeeklyInsightInput(raw);
 assert.equal(i.progress.weight_unit,'lb');assert.equal(i.progress.latest_weight,validation.weightFromKilograms(89,'imperial'));
 assert.match(domain.insightFacts(i).find(f=>f.text.startsWith('Weight changed')).text,/Weight changed by -/);
});
test('invalid/mismatched dates and inconsistent input availability are rejected',()=>{
 const raw=source();raw.period.start='2025-01-01';assert.throws(()=>domain.buildWeeklyInsightInput(raw));
 const i=domain.buildWeeklyInsightInput(source());i.availability.training=false;assert.equal(validation.weeklyInsightInputSchema.safeParse(i).success,false);
});
test('valid strict output accepted, extra fields, Markdown and fabricated evidence rejected',()=>{
 const i=domain.buildWeeklyInsightInput(source()),valid=output(i);
 assert.deepEqual(clean(domain.validateWeeklyInsightOutput(valid,i)),clean(valid));
 for(const bad of [{...valid,diagnosis:'not allowed'},{...valid,summary:'<script>alert()</script>'},{...valid,summary:'x'.repeat(701)},{...valid,wins:[{...valid.wins[0],evidence:'Nutrition was logged on 99 days.'}]},{...valid,data_gaps:[]},{...valid,headline:undefined}]){
  assert.throws(()=>domain.validateWeeklyInsightOutput(bad,i));
 }
});
for(const phrase of ['Increase medication dose','This diagnoses diabetes','Try starvation','Exercise caused weight loss','You lost 99 pounds','You were disciplined','Use compensatory exercise']){
 test('unsafe or invented narrative rejected: '+phrase,()=>{const i=domain.buildWeeklyInsightInput(source());assert.throws(()=>domain.validateWeeklyInsightOutput({...output(i),summary:phrase},i));});
}
test('prompt contract prohibits medicine, diagnosis, restriction, causation and fabricated data',()=>{
 for(const phrase of ['Do not diagnose','prescribe','medication changes','dose changes','Do not claim causation','extreme calorie restriction','invent data','Do not reward rapid weight loss','missing data','canonical'])assert.ok(domain.WEEKLY_SYSTEM_PROMPT.includes(phrase),phrase);
});
test('provider configuration requires both secret and approved model; no implicit model choice',()=>{
 assert.throws(()=>provider.providerConfig({}));assert.throws(()=>provider.providerConfig({OPENAI_API_KEY:'mock'}));
 assert.deepEqual(clean(provider.providerConfig({OPENAI_API_KEY:'mock',AI_WEEKLY_MODEL:'approved-test-model'})),{apiKey:'mock',model:'approved-test-model'});
});
test('provider uses structured Responses, bounded tokens, no storage and sanitized input',async()=>{
 const i=domain.buildWeeklyInsightInput(source());let calls=0;
 const result=await provider.requestWeeklyInsight(i,{apiKey:'test-only',model:'approved-test-model'},async(url,init)=>{
  calls++;assert.equal(url,'https://api.openai.com/v1/responses');const body=JSON.parse(init.body);assert.equal(body.store,false);assert.equal(body.text.format.strict,true);assert.equal(body.max_output_tokens,2200);assert.equal(body.model,'approved-test-model');assert.ok(init.signal);
  assert.doesNotMatch(body.input,/glp1|PRIVATE_SENTINEL/);
  return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(output(i))}]}],usage:{total_tokens:321}})};
 });
 assert.equal(calls,1);assert.equal(result.tokens,321);domain.validateWeeklyInsightOutput(result.output,i);
});
for(const response of [{ok:false,json:async()=>({secret:'PRIVATE_SENTINEL'})},{ok:true,json:async()=>({status:'incomplete',output:[]})},{ok:true,json:async()=>({status:'completed',output:[{content:[{type:'refusal',refusal:'PRIVATE_SENTINEL'}]}]})},{ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:'not JSON'}]}]})}]){
 test('provider failure/refusal/malformed response returns only safe code '+JSON.stringify(response),async()=>{
  await assert.rejects(()=>provider.requestWeeklyInsight(domain.buildWeeklyInsightInput(source()),{apiKey:'mock',model:'test'},async()=>response),e=>['provider_failed','invalid_output'].includes(e.message)&&!e.message.includes('PRIVATE_SENTINEL'));
 });
}
function dependencies(input){
 let row=null,calls=0;const logs=[];
 const deps={
  async claim(){if(row)return {id:'insight',claimed:false,status:row.status};row={status:'pending',attempt:1};return {id:'insight',claimed:true,attempt:1,status:'pending'};},
  async finish(id,attempt,result,model,error){row={status:error?'failed':'completed',result,error,model,attempt};return true;},
  async provider(){calls++;return {output:output(input),model:'mock',tokens:100};},
  log:e=>logs.push(e),
 };
 return {deps,row:()=>row,calls:()=>calls,logs,retry(){row=null;}};
}
test('completed insight reuse and concurrent duplicate prevention do not call provider again',async()=>{
 const i=domain.buildWeeklyInsightInput(source()),f=dependencies(i);
 const results=await Promise.all([generation.runWeeklyInsightGeneration(i,f.deps),generation.runWeeklyInsightGeneration(i,f.deps)]);
 assert.equal(f.calls(),1);assert.ok(results.some(r=>r.status==='completed'));
 await generation.runWeeklyInsightGeneration(i,f.deps);assert.equal(f.calls(),1);
});
test('provider failure stored safely; allowed retry can complete the same claim identity',async()=>{
 const i=domain.buildWeeklyInsightInput(source()),f=dependencies(i),good=f.deps.provider;
 f.deps.provider=async()=>{throw new Error('PRIVATE_SENTINEL provider internals');};
 const failed=await generation.runWeeklyInsightGeneration(i,f.deps);assert.equal(failed.status,'failed');assert.equal(f.row().error,'provider_failed');assert.equal(f.row().result,null);
 assert.doesNotMatch(JSON.stringify(f.logs),/PRIVATE_SENTINEL|input_snapshot|weight|notes/);
 f.retry();f.deps.provider=good;assert.equal((await generation.runWeeklyInsightGeneration(i,f.deps)).status,'completed');
});
test('unsafe output fails closed and cannot be persisted as completed',async()=>{
 const i=domain.buildWeeklyInsightInput(source()),f=dependencies(i);f.deps.provider=async()=>({output:{...output(i),summary:'Increase medication dose'},model:'mock',tokens:null});
 assert.equal((await generation.runWeeklyInsightGeneration(i,f.deps)).status,'failed');assert.equal(f.row().error,'invalid_output');assert.equal(f.row().result,null);
});
test('storage failure does not claim successful generation',async()=>{
 const i=domain.buildWeeklyInsightInput(source()),f=dependencies(i);f.deps.finish=async()=>false;
 await assert.rejects(()=>generation.runWeeklyInsightGeneration(i,f.deps),/persistence/);
});
test('server action rejects arbitrary fields and derives identity from authenticated access',async()=>{
 const action=await readFile(new URL('../server/actions/insights.ts',import.meta.url),'utf8');
 assert.match(action,/requireInsightAccess\(supabase\)/);assert.match(action,/generateInsightForAuthenticatedOwner\(access.user.id,input\)/);assert.match(action,/fields.some/);
 const service=await readFile(new URL('../server/insights/service.ts',import.meta.url),'utf8');assert.match(service,/import 'server-only'/);assert.doesNotMatch(service,/NEXT_PUBLIC_.*SERVICE_ROLE/);
 for(const file of ['../app/insights/page.tsx','../app/dashboard/page.tsx','../lib/data/insights.ts']){
  const text=await readFile(new URL(file,import.meta.url),'utf8');assert.doesNotMatch(text,/requestWeeklyInsight|generateInsightForAuthenticatedOwner/);
 }
});
test('no available facts prevents even a claim or provider call',async()=>{
 const raw=source();raw.features=['ai_insights'];raw.coaching_available=false;
 const i=domain.buildWeeklyInsightInput(raw),f=dependencies(i);
 await assert.rejects(()=>generation.runWeeklyInsightGeneration(i,f.deps),/insufficient_data/);
 assert.equal(f.row(),null);assert.equal(f.calls(),0);
});

for(const phrase of ['increase your GLP-1 dose','skip your medication','take 2.5 mg tonight','You have diabetes','Treat your infection with antibiotics','Eat only 300 calories daily','Purge after meals','Exercise for hours to burn off dinner','This diet cured your illness','Your workouts caused better health','You lost weight rapidly; excellent work']) {
 test('server generation rejects unsafe text in all output fields: '+phrase,async()=>{
  const i=domain.buildWeeklyInsightInput(source());
  for(const field of ['headline','summary','title','evidence','reason','gap']){
   const f=dependencies(i),o=output(i);
   if(field==='headline'||field==='summary')o[field]=phrase;
   if(field==='title'||field==='evidence')o.wins[0][field]=phrase;
   if(field==='reason')o.next_week_focus[0].reason=phrase;
   if(field==='gap')o.data_gaps.push(phrase);
   f.deps.provider=async()=>({output:o,model:'stub',tokens:null});
   assert.equal((await generation.runWeeklyInsightGeneration(i,f.deps)).status,'failed');
   assert.equal(f.row().result,null);assert.equal(f.row().error,'invalid_output');
   assert.ok(!JSON.stringify(f.logs).includes(phrase));
  }
 });
}
for(const category of ['progress','nutrition','hydration','habits','daily_check_ins','weekly_check_ins','training','coaching','score']) {
 test('grounding rejects invented fact for '+category,()=>{
  const i=domain.buildWeeklyInsightInput(source()),o=output(i);
  o.wins=[{category,title:domain.evidenceTitles[category],evidence:'There were 999 successful records.'}];
  assert.throws(()=>domain.validateWeeklyInsightOutput(o,i));
 });
}
test('numerical-free unsupported claims cannot bypass headline/title/summary grounding',()=>{
 const i=domain.buildWeeklyInsightInput(source());
 for(const field of ['headline','summary'])assert.throws(()=>domain.validateWeeklyInsightOutput({...output(i),[field]:'Your hydration improved dramatically.'},i));
 const o=output(i);o.wins[0].title='Perfect adherence';assert.throws(()=>domain.validateWeeklyInsightOutput(o,i));
});
test('provider schema mirrors accepted cardinality and narrative choices',()=>{
 const p=provider.weeklyOutputJsonSchema.properties;
 assert.equal(p.wins.maxItems,4);assert.equal(p.watch_items.maxItems,4);assert.equal(p.next_week_focus.minItems,1);assert.equal(p.next_week_focus.maxItems,3);
 assert.equal(p.headline.enum[0],domain.weeklyNarrative.headline);assert.equal(p.summary.enum[0],domain.weeklyNarrative.summary);
 assert.ok(p.watch_items.items.properties.title.enum.includes(domain.evidenceTitles.nutrition));
});
