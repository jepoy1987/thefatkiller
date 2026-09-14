'use client';

import { useState } from 'react';
import { trainingDistanceFromMeters, trainingDistanceLabel, trainingFields } from '@tfk/api';
import { weightFromKilograms, weightLabel } from '@tfk/validation';
import type { UnitSystem, WorkoutSession, WorkoutSessionExercise, WorkoutSetLog } from '@tfk/types';
import { abandonWorkoutSession, completeWorkoutSession, deleteWorkoutSession, deleteWorkoutSet, saveSessionNotes, saveWorkoutSet } from '../../server/actions/training';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Input } from '../../components/ui/form';
import { ActionForm } from './forms';

function SetEditor({ exercise, log, number, units, dirty, saved }: { exercise: WorkoutSessionExercise; log?: WorkoutSetLog; number: number; units: UnitSystem; dirty: () => void; saved: () => void }) {
  const fields = trainingFields(exercise.tracking_type_snapshot);
  const numberInput = (name: string, label: string, value: number | null | undefined, max: number, required = false, step = 'any') => <label className="grid gap-1 text-sm">{label}<Input name={name} type="number" min={name === 'rpe' || step === '1' ? 1 : 0.01} max={max} step={step} required={required} defaultValue={value ?? ''} /></label>;
  return <div className="rounded-lg border p-3"><ActionForm action={saveWorkoutSet} label={log ? `Save set ${number}` : `Save new set ${number}`} onDirty={dirty} onSaved={saved}>
    <input type="hidden" name="session_exercise_id" value={exercise.id} /><input type="hidden" name="set_number" value={number} />
    <p className="text-sm font-semibold">{log ? `Set ${number}` : `New set ${number}`}</p>
    <div className="grid gap-3 sm:grid-cols-3">
      {fields.reps ? numberInput('reps', 'Reps', log?.reps, 10000, exercise.tracking_type_snapshot !== 'other') : null}
      {fields.weight ? numberInput('weight_kg', `Weight (${weightLabel(units)})`, log?.weight_kg == null ? null : weightFromKilograms(log.weight_kg, units), units === 'imperial' ? 4409 : 2000) : null}
      {fields.duration ? numberInput('duration_seconds', 'Duration (seconds)', log?.duration_seconds, 86400, exercise.tracking_type_snapshot !== 'other', '1') : null}
      {fields.distance ? numberInput('distance_meters', `Distance (${trainingDistanceLabel(units)})`, log?.distance_meters == null ? null : trainingDistanceFromMeters(log.distance_meters, units), units === 'imperial' ? 1093613 : 1000000, exercise.tracking_type_snapshot !== 'other') : null}
      {fields.rpe ? numberInput('rpe', 'RPE (1–10, optional)', log?.rpe, 10) : null}
    </div>
    <label className="grid gap-1 text-sm">Set notes<Input name="notes" maxLength={1000} defaultValue={log?.notes ?? ''} /></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="completed" defaultChecked={log?.completed ?? true} />Set completed</label>
  </ActionForm>{log ? <div className="mt-3"><ActionForm action={deleteWorkoutSet} payload={{ session_exercise_id: exercise.id, set_number: number }} label={`Delete set ${number}`} variant="danger" onSaved={saved} /></div> : null}</div>;
}
function SavedSet({ log, units }: { log: WorkoutSetLog; units: UnitSystem }) {
  const measurements = [log.reps != null ? `${log.reps} reps` : null, log.weight_kg != null ? `${weightFromKilograms(log.weight_kg, units)} ${weightLabel(units)}` : null, log.duration_seconds != null ? `${log.duration_seconds} sec` : null, log.distance_meters != null ? `${Number(trainingDistanceFromMeters(log.distance_meters, units).toFixed(2))} ${trainingDistanceLabel(units)}` : null, log.rpe != null ? `RPE ${log.rpe}` : null].filter(Boolean);
  return <li className="rounded-lg border p-3 text-sm">Set {log.set_number}: {measurements.join(' · ')} · {log.completed ? 'Completed' : 'Not completed'}{log.notes ? <p className="mt-1 text-muted-foreground">{log.notes}</p> : null}</li>;
}
export function SessionLogger({ session, exercises, sets, units }: { session: WorkoutSession; exercises: WorkoutSessionExercise[]; sets: WorkoutSetLog[]; units: UnitSystem }) {
  const [dirtyForms, setDirtyForms] = useState<string[]>([]);
  const dirty = (id: string) => () => setDirtyForms(current => current.includes(id) ? current : [...current, id]);
  const saved = (id: string) => () => setDirtyForms(current => current.filter(value => value !== id));
  const editable = session.status === 'in_progress';
  return <div className="grid gap-5">{exercises.map(exercise => {
    const logs = sets.filter(log => log.workout_session_exercise_id === exercise.id);
    const nextNumber = Math.max(0, ...logs.map(log => log.set_number)) + 1;
    const target = exercise.targets_snapshot;
    const targets = [target.sets ? `${target.sets} sets` : null, target.reps_min ? `${target.reps_min}${target.reps_max ? `–${target.reps_max}` : ''} reps` : target.reps_max ? `Up to ${target.reps_max} reps` : null, target.duration_seconds ? `${target.duration_seconds} sec` : null, target.distance_meters ? `${Number(trainingDistanceFromMeters(target.distance_meters, units).toFixed(2))} ${trainingDistanceLabel(units)}` : null, target.rest_seconds != null ? `${target.rest_seconds} sec rest` : null].filter(Boolean);
    return <Card key={exercise.id}><CardHeader title={`${exercise.position + 1}. ${exercise.exercise_name_snapshot}`} description={targets.length ? `Targets: ${targets.join(' · ')}` : undefined} /><CardContent className="grid gap-3">
      {exercise.notes ? <p className="text-sm text-muted-foreground">{exercise.notes}</p> : null}
      {editable ? <>{logs.map(log => <SetEditor key={log.id} exercise={exercise} log={log} number={log.set_number} units={units} dirty={dirty(log.id)} saved={saved(log.id)} />)}{nextNumber <= 100 ? <SetEditor key={`new-${nextNumber}`} exercise={exercise} number={nextNumber} units={units} dirty={dirty(`${exercise.id}-new`)} saved={saved(`${exercise.id}-new`)} /> : null}</> : logs.length ? <ul className="grid gap-2">{logs.map(log => <SavedSet key={log.id} log={log} units={units} />)}</ul> : <p className="text-sm text-muted-foreground">No sets recorded.</p>}
    </CardContent></Card>;
  })}
  <Card><CardHeader title="Session notes" /><CardContent>{editable ? <ActionForm action={saveSessionNotes} label="Save notes" onDirty={dirty('notes')} onSaved={saved('notes')}><input type="hidden" name="id" value={session.id} /><label className="grid gap-1 text-sm">Notes<Input name="notes" maxLength={2000} defaultValue={session.notes ?? ''} /></label></ActionForm> : <p className="text-sm">{session.notes || 'No session notes.'}</p>}</CardContent></Card>
  {editable ? <Card><CardHeader title="Finish workout" description="Save each set and your notes before completing." /><CardContent className="grid gap-3">{dirtyForms.length ? <p role="status" className="text-sm">You have unsaved entries. Save them before finishing or leaving this session.</p> : null}<ActionForm action={completeWorkoutSession} payload={{ id: session.id }} label="Complete workout" pendingLabel="Completing…" disabled={dirtyForms.length > 0} /><ActionForm action={abandonWorkoutSession} payload={{ id: session.id }} label="Abandon workout" variant="outline" disabled={dirtyForms.length > 0} /></CardContent></Card> : null}
  {!session.assignment_id && session.status !== 'completed' ? <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm">Remove session and its logs</summary><div className="mt-3"><ActionForm action={deleteWorkoutSession} payload={{ id: session.id }} label="Delete this session permanently" variant="danger" disabled={dirtyForms.length > 0} /></div></details> : null}
  </div>;
}
