import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

async function load(path, imports = {}, extra = {}) {
  const context = {
    exports: {},
    process: { env: { NEXT_PUBLIC_SUPABASE_URL: 'https://db.example', NEXT_PUBLIC_SUPABASE_ANON_KEY: 'public-key' } },
    console,
    FormData,
    URL,
    require(name) {
      if (name in imports) return imports[name];
      throw new Error(`Unexpected import ${name}`);
    },
    ...extra,
  };
  const source = await readFile(new URL(path, import.meta.url), 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  return context.exports;
}

class Redirect extends Error {
  constructor(location) { super(location); this.location = location; }
}

function nextResponseMock() {
  return class MockResponse {
    static redirect(url) { return new MockResponse(url); }
    constructor(url) {
      this.url = String(url);
      this.cookieValues = new Map();
      this.cookies = { set: (name, value, options) => this.cookieValues.set(name, { value, options }) };
    }
  };
}

async function loadCallback(path, exchangeCodeForSession) {
  const NextResponse = nextResponseMock();
  const route = await load(path, {
    '@supabase/ssr': { createServerClient: (_url, _key, options) => ({
      auth: { exchangeCodeForSession },
      cookieAdapter: options.cookies,
    }) },
    'next/server': { NextResponse },
    '../../../lib/origin': {
      getAppOrigin: () => 'https://staging.example',
      safeRedirectPath: (value) => value === '/nutrition?date=2026-09-15' ? value : '/dashboard',
    },
  });
  return route;
}

test('valid confirmation callback exchanges the code and accepts a safe application destination', async () => {
  let exchanged;
  const route = await loadCallback('../app/auth/callback/route.ts', async (code) => { exchanged = code; return { error: null }; });
  const response = await route.GET({
    url: 'https://staging.example/auth/callback?code=valid-code&next=%2Fnutrition%3Fdate%3D2026-09-15',
    cookies: { getAll: () => [] },
  });
  assert.equal(exchanged, 'valid-code');
  assert.equal(response.url, 'https://staging.example/nutrition?date=2026-09-15');
});

test('recovery callback sets a short-lived secure HttpOnly marker after code exchange', async () => {
  const route = await loadCallback('../app/auth/recovery-callback/route.ts', async () => ({ error: null }));
  const response = await route.GET({ url: 'https://staging.example/auth/recovery-callback?code=recovery-code', cookies: { getAll: () => [] } });
  assert.equal(response.url, 'https://staging.example/reset-password');
  assert.deepEqual(JSON.parse(JSON.stringify(response.cookieValues.get('tfk_recovery'))), {
    value: '1', options: { httpOnly: true, maxAge: 600, path: '/', sameSite: 'lax', secure: true },
  });
});

test('expired or invalid recovery code returns a generic error and no marker', async () => {
  const route = await loadCallback('../app/auth/recovery-callback/route.ts', async () => ({ error: { message: 'sensitive provider detail' } }));
  const response = await route.GET({ url: 'https://staging.example/auth/recovery-callback?code=expired', cookies: { getAll: () => [] } });
  assert.equal(response.url, 'https://staging.example/forgot-password?error=Recovery%20link%20is%20invalid%20or%20expired.');
  assert.equal(response.cookieValues.has('tfk_recovery'), false);
  assert.doesNotMatch(response.url, /sensitive/);
});

function successfulSchema(data) { return { safeParse: () => ({ success: true, data }) }; }

async function actionFixture({ marker = '1', auth = {} } = {}) {
  const calls = { deleted: [], requireUser: 0, redirects: [], resetTargets: [] };
  const cookieJar = { get: () => marker == null ? undefined : { value: marker }, delete: (name) => calls.deleted.push(name) };
  const supabase = { auth: {
    signInWithPassword: auth.signInWithPassword ?? (async () => ({ error: null })),
    signUp: auth.signUp ?? (async () => ({ error: null })),
    resetPasswordForEmail: auth.resetPasswordForEmail ?? (async (_email, options) => { calls.resetTargets.push(options.redirectTo); return { error: null }; }),
    updateUser: auth.updateUser ?? (async () => ({ error: null })),
    signOut: auth.signOut ?? (async () => ({ error: null })),
  } };
  const redirect = (location) => { calls.redirects.push(location); throw new Redirect(location); };
  const actions = await load('../server/actions/auth.ts', {
    '@tfk/validation': {
      emailSchema: successfulSchema('person@example.com'),
      loginSchema: successfulSchema({ email: 'person@example.com', password: 'password' }),
      signupSchema: successfulSchema({ email: 'person@example.com', password: 'Strong-password1!' }),
      resetPasswordSchema: successfulSchema({ password: 'Strong-password1!', confirm_password: 'Strong-password1!' }),
    },
    'next/navigation': { redirect },
    'next/headers': { cookies: async () => cookieJar, headers: async () => ({ get: () => 'https://staging.example' }) },
    '../../lib/supabase/server': { createClient: async () => supabase },
    '../../lib/data/session': { requireUser: async () => { calls.requireUser += 1; return { id: 'user-id' }; } },
    '../../lib/origin': { getAppOrigin: () => 'https://staging.example' },
    './form': {
      formValue: (data, key) => String(data.get(key) ?? '').trim(),
      redirectWithError: (path, message) => redirect(`${path}?error=${encodeURIComponent(message)}`),
    },
  });
  return { actions, calls };
}

test('unauthenticated reset is blocked before user lookup or password update', async () => {
  let updated = false;
  const fixture = await actionFixture({ marker: null, auth: { updateUser: async () => { updated = true; return { error: null }; } } });
  await assert.rejects(() => fixture.actions.updateRecoveredPassword(new FormData()), (error) => error.location.startsWith('/forgot-password?error='));
  assert.equal(fixture.calls.requireUser, 0);
  assert.equal(updated, false);
});

test('authenticated recovery updates the password, consumes the marker, and enters dashboard', async () => {
  let password;
  const fixture = await actionFixture({ auth: { updateUser: async (input) => { password = input.password; return { error: null }; } } });
  await assert.rejects(() => fixture.actions.updateRecoveredPassword(new FormData()), (error) => error.location === '/dashboard?message=Password%20updated%20successfully.');
  assert.equal(fixture.calls.requireUser, 1);
  assert.equal(password, 'Strong-password1!');
  assert.deepEqual(fixture.calls.deleted, ['tfk_recovery']);
});

test('logout verifies the user, revokes the Supabase session, and redirects to login', async () => {
  let signedOut = 0;
  const fixture = await actionFixture({ auth: { signOut: async () => { signedOut += 1; return { error: null }; } } });
  await assert.rejects(() => fixture.actions.logout(), (error) => error.location === '/login');
  assert.equal(fixture.calls.requireUser, 1);
  assert.equal(signedOut, 1);
});

test('forgot-password success is enumeration-safe and uses the dedicated callback', async () => {
  const fixture = await actionFixture();
  await assert.rejects(() => fixture.actions.forgotPassword(new FormData()), (error) => error.location === '/forgot-password?message=If the account exists, a reset link has been sent.');
  assert.deepEqual(fixture.calls.resetTargets, ['https://staging.example/auth/recovery-callback']);
});

test('provider errors do not expose account state or raw provider messages', async () => {
  const providerError = { message: 'User already registered: person@example.com' };
  const fixture = await actionFixture({ auth: {
    signInWithPassword: async () => ({ error: providerError }),
    signUp: async () => ({ error: providerError }),
    resetPasswordForEmail: async () => ({ error: providerError }),
  } });
  const form = new FormData();
  for (const action of [fixture.actions.login, fixture.actions.signup, fixture.actions.forgotPassword]) {
    await assert.rejects(() => action(form), (error) => error instanceof Redirect && !error.location.includes('person%40example.com') && !error.location.includes('already'));
  }
});

test('authentication actions cannot assign application roles or entitlements', async () => {
  const source = await readFile(new URL('../server/actions/auth.ts', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /user_roles|user_subscriptions|admin_grant|plan_entitlements|service_role/);
});
