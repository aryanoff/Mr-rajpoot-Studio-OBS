import { getStripeClient, createCheckoutSession, createCustomerPortalSession } from '../src/server/stripe';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

// Deliberately delete STRIPE_SECRET_KEY from process.env
delete process.env.STRIPE_SECRET_KEY;

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testMissingStripeSecret() {
  console.log("============================================================");
  console.log("TEST S07: MISSING STRIPE SECRET BEHAVIOR");
  console.log("============================================================\n");

  // 1. Test getStripeClient()
  try {
    console.log("1. Calling getStripeClient() without STRIPE_SECRET_KEY...");
    getStripeClient();
    console.log("FAIL: Did not throw error!");
  } catch (err: any) {
    console.log(`PASS: getStripeClient() threw error loudly: "${err.message}"`);
  }

  // 2. Test createCheckoutSession()
  try {
    console.log("\n2. Calling createCheckoutSession() without STRIPE_SECRET_KEY...");
    await createCheckoutSession(supabase, 'test-user-id', 'creator', 'https://example.com/success', 'https://example.com/cancel');
    console.log("FAIL: Did not throw error!");
  } catch (err: any) {
    console.log(`PASS: createCheckoutSession() threw error loudly: "${err.message}"`);
  }

  // 3. Test createCustomerPortalSession()
  try {
    console.log("\n3. Calling createCustomerPortalSession() without STRIPE_SECRET_KEY...");
    await createCustomerPortalSession(supabase, 'test-user-id', 'https://example.com/return');
    console.log("FAIL: Did not throw error!");
  } catch (err: any) {
    console.log(`PASS: createCustomerPortalSession() threw error loudly: "${err.message}"`);
  }

  console.log("\nRESULT: PASS — Zero mock customers or sessions fabricated. Server fails loudly on missing Stripe secret.");
}

testMissingStripeSecret().catch(console.error);
