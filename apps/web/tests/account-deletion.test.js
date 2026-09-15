const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const ts=require('typescript');
const context={exports:{},URL,AbortSignal};vm.runInNewContext(ts.transpileModule(fs.readFileSync('server/account/deletion.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,context);
const {processAccountDeletions}=context.exports;
const uid='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',lease='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
function scenario({storageFails=false,unsafe=false,ready=true,rows=true}={}){const calls=[];const fetcher=async(url,options)=>{const path=url.pathname;calls.push(path);let body;
 if(path.endsWith('claim_account_deletions'))body=[{user_id:uid,lease}];
 else if(path.endsWith('account_deletion_objects'))body=rows?[{bucket_id:'food-analysis',name:`${unsafe?lease:uid}/photo.jpg`}]:[];
 else if(path.includes('/storage/')){if(storageFails)return {ok:false};body=[];}
 else if(path.endsWith('account_deletion_ready'))body=ready;
 else if(path.includes('/admin/users/'))body={};else throw Error('unexpected');
 return {ok:true,status:200,json:async()=>body};};return {calls,run:()=>processAccountDeletions({url:'http://localhost:54321',key:'fixture'},fetcher)};}
test('Storage failure preserves Auth identity for recovery',async()=>{const s=scenario({storageFails:true});assert.equal((await s.run()).failed,1);assert.ok(!s.calls.some(p=>p.includes('/admin/users/')));});
test('cross-owner path fails before deletion',async()=>{const s=scenario({unsafe:true});assert.equal((await s.run()).failed,1);assert.ok(!s.calls.some(p=>p.includes('/storage/')||p.includes('/admin/users/')));});
test('Auth removed only after verified empty Storage',async()=>{const s=scenario();assert.equal((await s.run()).completed,1);assert.ok(s.calls.indexOf('/rest/v1/rpc/account_deletion_ready')<s.calls.findIndex(p=>p.includes('/admin/users/')));});
test('remaining objects keep deletion pending',async()=>{const s=scenario({ready:false});assert.equal((await s.run()).pending,1);assert.ok(!s.calls.some(p=>p.includes('/admin/users/')));});
test('already missing objects safely allow completion',async()=>{const s=scenario({rows:false});assert.equal((await s.run()).completed,1);assert.ok(!s.calls.some(p=>p.includes('/storage/')));});
test('oversized worker claim batch rejected',async()=>{await assert.rejects(()=>processAccountDeletions({url:'http://localhost:54321',key:'fixture'},async()=>({ok:true,status:200,json:async()=>[{user_id:uid,lease},{user_id:uid,lease}]})),/Invalid deletion batch/);});
