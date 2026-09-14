import Link from 'next/link';
import { exerciseCategories, exerciseEquipment } from '@tfk/validation';
import { AppShell } from '../../components/layout/app-shell';
import { Alert } from '../../components/ui/alert';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Input, Select } from '../../components/ui/form';
import { PageHeader } from '../../components/ui/headings';
import { buttonStyles } from '../../components/ui/button';
import { AssignmentForm, AssignmentList, MyWorkouts, TrainingConsistency, WorkoutHistory } from '../../features/training/components';
import { ExerciseEditor } from '../../features/training/editors';
import { ActionForm } from '../../features/training/forms';
import { getTrainingFoundation } from '../../lib/data/training';
import { deleteExercise } from '../../server/actions/training';

export default async function TrainingPage({ searchParams }: { searchParams: { q?: string; category?: string; equipment?: string } }) {
  const foundation = await getTrainingFoundation(searchParams);
  if (!foundation.data) return <AppShell active="training"><div className="grid gap-5"><PageHeader title="Training" description="Build workouts and track your training with a plan that includes workouts." /><Alert variant="warning">Training is not included in your current plan.</Alert><Link href="/settings/billing" className={buttonStyles({ className: 'w-fit' })}>View plans</Link></div></AppShell>;
  const { profile, exercises, templates, assignments, history, today } = foundation.data;
  return <AppShell active="training"><div className="grid gap-6"><PageHeader eyebrow="Training" title="Your next workout" description="Choose activities appropriate for your ability and follow professional guidance where needed." />
    <Card><CardHeader title="Today’s training" description={`Training dates use ${profile.timezone}.`} /><CardContent className="grid gap-4">{today.assignments.length ? <AssignmentList assignments={today.assignments} /> : <p className="text-sm text-muted-foreground">Nothing assigned today. Start one of your workouts or schedule a session below.</p>}<TrainingConsistency summary={today.summary} timezone={profile.timezone} /></CardContent></Card>
    <Card><CardHeader title="Assigned workouts" description="Latest 50 assignments, including completed and skipped workouts." /><CardContent className="grid gap-5"><AssignmentList assignments={assignments} /><details><summary className="cursor-pointer font-semibold">Schedule one of my workouts</summary><div className="mt-3"><AssignmentForm templates={templates} today={today.summary.today} /></div></details></CardContent></Card>
    <MyWorkouts templates={templates} /><WorkoutHistory history={history} timezone={profile.timezone} />
    <Card><CardHeader title="Exercise library" description="Starter exercises and your custom exercises. Up to 100 matches; narrow your search to find more." /><CardContent className="grid gap-5">
      <form action="/training" className="grid items-end gap-3 sm:grid-cols-4"><label className="grid gap-1 text-sm">Exercise search<Input name="q" defaultValue={searchParams.q} maxLength={120} /></label><label className="grid gap-1 text-sm">Filter category<Select name="category" defaultValue={searchParams.category ?? ''}><option value="">All categories</option>{exerciseCategories.map(v => <option key={v} value={v}>{v}</option>)}</Select></label><label className="grid gap-1 text-sm">Filter equipment<Select name="equipment" defaultValue={searchParams.equipment ?? ''}><option value="">All equipment</option>{exerciseEquipment.map(v => <option key={v} value={v}>{v.replaceAll('_', ' ')}</option>)}</Select></label><button className={buttonStyles({ variant: 'outline' })}>Search exercises</button></form>
      <details className="rounded-lg border p-4"><summary className="cursor-pointer font-semibold">Create custom exercise</summary><div className="mt-4"><ExerciseEditor /></div></details>
      {exercises.length ? <ul className="grid gap-3 sm:grid-cols-2">{exercises.map(exercise => <li key={exercise.id} className="rounded-lg border p-4"><h3 className="font-semibold">{exercise.name}</h3><p className="text-sm text-muted-foreground">{exercise.category} · {exercise.equipment.replaceAll('_', ' ')} · {exercise.tracking_type.replaceAll('_', ' ')}</p>{exercise.instructions ? <p className="mt-2 text-sm">{exercise.instructions}</p> : null}{exercise.owner_user_id === foundation.user.id ? <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold">Edit custom exercise</summary><div className="mt-3 grid gap-4"><ExerciseEditor exercise={exercise} /><ActionForm action={deleteExercise} payload={{ id: exercise.id }} label="Delete custom exercise" variant="danger" /></div></details> : null}</li>)}</ul> : <p className="text-sm">No exercises match these filters.</p>}
    </CardContent></Card>
  </div></AppShell>;
}
