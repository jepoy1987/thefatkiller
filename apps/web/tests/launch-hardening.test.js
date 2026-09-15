import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
import * as api from '@tfk/api';
async function load(path, imports={}, extra={}) {
 const context={exports:{},process:{env:{}},console,URL,performance,require:n=>{if(n in imports)return imports[n];throw new Error('Unexpected import '+n);},...extra};
 vm.runInNewContext(ts.transpileModule(await readFile(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);return context.exports;
}
const origin=await load('../lib/origin.ts');
for(const path of ['//evil.test','/\\evil.test','/\nevil.test','https://evil.test','/%5cevil.test'])test('callback rejects unsafe redirect '+JSON.stringify(path),()=>assert.equal(origin.safeRedirectPath(path),'/dashboard'));
test('callback preserves same-origin application destinations',()=>assert.equal(origin.safeRedirectPath('/nutrition?date=2026-09-15'),'/nutrition?date=2026-09-15'));
test('untrusted origin cannot control auth redirect',async()=>{const o=await load('../lib/origin.ts',{}, {process:{env:{NODE_ENV:'production',NEXT_PUBLIC_APP_URL:'https://app.example',VERCEL_ENV:'preview',VERCEL_URL:'preview.example'}}});assert.equal(o.getAppOrigin('https://evil.example'),'https://preview.example');assert.equal(o.getAppOrigin('https://preview.example'),'https://preview.example');});

const weights=Array.from({length:400},(_,i)=>({id:String(i),weight_kg:80+i/100,recorded_at:new Date(Date.UTC(2025,0,1+i)).toISOString()}));
const profile={unit_system:'metric',onboarding_completed:true};const goal={goal_type:'maintain_weight',starting_weight:80,goal_weight:80};
async function progressFixture(error=null){
 const queries=[],signed=[],failures=[];
 const client={from(table){const q={table,ascending:false,start:0,end:Infinity,limit:Infinity};queries.push(q);const b={select(){return b;},order(column,options){if(column==='recorded_at')q.ascending=options?.ascending??true;return b;},range(start,end){q.start=start;q.end=end;return b;},limit(n){q.limit=n;return b;},maybeSingle:async()=>({data:error?null:{weight_kg:84},error}),then(resolve){let rows=table==='weight_entries'?[...weights]:table==='progress_photos'?Array.from({length:45},(_,i)=>({id:String(i),storage_path:'owner/'+i+'.jpg'})):[];if(table==='weight_entries'&&!q.ascending)rows.reverse();resolve({data:rows.slice(q.start,Math.min(q.end+1,q.start+q.limit)),error:null});}};return b;},storage:{from(){return{createSignedUrls:async paths=>{signed.push(paths);return{data:paths.map(path=>({path,signedUrl:'private-url'}))};}}}}};
 const p=await load('../lib/data/progress.ts',{'@tfk/api':api,'next/navigation':{redirect(){throw Error('redirect');}},'./goals':{getActiveGoal:async()=>goal},'./profile':{getProfile:async()=>profile},'./session':{requireUser:async()=>({id:'owner'})},'./client':{createClient:async()=>client},'../../server/observability':{logDataFailure:(...x)=>failures.push(x)}});return{p,client,queries,signed,failures};
}
test('progress bounds history and batches photo signing',async()=>{const f=await progressFixture();const r=await f.p.getProgressFoundation();assert.equal(r.weights.length,20);assert.equal(r.photos.length,20);assert.equal(r.chartWeights.length,12);assert.equal(r.hasMore,true);assert.equal(f.signed.length,1);assert.equal(f.signed[0].length,20);assert.ok(f.queries.every(q=>q.end!==Infinity||q.limit!==Infinity));});
test('progress pagination preserves canonical all-history summary and latest chart',async()=>{const f=await progressFixture();const r=await f.p.getProgressFoundation(2);assert.equal(r.weights[0].id,'379');assert.equal(r.chartWeights[0].id,'399');assert.deepEqual(JSON.parse(JSON.stringify(r.summary)),api.calculateProgress(profile,goal,weights));});
test('latest weight database failure fails safely with code-only diagnostics',async()=>{const f=await progressFixture({code:'PGRST205',message:'private content'});await assert.rejects(()=>f.p.getLatestWeight(f.client),/latest weight could not be loaded/);assert.deepEqual(f.failures,[['latest_weight','PGRST205']]);});
test('missing weight remains undefined, not a load error or invented zero',async()=>{const f=await progressFixture();f.client.from=()=>({select(){return this;},order(){return this;},limit(){return this;},maybeSingle:async()=>({data:null,error:null})});assert.equal(await f.p.getLatestWeight(f.client),undefined);});
test('diagnostics never log raw error messages or sensitive paths',async()=>{const messages=[];const o=await load('../server/observability.ts',{}, {console:{error:x=>messages.push(x),info:x=>messages.push(x)},fetch:async()=>({ok:false,status:503})});o.logDataFailure('latest_weight','secret payload');await o.observedSupabaseFetch('https://db.example/storage/v1/object/sign/private/user/photo?token=SECRET');assert.ok(!messages.join().includes('SECRET'));assert.ok(!messages.join().includes('user/photo'));assert.ok(!messages.join().includes('secret payload'));assert.equal(JSON.parse(messages[0]).code,'unknown');});
