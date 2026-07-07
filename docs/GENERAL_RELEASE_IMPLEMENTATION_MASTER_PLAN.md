# GENERAL RELEASE IMPLEMENTATION MASTER PLAN
## General Release完成までの唯一の実装管理文書

---

> **文書権威レベル: LEVEL-1 GOVERNING DOCUMENT**
>
> 本文書は **General Release完成までの唯一の実装管理文書（Single Source of Truth）** である。
> [IMPLEMENTATION_SEQUENCE.md](IMPLEMENTATION_SEQUENCE.md) / [PHASE2_IMPLEMENTATION_PR_PLAN.md](PHASE2_IMPLEMENTATION_PR_PLAN.md) /
> [PHASE2_GOVERNANCE.md](PHASE2_GOVERNANCE.md) / [FOUNDER_FINAL_DECISIONS.md](FOUNDER_FINAL_DECISIONS.md)
> の内容を統合し、「今どこまで終わったか」「次に何を実装するか」「General Releaseまで何が残っているか」を
> 一目で分かる状態に整理したものである。**新しい設計・新しいFounder Decision・コード変更・実装は
> 一切行っていない。** 既存文書の統合・整理のみである。

---

**文書番号:** IPPO-GENREL-MASTER-001
**作成日:** 2026-07-07
**前提文書:** FOUNDER_FINAL_DECISIONS.md / IMPLEMENTATION_SEQUENCE.md / PHASE2_GOVERNANCE.md / PHASE2_IMPLEMENTATION_PR_PLAN.md / GENERAL_RELEASE_EXPERIENCE_COUNCIL.md / PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md / PHASE2_IMPLEMENTATION_COUNCIL.md / PHASE2_ARCHITECTURE_FREEZE.md / MONETIZATION_COUNCIL_REPORT.md / APP_EXPERIENCE_FRAMEWORK.md

---

## Executive Summary

IPPOはGeneral Release前の設計フェーズ（Business Strategy → Monetization Council → App Experience Council → General Release Experience Council → Phase2 Experience Integration Council → Phase2 Implementation Council → Phase2 Architecture Freeze → Phase2 Governance → Founder Final Decisions）をすべて完了しており、**設計・意思決定は完全に確定した状態にある**。[FOUNDER_FINAL_DECISIONS.md](FOUNDER_FINAL_DECISIONS.md)が下した最終判定は IMPLEMENTATION READY である。

一方、**本文書作成時点で、実装（コード変更）は一件も行われていない。** これまでの全Councilは一貫して「コード変更禁止・設計のみ」という制約のもとで開催されており、PR-EXP-01〜05・PR-P2-01〜06はいずれも設計・計画段階に留まる。したがって、General Release Readiness（実際に動くソフトウェアの品質）は、[GENERAL_RELEASE_EXPERIENCE_COUNCIL.md](GENERAL_RELEASE_EXPERIENCE_COUNCIL.md)が実機検証で算出した **58/100** のままである。

本文書が管理する残工程は、Stage1（General Release絶対修正の実装）→ Stage2（Phase2実装）→ Stage3（実環境統合検証）→ Stage4（最終UX監査）→ Stage5（Release Preparation Council）→ Stage6（General Release）の6段階である。設計上のブロッカーは存在しないため、次に取るべき行動は「実装に着手すること」のみである。

---

## Current Status

### 完了しているもの（設計・意思決定フェーズ）

```
✓ Business Strategy Council / Growth Strategy Council / GTM Council /
  Regulatory & Medical Council（既存、BBS-001〜006・BGS-001〜005・BD-044〜060確定）
✓ UI/UX Final Council（PR-092A〜D、Legacy Removal、実装済み・コミット・push済み）
✓ Monetization Council（North Star / FREE-PRO境界 / Value Ladder / Paywall戦略 / Roadmap確定）
✓ App Experience Council（画面構成・導線・IA・Navigation確定）
✓ General Release Experience Council（実機検証、絶対修正3件発見、Readiness Score 58/100）
✓ Phase2 Experience Integration Council（Phase2構想との整合確認、PR-EXP再判定）
✓ Phase2 Implementation Council（Final Vision逆算設計、UX-A〜F定義）
✓ Phase2 Architecture Freeze Council（7項目中6項目FIX、Tier名称論点発見）
✓ Phase2 Governance（Design System Freeze、禁止事項、UX Change Control確定）
✓ Founder Final Decisions（FD-1・FREEZE-FD-1・IMPL-FD-1・IMPL-FD-2・IMPL-FD-3・GRX-FD-3確定、
  IMPLEMENTATION READY判定）
```

### 未着手のもの（実装フェーズ）

```
✗ PR-EXP-01〜05（設計完了・実装ゼロ）
✗ PR-P2-01〜06（設計完了・実装ゼロ）
✗ Stage3 統合Browser Verification（未実施）
✗ Stage4 Final UX Audit（未実施、PR実装後の再監査として位置づけ）
✗ Stage5 Release Preparation Council（未開催）
✗ Stage6 General Release（未実施）
```

### 進行中のもの

```
（現時点でなし。次のアクションはStage1 PR-EXP群の実装着手である）
```

---

## Stage一覧

```
Stage0: Founder Decision                          [Completed]
   ↓
Stage1: PR-EXP-01〜05（General Release絶対修正）       [Ready]
   ↓
Stage2: PR-P2-01〜06（Phase2実装）                    [Ready]
   ↓
Stage3: General Release Integrated Browser Verification [Waiting]
   ↓
Stage4: GENERAL_RELEASE_FINAL_UX_AUDIT               [Waiting]
   ↓
Stage5: Release Preparation Council                  [Waiting]
   ↓
Stage6: General Release                              [Waiting]
```

---

## Stage詳細

### Stage0: Founder Decision

```
目的:       実装着手前に残っていた全Founder Decisionを確定する
成果物:     FOUNDER_FINAL_DECISIONS.md
開始条件:   Phase2 Architecture Freeze / Governance完了
終了条件:   FD-1・FREEZE-FD-1・IMPL-FD-1・IMPL-FD-2・IMPL-FD-3・GRX-FD-3の確定
依存関係:   なし（起点）
Browser Verification: 対象外（意思決定のみ）
Rollback:   Decision Log改訂（新Council開催）でのみ変更可能
Release Risk: なし
状態:       Completed
```

### Stage1: PR-EXP-01〜05（General Release絶対修正）

```
目的:       実機検証で発見した3件の絶対修正（ナビアイコン欠落・Insightsレイアウト崩れ・
            Premium価格/CTA不在）と2件の推奨修正を実装する
成果物:     PR-EXP-01, 02, 03, 04, 05（コード変更）
開始条件:   Founder Decision確定（Stage0完了）。個々のPRに追加のFounder Decision依存はない
終了条件:   5PRすべてが実装・Browser Verification完了
依存関係:   PR-EXP-02は必ずStage2（Phase2 Insightsタブ追加）より先に完了させること
Browser Verification: 各PR個別の検証項目（PR Master List参照）
Rollback:   PR単位で個別ロールバック可能（各PRのRollback方針参照）
Release Risk: PR-EXP-03が「高」（収益機能の入口）、他は「低〜中」
状態:       Ready（未着手）
```

### Stage2: PR-P2-01〜06（Phase2実装）

```
目的:       Value Ladder③改善・⑤資産化のギャップを埋めるPhase2機能を実装する
成果物:     PR-P2-01〜06（コード変更）
開始条件:   Stage1（PR-EXP-01・02・03）完了。IMPL-FD-1/2/3・FREEZE-FD-1・GRX-FD-3確定済み（Stage0で完了）
終了条件:   6PRすべてが実装・Browser Verification完了、PHASE2_GOVERNANCE.mdの
            全禁止事項・Design System Freezeに抵触しないことを確認
依存関係:   PR-P2-01→PR-P2-02の順（companion-intelligence.js接続共有）、
            PR-P2-05は最後に実施（tier分離）、PR-P2-04とPR-P2-06は同時期推奨
Browser Verification: 各PR個別の検証項目（PR Master List参照）
Rollback:   PR単位で個別ロールバック可能
Release Risk: 全体として「中」（新機能追加のため既存動線への影響を要監視）
状態:       Ready（未着手）
```

### Stage3: General Release Integrated Browser Verification

```
目的:       Stage1・Stage2で実装した全PRを、実際のSupabase接続環境（staging等）で
            統合的に検証する。本Councilセッション中の検証はSupabase未接続環境で
            行われたため、GRX-FD-1・GRX-FD-2として保留していた項目もここで解消する
成果物:     統合検証結果（未作成、Stage3実施時に文書化）
開始条件:   Stage1・Stage2完了
終了条件:   GRX-FD-1（オンボーディング自然遷移）・GRX-FD-2（premiumGate実際の挙動）を含む
            全画面・全導線の実環境検証が完了する
依存関係:   Stage1・Stage2の完了
Browser Verification: 本Stage自体がBrowser Verificationの主体（Browser Verification Master章参照）
Rollback:   検証で重大な不具合が発見された場合、該当PRをStage1/2に差し戻す
Release Risk: 未実施のため評価対象外
状態:       Waiting
```

### Stage4: GENERAL_RELEASE_FINAL_UX_AUDIT

```
目的:       PR実装・統合検証を経た状態で、GENERAL_RELEASE_EXPERIENCE_COUNCIL.mdが
            算出したReadiness Score（58/100）を再評価し、絶対修正3件が実際に
            解消されたことを確認する
成果物:     最終UX監査結果（未作成、Stage4実施時に文書化）
開始条件:   Stage3完了
終了条件:   Readiness Scoreが85点前後（GENERAL_RELEASE_EXPERIENCE_COUNCIL.md想定水準）
            以上に到達し、絶対修正0件であることを確認する
依存関係:   Stage3の完了
Browser Verification: GENERAL_RELEASE_EXPERIENCE_COUNCIL.mdと同一の監査項目
            （Home/Record/Calendar/Insights/Premium/Settings/Navigation/
            Onboarding/Empty State/Error Experience）を再実施
Rollback:   スコアが基準に満たない場合、該当箇所をStage1/2に差し戻す
Release Risk: 未実施のため評価対象外
状態:       Waiting
```

### Stage5: Release Preparation Council

```
目的:       General Release直前の最終ゲートとして、事業・法務・運用面を含めた
            総合的なリリース可否判断を行う
成果物:     Release Preparation Council文書（未作成、Stage5実施時に開催）
開始条件:   Stage4完了（Readiness Score基準達成）
終了条件:   Council判定がGO
依存関係:   Stage4の完了
Browser Verification: 対象外（事業・運用判断が主体）
Rollback:   NO-GO判定の場合、指摘事項に応じてStage1〜4のいずれかに差し戻す
Release Risk: 未実施のため評価対象外
状態:       Waiting
```

### Stage6: General Release

```
目的:       IPPOを一般公開する
成果物:     General Release（本番公開）
開始条件:   Stage5でGO判定
終了条件:   公開完了
依存関係:   Stage5の完了
Browser Verification: 対象外
Rollback:   Rollback Strategy章参照
Release Risk: 未実施のため評価対象外
状態:       Waiting
```

---

## PR Master List

### PR-EXP群（Stage1、General Release絶対修正）

| PR | 目的 | 対象画面 | 対象モジュール | 依存PR | Regression対象 | Browser Verification | 完了条件 | Release Risk |
|---|---|---|---|---|---|---|---|---|
| PR-EXP-01 | ボトムナビ4アイコン描画復旧 | 全画面 | src/app-legacy.js（initNavIcons） | なし | 全画面のタブ切り替え | フレッシュリロード後の4アイコン表示確認 | 4アイコンが常時表示される | 低 |
| PR-EXP-02 | Insightsヒーローのモバイルレイアウト修正 | Insights | src/screens/insights.html | なし（PR-P2-02/03より先に完了必須） | 他Insights要素のレイアウト | 375/320/768px幅での表示確認 | 全モバイル幅でヒーロー正常表示 | 低〜中 |
| PR-EXP-03 | Premium価格・比較表・CTA復旧 | Premium | app.html（#pro-hero）、premium関連JS | FD-1確定（済） | premiumGate()呼び出し全般 | CTAクリック→Checkout遷移確認 | 価格・CTAが表示され購入導線が機能する | **高** |
| PR-EXP-04 | Home週間行の日付・記録表示復旧 | Home | src/modules/home-renderer.js | なし | Home他要素（CTA状態等） | 記録0件/保存直後の週間行表示確認 | 週間行に日付・記録有無が表示される | 低 |
| PR-EXP-05 | ナビラベル・Premium下部余白調整 | Navigation, Premium | CSS（.nav-item、.pf-grid） | なし | 他ナビラベル表示 | ラベル1行表示・カード全体視認確認 | 折り返り・occlusionが解消 | 低 |

### PR-P2群（Stage2、Phase2実装）

| PR | 目的 | 対象画面 | 対象モジュール | 依存PR | Regression対象 | Browser Verification | 完了条件 | Release Risk |
|---|---|---|---|---|---|---|---|---|
| PR-P2-01 | hn-experiment-card実装 | Home | home-renderer.js, companion-intelligence.js | IMPL-FD-1確定（済） | Home他要素 | 記録0件時非表示・週1回制限確認 | UX-A完成条件達成 | 中 |
| PR-P2-02 | ins-question-card実装 | Insights | insights.html, companion-intelligence.js | IMPL-FD-1確定（済）、PR-EXP-02完了、PR-P2-01直後推奨 | ins-clinical-summary等 | 回答保存・2週間非再表示確認 | UX-B完成条件達成 | 中 |
| PR-P2-03 | trend-cards/correlation-chart/medical-reportタブ統合 | Insights | insights.html | PR-EXP-02完了 | modules/pro/配下レポート機能 | 各タブ遷移・30日未満時の非表示確認 | UX-B完成条件達成 | 低 |
| PR-P2-04 | Research Contribution Badge | Home, Premium | home-renderer.js等（新規） | IMPL-FD-3確定（済） | Consent関連バックエンド | Consent未同意者への非表示確認 | UX-E完成条件達成 | 低 |
| PR-P2-05 | tier分離（isPremium→getTierLevel）+比較表UI | Premium | premium-service.js | FREEZE-FD-1・IMPL-FD-2確定（済）、PR-P2-01〜04完了後に実施 | PR-EXP-03の価格/CTA表示 | 新tier名称での比較表・価格確認 | UX-C完成条件達成 | 中 |
| PR-P2-06 | Research Consent UI（新規） | Settings | Settings画面（新規）、PR-076連携 | GRX-FD-3確定（済） | Consent関連バックエンド | 同意/撤回の反映確認 | UX-E完成条件達成 | 低 |

---

## UX Master Group

機能単位ではなくユーザー体験単位で整理する（[PHASE2_ARCHITECTURE_FREEZE.md](PHASE2_ARCHITECTURE_FREEZE.md)第11章の再掲・統合）。

### UX-A: Home体験

```
関連PR:     PR-EXP-04, PR-P2-01
関連画面:   Home
完成条件:   要素数6以内、スクロールがほぼ発生しない、hn-experiment-cardが週1回制限を守る、
            週間行に日付・記録有無が表示される
Browser Verification: 記録0件/記録済み双方のCTA状態、週間行表示、実験カード表示条件
Regression対象: 状態カード・ヒーローメッセージ表示
```

### UX-B: Insights体験

```
関連PR:     PR-EXP-02, PR-P2-02, PR-P2-03
関連画面:   Insights
完成条件:   ヒーローが全モバイル幅で正常表示、同時表示要素4以下、
            タブ切り替え（傾向/問いかけ/相関/レポート）が機能する
Browser Verification: 375/320/768px幅表示、タブ切り替え動作、ロックUIプレビュー表示
Regression対象: ins-clinical-summary、PROロックカードの挙動
```

### UX-C: Premium体験

```
関連PR:     PR-EXP-03, PR-EXP-05, PR-P2-05
関連画面:   Premium
完成条件:   価格・CTAが表示され購入導線が機能する、tier名称がFREEZE-FD-1決定通り
            （Premium/Pro）に統一される、比較項目最大6件
Browser Verification: CTAクリック→Checkout遷移、比較表の新tier名称表示
Regression対象: 各PROカードのpremiumGate()呼び出し
```

### UX-D: Experiment体験

```
関連PR:     PR-P2-01（入口）
関連画面:   Home（入口）、Experiments overlay（既存）
完成条件:   hn-experiment-cardタップから既存startExperiment()フローへ自然に接続される
Browser Verification: 提案カードタップ→実験開始画面遷移、完了後レポート表示
Regression対象: Premium画面「ヘルス実験」カードからの単独起動
```

### UX-E: Research体験

```
関連PR:     PR-P2-04, PR-P2-06
関連画面:   Home、Premium、Settings
完成条件:   Research Consent同意済み・記録365日以上のユーザーにのみBadgeが恒久表示される、
            Settings画面でConsent同意/撤回が可能
Browser Verification: Consent未同意者への非表示確認、同意/撤回のバックエンド反映確認
Regression対象: PR-076 Consent Gate関連バックエンド処理
```

### UX-F: AI体験

```
関連PR:     PR-P2-01, PR-P2-02
関連画面:   Home、Insights
完成条件:   断定表現が一切含まれない、tier別ゲートが正しく機能する、
            companion-intelligence.js/recommendation-engine.jsの接続が完了している
Browser Verification: 生成文言のサンプルレビュー（禁止表現/許容表現の基準準拠確認）
Regression対象: home-insight-engine.js出力形式（DerivedInsight）との整合
```

---

## Browser Verification Master

General Release直前（Stage3・Stage4）に実施する実機検証項目の一覧。

### 画面別

```
□ Home: CTA状態遷移、週間行の日付・記録表示、hn-experiment-card表示条件
□ Record: 3カード入力フロー、保存完了、エラー時・オフライン時の挙動（未検証項目）
□ Calendar: 月表示・月相・凡例、編集導線の詳細確認（前回セッション未深掘り）
□ Insights: ヒーロー表示（全モバイル幅）、タブ切り替え、ロックUIプレビュー
□ Premium: 価格・CTA表示、Checkout遷移、比較表新tier名称表示
□ Settings: Research Consent UI、既存項目の網羅性維持確認
□ Navigation: 4アイコン表示、ラベル1行表示、戻る導線
```

### UX別

```
□ UX-A Home体験の完成条件（上記UX Master Group参照）
□ UX-B Insights体験の完成条件
□ UX-C Premium体験の完成条件
□ UX-D Experiment体験の完成条件
□ UX-E Research体験の完成条件
□ UX-F AI体験の完成条件
```

### 導線別

```
□ Onboarding: 「はじめる」ボタンからの自然な遷移（GRX-FD-1、実環境必須）
□ Paywall: PAYWALL_STRATEGY.md絶対禁止5場面（Record画面・保存直後・Error・
  Empty State・Consent画面）にPaywallが出現しないことの再確認
□ premiumGate()クリック時の実際の挙動（GRX-FD-2、実環境必須）
□ Experiment導線: hn-experiment-card→既存experiments.jsフローへの接続
```

---

## Regression Matrix

| 変更PR | 影響を受ける既存機能 | 確認方法 |
|---|---|---|
| PR-EXP-01 | 全画面のタブ切り替え・アクティブ状態表示 | 手動でのタブ切り替え確認 |
| PR-EXP-02 | Insights画面の他カード（PROロックカード等） | 修正後のレイアウト目視確認 |
| PR-EXP-03 | 各PROカードのpremiumGate()呼び出し | 各カードタップ時の挙動確認 |
| PR-EXP-04 | Home CTA状態管理 | 記録前後でのCTA表示確認 |
| PR-EXP-05 | 他ナビラベルの表示 | 全ラベルの折り返り確認 |
| PR-P2-01 | Home他要素の表示順序・スクロール量 | Home全体のスクロール量測定 |
| PR-P2-02 | ins-clinical-summary等の既存タブ内容 | 各タブの独立動作確認 |
| PR-P2-03 | modules/pro/配下レポート機能単体 | 各レポート機能の単独動作確認 |
| PR-P2-04 | PR-076 Consent Gateバックエンド | Consent状態のDB確認 |
| PR-P2-05 | PR-EXP-03で復旧した価格・CTA表示 | tier分離後の価格表示整合確認 |
| PR-P2-06 | Consent関連バックエンド全般 | 同意/撤回操作後のDB確認 |

---

## Founder Decision Matrix

| Decision | 影響PR | 影響Stage | 影響UX |
|---|---|---|---|
| FD-1（価格） | PR-EXP-03 | Stage1 | UX-C |
| FREEZE-FD-1（Tier Branding） | PR-EXP-03, PR-P2-05 | Stage1, Stage2 | UX-C |
| IMPL-FD-1（既存AI資産再利用） | PR-P2-01, PR-P2-02 | Stage2 | UX-A, UX-B, UX-F |
| IMPL-FD-2（tier分離順序） | PR-P2-05 | Stage2 | UX-C |
| IMPL-FD-3（Research Badge仕様） | PR-P2-04 | Stage2 | UX-E |
| GRX-FD-3（Consent UI導入時期） | PR-P2-06 | Stage2 | UX-E |
| GRX-FD-1（未実施・検証アクション） | 全PR | Stage3 | 全UX |
| GRX-FD-2（未実施・検証アクション） | PR-EXP-03, PR-P2-05 | Stage3 | UX-C |
| IMPL-FD-4（Phase3監視主体、未決定・緊急性なし） | — | Phase3スコープ外 | — |

---

## Exit Criteria

```
Stage1 Exit → Stage2 Entry:
  PR-EXP-01・02・04・05が実装・検証完了。PR-EXP-03が実装・検証完了
  （最低限、絶対修正3件すべての解消を確認すること）

Stage2 Exit → Stage3 Entry:
  PR-P2-01〜06が実装・検証完了。PHASE2_GOVERNANCE.mdの禁止事項・
  Design System Freezeへの抵触がないことを確認

Stage3 Exit → Stage4 Entry:
  GRX-FD-1・GRX-FD-2を含む実環境統合検証が完了し、重大な不具合が
  発見されていないこと

Stage4 Exit → Stage5 Entry:
  Readiness Scoreが85点前後以上に到達し、絶対修正0件であることを確認

Stage5 Exit → Stage6 Entry:
  Release Preparation CouncilがGO判定を下すこと
```

---

## Release Readiness Checklist

```
□ PR-EXP-01〜05実装・検証完了
□ PR-P2-01〜06実装・検証完了
□ GRX-FD-1（オンボーディング自然遷移）実環境検証完了
□ GRX-FD-2（premiumGate実際の挙動）実環境検証完了
□ Readiness Score 85点前後以上
□ PHASE2_GOVERNANCE.md全項目への抵触なし
□ Value Ladder（記録→理解→改善→習慣化→資産化）の連鎖が実機で確認できる
□ 医療免責文言・AI安全基準（BD-044/045/048/050）の遵守確認
□ Research Consent UIが機能し、Consent Gateと正しく連動している
□ Tier Branding（FREE/Premium/Pro）が全画面で一貫して表示されている
□ Release Preparation CouncilでGO判定
```

---

## Governance Checklist

[PHASE2_GOVERNANCE.md](PHASE2_GOVERNANCE.md)の各項目が守られているかの最終確認。

| 項目 | 確認内容 | 参照 |
|---|---|---|
| Design Freeze | 色・角丸・余白・タイポグラフィが既存トークンの範囲内 | PHASE2_GOVERNANCE.md 1章 |
| Navigation Freeze | 5タブ・新規画面ゼロが維持されている | PHASE2_GOVERNANCE.md 3章、NAVIGATION_DESIGN.md |
| IA Freeze | Home最大6ブロック・Insights同時表示4要素以内 | PHASE2_GOVERNANCE.md 2章 |
| Value Ladder | 記録→理解→改善→習慣化→資産化の「飛び級」がない | PHASE2_GOVERNANCE.md 6章 |
| Medical Safety | AI出力に免責文言・断定表現の排除・医師レビュー実施 | REGULATORY_MEDICAL_COUNCIL.md BD-044/045/048 |
| Monetization | Paywall絶対禁止5場面に出現しない | PAYWALL_STRATEGY.md、PHASE2_GOVERNANCE.md 3章 |
| Tier Branding | FREE/Premium/Proの表示が全画面で一貫 | FOUNDER_FINAL_DECISIONS.md FREEZE-FD-1 |
| Research | Consent同意済みユーザーのみBadge表示、件数非開示 | FOUNDER_FINAL_DECISIONS.md IMPL-FD-3 |
| AI Safety | 「観測」「問い」の形式のみ、断定・診断的表現の排除 | PHASE2_IMPLEMENTATION_COUNCIL.md第11章 |
| Paywall | ダークパターン（カウントダウン等）が存在しない | PAYWALL_STRATEGY.md第5章 |

---

## Rollback Strategy

### PR単位のRollback

各PRは個別にロールバック可能な設計とすることを完了条件に含める（PR Master List各行のRelease Risk参照）。特にPR-EXP-03（Premium価格/CTA）とPR-P2-05（tier分離）は収益機能に直結するため、ロールバック手順を実装時に明文化しておくこと。

### Stage単位のRollback

```
Stage1で重大な不具合が発見された場合:
  → 該当PRのみロールバックし、他のPR-EXP群は維持する

Stage2で重大な不具合が発見された場合:
  → 該当PRのみロールバックし、Stage1で確立した基盤（PR-EXP群）には影響させない

Stage3（統合検証）で重大な不具合が発見された場合:
  → 不具合の原因がStage1由来かStage2由来かを切り分け、該当Stageに差し戻す

Stage4（最終UX監査）でReadiness Scoreが基準未達の場合:
  → 未達項目に対応するPRをStage1/2に差し戻し、再実装後にStage4を再実施する

Stage5（Release Preparation Council）でNO-GO判定の場合:
  → 指摘事項に応じてStage1〜4のいずれかに差し戻す
```

---

## Progress Dashboard

```
General Release完成までの進捗: 約30%

内訳:
  設計・意思決定フェーズ（Stage0）:        100% 完了
  実装フェーズ（Stage1・Stage2）:          0% 完了（11 PRすべて未着手）
  検証フェーズ（Stage3・Stage4）:          0% 完了（未着手）
  リリース判定フェーズ（Stage5・Stage6）:   0% 完了（未着手）

Stage進捗:  1/6 Stage完了（Stage0のみ）
PR進捗:     0/11 PR完了（PR-EXP-01〜05、PR-P2-01〜06すべて未着手）
UX進捗:     0/6 UXグループ完成（UX-A〜Fいずれも実装待ち）
Verification進捗: 0%（Stage3・Stage4とも未実施）
```

---

## Final Gate

| Stage | 判定 |
|---|---|
| Stage0（Founder Decision） | **PASS** |
| Stage1（PR-EXP-01〜05） | **未実施**（判定保留、実装後に評価） |
| Stage2（PR-P2-01〜06） | **未実施**（判定保留、実装後に評価） |
| Stage3（統合Browser Verification） | **未実施**（判定保留） |
| Stage4（Final UX Audit） | **未実施**（判定保留） |
| Stage5（Release Preparation Council） | **未実施**（判定保留） |
| **General Release** | **FAIL**（Stage1〜5が未完了のため現時点では不可） |

---

## Single Source of Truth 宣言

**本書を、General Release完成までの唯一の実装管理文書（Single Source of Truth）と宣言する。**

[IMPLEMENTATION_SEQUENCE.md](IMPLEMENTATION_SEQUENCE.md) / [PHASE2_IMPLEMENTATION_PR_PLAN.md](PHASE2_IMPLEMENTATION_PR_PLAN.md) / [PHASE2_GOVERNANCE.md](PHASE2_GOVERNANCE.md) / [FOUNDER_FINAL_DECISIONS.md](FOUNDER_FINAL_DECISIONS.md) 等は、今後は**実装時の参照資料**として扱う。**進捗管理・実装順序・Stage判定は、すべて本書を基準とする。** 各文書の内容と本書に齟齬が生じた場合は、本書の記載を優先する。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-GENREL-MASTER-001 |
| **作成日** | 2026-07-07 |
| **権威レベル** | LEVEL-1 GOVERNING DOCUMENT（Single Source of Truth） |
| **前提文書** | FOUNDER_FINAL_DECISIONS.md / IMPLEMENTATION_SEQUENCE.md / PHASE2_GOVERNANCE.md / PHASE2_IMPLEMENTATION_PR_PLAN.md / 他6文書（冒頭記載） |
| **コード変更** | ゼロ（既存文書の統合・整理のみ） |
| **次回改訂トリガー** | 各Stage完了時（進捗更新） |

---

# IMPLEMENTATION STATUS

```
Stage0: Completed
Stage1: Ready
Stage2: Ready
Stage3: Waiting
Stage4: Waiting
Stage5: Waiting
Stage6: Waiting
```

---

# IMPLEMENTATION READY

```
YES
```

---

# General Release Readiness

```
58 / 100（現時点評価。PR-EXP-01〜03完了後は85点前後まで回復見込み、
          GENERAL_RELEASE_EXPERIENCE_COUNCIL.md算出値をそのまま継承）
```

---

# Single Source of Truth

```
YES
```
