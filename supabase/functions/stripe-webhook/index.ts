import Stripe                      from 'https://esm.sh/stripe@14?target=deno';
import { createClient }           from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders }            from '../_shared/cors.ts';
import { jsonError, jsonResponse } from '../_shared/response.ts';
import { log }                    from '../_shared/logger.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const signature = req.headers.get('Stripe-Signature');
  if (!signature) return jsonError('Missing Stripe-Signature header', 400, 'MISSING_SIGNATURE');

  const stripeKey     = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeKey || !webhookSecret) {
    log('error', 'missing_env', { keys: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'] });
    return jsonError('Webhook not configured', 503, 'SERVICE_UNAVAILABLE');
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
  const body   = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    log('warn', 'webhook_signature_failed', { error: String(err) });
    return jsonError(`Webhook signature verification failed: ${err}`, 400, 'INVALID_SIGNATURE');
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')              ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  log('info', 'webhook_received', { event: event.type, id: event.id });

  // ─── checkout.session.completed ─────────────────────────────
  if (event.type === 'checkout.session.completed') {
    const session        = event.data.object as Stripe.Checkout.Session;
    const userId         = session.metadata?.userId;
    const plan           = (session.metadata?.plan === 'annual' ? 'annual' : 'monthly') as 'annual' | 'monthly';
    const customerId     = session.customer as string | null;
    const subscriptionId = session.subscription as string | null;

    if (!userId) {
      log('error', 'checkout_missing_user_id', { sessionId: session.id });
      return jsonResponse({ received: true });
    }

    let currentPeriodEnd: string | null = null;
    if (subscriptionId) {
      try {
        const sub        = await stripe.subscriptions.retrieve(subscriptionId);
        currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
      } catch (e) {
        log('warn', 'subscription_retrieve_failed', { subscriptionId, error: String(e) });
      }
    }

    const { error } = await supabase.from('subscriptions').upsert({
      user_id:                userId,
      stripe_customer_id:     customerId,
      stripe_subscription_id: subscriptionId,
      plan,
      status:                 'active',
      current_period_end:     currentPeriodEnd,
      updated_at:             new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) log('error', 'subscriptions_upsert_failed', { userId, error: error.message });
    else       log('info',  'subscription_activated', { userId, plan });
  }

  // ─── customer.subscription.deleted ──────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;

    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', subscription.id);

    if (error) log('error', 'subscription_cancel_failed', { id: subscription.id, error: error.message });
    else       log('info',  'subscription_canceled', { id: subscription.id });
  }

  // ─── customer.subscription.updated ──────────────────────────
  if (event.type === 'customer.subscription.updated') {
    const subscription     = event.data.object as Stripe.Subscription;
    const stripeStatus     = subscription.status;
    const status           = stripeStatus === 'active'   ? 'active'
                           : stripeStatus === 'past_due' ? 'past_due'
                           : 'canceled';
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    const interval         = subscription.items.data[0]?.price?.recurring?.interval;
    const plan             = interval === 'year' ? 'annual' : 'monthly';

    const { error } = await supabase
      .from('subscriptions')
      .update({ status, plan, current_period_end: currentPeriodEnd, updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', subscription.id);

    if (error) log('error', 'subscription_update_failed', { id: subscription.id, error: error.message });
    else       log('info',  'subscription_updated', { id: subscription.id, status, plan });
  }

  return jsonResponse({ received: true });
});
