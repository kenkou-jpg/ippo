# TECHNICAL_DEBT_AUDIT.md
## ippo — 技術的負債監査（症例プラットフォーム化阻害要因）

Generated: 2026-06-24

---

## Critical（症例DB化を根本的に阻害するもの）

### C-1: user_data.state が非正規化JSONブロブ
**詳細:** records / myDiseases / experiments / trackedConditions 等が全て
`user_data.state: jsonb` 1カラムに混在している。
症例DBとして活用するには records の正規化テーブル化が必須。
現状では SQL クエリで症例を横断検索できない。

**影響:** 症例検索・類似症例・疫学的集計が不可能。

---

### C-2: app-legacy.js (10,804行 God Object)
**詳細:** 全UI・認証・分析表示・設定・コミュニティが1ファイルに混在。
モジュール境界が存在しないため、疾患ドメインの切り出しが困難。
strangler patternで移行中だが完了まで遠い。

**影響:** 新機能追加のたびにGod Objectが膨張。テスト困難。

---

### C-3: Case / Consent / Outcome ドメインが存在しない
**詳細:** 症例プラットフォームの核となる3つのドメインが完全未実装。
コード・DB・設計書に1行も存在しない。

**影響:** Phase9（症例プラットフォーム）への直接の阻害要因。

---

### C-4: 匿名化パイプラインがゼロ
**詳細:** ユーザーデータを匿名化して症例DBに移送するパイプラインが存在しない。
個人情報保護法・GDPR対応なしに症例DBは運用不可。

**影響:** 症例DB公開前にブロッカー。

---

## High（プラットフォーム化に重大な障壁）

### H-1: windowグローバル汚染 (50+ window.* export)
**詳細:** app-legacy.jsが100+関数をwindowに公開。
main.jsも50+のwindow export。
モジュール間の実際の依存関係が隠蔽されている。

**影響:** TypeScript移行・フレームワーク導入の障壁。

---

### H-2: Experimentが非正規化
**詳細:** `state.experiments` が `user_data.state` JSONB内に埋まっている。
実験の開始/終了/効果量 をSQL集計できない。
改善ランキング機能（Premium目標）の実現が困難。

**影響:** Experiment完了率 > 40% の計測すら不可能。

---

### H-3: ロードオーダー脆弱性
**詳細:** main.js のimport順序が壊れると白画面。
14ステップのロードオーダーが暗黙の前提となっており、文書化不十分。
過去の白画面バグの根本原因。

**影響:** 新機能追加時の安定性リスク。

---

### H-4: user_data / user_records 二重保存
**詳細:** 同じrecordが `user_data.state.records[]` と `user_records.data` の両方に存在。
整合性を保証するコードがない（mergeRecords()は両者を別々に扱う）。

**影響:** データ不整合リスク。正規化の妨げ。

---

### H-5: テスト対象の偏り
**詳細:** 33テストファイルの大半が analytics/ と disease/ に集中。
app-legacy.jsのUIロジックはほぼ未テスト。
E2Eテストゼロ。

**影響:** リファクタリング時のリグレッション検出が困難。

---

## Medium（中期的に対処が必要）

### M-1: profiles テーブル肥大化
**詳細:** is_premium / baseline_json / cluster_id / prediction_cache 等が profiles に混在。
責務が「ユーザー情報」を超えている。

---

### M-2: ADR-003 (is_premium → subscriptions) 移行未完
**詳細:** profiles.is_premium と subscriptions.status が共存している。
どちらが正とするか実行時に判断が必要。

---

### M-3: 疾患アナライザーのUI結合
**詳細:** disease/ は pure function化されているが、app-legacy.js内の旧分析関数と並存。
strangler patternの移行が完了していない。

---

### M-4: コミュニティ機能の残骸
**詳細:** app-legacy.js に `postCommunityReply()`, `toggleArchiveReplies()`, 
`updateReplyLikeCount()` 等のコミュニティ関数が存在するが、
DBテーブルが存在しないため機能しない（UI残骸）。

---

### M-5: 多言語対応ゼロ
**詳細:** 全テキストが日本語ハードコード。
i18nレイヤーが存在しない。世界展開の前提条件。

---

## Low（長期的に解消）

### L-1: CSS設計の分散
**詳細:** styles/app.css + design-system.css + 各モジュール内の .css ファイルが分散。
設計システムとして統一されていない。

### L-2: service worker の管理
**詳細:** sw.js が public/ に存在するが、キャッシュ戦略の文書化なし。

### L-3: CDN依存 (Supabase SDK)
**詳細:** supabase.js が jsdelivr CDNからESM importしている。
ネットワーク依存・バージョン固定リスク。

---

## 負債サマリー

| 分類 | 件数 | 症例プラットフォーム化への影響 |
|------|------|-------------------------------|
| Critical | 4件 | 直接ブロッカー |
| High | 5件 | 重大な障壁 |
| Medium | 5件 | 中期的な問題 |
| Low | 3件 | 長期的に解消 |

**結論:** Critical 4件が全て解消されない限り、症例DBの運用は法的・技術的に不可能。
