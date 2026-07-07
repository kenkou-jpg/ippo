# MONETIZATION FRAMEWORK
## IPPO Monetization Council — 収益構造フレームワーク

---

> **この文書の役割**: North Star Value とプラン構成（FREE/STARTER/PRO）の全体像、および収益の柱を定義する。
> 機能単位の無料/有料境界の詳細は [FREE_PRO_BOUNDARY.md](FREE_PRO_BOUNDARY.md)、
> 価値の段階の監査は [VALUE_LADDER.md](VALUE_LADDER.md)、
> Paywall の配置原則は [PAYWALL_STRATEGY.md](PAYWALL_STRATEGY.md)、
> 将来の機能配置とフェーズ計画は [MONETIZATION_ROADMAP.md](MONETIZATION_ROADMAP.md) を参照。
> 本文書は `IPPO-BUSINESS-001`（BBS-001）が定めた価格を**変更せず**、実装可能な形に構造化したものである。
> Founder が決定すべき事項は本文書では提起のみに留め、正式な一覧は
> [MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) 第9章「Important Founder Decisions」を正とする。

---

**文書番号:** IPPO-MONETIZATION-001
**開催体:** Monetization Council（Founder × Product Strategist × SaaS Founder × PLG Specialist × Growth Lead × UX Lead × Behavioral Designer × Pricing Strategist × Data Product Architect × Customer Representative）
**開催日:** 2026-07-07
**前提文書:** IPPO-BUSINESS-001（BBS-001〜006）/ IPPO-GROWTH-001（BGS-001〜005）/ IPPO-GTM-001（BD-053〜060）/ IPPO-REGULATORY-001（BD-044〜052）/ PRO_INSIGHT_ARCHITECTURE.md / FEATURE_INVENTORY.md

---

## 1. 価格実装との不整合（Council が発見した事実）

本文書の設計に入る前に、Council が実コード監査で発見した事実を記録する。判断そのものは [MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) 第9章 FD-1・FD-2 に委ねる。

```
BBS-001（IPPO-BUSINESS-001、Founder承認済み、2026-06-27）が定める価格:
  Premium: 月額 980円 / 年額 7,800円
  Pro:     月額 1,980円 / 年額 15,800円
  （Free / Premium / Pro の 3 階層）

実装済みコード（src/services/stripe.js 実測確認）:
  月額プラン: ¥580/月
  年額プラン: ¥4,800/年
  （Free / 単一 Paid 階層のみ）

src/modules/premium/premium-service.js の実装:
  isPremium(): boolean 単一フラグ（subscriptions.status === 'active'）
  → Tier という概念が存在しない。
```

この不整合は本文書の前提を左右するため、Founder の意思決定（FD-1）が下るまで、本文書のプラン設計は「BBS-001 の価格を正とする仮定」で記述する。

---

## 2. North Star Value

IPPO の有料価値を一文で表すなら、それは「記録するだけでは終わらない。自分のパターンが見え、次に何を試せばいいかが分かり、医師にも伝わる形になる」という体験である。ユーザーは記録という行為そのものに対価を支払うのではなく、記録の先にある理解と、その理解に基づく伴走に対価を支払う。

この定義は `BUSINESS_STRATEGY.md` 5-A の「無料にするもの（記録する）／有料にするもの（理解する）」、`PRO_INSIGHT_ARCHITECTURE.md` の FREE=「点・今・表面」/ PRO=「傾向・流れ・文脈・深層」という既存設計と完全に整合しており、本 Council はこれを新たに発明するのではなく、既存の思想を公式な North Star として追認する。

---

## 3. 収益構造の三層（BBS-001 準拠）

| 層 | 提供物 | 課金対象 | Founder 負荷 |
|---|---|---|---|
| B2C Subscription | 個人の理解・伴走 | Free / Premium / Pro | 低（自動課金） |
| Research License | 縦断データの学術・商業価値 | 大学 / 製薬企業 / 政府 | 中（年数件） |
| Clinic API（Wave4〜） | 診療への記録活用 | 婦人科クリニック | 中〜低 |

本文書は B2C Subscription 層を扱う。Research License / Clinic API の価格・契約条件は `BUSINESS_STRATEGY.md` 4-C・4-D、`REGULATORY_MEDICAL_COUNCIL.md` 3-D がすでに定義済みであり、本文書では変更しない。

---

## 4. プラン設計（FREE / STARTER / PRO）

BBS-001 の「Premium」を、本文書では Monetization Council の要求様式に合わせ **STARTER** という呼称で整理する。これは呼称の整理であり、ユーザー向け表示名の変更ではない（表示名の扱いは [MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) 第4章「却下された案」および FD-3 を参照）。

| プラン | 呼称対応 | 月額 | 年額 | 位置づけ |
|---|---|---|---|---|
| FREE | Free | ¥0 | — | 「記録する」 |
| STARTER | Premium（既存表示名） | ¥980 | ¥7,800 | 「理解する」 |
| PRO | Pro | ¥1,980 | ¥15,800 | 「深く研究する」 |

価格自体は BBS-001 で確定済みであり本 Council では変更しない。各プランの機能境界の詳細は [FREE_PRO_BOUNDARY.md](FREE_PRO_BOUNDARY.md) を参照。

現在コードが提供しているのは「FREE」と「STARTER 相当（ただし ¥580/¥4,800 という異なる価格で実装済みの単一有料層）」の 2 層のみである。「PRO」層（相関グラフ・受診レポート・Cohort比較等、`PRO_INSIGHT_ARCHITECTURE.md` が既に設計済みの機能群）は設計はあるが tier 分離が未実装であり、この扱いは Council の採択事項として [MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) 第3章に記録済みである。

---

## 5. 収益源（サブスク以外）

`BUSINESS_STRATEGY.md` 3-B・6・7 章がすでに定義済みの 4 本柱（B2C Premium Subscription / Research Dataset License / B2B Clinic API / Disease Intelligence API）を、本 Council は変更せず継承する。将来の機能配置と時系列は [MONETIZATION_ROADMAP.md](MONETIZATION_ROADMAP.md) が担う。テンプレート・教育コンテンツ販売など新規収益源の検討状況は [MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) 第4章「却下された案」に記録した通り、採択・却下いずれでもない保留事項として扱う。

---

## 6. General Release 時点で実装する課金範囲

実装済みの Stripe Checkout・Webhook・subscriptions テーブル・isPremium() ゲート・`modules/pro/` 配下の各種レポートは、そのまま General Release の基盤として使用できる。FREE と STARTER の 2 層構成で General Release は十分に成立し、PRO 層（3 層目）は必須ではない。3 層を同時に立ち上げると Paywall の説明コストが増え、「Premium と Pro の違いが分からない」という離脱を招くリスクがあるためである（Behavioral Designer 所見、[MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) 第3章）。

本節に由来する Founder 判断事項は FD-1・FD-2・FD-3 である。詳細と最終的な一覧は [MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) 第9章を参照し、本文書では重複記載しない。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-MONETIZATION-001 |
| **作成日** | 2026-07-07 |
| **権威レベル** | LEVEL-1 STRATEGIC DOCUMENT（BBS-001 の価格を継承、変更なし） |
| **前提文書** | IPPO-BUSINESS-001 / IPPO-GROWTH-001 / IPPO-GTM-001 / IPPO-REGULATORY-001 |
| **親文書** | [MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) |
| **Founder Decision** | FD-1・FD-2・FD-3（詳細は親文書第9章） |
| **次回改訂トリガー** | Founder が FD-1〜FD-3 を決定した時 / PRO層実装着手時 |
