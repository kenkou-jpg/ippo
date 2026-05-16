/// <reference types="vitest" />
import { defineConfig } from 'vite'

/**
 * ippo – Vite 設定
 *
 *  - publicDir: 'public' → sw.js / manifest.json / images をルートで配信
 *  - appType: 'mpa' → HTML ファイルを直接 URL で開ける
 *  - index.html (landing) + app.html (app shell) を両方 build input に含める
 *    → dist/index.html が生成され GitHub Pages root access が解決する
 */
export default defineConfig({
  test: {
    // jsdom: required for DOM-touching modules (calendar, home-renderer, reminders-ui)
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.js'],
      exclude: ['src/app-legacy.js'],   // excluded: too many window globals, migrate last
    },
  },

  // GitHub Pages / サブパス配信でも build assets を相対参照にする
  base: './',

  // console.* / debugger を本番ビルドから除去（esbuild 組み込み機能）
  esbuild: {
    drop: ['console', 'debugger'],
  },

  // プロジェクトルート（index.html ではなく app.html を使うため '.' のまま）
  root: '.',

  // static assets: public/ 以下を / にマウント
  publicDir: 'public',

  // Multi-Page App: /app.html を直接リクエストできる
  appType: 'mpa',

  server: {
    port: 5173,
    // ブラウザを自動で app.html に向ける
    open: '/app.html',
    // fs.strict を緩和して worktree 内のファイルを参照可能に
    fs: {
      strict: false,
    },
  },

  preview: {
    port: 4173,
    open: '/app.html',
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Raise chunk warning threshold while manual splitting is pending
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      input: {
        index: './index.html',
        app: './app.html',
      },
      output: {
        // ── Chunk Split Strategy ────────────────────────────────
        // Goal: reduce initial bundle from 533KB by isolating non-critical paths.
        //
        // Tier 0 (inline, always loaded): store, runtime-brain, startup-render-gate
        // Tier 1 (deferred, app shell):   runtime-controller, runtime-orchestrator
        // Tier 2 (lazy, screen-triggered): calendar, record modules
        // Tier 3 (lazy, feature-gated):   services/supabase, services/stripe,
        //                                  services/push
        //
        // Current state: all modules load synchronously via main.js static imports.
        // manualChunks here splits the already-imported graph into smaller files
        // so the browser can cache runtime and app-logic separately.
        // Dynamic import() migration is tracked separately.
        manualChunks(id) {
          // Runtime layer – loaded first, cached aggressively
          if (id.includes('/runtime/runtime-brain') ||
              id.includes('/runtime/startup-render-gate') ||
              id.includes('/runtime/health-monitor') ||
              id.includes('/runtime/boot-stability') ||
              id.includes('/store/')) {
            return 'runtime-core';
          }
          // Runtime control layer – loaded after state is ready
          if (id.includes('/runtime/runtime-controller') ||
              id.includes('/runtime/runtime-orchestrator') ||
              id.includes('/runtime/auth-cloud-state-machine') ||
              id.includes('/runtime/runtime-debug-overlay') ||
              id.includes('/runtime/production-diagnostics')) {
            return 'runtime-control';
          }
          // Guard layer – loaded during bootstrap
          if (id.includes('/runtime/') ||
              id.includes('/modules/app-bootstrap') ||
              id.includes('/modules/boot-stability')) {
            return 'runtime-guards';
          }
          // Services – loaded on-demand (cloud/payment/push)
          if (id.includes('/services/supabase') ||
              id.includes('/services/stripe') ||
              id.includes('/services/push')) {
            return 'services';
          }
          // Record modules – loaded after first render
          if (id.includes('/modules/record') ||
              id.includes('/modules/daily-record')) {
            return 'record-modules';
          }
          // Calendar & home UI
          if (id.includes('/modules/calendar') ||
              id.includes('/modules/home-renderer')) {
            return 'ui-home';
          }
        },
      },
    },
  },
})
