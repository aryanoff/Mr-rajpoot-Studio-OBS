import http from 'http';
import Stripe from 'stripe';
import * as dotenv from 'dotenv';
import { createBillingServer } from '../src/server/index';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const adminClient = createClient(supabaseUrl, serviceRoleKey);

const TEST_PORT = 3981;
const SERVER_URL = `http://localhost:${TEST_PORT}`;
const MOCK_STRIPE_SECRET = 'sk_test_mock_webhook_security_key_123';
const MOCK_WEBHOOK_SECRET = 'whsec_test_mock_webhook_secret_abc123xyz';

async function runWebhookSecurityRegression() {
  console.log('======================================================================');
  console.log('PHASE 18 — STRIPE WEBHOOK SECURITY HARDENING REGRESSION SUITE');
  console.log('======================================================================\n');

  const stripe = new Stripe(MOCK_STRIPE_SECRET, { apiVersion: '2023-10-16' });

  // ------------------------------------------------------------------
  // TEST 1: Secret Missing in Production/Default -> Rejection with HTTP 503
  // ------------------------------------------------------------------
  console.log('>>> TEST 1: Secret Missing in Production/Default (HTTP 503 Expected)');
  delete process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.ALLOW_UNSIGNED_WEBHOOKS;
  process.env.NODE_ENV = 'production';

  const server1: http.Server = createBillingServer();
  await new Promise<void>((resolve) => server1.listen(TEST_PORT, resolve));

  try {
    const res1 = await fetch(`${SERVER_URL}/api/billing/webhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `evt_unconf_${Date.now()}`,
        object: 'event',
        type: 'customer.subscription.created',
      }),
    });
    const status1 = res1.status;
    const body1 = await res1.json().catch(() => null);
    console.log(`HTTP Status: ${status1}`);
    console.log(`Response: ${JSON.stringify(body1)}`);
    if (status1 === 503 && body1?.message?.includes('Service Unavailable')) {
      console.log('RESULT: PASS (1/5) — Unconfigured webhook rejected with HTTP 503 in production mode.\n');
    } else {
      throw new Error(`Expected HTTP 503, got ${status1}`);
    }
  } finally {
    await new Promise<void>((resolve) => server1.close(() => resolve()));
  }

  // ------------------------------------------------------------------
  // TEST 2: Secret Configured + Valid Signature -> Accepted with HTTP 200
  // ------------------------------------------------------------------
  console.log('>>> TEST 2: Secret Configured + Valid Signature (HTTP 200 Expected)');
  process.env.STRIPE_WEBHOOK_SECRET = MOCK_WEBHOOK_SECRET;
  process.env.STRIPE_SECRET_KEY = MOCK_STRIPE_SECRET;
  process.env.NODE_ENV = 'development';

  const server2: http.Server = createBillingServer();
  await new Promise<void>((resolve) => server2.listen(TEST_PORT, resolve));

  const validEventPayload = JSON.stringify({
    id: `evt_valid_${Date.now()}`,
    object: 'event',
    api_version: '2023-10-16',
    created: Math.floor(Date.now() / 1000),
    type: 'customer.subscription.deleted',
    data: { object: { id: 'sub_valid_test', customer: 'cus_valid_test' } },
  });

  const validSignature = stripe.webhooks.generateTestHeaderString({
    payload: validEventPayload,
    secret: MOCK_WEBHOOK_SECRET,
  });

  try {
    const res2 = await fetch(`${SERVER_URL}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': validSignature,
      },
      body: validEventPayload,
    });
    const status2 = res2.status;
    const body2 = await res2.json().catch(() => null);
    console.log(`HTTP Status: ${status2}`);
    console.log(`Response: ${JSON.stringify(body2)}`);
    if (status2 === 200 && body2?.success === true) {
      console.log('RESULT: PASS (2/5) — Valid signed Stripe webhook accepted with HTTP 200.\n');
    } else {
      throw new Error(`Expected HTTP 200 with success: true, got ${status2}`);
    }

    // ------------------------------------------------------------------
    // TEST 3: Duplicate Valid Event -> Idempotent Processing (HTTP 200)
    // ------------------------------------------------------------------
    console.log('>>> TEST 3: Duplicate Valid Event (Idempotent HTTP 200 Expected)');
    const res3 = await fetch(`${SERVER_URL}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': validSignature,
      },
      body: validEventPayload,
    });
    const status3 = res3.status;
    const body3 = await res3.json().catch(() => null);
    console.log(`HTTP Status: ${status3}`);
    console.log(`Response: ${JSON.stringify(body3)}`);
    if (status3 === 200 && body3?.duplicate === true) {
      console.log('RESULT: PASS (3/5) — Duplicate event detected and handled idempotently.\n');
    } else {
      throw new Error(`Expected HTTP 200 with duplicate: true, got ${status3}`);
    }

    // Cleanup the test event in DB
    const parsed = JSON.parse(validEventPayload);
    await adminClient.from('billing_webhook_events').delete().eq('provider_event_id', parsed.id);

    // ------------------------------------------------------------------
    // TEST 4: Secret Configured + Invalid Signature -> Rejected (HTTP 400)
    // ------------------------------------------------------------------
    console.log('>>> TEST 4: Secret Configured + Invalid Signature (HTTP 400 Expected)');
    const res4 = await fetch(`${SERVER_URL}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 't=12345,v1=invalid_signature_hash_xyz',
      },
      body: validEventPayload,
    });
    const status4 = res4.status;
    const body4 = await res4.json().catch(() => null);
    console.log(`HTTP Status: ${status4}`);
    console.log(`Response: ${JSON.stringify(body4)}`);
    if (status4 === 400 && body4?.message?.includes('Invalid Stripe webhook signature')) {
      console.log('RESULT: PASS (4/5) — Forged or invalid signature strictly rejected with HTTP 400.\n');
    } else {
      throw new Error(`Expected HTTP 400, got ${status4}`);
    }

    // ------------------------------------------------------------------
    // TEST 5: Malformed JSON Body -> Rejected (HTTP 400)
    // ------------------------------------------------------------------
    console.log('>>> TEST 5: Malformed Body (HTTP 400 Expected)');
    const malformedPayload = '{"id": "evt_broken", "type": ';
    const malformedSig = stripe.webhooks.generateTestHeaderString({
      payload: malformedPayload,
      secret: MOCK_WEBHOOK_SECRET,
    });
    const res5 = await fetch(`${SERVER_URL}/api/billing/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': malformedSig,
      },
      body: malformedPayload,
    });
    const status5 = res5.status;
    const body5 = await res5.json().catch(() => null);
    console.log(`HTTP Status: ${status5}`);
    console.log(`Response: ${JSON.stringify(body5)}`);
    if (status5 === 400) {
      console.log('RESULT: PASS (5/5) — Malformed webhook body rejected with HTTP 400.\n');
    } else {
      throw new Error(`Expected HTTP 400, got ${status5}`);
    }

  } finally {
    await new Promise<void>((resolve) => server2.close(() => resolve()));
  }

  console.log('======================================================================');
  console.log('✓ ALL 5 STRIPE WEBHOOK SECURITY REGRESSION TESTS PASSED (100% PASS)');
  console.log('======================================================================\n');
}

runWebhookSecurityRegression().catch((err) => {
  console.error('REGRESSION FAILURE:', err);
  process.exit(1);
});
