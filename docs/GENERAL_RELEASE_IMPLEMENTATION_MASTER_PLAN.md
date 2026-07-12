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
**作成日:** 2026-07-07（2026-07-07 改訂: Repository Execution Audit / Founder Execution Decision / 体質改善実験プラットフォーム UI/UX Council 反映）
**前提文書:** FOUNDER_FINAL_DECISIONS.md / IMPLEMENTATION_SEQUENCE.md / PHASE2_GOVERNANCE.md / PHASE2_IMPLEMENTATION_PR_PLAN.md / GENERAL_RELEASE_EXPERIENCE_COUNCIL.md / PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md / PHASE2_IMPLEMENTATION_COUNCIL.md / PHASE2_ARCHITECTURE_FREEZE.md / MONETIZATION_COUNCIL_REPORT.md / APP_EXPERIENCE_FRAMEWORK.md / [FOUNDER_EXECUTION_DECISION.md](FOUNDER_EXECUTION_DECISION.md)

> **改訂に伴う権威関係**: [FOUNDER_EXECUTION_DECISION.md](FOUNDER_EXECUTION_DECISION.md)は「General ReleaseまでのFounderによる唯一の実装判断文書」と位置づけられており、本書と当該文書の2文書のみを基準に以後の実装を進める。本改訂は、同文書が確定した結論（Repository Execution Auditの条件付き採用、PR-EXP-03のスコープ拡張、PR-EXP-06の新設）と、体質改善実験プラットフォーム UI/UX Councilの結論（最終判定C: General Release前にレイアウト修正が必要）を本書に統合するものである。

---

## Executive Summary

IPPOはGeneral Release前の設計フェーズ（Business Strategy → Monetization Council → App Experience Council → General Release Experience Council → Phase2 Experience Integration Council → Phase2 Implementation Council → Phase2 Architecture Freeze → Phase2 Governance → Founder Final Decisions）をすべて完了しており、**設計・意思決定は完全に確定した状態にある**。[FOUNDER_FINAL_DECISIONS.md](FOUNDER_FINAL_DECISIONS.md)が下した最終判定は IMPLEMENTATION READY である。

その後、Repository Execution Audit（静的コード追跡による設計と実装のズレの検証）が実施され、[FOUNDER_EXECUTION_DECISION.md](FOUNDER_EXECUTION_DECISION.md)としてFounderが正式に採用した。**PR-EXP-01〜06はすべて実際にコード上で修正済み・Founder Browser Verification済みであることを確認済みであり、Stage1は完了した。** General Release Readiness（実際に動くソフトウェアの品質）は、[GENERAL_RELEASE_EXPERIENCE_COUNCIL.md](GENERAL_RELEASE_EXPERIENCE_COUNCIL.md)が実機検証で算出した **58/100** のままだが、PR-EXP-03・06完了により85点前後まで回復する見込みは維持される（正式なReadiness Score再算出はStage4で実施）。

さらに、体質改善実験プラットフォーム UI/UX Council（Product Experience Review Councilの「よくある健康記録アプリのβ版にしか見えない」という指摘への対応設計）の結論を反映し、PR-EXP-03のスコープをPremium/Pro価値グルーピング（Premium=理解／Pro=改善の物語化）まで拡張し、新規PR-EXP-06（Experiment Platform Framing）をStage1に追加した。Phase2側では、AI Suggestion本接続・Home Experiment cardのAI駆動化・Premium比較表正式実装・Consent UIの4項目を実装スコープとして明記した。

本文書が管理する残工程は、Stage1（General Release絶対修正の実装、PR-EXP-01〜06）→ Stage2（Phase2実装、PR-P2-01〜06）→ Stage3（実環境統合検証）→ Stage4（最終UX監査）→ Stage5（Release Preparation Council）→ Stage6（General Release）の6段階である。Stage1はPR-EXP-01〜06全件の実装・Founder Browser Verification完了により終了した。設計上のブロッカーは存在しないため、次に取るべき行動はStage2（PR-P2-01〜06）着手の要否・優先順位をFounderが判断することである。

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
✓ Repository Execution Audit（Execution Gap Audit、静的コード追跡による設計/実装ズレの検証）
✓ Founder Execution Decision Council（監査を条件付き採用、READY WITH FIXES判定、
  PR-EXP-03スコープ拡張・PR-EXP-06新設を決定）
✓ 体質改善実験プラットフォーム UI/UX Council（Home/Insights/Premium/Record/Navigationの
  レイアウト・文言変更案を確定、最終判定C: General Release前にレイアウト修正が必要）
✓ PR-EXP-01（ボトムナビ4アイコン描画復旧）実装済み・コード確認済み
✓ PR-EXP-02（Insightsヒーローのモバイルレイアウト修正）実装済み・コード確認済み
✓ PR-EXP-04（Home Weekly Progress Migration）実装済み・コード確認済み
✓ PR-EXP-05（ナビラベル・Premium下部余白調整）実装済み・コード確認済み
✓ PR-EXP-03（Premium購入導線 + Premium/Pro価値グルーピング）実装済み・Founder Browser Verification完了
✓ PR-EXP-06（Experiment Platform Framing）実装済み・Founder Browser Verification完了
```

### 未着手のもの（実装フェーズ）

```
✗ PR-P2-01〜06（設計完了・実装ゼロ、AI Suggestion本接続・Home Experiment card AI駆動化・
  Premium比較表正式実装・Consent UIを含む）
✗ Stage3 統合Browser Verification（未実施）
✗ Stage4 Final UX Audit（未実施、PR実装後の再監査として位置づけ）
✗ Stage5 Release Preparation Council（未開催）
✗ Stage6 General Release（未実施）
```

### 進行中のもの

```
（Stage1（PR-EXP-01〜06）はPR-EXP-06のFounder Browser Verification完了をもって全件完了。
次のアクションはStage2（PR-P2-01〜06）着手の要否・優先順位のFounder判断である）
```

---

## Stage一覧

```
Stage0: Founder Decision                          [Completed]
   ↓
Stage1: PR-EXP-01〜06（General Release絶対修正 + Experiment Platform Framing） [Completed]
   ↓
Stage2: PR-P2-01〜06（Phase2実装）                    [In Progress]
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

### Stage1: PR-EXP-01〜06（General Release絶対修正 + Experiment Platform Framing）

```
目的:       実機検証で発見した3件の絶対修正（ナビアイコン欠落・Insightsレイアウト崩れ・
            Premium価格/CTA不在）と2件の推奨修正を実装する。加えて、Founder Execution
            DecisionおよびUI/UX Councilの結論を反映し、PR-EXP-03のスコープをPremium/Pro
            価値グルーピングまで拡張し、新規PR-EXP-06（Experiment Platform Framing）を
            追加する
成果物:     PR-EXP-01, 02, 03, 04, 05, 06（コード変更）
開始条件:   Founder Decision確定（Stage0完了）。個々のPRに追加のFounder Decision依存はない
終了条件:   6PRすべてが実装・Browser Verification完了
依存関係:   PR-EXP-02は必ずStage2（Phase2 Insightsタブ追加）より先に完了させること。
            PR-EXP-06はPR-EXP-03（Premium/Proグルーピング）と文言・トーンの整合を取ること
Browser Verification: 各PR個別の検証項目（PR Master List参照）
Rollback:   PR単位で個別ロールバック可能（各PRのRollback方針参照）
Release Risk: PR-EXP-03が「高」（収益機能の入口）、PR-EXP-06は「低」（文言・軽量レイアウト
            調整のみ、入力項目・新規画面・新規タブの追加を伴わない）、他は「低〜中」
状態:       **Completed**（PR-EXP-01〜06すべて実装・Founder Browser Verification完了）
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
状態:       In Progress（PR-P2-01・02完了。PR-P2-03保留（再設計待ち）。PR-P2-04〜06未着手）
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

| PR | 目的 | 対象画面 | 対象モジュール | 依存PR | Regression対象 | Browser Verification | 完了条件 | Release Risk | 状態 |
|---|---|---|---|---|---|---|---|---|---|
| PR-EXP-01 | ボトムナビ4アイコン描画復旧 | 全画面 | src/app-legacy.js（initNavIcons） | なし | 全画面のタブ切り替え | フレッシュリロード後の4アイコン表示確認 | 4アイコンが常時表示される | 低 | **完了** |
| PR-EXP-02 | Insightsヒーローのモバイルレイアウト修正 | Insights | src/screens/insights.html | なし（PR-P2-02/03より先に完了必須） | 他Insights要素のレイアウト | 375/320/768px幅での表示確認 | 全モバイル幅でヒーロー正常表示 | 低〜中 | **完了** |
| PR-EXP-03 | Premium価格・比較表・CTA復旧 **+ Premium/Pro価値グルーピング**（Premium=理解／Pro=改善の物語化、体質改善実験プラットフォーム UI/UX Council反映） | Premium | app.html（#pro-hero, .pf-grid）、src/styles/app.css（.pf-group-heading） | FD-1確定（済） | premiumGate()呼び出し全般 | CTAクリック→Checkout遷移確認、Premium/Proグルーピング見出しの表示確認 | 価格・CTAが表示され購入導線が機能する。9カードがPremium/Proの2グループに視覚分割される（比較表は作らない、6項目上限内） | **高** | **完了** |
| PR-EXP-04 | Home Weekly Progress Migration（home-next統合、HOME_WEEK_ROW_REMOVAL_AUDIT.md経由でスコープ修正） | Home | src/modules/home-next/home-next-status.js, home-renderer.js, ownership-map.js, home-next-shell.js | なし | Home他要素（CTA状態等） | 記録0件/保存直後の週間ストリップ表示確認 | home-next（デフォルト有効）に週間ストリップが表示される | 低 | **完了** |
| PR-EXP-05 | ナビラベル・Premium下部余白調整 | Navigation, Premium | CSS（.nav-item、.pf-grid） | なし | 他ナビラベル表示 | ラベル1行表示・カード全体視認確認 | 折り返り・occlusionが解消 | 低 | **完了** |
| PR-EXP-06 | **Experiment Platform Framing**（体質改善実験プラットフォーム UI/UX Council新規提案）: Home CTA文言調整・Record完了メッセージ1行追加・Insights「試してみる？」静的リンク追加・Status cardsスパークライン再有効化（PHASE 1-B解除） | Home, Record, Insights | home-next-quick-record.js（CTA文言、Master Plan記載のhome-next-shell.js/home-next-status.jsから実装時にコード確認のうえ修正）、home-next-status.js（スパークライン描画）、record-screen.js（完了メッセージ）、insights.html（今日の気づきカード末尾リンク） | PR-EXP-03（文言・トーンの整合）完了済み | Home CTA状態管理、Record完了フロー、Insights今日の気づきカード | Home CTA文言表示確認、Record完了画面の文言確認、Insights「試してみる？」リンク表示確認、Status cardsスパークライン表示確認 | Home/Record/InsightsでExperiment Platform Framingの文言・可視化が反映され、入力項目・新規画面・新規タブの追加がないことを確認 | 低 | **完了** |

### PR-P2群（Stage2、Phase2実装）

| PR | 目的 | 対象画面 | 対象モジュール | 依存PR | Regression対象 | Browser Verification | 完了条件 | Release Risk | 状態 |
|---|---|---|---|---|---|---|---|---|---|
| PR-P2-01 | hn-experiment-card実装 **（AI Suggestion本接続・Home Experiment cardのAI駆動化を含む）** | Home | home-next-shell.js（実装時にコード確認のうえhome-renderer.jsから変更。companion-intelligence.js/recommendation-engine.jsは既存rule-based実装をそのまま利用、本体無変更） | IMPL-FD-1確定（済） | Home他要素（hero/daily-note/personalize/optional/recovery/reflectionsの6セクションが意図せず再有効化されないこと） | 記録0件時非表示・クールダウン確認（Founder確認により既存3日クールダウンを採用）、AI提案文言が禁止表現リストに抵触しないことの確認 | UX-A完成条件達成 | 中 | **完了** |
| PR-P2-02 | ins-question-card実装 **（AI Suggestion本接続の一部、PR-EXP-06の「試してみる？」静的リンクをAI動的生成に置き換え）**。Founder承認により小規模初期セット（テンプレート3件、companion-intelligence.js独立実装）で実施 | Insights | insights.html, companion-intelligence.js, insights/questions/templates.js（新設） | IMPL-FD-1確定（済）、PR-EXP-02完了、PR-EXP-06完了、PR-P2-01直後推奨 | ins-clinical-summary等 | 回答保存・2週間非再表示確認 | UX-B完成条件達成 | 中 | **完了** |
| PR-P2-03 | trend-cards/correlation-chart/medical-reportタブ統合 | Insights | insights.html | PR-EXP-02完了 | modules/pro/配下レポート機能 | 各タブ遷移・30日未満時の非表示確認 | UX-B完成条件達成 | 低 | **保留**（着手前調査で前提のタブ構造が現行insights.htmlに不在と判明、再設計待ち。詳細はHANDOFF参照） |
| PR-P2-04 | Research Contribution Badge | Home, Premium | home-next-status.js（実機で表示されるhome-next側に実装、Master Plan記載のhome-renderer.jsから変更） | IMPL-FD-3確定（済） | Consent関連バックエンド | Consent未同意者への非表示確認 | UX-E完成条件達成 | 低 | **完了**（Founder実機確認済み。詳細はHANDOFF参照） |
| PR-P2-05 | tier分離（isPremium→getTierLevel）+ **Premium比較表正式実装**（PR-EXP-03のPremium/Proグルーピングを比較表UIへ発展） | Premium | premium-service.js | FREEZE-FD-1・IMPL-FD-2確定（済）、PR-P2-01〜04完了後に実施 | PR-EXP-03の価格/CTA表示・グルーピング表示 | 新tier名称での比較表・価格確認 | UX-C完成条件達成 | 中 | **部分完了**（getTierLevel()をコード形状のみ追加。Stripe側別価格追加・14箇所の呼び出し元移行・比較表UI本実装は未着手。詳細はHANDOFF参照） |
| PR-P2-06 | **Consent UI**（Research Consent UI新規実装） | Settings | Settings画面（新規）、PR-076連携 | GRX-FD-3確定（済） | Consent関連バックエンド | 同意/撤回の反映確認 | UX-E完成条件達成 | 低 | **完了**（Founder実機確認済み。新規`src/services/consent-service.js`、既存2系統のConsentRepositoryは無変更。詳細はHANDOFF参照） |

### Phase2実装スコープの明確化

Founder Execution Decisionおよび体質改善実験プラットフォーム UI/UX Councilが明記したPhase2実装項目と、上記PR-P2群との対応関係:

```
AI Suggestion本接続              → PR-P2-01, PR-P2-02
  （companion-intelligence.js/recommendation-engine.jsの実接続。
    PR-EXP-06で仮設置した静的文言・静的リンクを、Phase2で動的生成に置き換える）

Home Experiment cardのAI駆動化    → PR-P2-01
  （hn-experiment-cardの提案ロジックをAI Suggestion層に接続する）

Premium比較表正式実装             → PR-P2-05
  （PR-EXP-03で導入するPremium/Pro価値グルーピングを、Phase2で正式な比較表UIへ発展させる）

Consent UI                       → PR-P2-06
  （既存決定どおり変更なし。ただしFounder Execution Decisionにより、Case/Experiment
    生成系のConsent安全確認〔デフォルトdeny担保〕をGeneral Release前のCritical項目として
    別途実施すること）
```

---

## UX Master Group

機能単位ではなくユーザー体験単位で整理する（[PHASE2_ARCHITECTURE_FREEZE.md](PHASE2_ARCHITECTURE_FREEZE.md)第11章の再掲・統合）。

### UX-A: Home体験

```
関連PR:     PR-EXP-04, PR-EXP-06, PR-P2-01
関連画面:   Home
完成条件:   要素数6以内（ブロック追加なし、既存ブロックの順序・文言調整のみ）、
            スクロールがほぼ発生しない、hn-experiment-cardが週1回制限を守る、
            週間行に日付・記録有無が表示される、記録CTA文言が「記録が実験の材料になる」
            ことを断定なしに示唆する、Status cardsのスパークラインが表示される
Browser Verification: 記録0件/記録済み双方のCTA状態、週間行表示、実験カード表示条件、
            PR-EXP-06のCTA文言表示、スパークライン描画確認
Regression対象: 状態カード・ヒーローメッセージ表示
```

### UX-B: Insights体験

```
関連PR:     PR-EXP-02, PR-EXP-06, PR-P2-02, PR-P2-03
関連画面:   Insights
完成条件:   ヒーローが全モバイル幅で正常表示、同時表示要素4以下、
            タブ切り替え（傾向/問いかけ/相関/レポート）が機能する、
            今日の気づきカード末尾に「試してみる？」への静的リンクが表示される
            （PR-EXP-06。Phase2でPR-P2-02によりAI動的生成へ置き換え）
Browser Verification: 375/320/768px幅表示、タブ切り替え動作、ロックUIプレビュー表示、
            「試してみる？」リンクとスキップ導線の併記確認
Regression対象: ins-clinical-summary、PROロックカードの挙動
```

### UX-C: Premium体験

```
関連PR:     PR-EXP-03, PR-EXP-05, PR-P2-05
関連画面:   Premium
完成条件:   価格・CTAが表示され購入導線が機能する、tier名称がFREEZE-FD-1決定通り
            （Premium/Pro）に統一される、比較項目最大6件、9枚のカードがPremium（理解）/
            Pro（改善）の2グループに視覚分割される（PR-EXP-03、比較表ではないグルーピング
            見出しのみ）、Phase2でPR-P2-05により正式な比較表UIへ発展する
Browser Verification: CTAクリック→Checkout遷移、比較表の新tier名称表示、
            Premium/Proグルーピング見出しの表示確認
Regression対象: 各PROカードのpremiumGate()呼び出し
```

### UX-D: Experiment体験

```
関連PR:     PR-EXP-06（入口の物語化）, PR-P2-01（AI駆動化）
関連画面:   Home（入口）、Experiments overlay（既存）
完成条件:   hn-experiment-cardタップから既存startExperiment()フローへ自然に接続される、
            Home最下部固定・PROバッジで隠れる配置ではなく、進行中実験がある場合は
            条件付きで優先順位が引き上がる（PR-EXP-06はブロック順の入替のみ、新規ブロック
            追加は行わない）
Browser Verification: 提案カードタップ→実験開始画面遷移、完了後レポート表示、
            進行中実験の有無による表示順の切り替え確認
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
関連PR:     PR-EXP-06（静的な問いかけ文言の仮設置）, PR-P2-01, PR-P2-02（AI Suggestion本接続）
関連画面:   Home、Insights
完成条件:   断定表現が一切含まれない、常に「今はいい」相当のスキップ導線が併記される、
            tier別ゲートが正しく機能する、companion-intelligence.js/recommendation-engine.js
            の接続が完了している（PR-EXP-06段階では静的文言、PR-P2-01/02完了後にAI動的
            生成へ置き換わる）
Browser Verification: 生成文言のサンプルレビュー（禁止表現/許容表現の基準準拠確認）、
            スキップ導線の有無確認
Regression対象: home-insight-engine.js出力形式（DerivedInsight）との整合
```

### Record体験に関する補足

Record画面はPhase2 Implementation Councilにより「全Phaseで意図的に進化させない画面」と設計されているため、UX-A〜Fのいずれの独立したUXグループにも属さない。PR-EXP-06によるRecord完了メッセージの1行変更（「記録しました」→記録が実験の土台になることを示唆する追記）は、新規UXグループを設けず、下記Regression Matrixで個別に管理する。入力カード追加・入力項目追加は本改訂後も禁止のままとする。

---

## Browser Verification Master

General Release直前（Stage3・Stage4）に実施する実機検証項目の一覧。

### 画面別

```
□ Home: CTA状態遷移、週間行の日付・記録表示、hn-experiment-card表示条件、
  記録CTA文言（PR-EXP-06）、Status cardsスパークライン表示（PR-EXP-06）
□ Record: 3カード入力フロー、保存完了、エラー時・オフライン時の挙動（未検証項目）、
  完了メッセージ1行追加の表示確認（PR-EXP-06、入力項目増加がないことも併せて確認）
□ Calendar: 月表示・月相・凡例、編集導線の詳細確認（前回セッション未深掘り）
□ Insights: ヒーロー表示（全モバイル幅）、タブ切り替え、ロックUIプレビュー、
  「試してみる？」静的リンクとスキップ導線の表示確認（PR-EXP-06）
□ Premium: 価格・CTA表示、Checkout遷移、比較表新tier名称表示、
  Premium/Proグルーピング見出しの表示確認（PR-EXP-03スコープ拡張分）
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
□ Experiment導線: hn-experiment-card→既存experiments.jsフローへの接続、
  進行中実験の有無によるHome優先順位の切り替え確認（PR-EXP-06）
□ Experiment Platform Framing: Home/Record/InsightsでPR-EXP-06の文言・可視化が
  一貫したトーン（断定禁止・押し売り感の排除）で表示されることの確認
```

### レスポンシブ確認幅

```
□ 320px / 375px / 390px / 430px の4幅で、崩れ・折返し・Overflow・Safe Areaを確認
```

### Console確認

```
□ Console Error / Promise rejection / 404 / Import Error がないことを確認
```

### Stage3 Exit Criteria（数値基準、Founder確定）

```
Critical              0件
High                  0件
Medium                5件以下
Console Error         0件
Browser Crash         0件
Navigation Broken     0件
Premium Broken        0件
Experiment Broken     0件
Record Broken         0件
```

上記すべてを満たした時点でStage3完了・Stage4着手可能と判定する。

### Founder UX Evaluation（最終判断、数値化しない定性評価）

Browser Verificationの機械的なチェック項目とは別に、Founderが最後に必ず自分の視点で評価する。

```
□ このアプリを毎日開きたいと思うか
□ 記録が義務ではなく自然な行動になっているか
□ 「健康記録アプリ」ではなく「体質改善実験プラットフォーム」に見えるか
□ Premium→Proへの価値の流れは自然か
□ 情報量は適切か
□ 疲れないか
□ 1年間使い続けられる設計か
□ General Releaseしても恥ずかしくない品質か
```

この評価はAIによる代行を行わない（CLAUDE.md Browser Verification Rule）。判定結果はFounderが
本会話または別途HANDOFFへの記録依頼という形でAIに伝え、AIはその結果をHANDOFFに記録する。

---

## Regression Matrix

| 変更PR | 影響を受ける既存機能 | 確認方法 |
|---|---|---|
| PR-EXP-01 | 全画面のタブ切り替え・アクティブ状態表示 | 手動でのタブ切り替え確認 |
| PR-EXP-02 | Insights画面の他カード（PROロックカード等） | 修正後のレイアウト目視確認 |
| PR-EXP-03 | 各PROカードのpremiumGate()呼び出し | 各カードタップ時の挙動確認 |
| PR-EXP-04 | Home CTA状態管理 | 記録前後でのCTA表示確認 |
| PR-EXP-05 | 他ナビラベルの表示 | 全ラベルの折り返り確認 |
| PR-EXP-06 | Home CTA状態管理（PR-EXP-04と同一箇所）、Record完了フロー、Insights今日の気づきカード、Status cards描画ロジック | Home CTA文言・Record完了メッセージ・Insightsリンク・スパークライン描画の目視確認、入力項目数が増えていないことの確認 |
| PR-P2-01 | Home他要素の表示順序・スクロール量、PR-EXP-06のExperiment card条件付き優先順位 | Home全体のスクロール量測定 |
| PR-P2-02 | ins-clinical-summary等の既存タブ内容、PR-EXP-06の「試してみる？」静的リンク（AI動的生成へ置き換え） | 各タブの独立動作確認 |
| PR-P2-03 | modules/pro/配下レポート機能単体 | 各レポート機能の単独動作確認 |
| PR-P2-04 | PR-076 Consent Gateバックエンド | Consent状態のDB確認 |
| PR-P2-05 | PR-EXP-03で復旧した価格・CTA表示、Premium/Proグルーピング表示 | tier分離後の価格表示整合確認 |
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
  （最低限、絶対修正3件すべての解消を確認すること）。PR-EXP-06が実装・検証完了
  （Experiment Platform Framingの文言・可視化がHome/Record/Insightsに反映され、
  入力カード・入力項目・新規画面・新規タブの追加がないことを確認すること）

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
□ PR-EXP-01〜06実装・検証完了
□ PR-P2-01〜06実装・検証完了
□ GRX-FD-1（オンボーディング自然遷移）実環境検証完了
□ GRX-FD-2（premiumGate実際の挙動）実環境検証完了
□ Readiness Score 85点前後以上
□ PHASE2_GOVERNANCE.md全項目への抵触なし
□ Value Ladder（記録→理解→改善→習慣化→資産化）の連鎖が実機で確認できる
□ 医療免責文言・AI安全基準（BD-044/045/048/050）の遵守確認
□ Research Consent UIが機能し、Consent Gateと正しく連動している
□ Tier Branding（FREE/Premium/Pro）が全画面で一貫して表示されている
□ Experiment Platform Framing（PR-EXP-06）がHome/Record/Insightsで一貫したトーンで
  表示され、記録アプリではなく体質改善実験プラットフォームであることが初見で伝わる
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
General Release完成までの進捗: 約44%

内訳:
  設計・意思決定フェーズ（Stage0）:        100% 完了
  （Repository Execution Audit / Founder Execution Decision / 体質改善実験プラットフォーム
   UI/UX Councilも設計・判断フェーズとして完了済み。PR-EXP-06新設によりPR総数が
   11件→12件に増加したため、実装フェーズの完了率は分母増加分だけ下方修正されている）
  実装フェーズ（Stage1・Stage2）:          52% 完了（12 PR中6件完了、PR-EXP-01〜06全件完了。
                                     PR-P2-01は実装完了・Founder Browser Verification待ち。
                                     PR-P2-02〜06は未着手）
  検証フェーズ（Stage3・Stage4）:          0% 完了（未着手）
  リリース判定フェーズ（Stage5・Stage6）:   0% 完了（未着手）

Stage進捗:  2/6 Stage完了（Stage0・Stage1完了、Stage2進行中）
PR進捗:     6/12 PR完了（PR-EXP-01〜06全件完了。PR-P2-01は実装完了・Founder Browser
            Verification待ち。PR-P2-02〜06は未着手）
UX進捗:     0/6 UXグループ完成（UX-A〜Fいずれも実装待ち）
Verification進捗: 0%（Stage3・Stage4とも未実施）
```

---

## Final Gate

| Stage | 判定 |
|---|---|
| Stage0（Founder Decision） | **PASS** |
| Stage1（PR-EXP-01〜06） | **完了**（PR-EXP-01〜06すべて実装・Founder Browser Verification完了） |
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
| **作成日** | 2026-07-07（初版）／2026-07-07 改訂（Repository Execution Audit・Founder Execution Decision・体質改善実験プラットフォーム UI/UX Council反映） |
| **権威レベル** | LEVEL-1 GOVERNING DOCUMENT（Single Source of Truth。[FOUNDER_EXECUTION_DECISION.md](FOUNDER_EXECUTION_DECISION.md)と2文書でGeneral Releaseまでの実装判断を構成する） |
| **前提文書** | FOUNDER_FINAL_DECISIONS.md / IMPLEMENTATION_SEQUENCE.md / PHASE2_GOVERNANCE.md / PHASE2_IMPLEMENTATION_PR_PLAN.md / FOUNDER_EXECUTION_DECISION.md / 他6文書（冒頭記載） |
| **コード変更** | ゼロ（既存文書の統合・整理のみ。本改訂も文書更新のみ） |
| **次回改訂トリガー** | 各Stage完了時（進捗更新） |

---

# IMPLEMENTATION STATUS

```
Stage0: Completed
Stage1: Completed（PR-EXP-01〜06全件完了・Founder Browser Verification完了）
Stage2: Ready
Stage3: Waiting
Stage4: Waiting
Stage5: Waiting
Stage6: Waiting
```

---

# IMPLEMENTATION READY

```
YES（設計上のブロッカーなし、という意味でのIMPLEMENTATION READY。FOUNDER_FINAL_DECISIONS.md基準）

補足: FOUNDER_EXECUTION_DECISION.mdは、現時点の実装進捗そのものに対する別基準の判定として
READY WITH FIXESを下している（Premium購入導線・initNavIcons二重実装・record.jsの壊れた
import・Consent安全確認の4件のCritical項目が未解決のため）。両者は異なる問いに答える
判定であり矛盾しない——「設計は実装着手可能な状態か」＝YES、「現在の実装はGeneral Release
可能な状態か」＝READY WITH FIXES。
```

---

# General Release Readiness

```
58 / 100（現時点評価。PR-EXP-01〜03完了後は85点前後まで回復見込み、
          GENERAL_RELEASE_EXPERIENCE_COUNCIL.md算出値をそのまま継承）

補足: このスコアはGENERAL_RELEASE_EXPERIENCE_COUNCIL.mdが定義した技術的な絶対修正3件
（ナビアイコン・Insightsレイアウト・Premium導線）を基準とした数値であり、PR-EXP-06
（Experiment Platform Framing）はこのスコアの構成要素ではない。PR-EXP-06は、Product
Experience Review Councilが指摘した「よくある健康記録アプリのβ版にしか見えない」という
体験面の課題に対応するものであり、Readiness Scoreとは独立したExperience Alignment
（Founder Vision Alignment）の観点で評価する。
```

---

# Single Source of Truth

```
YES
```
