import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifyJWT } from '../_shared/auth.ts';

// In-memory rate limit store: userId -> [timestamp, ...]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const timestamps = (rateLimitMap.get(userId) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) return false;
  timestamps.push(now);
  rateLimitMap.set(userId, timestamps);
  return true;
}

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  let userId: string;
  try {
    ({ userId } = await verifyJWT(req));
  } catch (res) {
    return res as Response;
  }

  if (!checkRateLimit(userId)) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded. Max 3 requests per minute.' }), {
      status: 429,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { records: unknown[]; analysisType: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { records, analysisType } = body;
  if (!records || !Array.isArray(records)) {
    return new Response(JSON.stringify({ error: 'records must be an array' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const analysisPrompts: Record<string, string> = {
    pattern:  'Analyze these health records and identify patterns in symptoms, wellness, and energy levels.',
    flareup:  'Analyze these health records to identify potential flare-up triggers and warning signs.',
    factor:   'Analyze these health records to identify lifestyle factors that correlate with better or worse health outcomes.',
  };

  const systemPrompt = analysisPrompts[analysisType] ?? analysisPrompts.pattern;

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: 'AI service not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Here are the health records (last 90 days):\n${JSON.stringify(records, null, 2)}`,
        },
      ],
    }),
  });

  const data = await response.json();

  return new Response(JSON.stringify(data), {
    status: response.status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
