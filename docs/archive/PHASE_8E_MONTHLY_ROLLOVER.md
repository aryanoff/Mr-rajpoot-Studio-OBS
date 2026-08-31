# PHASE 8E: MONTHLY PERIOD ROLLOVER ENGINE

## 1. Automated Rollover Mechanics
Billing periods represent canonical usage windows. When a period expires (`period_end < now()`):
1. **Detection**: `get_or_create_usage_period()` and `rollover_billing_periods()` detect expired open periods.
2. **Transition**: Expired period status is updated from `'open'` to `'closed'` with `closed_at = now()`.
3. **Initialization**: Next billing period is opened with status `'open'`.
4. **Context Propagation**: Active subscription ID and Stripe dates are carried over for paid users; new calendar month boundary is computed for free users.
5. **Counter Initialization**: `usage_counters` row is created:
   - `storage_bytes`: Carried over from current sum of active `media_assets`.
   - `stream_seconds`: Reset to `0` for the fresh billing cycle.

---

## 2. Race Safety & Idempotency
- Multiple simultaneous rollover requests for the same user are serialized using transaction locks (`PERFORM id FROM profiles WHERE user_id = p_user_id FOR UPDATE`).
- Database constraint `UNIQUE(user_id, period_start, period_end)` guarantees that at most one period record can exist for any given date range.
- Verified in Test `E26` (5 concurrent calls resolved to exactly 1 period record).
