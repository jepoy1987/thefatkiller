import Link from 'next/link';
import { AppShell } from '../../../../components/layout/app-shell';
import { PageHeader } from '../../../../components/ui/headings';
import { SessionLogger } from '../../../../features/training/session';
import { getWorkoutSessionDetail } from '../../../../lib/data/training';
export default async function SessionPage({ params }: { params: { sessionId: string } }) {
  const { session, exercises, sets, profile } = await getWorkoutSessionDetail(params.sessionId);
  return <AppShell active="training"><div className="grid max-w-3xl gap-5"><Link href="/training" className="text-sm text-primary">← Training</Link><PageHeader title={session.name_snapshot} description={`${new Date(session.started_at).toLocaleString('en-US', { timeZone: profile.timezone })} · ${session.status.replaceAll('_', ' ')}`} /><SessionLogger key={session.status} session={session} exercises={exercises} sets={sets} units={profile.unit_system} /></div></AppShell>;
}
