# MONETIZATION ROADMAP
## IPPO Monetization Council — General Release後 収益ロードマップ

---

> **この文書の役割**: General Release 以降、いつ・どの機能を・どのプランに実装していくかの時系列計画を定める唯一の正典。
> `BUSINESS_STRATEGY.md` 8章（Revenue Roadmap）/ `GTM_COUNCIL.md` 11章（10-Year GTM Roadmap）を
> Monetization機能の実装順序という切り口で再整理したものであり、新しい年次売上目標は設定しない。

---

## 1. General Release 時点（Phase 0）

[MONETIZATION_FRAMEWORK.md](MONETIZATION_FRAMEWORK.md) 第6章の通り、FREE + STARTER の2層で開始する。実装済みの FREE 全機能（[FREE_PRO_BOUNDARY.md](FREE_PRO_BOUNDARY.md) 第2章）と STARTER 全機能（同第3章）、および Stripe 課金基盤がそのまま General Release の土台となる。価格は Founder Decision FD-1 待ちであり、決定するまでは実装済み価格を変更しない。

PRO 層の tier 分離、Question Layer、Experiment Suggestion、Cohort 比較、カスタム Signal、Research Contribution Badge は、いずれも Phase2 以降に送る。

---

## 2. Phase2（PRO層の完成 / Value Ladder③⑤の解消）

Phase2 の中心課題は、[VALUE_LADDER.md](VALUE_LADDER.md) が特定した「③改善」と「⑤資産化」の実装ギャップを解消することにある。この2つのギャップは Monetization Council と App Experience Council が独立に発見した共通のボトルネックであり、Phase2 全体の中で最優先に扱う。

| 機能 | 配置 | 理由 |
|---|---|---|
| PRO tier分離（isPremium()の3値化） | アーキテクチャ基盤 | STARTER/PRO境界の実装前提 |
| Question Layer | PRO | 設計済み（PRO_INSIGHT_ARCHITECTURE.md Section 5） |
| Experiment Suggestion | PRO | Value Ladder③の解消に直結 |
| 相関グラフ（散布・折れ線） | PRO | 設計済み・未実装 |
| 傾向アラート | PRO | 設計済み・未実装 |
| Research Contribution Badge | 全プラン（Consent同意者） | Value Ladder⑤の解消 / GROWTH_STRATEGY.md口コミ条件Dに直結 |
| 実験ライブラリ | PRO | ユーザーの実験パターンをテンプレート化。BUSINESS_STRATEGY.md「やらないこと」に抵触しない範囲で設計 |

---

## 3. Phase3（Similarity / Pattern / 匿名比較 — Phase3完了条件連動）

Phase3 の機能群は、BD-026/BD-027（k≥50・5疾患達成が前提条件）に連動するため、実装よりも先にデータ量の達成が必須条件になるという特殊性を持つ。したがって Phase3 の着手時期は Founder が実装スケジュールとして決められるものではなく、Phase3 Completion Validator の達成状況によって機械的に判定される。

| 機能 | 配置 | 前提条件 |
|---|---|---|
| Similarity Match（類似症例） | PRO | Phase3 Completion Validator 達成後（既存BD-026） |
| Pattern Search | PRO | 同上 |
| 匿名比較（Disease Cluster位置確認の拡張） | STARTER→PRO拡張 | 同上 |
| ランキング（記録密度上位%等） | 全プラン | GROWTH_STRATEGY.md FR-G02 のHome Cluster拡張と連動 |
| PDF出力 | STARTER（既存の医師向けレポートが該当） | 実装済み |
| CSV出力 | FREE（自己情報の開示） | 実装済み・変更なし |

---

## 4. Phase4（B2B / API / Community）

Phase4 は `BUSINESS_STRATEGY.md` 7章・`GTM_COUNCIL.md` 9章がすでに定める展開時期と一致させる。

| 機能 | 配置 | 時期目安 |
|---|---|---|
| API（Clinic API） | Enterprise（B2B） | Wave4〜（BUSINESS_STRATEGY.md 4-D） |
| コミュニティ機能 | 個人向けは実装しない方針を継続 | GROWTH_STRATEGY.md BGS-003（独自コミュニティ開設はWave3完了後まで禁止） |
| 企業向け（Research License） | Enterprise | Wave3〜（既存BBS-002） |
| Disease Intelligence API | Enterprise | Wave5〜（BUSINESS_STRATEGY.md 3-B 柱4） |

---

## 5. 機能配置サマリー表

| 将来機能 | FREE | PRO | Enterprise |
|---|---|---|---|
| 実験ライブラリ | — | ✓（Phase2） | — |
| AI Insights（Question/Experiment） | — | ✓（Phase2） | — |
| Pattern Search | — | ✓（Phase3、条件付き） | — |
| 匿名比較 | 簡易版 | 詳細版（Phase3） | — |
| ランキング | ✓（軽量版） | ✓（詳細版） | — |
| PDF | — | ✓（実装済み） | — |
| CSV | ✓（実装済み） | ✓ | — |
| API | — | — | ✓（Phase4） |
| コミュニティ | 実装しない（BGS-003） | 実装しない | — |
| 企業向け機能 | — | — | ✓（Research License / Clinic API） |

---

## 6. 価格を決める前に決めるべきこと

`Founder 指示「価格議論は禁止」に従い、以下は価値設計のみを示す（価格自体は含まない）。General Release前に決めるべき前提は、実装済み価格とBBS-001価格のどちらを正とするか（FD-1）、PRO層をGeneral Releaseで出すかPhase2に送るか（FD-2）、isPremium()を3値化するアーキテクチャ変更の実施時期、Research Contribution BadgeのConsent連動設計の詳細、そしてQuestion Layer / Experiment SuggestionのAI Safety境界確認（REGULATORY_MEDICAL_COUNCIL.md BD-044の適用範囲の再確認、提案が治療指示に踏み込まないための文言レビュー）である。これらの正式な一覧と背景は [MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) 第9章「Important Founder Decisions」を正とする。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-MONETIZATION-005 |
| **作成日** | 2026-07-07 |
| **前提文書** | MONETIZATION_FRAMEWORK.md / VALUE_LADDER.md / BUSINESS_STRATEGY.md 8章 / GTM_COUNCIL.md 11章 |
| **親文書** | [MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) |
| **次回改訂トリガー** | Phase2着手時 / Phase3完了条件（k≥50・5疾患）達成時 |
