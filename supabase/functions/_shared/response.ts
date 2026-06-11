// _shared/response.ts
// 統一 JSON レスポンスヘルパー。
// エラー形式: { error: string, code?: string }

import { corsHeaders } from './cors.ts';

export function jsonResponse(
  data:   unknown,
  status: number = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export function jsonError(
  error:  string,
  status: number,
  code?:  string,
): Response {
  const body: { error: string; code?: string } = { error };
  if (code) body.code = code;
  return jsonResponse(body, status);
}
