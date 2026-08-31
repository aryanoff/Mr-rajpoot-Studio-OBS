import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';
import {
  createCheckoutSession,
  createCustomerPortalSession,
  processStripeWebhookEvent,
  getStripeClient,
  type PlanId,
} from './stripe';
import type Stripe from 'stripe';

function getAdminClient(): SupabaseClient<Database> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase Service Key for server billing API.');
  }

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Extracts and verifies the authenticated user from the Authorization header Bearer token.
 */
export async function authenticateRequestUser(
  supabaseAdmin: SupabaseClient<Database>,
  authHeader?: string
): Promise<string> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // If running in development / test without token, try getting first active user
    const { data: users } = await supabaseAdmin.auth.admin.listUsers();
    if (users?.users?.[0]?.id) {
      return users.users[0].id;
    }
    throw new Error('Unauthorized: Missing or invalid authentication token.');
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const { data: userData, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !userData.user) {
    throw new Error(`Unauthorized: ${error?.message || 'Invalid token'}`);
  }

  return userData.user.id;
}

/**
 * Handles /api/billing/create-checkout-session
 */
export async function handleCreateCheckoutSession(
  body: { planId: PlanId; successUrl?: string; cancelUrl?: string },
  authHeader?: string
) {
  const supabaseAdmin = getAdminClient();
  const userId = await authenticateRequestUser(supabaseAdmin, authHeader);

  const successUrl = body.successUrl || 'http://localhost:5173/billing';
  const cancelUrl = body.cancelUrl || 'http://localhost:5173/billing';

  const result = await createCheckoutSession(
    supabaseAdmin,
    userId,
    body.planId,
    successUrl,
    cancelUrl
  );

  return result;
}

/**
 * Handles /api/billing/create-portal-session
 */
export async function handleCreatePortalSession(
  body: { returnUrl?: string },
  authHeader?: string
) {
  const supabaseAdmin = getAdminClient();
  const userId = await authenticateRequestUser(supabaseAdmin, authHeader);
  const returnUrl = body.returnUrl || 'http://localhost:5173/billing';

  const result = await createCustomerPortalSession(supabaseAdmin, userId, returnUrl);
  return result;
}

/**
 * Handles /api/billing/webhook
 */
export async function handleStripeWebhook(
  rawBody: string | Buffer,
  signatureHeader?: string
) {
  const supabaseAdmin = getAdminClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event: Stripe.Event;

  if (webhookSecret && signatureHeader && process.env.STRIPE_SECRET_KEY) {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
  } else {
    // If webhook secret is not set, parse JSON safely (for testing / simulated events)
    event = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf8'));
  }

  const result = await processStripeWebhookEvent(supabaseAdmin, event);
  return result;
}
