import Link from 'next/link';
import { AppShell } from '../../components/layout/app-shell';
import { PageHeader } from '../../components/ui/headings';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { Alert } from '../../components/ui/alert';
import { buttonStyles } from '../../components/ui/button';
import { getInsightFoundation } from '../../lib/data/insights';
import { InsightFacts, InsightHistory, InsightResult } from '../../features/insights/components';
import { GenerateInsightForm } from '../../features/insights/generate-form';
export const maxDuration=60;
export default async function InsightsPage(){
 const {allowed,input,history}=await getInsightFoundation();
 if(!allowed||!input)return <AppShell active="insights"><div className="grid gap-5"><PageHeader title="Weekly insights" description="Understand your recorded week and choose a practical focus."/><Alert variant="warning">AI insights are not included in your current plan.</Alert><Link href="/settings/billing" className={buttonStyles({className:'w-fit'})}>View plans</Link></div></AppShell>;
 const current=history.find(i=>i.period_start===input.period.start&&i.period_end===input.period.end);
 const paused=Boolean(current&&(current.attempts>=3||(current.retry_after&&new Date(current.retry_after).valueOf()>Date.now())));
 return <AppShell active="insights"><div className="grid max-w-4xl gap-6"><PageHeader eyebrow="Insights" title="Your week, in perspective" description="See what your records show, where data is missing, and what to pay attention to next. Generation happens only when you ask."/>
  {current?.status==='completed'?<><InsightResult insight={current}/><InsightFacts input={current.input_snapshot}/></>:<>
   <Card><CardHeader title="Generate weekly insight" description={input.period.start+' – '+input.period.end+' · '+input.period.timezone}/><CardContent className="grid gap-4">
    <p className="text-sm leading-6">This covers the seven local dates ending today. Today is still in progress. The saved report will keep this snapshot even if you add more entries later.</p>
    {current?<Alert variant="warning">{current.status==='pending'?'A generation attempt is pending. Refresh this page to see its result.':'The last attempt could not produce a verified insight.'} {current.attempts>=3?'The retry limit for this period has been reached.':paused?'Wait until '+new Date(current.retry_after!).toLocaleString('en-US',{timeZone:input.period.timezone})+' ('+input.period.timezone+') before retrying.':''}</Alert>:null}
    <GenerateInsightForm disabled={paused} retry={Boolean(current)}/><p className="text-xs text-muted-foreground">One new period per 24 hours. Up to three attempts per period, at least five minutes apart.</p>
   </CardContent></Card><InsightFacts input={input}/>
  </>}
  <InsightHistory insights={history}/>
 </div></AppShell>;
}
