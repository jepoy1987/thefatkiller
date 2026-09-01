import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('forgot-password requests route recovery through reset-password',async()=>{const actions=await readFile(new URL('../server/actions/auth.ts',import.meta.url),'utf8');assert.match(actions,/auth\/callback\?next=\/reset-password/);});
test('normal callback preserves safe routing and marks only recovery completion',async()=>{const callback=await readFile(new URL('../app/auth/callback/route.ts',import.meta.url),'utf8');assert.match(callback,/next\?\.startsWith\('\/'\)/);assert.match(callback,/: '\/dashboard'/);assert.match(callback,/exchangeCodeForSession/);assert.match(callback,/destination === '\/reset-password'[\s\S]*tfk_recovery/);});
test('password update requires recovery marker and verified user',async()=>{const actions=await readFile(new URL('../server/actions/auth.ts',import.meta.url),'utf8');assert.match(actions,/updateRecoveredPassword[\s\S]*tfk_recovery[\s\S]*requireUser\(supabase\)[\s\S]*auth\.updateUser\(\{ password:/);assert.match(actions,/delete\('tfk_recovery'\)/);assert.doesNotMatch(actions,/service_role|console\.log\([^)]*password/);});
test('reset-password page requires recovery marker and authenticated session',async()=>{const page=await readFile(new URL('../app/reset-password/page.tsx',import.meta.url),'utf8');assert.match(page,/tfk_recovery/);assert.match(page,/requireUser\(createClient\(\)\)/);assert.match(page,/Saving…/);assert.match(page,/searchParams\.error/);});
