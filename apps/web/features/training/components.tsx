import Link from 'next/link';
import { assignmentCanStart, sessionDurationSeconds, trainingAdherence } from '@tfk/api';
import type { TrainingSummary, WorkoutAssignment, WorkoutSession, WorkoutTemplate } from '@tfk/types';
import { archiveWorkoutTemplate, assignWorkout, startWorkoutSession, updateAssignmentStatus } from '../../server/actions/training';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Input, Select } from '../../components/ui/form';
import { buttonStyles } from '../../components/ui/button';
import { ActionForm } from './forms';

export function TrainingConsistency({ summary, timezone }: { summary: TrainingSummary; timezone: string }) {
  const adherence = trainingAdherence(summary);
  return <div className="grid gap-2 text-sm"><p><strong>{summary.completed_7d}</strong> completed in 7 days · <strong>{summary.completed_30d}</strong> in 30 days</p><p>Scheduled in the last 7 days: {summary.assigned_completed_7d}/{summary.assigned_7d} completed{adherence == null ? '' : ` (${adherence}%)`}</p><p>Last completed: {summary.last_completed_at ? new Date(summary.last_completed_at).toLocaleString('en-US', { timeZone: timezone }) : 'None yet'}</p></div>;
}
export function AssignmentList({ assignments, coach = false }: { assignments: WorkoutAssignment[]; coach?: boolean }) {
  if (!assignments.length) return <p className="text-sm text-muted-foreground">No assigned workouts. Choose one of your workouts to start training.</p>;
  return <ul className="grid gap-3">{assignments.map(assignment => <li key={assignment.id} className="grid gap-3 rounded-lg border p-4"><div><h3 className="font-semibold">{assignment.template?.name ?? 'Assigned workout'}</h3><p className="text-sm text-muted-foreground">{assignment.assigned_for ?? 'Unscheduled'} · {assignment.status.replaceAll('_', ' ')}{assignment.coach_user_id ? ' · Coach assigned' : ' · Self assigned'}</p>{assignment.notes ? <p className="mt-2 text-sm">{assignment.notes}</p> : null}</div><div className="flex flex-wrap gap-3">{!coach && assignmentCanStart(assignment.status) ? <ActionForm action={startWorkoutSession} payload={{ assignment_id: assignment.id }} label={assignment.status === 'in_progress' ? 'Resume workout' : 'Start assigned workout'} pendingLabel="Starting…" /> : null}{assignment.status === 'assigned' ? <ActionForm action={updateAssignmentStatus} payload={{ id: assignment.id, status: coach ? 'archived' : 'skipped' }} label={coach ? 'Archive assignment' : 'Skip workout'} variant="outline" /> : null}{!coach && assignment.status === 'skipped' ? <ActionForm action={updateAssignmentStatus} payload={{ id: assignment.id, status: 'assigned' }} label="Restore assignment" variant="outline" /> : null}</div></li>)}</ul>;
}
export function AssignmentForm({ templates, today, clientId }: { templates: WorkoutTemplate[]; today: string; clientId?: string }) {
  if (!templates.length) return <p className="text-sm">Create a workout in <Link href="/training/workouts/new" className="text-primary underline">Training</Link> before assigning it.</p>;
  // Blank scheduling is not needed in the first UI; the command supports it.
  return <ActionForm action={assignWorkout} label={clientId ? 'Assign workout to client' : 'Schedule workout'}>
    {clientId ? <input type="hidden" name="client_id" value={clientId} /> : null}
    <label className="grid gap-1 text-sm">Workout<Select name="workout_template_id">{templates.map(template => <option key={template.id} value={template.id}>{template.name}</option>)}</Select></label>
    <label className="grid gap-1 text-sm">Training date<Input type="date" name="assigned_for" required defaultValue={today} /></label>
    <label className="grid gap-1 text-sm">Assignment notes<Input name="notes" maxLength={1000} /></label>
  </ActionForm>;
}
export function MyWorkouts({ templates }: { templates: WorkoutTemplate[] }) {
  return <Card><CardHeader title="My workouts" description="Your latest 50 active workouts." action={<Link href="/training/workouts/new" className={buttonStyles({ size: 'sm' })}>Create workout</Link>} /><CardContent className="grid gap-3">{templates.length ? templates.map(template => <div className="grid gap-3 rounded-lg border p-4" key={template.id}><h3 className="font-semibold">{template.name}</h3>{template.description ? <p className="text-sm text-muted-foreground">{template.description}</p> : null}<div className="flex flex-wrap items-start gap-3"><ActionForm action={startWorkoutSession} payload={{ workout_template_id: template.id }} label="Start workout" pendingLabel="Starting…" /><Link href={`/training/workouts/${template.id}`} className={buttonStyles({ variant: 'outline', size: 'sm' })}>Edit workout</Link><ActionForm action={archiveWorkoutTemplate} payload={{ id: template.id }} label="Archive workout" variant="outline" /></div></div>) : <p className="text-sm text-muted-foreground">Create your first workout with exercises from the starter library.</p>}</CardContent></Card>;
}
export function WorkoutHistory({ history, timezone }: { history: WorkoutSession[]; timezone: string }) {
  return <Card><CardHeader title="Recent history" description="Your latest 20 sessions. Open an unfinished session to resume." /><CardContent>{history.length ? <ul className="grid gap-3">{history.map(session => <li key={session.id} className="rounded-lg border p-3"><Link className="font-semibold text-primary" href={`/training/sessions/${session.id}`}>{session.name_snapshot}</Link><p className="text-sm text-muted-foreground">{new Date(session.started_at).toLocaleString('en-US', { timeZone: timezone })} · {session.exercise_count} exercises · {session.status.replaceAll('_', ' ')}{session.completed_at ? ` · ${Math.floor(sessionDurationSeconds(session) / 60)} min` : ''}</p></li>)}</ul> : <p className="text-sm text-muted-foreground">Your sessions will appear here once you start a workout.</p>}</CardContent></Card>;
}
export function TodayTrainingCard({ assignments }: { assignments: WorkoutAssignment[] }) {
  return <Card><CardHeader title="Training" /><CardContent className="grid gap-2 text-sm">{assignments.length ? assignments.map(a => <p key={a.id}>{a.template?.name ?? 'Assigned workout'} · {a.status.replaceAll('_', ' ')}</p>) : <p>Nothing assigned today</p>}<Link href="/training" className="font-semibold text-primary">Open Training</Link></CardContent></Card>;
}
