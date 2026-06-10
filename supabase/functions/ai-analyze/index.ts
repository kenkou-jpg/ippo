import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { verifyJWT } from '../_shared/auth.ts';

// In-memory rate limit store: userId -> [timestamp, ...]
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 3;

// ─── Phase3 helpers ───────────────────────────────────────────

function _defaultDiseaseSystemPrompt(disease?: string): string {
  return disease
    ? `あなたは${disease}専門のヘルスアドバイザーです。医学的診断は行わず、症状パターンの観察と生活改善の提案を行います。`
    : `あなたは婦人科疾患専門のヘルスアドバイザーです。医学的診断は行わず、症状パターンの観察と生活改善の提案を行います。`;
}

function _buildFeaturesUserContent(features: Record<string, unknown>): string {
  // features は ClaudeFeatures 型（生レコードなし）
  const lines: string[] = ['# 健康記録の分析サマリー', ''];
  for (const [key, val] of Object.entries(features)) {
    if (val === null || val === undefined) continue;
    if (typeof val === 'object') {
      lines.push(`${key}: ${JSON.stringify(val)}`);
    } else {
      lines.push(`${key}: ${val}`);
    }
  }
  lines.push('', '上記の分析結果をもとに、注目すべきパターンと日常生活で試せることを200字以内で教えてください。');
  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────

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
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { features, disease, systemPrompt: customSystemPrompt, userPrompt } = body;

  if (!features || typeof features !== 'object') {
    return new Response(JSON.stringify({ error: 'features is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!anthropicKey) {
    return new Response(JSON.stringify({ error: 'AI service not configured' }), {
      status: 503,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // features 経路: feature-engine 出力をそのまま受け取る
  // systemPrompt はクライアント側 prompt-builder.js が構築して渡す
  const finalSystem      = customSystemPrompt || _defaultDiseaseSystemPrompt(disease);
  const finalUserContent = userPrompt || _buildFeaturesUserContent(features);
  const maxTokens        = 800;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: maxTokens,
      system: finalSystem,
      messages: [
        { role: 'user', content: finalUserContent },
      ],
    }),
  });

  const data = await response.json();

  return new Response(
    JSON.stringify({ ...data, _path: 'features' }),
    {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
});
