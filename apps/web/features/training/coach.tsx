import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { getCoachClientTrainingSummary } from '../../lib/data/training';
import { AssignmentForm, AssignmentList, TrainingConsistency } from './components';
export async function CoachTraining({ clientId, timezone }: { clientId: string; timezone: string }) {
  const data = await getCoachClientTrainingSummary(clientId);
  if (!data) return null;
  return <Card><CardHeader title="Training" description="Completion and adherence for workouts you assigned through this active relationship." /><CardContent className="grid gap-5"><TrainingConsistency summary={data.summary} timezone={timezone} /><AssignmentList assignments={data.assignments} coach /><details><summary className="cursor-pointer font-semibold">Assign workout</summary><div className="mt-3"><AssignmentForm templates={data.templates} today={data.summary.today} clientId={clientId} /></div></details></CardContent></Card>;
}
