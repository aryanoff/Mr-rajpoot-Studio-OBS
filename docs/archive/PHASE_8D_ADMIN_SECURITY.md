# MR RAJPOOT STUDIO OBS 24/7
# PHASE 8D — ADMIN SECURITY & PRIVILEGE MODEL

============================================================
1. SECURITY ARCHITECTURE
============================================================

Admin billing capabilities are strictly protected by a defense-in-depth security model:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. ROUTE GUARD: React AdminRoute (<AdminRoute>)            │
│    - Verifies user profile role in Zustand / Supabase Auth  │
│    - Unauthenticated/normal users redirected to /dashboard  │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. DATABASE RLS: PostgreSQL Row-Level Security Policies      │
│    - Regular users restricted to auth.uid() = user_id       │
│    - Admins permitted via public.is_admin()                 │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. SECURITY DEFINER RPCs: Explicit Role & Search Path Checks│
│    - Functions check public.is_admin()                      │
│    - Hardcoded SET search_path = public                     │
│    - Masked Stripe tokens in returned result sets           │
└─────────────────────────────────────────────────────────────┘
```

============================================================
2. SECRET REDACTION & MASKING
============================================================

- **Stripe Provider Subscription IDs**: Masked to format `sub_1Q...8xZ` before leaving the database engine.
- **Webhook Payloads**: Full webhook payloads with HMAC secrets and metadata are stripped in admin list RPCs; only event type, provider event ID, and error summaries are returned.
- **Audit Logging**: All administrative actions (such as manual webhook replays) are logged to `public.billing_audit_logs` with timestamps and admin user IDs.
