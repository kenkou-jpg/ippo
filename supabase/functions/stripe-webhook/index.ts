import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const signature = req.headers.get('Stripe-Signature');
  if (!signature) return jsonResponse({ error: 'Missing Stripe-Signature header' }, 400);

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
  if (!stripeKey || !webhookSecret) return jsonResponse({ error: 'Webhook not configured' }, 503);

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    return jsonResponse({ error: `Webhook signature verification failed: ${err}` }, 400);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  );

  console.log(JSON.stringify({ event: event.type, id: event.id }));

  // ─── checkout.session.completed ─────────────────────────────
  // サイレント失敗バグ修正: .update().eq('email') の戻り値は常に null のため
  // email フォールバックが常に動作していた。userId を metadata から直接取得する。
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.metadata?.userId;
    const plan = (session.metadata?.plan === 'annual' ? 'annual' : 'monthly') as 'annual' | 'monthly';
    const customerId = session.customer as string | null;
    const subscriptionId = session.subscription as string | null;

    if (!userId) {
      console.error('checkout.session.completed: missing userId in metadata', { sessionId: session.id });
      return jsonResponse({ received: true });
    }

    let currentPeriodEnd: string | null = null;
    if (subscriptionId) {
      try {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        currentPeriodEnd = new Date(sub.current_period_end * 1000).toISOString();
      } catch (e) {
        console.warn('Failed to retrieve subscription for period_end:', e);
      }
    }

    const { error } = await supabase.from('subscriptions').upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      plan,
      status: 'active',
      current_period_end: currentPeriodEnd,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) console.error('subscriptions upsert error:', error);
  }

  // ─── customer.subscription.deleted ──────────────────────────
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;

    const { error } = await supabase
      .from('subscriptions')
      .update({ status: 'canceled', updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', subscription.id);

    if (error) console.error('subscriptions canceled update error:', error);
  }

  // ─── customer.subscription.updated ──────────────────────────
  // 更新 (プラン変更・更新・支払い失敗) を反映する。
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const stripeStatus = subscription.status;
    const status = stripeStatus === 'active' ? 'active'
                 : stripeStatus === 'past_due' ? 'past_due'
                 : 'canceled';
    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
    const interval = subscription.items.data[0]?.price?.recurring?.interval;
    const plan = interval === 'year' ? 'annual' : 'monthly';

    const { error } = await supabase
      .from('subscriptions')
      .update({ status, plan, current_period_end: currentPeriodEnd, updated_at: new Date().toISOString() })
      .eq('stripe_subscription_id', subscription.id);

    if (error) console.error('subscriptions updated error:', error);
  }

  return jsonResponse({ received: true });
});
