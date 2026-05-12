# src/modules/ モジュール棚卸し一覧

> Phase 3 調査結果。97ファイル全数分類。2026-05 時点。
> 分類基準: REQUIRED / OBSERVE-ONLY / CANDIDATE / REHEARSAL / MINIFIED-STUB

## サマリ

| 分類 | 件数 | 説明 |
|------|-----|------|
| **REQUIRED** | 28 | 起動・保存・記録に必須。削除禁止 |
| **OBSERVE-ONLY** | 22 | console.log/window イベントのみ。状態を変えない |
| **CANDIDATE** | 24 | ガード済みの未活性化機能。削除候補検討可 |
| **REHEARSAL** | 5 | ドライラン・シャドウコピー。本番パスには存在しない |
| **MINIFIED-STUB** | 17 | 10行程度の無効化スタブ。安全に削除可能 |
| **UNUSED** | 0 | すべてインポートまたはCandidateチェーンに接続済み |
| **合計** | **97** | |

**コアクリティカルパス:**
`boot-stability → bootstrap-shell → runtime-sequencing → record.js → record-save-pipeline → persistence layers`

---

## REQUIRED（28件）— 削除禁止

| ファイル | 行数 | 役割 |
|---------|-----|------|
| `boot-stability.js` | 380 | 起動ループ検出・セッション状態管理、persistence-trace-runtime をインポート |
| `guarded-optional-runtime-loader.js` | 398 | オプショナルランタイムの遅延インポート管理（コアローダー） |
| `bootstrap-shell.js` | 162 | DOM ルート・init/hydration/persistence オーナーシップ確認 |
| `legacy-window-bridge.js` | 60 | window.saveState 等レガシーAPI の存在確認 |
| `runtime-sequencing.js` | 253 | DOMContentLoaded 後に4コアモジュールを順序付け起動 |
| `persistence-boundary-prep.js` | 168 | state/records/auth の境界観測（main.js 静的インポート） |
| `persistence-execution-readiness.js` | 159 | persistence 実行準備確認（main.js 静的インポート） |
| `persistence-guarded-execution.js` | 182 | persistence 実行ガード（main.js 静的インポート） |
| `legacy-bootstrap-fallback-isolation.js` | 327 | 旧 init/DOMContentLoaded オーナーシップのフォールバック分離 |
| `main-entry-startup-observer-wiring.js` | 233 | 起動オブザーバーのコールバック登録 |
| `startup-guard-candidate.js` | 250 | 起動候補実行のガード（observe-only 安全レイヤー） |
| `startup-sequencing-candidate-orchestration.js` | 323 | 起動シーケンス候補のオーケストレーション |
| `startup-extraction-guarded-gate.js` | 253 | 起動抽出のゲート制御 |
| `record.js` | 411 | 記録画面ファサード（openRecordScreen, saveRecord の入口） |
| `record-repository.js` | 317 | 読み取り専用レポジトリ（getRecords, findRecordByDate） |
| `record-upsert.js` | 148 | upsert ユーティリティ（merge, clone, normalize） |
| `record-save-pipeline.js` | 916 | コアセーブパイプライン（context/upsert/persist/sync） |
| `record-save-orchestrator.js` | 755 | セーブオーケストレーター（record.js から呼ばれる） |
| `record-save-core.js` | 491 | セーブコアファサード（draft/target/persistence を束ねる） |
| `record-save-core-persistence.js` | 472 | セーブコアの persistence 委譲ゲート |
| `record-save-delegation.js` | 443 | セーブ委譲計画（upsert prep 後に実行） |
| `record-save-adoption.js` | 539 | モジュールペイロード採用（buildDraftFromUI をインターセプト） |
| `record-save-result.js` | 315 | セーブ結果の正規化 |
| `record-save-target.js` | 562 | セーブターゲット解決・ペイロード構築 |
| `record-draft.js` | 362 | レコードドラフトの生成・正規化 |
| `record-edit-merge.js` | 244 | 編集時の既存レコードマージ（データ保護） |
| `record-edit-hydrate.js` | 491 | 編集画面の hydration 補正 |
| `record-edit-save-identity-guard.js` | 371 | 編集保存時の identity ガード |
| `record-freshness-guard.js` | 349 | レコード鮮度ガード（stale 編集防止） |
| `welcome-reset-guard.js` | 360 | ウェルカムリセットフロー安全ガード |

---

## OBSERVE-ONLY（22件）— 保持推奨（削除してもクラッシュしないが価値あり）

| ファイル | 行数 | 役割 |
|---------|-----|------|
| `bootstrap-ownership-prep.js` | 319 | ブートストラップオーナーシップ観測（遅延ロード lane 0） |
| `deferred-hydration-prep.js` | 197 | hydration 準備観測（遅延ロード lane 1） |
| `hydration-inline-inventory-runtime.js` | 233 | インライン hydration コードの重複観測 |
| `persistence-trace-runtime.js` | 139 | persistence トレース診断（console.debug のみ） |
| `production-smoke-verification.js` | 192 | 本番稼動スモーク確認（コンソールチェック） |
| `record-date-branch-observability.js` | 626 | レコード日付ブランチの観測（遅延ロード lane 4） |
| `record-date-rollout-trace.js` | 488 | レコード日付ロールアウトのトレース（遅延ロード lane 4） |
| `record-save-adoption-verify.js` | 333 | セーブ採用準備の検証（遅延ロード lane 4） |
| `record-save-shadow.js` | 286 | セーブ実行のシャドウ観測（console.debug のみ） |
| `render-boundary-prep.js` | 161 | レンダー境界観測（遅延ロード lane 1） |
| `render-inline-inventory-runtime.js` | 241 | インラインレンダーコードの重複観測 |
| `runtime-consolidation-runtime.js` | 62 | ランタイム状態の診断集約 |
| `runtime-ownership-graph.js` | 210 | 起動/hydration/render オーナーシップグラフ（遅延ロード lane 2） |
| `screen-activation-prep.js` | 154 | 画面アクティベーション観測（遅延ロード lane 1） |
| `startup-boundary-adapter.js` | 196 | 起動境界観測・旧 init をマッピング（遅延ロード lane 0） |
| `startup-duplicate-cleanup-inventory-runtime.js` | 274 | 起動重複（DOMContentLoaded 等）インベントリ |
| `startup-ownership-shadow-runtime.js` | 337 | 起動オーナーシップ遷移のシャドウトレース |
| `startup-verify.js` | 109 | 起動準備確認（遅延ロード lane 1） |
| `ui-drift-suppression-runtime.js` | 394 | ウェルカムリセット中の UI ドリフト抑制 |
| `ui-transition-ownership-runtime.js` | 378 | ウェルカムリセット中の UI 遷移管理 |
| `window-bridge-inventory-stabilization-runtime.js` | 243 | window ブリッジのインベントリ・安定化 |
| `daily-record-card-guard.js` | 261 | レコードカード UI ガード（console.debug のみ） |
| `minimal-app-shell-renderer.js` | 158 | 最小シェルレンダー準備観測 |

---

## CANDIDATE（24件）— 削除候補（段階的に評価）

> ガードされた未活性化機能。現時点では本番パスには存在しないが、削除前に個別ビルド確認が必要。

| ファイル | 行数 | 用途 |
|---------|-----|------|
| `actual-startup-inline-removal-runtime.js` | 222 | 起動インライン除去の準備候補 |
| `final-shell-slimming-runtime.js` | 241 | シェルスリム化コーディネーション候補 |
| `guarded-startup-extraction-activation-planning.js` | 215 | 起動抽出アクティベーション計画 |
| `hydration-activation-rehearsal-runtime.js` | 228 | hydration アクティベーションのリハーサル |
| `hydration-candidate-runtime.js` | 223 | hydration 実行候補（遅延ロード lane 2） |
| `hydration-extraction-planning-runtime.js` | 211 | hydration 抽出計画 |
| `limited-app-html-dead-inline-cleanup-runtime.js` | 229 | app.html デッドインラインクリーンアップ候補 |
| `limited-hydration-inline-cleanup-runtime.js` | 202 | hydration インラインクリーンアップ候補 |
| `limited-legacy-window-bridge-cleanup-runtime.js` | 212 | レガシーウィンドウブリッジクリーンアップ候補 |
| `limited-render-inline-cleanup-runtime.js` | 212 | レンダーインラインクリーンアップ候補 |
| `limited-startup-duplicate-helper-cleanup-runtime.js` | 66 | 起動重複ヘルパークリーンアップ候補 |
| `limited-startup-extraction-rehearsal.js` | 242 | 起動抽出のリハーサル（遅延ロード lane 3） |
| `minimal-shell-adoption-runtime.js` | 228 | 最小シェル採用候補 |
| `persistence-candidate-execution.js` | 211 | persistence 実行候補（遅延ロード lane 2） |
| `persistence-limited-adoption.js` | 170 | persistence 制限採用候補 |
| `record-date-draft-candidate.js` | 753 | レコード日付ドラフト追跡候補（遅延ロード lane 4） |
| `record-date-limited-adoption-candidate.js` | 389 | レコード日付制限採用候補（遅延ロード lane 4） |
| `render-boundary-extraction-planning-runtime.js` | 211 | レンダー境界抽出計画 |
| `service-boundary-stabilization-runtime.js` | 241 | サービス境界安定化候補 |
| `startup-extraction-activation-candidate-runtime.js` | 228 | 起動抽出アクティベーション候補（遅延ロード lane 3） |
| `startup-extraction-adoption-candidate-runtime.js` | 259 | 起動抽出採用候補（遅延ロード lane 3） |
| `startup-extraction-candidate-shell.js` | 322 | 起動抽出候補シェル（遅延ロード lane 3） |
| `startup-extraction-ownership-activation-planning.js` | 218 | 起動抽出オーナーシップアクティベーション計画 |
| `state-ownership-stabilization-runtime.js` | 249 | 状態オーナーシップ安定化候補 |

---

## REHEARSAL（5件）— 削除候補（優先度高）

> ドライラン・シャドウコピー。本番パスには存在しない。

| ファイル | 行数 | 用途 |
|---------|-----|------|
| `hydration-activation-rehearsal-runtime.js` | 228 | hydration アクティベーションのドライラン |
| `limited-startup-extraction-rehearsal.js` | 242 | 起動抽出のドライラン |
| `startup-extraction-activation-rehearsal-runtime.js` | 227 | 起動抽出アクティベーションのドライラン |
| `startup-extraction-ownership-activation-rehearsal-runtime.js` | 234 | 起動抽出オーナーシップのドライラン |
| `startup-extraction-ownership-candidate-runtime.js` | 228 | 起動抽出オーナーシップ候補のシャドウ |

---

## MINIFIED-STUB（17件）— 削除候補（最優先・安全）

> 10行前後の無効化スタブ。デフォルト disabled。本番に影響なし。

| ファイル | 行数 |
|---------|-----|
| `app-html-hydration-render-slimming-runtime.js` | 10 |
| `app-html-startup-slimming-runtime.js` | 10 |
| `final-app-shell-cleanup-runtime.js` | 10 |
| `final-compatibility-cleanup-runtime.js` | 64 |
| `guarded-render-screen-adoption.js` | 10 |
| `guarded-startup-hydration-adoption.js` | 10 |
| `legacy-window-bridge-reduction-runtime.js` | 10 |
| `render-activation-rehearsal-runtime.js` | 11 |
| `render-candidate-runtime.js` | 10 |
| `render-screen-guarded-execution.js` | 10 |
| `screen-activation-candidate-runtime.js` | 10 |
| `screen-activation-extraction-planning-runtime.js` | 10 |
| `screen-activation-rehearsal-runtime.js` | 10 |
| `service-boundary-cleanup-runtime.js` | 10 |
| `startup-hydration-guarded-execution.js` | 10 |
| `startup-ownership-extraction-planning-runtime.js` | 227 |
| `state-store-ownership-cleanup-runtime.js` | 10 |

---

## 削除優先度マトリックス

| 優先度 | 分類 | 件数 | 推定削減行数 | リスク |
|-------|------|-----|------------|-------|
| 1（最優先）| MINIFIED-STUB | 17 | ~430行 | ✅ 極低 |
| 2 | REHEARSAL | 5 | ~1,160行 | ✅ 低 |
| 3 | CANDIDATE（遅延ロード系）| 15 | ~3,500行 | ⚠️ 中（個別確認要） |
| 4 | CANDIDATE（未配線系）| 9 | ~2,000行 | ⚠️ 中 |
| 保留 | OBSERVE-ONLY | 22 | — | 診断価値あり、急がない |
| 削除禁止 | REQUIRED | 28 | — | ❌ 削除不可 |
