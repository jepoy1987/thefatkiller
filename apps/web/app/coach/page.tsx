import { AppShell } from '../../components/layout/app-shell';
import { EmptyState } from '../../components/ui/empty-state';
import { PageHeader } from '../../components/ui/headings';
import { CoachClientCard } from '../../features/coaching/components';
import { getCoachDashboard } from '../../lib/data/coaching';
export default async function CoachPage(){const clients=await getCoachDashboard();return <AppShell active="coach"><div className="grid gap-6"><PageHeader eyebrow="Coaching" title="Coach dashboard" description="See who needs attention and open a bounded review."/>{clients.length?<div className="grid gap-4 lg:grid-cols-2">{clients.map(client=><CoachClientCard key={client.client_id} client={client}/>)}</div>:<EmptyState title="No active clients" description="An administrator must assign coaching relationships."/>}</div></AppShell>}
