import type { EntitlementLimits, EntitlementSet, FeatureCode, Plan, PlanEntitlement, SubscriptionStatus, UserSubscription } from '@tfk/types';

export class FeatureAccessError extends Error {
  readonly feature: FeatureCode;

  constructor(feature: FeatureCode) {
    super(`Feature not available: ${feature}`);
    this.name = 'FeatureAccessError';
    this.feature = feature;
  }
}

export function hasFeature(entitlements: EntitlementSet, feature: FeatureCode) {
  return entitlements.features.includes(feature);
}

export function getFeatureLimit(entitlements: EntitlementSet, feature: FeatureCode, limit: string) {
  return entitlements.limits[feature]?.[limit] ?? null;
}

export function requireFeature(entitlements: EntitlementSet, feature: FeatureCode) {
  if (!hasFeature(entitlements, feature)) throw new FeatureAccessError(feature);
}

type ResolverInput = {
  plans: Plan[];
  entitlements: PlanEntitlement[];
  featureCodesById: Record<string, FeatureCode>;
  latestSubscription: UserSubscription | null;
  now?: Date;
};

const accessStatuses: SubscriptionStatus[] = ['active', 'trialing'];

export function resolveEntitlementSet({ plans, entitlements, featureCodesById, latestSubscription, now = new Date() }: ResolverInput): EntitlementSet {
  const periodActive = !latestSubscription?.current_period_end || new Date(latestSubscription.current_period_end) > now;
  const trialActive = latestSubscription?.status !== 'trialing' || !latestSubscription.trial_ends_at || new Date(latestSubscription.trial_ends_at) > now;
  const paidAccess = Boolean(latestSubscription && accessStatuses.includes(latestSubscription.status) && periodActive && trialActive);
  const free = plans.find((plan) => plan.code === 'free' && plan.is_active);
  const selected = paidAccess ? plans.find((plan) => plan.id === latestSubscription?.plan_id && plan.is_active) : free;
  if (!selected) throw new Error('No active Free plan is configured.');
  const selectedEntitlements = entitlements.filter((item) => item.plan_id === selected.id && item.enabled);
  const features = selectedEntitlements.map((item) => featureCodesById[item.feature_id]).filter((code): code is FeatureCode => Boolean(code));
  const limits = Object.fromEntries(selectedEntitlements.flatMap((item) => {
    const code = featureCodesById[item.feature_id];
    return code ? [[code, item.limits as EntitlementLimits]] : [];
  })) as Partial<Record<FeatureCode, EntitlementLimits>>;
  return {
    plan: { code: selected.code, name: selected.name },
    subscriptionStatus: latestSubscription?.status ?? null,
    provider: latestSubscription?.provider ?? null,
    features,
    limits,
    currentPeriodStart: paidAccess ? latestSubscription?.current_period_start ?? null : null,
    currentPeriodEnd: paidAccess ? latestSubscription?.current_period_end ?? null : null,
    cancelAtPeriodEnd: paidAccess ? latestSubscription?.cancel_at_period_end ?? false : false,
    trialEndsAt: paidAccess ? latestSubscription?.trial_ends_at ?? null : null,
    isInternalTest: paidAccess && (latestSubscription?.provider === 'internal' || latestSubscription?.provider === 'manual'),
  };
}
