# PHASE 8E: USAGE HISTORY & CUSTOMER BILLING INTERFACE

## 1. Customer-Facing Usage Experience
On the `/billing` page:
- **Current Billing Cycle**: Clearly shows cycle start and end dates (e.g. `Aug 29, 2026 – Sep 29, 2026`).
- **Resource Gauges**: Live visualization of current storage consumption against plan limits and monthly streaming hours consumed.
- **Historical Cycles Table**: Shows past billing periods, associated subscription tier name, status (`open` or `closed`), total storage utilized, and total stream broadcast hours.

---

## 2. API & Data Access Architecture
- **Hook**: `useBillingUsageHistory(limit, offset)` powered by TanStack React Query.
- **Database RPC**: `get_user_usage_history(p_user_id, p_limit, p_offset)` with Row-Level Security checks preventing cross-user data exposure.
- **Zero Mock Data**: Table directly aggregates from `billing_usage_periods` and `usage_counters`.
