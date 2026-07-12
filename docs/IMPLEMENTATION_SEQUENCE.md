# IMPLEMENTATION SEQUENCE
## General Release〜Phase2 実装順序 統合サマリー

---

> **【2026-07-07 追記】** FD-1・FREEZE-FD-1・IMPL-FD-1・IMPL-FD-2・IMPL-FD-3・GRX-FD-3は
> [FOUNDER_FINAL_DECISIONS.md](FOUNDER_FINAL_DECISIONS.md) で確定済み。本文書のStage0/Stage6の
> 記載は「検討中」ではなく「確定済みの決定」として読み替えること。実装ブロッカーはなし
> （最終判定: IMPLEMENTATION READY）。GRX-FD-1/2のみ検証アクションとして継続。
>
> 本文書は [FOUNDER_DECISION_REVIEW_MONETIZATION.md](FOUNDER_DECISION_REVIEW_MONETIZATION.md) /
> [GENERAL_RELEASE_EXPERIENCE_COUNCIL.md](GENERAL_RELEASE_EXPERIENCE_COUNCIL.md) /
> [PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md](PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md) /
> [PHASE2_IMPLEMENTATION_COUNCIL.md](PHASE2_IMPLEMENTATION_COUNCIL.md) に分散していた
> Founder Decision と PR計画を、依存関係に基づき時系列で1本化したものである。
> 新しい決定・設計は行っていない（既存4文書の統合のみ）。

---

## 全体像

```
Stage 0: Founder Decision（コード不要、今すぐ着手可能）
   ↓
Stage 1: General Release 絶対修正（PR-EXP-01・02・04・05）
   ↓
Stage 2: General Release 条件付き修正（PR-EXP-03）
   ↓
Stage 3: 実環境再検証（GRX-FD-1・GRX-FD-2）
   ↓
Stage 4: Release Preparation Council
   ↓
Stage 5: General Release
   ↓
Stage 6: Phase2 Founder Decision
   ↓
Stage 7: Phase2 実装（PR-P2-01〜05）
```

---

## Stage 0 — Founder Decision（今すぐ着手可能、コード変更なし）

以下はすべて Founder の意思決定のみで完結し、他のどのPRからも独立して今すぐ着手できる。

| ID | 内容 | 出典 | 緊急度 | 備考 |
|---|---|---|---|---|
| **FD-1** | 価格をBBS-001（¥980/¥1,980）にするか実装済み（¥580/¥4,800）にするか | Founder Decision Review | **Critical** | PR-EXP-03のスコープに直接影響。最優先で決定すること |
| FD-2 | PRO層をGeneral Release後のPhase2に送るか | 同上 | High | 未決定でもPR-EXP-01〜05の着手は可能（PR-EXP-03は2層のまま進める設計になっている） |
| FD-3 | プラン呼称「Premium」表示を維持するか | 同上 | Low | 実機確認の結果、実際の画面表示は「PRO」だった（IMPL-FD補足）。この事実を踏まえ再確認が望ましい |
| FD-5 | 実地検証の実施タイミング | 同上 | Medium | Stage 3（GRX-FD-1/2）と実質同一の内容。統合して扱ってよい |
| GRX-FD-3 | Research Consent専用UIの要否 | General Release Experience Council | Medium | PR化しない。Settings画面の将来スコープに関わる |
| IMPL-FD-1 | companion-intelligence.js / recommendation-engine.jsをPhase2の実装基盤として再利用するか | Phase2 Implementation Council | High | Phase2 PR-P2-01・02着手の前提条件。Stage 0で決めておくと後続がスムーズ |
| IMPL-FD-2 | tier分離を機能実装より先にやるか後にやるか | 同上 | Medium | PR-P2-05の着手順序に影響するのみ。Stage 5以降まで確定を待ってもよい |

**FD-1のみ Critical。これが確定しないと Stage 2（PR-EXP-03）の価格表示が仮値のまま進むことになる。** それ以外はStage 1の着手を妨げない。

---

## Stage 1 — General Release 絶対修正（依存なし、即着手可）

[PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md](PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md) 第4章の再判定により、以下4件はPhase2構想と無関係であることが確認済みであり、他のFounder Decisionを待たずに並行着手できる。

| PR | 内容 | Release Risk | 備考 |
|---|---|---|---|
| **PR-EXP-01** | ボトムナビ4アイコンの描画復旧 | 低 | `src/app-legacy.js` の`initNavIcons()`呼び出しタイミング修正 |
| **PR-EXP-02** | Insightsヒーローのモバイルレイアウト修正 | 低〜中 | `src/screens/insights.html` のCSS修正。**Stage 7のPhase2カード追加より必ず先に完了させること**（崩れたレイアウトの上にカードを積むと複合的に崩れるため） |
| **PR-EXP-04** | Home週間行の日付・記録表示復旧 | 低 | `src/modules/home-renderer.js` |
| **PR-EXP-05** | ボトムナビラベル・Premium下部余白の軽微調整 | 低 | CSSのみ |

この4件は並行実装・独立検証が可能。実装順序に制約はない。

---

## Stage 2 — General Release 条件付き修正

| PR | 内容 | 依存 | Release Risk |
|---|---|---|---|
| **PR-EXP-03** | Premium画面のヒーロー（価格・比較表・CTA）復旧 | FD-1が理想（未決定でも実装済み価格の仮表示で着手可）。スコープは[PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md](PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md)第5章の限定版（3層tier比較表は作らない、2層のまま） | **高**（収益機能の入口） |

FD-1が未決定のままでも「実装済み価格を暫定表示し、後で差し替え可能な実装にする」という設計で着手できるが、Founderの意思決定を待ってから着手する方が手戻りは少ない。

**追記（[PHASE2_ARCHITECTURE_FREEZE.md](PHASE2_ARCHITECTURE_FREEZE.md)より）**: PR-EXP-03の実装者は、価格・CTA文言をハードコードせず設定値参照方式にすること。Phase2でtier名称が再定義される（FREEZE-FD-1）際に手戻りを避けるため。

---

## Stage 3 — 実環境再検証

Supabase認証情報のある環境（staging等）で、以下をFounderまたは開発者が再検証する。**コードでは確認できない事項のため、テストという形の実行が必要。**

| ID | 検証内容 |
|---|---|
| GRX-FD-1 | オンボーディング「はじめる」ボタンからの自然な遷移、疾患選択後のHome画面表示 |
| GRX-FD-2 | `premiumGate()` クリック時に実際のモーダル・Stripe Checkout導線が機能するか |

この2点は、Stage 1・2の修正が本物のバグかどうかを最終確認する意味も持つ（本セッションのテスト環境はSupabase未接続だったため）。

---

## Stage 4 — Release Preparation Councilへの進行判定

[GENERAL_RELEASE_EXPERIENCE_COUNCIL.md](GENERAL_RELEASE_EXPERIENCE_COUNCIL.md) が定めた進行条件:

```
1. PR-EXP-01・02・03（絶対修正3件）の実装・Browser Verification完了
2. GRX-FD-1（実環境再検証）の実施
3. GRX-FD-2（premiumGate実際の挙動確認）の結果、追加のBusiness Logic修正が
   不要と確認されること
```

PR-EXP-04・05は推奨だが必須条件ではない。この3条件が揃った時点でRelease Preparation Councilへ進む。

---

## Stage 5 — General Release

Stage 4を通過した時点でGeneral Releaseを実施する。Phase2の着手はGeneral Release後を基本とする（[PHASE2_IMPLEMENTATION_COUNCIL.md](PHASE2_IMPLEMENTATION_COUNCIL.md)最終判定）。

---

## Stage 6 — Phase2 Founder Decision（Stage0で未決定の場合はここで確定必須）

| ID | 内容 |
|---|---|
| IMPL-FD-1 | companion-intelligence.js / recommendation-engine.js の再利用可否（未確定ならここで確定必須） |
| IMPL-FD-2 | tier分離の実施順序（未確定ならここで確定必須） |
| IMPL-FD-3 | Research Contribution Badgeの開示粒度（PR-P2-04着手前に確定） |
| IMPL-FD-4 | Phase3着手条件（BD-026 k≥50・5疾患）の監視主体 |
| **FREEZE-FD-1**（新規） | tier名称の再定義 — 既存「PRO」表示をSTARTER相当／PROどちらの新層に割り当てるか（PR-P2-05着手条件、[PHASE2_ARCHITECTURE_FREEZE.md](PHASE2_ARCHITECTURE_FREEZE.md)参照） |

---

## Stage 7 — Phase2実装

| PR | 内容 | 依存 |
|---|---|---|
| **PR-P2-01** | hn-experiment-card実装（Home） | IMPL-FD-1確定後 |
| **PR-P2-02** | ins-question-card実装（Insights） | IMPL-FD-1確定後。P2-01と同じcompanion-intelligence.js接続作業を共有するため、P2-01の直後に着手するのが効率的 |
| **PR-P2-03** | ins-trend-cards（全件）/correlation-chart/medical-reportのタブ統合 | 既存ロジック活用のため独立着手可能（Founder Decision不要） |
| **PR-P2-04** | Research Contribution Badge | IMPL-FD-3確定後 |
| **PR-P2-05** | tier分離（isPremium()→getTierLevel()拡張）+ Premium比較表UI | IMPL-FD-2が「機能を先に作る」順序を選んだ場合、PR-P2-01〜04の後に着手 |

---

## 依存関係グラフ（要約）

```
FD-1 ──────────────────────────────┐
                                    ▼
PR-EXP-01 ─┐                   PR-EXP-03 ──┐
PR-EXP-04 ─┼─→ 並行実装可      　　　　　　  ├─→ GRX-FD-1/2（実環境検証）──→ Release Preparation Council ──→ General Release
PR-EXP-05 ─┘                                │                                                                    │
PR-EXP-02 ─┴────────────────（Phase2より先に完了必須）                                                            │
                                                                                                                   ▼
                                                                          IMPL-FD-1・IMPL-FD-2（Phase2着手前に確定）
                                                                                    │
                                                    ┌───────────────────────────────┼───────────────────┐
                                                    ▼                               ▼                   ▼
                                              PR-P2-03（独立）              PR-P2-01→PR-P2-02      IMPL-FD-3確定
                                                                                                          │
                                                                                                          ▼
                                                                                                     PR-P2-04
                                                                                                          │
                                                                                    IMPL-FD-2の順序決定に従い
                                                                                                          ▼
                                                                                                     PR-P2-05
```

---

## 今すぐ着手できるものだけを最短でやるなら

```
1. Founder: FD-1を決定する（他の何よりも先に）
2. 並行実装: PR-EXP-01・02・04・05（Founder Decision不要、今すぐ着手可）
3. PR-EXP-03（FD-1確定後、またはFD-1未決定なら暫定価格で着手）
4. Founder + 開発者: 実環境（Supabase接続）でGRX-FD-1・GRX-FD-2を検証
5. Release Preparation Councilへ
```

Phase2（Stage 6・7）はGeneral Release後でよく、今すぐ着手する必要はない。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-IMPL-SEQ-001 |
| **作成日** | 2026-07-07 |
| **前提文書** | FOUNDER_DECISION_REVIEW_MONETIZATION.md / GENERAL_RELEASE_EXPERIENCE_COUNCIL.md / PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md / PHASE2_IMPLEMENTATION_COUNCIL.md |
| **性質** | 統合サマリーのみ。新規の決定・設計は行っていない |
| **次回改訂トリガー** | 各Stageの完了時 |
