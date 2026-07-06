// ============================================================
//  ippo – src/runtime/sentry-reporter.js
//  Operations Recovery Program PR-OPS-01: Sentry (Client)
//
//  window.__ippoDiagBus（boot-stability.js が単一オーナー）の
//  購読者として window-error / unhandled-rejection を Sentry へ転送する。
//  新規の window.addEventListener('error'/'unhandledrejection') は追加しない
//  （既存の single-owner パターンを維持）。
//
//  DSN 未設定時、または本番ビルドでない場合は完全に no-op。
//  DSN 設定後はコード変更不要（環境変数のみで有効化）。
// ============================================================

import { getSentryDsn, isProduction, getAppVersion } from '../services/environment-service.js';

var _enabled = false;

function _init() {
  var dsn = getSentryDsn();
  if (!dsn || !isProduction()) return;

  import('@sentry/browser').then(function (Sentry) {
    Sentry.init({
      dsn:              dsn,
      environment:      'production',
      release:          getAppVersion(),
      tracesSampleRate: 0,
    });
    _enabled = true;
    window.__ippoSentry = Sentry;

    if (window.__ippoDiagBus && typeof window.__ippoDiagBus.subscribe === 'function') {
      window.__ippoDiagBus.subscribe(function (type, detail) {
        if (!_enabled) return;
        try {
          if (type === 'window-error') {
            Sentry.captureException(new Error(detail.message || 'window-error'), {
              extra: detail,
            });
          } else if (type === 'unhandled-rejection') {
            Sentry.captureException(new Error(detail.reason || 'unhandled-rejection'), {
              extra: detail,
            });
          }
        } catch (_) {}
      });
    }
  }).catch(function () {
    // Sentry の読み込み失敗はアプリ動作に影響させない
  });
}

try { _init(); } catch (_) {}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('sentry-reporter-loaded');
}
