import type { EntitlementLimits, FeatureCode } from '@tfk/types';
import { SettingsShell } from '../../../components/layout/settings-shell';
import { Alert } from '../../../components/ui/alert';
import { Card, CardContent, CardHeader } from '../../../components/ui/card';
import { getBillingFoundation } from '../../../lib/data/entitlements';

const futureFeatures = new Set<FeatureCode>(['advanced_reports', 'coach_access', 'ai_insights', 'glp1_journal', 'workouts']);
const title = (value: string) => value.replaceAll('_', ' ').replace(/^./, (letter) => letter.toUpperCase());
const limitText = (limits: EntitlementLimits) => Object.entries(limits).map(([name, value]) => `${title(name)}: ${value === null ? 'Unlimited' : value}`).join(' · ');

export default async function BillingSettingsPage() {
  const { entitlements, plans, features, matrix } = await getBillingFoundation();
  const featureById = new Map(features.map((feature) => [feature.id, feature]));
  const featureByCode = new Map(features.map((feature) => [feature.code, feature]));
  const status = entitlements.subscriptionStatus ? title(entitlements.subscriptionStatus) : 'Free access';
  return <SettingsShell active="billing"><div className="grid gap-5">
    {entitlements.isInternalTest ? <Alert variant="warning">This plan is an internal test assignment. No payment provider is connected.</Alert> : null}
    <Card><CardHeader title="Current plan" description="Your access is resolved from feature entitlements, independently of any future billing provider."/><CardContent className="grid gap-4 sm:grid-cols-2">
      <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Plan</p><p className="mt-1 text-2xl font-black">{entitlements.plan.name}</p></div>
      <div><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</p><p className="mt-1 font-bold">{status}</p>{entitlements.provider ? <p className="text-sm text-muted-foreground">Provider: {title(entitlements.provider)}</p> : null}</div>
      {entitlements.currentPeriodStart || entitlements.currentPeriodEnd ? <div className="sm:col-span-2 text-sm text-muted-foreground">Period: {entitlements.currentPeriodStart ? new Date(entitlements.currentPeriodStart).toLocaleDateString() : '—'} to {entitlements.currentPeriodEnd ? new Date(entitlements.currentPeriodEnd).toLocaleDateString() : 'Ongoing'}{entitlements.cancelAtPeriodEnd ? ' · Cancels at period end' : ''}</div> : null}
      <div className="sm:col-span-2"><p className="text-sm font-bold">Included features</p><ul className="mt-2 grid gap-2 sm:grid-cols-2">{entitlements.features.map((code)=><li key={code} className="rounded-lg border px-3 py-2 text-sm"><span className="font-semibold">{featureByCode.get(code)?.name ?? title(code)}</span>{futureFeatures.has(code) ? <span className="ml-2 text-xs text-muted-foreground">Future</span> : null}{entitlements.limits[code] && Object.keys(entitlements.limits[code]!).length ? <span className="block text-xs text-muted-foreground">{limitText(entitlements.limits[code]!)}</span> : null}</li>)}</ul></div>
    </CardContent></Card>
    <Alert>Online billing is not connected yet. Pricing and self-service plan changes are coming soon.</Alert>
    <section aria-labelledby="plan-comparison"><h2 id="plan-comparison" className="text-xl font-black tracking-tight">Compare plans</h2><p className="mt-1 text-sm text-muted-foreground">Pricing coming soon. Future entitlements do not enable unfinished product routes.</p><div className="mt-4 grid gap-4 xl:grid-cols-3">{plans.map((plan)=>{const included=matrix.filter((item)=>item.plan_id===plan.id&&item.enabled);return <Card key={plan.id} className={plan.code===entitlements.plan.code?'border-primary/40':''}><CardHeader title={plan.name} description={plan.description??undefined}/><CardContent><ul className="grid gap-2 text-sm">{included.map((item)=>{const feature=featureById.get(item.feature_id);if(!feature)return null;return <li key={item.id}><span aria-hidden="true">✓</span> {feature.name}{futureFeatures.has(feature.code)?' · Future':''}{Object.keys(item.limits).length?` · ${limitText(item.limits)}`:''}</li>})}</ul><p className="mt-5 text-sm font-bold text-muted-foreground">Pricing coming soon</p></CardContent></Card>})}</div></section>
  </div></SettingsShell>;
}
