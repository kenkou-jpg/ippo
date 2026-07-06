// _shared/logger.ts
// 構造化ログヘルパー。全 Edge Function で統一する。
// 出力形式: JSON 1行 (Supabase ログ基盤で検索可能)
//
// Operations Recovery Program PR-OPS-01: SENTRY_DSN が設定されている場合のみ、
// error レベルのログを追加で Sentry へ転送する（Deno SDK を動的 import・遅延初期化）。
// SENTRY_DSN 未設定時は従来どおり console.error のみで完全に no-op。

export type LogLevel = 'info' | 'warn' | 'error';

// deno-lint-ignore no-explicit-any
let _sentry: any = null;
let _sentryInitAttempted = false;

async function _getSentry() {
  if (_sentryInitAttempted) return _sentry;
  _sentryInitAttempted = true;

  const dsn = Deno.env.get('SENTRY_DSN');
  if (!dsn) return null;

  try {
    const Sentry = await import('https://deno.land/x/sentry/index.mjs');
    Sentry.init({ dsn, environment: 'production' });
    _sentry = Sentry;
  } catch (_e) {
    // Sentry 初期化失敗時もログ出力自体は継続させる
    _sentry = null;
  }
  return _sentry;
}

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
    _getSentry().then((Sentry) => {
      if (Sentry) Sentry.captureMessage(event, { level: 'error', extra: data });
    }).catch(() => {});
  } else if (level === 'warn') {
    console.warn(line);
  } else {
    console.log(line);
  }
}
