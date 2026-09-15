import assert from 'node:assert/strict';
import test from 'node:test';
import { loginSchema, resetPasswordSchema, signupSchema } from '../src/index.ts';

const strongPassword = 'Long-enough1!';

test('recovery passwords must match',()=>{assert.equal(resetPasswordSchema.safeParse({password:strongPassword,confirm_password:'Different-one1!'}).success,false);});
test('new passwords enforce the twelve-character minimum',()=>{assert.equal(resetPasswordSchema.safeParse({password:'Short1!',confirm_password:'Short1!'}).success,false);});
test('new passwords require lower, upper, number, and symbol character classes',()=>{
  for (const password of ['LONG-ENOUGH1!','long-enough1!','Long-enough!!','Longenough123']) {
    assert.equal(signupSchema.safeParse({email:'user@example.com',password}).success,false);
  }
});
test('matching strong recovery passwords pass',()=>{assert.equal(resetPasswordSchema.safeParse({password:strongPassword,confirm_password:strongPassword}).success,true);});
test('login accepts an existing password without applying the new-password policy',()=>{assert.equal(loginSchema.safeParse({email:'user@example.com',password:'legacy'}).success,true);});
