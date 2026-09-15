import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

// Exercise actual React reconciliation and browser input state, mocking only
// server actions and Next's form-action transport. No generated production code.
const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLInputElement = dom.window.HTMLInputElement;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const React = await import('react');
const { createRoot } = await import('react-dom/client');

const runtime = await import('react/jsx-runtime');
const api = await import('@tfk/api');
const validation = await import('@tfk/validation');
let submitActions;
let serverMutation;
function useFormState(action, initial) {
  const [state, setState] = React.useState(initial);
  const id = React.useId();
  submitActions.set(id, async data => setState(await action(state, data)));
  return [state, id];
}
const wrapper = ({ children }) => React.createElement('div', null, children);
async function load(file, imports) {
  const source = await readFile(new URL(file, import.meta.url), 'utf8');
  const context = { exports: {}, HTMLInputElement: dom.window.HTMLInputElement, require(name) {
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime') return runtime;
    if (name in imports) return imports[name];
    throw new Error(`Unexpected test import: ${name}`);
  } };
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, context);
  return context.exports;
}
const { ActionForm } = await load('../features/training/forms.tsx', {
  'react-dom': { useFormState },
  '../../components/forms/submit-button': { SubmitButton: ({ children }) => React.createElement('button', { type: 'submit' }, children) },
  '../../components/ui/alert': { Alert: wrapper },
});
const { SessionLogger } = await load('../features/training/session.tsx', {
  '@tfk/api': api, '@tfk/validation': validation,
  '../../server/actions/training': Object.fromEntries(['abandonWorkoutSession', 'completeWorkoutSession', 'deleteWorkoutSession', 'deleteWorkoutSet', 'saveSessionNotes', 'saveWorkoutSet'].map(name => [name, async (_, data) => serverMutation(name, data)])),
  '../../components/ui/card': { Card: wrapper, CardContent: wrapper, CardHeader: () => null },
  '../../components/ui/form': { Input: props => React.createElement('input', props) },
  './forms': { ActionForm },
});
const exercise = { id: 'exercise-a', position: 0, tracking_type_snapshot: 'sets_reps', targets_snapshot: {}, exercise_name_snapshot: 'Squat' };
const log = number => ({ id: `set-${number}`, workout_session_exercise_id: exercise.id, set_number: number, reps: 8, weight_kg: 20, notes: '', completed: true });
async function fixture(numbers) {
  submitActions = new Map();
  let sets = numbers.map(log);
  const element = document.createElement('div'); document.body.append(element);
  const root = createRoot(element);
  const refresh = async () => React.act(async () => root.render(React.createElement(SessionLogger, { session: { id: 'session', status: 'in_progress', notes: '' }, exercises: [exercise], sets: structuredClone(sets), units: 'metric' })));
  serverMutation = async (name, data) => {
    const values = Object.fromEntries(data);
    const input = values.payload ? JSON.parse(values.payload) : values;
    const number = Number(input.set_number);
    if (name === 'deleteWorkoutSet') sets = sets.filter(row => row.set_number !== number);
    if (name === 'saveWorkoutSet') {
      const previous = sets.find(row => row.set_number === number);
      sets = [...sets.filter(row => row.set_number !== number), { ...log(number), id: previous?.id ?? `saved-${number}`, reps: Number(input.reps), notes: input.notes }];
    }
    await refresh();
    return { message: 'Saved.' };
  };
  await refresh();
  const button = label => [...element.querySelectorAll('button')].find(node => node.textContent === label);
  const form = label => { const node = button(label)?.closest('form'); assert.ok(node, `Missing ${label}`); return node; };
  const input = (label, name = 'reps') => form(label).querySelector(`[name="${name}"]`);
  const change = async (label, value, name = 'reps') => React.act(async () => { const node = input(label, name); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(node, value); node.dispatchEvent(new window.Event('input', {bubbles:true})); });
  const submit = async label => React.act(async () => { const node = form(label); await submitActions.get(node.getAttribute('action'))(new dom.window.FormData(node)); });
  const dirty = () => element.textContent.includes('You have unsaved entries');
  const completeEnabled = () => !button('Complete workout').closest('fieldset').disabled;
  return { input, change, submit, refresh, dirty, completeEnabled, button, close: async () => { await React.act(async () => root.unmount()); element.remove(); } };
}
test('unsaved new Set A survives deletion of highest saved Set B, saves and enables completion', async () => {
  const f = await fixture([1, 2]);
  try {
    await f.change('Save new set 3', '12');
    await f.change('Save new set 3', 'draft A', 'notes');
    assert.equal(f.dirty(), true); assert.equal(f.completeEnabled(), false);
    await f.submit('Delete set 2');
    assert.equal(f.input('Save new set 2').value, '12');
    assert.equal(f.input('Save new set 2', 'notes').value, 'draft A');
    assert.equal(f.button('Delete set 2'), undefined);
    await f.refresh();
    assert.equal(f.input('Save new set 2').value, '12');
    assert.equal(f.button('Delete set 2'), undefined);
    assert.equal(f.dirty(), true); assert.equal(f.completeEnabled(), false);
    await f.submit('Save new set 2');
    assert.equal(f.input('Save set 2').value, '12');
    assert.equal(f.input('Save new set 3').value, '');
    assert.equal(f.dirty(), false); assert.equal(f.completeEnabled(), true);
  } finally { await f.close(); }
});
test('saved row draft stays on its stable ID when a preceding row is deleted', async () => {
  const f = await fixture([1, 2, 3]);
  try {
    await f.change('Save set 2', '15');
    await f.submit('Delete set 1'); await f.refresh();
    assert.equal(f.button('Save set 1'), undefined);
    assert.equal(f.input('Save set 2').value, '15');
    assert.equal(f.input('Save set 3').value, '8');
    assert.equal(f.dirty(), true);
    await f.submit('Save set 2');
    assert.equal(f.dirty(), false); assert.equal(f.completeEnabled(), true);
  } finally { await f.close(); }
});
test('reverting actual draft values clears dirty warning and enables completion', async () => {
  const f = await fixture([1]);
  try {
    await f.change('Save new set 2', '12');
    await f.change('Save set 1', '10');
    await f.change('Save new set 2', '');
    assert.equal(f.dirty(), true);
    await f.change('Save set 1', '8');
    assert.equal(f.dirty(), false); assert.equal(f.completeEnabled(), true);
  } finally { await f.close(); }
});
test('deleting an edited saved row removes only its own dirty state', async () => {
  const f = await fixture([1, 2]);
  try {
    await f.change('Save set 1', '15');
    await f.change('Save set 2', '20');
    await f.submit('Delete set 2');
    assert.equal(f.input('Save set 1').value, '15'); assert.equal(f.dirty(), true);
    await f.submit('Save set 1'); await f.refresh();
    assert.equal(f.button('Delete set 2'), undefined);
    assert.equal(f.dirty(), false); assert.equal(f.completeEnabled(), true);
  } finally { await f.close(); }
});

test('failed draft save retains values and keeps completion disabled', async () => {
  const f = await fixture([1]);
  try {
    await f.change('Save new set 2', '12');
    serverMutation = async () => ({ error: 'Save rejected' });
    await f.submit('Save new set 2');
    assert.equal(f.input('Save new set 2').value, '12');
    assert.equal(f.dirty(), true); assert.equal(f.completeEnabled(), false);
  } finally { await f.close(); }
});
