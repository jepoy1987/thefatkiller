import test from 'node:test';
import assert from 'node:assert/strict';
import {cleanupAuthorized,cleanupFoodPhotoBatch} from '../server/food-photo/cleanup.ts';
const id='74444444-4444-4444-8444-444444444444',user='71111111-1111-4111-8111-111111111111';
const row={id,user_id:user,attempts:1,cleanup_claim:id,expires_at:'2020-01-01T00:00:00Z',storage_path:`${user}/${id}-1.jpg`};
const config={url:'http://127.0.0.1:54321',key:'test'};
const response=v=>new Response(JSON.stringify(v));
test('Cleanup endpoint requires a configured strong secret and exact bearer',()=>{
 assert.equal(cleanupAuthorized(null,undefined),false);assert.equal(cleanupAuthorized('Bearer short','short'),false);
 assert.equal(cleanupAuthorized('Bearer '+'a'.repeat(32),'a'.repeat(32)),true);assert.equal(cleanupAuthorized('Bearer '+'b'.repeat(32),'a'.repeat(32)),false);
});
for(const [name,change] of [['cross-owner path',{storage_path:`${id}/${id}-1.jpg`}],['traversal',{storage_path:'../other.jpg'}],['future confirmed row',{expires_at:'2999-01-01'}],['invalid attempt',{attempts:4}]])test('Cleanup rejects '+name+' before Storage deletion',async()=>{
 let calls=0;const r=await cleanupFoodPhotoBatch(config,async()=>{calls++;return response([{...row,...change}]);});assert.equal(r.failed,1);assert.equal(calls,1);
});
test('Missing object removal succeeds and metadata acknowledged only afterwards',async()=>{
 const paths=[];const r=await cleanupFoodPhotoBatch(config,async(url)=>{paths.push(url.pathname);return response(paths.length===1?[row]:paths.length===2?[]:true);});assert.equal(r.cleared,1);assert.deepEqual(paths,['/rest/v1/rpc/claim_food_photo_cleanup','/storage/v1/object/food-analysis','/rest/v1/rpc/complete_food_photo_cleanup']);
});
test('Storage failure keeps metadata for lease retry',async()=>{let calls=0;const r=await cleanupFoodPhotoBatch(config,async()=>++calls===1?response([row]):new Response('failure',{status:503}));assert.equal(r.failed,1);assert.equal(calls,2);});
test('Empty rerun is idempotent',async()=>assert.deepEqual(await cleanupFoodPhotoBatch(config,async()=>response([])),{examined:0,cleared:0,failed:0}));
test('Batch size and oversized server responses fail closed',async()=>{
 await assert.rejects(cleanupFoodPhotoBatch({...config,limit:101}));await assert.rejects(cleanupFoodPhotoBatch({...config,limit:1},async()=>response([row,row])));
});
