import Link from 'next/link';
import { AppShell } from '../../components/layout/app-shell';
import { Alert } from '../../components/ui/alert';
import { buttonStyles } from '../../components/ui/button';
import { PageHeader } from '../../components/ui/headings';
import { JournalHistory, MedicationLogging, MedicationSetup, SymptomLogging } from '../../features/glp1/components';
import { getGLP1Foundation } from '../../lib/data/glp1';

export default async function GLP1Page({ searchParams }: { searchParams: { error?: string; message?: string } }) {
  const data = await getGLP1Foundation();
  if (!data.allowed) return <AppShell active="glp1" glp1Entitled={false}><div className="grid gap-6"><PageHeader eyebrow="Optional journal" title="GLP-1 Journal" description="This journal is available with a plan that includes GLP-1 tracking."/><Alert variant="warning">Your current plan does not include GLP-1 Journal.</Alert><Link href="/settings/billing" className={buttonStyles({ className: 'w-fit' })}>View plans</Link></div></AppShell>;
  const now=new Date().toISOString();
  return <AppShell active="glp1" glp1Entitled><div className="grid gap-6"><PageHeader eyebrow="Optional journal" title="GLP-1 Journal" description="What did I take, when did I take it, and how did I feel afterward?"/><Alert>TFK is a tracking journal, not medical advice. Do not change medication, dose, or treatment based on this app. Contact your clinician or pharmacist with medication questions.</Alert>{searchParams.error?<Alert variant="error">{searchParams.error}</Alert>:null}{searchParams.message?<Alert variant="success">{searchParams.message}</Alert>:null}<MedicationSetup profile={data.medicationProfile}/>{data.medicationProfile?<><MedicationLogging profile={data.medicationProfile} timezone={data.profile!.timezone} now={now} logs={data.doseLogs}/><SymptomLogging profile={data.medicationProfile} timezone={data.profile!.timezone} now={now} doses={data.doseLogs}/><JournalHistory profile={data.medicationProfile} timezone={data.profile!.timezone} doses={data.doseLogs} symptoms={data.symptomLogs}/></>:null}</div></AppShell>;
}
