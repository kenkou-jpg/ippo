// ============================================================
//  ippo – src/main.js
//  Vite エントリー: 定数・サービスを import して window に公開
//  CSS は app.html の <link> で読み込み済み
// ============================================================

// CSS は app.html の <link rel="stylesheet"> で読み込み済み。
// ここで import するとVite以外の環境(npx serve等)でモジュール全体が失敗するため除外。

// ─── Boot stability ───────────────────────────────────────
import './modules/boot-stability.js';
import './modules/legacy-window-bridge.js';
import './modules/startup-verify.js';
import './modules/bootstrap-shell.js';
import './modules/startup-boundary-adapter.js';
import './modules/bootstrap-ownership-prep.js';
import './modules/startup-guard-candidate.js';
import './modules/runtime-sequencing.js';
import './modules/deferred-hydration-prep.js';
import './modules/render-boundary-prep.js';
import './modules/screen-activation-prep.js';
import './modules/runtime-ownership-graph.js';
import './modules/persistence-boundary-prep.js';
import './modules/persistence-execution-readiness.js';
import './modules/persistence-candidate-execution.js';
import './modules/persistence-guarded-execution.js';

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('main-entry-start');
}

// existing file unchanged except startup guard visibility additions
