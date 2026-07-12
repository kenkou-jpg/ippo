# INFORMATION ARCHITECTURE
## App Experience Council — 情報設計

---

> **この文書の役割**: 各画面の「中で」何をどの優先順位で見せるかを定義する唯一の正典。
> どの画面が存在し、画面間をどう遷移するかは [SCREEN_FLOW.md](SCREEN_FLOW.md) が担う
> （本文書は画面「内」の情報の並び、SCREEN_FLOW.md は画面「間」の役割と遷移を扱うという分担）。
> 新規要素の追加は提案しない。既存実装の情報優先順位を言語化したものである。

---

## 1. Home — 優先順位設計

[USER_JOURNEY.md](USER_JOURNEY.md) と `GTM_COUNCIL.md` 4-A が定める「最初に何を見せるか」という原則を踏まえ、既存実装（home-renderer.js、PR-092A統合済み）の構成要素を優先順位順に整理すると、情報密度は上から下に向かって「今すぐの行動」→「今日の意味」→「今週の継続」→「将来の提案」の順で高くなる。

| 優先度 | 要素 | 目的 | プラン |
|---|---|---|---|
| 1 | 今日の記録CTA（記録済み/未記録の状態） | 「今日やることは何か」を即答する | FREE |
| 2 | hn-insight-card（上位1件のインサイト） | 「記録の意味」を即座に返す（1 Record = 1 Insight） | FREE |
| 3 | 疾患別ヒーローメッセージ | 個別化された文脈の提示 | FREE |
| 4 | hn-status-cards（状態カード4枚） | 今日の値の一覧性 | FREE |
| 5 | 週次記録カレンダー行（buildHomeWeekRow） | 直近の記録継続の可視化 | FREE |
| 6 | hn-experiment-card（実験提案） | 「次に何を試すか」 | PRO（未実装、Phase2） |

有料機能（6番目）を最下部に配置するのは偶然ではない。無料体験の邪魔をしないという [PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md) の原則を、情報の並び順という形でそのまま具現化したものである。

---

## 2. Insights — 情報階層

insights 画面の情報は「まず無料で証拠を見せ、次に有料の深さを示す」という構造になっている。

| 階層 | 要素 | プラン |
|---|---|---|
| 1（無料の証拠） | ins-clinical-summary（観察サマリー） | FREE |
| 2（傾向の入口） | ins-trend-cards 上位1件のプレビュー | FREE（プレビューのみ）/ PRO（全件） |
| 3（深堀り） | ins-question-card / ins-correlation-chart | PRO |
| 4（アウトプット） | ins-medical-report | PRO |

---

## 3. Record — 入力の情報設計

3-card記録フロー（record-three-card.js）は、Card 1で症状（3層チップ、選択式）、Card 2で生活習慣（食事・睡眠・運動・ファスティング）、Card 3で確認・保存という3段階の情報密度を持つ。入力ストレスを最小化するため、必須項目と任意項目を明確に分離する設計であり、詳細な評価は [USER_JOURNEY.md](USER_JOURNEY.md)「Record Experience」節を参照。

---

## 4. Calendar — データ密度の見せ方

カレンダーの基本情報は記録の有無（ドット）と月相のみであり、PRO拡張として痛みピーク日マーク（cal-day-insight-dot）や周期フェーズ帯（cal-phase-banner）が加わる。カレンダーは「振り返りの一覧性」が主目的であるため、PRO要素は色や記号の追加に留め、無料の一覧性を損なわない設計を維持する。

---

## 5. Settings — 機能の網羅性より優先度

Settings 画面は機能を網羅的に並べるのではなく、優先度順に構成する。第一にアカウント・プラン状態（現在地の確認）、第二にデータ管理（エクスポート・削除請求）、第三に通知設定、第四に Consent管理（Research Consent等、`REGULATORY_MEDICAL_COUNCIL.md` 4章準拠）、第五にアプリ設定（テーマ等）という順序である。Consent管理を独立項目として明示することは `REGULATORY_MEDICAL_COUNCIL.md` の決定 R-CR-01（Research Consentの独立設計）と直接関係するため、Settings内での視認性を優先度4に位置づけ、隠さないことを原則とする。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-APPEXP-002 |
| **作成日** | 2026-07-07 |
| **前提文書** | SCREEN_FLOW.md / PAYWALL_STRATEGY.md / REGULATORY_MEDICAL_COUNCIL.md |
| **親文書** | [MONETIZATION_COUNCIL_REPORT.md](MONETIZATION_COUNCIL_REPORT.md) |
| **次回改訂トリガー** | Home/Insights構成要素の追加・削除時 |
