# PHASE 8A ENTITLEMENT ARCHITECTURE

## Design Decision: The Implicit Free Tier
We have selected **Model B** for the Free Tier representation:
*Users without an active paid subscription implicitly receive the Free plan.*

### Justification
Creating a database row for a 'free' subscription for every newly registered user adds unnecessary complexity and requires potentially fragile database triggers. By resolving entitlements dynamically, we ensure:
1. Instant availability of the free tier upon registration.
2. Safe fallback state when a paid subscription naturally expires or is cancelled.
3. No dual-source of truth (e.g., an 'active' free subscription and an 'active' pro subscription colliding).

## The Authority: `get_effective_entitlements()`
All backend functions and UI logic must derive a user's limits by calling the `get_effective_entitlements(user_id)` RPC. 
- It first checks for an `active`, `trialing`, or `past_due` subscription.
- If found, it returns the joined `billing_plans` limits.
- If not found, it queries and returns the `billing_plans` row where `id = 'free'`.

## Treatment of 'Unlimited'
Unlimited quotas (such as Pro tier streaming) are explicitly represented in the database as `NULL`. All PL/pgSQL functions correctly test `IS NOT NULL` before enforcing limits. Magic numbers (e.g., `9999999`) are strictly forbidden.
