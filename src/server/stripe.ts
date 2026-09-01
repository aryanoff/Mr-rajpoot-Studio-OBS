import Stripe from 'stripe';
import { type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/supabase';

// Supported Plan Identifiers
export type PlanId = 'free' | 'creator' | 'pro' | 'agency';

// Plan Price Configuration
export const PLAN_PRICES: Record<Exclude<PlanId, 'free'>, { name: string; amount: number; defaultPriceId: string }> = {
  creator: {
    name: 'Creator',
    amount: 1900, // $19.00
    defaultPriceId: process.env.STRIPE_PRICE_CREATOR_MONTHLY || 'price_creator_test_monthly',
  },
  pro: {
    name: 'Pro',
    amount: 4900, // $49.00
    defaultPriceId: process.env.STRIPE_PRICE_PRO_MONTHLY || 'price_pro_test_monthly',
  },
  agency: {
    name: 'Agency',
    amount: 14900, // $149.00
    defaultPriceId: process.env.STRIPE_PRICE_AGENCY_MONTHLY || 'price_agency_test_monthly',
  },
};

export function getStripePriceId(planId: PlanId): string | null {
  if (planId === 'free') return null;
  return PLAN_PRICES[planId]?.defaultPriceId || null;
}

export function getPlanFromStripePrice(priceId: string): PlanId | null {
  for (const [planId, config] of Object.entries(PLAN_PRICES)) {
    if (config.defaultPriceId === priceId) {
      return planId as PlanId;
    }
  }
  return null;
}

// Stripe Client Singleton
let stripeClientInstance: Stripe | null = null;

export function getStripeClient(apiKey?: string): Stripe {
  const key = apiKey || process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is not configured in the environment.');
  }
  if (!stripeClientInstance || (apiKey && apiKey !== process.env.STRIPE_SECRET_KEY)) {
    stripeClientInstance = new Stripe(key, {
      apiVersion: '2025-02-24.acacia' as any,
      typescript: true,
    });
  }
  return stripeClientInstance;
}

/**
 * Idempotently gets or creates a Stripe customer mapping for a Supabase user.
 */
export async function getOrCreateStripeCustomer(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  email: string,
  name?: string,
  stripeApiKey?: string
): Promise<string> {
  // 1. Check existing customer mapping in Supabase
  const { data: existingCustomer, error: queryError } = await supabaseAdmin
    .from('billing_customers')
    .select('provider_customer_id')
    .eq('user_id', userId)
    .eq('provider', 'stripe')
    .maybeSingle();

  if (queryError) {
    throw new Error(`Database query failed while checking customer: ${queryError.message}`);
  }

  if (existingCustomer?.provider_customer_id) {
    return existingCustomer.provider_customer_id;
  }

  // 2. Create customer in Stripe
  const stripe = getStripeClient(stripeApiKey);
  let stripeCustomer: Stripe.Customer;

  try {
    stripeCustomer = await stripe.customers.create({
      email,
      name: name || undefined,
      metadata: {
        supabase_user_id: userId,
      },
    });
  } catch (stripeErr: any) {
    throw new Error(`Stripe customer creation failed: ${stripeErr.message}`);
  }

  // 3. Save mapping in database with idempotency handling
  const { error: insertError } = await supabaseAdmin
    .from('billing_customers')
    .upsert(
      {
        user_id: userId,
        provider: 'stripe',
        provider_customer_id: stripeCustomer.id,
      },
      { onConflict: 'user_id,provider' }
    );

  if (insertError) {
    // If conflict occurred concurrently, re-query the existing record
    const { data: retryCustomer } = await supabaseAdmin
      .from('billing_customers')
      .select('provider_customer_id')
      .eq('user_id', userId)
      .eq('provider', 'stripe')
      .maybeSingle();

    if (retryCustomer?.provider_customer_id) {
      return retryCustomer.provider_customer_id;
    }
    throw new Error(`Failed to record billing customer mapping: ${insertError.message}`);
  }

  return stripeCustomer.id;
}

/**
 * Creates a Stripe Checkout Session for a plan upgrade.
 */
export async function createCheckoutSession(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  planId: PlanId,
  successUrl: string,
  cancelUrl: string,
  stripeApiKey?: string
): Promise<{ sessionId: string; url: string }> {
  if (planId === 'free') {
    throw new Error('Cannot create checkout session for the Free plan.');
  }

  // 1. Verify user profile exists
  const { data: profile, error: profileErr } = await supabaseAdmin
    .from('profiles')
    .select('user_id, username, full_name')
    .eq('user_id', userId)
    .single();

  if (profileErr || !profile) {
    throw new Error(`User profile not found: ${profileErr?.message || 'Unknown'}`);
  }

  // 2. Fetch user email via auth admin
  const { data: userData, error: userAuthErr } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (userAuthErr || !userData.user?.email) {
    throw new Error(`User auth record or email not found: ${userAuthErr?.message || 'Missing email'}`);
  }

  const customerId = await getOrCreateStripeCustomer(
    supabaseAdmin,
    userId,
    userData.user.email,
    profile.full_name || profile.username,
    stripeApiKey
  );

  const priceId = getStripePriceId(planId);
  if (!priceId) {
    throw new Error(`Stripe Price ID not configured for plan '${planId}'`);
  }

  const stripe = getStripeClient(stripeApiKey);

  try {
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&plan=${planId}`,
      cancel_url: cancelUrl,
      metadata: {
        supabase_user_id: userId,
        plan_id: planId,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          plan_id: planId,
        },
      },
    });

    return {
      sessionId: session.id,
      url: session.url || successUrl,
    };
  } catch (err: any) {
    throw new Error(`Stripe checkout session creation failed: ${err.message}`);
  }
}

/**
 * Creates a Stripe Customer Portal Session for managing subscriptions.
 */
export async function createCustomerPortalSession(
  supabaseAdmin: SupabaseClient<Database>,
  userId: string,
  returnUrl: string,
  stripeApiKey?: string
): Promise<{ url: string }> {
  const { data: customer, error } = await supabaseAdmin
    .from('billing_customers')
    .select('provider_customer_id')
    .eq('user_id', userId)
    .eq('provider', 'stripe')
    .maybeSingle();

  if (error || !customer?.provider_customer_id) {
    throw new Error('No active billing customer found. Please subscribe to a paid plan first.');
  }

  const stripe = getStripeClient(stripeApiKey);

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: customer.provider_customer_id,
      return_url: returnUrl,
    });

    return { url: session.url };
  } catch (err: any) {
    throw new Error(`Stripe billing portal session creation failed: ${err.message}`);
  }
}

/**
 * Processes a Stripe Webhook event idempotently and synchronizes database state.
 */
export async function processStripeWebhookEvent(
  supabaseAdmin: SupabaseClient<Database>,
  event: Stripe.Event
): Promise<{ success: boolean; duplicate?: boolean; error?: string }> {
  const eventId = event.id;
  const eventType = event.type;
  const eventCreatedAt = event.created
    ? new Date(event.created * 1000).toISOString()
    : new Date().toISOString();

  // 1. Idempotency Check in billing_webhook_events
  const { data: existingEvent } = await supabaseAdmin
    .from('billing_webhook_events')
    .select('id, processing_status')
    .eq('provider_event_id', eventId)
    .maybeSingle();

  if (existingEvent && existingEvent.processing_status === 'processed') {
    return { success: true, duplicate: true };
  }

  // 2. Record or update webhook event entry as pending/processing
  await supabaseAdmin.from('billing_webhook_events').upsert(
    {
      provider: 'stripe',
      provider_event_id: eventId,
      event_type: eventType,
      event_created_at: eventCreatedAt,
      processing_status: 'pending',
    },
    { onConflict: 'provider_event_id' }
  );

  try {
    switch (eventType) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.supabase_user_id;
        const customerId = session.customer as string;

        if (userId && customerId) {
          await supabaseAdmin.from('billing_customers').upsert(
            {
              user_id: userId,
              provider: 'stripe',
              provider_customer_id: customerId,
            },
            { onConflict: 'user_id,provider' }
          );
        }
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        const subId = sub.id;
        const customerId = sub.customer as string;
        let userId: string | undefined = sub.metadata?.supabase_user_id;

        // If user_id missing in subscription metadata, look up via customer mapping
        if (!userId && customerId) {
          const { data: custMap } = await supabaseAdmin
            .from('billing_customers')
            .select('user_id')
            .eq('provider_customer_id', customerId)
            .maybeSingle();
          userId = custMap?.user_id;
        }

        if (!userId) {
          throw new Error(`Unable to resolve user_id for subscription ${subId}`);
        }

        const validUserId: string = userId;

        // Resolve plan from price ID
        const priceId = sub.items?.data?.[0]?.price?.id;
        const planId = (priceId ? getPlanFromStripePrice(priceId) : null) || (sub.metadata?.plan_id as PlanId) || 'pro';

        const statusMap: Record<string, string> = {
          active: 'active',
          trialing: 'trialing',
          past_due: 'past_due',
          canceled: 'canceled',
          unpaid: 'unpaid',
          incomplete: 'incomplete',
          incomplete_expired: 'canceled',
          paused: 'past_due',
        };
        const mappedStatus = statusMap[sub.status] || 'active';

        const periodStart = (sub as any).current_period_start
          ? new Date((sub as any).current_period_start * 1000).toISOString()
          : new Date().toISOString();
        const periodEnd = (sub as any).current_period_end
          ? new Date((sub as any).current_period_end * 1000).toISOString()
          : new Date(Date.now() + 30 * 86400000).toISOString();
        const cancelAtPeriodEnd = sub.cancel_at_period_end || false;
        const canceledAt = sub.canceled_at ? new Date(sub.canceled_at * 1000).toISOString() : null;

        // Out-of-order protection: Check latest processed event timestamp
        const { data: existingSub } = await supabaseAdmin
          .from('subscriptions')
          .select('id, updated_at, status')
          .eq('provider_subscription_id', subId)
          .maybeSingle();

        if (existingSub) {
          const { data: latestEvent } = await supabaseAdmin
            .from('subscription_events')
            .select('metadata_json')
            .eq('subscription_id', existingSub.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          const prevEventCreatedSec = (latestEvent?.metadata_json as any)?.event_created_sec;
          if (prevEventCreatedSec && prevEventCreatedSec > event.created) {
            // Out of order event: older than already processed event
            break;
          }
        }

        // Upsert subscription
        const { data: savedSub, error: subError } = await supabaseAdmin
          .from('subscriptions')
          .upsert(
            {
              user_id: validUserId,
              plan_id: planId,
              provider: 'stripe',
              provider_subscription_id: subId,
              status: mappedStatus as any,
              current_period_start: periodStart,
              current_period_end: periodEnd,
              cancel_at_period_end: cancelAtPeriodEnd,
              canceled_at: canceledAt,
            },
            { onConflict: 'provider_subscription_id' }
          )
          .select('id')
          .single();

        if (subError) {
          throw new Error(`Failed to upsert subscription: ${subError.message}`);
        }

        // Record audit event in subscription_events
        if (savedSub) {
          await supabaseAdmin.from('subscription_events').insert({
            subscription_id: savedSub.id,
            event_type: eventType,
            provider_event_id: eventId,
            previous_status: existingSub?.status || null,
            new_status: mappedStatus,
            metadata_json: {
              stripe_event_id: eventId,
              event_created_sec: event.created,
              plan_id: planId,
              cancel_at_period_end: cancelAtPeriodEnd,
            },
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        const subId = sub.id;

        const { data: existingSub } = await supabaseAdmin
          .from('subscriptions')
          .select('id, status')
          .eq('provider_subscription_id', subId)
          .maybeSingle();

        if (existingSub) {
          await supabaseAdmin
            .from('subscriptions')
            .update({
              status: 'canceled',
              canceled_at: new Date(event.created * 1000).toISOString(),
            })
            .eq('id', existingSub.id);

          await supabaseAdmin.from('subscription_events').insert({
            subscription_id: existingSub.id,
            event_type: 'customer.subscription.deleted',
            provider_event_id: eventId,
            previous_status: existingSub.status,
            new_status: 'canceled',
            metadata_json: {
              stripe_event_id: eventId,
            },
          });
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string;

        if (subId) {
          const { data: existingSub } = await supabaseAdmin
            .from('subscriptions')
            .select('id, status')
            .eq('provider_subscription_id', subId)
            .maybeSingle();

          if (existingSub) {
            await supabaseAdmin
              .from('subscriptions')
              .update({ status: 'past_due' })
              .eq('id', existingSub.id);

            await supabaseAdmin.from('subscription_events').insert({
              subscription_id: existingSub.id,
              event_type: 'invoice.payment_failed',
              provider_event_id: eventId,
              previous_status: existingSub.status,
              new_status: 'past_due',
              metadata_json: {
                invoice_id: invoice.id,
                attempt_count: invoice.attempt_count,
              },
            });
          }
        }
        break;
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string;

        if (subId) {
          const { data: existingSub } = await supabaseAdmin
            .from('subscriptions')
            .select('id, status')
            .eq('provider_subscription_id', subId)
            .maybeSingle();

          if (existingSub && existingSub.status === 'past_due') {
            await supabaseAdmin
              .from('subscriptions')
              .update({ status: 'active' })
              .eq('id', existingSub.id);

            await supabaseAdmin.from('subscription_events').insert({
              subscription_id: existingSub.id,
              event_type: 'invoice.paid',
              provider_event_id: eventId,
              previous_status: existingSub.status,
              new_status: 'active',
              metadata_json: { invoice_id: invoice.id },
            });
          }
        }
        break;
      }

      default:
        // Other events ignored safely
        break;
    }

    // 3. Mark webhook processing as successfully completed
    await supabaseAdmin
      .from('billing_webhook_events')
      .update({
        processing_status: 'processed',
        processed_at: new Date().toISOString(),
      })
      .eq('provider_event_id', eventId);

    return { success: true };
  } catch (err: any) {
    // Record error in billing_webhook_events
    await supabaseAdmin
      .from('billing_webhook_events')
      .update({
        processing_status: 'failed',
        processing_error: err.message || 'Unknown processing error',
      })
      .eq('provider_event_id', eventId);

    return { success: false, error: err.message };
  }
}
