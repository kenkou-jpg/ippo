# PHASE2 EXPERIENCE INTEGRATION COUNCIL
## General Release修正 vs Phase2前提の再設計 — 判断会議

---

> **文書権威レベル: LEVEL-1 STRATEGIC DOCUMENT**
>
> [GENERAL_RELEASE_EXPERIENCE_COUNCIL.md](GENERAL_RELEASE_EXPERIENCE_COUNCIL.md) が提案した
> PR-EXP-01〜05 は、実装着手前に本 Council によって一旦停止された。
> 本 Council の目的は「General Release 画面をそのまま修正すべきか、
> Phase2構想（Experiment Suggestion / Question Layer / Research Contribution Badge /
> PRO層tier分離 / Similarity Match / Pattern Search / AI Insights拡張）を前提に
> 再設計すべきか」を判断することであり、**コード変更・実装は一切行わない**。

---

**文書番号:** IPPO-PHASE2-INT-001
**開催日:** 2026-07-07
**前提文書:** GENERAL_RELEASE_EXPERIENCE_COUNCIL.md / MONETIZATION_COUNCIL_REPORT.md / docs/business/（MONETIZATION_FRAMEWORK / FREE_PRO_BOUNDARY / VALUE_LADDER / PAYWALL_STRATEGY / MONETIZATION_ROADMAP）/ APP_EXPERIENCE_FRAMEWORK.md / PRO_INSIGHT_ARCHITECTURE.md
**検証方法:** 既存4 Council文書の再読解 + 対象モジュールの構造確認（`src/modules/experiments.js` の実装範囲、`app.html` premium画面の実表示文言）。新規のブラウザ操作検証は行っていない（前回Councilの実機所見をそのまま根拠として使用）。

---

## 第1章 Council開催の経緯

前回の General Release Experience Council は、実機検証によって3件の「絶対修正」（ボトムナビアイコン欠落・Insightsヒーローのレイアウト崩れ・Premium画面の価格/CTA不在）を発見し、PR-EXP-01〜05という実装設計を提示した。しかし、この設計は「今動いているものを直す」という視点のみで行われており、Monetization CouncilとApp Experience Councilが既に描いていたPhase2以降の構想（Experiment Suggestion・Question Layer・Research Contribution Badge・PRO層tier分離・Similarity Match・Pattern Search・AI Insights拡張）が、これらの画面にどう影響するかを十分に検討していなかった。

これを放置すると、Founderが「General Releaseのための小さな修正」として承認したPRが、数ヶ月後のPhase2で無駄になる、あるいはPhase2の設計と矛盾する形で固定化されるリスクがある。本 Council はこのリスクを排除するために開催された。

---

## 第2章 判断の基準

各画面・各PRについて、以下の4分類のいずれかに位置づける。

```
分類1: 今すぐ修正すべきもの
  → Phase2の構想が実装されても、この部分の構造・役割は変わらない。
    修正を先送りする理由がない。

分類2: Phase2で置き換わるため今直すべきでないもの
  → Phase2の実装によって、この部分そのものが不要になる、または
    まったく別の構造に置き換わることが既存文書から確認できる。

分類3: General Releaseには残すが最小修正でよいもの
  → 現状の設計のままGeneral Releaseとして出荷して問題ない。
    大掛かりな修正は不要で、コピーの追加程度に留める。

分類4: Phase2設計に合わせて再設計すべきもの
  → まだ存在しない機能（Phase2で新規に作られるもの）であり、
    「直す」のではなく「新たに設計する」対象。今回のPR化はしない。
```

重要な前提として、Council は既存の4文書（[MONETIZATION_ROADMAP.md](business/MONETIZATION_ROADMAP.md) 第2章、[VALUE_LADDER.md](business/VALUE_LADDER.md) 第2章、[PRO_INSIGHT_ARCHITECTURE.md](PRO_INSIGHT_ARCHITECTURE.md) 第7章の Injection Points 表）を精査した結果、**Phase2の機能追加はいずれも既存画面へのDOM要素の「追加」であり、既存要素の「置き換え」ではない**ことを確認した。Question Layer（`ins-question-card`）、相関グラフ（`ins-correlation-chart`）、実験提案（`hn-experiment-card`）、傾向アラートは、いずれも既存の Injection Point 表にあらかじめ空き枠として定義された新規カードであり、Home の CTA・週間行、Insightsのヒーロー、Premiumの価格/CTAといった既存要素を置き換える設計にはなっていない。この事実が、以降の判断の土台になる。

---

## 第3章 画面別監査

### Home

CTA（今日を記録する/振り返る）と週間記録行は、Phase2で追加される `hn-experiment-card`（実験提案カード）とは別のDOM領域であり、既存要素として維持される。週間行の日付・記録表示欠落は、Phase2の有無に関わらず存在する不具合であり、Phase2実装後もこの部分の役割は変わらない。→ **分類1**。Home Empty Stateのガイダンス文言不足は軽微なコピー追加であり、Phase2を待つ理由がない一方、必須修正でもない。→ **分類3**。hn-experiment-card自体（実験提案のUI）はまだ存在しない機能であるため、今回設計・実装する対象ではない。→ **分類4**。

### Insights

ヒーロー（挨拶・見出し・リード文・PROへの入口ボタン）は、`PRO_INSIGHT_ARCHITECTURE.md` の Injection Point 表には含まれておらず、Phase2で追加される `ins-trend-cards`（全件）・`ins-question-card`・`ins-correlation-chart`・`ins-medical-report` とは独立した既存領域である。ヒーローのレイアウト崩れは、Phase2実装後もそのまま残る不具合であり、修正を待つ理由がない。→ **分類1**。ただし、Phase2でカードが増えることで画面全体のスクロール量・情報密度が変わるため、画面全体のレイアウト再点検はPhase2着手時に別途行うべきである。→ この「将来の再点検」自体は**分類4**（Question Layer/相関グラフの新規カードデザインとセットで設計すべき）。

### Premium

現在の実装を再確認したところ、画面ヘッダーの実際の表示文言は「PRO」であり（`app.html` 687行 `<div class="settings-title">PRO</div>`）、[MONETIZATION_FRAMEWORK.md](business/MONETIZATION_FRAMEWORK.md) が想定していた表示名「Premium」とも異なっていた。画面内のカードは「AIパターン解析」「フレアアップ分析」「要因効果レポート」「周期フェーズ分析」「からだサマリー」「月次レポートPDF」「体温パターン解析」「ヘルス実験」「デバイス間同期」の9件、**すべてが単一の「PRO」バッジ**で統一されている。これは Monetization Council が確認した「実装は2層（FREE + 単一の有料層）のみで、3層目のtier分離は未実装」という事実（[FREE_PRO_BOUNDARY.md](business/FREE_PRO_BOUNDARY.md) 第3章）と整合しており、**Premium画面の構造自体は現時点で2層構成として一貫している**。つまりPhase2のPRO層tier分離が実装されるまでは、この画面の「全部PROバッジ」という表示は誤りではなく現状の正確な反映である。

したがって、Premium画面が抱える問題は「Phase2を先取りして直すべきかどうか」ではなく、「今ある2層構成の中で、価格とCTAボタンが単純に描画されていない」という純粋な実装欠陥である。→ **分類1**、ただし価格の具体的な数値は [FOUNDER_DECISION_REVIEW_MONETIZATION.md](FOUNDER_DECISION_REVIEW_MONETIZATION.md) FD-1が未確定であるため、修正の実施方法には注意が必要（第4章で詳述）。将来、Phase2でPRO層tier分離が実装された時点で、この画面は「STARTER相当のPROバッジ」と「本当のPRO」を区別する再設計が必要になる。→ その再設計自体は**分類4**であり、今回のスコープではない。

### Record

Phase2構想（Experiment Suggestion・Question Layer・Research Contribution Badge・PRO層・Similarity Match）のいずれも Record 画面（3カード記録フロー）に影響しない。この画面は疾患・症状・気分の記録そのものであり、Free層の中核行動として今後も変わらない。→ **分類3**（現状維持、修正不要）。

### Calendar

Phase2で追加される `cal-day-insight-dot`・`cal-phase-banner`（`PRO_INSIGHT_ARCHITECTURE.md` Injection Point [I][J]）は、既存のカレンダー表示に追加される装飾要素であり、カレンダーの基本構造（月表示・月相・凡例）を置き換えない。現状のCalendar画面に不具合は見つかっていない。→ **分類3**（現状維持）。将来のドット/バナー追加自体は**分類4**。

### Settings

Research Consent UIの不在は、Phase2の機能追加とは独立した論点であり、Business Logic領域のFounder Decision（GRX-FD-3）としてすでに切り離されている。Phase2構想の実装がSettings画面の構造を変える予定は、既存文書のどこにも記載がない。→ **分類3**（現状維持、Founder Decision待ち）。

### Navigation

ボトムナビの5要素構成（ホーム・カレンダー・記録FAB・インサイト・設定）は、[GENERAL_RELEASE_SCREEN_MAP.md](GENERAL_RELEASE_SCREEN_MAP.md) が確認した通り、Phase2でも新規タブ・新規画面は追加されない（Phase2機能はすべて既存画面内へのカード追加）。ボトムナビアイコンの欠落・ラベル折り返りは、Phase2の実装後もそのまま残る不具合である。→ **分類1**（両方とも）。

### Paywall

Paywallの配置原則（[PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md)）自体は、Phase2でトリガー箇所が増える（Question Layer・相関グラフ等が新たにロック対象になる）だけで、既存のゲート機構（`isPremium()`）を土台として拡張される設計であり、原則そのものの置き換えは想定されていない。[FREE_PRO_BOUNDARY.md](business/FREE_PRO_BOUNDARY.md) 第5章が明記する通り、Phase2のtier分離は `isPremium()` を `getTierLevel()` に**拡張**するものであり、既存の「Free vs 有料」の二値判定を破棄するものではない。したがって、現在のPremium画面のCTA/価格表示の不具合を今直すことは、Phase2の拡張と矛盾しない。→ **分類1**。

### Experiment導線

`src/modules/experiments.js` を実際に確認したところ、707行の実装があり、`openExperiments()`・`startExperiment()`・`startCustomExperiment()`・`cancelExperiment()`・`completeExperiment()`・`showExperimentReport()`、さらに `_buildAIResultReport()` という結果レポート生成関数まで備えていることを確認した。これは FEATURE_INVENTORY.md が「⚠️ 基礎実装済み」と評価していたよりも実装が進んでいる。

現状の実験機能は「ユーザーが自分で仮説を立てて開始し、自分で結果を確認する」という**自己主導型**の設計であり、これは `BUSINESS_STRATEGY.md` 4-B が Pro Plan の価値として説明する「Experiment管理（介入記録）」の範囲を満たしている。Phase2で追加される Experiment Suggestion は、「AIが次に何を試すべきか提案する」という**能動的な提案層**であり、既存の自己主導型フローを置き換えるのではなく、その手前に新しい入口を追加するものである。したがって、現状の実験機能はGeneral Releaseにそのまま出荷して問題ない。→ **分類3**。Experiment Suggestion（提案エンジン）自体は影も形もない新規機能であり、「直す」のではなく「新たに設計する」対象である。→ **分類4**。

### AI導線

Signal Insight（`home-insight-engine.js`）と `modules/pro/` 配下の各種レポート（相関・周期・体温・フレアアップ・月次）は、既存の実装として確認済みであり、Phase2の対象ではない。Insightsヒーローの「今日のあなたへ、ひとつの気づきを。」も、既存のルールベースAI（`PRO_INSIGHT_ARCHITECTURE.md` の Rule-based first原則）が生成する既存機能であり、そのレイアウト崩れはPhase2と無関係な既存の不具合である。→ **分類1**。Question Layer（対話的な問いかけ）・相関グラフのUI・傾向アラートは、まだ存在しない新規のAI導線であり、Phase2で新たに設計されるべきものである。→ **分類4**。

---

## 第4章 PR-EXP-01〜05 再判定

| PR | 内容 | 再判定 | 理由 |
|---|---|---|---|
| **PR-EXP-01** | ボトムナビ4アイコンの描画復旧 | **Proceed** | Navigation構造はPhase2で変わらない。Phase2の有無に関係なく必要な修正 |
| **PR-EXP-02** | Insightsヒーローのモバイルレイアウト修正 | **Proceed** | ヒーローはPhase2の新規カード（Question Layer等）とは独立したDOM領域。修正を待つ理由がない |
| **PR-EXP-03** | Premiumヒーロー（価格・比較表・CTA）復旧 | **Modify** | 画面の2層構成自体はPhase2と矛盾しないため修正は進めるべきだが、スコープを「描画メカニズムの復旧」に厳密に限定し、価格の確定値はFD-1決定まで確定表示にしないこと。3層目（本当のPRO）の比較表は作らない（Phase2で再設計対象のため） |
| **PR-EXP-04** | Home週間行の日付・記録表示復旧 | **Proceed** | Phase2のhn-experiment-cardとは別領域。既存不具合を直すのみ |
| **PR-EXP-05** | ボトムナビラベル・Premium下部余白の軽微調整 | **Proceed** | Phase2でPremium画面のカード数が増えるため、下部余白の是正はむしろ今のうちに直しておく方が望ましい |

**結論: PR-EXP-01・02・04・05は無条件でProceed。PR-EXP-03のみ、スコープを限定した上でProceed（Modify）とする。Defer・Cancelに該当するPRは無かった。** これは、[GENERAL_RELEASE_EXPERIENCE_COUNCIL.md](GENERAL_RELEASE_EXPERIENCE_COUNCIL.md) が発見した3件の絶対修正が、いずれも「Phase2で置き換えられる部分」ではなく「Phase2の追加物とは独立した、既存の壊れた基盤」であったことを意味する。

---

## 第5章 PR-EXP-03の修正版スコープ（Modify の具体化）

```
含める:
  ✓ #pro-hero の描画メカニズムの復旧（なぜ空のままレンダリングされるかの調査・修正）
  ✓ 現在実装済みの単一有料プラン（"PRO"、価格は実装済み値をそのまま暫定表示）向けの
    価格・CTAボタンの表示
  ✓ 「PRO」という実際の表示文言を正とする（MONETIZATION_FRAMEWORK.mdが暫定的に
    使っていた「Premium」という呼称は、実装済みのUI文言と異なることが判明したため、
    本PRでは実装済みの「PRO」表示に合わせる。呼称統一の要否はFD-3として別途扱う）

含めない（Phase2対象、今回は着手しない）:
  ✗ 3層（FREE/STARTER/PRO相当）の比較表UI
  ✗ tier分離ロジック（isPremium()の3値化）
  ✗ Research Contribution Badge等、Phase2機能への言及

価格の扱い:
  FOUNDER_DECISION_REVIEW_MONETIZATION.md FD-1が未決定のため、
  実装済み価格（¥580/¥4,800）を暫定表示し、FD-1決定後に差し替え可能な
  実装（ハードコードではなく設定値参照）にすること。
```

---

## 第6章 総括表

| 画面/機能領域 | 分類 |
|---|---|
| Home（CTA・週間行） | 1（今すぐ修正） |
| Home（Empty Stateガイダンス） | 3（最小修正） |
| Home（hn-experiment-card） | 4（Phase2で新規設計） |
| Insights（ヒーロー） | 1（今すぐ修正） |
| Insights（Question Layer/相関グラフ等） | 4（Phase2で新規設計） |
| Premium（価格・CTA描画） | 1（今すぐ修正、スコープ限定） |
| Premium（3層tier比較表） | 4（Phase2で新規設計） |
| Record | 3（現状維持） |
| Calendar（既存表示） | 3（現状維持） |
| Calendar（PRO装飾要素） | 4（Phase2で新規設計） |
| Settings | 3（現状維持、Founder Decision待ち） |
| Navigation | 1（今すぐ修正） |
| Paywall配置原則 | 1（既存原則のまま適用、修正は進める） |
| Experiment導線（既存の自己主導フロー） | 3（現状維持） |
| Experiment Suggestion（AI提案） | 4（Phase2で新規設計） |
| AI導線（既存Signal Insight/レポート） | 1（バグは今すぐ修正） |
| AI導線（Question Layer等新規） | 4（Phase2で新規設計） |

分類2（Phase2で置き換わるため今直すべきでない）に該当する項目は、今回の監査では**一件も存在しなかった**。これは、General Release Experience Councilが発見した不具合がいずれも「Phase2に先送りすべきほど暫定的な実装」ではなく、「今の設計のまま直すべき恒久的な基盤」であったことを示している。

---

## 最終判定

```
PR-EXP-01・02・04・05: そのまま進める（Proceed）
PR-EXP-03: スコープを限定して進める（Modify、第5章の修正版スコープに従う）
Defer・Cancelとなった項目: なし

新しいPR計画: 不要。既存のPR-EXP-01〜05計画を、上記の再判定・スコープ限定を
反映した形でそのまま採用する。追加のPRは今回発生しない
（Phase2機能の新規設計は、Phase2着手時に別途Councilを開催して行う）。
```

Council は、[GENERAL_RELEASE_EXPERIENCE_COUNCIL.md](GENERAL_RELEASE_EXPERIENCE_COUNCIL.md) の実装計画を、PR-EXP-03のスコープ限定という1点の修正を加えた上で、そのまま実行に移すことを推奨する。Phase2構想（Experiment Suggestion・Question Layer・Research Contribution Badge・PRO層tier分離・Similarity Match・Pattern Search・AI Insights拡張）は、今回のいずれのPRとも構造的に衝突しないことを確認したため、実装再開を妨げる理由はない。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-PHASE2-INT-001 |
| **作成日** | 2026-07-07 |
| **権威レベル** | LEVEL-1 STRATEGIC DOCUMENT |
| **前提文書** | GENERAL_RELEASE_EXPERIENCE_COUNCIL.md / MONETIZATION_COUNCIL_REPORT.md / docs/business/* / PRO_INSIGHT_ARCHITECTURE.md |
| **コード変更** | ゼロ（設計判断のみ） |
| **判定結果** | PR-EXP-01・02・04・05 Proceed / PR-EXP-03 Modify（スコープ限定） |
| **次回改訂トリガー** | PR-EXP-01〜05実装完了時 / Phase2着手Council開催時 |

---

**PHASE2 EXPERIENCE INTEGRATION COUNCIL — 議決完了 2026-07-07**
**最終判定: PR-EXP-01〜05は第5章のスコープ限定を反映の上、実装再開可**
