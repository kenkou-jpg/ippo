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

This file follows the same design-only, zero-code-change convention as
`PR_REC_03_RUNTIME_INTEGRATION_PLAN.md`. Implementation begins in a separate PR
(PR-HOME-01) once this plan is available for reference.
