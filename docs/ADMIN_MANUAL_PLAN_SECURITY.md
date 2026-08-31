# Admin Manual Plan Grants — Security & Data Isolation Audit

**MR RAJPOOT STUDIO OBS 24/7 — PHASE 15A SECURITY DOCUMENTATION**

---

## 1. Multi-Tenant Security & Isolation

The admin manual plan grant system is engineered with strict zero-trust security controls:

### 1.1 Row-Level Security (RLS)
The `billing_plan_grants` table has RLS explicitly enabled:
- **SELECT Policy (`Users can view own active plan grants`)**:
  - `FOR SELECT USING (auth.uid() = user_id OR public.is_admin())`
  - Regular users can only read their own plan grants.
- **ALL / Mutating Policies (`Admin and service role full control on billing_plan_grants`)**:
  - `FOR ALL USING (public.is_admin() OR auth.role() = 'service_role')`
  - Non-admin / anonymous write attempts are unconditionally blocked by PostgreSQL engine policies.

### 1.2 Null-Safe Admin RPC Authentication
The administrative functions (`admin_grant_plan`, `admin_revoke_plan_grant`, `admin_list_user_plan_grants`) are declared `SECURITY DEFINER` with fixed `search_path = public` and execute a null-safe authorization check:

```plpgsql
DECLARE
    v_is_admin BOOLEAN;
    v_is_service_role BOOLEAN;
BEGIN
    v_is_admin := COALESCE(public.is_admin(), false);
    v_is_service_role := (COALESCE(auth.role(), 'anon') = 'service_role');

    IF NOT v_is_admin AND NOT v_is_service_role THEN
        RAISE EXCEPTION 'Unauthorized: Administrator privileges required.';
    END IF;
```

This prevents three-valued logic bypasses where unauthenticated calls might have resulted in `NULL` evaluation.

---

## 2. Separation from Stripe Infrastructure

A critical design requirement of Phase 15A is zero fabricated Stripe records:
- **No Fake Invoices**: 0 records inserted into Stripe or local invoice caches.
- **No Fake Customers**: Manual grants do not require or fabricate a Stripe customer ID.
- **No Fake Checkout**: No mock checkout sessions or forged webhooks are sent.
- **Preservation of Paid Subscriptions**: If a paying customer (e.g. Creator or Pro) is granted Agency access, their underlying Stripe subscription remains untouched in the background. When the Agency grant expires or is revoked, their paid Stripe subscription automatically resumes as the authoritative source.

---

## 3. Idempotency & Concurrency Safety

- **Duplicate Grant Handling**: If an administrator attempts to grant the same plan with identical expiration to a user who already holds that active grant, the RPC detects the active row and returns the existing `grant_id` without creating duplicate records.
- **Grant Replacement**: If a new plan or modified expiration date is granted, the prior active grant is atomically superseded (`revoked_at = now()`) in the same database transaction before inserting the new grant.
- **Immutable Audit Trail**: All operations insert an immutable event into `public.billing_audit_logs`.
