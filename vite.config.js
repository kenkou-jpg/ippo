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
  // GitHub Pages / サブパス配信でも build assets を相対参照にする
  base: './',

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
    rollupOptions: {
      input: {
        index: './index.html',
        app: './app.html',
      },
    },
  },
})
