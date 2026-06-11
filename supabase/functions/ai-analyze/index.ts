import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifyJWT }               from '../_shared/auth.ts';
import { checkRateLimit }          from '../_shared/rate-limit.ts';
import { jsonError, jsonResponse }  from '../_shared/response.ts';
import { log }                     from '../_shared/logger.ts';

const RATE_LIMIT = { maxRequests: 3, windowMs: 60_000 };

// ─── Phase3 helpers ───────────────────────────────────────────

function _defaultDiseaseSystemPrompt(disease?: string): string {
  return disease
    ? `あなたは${disease}専門のヘルスアドバイザーです。医学的診断は行わず、症状パターンの観察と生活改善の提案を行います。`
    : `あなたは婦人科疾患専門のヘルスアドバイザーです。医学的診断は行わず、症状パターンの観察と生活改善の提案を行います。`;
}

function _buildFeaturesUserContent(features: Record<string, unknown>): string {
  const lines: string[] = ['# 健康記録の分析サマリー', ''];
  for (const [key, val] of Object.entries(features)) {
    if (val === null || val === undefined) continue;
    lines.push(typeof val === 'object' ? `${key}: ${JSON.stringify(val)}` : `${key}: ${val}`);
  }
  lines.push('', '上記の分析結果をもとに、注目すべきパターンと日常生活で試せることを200字以内で教えてください。');
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  let userId: string;
  try {
    ({ userId } = await verifyJWT(req));
  } catch (res) {
    return res as Response;
  }

  if (!await checkRateLimit(userId, 'ai-analyze', RATE_LIMIT)) {
    log('warn', 'rate_limit_exceeded', { userId, endpoint: 'ai-analyze' });
    return jsonError('Rate limit exceeded. Max 3 requests per minute.', 429, 'RATE_LIMIT_EXCEEDED');
  }

  // PR-C4: features 経路のみ。records / analysisType 分岐削除済み。
  let body: {
    features:      Record<string, unknown>;
    disease?:      string;
    systemPrompt?: string;
    userPrompt?:   string;
  };
  try {
    body = await req.json();
  } catch {
    return jsonError('Invalid JSON body', 400, 'INVALID_JSON');
  }

  const { features, disease, systemPrompt: customSystemPrompt, userPrompt } = body;

  if (!features || typeof features !== 'object') {
    return jsonError('features is required', 400, 'MISSING_FEATURES');
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) {
    log('error', 'missing_env', { key: 'ANTHROPIC_API_KEY' });
    return jsonError('AI service not configured', 503, 'SERVICE_UNAVAILABLE');
  }

  const finalSystem      = customSystemPrompt || _defaultDiseaseSystemPrompt(disease);
  const finalUserContent = userPrompt || _buildFeaturesUserContent(features);

  log('info', 'ai_analyze_request', { userId, hasDisease: !!disease, hasCustomPrompt: !!customSystemPrompt });

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-20250514',
      max_tokens: 800,
      system:     finalSystem,
      messages:   [{ role: 'user', content: finalUserContent }],
    }),
  });

  const data = await response.json();
  log('info', 'ai_analyze_done', { userId, status: response.status });

  return jsonResponse({ ...data, _path: 'features' }, response.status);
});
