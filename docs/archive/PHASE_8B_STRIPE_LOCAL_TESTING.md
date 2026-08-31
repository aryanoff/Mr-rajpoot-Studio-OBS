# PHASE 8B — STRIPE LOCAL TESTING GUIDE

## 1. Prerequisites
- Stripe CLI installed (`stripe login`)
- OBS 24/7 dev server running (`npm run dev`)

## 2. Setting Up Local Webhook Forwarding
Run the Stripe CLI to forward events directly to your local Vite server:

```bash
stripe listen --forward-to localhost:5173/api/billing/webhook
```

The CLI will print your local webhook signing secret:
```
> Ready! Your webhook signing secret is whsec_... (^C to quit)
```

Add this secret to your `.env` file:
```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 3. Triggering Test Events
You can simulate live Stripe events using the CLI:

### A. Completed Checkout
```bash
stripe trigger checkout.session.completed
```

### B. Customer Subscription Created
```bash
stripe trigger customer.subscription.created
```

### C. Subscription Updated / Upgraded
```bash
stripe trigger customer.subscription.updated
```

### D. Subscription Canceled
```bash
stripe trigger customer.subscription.deleted
```

### E. Payment Failed (Past Due)
```bash
stripe trigger invoice.payment_failed
```

### F. Payment Succeeded (Active)
```bash
stripe trigger invoice.paid
```

## 4. Automated Test Suite Execution
Run the full 50-point Phase 8B test matrix anytime:

```bash
npx tsx scripts/verify-phase8b-stripe.ts
```
