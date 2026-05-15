import Stripe from 'https://esm.sh/stripe@14?target=deno';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifyJWT } from '../_shared/auth.ts';

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
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { plan } = body;
  const priceId = PLAN_PRICE_MAP[plan];

  if (!priceId) {
    return new Response(JSON.stringify({ error: 'Invalid plan. Must be "monthly" or "annual".' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
  if (!stripeKey) {
    return new Response(JSON.stringify({ error: 'Payment service not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' });

  const appUrl = Deno.env.get('APP_URL') ?? 'https://ippo-app.com';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/app.html?checkout=success`,
    cancel_url:  `${appUrl}/app.html?checkout=cancel`,
    customer_email: email,
    metadata: { userId, plan },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
