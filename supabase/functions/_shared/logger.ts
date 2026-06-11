// _shared/logger.ts
// 構造化ログヘルパー。全 Edge Function で統一する。
// 出力形式: JSON 1行 (Supabase ログ基盤で検索可能)

export type LogLevel = 'info' | 'warn' | 'error';

export function log(
  level:  LogLevel,
  event:  string,
  data?:  Record<string, unknown>,
): void {
  const entry = {
    ts:    new Date().toISOString(),
    level,
    event,
    ...data,
  };
  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}
