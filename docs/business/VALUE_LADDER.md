# VALUE LADDER
## IPPO Monetization Council — 価値の梯子 監査

---

> **この文書の役割**: 「記録→理解→改善→習慣化→資産化」という価値の段階を定義し、
> 各段階が実装レベルでどこまで成立しているかを監査する、唯一の正典。
> プランと機能の対応は [FREE_PRO_BOUNDARY.md](FREE_PRO_BOUNDARY.md)、
> この段階をユーザー体験としてどう歩ませるかは [USER_JOURNEY.md](../USER_JOURNEY.md) が担う。
> 新しい機能設計は行わない。既存決定・既存実装の棚卸しである。

---

## 1. Value Ladder 全体図

IPPO における価値は一段階では完結しない。ユーザーはまず「記録する」ことから始まり、記録が蓄積されることで「理解する」段階に進み、理解した内容をもとに「改善する」ための行動を選び、その行動が積み重なることで「習慣化」し、最終的には自分の記録が研究という形で社会に還元される「資産化」の段階に至る。この5段階の連なりが崩れると、ユーザーは途中で離脱し、Research Dataset としての価値も育たない。

```
記録 ──→ 理解 ──→ 改善 ──→ 習慣化 ──→ 資産化
 │        │        │         │          │
 FREE   STARTER   PRO      全プラン    全プラン
                                       （Consent同意者）
```

| 段階 | 定義 | 主に対応するプラン | 対応する既存文書 |
|---|---|---|---|
| ① 記録 | 症状・生活習慣を記録する | FREE | FEATURE_INVENTORY.md「User Features」 |
| ② 理解 | 記録から傾向・パターンを知る | STARTER | PRO_INSIGHT_ARCHITECTURE.md |
| ③ 改善 | 何を試すかの提案を受け、行動する | PRO（未実装部分あり） | PRO_INSIGHT_ARCHITECTURE.md Section 6 |
| ④ 習慣化 | 記録・改善サイクルが継続する | 全プラン | GROWTH_STRATEGY.md Section 6 |
| ⑤ 資産化 | 自分の記録が研究・社会に貢献する | 全プラン（Research Consent 同意者） | BUSINESS_STRATEGY.md 6章 / GROWTH_STRATEGY.md 6-B |

---

## 2. 段階別監査

### ① 記録（Record）— 成立している

Record（3カード記録フロー）、Draft保護、カレンダー、Experiments基礎実装のいずれも `FEATURE_INVENTORY.md` で「✅ 実装済み」と確認されており、記録という最初の段階は十分に機能している。記録の障壁は3-cardフローによって最小化されており、この段階にリスクは見当たらない。

### ② 理解（Understanding）— 成立している

`home-insight-engine.js` と `PRO_INSIGHT_ARCHITECTURE.md` の DerivedInsight 設計、`modules/pro/` 配下の各種レポート（correlation-report / cycle-report 等）により、「記録すると、何かが返ってくる」という `GROWTH_STRATEGY.md` 6-B の核心ループはすでに実装済みである。この段階も十分に機能しており、リスクは見当たらない。

### ③ 改善（Action / Experiment）— 部分的に成立、Value Ladder 最大のギャップ

Council が最も重視すべきと判断したのがこの段階である。`modules/experiments.js` は「基礎実装済み」に留まり、`PRO_INSIGHT_ARCHITECTURE.md` が設計した Question Layer（問いかけ層）と Experiment Suggestion（実験提案）はいずれも「設計済み・未実装」の状態にある。

「理解」までは強いが、「では何を試せばいいか」という提案がルールベースで自動生成される仕組みがまだ実装されていない。Experiments 機能自体は存在するが、何を実験するかをユーザーが自発的に決めなければならず、「AI が提案する」という体験は未完成のままである。

この段階が弱いままだと Value Ladder は「記録→理解」で頭打ちになり、「習慣化」への動機（改善の実感）が生まれにくくなる。これは `GROWTH_STRATEGY.md` が挙げるリスク G-02（記録継続率が40%を下回る）の直接的な原因になりうる。Question Layer / Experiment Suggestion の実装は、Monetization Roadmap における Phase2 の最優先候補として扱う（[MONETIZATION_ROADMAP.md](MONETIZATION_ROADMAP.md) 第2章）。

### ④ 習慣化（Retention）— 設計レベルでは成立している

`GROWTH_STRATEGY.md` 6章が定める「1 Record = 1 Insight」の設計原則と通知設計は、設計としてはすでに完成している。ただし実際の継続率（30日60%目標）は MAU=0（`RELEASE_READINESS_COUNCIL.md` 記載）のため実測ではまだ検証されていない。加えて、③の弱さが④に波及する構造上のリスクがある――「改善」の実感が乏しいまま「習慣化」を期待することはできない。

### ⑤ 資産化（Contribution）— 設計はあるが未実装

Research Consent の設計自体は `REGULATORY_MEDICAL_COUNCIL.md` 4章によって文書レベルで完成しているが、「あなたの記録が研究に貢献しています」というユーザーへのフィードバック（`GROWTH_STRATEGY.md` 6-B の Day365以降の設計）や Research Contribution Badge（[FREE_PRO_BOUNDARY.md](FREE_PRO_BOUNDARY.md) 第4章）は未実装である。

Research Dataset は技術的にはすでに存在するが、ユーザー体験としての「還元ループ」がまだ欠けている。この欠落は Growth 戦略が期待する口コミの発生条件D「データが研究に使われた」体験（`GROWTH_STRATEGY.md` 7-A）にも直結するため、Research Contribution の可視化を Phase2〜3 の優先実装候補とする。

---

## 3. 監査結論

Value Ladder は部分的に成立している。①記録・②理解は強固であり、実装済みかつ実運用可能な水準にある。一方で③改善は設計はあるが未実装であり、これが Value Ladder 上最も重要なギャップである。④習慣化は設計が完成しているが実測データがなく、③の弱さの影響を受けている。⑤資産化は設計はあるが「還元」体験が未実装である。

General Release は①②④（設計部分）で成立させ、③⑤を Phase2 の最優先課題として明記することを Council の結論とする。この結論は [USER_JOURNEY.md](../USER_JOURNEY.md) が独立に行ったユーザージャーニー監査とも完全に一致しており（同文書 第9章参照）、両 Council が異なる角度から同じ結論に至ったことは、この優先順位付けの妥当性を裏付けている。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-MONETIZATION-003 |
| **作成日** | 2026-07-07 |
| **前提文書** | MONETIZATION_FRAMEWORK.md / FREE_PRO_BOUNDARY.md / GROWTH_STRATEGY.md / PRO_INSIGHT_ARCHITECTURE.md |
| **親文書** | [MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) |
| **最重要ギャップ** | ③改善（Question Layer / Experiment Suggestion 未実装、FD-4として親文書に記録） |
| **次回改訂トリガー** | Experiment Suggestion 実装時 / Research Contribution Badge 実装時 |
