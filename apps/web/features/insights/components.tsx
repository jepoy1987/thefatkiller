import Link from 'next/link';
import type { WeeklyInsight, WeeklyInsightInput } from '@tfk/types';
import { Card, CardContent, CardHeader } from '../../components/ui/card';
import { insightDataGaps, insightFacts } from './domain';
export function InsightFacts({input}:{input:WeeklyInsightInput}){
 return <Card><CardHeader title="Your recorded week" description={input.period.start+' – '+input.period.end+' · '+input.period.timezone+' · today is partial'} /><CardContent className="grid gap-5">
  {input.score?<div className="rounded-lg bg-muted p-4"><p className="text-sm font-semibold">Canonical TFK Score</p><p className="mt-1 text-3xl font-black">{input.score.overall}<span className="text-base font-normal text-muted-foreground"> / 100</span></p><p className="mt-2 text-sm">Nutrition {input.score.breakdown.nutrition}/30 · Hydration {input.score.breakdown.hydration}/15 · Habits {input.score.breakdown.habits}/30 · Check-ins {input.score.breakdown.checkIns}/15 · Progress {input.score.breakdown.progress}/10</p></div>:<p className="text-sm">The full TFK Score is unavailable for this report.</p>}
  <ul className="grid gap-2 text-sm leading-6">{insightFacts(input).filter(f=>f.category!=='score').map(f=><li key={f.text}>{f.text}</li>)}</ul>
  <details className="rounded-lg border p-4"><summary className="cursor-pointer text-sm font-semibold">How to read these numbers</summary><div className="mt-3 grid gap-3 text-sm text-muted-foreground"><p>Targets are your current configured goals. Calorie adherence means within 85–115% of target; protein and water mean meeting the full target. The existing TFK Score uses its own unchanged formula.</p><p>Habits cover active daily habits from their creation date. Weekly check-ins count the calendar weeks overlapping this period. Assigned workouts use scheduled dates; total workouts use completion dates. Coaching counts only visible goals in active relationships.</p><ul className="grid gap-2">{insightDataGaps(input).map(g=><li key={g}>{g}</li>)}</ul></div></details>
 </CardContent></Card>;
}
export function InsightResult({insight}:{insight:WeeklyInsight}){
 const result=insight.insight_json;
 if(!result)return null;
 return <div className="grid gap-5">
  <Card><CardHeader title={result.headline} description="A reflection on your recorded patterns, not a medical assessment."/><CardContent><p className="text-sm leading-7">{result.summary}</p></CardContent></Card>
  <div className="grid gap-5 md:grid-cols-2">{([{title:'Wins',items:result.wins},{title:'Watch items',items:result.watch_items}]).map(section=><Card key={section.title}><CardHeader title={section.title}/><CardContent>{section.items.length?<ul className="grid gap-5">{section.items.map((item,i)=><li key={i}><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.evidence}</p></li>)}</ul>:<p className="text-sm text-muted-foreground">No supported observations in this section.</p>}</CardContent></Card>)}</div>
  <Card><CardHeader title="Next week focus"/><CardContent><ul className="grid gap-4">{result.next_week_focus.map((item,i)=><li key={i}><h3 className="font-semibold">{item.title}</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">{item.reason}</p></li>)}</ul></CardContent></Card>
  <Card><CardHeader title="Data gaps"/><CardContent><ul className="grid gap-2 text-sm leading-6">{result.data_gaps.map(gap=><li key={gap}>{gap}</li>)}</ul></CardContent></Card>
 </div>;
}
export function InsightHistory({insights}:{insights:WeeklyInsight[]}){
 return <Card><CardHeader title="Recent insights" description="Your latest 10 periods. Saved insights retain the facts used at generation time."/><CardContent>{insights.length?<ul className="divide-y">{insights.map(i=><li key={i.id} className="py-3 first:pt-0 last:pb-0"><Link href={'/insights/'+i.id} className="font-semibold text-primary">{i.period_start} – {i.period_end}</Link><p className="mt-1 text-sm text-muted-foreground">{i.insight_json?.headline??(i.status==='pending'?'Generation pending':'Generation unsuccessful')} · {i.status}</p></li>)}</ul>:<p className="text-sm text-muted-foreground">No saved insights yet.</p>}</CardContent></Card>;
}
export function TodayInsightCard({insight}:{insight:Pick<WeeklyInsight,'id'|'period_start'|'period_end'|'insight_json'>|null}){
 return <Card><CardHeader title="Weekly insight" description={insight?insight.period_start+' – '+insight.period_end:undefined}/><CardContent className="grid gap-3 text-sm"><p>{insight?.insight_json?.headline??'Your weekly insight is ready to generate.'}</p><Link href={insight?'/insights/'+insight.id:'/insights'} className="font-semibold text-primary">Open Weekly Insight</Link></CardContent></Card>;
}
