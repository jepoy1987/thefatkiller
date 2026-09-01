import assert from 'node:assert/strict';
import test from 'node:test';
import { coachGoalSchema, coachNoteSchema, coachingPrivacySchema } from '../src/index.ts';
const clientId='11111111-1111-4111-8111-111111111111';
test('coach goals require bounded meaningful input',()=>{assert.equal(coachGoalSchema.safeParse({client_id:clientId,title:'Drink water',description:'',category:'hydration',target_date:'2026-09-10',priority:'normal',client_visible:true}).success,true);assert.equal(coachGoalSchema.safeParse({client_id:clientId,title:'Rx',category:'medication',priority:'high'}).success,false);});
test('coach notes reject empty or oversized text',()=>{assert.equal(coachNoteSchema.safeParse({client_id:clientId,note:'Review weekly consistency.',client_visible:false}).success,true);assert.equal(coachNoteSchema.safeParse({client_id:clientId,note:'  ',client_visible:false}).success,false);});
test('GLP-1 details cannot be enabled in Sprint 8',()=>{assert.equal(coachingPrivacySchema.safeParse({share_progress:true,share_nutrition:true,share_accountability:true,share_glp1_summary:true,share_glp1_details:false}).success,true);assert.equal(coachingPrivacySchema.safeParse({share_progress:true,share_nutrition:true,share_accountability:true,share_glp1_summary:true,share_glp1_details:true}).success,false);});
