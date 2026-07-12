# GENERAL RELEASE SCREEN MAP
## App Experience Council — 画面の要不要分類

---

> **この文書の役割**: General Release時点で公開される画面一覧と、将来（Phase2以降）解放予定の
> 画面・機能を分類する唯一の正典。各画面の役割そのものは [SCREEN_FLOW.md](SCREEN_FLOW.md) が担う。
> 分類のみを行い、削除・新設の実装は行わない。

---

## 1. General Releaseで公開される画面一覧

以下は現時点で実装済みであり、General Release にそのまま持ち込む画面である。

| 画面/要素 | 状態 | 理由 |
|---|---|---|
| screen-welcome | 維持 | 初回起動に必須 |
| screen-home | 維持 | 全ユーザーの起点 |
| screen-record | 維持 | コア機能 |
| screen-calendar | 維持 | 振り返り体験の核 |
| insights（JS注入画面） | 維持 | STARTER価値の中核 |
| screen-settings | 維持 | アカウント・Consent管理 |
| screen-premium | 維持 | 課金導線 |
| success-overlay | 維持 | 保存成功フィードバック |

---

## 2. General Releaseに不要な画面・機能

以下は現時点で実装するべきではないと Council が判断したものである。

| 機能 | 判定 | 理由 |
|---|---|---|
| PRO tier分離UI（3層のプラン比較画面） | 不要（Phase2） | [FREE_PRO_BOUNDARY.md](business/FREE_PRO_BOUNDARY.md) 第3章、PRO層自体が未実装のため画面も不要 |
| Cohort比較画面 | 不要（Phase3） | Similarity UI公開条件（BD-026 k≥50）未達成のため |
| コミュニティ画面 | 実装しない方針を維持 | GROWTH_STRATEGY.md BGS-003 |
| 独立Timelineタブ | 不要 | [USER_JOURNEY.md](USER_JOURNEY.md) 第6章、既存のCalendar/Insightsへの機能分散で十分 |
| Menu/Profile独立画面 | 不要 | [NAVIGATION_DESIGN.md](NAVIGATION_DESIGN.md) 第2章、Settingsへの統合で十分 |

---

## 3. 将来（Phase2以降）解放予定の画面・機能

| 機能 | 送り先 | 関連文書 |
|---|---|---|
| Experiment Suggestion UI（hn-experiment-card含む） | Phase2 | [MONETIZATION_ROADMAP.md](business/MONETIZATION_ROADMAP.md) 第2章 |
| Question Layer UI（ins-question-card） | Phase2 | 同上 |
| 相関グラフ（ins-correlation-chart） | Phase2 | 同上 |
| 傾向アラートUI | Phase2 | 同上 |
| Research Contribution Badge | Phase2 | [VALUE_LADDER.md](business/VALUE_LADDER.md) 第2章⑤ |
| Similarity Match画面 | Phase3（条件付き） | [MONETIZATION_ROADMAP.md](business/MONETIZATION_ROADMAP.md) 第3章 |
| Clinic向けダッシュボード | Phase4 | BUSINESS_STRATEGY.md 4-D |

---

## 4. 総括

General Releaseの画面構成は7画面と1オーバーレイで完結しており、新規画面の追加は不要と Council は判定する。不足しているのは画面ではなく画面内の機能（PRO要素）であり、これは [MONETIZATION_ROADMAP.md](business/MONETIZATION_ROADMAP.md) Phase2が扱う。画面数を絞ったまま機能を段階的に追加していく方針は、Founder一人運営の哲学（`BUSINESS_STRATEGY.md` 2-A「Founderの自由」原則）とUIの複雑化を避けるという要請の両方に一致する。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-APPEXP-005 |
| **作成日** | 2026-07-07 |
| **前提文書** | SCREEN_FLOW.md / FREE_PRO_BOUNDARY.md / MONETIZATION_ROADMAP.md |
| **親文書** | [MONETIZATION_COUNCIL_REPORT.md](MONETIZATION_COUNCIL_REPORT.md) |
| **次回改訂トリガー** | Phase2着手時（Experiment Suggestion UI実装検討時） |
