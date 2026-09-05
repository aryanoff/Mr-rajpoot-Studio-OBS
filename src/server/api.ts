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
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!url || !serviceKey) {
    throw new Error('Missing Supabase URL or Service Role Key for server billing API.');
  }

  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false },
  });
}

/**
 * Extracts and verifies the authenticated user from the Authorization header Bearer token.
 * 
 * SECURITY: No fallback. Missing or invalid token = 401. Never impersonates another user.
 */
export async function authenticateRequestUser(
  supabaseAdmin: SupabaseClient<Database>,
  authHeader?: string
): Promise<string> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Unauthorized: Missing or invalid authentication token.');
  }

  const token = authHeader.replace('Bearer ', '').trim();
  if (!token) {
    throw new Error('Unauthorized: Empty authentication token.');
  }

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

  if (!body.successUrl || !body.cancelUrl) {
    throw new Error('Bad Request: successUrl and cancelUrl are required.');
  }

  const result = await createCheckoutSession(
    supabaseAdmin,
    userId,
    body.planId,
    body.successUrl,
    body.cancelUrl
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

  if (!body.returnUrl) {
    throw new Error('Bad Request: returnUrl is required.');
  }

  const result = await createCustomerPortalSession(supabaseAdmin, userId, body.returnUrl);
  return result;
}

/**
 * Handles /api/billing/webhook
 * 
 * SECURITY:
 * 1. If STRIPE_WEBHOOK_SECRET is set, signature is strictly verified via constructEvent().
 * 2. If STRIPE_WEBHOOK_SECRET is missing, the endpoint rejects with HTTP 503 (Service Unavailable)
 *    unless an explicit non-production development flag (ALLOW_UNSIGNED_WEBHOOKS === 'true') is active.
 * 3. Never allows accidental production bypass of signature verification.
 */
export async function handleStripeWebhook(
  rawBody: string | Buffer,
  signatureHeader?: string
) {
  const supabaseAdmin = getAdminClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';
  const allowUnsignedDev = process.env.ALLOW_UNSIGNED_WEBHOOKS === 'true' && !isProduction;

  if (!webhookSecret && !allowUnsignedDev) {
    const err: any = new Error('Service Unavailable: Stripe webhook secret is not configured on this server.');
    err.statusCode = 503;
    throw err;
  }

  let event: Stripe.Event;

  if (webhookSecret) {
    if (!signatureHeader) {
      const err: any = new Error('Bad Request: Missing stripe-signature header.');
      err.statusCode = 400;
      throw err;
    }
    const stripe = getStripeClient();
    try {
      event = stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
    } catch (sigErr: any) {
      const err: any = new Error(`Bad Request: Invalid Stripe webhook signature (${sigErr.message}).`);
      err.statusCode = 400;
      throw err;
    }
  } else if (allowUnsignedDev) {
    try {
      event = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf8'));
    } catch {
      const err: any = new Error('Bad Request: Malformed webhook payload JSON.');
      err.statusCode = 400;
      throw err;
    }
    if (!event || typeof event !== 'object' || !event.type) {
      const err: any = new Error('Bad Request: Invalid webhook event structure.');
      err.statusCode = 400;
      throw err;
    }
  } else {
    const err: any = new Error('Service Unavailable: Stripe webhook secret is not configured.');
    err.statusCode = 503;
    throw err;
  }

  const result = await processStripeWebhookEvent(supabaseAdmin, event);
  return result;
}
