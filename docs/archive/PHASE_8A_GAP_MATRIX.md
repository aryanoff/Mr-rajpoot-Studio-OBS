# PHASE 8A GAP MATRIX

| Feature Area | Phase 8A Status | Remaining Gaps (Phase 8B / 8C) |
|---|---|---|
| Plans Schema | VERIFIED | No remaining gaps. |
| Entitlements | VERIFIED | Need to wire Frontend strictly to RPC responses. |
| Customer Mapping | VERIFIED | Stripe Customer creation integration required. |
| Subscriptions | VERIFIED | Stripe Checkout & Webhook sync required. |
| Webhook Idempotency | VERIFIED | The actual Node webhook endpoint needs to be built. |
| Quota Reservations | VERIFIED | Frontend needs to call `reserve_` RPCs before uploads/streams. |
| Legacy `user_quotas` | PRESERVED | Needs complete deprecation once UI relies on new architecture. |
| Row-Level Security | VERIFIED | No remaining gaps. |
| Admin Operations | VERIFIED | Needs an Admin UI (future phase) to manually manage subscriptions. |
