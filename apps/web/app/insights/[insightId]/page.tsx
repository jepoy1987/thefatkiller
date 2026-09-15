import Link from 'next/link';
import { AppShell } from '../../../components/layout/app-shell';
import { PageHeader } from '../../../components/ui/headings';
import { Alert } from '../../../components/ui/alert';
import { getInsightDetail } from '../../../lib/data/insights';
import { InsightFacts, InsightResult } from '../../../features/insights/components';
export default async function InsightDetailPage(props:{params: Promise<{insightId:string}>}) {
 const params = await props.params;
 const insight=await getInsightDetail(params.insightId);
 return <AppShell active="insights"><div className="grid max-w-4xl gap-6"><Link href="/insights" className="text-sm font-semibold text-primary">← Weekly insights</Link><PageHeader title="Weekly insight" description={insight.period_start+' – '+insight.period_end+' · '+insight.timezone}/>
 {insight.status==='completed'?<InsightResult insight={insight}/>:<Alert variant="warning">{insight.status==='pending'?'This insight is pending. Refresh to check its status, or return to Weekly insights for retry availability.':'This insight could not be generated. Return to Weekly insights to retry if this is the current period.'}</Alert>}
 <InsightFacts input={insight.input_snapshot}/>
 </div></AppShell>;
}
