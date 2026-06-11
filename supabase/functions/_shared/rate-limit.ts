// _shared/rate-limit.ts
// Deno KV ベースの永続 Rate Limiter。
// in-memory Map はコールドスタートでリセットされるため、KV で永続化する。

export interface RateLimitOptions {
  maxRequests: number;  // ウィンドウ内の最大リクエスト数
  windowMs:    number;  // ウィンドウサイズ (ms)
}

const _kv = await Deno.openKv();

/**
 * userId + endpoint の組み合わせでレートリミットを確認する。
 * 上限以下なら true を返し、カウンタを更新する。
 * 上限超過なら false を返す（書き込みなし）。
 */
export async function checkRateLimit(
  userId:   string,
  endpoint: string,
  opts:     RateLimitOptions,
): Promise<boolean> {
  const { maxRequests, windowMs } = opts;
  const key         = ['rl', endpoint, userId] as const;
  const now         = Date.now();
  const windowStart = now - windowMs;

  const entry      = await _kv.get<number[]>(key);
  const timestamps = (entry.value ?? []).filter(t => t > windowStart);

  if (timestamps.length >= maxRequests) return false;

  timestamps.push(now);
  // TTL は windowMs + 5s のバッファを持たせる
  await _kv.set(key, timestamps, { expireIn: windowMs + 5_000 });
  return true;
}
