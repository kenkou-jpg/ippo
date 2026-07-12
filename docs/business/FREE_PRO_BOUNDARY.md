# FREE / PRO BOUNDARY
## IPPO Monetization Council — 無料・有料境界定義

---

> **この文書の役割**: 機能単位での無料/有料境界を定義する唯一の正典。
> プラン価格・全体構成は [MONETIZATION_FRAMEWORK.md](MONETIZATION_FRAMEWORK.md)、
> 境界が生む価値の連なりは [VALUE_LADDER.md](VALUE_LADDER.md)、
> 境界をどの画面でどう見せるかは [PAYWALL_STRATEGY.md](PAYWALL_STRATEGY.md) が担う。
> 本文書は「何が無料で何が有料か」だけを扱い、それ以外の論点は上記文書へ譲る。

---

## 1. 境界設計の考え方

IPPO における無料と有料の境界は、量の制限ではなく体験の質で引かれている。これは Founder が繰り返し強調してきた原則であり、`BUSINESS_STRATEGY.md` 5-A は「無料にするものは記録する行動そのもの、有料にするものは記録から意味を取り出す体験」と定めている。`PRO_INSIGHT_ARCHITECTURE.md` の Tier-pure 原則（`isPremium()` の1箇所のみで判定する）もこの思想を裏付ける実装上の制約として機能している。

Council が特に注意したのは、「制限解除ではなく新しい価値を有料化する」という Founder の指示である。たとえば「無料は直近 7 日分しか見られないが有料は全期間見られる」というような**同じ機能の量的な出し惜しみ**は、この指示に反すると Council は判断した。そのため以下の境界表では、有料化された各機能について「Free には存在しない、質的に新しい体験は何か」を必ず言語化している。

---

## 2. FREE — 「記録して、今の自分を見る」

| 機能 | 内容 | 実装状況 |
|---|---|---|
| Record 記録 | 全項目・無制限・全期間保存 | ✅ 実装済み |
| 今日のインサイト | 直近7日の最頻パターン1件 | ✅ 実装済み（home-next-insights.js） |
| 観察サマリー | 過去30日の観察結果テキスト | ✅ 実装済み（insights-clinical-summary.js） |
| 疾患別ヒーローメッセージ | 周期フェーズ×痛み×睡眠のメッセージ | ✅ 実装済み |
| 記録カレンダー | 記録の有無＋月相 | ✅ 実装済み |
| 状態カード4枚 | 疾患別優先カード（今日の値） | ✅ 実装済み |
| データエクスポート（自分の分） | CSV / JSON | ✅ 実装済み（自己情報開示請求対応、`REGULATORY_MEDICAL_COUNCIL.md` R-JP-03 準拠） |

Free の設計意図は「記録の障壁ゼロ」を徹底することにある。記録そのものを制限すると Research Dataset のデータ密度が下がってしまうため（`BUSINESS_STRATEGY.md` 3-C が戒める「フリーミアム乱用」の逆側のリスク）、Free でも記録・閲覧は完全に機能する状態を維持する。

---

## 3. STARTER（既存表示名: Premium）— 「自分のパターンを理解する」

以下はいずれも Free の単なるロック解除ではなく、Free には存在しない新しい体験として設計・実装されている。

| 機能 | 新しい価値 | 実装状況 |
|---|---|---|
| 傾向インサイト全件（上位5件） | Free は1件のみ。STARTER は「なぜ」を含む複数パターンを横断的に提示 | ✅ 実装済み（PRO_INSIGHT_ARCHITECTURE.md tier='pro'） |
| Longitudinal Analysis（全期間） | 「先月と比較して」という時間軸の比較体験そのものが新規 | ✅ 実装済み |
| Disease Signal 比較（同疾患グループ） | 「自分だけ」から「同じ疾患の人たちの中の自分」への視点転換 | ✅ 実装済み（Disease Cluster） |
| 医師向けレポート生成（PDF） | 「先生に見せられる」という新しい用途の創出 | ✅ 実装済み（modules/pro/doctor-summary/） |
| 病態サマリー | 疾患ごとの長期観察の物語化 | ✅ 実装済み（modules/pro/condition-summary/） |
| 相関レポート（睡眠×痛み等） | 「関係性の発見」という新しい認知体験 | ✅ 実装済み（modules/pro/correlation-report.js） |
| 周期・体温・フレアレポート | 周期越しの構造把握 | ✅ 実装済み（cycle-report.js / temp-report.js / flareup-report.js） |
| 月次レポート | 「1ヶ月分の物語」としての振り返り | ✅ 実装済み（monthly-report.js） |

---

## 4. PRO — 「自分を研究する人のためのプラン」

`BUSINESS_STRATEGY.md` 4-B Pro Plan 節の定義に基づく。現状コードには STARTER と PRO の tier 分離が存在しない（[MONETIZATION_FRAMEWORK.md](MONETIZATION_FRAMEWORK.md) 第4章参照）ため、以下は設計上の目標機能であり実装は未着手である。

| 機能 | 新しい価値 | 実装状況 |
|---|---|---|
| 問いかけ層（Question Layer） | 「なぜそうなったと思いますか？」という対話的な自己探求 | 設計済み・未実装（PRO_INSIGHT_ARCHITECTURE.md Section 5） |
| 実験提案（週1件） | 「試すこと」への具体的な行動提案 | 設計済み・未実装（Section 6） |
| 相関グラフ（散布・折れ線） | 数値ではなく「形」で見る理解 | 設計済み・未実装 |
| 傾向アラート | 悪化トレンドの早期・静かな気づき | 設計済み・未実装 |
| Disease Cluster 位置確認（上位%） | 「自分は集団の中でどこにいるか」という比較の深化 | 一部実装（symptom-trends.js） |
| Cohort 比較（同疾患×同治療歴） | より狭いセグメントとの比較 | ❌ 未実装（Wave3 予定） |
| カスタム Signal 設定 | 「自分だけの記録項目」を追加できる拡張性 | ❌ 未実装 |
| Research Contribution Badge | 「自分のデータが研究に貢献している」可視化 | ❌ 未実装（GROWTH_STRATEGY.md 6-B と連動） |

このうち Question Layer と Experiment Suggestion の未実装は、単なる機能不足ではなく Value Ladder 全体の断絶を生んでいる。詳細な影響分析は [VALUE_LADDER.md](VALUE_LADDER.md) 第2章に譲る。

---

## 5. Gate 実装アーキテクチャ（既存 / 変更提案なし）

```js
// PRO_INSIGHT_ARCHITECTURE.md 記載の既存設計（引用）
function renderInsightCard(insight) {
  if (insight.tier === 'pro' && !isPremium()) {
    return renderProGate(insight); // ロックUI
  }
  return renderInsightFull(insight);
}
```

`insight.tier` は現状 `'free' | 'pro'` の二値である。STARTER/PRO の3層を区別するには、将来 `isPremium()` を `getTierLevel(): 'free' | 'starter' | 'pro'` に拡張する必要がある。これはコード変更（Business Logic 変更に該当）であり、本 Council のスコープ外である。実施時期は Founder Decision FD-2 として [MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) 第9章に記録済みのため、本文書では繰り返さない。

---

## 6. Research License / Clinic API との関係

Research License（大学・研究機関向け）と Clinic API（医療機関向け）は個人向け FREE/STARTER/PRO とは独立した契約であり、本境界表の対象外（`BUSINESS_STRATEGY.md` 4-C・4-D 参照）。PRO ユーザーの Research Contribution Badge（4節）は個人の Research Consent 状態と連動する設計になる点のみ、Consent 層（`REGULATORY_MEDICAL_COUNCIL.md` 4章）との整合を将来確認すること。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-MONETIZATION-002 |
| **作成日** | 2026-07-07 |
| **前提文書** | MONETIZATION_FRAMEWORK.md / PRO_INSIGHT_ARCHITECTURE.md / FEATURE_INVENTORY.md |
| **親文書** | [MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) |
| **実装ギャップ** | STARTER/PRO の tier 分離が未実装（第3・4章参照、FD-2として親文書に記録） |
| **次回改訂トリガー** | PRO 層の tier 分離実装時 |
