import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifyJWT } from '../_shared/auth.ts';

// ai-analyze と同一パターンのレートリミット (3req/60sec)
const rateLimitMap      = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX    = 3;

function checkRateLimit(userId: string): boolean {
  const now        = Date.now();
  const timestamps = (rateLimitMap.get(userId) ?? []).filter(t => now - t < RATE_LIMIT_WINDOW);
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
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded. Max 3 requests per minute.' }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  // 入力: prediction-engine.js の出力をそのまま受け取る
  // records 生データは受け取らない
  let body: {
    predictions: Record<string, unknown>;
    disease?:    string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON body' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const { predictions, disease } = body;
  if (!predictions || typeof predictions !== 'object') {
    return new Response(
      JSON.stringify({ error: 'predictions is required and must be an object' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) {
    return new Response(
      JSON.stringify({ error: 'AI service not configured' }),
      { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }

  const systemPrompt = disease
    ? `あなたは${disease}専門のヘルスアドバイザーです。予測データをもとに、明日の体調について簡潔に伝えてください。医療診断は行わないでください。`
    : `あなたは婦人科疾患専門のヘルスアドバイザーです。予測データをもとに、明日の体調について簡潔に伝えてください。医療診断は行わないでください。`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 400,
      system:     systemPrompt,
      messages:   [{ role: 'user', content: _buildPrompt(predictions) }],
    }),
  });

  const data = await response.json();
  return new Response(
    JSON.stringify(data),
    { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});

// ─── プロンプト生成 ────────────────────────────────────────────

const SKIP_KEYS = new Set(['disclaimer', 'disclaimerText']);

function _buildPrompt(predictions: Record<string, unknown>): string {
  const lines: string[] = ['# 明日の体調予測データ', ''];
  for (const [key, val] of Object.entries(predictions)) {
    if (val === null || val === undefined || SKIP_KEYS.has(key)) continue;
    lines.push(typeof val === 'object' ? `${key}: ${JSON.stringify(val)}` : `${key}: ${val}`);
  }
  lines.push(
    '',
    '※ これは医療診断ではありません。',
    '',
    '上記の予測をもとに、明日の体調と注意点を150字以内で伝えてください。',
  );
  return lines.join('\n');
}
