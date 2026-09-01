import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
test('coaching uses bounded RPCs without broad client-table reads',async()=>{const data=await readFile(new URL('../lib/data/coaching.ts',import.meta.url),'utf8');assert.match(data,/get_coach_client_summary/);assert.match(data,/get_coach_dashboard/);assert.doesNotMatch(data,/from\('(weight_entries|food_logs|water_logs|progress_photos|glp1_)/);});
test('coach mutations derive identity in database RPCs',async()=>{const actions=await readFile(new URL('../server/actions/coaching.ts',import.meta.url),'utf8');assert.match(actions,/save_coach_goal/);assert.match(actions,/save_coach_note/);assert.doesNotMatch(actions,/coach_user_id|service_role/);});
test('coaching UI does not expose progress photos or GLP-1 details',async()=>{const page=await readFile(new URL('../app/coach/clients/[clientId]/page.tsx',import.meta.url),'utf8');assert.doesNotMatch(page,/progress.photo|dose_amount|other_symptoms|medication notes/i);});
