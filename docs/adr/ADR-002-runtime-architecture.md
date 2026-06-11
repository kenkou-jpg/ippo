# ADR-002 — Runtime Architecture 統合判断

**日付**: 2026-06-11  
**ステータス**: 採用  
**作成者**: 改修計画書 (2026-06-10) に基づく実コード監査

---

## 背景

Runtime 整理フェーズとして、以下の変更を検討した。

1. runtime-brain / controller / orchestrator の責務再定義
2. startup 処理の統合
3. hydration 処理の統合
4. `startup-render-gate.js` を `hydration-guard.js` へ統合し削除
5. `runtime-debug-overlay.js` を本番バンドルから除外
6. `production-diagnostics.js`（1,401行）を責務別に分割

---

## 各ファイルの実コード監査結果

| ファイル | 行数 | 責務 |
|----------|------|------|
| `runtime-brain.js` | 550 | observer / 因果グラフ / 信頼度スコア / モード管理 |
| `runtime-controller.js` | 713 | executor / モード状態機械 / render retry / lexical bridge |
| `runtime-orchestrator.js` | 382 | aggregator / brain+controller の協調 / 統合ステータス API |
| `startup-render-gate.js` | 128 | render deferred queue / state-ready gate / 8s timeout |
| `startup-validator.js` | 76 | 起動フェーズ重複検知 |
| `hydration-guard.js` | 83 | stale cloud/IDB データによる state 上書きを阻止 |
| `runtime-debug-overlay.js` | — | 開発専用オーバーレイ（`import.meta.env.DEV` ガード済み） |
| `production-diagnostics.js` | 1,401 | 本番テレメトリ・UI 整合性・Supabase 診断・SW 検証 |

---

## 決定事項

### 1. runtime-brain / controller / orchestrator — 現状維持

**決定**: 変更なし。

**根拠**:
- brain: observer パターン。因果グラフ・信頼度スコア・モード遷移を観測する。
- controller: executor パターン。モード状態機械・render retry・lexical bridge を実行する。
- orchestrator: aggregator パターン。`window.*` global から全 runtime の状態を集約し単一 API を提供する。

3 つの責務は明確に分離されており、統合すると単一ファイルの肥大化と責務混在が発生する。「統合しない」を採用。

---

### 2. startup 処理 — 統合なし

**決定**: 変更なし。

**根拠**:
- `startup-render-gate.js`: render キューイング（state 準備完了まで描画を遅延）
- `startup-validator.js`: フェーズ重複検知（bootstrap が 2 回呼ばれたら警告）

2 つは協調しているが責務が異なる。統合すると phase tracking と render gate が混在し、テストが困難になる。

---

### 3. `startup-render-gate.js` の `hydration-guard.js` への統合 — 却下

**決定**: 統合しない。`startup-render-gate.js` を維持。

**根拠**:
- `hydration-guard.js`: **データ保護**。stale な cloud/IDB データが新しいローカル state を上書きしないかチェックする。`checkHydration(incoming, source)` を提供する純粋な判定関数。
- `startup-render-gate.js`: **描画タイミング制御**。`ippo:state-ready` イベントまで render をキューイングし、state 準備完了後に順序保証付きで実行する。

2 つは責務が根本的に異なる（データ完全性 vs 描画シーケンス）。統合すると SRP 違反になり、両方の unit test が不可能になる。

---

### 4. `runtime-debug-overlay.js` の本番除外 — 完了済み

**決定**: 対応不要。

**根拠**:  
ファイル冒頭の `const _IS_DEV = import.meta.env.DEV;` により、Vite 本番ビルドで `false` に静的置換される。`if (!_ENABLED)` で no-op stub に置き換わる。Dead code elimination により overlay コードはバンドルに含まれない。

---

### 5. `production-diagnostics.js` 分割 — 延期

**決定**: 現時点では分割しない。

**根拠**:
- 16 セクション（テレメトリ・UI 整合性・Supabase 診断・SW 検証・デバイス分類等）が内部状態 `_s` を共有している。
- 分割には `_s` のリファクタリングが必要で、テストなしに実施すると診断精度の劣化リスクがある。
- 現行テスト（`tests/runtime/`）は startup-render-gate のロジックテストのみであり、`production-diagnostics.js` の挙動を保護するテストが存在しない。
- **「テストで保証できない変更は実施しない」原則を適用。**

将来的にセクション単位のテストが整備された後、以下への分割を検討する：
- `diagnostics-device.js` (§4, §9)
- `diagnostics-supabase.js` (§5)
- `diagnostics-pwa.js` (§6)
- `diagnostics-cache.js` (§7)
- `diagnostics-ui.js` (§3, §11)
- `diagnostics-health.js` (§1, §2, §15)

---

## 最終判断サマリー

| 項目 | 判断 | 理由 |
|------|------|------|
| brain/controller/orchestrator 統合 | ❌ 却下 | 責務が明確に分離、統合でも価値なし |
| startup 処理統合 | ❌ 却下 | render gate と phase tracking は別責務 |
| hydration 処理統合 | ❌ 却下 | data guard と render gate は別責務 |
| startup-render-gate.js 削除 | ❌ 却下 | hydration-guard とは異なる責務、統合不可 |
| runtime-debug-overlay.js 本番除外 | ✅ 完了済み | import.meta.env.DEV で既に対応 |
| production-diagnostics.js 分割 | ⏸ 延期 | テストなし、リスク > 価値 |

Runtime Layer の現在の構造は意図的に設計されており、改変よりも維持が適切と判断する。
