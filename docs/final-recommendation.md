# 最終推奨: アーキテクチャ判断

> Phase 4 最終成果物。現時点（2026-05）での判断材料と推奨。

## 結論（先出し）

**今月の推奨: 選択肢 A（現行 Vite + app.html の安定運用）を継続しつつ、Phase 3 のクリーンアップを進める。**  
**3〜6ヶ月後の目標: Phase 1〜3 が安定した段階で React または SvelteKit への PoC を開始する。**

---

## 判断根拠

### 今すぐ移行しない理由

| 理由 | 詳細 |
|------|------|
| **現行版が production-safe になっていない** | Phase 1〜2 のバグ修正が完了したばかり。移行より安定化が先 |
| **Webhook 未整備** | Stripe 決済が完結しない状態でフレームワーク変更するとリスクが二重になる |
| **テストがない** | 移行中のリグレッションを検出する手段がない |
| **移行期間中は速度が落ちる** | app.html と新フレームワークを並走させる期間は機能追加が困難 |

### PoC を今すぐ始めてよい理由

| 理由 | 詳細 |
|------|------|
| **本番には影響しない** | `/poc/` は独立したディレクトリ、本番導線に接続しない |
| **リスク評価に必要** | 実際に動かしてみないと移行コストが見えない |
| **状態管理設計の検証** | `src/types/index.ts` の型定義は今すぐ書ける |

---

## フェーズ別アクション計画

### 今すぐ実施（Phase 3 完了に向けて）

```
[ ] cleanup-plan.md の Wave 1 開始（MINIFIED-STUB 17件削除）
    → 1PR 3ファイル × 6PR。リスク極低。
[ ] src/types/index.ts 作成（型定義のみ、実装変更なし）
    → DailyRecord, UserProfile などのインターフェースを定義
```

### 1〜2ヶ月後（安定運用フェーズ）

```
[ ] cleanup-plan.md の Wave 2 実施（REHEARSAL 5件削除）
[ ] Stripe Webhook の整備（payment-flow.md の production checklist）
[ ] save-sync-smoke.md の 8シナリオを手動実行・確認
[ ] cleanup-plan.md の Wave 3 開始（低リスク CANDIDATE 削除）
```

### 3〜6ヶ月後（PoC フェーズ）

```
[ ] フレームワーク選定（下記の決定フロー参照）
[ ] PoC プロジェクト作成（本番と完全分離）
[ ] 記録画面の PoC 実装
[ ] streak が derived store で正しく計算されることを検証
[ ] Supabase 統合が PoC で動くことを確認
```

---

## フレームワーク選定フロー

```
Q1: モバイルアプリ化（React Native）の予定がある？
  Yes → React を選択
  No  → Q2へ

Q2: チームに React 経験者がいる？
  Yes → React を選択（学習コスト低）
  No  → Q3へ

Q3: バンドルサイズと GitHub Pages 適性を最優先にしたい？
  Yes → SvelteKit を選択
  No  → どちらでも可（コインフリップでよい）

現状（ひとり開発・GitHub Pages・モバイルファースト）:
  → SvelteKit がわずかに有利
  → ただし React のエコシステム優位性も無視できない
  → 最終的には開発者自身の好みで決めてよい
```

---

## 移行ロードマップ全体像

```
2026-05 ──── Phase 1: Critical bug fixes ✅ 完了
             Phase 2: Auth/Payment reliability ✅ 完了
             
2026-06 ──── Phase 3: Codebase cleanup
             ├─ Wave 1: MINIFIED-STUB 削除
             ├─ Wave 2: REHEARSAL 削除
             └─ src/types/index.ts 型定義

2026-07 ──── Stripe Webhook 整備
             save-sync smoke テスト実施
             Wave 3: CANDIDATE 削除評価
             
2026-08 ──── Phase 4 PoC 開始
             ├─ フレームワーク選定
             ├─ 記録画面 PoC
             └─ domain model 検証

2026-09〜10 ─ PoC 完成・評価
             移行 Go/No-Go 判断

2026-10〜12 ─ 段階移行（Go の場合）
             Phase 1: record screen
             Phase 2: calendar
             Phase 3: insights
             Phase 4: settings
             Phase 5: home + app.html 削除
```

---

## リスク管理

| リスク | 発生条件 | 対策 |
|-------|---------|------|
| 移行中の startup 破壊 | app.html 削除が早すぎる | 各 Phase で app.html と新画面を並走させる |
| streak/save の移行バグ | 状態管理の切り替え | 移行前に smoke テストを必ず実施 |
| Supabase 認証の二重化 | 移行期間中 | 既存の 2 スタック認証をそのまま使う（Phase 2 の auth-data-flow.md 参照） |
| デプロイ失敗 | GitHub Actions 変更 | 旧 Vite ビルドを feature flag で並走 |

---

## 今月の成功条件（再確認）

✅ **公開運用できる安定版** — Phase 1・2 で達成済み  
✅ **次世代化の安全な設計判断** — Phase 3・4 で達成（このドキュメント）

今月の成功条件はすべて達成された。  
次のステップは cleanup-plan.md の Wave 1 から着手すること。
