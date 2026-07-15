# PR-HOME-01 Runtime Integration Plan

> PR-REC-03（`docs/rebuild/PR_REC_03_RUNTIME_INTEGRATION_PLAN.md`）と同じ形式で、
> `prototype/`のHome画面マークアップを`app.html`/`src`側の実行時（Vite bundle）へ
> 統合する **Home Screen Runtime Integration PR** の設計文書。コード変更ゼロ。
>
> 関連: `docs/IMPLEMENTATION_PLAN_V1.md` 出力16 Phase 2完了条件
> （forbidden-word-validator接続・confidenceLabel語彙統一・Browser Verification）、
> Repository Strategy A（UI=Prototype正・Business Logic=現行ippo正）

---

## 0. Phase境界（スコープ確定）

```
IMPLEMENTATION_PLAN_V1.1のPhase定義:
  Phase 2 = Prototype Home × Existing Insight Engine × Question Layer × Confidence Engine
  Phase 3 = Prototype Experiment × Existing Experiment Domain × ExperimentNudgeService

Prototype Homeの7ブロックのうち、Experiment/Outcomeドメインの実データに依存する
以下3ブロックはPhase 3の責務であり、本PR（PR-HOME-01）のスコープ外とする:
  □ milestone-banner（実験完了時のお祝い。Outcome確定が前提）
  □ card-result（Before→After。Outcome計算が前提）
  □ card-next（次の実験候補。ExperimentNudgeServiceが前提）

本PR（PR-HOME-01）のスコープ = 以下4ブロックのみ:
  ✓ hero（挨拶 / 実験Day / ストリーク / 今日の目的）
  ✓ home-record-strip（今日の記録帯）
  ✓ home-insight-card（気づき / Confidence表示）
  ✓ home-experiment-section（進行中の実験。表示のみ、Nudge本接続はPhase 3）
```

---

## 1. `prototype/index.html` 内のHome関連マークアップの抽出範囲

```
対象: <main class="screen" id="screen-home" data-screen="home" hidden> … </main>
範囲: index.html 56〜190行目

内訳（本PRスコープ分のみ）:
  - 59-99:   hero（brand-lockup / hero-date / hero-greeting / hero-ring(Day数) /
             hero-streak(7日ドット) / hero-focus-row）
  - 110-113: record-strip（#home-record-strip、中身はJSで注入）
  - 116-129: card-insight（#home-insight-card、confidence-row 4段階ドット +
             confidence-tag、CTA→#insights遷移）
  - 132-140: card-experiment（#home-experiment-section、中身はJSで注入）

スコープ外（Phase 3送り、抽出しない）:
  - 102-108: milestone-banner
  - 143-177: card-result
  - 180-189: card-next
```

**注意（ID衝突）**: 外枠 `id="screen-home"` は`app.html`側で別物（`<div id="screen-home">`,
`app.html:180`、内容は空・screen-router経由で`home`または`home-next`いずれかへ委譲される
コンテナ）として存在する。抽出時はこの外枠idを持ち込まず、既存の`#screen-home-next`
（`src/screens/home-next.html`）内部を置換する。

---

## 2. `prototype/styles.css` 内のHome関連CSSの抽出範囲（要diff監査）

```
Home専用（そのまま移植候補）:
  - .hero / .hero-top-row / .brand-lockup / .brand-mark / .brand-wordmark /
    .brand-tagline / .hero-date / .hero-greeting
  - .hero-signature / .hero-ring / .hero-ring-inner / .hero-ring-day / .hero-ring-unit
  - .hero-signature-info / .hero-experiment-name / .hero-progress-caption
  - .hero-streak / .hero-streak-label / .hero-streak-dots / .streak-dot
  - .hero-focus-row / .hero-focus-label / .hero-focus-text
  - .record-strip
  - .card-insight / .card-kicker / .card-icon-badge（badge-gold/badge-rose/badge-sage）/
    .card-kicker-label / .card-quote
  - .confidence-row / .confidence-meter / .confidence-dot / .confidence-tag
  - .card-experiment / .home-experiment-body

他画面と共有（重複定義回避が必要）:
  - .card-cta（Record画面のdetail-toggleと共有 — PR-REC-03で既に移植済みのはず。
    値の差分がないか確認のみ行う）
  - .btn-primary / .btn-gold（全画面共有）
```

**方針**: PR-REC-03と同じくDesign System Freeze遵守。既存`src/styles/app.css`に
同名クラスがあればそちらを正とし、値の差分のみ1行ずつdiffで確認する。
`confidence-row`/`confidence-dot`はIMPLEMENTATION_PLAN_V1.1出力16「4段階confidenceLabelと
3段階CONFIDENCE_LEVELSの語彙統一」の対象であるため、既存`CONFIDENCE_LEVELS`定数
（呼び出し元要確認）との段階数の不一致がないか本PR内で確認する。

---

## 3. `prototype/app.js` 内のHome関連イベント・状態管理の抽出範囲

```
関数（すべてダミー`day`オブジェクトを描画するのみ、実データ接続なし）:
  - renderHomeHero(day)（385-386行目付近、hero-day-number/hero-ring pct）
  - renderHomeInsight(day)（431-440、confidence-meter含む）
  - renderHomeExperiment(day)（442-456）
  - renderHomeRecordStrip()（571-597、data-nav委譲のみ）

これらはRecord同様「ダミーデータ + DOM操作のみ」であり、Supabase/companion-intelligence.js
等の実行時グローバルには依存していない（isolated static demo）。
```

---

## 4. `src/screens/home-next.html` 側の置換範囲と接続方針

```
現状（確認済み・コード未変更）:
  #screen-home-next 内は11スロットのdivのみで構成され、中身はすべて
  home-next-shell.js の renderAll() が動的に注入する:
    - #hn-header / #hn-greeting        → renderSharedHeader / renderGreeting
    - #hn-status                       → renderStatusCards（週間ストリップ等）
    - #hn-insights                     → renderInsights（Insight Engine接続済み）
    - #hn-medical-summary              → renderMedicalSummary
    - #hn-experiment                   → renderExperiment
        （companion-intelligence.js/recovery-journey.js、PR-P2-01で接続済み。
         3日クールダウン・データ閾値による自動非表示ロジック含む）
    - #hn-record                       → renderQuickRecord
    - #hn-hero/#hn-daily-note/#hn-personalize/#hn-optional/#hn-recovery/#hn-reflections
        → PHASE 1で意図的に無効化済み（innerHTML=''でクリアするのみ）。
          Home最大6ブロックルール遵守のためScope外・再有効化しない。

置換方針（PR-REC-03と同じAdapterパターン）:
  - 外枠 id="screen-home-next" は温存（screen-router.js / showHomeNext() /
    switchTab('home')等の既存参照経路を維持するため）
  - renderInsights()の出力先DOM構造を、本文書1節のcard-insightマークアップに
    置き換える（confidence-row/confidence-dot構造を含む）。ロジック本体
    （companion-intelligence.jsのrankInsightPriorities()等）は無変更。
  - renderExperiment()の出力先DOM構造を、card-experimentマークアップに置き換える。
    ロジック本体（3日クールダウン等）は無変更。
  - renderQuickRecord()の出力先DOM構造を、record-stripマークアップに置き換える。
  - hero相当（挨拶+Day数+ストリーク+今日の目的）は既存renderGreeting/renderStatusCards
    に一部重複があるため、本PR内で統合方針を決定する
    （renderGreeting拡張 or 新規renderHomeHero新設のいずれか。既存関数の責務を
    壊さないことを優先）。
  - #hn-hero等の無効化6スロットは本PRでも変更しない（現状維持）。
```

---

## 5. Exit Criteria（本PR完了条件）

```
□ hero/record-strip/insight-card/experiment-sectionの4ブロックが
  Prototypeマークアップで#screen-home-next内に描画される
□ Insight Engine（companion-intelligence.js）・Experiment Card
  （companion-intelligence.js + recovery-journey.js）の接続ロジックは無変更のまま
  新マークアップに出力される
□ forbidden-word-validator.jsが気づき生成パス（renderInsights経路）に接続されている
  ことを確認する（IMPLEMENTATION_PLAN_V1.1出力16 Phase2完了条件）
  → **完了**（本文書3回目の更新時に実装。詳細は8節参照）
□ confidence-row 4段階とCONFIDENCE_LEVELS定数の段階数不一致があれば本PR内で解消する
□ Home最大6ブロックルール・情報量を増やさない原則を維持（新規カード追加禁止）
□ Browser Verification（Founder実施）: 320/375/390/430px 4幅、Console Error 0件、
  記録0件時の空状態表示、記録ありの通常表示、両方を確認
```

---

## 6. Founder確認事項

```
□ hero統合方針（renderGreeting拡張 or 新規関数）は実装着手時にコード確認のうえ
  AIが判断してよいか、それともFounder判断が必要か
□ milestone-banner/card-result/card-nextをPhase 3送りとする本文書0節の
  スコープ切り分けに異論がないか
```

---

## 7. 実装着手後に判明した追加事実・スコープ再調整（本文書1回目の更新時に追記）

```
実装（PR-HOME-01コード変更）に着手し、以下2点が当初想定より深い調査を要すると
判明したため、この回はコード変更を行わず本文書の更新のみで留めた:

1. confidence値の欠落:
   home-next-insights.js の findBestInsight() が返す候補オブジェクトには
   main/sub/priorityのみが存在し、confidence値が一切付与されていない
   （PHASE6companion-intelligence分岐でも ci.rankInsightPriorities() が返す
   score/tierを候補へ引き継いでいない）。
   IMPLEMENTATION_PLAN_V1.1出力16 Phase2完了条件の「4段階confidenceLabelと
   3段階CONFIDENCE_LEVELSの語彙統一」を満たすには、CONFIDENCE_LEVELS/
   confidenceLabel関連コードが存在する20ファイル・8ディレクトリ以上
   （domains/signal-insight, domains/knowledge, disease, analytics, home, ai,
   services, modules 等）を横断調査する必要があり、AI_EXECUTION.mdの探索上限
   （3ファイル・3ディレクトリ超で停止）に抵触する。confidence統一は
   PR-HOME-01から切り出し、専用の調査PRとして別途スコープ確定すること。

2. クラス名置換のリスク（Adaptive Calmness機能との衝突）:
   home-next.css の .hn-insight-card / .hn-quick-card 等は、
   #screen-home-next[data-mode="anxious"] / [data-display="gentle"] /
   [data-display="deep"] というAdaptive Calmness機能のCSS条件分岐
   （確認できただけで4箇所、home-next.cssは1400行超のため全量監査は未実施）
   の対象セレクタとして既存クラス名に依存している。
   本文書1〜4節が想定していた「Prototypeのクラス名にそのまま置換する」方針は、
   このAdaptive Calmness機能を壊すリスクがあるため採用しない。

改訂した実装方針:
   クラス名（.hn-insight-card / .hn-quick-card 等）・DOM ID構造は現状維持し、
   その内部の見た目（配色・spacing・kicker badge・カード角丸等）のみを
   Prototypeの値に合わせて更新する「置換」ではなく「restyle」方式に変更する。
   confidence-row相当の表示は、confidence値の統一が別PRで完了するまでは
   追加しない（現状どおり非表示のまま据え置く）。

次PRの現実的なスコープ（PR-HOME-01を以下に縮小）:
   □ home-next-quick-record.js の出力（インラインstyle多用）を
     home-next.css側のクラスベーススタイルへ移し、Prototypeのrecord-strip
     配色・spacingに合わせてrestyle（confidence非依存、低リスク）
   □ home-next-insights.js の出力をPrototypeのcard-insight配色・spacingに
     restyle（confidence-row追加は含めない）
   □ hero/experiment-sectionは本PRから除外し、PR-HOME-02以降へ先送り
     （hero-ring（Day数表示）はExperiment Day-tracking dataの所在確認が
     未実施のため）

別途スコープ確定が必要な項目（PR-HOME-01完了後の候補）:
   ✓ PR-HOME-INSIGHT-CONFIDENCE: confidence値統一 — **完了**。
     `insight-engine.js`が`calcConfidence()`（=`stats-utils.js`の`confidenceLabel()`、
     4段階: high/medium/low/insufficient）で既に各insightへ`confidenceLabel`を
     付与済みと判明。`home-next-insights.js`のfindBestInsight()が
     engine/companion-intelligence経由の候補でこの値を破棄していたのが実体
     （20ファイル規模の再設計は不要だった）。engine由来候補はconfidenceLabelを
     そのまま引き継ぎ、rule-based候補（このファイル内蔵パターン判定）は
     records.lengthを母数にしたconfidenceLabel()フォールバック値を付与するよう
     修正。findBestInsight()をexportしテスト可能化。新規テスト3件PASS。
     表示（confidence-row等の新規マークアップ）はPR-HOME-06 Restyleへ先送り
     （Restyleルール: Logic変更のみ、CSS/HTML変更は含めない）
   □ PR-HOME-02: hero統合（Day-ring含む。Experiment domain側のDay計算
     データソース確認が前提、Phase 3と依存関係の整理が必要）

3. トークン値の実差分確認（restyle方針の妥当性を裏付け）:
   home-next.css の --hn-sage:#B8D8B8 / --hn-ink:#2A2320 /
   card-insight背景rgba(255,255,255,.82) に対し、Prototypeは
   --sage:#8abf9a / --ink:#2d1f1a / .card-insight背景var(--warm-light)
   （白ではなく温かみのあるクリーム系）と、色相・彩度が明確に異なることを確認した。
   restyle対象は妥当だが、--hn-sage/--hn-ink はhome-next.css全体で共有される
   グローバルトークンであるため、値を変更するとinsight-card/quick-card以外の
   全コンポーネント（hero/status/experiment等）にも影響する。
   個別コンポーネントのローカル上書きにするか、グローバルトークン自体を
   Prototype値へ更新する（影響範囲：home-next.css全体、要全量監査）かは
   Design System Freeze文書との整合を含めた判断が必要なため、本PRでは決定せず
   次回の実装セッションで着手時に確定する。

4. ローカル上書き方式の追加リスク（本文書2回目の更新時に追記）:
   .hn-insight-card / .hn-quick-card のみを局所的にrestyleする案を検討したが、
   同一Home画面内でhero/status/experiment/medical-summary等の他カードは
   旧配色（--hn-card-bg: rgba(255,255,255,.82)等）のまま残るため、2種類の
   配色がHome画面内に混在し、Design System Freezeが求める一貫性
   （`docs/PHASE2_GOVERNANCE.md`）にかえって反する可能性が高いと判断した。
   よって本PRでは restyle 実装を行わず、hero/experiment-section（PR-HOME-02）と
   合わせてHome画面のカード全体を一括でrestyleする方針に変更する。
   PR-HOME-01は「Insight Engine/Question Layerの再接続とマークアップ構造の
   整理（配色変更なし）」のみに再スコープし、配色統一は
   PR-HOME-02（hero統合）と同一PRでまとめて実施する。
```

---

This file follows the same design-only, zero-code-change convention as
`PR_REC_03_RUNTIME_INTEGRATION_PLAN.md`. Implementation begins in a separate PR
(PR-HOME-01) once this plan is available for reference.

---

## 8. 実装完了分（forbidden-word-validator接続）

```
本文書3回目の更新時に、配色変更を伴わない安全な単体としてコード変更を実施した:

  - src/modules/home-next/home-next-insights.js
      renderInsights(): findBestInsight()の戻り値(main/sub)を
      validateOutput(text, false)（forbidden-word-validator.js）で検証。
      違反時はcontainer.innerHTML=''でカードごと非表示（他セクションへ影響なし）
  - src/modules/home-next/home-next-recovery.js
      renderExperiment(): generateGentleExperiment()の戻り値(exp.text)を
      同様に検証・違反時非表示

  Tests（新規）:
    - tests/modules/home-next/home-next-insights.test.js（2件）
    - tests/modules/home-next/home-next-recovery.test.js（2件）
    いずれも「禁止パターン含む→非表示」「含まない→通常表示」を検証

  Build: PASS（npm run build、既存の警告のみ・新規エラーなし）
  Browser Verification: 未実施（配色・マークアップ構造は無変更、DOM出力の
    分岐ロジック追加のみのため実機確認は必須ではないが、Founderの判断で
    必要であれば実施する）

  renderRecovery()（#hn-recovery）はPHASE1で無効化済みの6セクションの1つで
  現在描画されないため、本対応の対象外とした（他5セクションも同様に対象外）
```
