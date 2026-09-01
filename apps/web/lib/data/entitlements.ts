import type { BillingProvider, EntitlementLimits, EntitlementSet, Feature, FeatureCode, Plan, PlanCode, PlanEntitlement, SubscriptionStatus } from '@tfk/types';
import type { WebSupabaseClient } from './client';
import { createClient } from './client';
import { requireUser } from './session';

type EntitlementRpcRow = {
  plan_code: string;
  plan_name: string;
  subscription_status: SubscriptionStatus | null;
  provider: BillingProvider | null;
  feature_codes: string[];
  limits: Record<string, EntitlementLimits>;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_ends_at: string | null;
  is_internal_test: boolean;
};

export async function getCurrentEntitlements(supabase: WebSupabaseClient): Promise<EntitlementSet> {
  const { data, error } = await supabase.rpc('get_current_entitlements').single();
  if (error || !data) throw new Error('Your plan access could not be loaded.');
  const row = data as EntitlementRpcRow;
  return {
    plan: { code: row.plan_code as PlanCode, name: row.plan_name },
    subscriptionStatus: row.subscription_status,
    provider: row.provider,
    features: row.feature_codes as FeatureCode[],
    limits: row.limits as Partial<Record<FeatureCode, EntitlementLimits>>,
    currentPeriodStart: row.current_period_start,
    currentPeriodEnd: row.current_period_end,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    trialEndsAt: row.trial_ends_at,
    isInternalTest: row.is_internal_test,
  };
}

export async function getBillingFoundation() {
  const supabase = createClient();
  await requireUser(supabase);
  const [entitlements, plansResult, featuresResult, matrixResult] = await Promise.all([
    getCurrentEntitlements(supabase),
    supabase.from('plans').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('features').select('*').order('name'),
    supabase.from('plan_entitlements').select('*').eq('enabled', true),
  ]);
  const failed = [plansResult, featuresResult, matrixResult].find((result) => result.error);
  if (failed?.error) throw new Error('Plan details could not be loaded.');
  return {
    entitlements,
    plans: (plansResult.data ?? []) as Plan[],
    features: (featuresResult.data ?? []) as Feature[],
    matrix: (matrixResult.data ?? []) as PlanEntitlement[],
  };
}
