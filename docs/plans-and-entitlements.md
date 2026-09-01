# Plans and entitlements

Sprint 6A keeps product access independent from billing providers. `plans`, `features`, and `plan_entitlements` define access; `user_subscriptions` records provider state. Roles remain in `user_roles` and never imply a plan.

Users without an eligible `active` or `trialing` subscription resolve to Free. Canceled, expired, past-due, incomplete, ended, or expired-trial records do not grant paid access. Historical subscription rows remain available, while a partial unique index permits only one non-terminal record per user.

## Staging assignment

There is no public upgrade endpoint. An authenticated admin may make a staging-only internal assignment through the restricted RPC:

```ts
await supabase.rpc('admin_assign_internal_plan', {
  target_user_id: '<user uuid>',
  target_plan_code: 'premium',
});
```

The function verifies `auth.uid()` against `user_roles.role = 'admin'`, expires any prior current record, and creates an `internal` assignment without provider identifiers. Normal authenticated users receive PostgreSQL error `42501`.

## Sprint 6B integration point

A future trusted webhook maps a provider price to a stable TFK plan code, then inserts or updates `user_subscriptions` with provider, external identifiers, status, and period dates. `get_current_entitlements()` automatically reflects that state, so web and future mobile feature gates do not depend on Stripe, Apple, or Google-specific code. Provider price mappings are deferred until real product and price identifiers exist.
