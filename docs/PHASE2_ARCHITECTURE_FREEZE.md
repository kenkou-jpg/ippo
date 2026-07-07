# PHASE2 ARCHITECTURE FREEZE COUNCIL
## Phase2 UX・画面・導線 最終固定会議

---

> **文書権威レベル: LEVEL-1 GOVERNING DOCUMENT**
>
> 本 Council の目的は「Phase2実装前に、画面・導線・UX・情報設計を完全固定すること」である。
> ここで決定した内容を Phase2 の唯一の設計として扱う。
> **以後、Phase2実装ではレイアウト変更・導線変更・情報設計変更を原則禁止とする。**
> コード変更・実装は一切行っていない。

---

**文書番号:** IPPO-PHASE2-FREEZE-001
**開催体:** Founder × Product Designer × Senior UX Architect × Mobile UX Specialist × Information Architect × Interaction Designer × Behavioral Designer × Growth Lead × Monetization Strategist × AI Product Designer × Medical UX Reviewer × Customer Representative
**開催日:** 2026-07-07
**前提文書:** IMPLEMENTATION_SEQUENCE.md / PHASE2_IMPLEMENTATION_COUNCIL.md / PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md / GENERAL_RELEASE_EXPERIENCE_COUNCIL.md / MONETIZATION_COUNCIL_REPORT.md / APP_EXPERIENCE_FRAMEWORK.md / USER_JOURNEY.md / SCREEN_FLOW.md / NAVIGATION_DESIGN.md / INFORMATION_ARCHITECTURE.md / VALUE_LADDER.md / PRO_INSIGHT_ARCHITECTURE.md / MONETIZATION_ROADMAP.md

---

## Executive Summary

Council は前提14文書を再監査し、Phase2の画面・導線・UX・情報設計のほぼ全域が固定可能な水準に達していることを確認した。ただし、審査の過程で**これまでのどの Council でも扱われていなかった新規の重大な論点**を1件発見した。実機確認（[GENERAL_RELEASE_EXPERIENCE_COUNCIL.md](GENERAL_RELEASE_EXPERIENCE_COUNCIL.md)）により、Premium画面の実際の表示文言は単一の「PRO」であることが分かっているが、Phase2はこの上に2層（STARTER相当／PRO）の tier分離を導入する計画である。**「PRO」という名称は既に単一の有料層を指す言葉として実装済み画面に存在するため、Phase2で新しい2層目を作る際、どちらの層を「PRO」と呼ぶかを再定義しない限り、既存ユーザーとの表示上の矛盾が生じる。** これは Monetization設計における未解決事項であり、本 Council は Monetization を「要修正」と判定する唯一の理由とする。

それ以外の6項目（画面レイアウト・導線・UX・Information Architecture・Navigation・Value Ladder）はいずれも FIX と判定した。

---

## 第1章 Home 完全レビュー

### Experiment導線

`hn-experiment-card` は Home最下部に週1回のみ出現する設計であり、Experiment導線の入口として機能する。常設ではなく「今週は出るか出ないか分からない」という頻度制御により、Home全体の情報量を増やさずに新しい行動提案を組み込む。

### CTA

「今日を記録する」／「今日をふり返る」という状態遷移は実装済みで確認済み（[GENERAL_RELEASE_EXPERIENCE_COUNCIL.md](GENERAL_RELEASE_EXPERIENCE_COUNCIL.md)実機確認）。Phase2でもこのCTAの役割・位置は変更しない。

### 週間表示・AIカード・Status Card

週間記録行（PR-EXP-04で復旧予定）、今日のインサイト1件、状態カード4枚は、いずれもPhase2で位置・役割を変更しない。Phase2の新規要素はこれらの「下」に追加されるのみである。

### Information Priority・視線誘導

CTA（今すぐの行動）→ 今日のインサイト（今日の意味）→ 疾患別ヒーロー（文脈）→ 状態カード（データ一覧）→ 週間行（継続の可視化）→ 実験提案（将来の一歩、稀）という優先順位は、情報の緊急性・頻度が上から下に向かって下がる設計になっており、視線誘導として妥当である。

### スクロール量・毎日開きたくなるか・疲れないか

`hn-experiment-card` の週1回制限により、Home全体のスクロール量はGeneral Release時点からほぼ増加しない。「今日は何が返ってくるか分からない」という穏やかな期待感の設計（[PHASE2_IMPLEMENTATION_COUNCIL.md](PHASE2_IMPLEMENTATION_COUNCIL.md)第10章）は、毎日開く動機として機能する設計になっている。ただし、これは設計上の仮説であり、実際のユーザーデータによる検証はまだ行われていない（この点は「設計としてはFIX、実証はGeneral Release後」という前提を置く）。

### Home 判定: **FIX**

---

## 第2章 Insights 完全レビュー

### Question Layer・Trend Cards・Correlation・Medical Report

既存の4つの空きInjection Point（`ins-trend-cards`・`ins-question-card`・`ins-correlation-chart`・`ins-medical-report`）を、タブ切り替え式UI（傾向／問いかけ／相関／レポート）に統合する設計は、[PHASE2_IMPLEMENTATION_COUNCIL.md](PHASE2_IMPLEMENTATION_COUNCIL.md)第3章・第4章ですでに固まっている。本 Council はこれを追認する。

一点、これまで明文化されていなかった論点を本 Council で確定する。**タブ自体はFREEユーザーにも見える状態にし、タップした時点でロックUI（プレビュー＋アップグレード導線）を表示する。** タブそのものを非表示にすると「そういう機能があること」自体が伝わらず、[PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md)が定める「Free でも少しだけ見える設計」の原則に反するためである。

### AI Insight・読みやすさ・情報量・視覚的負荷

ヒーロー（挨拶＋気づき）のレイアウト崩れはPR-EXP-02で修正予定であり、Phase2のタブ追加は**この修正完了後にのみ**着手すべきという依存関係を、本 Council はあらためて確認・固定する。タブ切り替え式の採用により、同時表示要素数は常に4以下に保たれ、視覚的負荷は許容範囲に収まる。

### Premium導線

Insights画面上部の「PRO機能を見る」ボタン（既存実装、実機確認済み）は、Phase2でも同じ位置・役割を維持する。

### Insights 判定: **FIX**（PR-EXP-02完了が前提条件）

---

## 第3章 Premium 完全レビュー

### 価値説明・比較表・CTA・価格説明

Council は実装済み画面を再確認し、以下の事実を重大な論点として提起する。

```
現状: Premium画面のヘッダーは「PRO」の一語のみ（実機確認済み）。
      画面内の9カードはすべて単一の「PRO」バッジで統一されている。

Phase2の計画: STARTER相当／PRO の2層構成へtier分離する
      （FOUNDER_DECISION_REVIEW_MONETIZATION.md FD-2、
       PHASE2_IMPLEMENTATION_COUNCIL.md IMPL-FD-2）

問題: 「PRO」はすでに実装済み画面で「唯一の有料プラン」を指す名称として
      定着している。Phase2で新たに2層目を作るとき、
      どちらの層を「PRO」と呼ぶかを再定義しない限り、
      「今までPROだったはずの機能が、実は下位プランに格下げされた」
      という誤解をユーザーに与えかねない。
```

これは MONETIZATION_FRAMEWORK.md が想定していた表示名「Premium」とも、実際の画面文言「PRO」とも異なる、**Phase2固有の新しい論点**である。本 Council はこれを Founder Decision（第9章 FREEZE-FD-1）として提起し、この論点が解消されるまで比較表UIの文言は確定できないと判定する。

### Paywall・アップグレード導線・押し売り

Paywallの配置原則自体（[PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md)）はPhase2でも変更しない。アップグレード導線が「機能比較」ではなく「Value Ladderの可視化」になるという設計方針（[PHASE2_IMPLEMENTATION_COUNCIL.md](PHASE2_IMPLEMENTATION_COUNCIL.md)第8章）も維持する。押し売り感の排除（カウントダウン等の禁止）もこれまでの決定通り。

### Premium 判定: **要修正**（tier名称の再定義がFounder Decision待ちのため）

---

## 第4章 Experiment 完全レビュー

### Suggestion・Experiment一覧・開始導線・終了導線・レポート・AIとの接続

`src/modules/experiments.js`（707行、実装済み確認済み）は、`openExperiments()`・`startExperiment()`・`startCustomExperiment()`・`cancelExperiment()`・`completeExperiment()`・`showExperimentReport()`という一連のライフサイクルをすでに備えている。この画面は独立したナビゲーションタブを持たず、Premium画面の「ヘルス実験」カードから `premiumGate(openExperiments)` 経由で呼び出されるオーバーレイである（既存の `modules/pro/*-overlay.js` パターンと一致すると推定される。この点は実装時にBrowser Verificationで最終確認する）。

Phase2の `hn-experiment-card`（Home）は、この既存フローへの**新しい入口**として機能する。タップすると、AIが提案した実験内容があらかじめ選択された状態で `startExperiment()` フローに接続される設計とする。既存のPremium画面経由の起動（ユーザー自身が能動的に選ぶ）と、新しいHome経由の起動（AIが提案する）が、同じ実験管理基盤に合流する構造である。

### Experiment 判定: **FIX**（既存overlay構造への接続方式を実装時に確認する前提）

---

## 第5章 Similarity 完全レビュー

Similarity MatchはPhase3機能であり、BD-026（k≥50・5疾患達成）というデータ量条件が満たされるまで着手できない。本 Council はPhase2の設計を凍結する場であるため、Similarityについては**枠組みのみ**を確定し、詳細な画面設計はPhase3着手時の専用Councilに委ねる。

```
入口:      Insights画面内、将来的な新規タブ（「比較」等）として追加される想定
検索導線:  詳細設計はPhase3着手時に確定
症例閲覧:  BD-029（個人識別不可要件）を満たす形での匿名化表示が必須要件
Premiumとの関係: PRO層機能として位置づけ（MONETIZATION_ROADMAP.md Section3）
```

### Similarity 判定: **枠組みのみFIX、詳細設計はPhase3で別途実施**（Phase2実装のブロッカーにはならない）

---

## 第6章 Pattern Search 完全レビュー

Pattern SearchもSimilarity同様Phase3機能であり、BD-026条件に連動する。表示位置はSimilarityと同じ「比較」タブ内、またはInsightsの「傾向」タブの拡張として検討する余地があるが、これも詳細確定はPhase3着手時とする。AIとの関係は、既存のQuestion Layer/相関グラフが提示する「個人内のパターン」に対し、Pattern Searchは「集団内のパターン」を扱うという役割分担を、本 Council は概念レベルで確認する。理解しやすさの観点では、個人内パターン（Phase2）を先に習熟させてから集団内パターン（Phase3）を提示する順序が、認知負荷の観点で妥当である。

### Pattern Search 判定: **枠組みのみFIX、詳細設計はPhase3で別途実施**

---

## 第7章 Research Contribution Badge 完全レビュー

### 表示場所・表示頻度

Home状態カード群の末尾、およびPremium画面（[PHASE2_IMPLEMENTATION_COUNCIL.md](PHASE2_IMPLEMENTATION_COUNCIL.md)第13-D節）に配置する。表示頻度について、本 Council は新たに以下を確定する。**Research Contribution Badgeは「繰り返し出現する通知・ポップアップ」ではなく、条件（記録365日以上・Research Consent同意済み）を満たした時点で恒久的に表示され続ける静かなバッジとする。** 達成のたびに祝う演出（アニメーション等）は初回表示時のみに限定し、以後は状態カードの一部として淡々と存在し続ける。

### 達成感・押し付け感がないか

初回表示時のみの控えめな祝福演出と、以後は恒久表示という設計により、「見るたびに褒められる」ような繰り返しの演出を避け、押し付け感を排除する。

### Research Contribution Badge 判定: **要修正**（開示粒度がIMPL-FD-3としてFounder Decision待ちのため、表示場所・頻度の枠組みはFIXだが、表示内容の確定はできない）

---

## 第8章 Navigation 完全レビュー

### Bottom Navigation・戻る導線・画面遷移・FAB・画面追加の必要性

[NAVIGATION_DESIGN.md](NAVIGATION_DESIGN.md)・[SCREEN_FLOW.md](SCREEN_FLOW.md)・[GENERAL_RELEASE_SCREEN_MAP.md](GENERAL_RELEASE_SCREEN_MAP.md)が繰り返し確認してきた通り、Phase2〜Phase4を通じて5タブ構成・新規画面ゼロという方針は揺るがない。本 Council はこれを最終確認する。ボトムナビアイコンの描画不具合（PR-EXP-01）は実装上の修正であり、Navigation設計そのものの問題ではない。

### Navigation 判定: **FIX**

---

## 第9章 全体UX評価

| テーマ | 評価 |
|---|---|
| 毎日使いたいと思えるか | 設計としては「今日は何が起こるか分からない」穏やかな期待感モデルで担保。実証はGeneral Release後 |
| 記録が億劫にならないか | Record画面は全Phaseで不変（唯一「進化させない」画面）という原則により担保 |
| 疲れないか | 色・通知・アニメーションの制約（GROWTH_STRATEGY.md 6-C）をPhase2でも継承 |
| 情報量は適切か | Home最大6要素、Insights同時表示4要素以下という上限を設計レベルで固定 |
| 画面を見ただけで安心するか | PR-EXP-02完了後のInsightsヒーロー正常表示が前提。医療免責文言・プライバシー訴求は既存で確認済み |
| 迷わないか | 5タブ・新規画面ゼロの方針により担保 |
| 押し売り感はないか | Paywall配置原則は健全。ただしtier名称の衝突は解消しないと将来的な不信につながるリスクがある（第3章） |
| 使い続けたくなるか / 1年・3年使えるか | Value Ladder③（改善）の穴がPhase2で埋まることが前提条件。埋まらなければ1年後の継続率に影響しうる |
| Phase3・Phase4でも破綻しないか | 「追加のみ・置き換えない」という設計原則が全Phaseを通じて維持されており、破綻のリスクは低いと評価する |

---

## 第10章 Phase2 Architecture Freeze 最終判定

| # | 項目 | 判定 |
|---|---|---|
| ① | 画面レイアウト | **FIX** |
| ② | 導線 | **FIX** |
| ③ | UX | **FIX**（実証はGeneral Release後） |
| ④ | Information Architecture | **FIX** |
| ⑤ | Navigation | **FIX** |
| ⑥ | Monetization | **要修正**（tier名称の再定義、第3章・FREEZE-FD-1） |
| ⑦ | Value Ladder | **FIX**（ラダー自体の構造に問題はない。⑥の解消待ちなのは表示文言のみ） |

---

## 第11章 UX単位での再分類

機能単位（Question Layer、Experiment Suggestion等）ではなく、ユーザーが実際に体験する単位でPhase2を再分類する。

### UX-A: Home体験

```
目的:       開いた瞬間に「今日やるべきこと」と「記録の意味」を即座に理解できる
責務:       CTA状態管理、週間継続の可視化、週1回の実験提案の表示制御
対象画面:   Home
関連モジュール: home-renderer.js, home-insight-engine.js, companion-intelligence.js（新規接続）
完成条件:   要素数6以内、スクロールがほぼ発生しない、hn-experiment-cardが週1回制限を守る
Browser Verification: 記録0件/記録済み双方のCTA状態、週間行の日付表示、実験カードの表示条件
Regression対象: 既存の状態カード・ヒーローメッセージ表示
```

### UX-B: Insights体験

```
目的:       記録の先にある「理解」を、無料の証拠から有料の深さへ段階的に開示する
責務:       ヒーロー表示、タブ切り替え（傾向/問いかけ/相関/レポート）、tier別ゲート
対象画面:   Insights
関連モジュール: insights.html, home-insight-engine.js, lag-correlation-engine.js,
            modules/pro/doctor-summary/, companion-intelligence.js
完成条件:   PR-EXP-02完了後にヒーローが正常表示。各タブの同時表示要素が4以下
Browser Verification: 375px/320px幅でのヒーロー表示、タブ切り替え動作、ロックUIのプレビュー表示
Regression対象: 既存のins-clinical-summary、PROロックカードの挙動
```

### UX-C: Premium体験

```
目的:       「機能を比較して選ぶ」のではなく「今の自分の段階を理解し、自然に次へ進む」
責務:       プラン比較表、価格表示、購入CTA、Paywall配置
対象画面:   Premium、各画面のPaywallトリガー箇所
関連モジュール: app.html（#pro-hero）、premium-service.js、services/stripe.js
完成条件:   PR-EXP-03完了後に価格/CTAが表示される。tier名称の衝突が
            FREEZE-FD-1でFounderにより解消されている
Browser Verification: CTAクリックからCheckoutまでの導線、比較表の表示
Regression対象: 既存のPROバッジ付きカードのpremiumGate()呼び出し
```

### UX-D: Experiment体験

```
目的:       「提案を受ける→試す→結果を見る」という流れを、記録の先の自然な行動として提供する
責務:       提案生成、実験の開始・中断・完了、AIレポート生成
対象画面:   Home（入口）、Experiments overlay（既存）
関連モジュール: modules/experiments.js（既存707行）、recommendation-engine.js、companion-intelligence.js
完成条件:   hn-experiment-cardタップから既存のstartExperiment()フローへ自然に接続される
Browser Verification: 提案カードタップ→実験開始画面への遷移、完了後のレポート表示
Regression対象: 既存のPremium画面「ヘルス実験」カードからの単独起動
```

### UX-E: Research体験

```
目的:       「自分の記録が社会に繋がっている」という実感を、押し付けずに伝える
責務:       Research Contribution Badgeの表示、Consent状態との連動
対象画面:   Home、Premium
関連モジュール: （新規、PR-076 Consent Gateと連動する形で設計）
完成条件:   Day365以上・Research Consent同意済みユーザーにのみ恒久的な静かな表示として出現
            （繰り返しポップアップにしない）
Browser Verification: Consent未同意ユーザーには表示されないこと
Regression対象: 既存のConsent関連バックエンド処理
備考:       IMPL-FD-3（開示粒度）がFounder未決定のため、表示内容の完全固定はできない
```

### UX-F: AI体験

```
目的:       AIが常に「観測」と「問い」の形で存在し、ユーザー自身が発見する感覚を守る
責務:       全AI生成物の文言基準（禁止表現/許容表現）、tier別ゲート、キャッシュ制御
対象画面:   Home、Insights
関連モジュール: companion-intelligence.js、recommendation-engine.js、home-insight-engine.js
完成条件:   断定表現が一切含まれない、医師アドバイザーによる文言レビュー（BD-045）を経ている
Browser Verification: 生成文言のサンプルレビュー
Regression対象: 既存のhome-insight-engine.js出力形式（DerivedInsight）との整合
```

---

## 第12章 Founder Decision（本Council新規提起分）

### FREEZE-FD-1（Critical・新規）— tier名称の再定義

Phase2でSTARTER相当／PROの2層構成に分離する際、既存画面が既に使っている「PRO」という単一有料層の名称をどちらの新層に割り当てるかをFounderが決定すること。Council の所見としては、既存の「PRO」ブランドを上位の新層（Phase2機能を含む本当のPRO）に引き継ぎ、既存の有料機能（分析・レポート群）が属する下位の新層に新しい名称（例: Premium）を与える案が、既存ユーザーの体感的な「格下げ」を避けられるため望ましいと考えるが、最終決定はFounderに委ねる。この決定はPR-EXP-03（現在進行中の価格/CTA復旧）の文言、およびPR-P2-05（tier分離実装）の両方に影響するため、可能な限り早期に決定することが望ましい。

### 既存Founder Decisionとの関係

IMPL-FD-3（Research Contribution Badgeの開示粒度）は本Councilでも未解決のまま。UX-E完成のブロッカーとして引き続き有効。

---

## 第13章 新規Phase2 PR計画を作成すべきか

```
判定: 新規のPR計画作成は不要。

理由:
  本Freeze Councilが発見したFREEZE-FD-1は、既存のPR-P2-05
  （tier分離+比較表UI、PHASE2_IMPLEMENTATION_COUNCIL.md第15章）の
  着手条件に1項目追加するだけで対応可能である。PR-P2-01〜04の
  設計・スコープには影響しない。

推奨する変更点（既存計画への追記のみ）:
  1. PR-P2-05の着手条件に「FREEZE-FD-1（tier名称の再定義）の
     Founder決定」を追加する
  2. PR-EXP-03（進行中）の実装者に対し、価格・CTA文言に
     将来のtier名称変更を前提とした設定値参照方式
     （ハードコード禁止）を徹底するよう申し送りする

IMPLEMENTATION_SEQUENCE.mdの更新: Stage 6（Phase2 Founder Decision）に
FREEZE-FD-1を追加することを推奨する。
```

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-PHASE2-FREEZE-001 |
| **作成日** | 2026-07-07 |
| **権威レベル** | LEVEL-1 GOVERNING DOCUMENT |
| **前提文書** | IMPLEMENTATION_SEQUENCE.md / PHASE2_IMPLEMENTATION_COUNCIL.md / PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md / GENERAL_RELEASE_EXPERIENCE_COUNCIL.md / MONETIZATION_COUNCIL_REPORT.md / APP_EXPERIENCE_FRAMEWORK.md / USER_JOURNEY.md / SCREEN_FLOW.md / NAVIGATION_DESIGN.md / INFORMATION_ARCHITECTURE.md / VALUE_LADDER.md / PRO_INSIGHT_ARCHITECTURE.md / MONETIZATION_ROADMAP.md |
| **コード変更** | ゼロ（設計のみ） |
| **Founder Decision** | FREEZE-FD-1（新規・Critical）、IMPL-FD-3（既存・継続） |
| **Freeze範囲** | 画面レイアウト・導線・UX・IA・Navigation・Value Ladder（FIX）。Monetization（tier名称のみ要修正） |
| **次回改訂トリガー** | FREEZE-FD-1確定時 / Phase3着手Council開催時 |

---

**PHASE2 ARCHITECTURE FREEZE COUNCIL — 議決完了 2026-07-07**
**最終判定: 6/7項目 FIX、Monetizationのみ要修正（FREEZE-FD-1のFounder決定待ち）**
**新規PR計画: 不要（既存PR-P2-05の着手条件に1項目追加するのみ）**
