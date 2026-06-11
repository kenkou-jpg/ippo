import Stripe                       from 'https://esm.sh/stripe@14?target=deno';
import { handleCors }              from '../_shared/cors.ts';
import { verifyJWT }               from '../_shared/auth.ts';
import { jsonError, jsonResponse }  from '../_shared/response.ts';
import { log }                     from '../_shared/logger.ts';

const PLAN_PRICE_MAP: Record<string, string | undefined> = {
  monthly: Deno.env.get('STRIPE_PRICE_MONTHLY'),
  annual:  Deno.env.get('STRIPE_PRICE_ANNUAL'),
};

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  let userId: string;
  let email: string | undefined;
  try {
    ({ userId, email } = await verifyJWT(req));
  } catch (res) {
    return res as Response;
  }

  let body: { plan: string };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400, 'INVALID_JSON');
  }

  const { plan } = body;
  const priceId  = PLAN_PRICE_MAP[plan];

  if (!priceId) {
    return jsonError('Invalid plan. Must be "monthly" or "annual".', 400, 'INVALID_PLAN');
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    log('error', 'missing_env', { key: 'STRIPE_SECRET_KEY' });
    return jsonError('Payment service not configured', 503, 'SERVICE_UNAVAILABLE');
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });
  const appUrl = Deno.env.get('APP_URL') ?? 'https://ippo-app.com';

  log('info', 'stripe_checkout_start', { userId, plan });

  const session = await stripe.checkout.sessions.create({
    mode:                 'subscription',
    payment_method_types: ['card'],
    line_items:           [{ price: priceId, quantity: 1 }],
    success_url:          `${appUrl}/app.html?checkout=success`,
    cancel_url:           `${appUrl}/app.html?checkout=cancel`,
    customer_email:       email,
    metadata:             { userId, plan },
  });

  log('info', 'stripe_checkout_created', { userId, plan, sessionId: session.id });

  return jsonResponse({ url: session.url });
});
