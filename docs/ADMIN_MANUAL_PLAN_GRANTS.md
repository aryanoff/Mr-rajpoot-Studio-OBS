# Admin-Only Manual Plan Grants & Authoritative Entitlement Architecture

**MR RAJPOOT STUDIO OBS 24/7 — PHASE 15A SPECIFICATION**

---

## 1. Overview & Core Philosophy

MR RAJPOOT STUDIO OBS 24/7 implements an authoritative, multi-tiered SaaS entitlement engine. The platform allows administrators to manually grant plan access (such as the **Agency** tier) directly to specific users without requiring Stripe payment, without generating fake invoices or fake checkout sessions, and without modifying Stripe customer state.

### The Fundamental Rule
> **Stripe is a payment provider, not the source of truth for entitlements.**
> The application's PostgreSQL database and authoritative entitlement resolver (`get_effective_entitlements`) are the single source of truth for features and resource limits.

---

## 2. Entitlement Engine Precedence

When any studio subsystem (Compositor, FFmpeg Worker, API, or Frontend Studio) queries user limits, `get_effective_entitlements(p_user_id)` resolves access in strict deterministic order:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Active Admin Manual Grant (public.billing_plan_grants)   │
│    WHERE revoked_at IS NULL                                 │
│      AND starts_at <= now()                                 │
│      AND (expires_at IS NULL OR expires_at > now())         │
│    → Source: 'admin_grant'                                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ (if none active)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Active Paid Stripe Subscription (public.subscriptions)    │
│    WHERE status IN ('active', 'trialing', 'past_due')       │
│      AND current_period_end > now()                         │
│    → Source: 'stripe'                                       │
└──────────────────────────────┬──────────────────────────────┘
                               │ (if none active)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Default Free Tier Fallback (public.billing_plans)        │
│    WHERE id = 'free'                                        │
│    → Source: 'free'                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Database Schema

### Table: `public.billing_plan_grants`

```sql
CREATE TABLE public.billing_plan_grants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id TEXT NOT NULL REFERENCES public.billing_plans(id),
    granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    reason TEXT,
    starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    revocation_reason TEXT,
    source TEXT NOT NULL DEFAULT 'admin',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Table: `public.billing_audit_logs`
Every grant and revocation is immutably logged with:
- `action`: `'ADMIN_PLAN_GRANTED'` or `'ADMIN_PLAN_REVOKED'`
- `admin_user_id`: Operator ID or system service role
- `target_id`: User ID granted access
- `details`: Snapshot containing plan ID, reason, starts_at, expires_at, and source.

---

## 4. Agency Plan Canonical Allowances

When granted **Agency** access, the user immediately receives:

| Entitlement Key | Value | Notes |
| :--- | :--- | :--- |
| **Plan Name** | `Agency` | Top-tier agency package |
| **Reference Price** | `$149 / mo` | Complimentary (No charge applied) |
| **Max Concurrent Streams** | `10` | 10 independent simultaneous 24/7 broadcasts |
| **Max Storage** | `500 GB` (`536,870,912,000` bytes) | High-speed dedicated media storage |
| **Max Single Upload** | `10 GB` (`10,737,418,240` bytes) | Supports large multi-hour source files |
| **Monthly Streaming Hours** | `UNLIMITED` (`NULL`) | Continuous 24/7 round-the-clock streaming |
| **Max Stream Resolution** | `1080p` | Full HD streaming output |
| **Max Frame Rate** | `60 fps` | High-smoothness video pacing |
| **Studio Scenes** | `UNLIMITED` (`NULL`) | Full multi-scene composition |
| **Playlists & Schedules** | `UNLIMITED` (`NULL`) | Full automation engine |
| **Multi-Destination / Channels** | `UNLIMITED` (`NULL`) | Multi-RTMP broadcasting |
| **Dedicated Cloud Processing** | `ENABLED` | Worker prioritization |

---

## 5. Administrative Workflow

1. Administrator navigates to **Admin → Billing & Revenue Command Center**.
2. Selects **User Plan Grants & Overrides** tab.
3. Searches user by Name, Email, or UUID.
4. Clicks **Grant Agency** (or **Modify Grant**).
5. Chooses duration (Indefinite vs Custom Expiry Date) and enters reason.
6. Clicks **Grant Access**.
7. Targeted React Query invalidation refreshes the user's entitlements instantly.
