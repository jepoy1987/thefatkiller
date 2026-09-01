import { AppShell } from '../../components/layout/app-shell';
import { SectionHeader } from '../../components/ui/headings';
import { DashboardAccountability, DashboardHeader, NextActionsCard, TargetCard, WeightGoalCard } from '../../features/dashboard/components';
import { getDashboardFoundation } from '../../lib/data/dashboard';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import Link from 'next/link';
import { doseSummary, journalDateTime, weekdayLabels } from '../../features/glp1/domain';

export default async function DashboardPage() {
  const { dashboard, glp1 } = await getDashboardFoundation();
  return <AppShell active="today"><div className="grid gap-8">
    <DashboardHeader name={dashboard.welcomeName} />
    <section className="grid gap-4"><SectionHeader title="Today’s targets" description="Live nutrition progress against the targets in your active goal. Steps remain at zero until activity tracking is added." /><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{dashboard.targets.map((target) => <TargetCard key={target.key} target={target} />)}</div></section>
    {dashboard.accountability?<DashboardAccountability summary={dashboard.accountability}/>:null}
    {glp1?<Card><CardHeader title="GLP-1 Journal" description="Your optional medication and symptom journal."/><CardContent className="grid gap-2 text-sm">{glp1.lastDose?<p><strong>Last recorded:</strong> {journalDateTime(glp1.lastDose.taken_at,dashboard.profile.timezone)} · {doseSummary(glp1.lastDose)}</p>:<p className="text-muted-foreground">No medication entries yet.</p>}{glp1.medicationProfile.prescribed_schedule?<p><strong>Usual journal schedule:</strong> {glp1.medicationProfile.prescribed_schedule==='weekly'&&glp1.medicationProfile.usual_day_of_week?weekdayLabels[glp1.medicationProfile.usual_day_of_week-1]:glp1.medicationProfile.prescribed_schedule}</p>:null}{glp1.latestSymptom?<p><strong>Latest symptom log:</strong> {journalDateTime(glp1.latestSymptom.logged_at,dashboard.profile.timezone)}</p>:null}<Link href="/glp1" className="font-semibold text-primary">Open journal</Link></CardContent></Card>:null}
    <section className="grid gap-4 lg:grid-cols-2"><WeightGoalCard weightGoal={dashboard.weightGoal} /><NextActionsCard actions={dashboard.nextActions} /></section>
  </div></AppShell>;
}
