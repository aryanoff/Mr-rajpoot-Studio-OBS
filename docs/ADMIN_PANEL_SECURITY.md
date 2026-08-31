# Admin Panel Security & Multi-Tenant Authorization Architecture

## 1. Security Overview

The **MR RAJPOOT STUDIO OBS 24/7** administrative subsystem enforces strict role-based access control (RBAC), multi-tenant isolation, null-safe PostgreSQL authorization, and immutable audit logging.

```
                  ┌─────────────────────────────────┐
                  │    Authenticated User Session   │
                  └────────────────┬────────────────┘
                                   │
                                   ▼
                  ┌─────────────────────────────────┐
                  │      public.is_admin() Check    │
                  │  (COALESCE(is_admin(), false))  │
                  └───────┬─────────────────┬───────┘
                          │                 │
                  ALLOWED │                 │ DENIED (403/Forbidden)
                          ▼                 ▼
          ┌───────────────────────────┐   ┌───────────────────────────┐
          │ Admin RPCs & Audit Engine │   │ Terminate with Permission │
          │ - admin_grant_plan()      │   │ Error (Zero data exposed) │
          │ - admin_revoke_plan()     │   └───────────────────────────┘
          │ - billing_audit_logs      │
          └───────────────────────────┘
```

---

## 2. Null-Safe Admin Authorization Pattern

PostgreSQL uses three-valued logic (`TRUE`, `FALSE`, `NULL`). If `auth.uid()` is null or a subquery returns null, an unguarded `IF NOT public.is_admin()` can fail open or produce unexpected errors.

All administrative functions and security-definer RPCs in the repository strictly enforce null-safe boolean resolution:

```sql
IF NOT COALESCE(public.is_admin(), false) THEN
    RAISE EXCEPTION 'Unauthorized: Administrator access required to perform this action.';
END IF;
```

---

## 3. Authoritative Entitlement Precedence & Isolation

Manual administrative grants operate strictly above Stripe subscriptions in entitlement precedence without modifying Stripe customer records:

```
                  ┌────────────────────────────────────────┐
                  │   get_effective_entitlements(user_id)  │
                  └──────────────────┬─────────────────────┘
                                     │
           ┌─────────────────────────┴─────────────────────────┐
           ▼                                                   ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│ Active Admin Grant Exists?    │               │  No Active Admin Grant        │
├───────────────────────────────┤               ├───────────────────────────────┤
│ Tier: AGENCY (or granted tier)│               │  Check Stripe Subscription    │
│ Source: admin_grant           │               │  - If active: Creator / Pro   │
│ Limits: 10 streams / 500GB    │               │  - If none: Free tier         │
└───────────────────────────────┘               └───────────────────────────────┘
```

### Invariants:
1. **Zero Fabrication**: Manual grants do NOT create fake Stripe charges, checkout sessions, or invoices.
2. **Underlying State Preservation**: If a user on a paid Creator subscription receives an Agency admin grant, their Creator subscription remains active in Stripe. If the admin grant expires or is revoked, the user automatically drops back to Creator without disruption.
3. **Multi-Tenant Separation**: User A's manual grant is completely partitioned by `user_id` and has zero side effects on User B.

---

## 4. Immutable Audit Logging

Every administrative mutation generates an audit record in `public.billing_audit_logs`:

| Column | Type | Purpose |
|---|---|---|
| `id` | `UUID PRIMARY KEY` | Unique log identifier |
| `admin_user_id` | `UUID REFERENCES auth.users(id)` | Administrator who performed the action |
| `action` | `TEXT` | `ADMIN_PLAN_GRANTED`, `ADMIN_PLAN_REVOKED`, etc. |
| `target_type` | `TEXT` | `user`, `subscription`, `webhook` |
| `target_id` | `TEXT` | ID of customer or target entity |
| `details` | `JSONB` | Serialized metadata (plan, duration, reason) |
| `created_at` | `TIMESTAMPTZ` | Tamper-proof timestamp |

RLS policies ensure only verified administrators can view and append audit logs.

---

## 5. UI Error Masking & Security Hardening

- Frontend error handlers strictly intercept raw database exceptions (e.g. `23505 duplicate key`, `P0001`, `auth/unauthorized`).
- The user interface presents sanitized copy (e.g. *"You don't have permission to perform this action"* or *"Agency access is already active for this customer"*).
- Zero stack traces, table names, or internal database schemas are exposed to the client.
