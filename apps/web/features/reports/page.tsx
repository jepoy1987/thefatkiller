import Link from 'next/link';
import { AppShell } from '../../components/layout/app-shell';
import { PageHeader } from '../../components/ui/headings';
import { Alert } from '../../components/ui/alert';
import { buttonStyles } from '../../components/ui/button';
import { getReport } from '../../lib/data/reports';
import { ReportFilters, ReportSections } from './components';
export async function ReportsPage({query,clientId}:{query:Record<string,string|undefined>;clientId?:string}){
 const {allowed,context,report,error}=await getReport(query,clientId);
 const path=clientId?'/coach/clients/'+clientId+'/reports':'/reports';
 return <AppShell active={clientId?'coach':'reports'}><div className="grid max-w-5xl gap-6">{clientId?<Link href={'/coach/clients/'+clientId} className="font-semibold text-primary">← Client overview</Link>:null}<PageHeader eyebrow={clientId?'Client reports':'Reports'} title="Your records over time" description="Review recorded trends, consistency and missing data for a defined period."/>{!allowed?<><Alert variant="warning">Advanced reports are not included in your current plan.</Alert><Link href="/settings/billing" className={buttonStyles({className:'w-fit'})}>View plans</Link></>:<>{context?<ReportFilters context={context} period={report?.period} path={path}/>:null}{error?<Alert variant="error">{error}</Alert>:null}{report?<ReportSections report={report}/>:null}</>}</div></AppShell>;
}
