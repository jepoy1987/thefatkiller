import assert from 'node:assert/strict';
import test from 'node:test';
import { resetPasswordSchema } from '../src/index.ts';

test('recovery passwords must match',()=>{assert.equal(resetPasswordSchema.safeParse({password:'long-enough',confirm_password:'different-one'}).success,false);});
test('recovery passwords enforce the existing eight-character minimum',()=>{assert.equal(resetPasswordSchema.safeParse({password:'short',confirm_password:'short'}).success,false);});
test('matching valid recovery passwords pass',()=>{assert.equal(resetPasswordSchema.safeParse({password:'a-secure-password',confirm_password:'a-secure-password'}).success,true);});
