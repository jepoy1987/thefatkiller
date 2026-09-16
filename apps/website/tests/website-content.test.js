const assert = require('node:assert/strict');
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const test = require('node:test');
const ts = require('typescript');

const root = join(__dirname, '..');

function sourceFiles(directory) {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry);
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(tsx|ts|css)$/.test(entry) ? [path] : [];
  });
}

const source = sourceFiles(join(root, 'app'))
  .concat(sourceFiles(join(root, 'components')))
  .map((file) => readFileSync(file, 'utf8'))
  .join('\n');

test('production-facing source contains no localhost URLs', () => {
  assert.doesNotMatch(source, /https?:\/\/localhost/i);
});

test('demo links are removed and app CTAs use the canonical destination', () => {
  assert.doesNotMatch(source, /demo\.thefatkiller\.com/i);
  assert.match(source, /https:\/\/app\.thefatkiller\.com/);
  assert.doesNotMatch(source, /https:\/\/app\.thefatkiller\.com\//);
  assert.match(source, /Open TFK App/);
  assert.match(source, /Explore Features/);
  assert.match(source, /Contact TFK/);
});

test('production-facing source contains no dead hash links', () => {
  assert.doesNotMatch(source, /href=["']#["']/);
});

test('all required App Router pages exist', () => {
  for (const route of ['', 'features', 'pricing', 'blog', 'help', 'about', 'contact', 'privacy', 'terms']) {
    const page = join(root, 'app', route, 'page.tsx');
    assert.doesNotThrow(() => readFileSync(page));
  }
});

test('favicon exists and is included in the production build', { timeout: 130_000 }, () => {
  const favicon = readFileSync(join(root, 'app', 'favicon.ico'));
  assert.deepEqual([...favicon.subarray(0, 6)], [0, 0, 1, 0, 1, 0]);

  const buildTimeout = 120_000;
  const build = spawnSync(process.execPath, [require.resolve('next/dist/bin/next'), 'build'], {
    cwd: root,
    encoding: 'utf8',
    timeout: buildTimeout,
    killSignal: 'SIGKILL',
  });
  if (build.error?.code === 'ETIMEDOUT') {
    assert.fail(`next build timed out after ${buildTimeout}ms and was killed with SIGKILL`);
  }
  if (build.error) {
    assert.fail(`next build could not start: ${build.error.message}`);
  }
  if (build.status !== 0) {
    assert.fail(`next build exited unsuccessfully with status ${build.status ?? 'unknown'}${build.signal ? ` after signal ${build.signal}` : ''}\n${build.stdout}\n${build.stderr}`);
  }

  const routes = JSON.parse(readFileSync(join(root, '.next', 'routes-manifest.json'), 'utf8'));
  assert.ok(routes.staticRoutes.some((route) => route.page === '/favicon.ico'));
  assert.deepEqual(readFileSync(join(root, '.next', 'server', 'app', 'favicon.ico.body')), favicon);
  assert.match(readFileSync(join(root, '.next', 'server', 'app', 'index.html'), 'utf8'), /<link rel="icon" href="\/favicon\.ico" type="image\/x-icon" sizes="64x64"\/>/);
});

test('literal internal links resolve to App Router pages', () => {
  const destinations = [...source.matchAll(/href=["'](\/[a-z-]*)["']/g)].map((match) => match[1]);
  for (const destination of new Set(destinations)) {
    const page = destination === '/' ? join(root, 'app', 'page.tsx') : join(root, 'app', destination.slice(1), 'page.tsx');
    assert.doesNotThrow(() => readFileSync(page), `Missing page for ${destination}`);
  }
});

test('medical safety boundaries stay visible in product source', () => {
  assert.match(source, /does not provide medical diagnosis/i);
  assert.match(source, /Medication tracking does not replace advice from a qualified healthcare professional/i);
  assert.match(source, /AI insights will not provide medication or medical decisions/i);
  assert.match(source, /does not promise specific weight-loss results/i);
});

test('help interactions remain a client component while pricing stays informational', () => {
  const pricing = readFileSync(join(root, 'components', 'pricing-table.tsx'), 'utf8');
  const help = readFileSync(join(root, 'components', 'help-center.tsx'), 'utf8');
  assert.doesNotMatch(pricing, /^'use client';/);
  assert.doesNotMatch(pricing, /useState|setAnnual/);
  assert.match(help, /^'use client';/);
  assert.match(help, /setQuery/);
  assert.match(help, /setCategory/);
});

test('current MVP appears before clearly labeled future expansion', () => {
  const features = readFileSync(join(root, 'app', 'features', 'page.tsx'), 'utf8');
  const currentIndex = features.indexOf('Current MVP');
  const futureIndex = features.indexOf('What’s Next · Future Expansion');
  assert.ok(currentIndex >= 0);
  assert.ok(futureIndex > currentIndex);
  for (const feature of ['Account creation & onboarding', 'Today Dashboard', 'Weight & progress tracking', 'Nutrition, water & habits', 'Daily & weekly check-ins', 'TFK Score', 'Subscription foundation', 'Web, iOS & Android direction']) {
    assert.match(features, new RegExp(feature.replace(/[&]/g, '&')));
  }
  for (const feature of ['GLP-1 journal', 'Coaching', 'workout and training system', 'AI-powered weekly insights']) {
    assert.match(features, new RegExp(feature, 'i'));
  }
  assert.match(features, /COMING SOON/);
  assert.match(features, /Planned/i);
});

test('pricing is explicitly not final and exposes no invented prices or checkout actions', () => {
  const pricingPage = readFileSync(join(root, 'app', 'pricing', 'page.tsx'), 'utf8');
  const pricingTable = readFileSync(join(root, 'components', 'pricing-table.tsx'), 'utf8');
  const pricingSource = `${pricingPage}\n${pricingTable}`;
  assert.match(pricingSource, /Pricing coming soon/i);
  assert.match(pricingSource, /plans, prices, billing terms, and checkout are not finalized or live/i);
  assert.doesNotMatch(pricingSource, /\$\d+/);
  assert.doesNotMatch(pricingSource, /Start with Free|Choose Plus|Choose Coaching/);
  assert.match(pricingSource, /Open TFK App/);
  assert.match(pricingSource, /Contact TFK/);
});

function componentHarness(file, exportName, extraMocks = {}) {
  const states = [];
  const refs = [];
  const effects = [];
  let cursor = 0;
  let refCursor = 0;
  let cleanups = [];
  const reactMock = {
    useEffect(effect) { effects.push(effect); },
    useMemo(factory) { return factory(); },
    useRef(initial) {
      const index = refCursor++;
      if (!(index in refs)) refs[index] = { current: initial };
      return refs[index];
    },
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], (next) => { states[index] = typeof next === 'function' ? next(states[index]) : next; }];
    },
  };
  const jsx = (type, props) => ({ type, props: props || {} });
  const mocks = {
    react: reactMock,
    'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: Symbol('Fragment') },
    './icons': new Proxy({}, { get: () => () => null }),
    'next/link': { __esModule: true, default: 'a' },
    'next/navigation': { usePathname: () => '/' },
    ...extraMocks,
  };
  const output = ts.transpileModule(readFileSync(file, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const moduleRecord = { exports: {} };
  Function('require', 'module', 'exports', output)((id) => {
    if (id in mocks) return mocks[id];
    throw new Error(`Unexpected test import: ${id}`);
  }, moduleRecord, moduleRecord.exports);
  return {
    render() { cursor = 0; refCursor = 0; effects.length = 0; return moduleRecord.exports[exportName](); },
    runEffects() { cleanups = effects.map((effect) => effect()).filter((cleanup) => typeof cleanup === 'function'); },
    cleanup() { cleanups.forEach((cleanup) => cleanup()); cleanups = []; },
  };
}

function childrenOf(node) {
  const children = node?.props?.children;
  return children == null ? [] : Array.isArray(children) ? children : [children];
}

function walk(node, predicate, matches = []) {
  if (node == null || typeof node === 'boolean') return matches;
  if (Array.isArray(node)) { node.forEach((child) => walk(child, predicate, matches)); return matches; }
  if (typeof node !== 'object') return matches;
  if (predicate(node)) matches.push(node);
  childrenOf(node).forEach((child) => walk(child, predicate, matches));
  return matches;
}

function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join(' ');
  return childrenOf(node).map(textOf).join(' ');
}

test('help search filters results and shows a useful empty state', () => {
  const harness = componentHarness(join(root, 'components', 'help-center.tsx'), 'HelpCenter');
  let tree = harness.render();
  const input = walk(tree, (node) => node.type === 'input')[0];
  input.props.onChange({ target: { value: 'weight trend' } });
  tree = harness.render();
  assert.match(textOf(tree), /Understand your weight trend/);
  assert.doesNotMatch(textOf(tree), /Plan and complete a workout/);
  walk(tree, (node) => node.type === 'input')[0].props.onChange({ target: { value: 'no-match-here' } });
  tree = harness.render();
  assert.match(textOf(tree), /No articles found/);
  assert.match(textOf(tree), /Clear filters/);
});

test('help article disclosures expose readable content and correct ARIA state', () => {
  const harness = componentHarness(join(root, 'components', 'help-center.tsx'), 'HelpCenter');
  let tree = harness.render();
  let trigger = walk(tree, (node) => node.type === 'button' && node.props['aria-controls'] === 'help-article-use-today-dashboard')[0];
  assert.equal(trigger.props.type, 'button');
  assert.equal(trigger.props['aria-expanded'], false);
  assert.equal(walk(tree, (node) => node.props?.id === 'help-article-use-today-dashboard').length, 0);

  trigger.props.onClick();
  tree = harness.render();
  trigger = walk(tree, (node) => node.props?.['aria-controls'] === 'help-article-use-today-dashboard')[0];
  assert.equal(trigger.props['aria-expanded'], true);
  const panel = walk(tree, (node) => node.props?.id === 'help-article-use-today-dashboard')[0];
  assert.equal(panel.props.role, 'region');
  assert.match(textOf(panel), /keeps nutrition, water, habits, check-ins, weight, and progress together/i);
});

test('help article disclosures support Enter and Space keyboard activation', () => {
  const harness = componentHarness(join(root, 'components', 'help-center.tsx'), 'HelpCenter');
  let tree = harness.render();
  let trigger = walk(tree, (node) => node.props?.['aria-controls'] === 'help-article-create-account')[0];
  let prevented = 0;

  trigger.props.onKeyDown({ key: 'Enter', preventDefault() { prevented += 1; } });
  tree = harness.render();
  trigger = walk(tree, (node) => node.props?.['aria-controls'] === 'help-article-create-account')[0];
  assert.equal(trigger.props['aria-expanded'], true);

  trigger.props.onKeyDown({ key: ' ', preventDefault() { prevented += 1; } });
  tree = harness.render();
  trigger = walk(tree, (node) => node.props?.['aria-controls'] === 'help-article-create-account')[0];
  assert.equal(trigger.props['aria-expanded'], false);
  assert.equal(prevented, 2);
});

test('Command+K and Ctrl+K focus Help search and clean up their listener', () => {
  const listeners = new Map();
  const originalDocument = global.document;
  global.document = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
  };

  try {
    const harness = componentHarness(join(root, 'components', 'help-center.tsx'), 'HelpCenter');
    const tree = harness.render();
    const input = walk(tree, (node) => node.type === 'input' && node.props.id === 'help-search')[0];
    let focusCount = 0;
    input.props.ref.current = { focus() { focusCount += 1; } };
    harness.runEffects();

    const keydown = listeners.get('keydown');
    let prevented = 0;
    keydown({ key: 'k', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false, target: null, preventDefault() { prevented += 1; } });
    keydown({ key: 'k', metaKey: false, ctrlKey: true, altKey: false, shiftKey: false, target: null, preventDefault() { prevented += 1; } });
    assert.equal(focusCount, 2);
    assert.equal(prevented, 2);

    keydown({ key: 'k', metaKey: true, ctrlKey: false, altKey: false, shiftKey: false, target: { tagName: 'TEXTAREA', isContentEditable: false }, preventDefault() { prevented += 1; } });
    assert.equal(focusCount, 2);
    assert.equal(prevented, 2);

    harness.cleanup();
    assert.equal(listeners.has('keydown'), false);
  } finally {
    global.document = originalDocument;
  }
});

test('mobile menu button exposes and opens the navigation panel', () => {
  const harness = componentHarness(join(root, 'components', 'site-header.tsx'), 'SiteHeader');
  let tree = harness.render();
  let menu = walk(tree, (node) => node.type === 'button' && node.props['aria-controls'] === 'mobile-navigation')[0];
  assert.equal(menu.props['aria-expanded'], false);
  menu.props.onClick();
  tree = harness.render();
  menu = walk(tree, (node) => node.type === 'button' && node.props['aria-controls'] === 'mobile-navigation')[0];
  assert.equal(menu.props['aria-expanded'], true);
  const panel = walk(tree, (node) => node.props?.id === 'mobile-navigation')[0];
  assert.match(panel.props.className, /is-open/);
});
