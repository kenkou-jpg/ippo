import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifyJWT }               from '../_shared/auth.ts';
import { checkRateLimit }          from '../_shared/rate-limit.ts';
import { jsonError, jsonResponse }  from '../_shared/response.ts';
import { log }                     from '../_shared/logger.ts';

const RATE_LIMIT = { maxRequests: 3, windowMs: 60_000 };

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  let userId: string;
  try {
    ({ userId } = await verifyJWT(req));
  } catch (res) {
    return res as Response;
  }

  if (!await checkRateLimit(userId, 'ai-predict', RATE_LIMIT)) {
    log('warn', 'rate_limit_exceeded', { userId, endpoint: 'ai-predict' });
    return jsonError('Rate limit exceeded. Max 3 requests per minute.', 429, 'RATE_LIMIT_EXCEEDED');
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
    return jsonError('Invalid JSON body', 400, 'INVALID_JSON');
  }

  const { predictions, disease } = body;
  if (!predictions || typeof predictions !== 'object') {
    return jsonError('predictions is required and must be an object', 400, 'MISSING_PREDICTIONS');
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) {
    log('error', 'missing_env', { key: 'ANTHROPIC_API_KEY' });
    return jsonError('AI service not configured', 503, 'SERVICE_UNAVAILABLE');
  }

  const systemPrompt = disease
    ? `あなたは${disease}専門のヘルスアドバイザーです。予測データをもとに、明日の体調について簡潔に伝えてください。医療診断は行わないでください。`
    : `あなたは婦人科疾患専門のヘルスアドバイザーです。予測データをもとに、明日の体調について簡潔に伝えてください。医療診断は行わないでください。`;

  log('info', 'ai_predict_request', { userId, hasDisease: !!disease });

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
  log('info', 'ai_predict_done', { userId, status: response.status });

  return jsonResponse(data, response.status);
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
