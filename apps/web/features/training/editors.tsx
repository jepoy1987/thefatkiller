'use client';

import { useState } from 'react';
import { useFormState } from 'react-dom';
import Link from 'next/link';
import { trainingDistanceFromMeters, trainingDistanceLabel, trainingFields } from '@tfk/api';
import type { Exercise, UnitSystem, WorkoutTemplate } from '@tfk/types';
import { exerciseCategories, exerciseEquipment, exerciseTrackingTypes } from '@tfk/validation';
import { saveExercise, saveWorkoutTemplate } from '../../server/actions/training';
import { SubmitButton } from '../../components/forms/submit-button';
import { Input, Select } from '../../components/ui/form';
import { Alert } from '../../components/ui/alert';
import { buttonStyles } from '../../components/ui/button';

const readable = (value: string) => value.replaceAll('_', ' ');
export function ExerciseEditor({ exercise }: { exercise?: Exercise }) {
  const [state, action] = useFormState(saveExercise, {});
  return <form action={action} className="grid gap-3">
    {exercise || state.id ? <input type="hidden" name="id" value={exercise?.id ?? state.id} /> : null}
    <label className="grid gap-1 text-sm">Exercise name<Input name="name" required minLength={2} maxLength={120} defaultValue={exercise?.name} /></label>
    <div className="grid gap-3 sm:grid-cols-3">
      <label className="grid gap-1 text-sm">Category<Select name="category" defaultValue={exercise?.category ?? 'strength'}>{exerciseCategories.map(v => <option key={v} value={v}>{readable(v)}</option>)}</Select></label>
      <label className="grid gap-1 text-sm">Equipment<Select name="equipment" defaultValue={exercise?.equipment ?? 'none'}>{exerciseEquipment.map(v => <option key={v} value={v}>{readable(v)}</option>)}</Select></label>
      <label className="grid gap-1 text-sm">Tracking<Select name="tracking_type" defaultValue={exercise?.tracking_type ?? 'sets_reps'}>{exerciseTrackingTypes.map(v => <option key={v} value={v}>{readable(v)}</option>)}</Select></label>
    </div>
    <label className="grid gap-1 text-sm">Description<Input name="description" maxLength={1000} defaultValue={exercise?.description ?? ''} /></label>
    <label className="grid gap-1 text-sm">Instructions<Input name="instructions" maxLength={2000} defaultValue={exercise?.instructions ?? ''} /></label>
    {state.error ? <Alert variant="error">{state.error}</Alert> : null}
    {state.message ? <p role="status">Exercise saved.</p> : null}
    <SubmitButton size="sm" className="w-fit">Save exercise</SubmitButton>
  </form>;
}

type DraftItem = { key: number; exercise_id: string; target_sets: string; target_reps_min: string; target_reps_max: string; target_duration_seconds: string; target_distance_meters: string; target_rest_seconds: string; notes: string };
const emptyItem = (key: number, exercise_id: string): DraftItem => ({ key, exercise_id, target_sets: '', target_reps_min: '', target_reps_max: '', target_duration_seconds: '', target_distance_meters: '', target_rest_seconds: '', notes: '' });
export function WorkoutEditor({ exercises, template, units }: { exercises: Exercise[]; template?: WorkoutTemplate; units: UnitSystem }) {
  const [state, action] = useFormState(saveWorkoutTemplate, {});
  const [name, setName] = useState(template?.name ?? '');
  const [description, setDescription] = useState(template?.description ?? '');
  const [items, setItems] = useState<DraftItem[]>(() => template?.items?.map((item, key) => ({ key, exercise_id: item.exercise_id, target_sets: String(item.target_sets ?? ''), target_reps_min: String(item.target_reps_min ?? ''), target_reps_max: String(item.target_reps_max ?? ''), target_duration_seconds: String(item.target_duration_seconds ?? ''), target_distance_meters: item.target_distance_meters == null ? '' : String(trainingDistanceFromMeters(item.target_distance_meters, units)), target_rest_seconds: String(item.target_rest_seconds ?? ''), notes: item.notes ?? '' })) ?? [emptyItem(0, exercises[0]?.id ?? '')]);
  const [nextKey, setNextKey] = useState(items.length);
  const update = (key: number, field: keyof DraftItem, value: string) => setItems(current => current.map(item => item.key === key ? { ...item, [field]: value } : item));
  const move = (index: number, direction: number) => setItems(current => { const copy = [...current]; [copy[index], copy[index + direction]] = [copy[index + direction]!, copy[index]!]; return copy; });
  const payload = { ...(template?.id || state.id ? { id: template?.id ?? state.id } : {}), name, description, items: items.map(({ key: _key, ...item }) => item) };
  return <form action={action} className="grid gap-5">
    <input type="hidden" name="payload" value={JSON.stringify(payload)} />
    <label className="grid gap-1 text-sm">Workout name<Input required minLength={2} maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label>
    <label className="grid gap-1 text-sm">Description<Input maxLength={1000} value={description} onChange={e => setDescription(e.target.value)} /></label>
    {items.map((item, index) => {
      const exercise = exercises.find(e => e.id === item.exercise_id);
      const fields = trainingFields(exercise?.tracking_type ?? 'other');
      const numberField = (field: keyof DraftItem, label: string, max: number, min = 1, step = '1') => <label className="grid gap-1 text-sm" key={field}>{label}<Input type="number" min={min} max={max} step={step} value={item[field]} onChange={e => update(item.key, field, e.target.value)} /></label>;
      return <fieldset key={item.key} className="grid gap-3 rounded-xl border p-4"><legend className="px-2 font-semibold">Exercise {index + 1}</legend>
        <label className="grid gap-1 text-sm">Exercise<Select value={item.exercise_id} onChange={e => { const id = e.target.value; setItems(current => current.map(i => i.key === item.key ? { ...emptyItem(i.key, id), notes: i.notes } : i)); }}>
          {!exercise ? <option value={item.exercise_id}>Exercise unavailable — choose another</option> : null}
          {exercises.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
        </Select></label>
        <div className="grid gap-3 sm:grid-cols-3">
          {numberField('target_sets', 'Target sets', 100)}
          {fields.reps ? <>{numberField('target_reps_min', 'Minimum reps', 10000)}{numberField('target_reps_max', 'Maximum reps', 10000)}</> : null}
          {fields.duration ? numberField('target_duration_seconds', 'Duration (seconds)', 86400) : null}
          {fields.distance ? numberField('target_distance_meters', `Distance (${trainingDistanceLabel(units)})`, 1000000, 0.01, 'any') : null}
          {numberField('target_rest_seconds', 'Rest (seconds)', 3600, 0)}
        </div>
        <label className="grid gap-1 text-sm">Exercise notes<Input maxLength={1000} value={item.notes} onChange={e => update(item.key, 'notes', e.target.value)} /></label>
        <div className="flex flex-wrap gap-2"><button type="button" className={buttonStyles({ variant: 'outline', size: 'sm' })} disabled={index === 0} onClick={() => move(index, -1)}>Move up</button><button type="button" className={buttonStyles({ variant: 'outline', size: 'sm' })} disabled={index === items.length - 1} onClick={() => move(index, 1)}>Move down</button><button type="button" className={buttonStyles({ variant: 'ghost', size: 'sm' })} disabled={items.length === 1} onClick={() => setItems(current => current.filter(i => i.key !== item.key))}>Remove exercise</button></div>
      </fieldset>;
    })}
    <button className={buttonStyles({ variant: 'outline', className: 'w-fit' })} type="button" disabled={items.length >= 30 || !exercises.length} onClick={() => { setItems(current => [...current, emptyItem(nextKey, exercises[0]!.id)]); setNextKey(current => current + 1); }}>Add exercise</button>
    {state.error ? <Alert variant="error">{state.error}</Alert> : null}
    {state.message ? <p role="status">Workout saved. <Link className="font-semibold text-primary" href="/training">Return to Training</Link></p> : null}
    <SubmitButton className="w-fit">Save workout</SubmitButton>
  </form>;
}
