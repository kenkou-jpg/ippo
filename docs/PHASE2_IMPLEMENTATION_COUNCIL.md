# PHASE2 IMPLEMENTATION COUNCIL
## Phase2完成体験・実装設計 最終統合会議

---

> **文書権威レベル: LEVEL-1 STRATEGIC DOCUMENT**
>
> 本 Council は「Phase2で何を実装するか」ではなく、
> **「Phase2終了時にユーザーがどんな体験をしているべきか」を完成形として設計し、
> その完成形から逆算して Phase2 の実装設計を導く**。
> General Release → Phase2 → Phase3 → Phase4 → Final までの一貫した体験を描く。
> **実装・コード変更は一切行っていない。**

---

**文書番号:** IPPO-PHASE2-IMPL-001
**開催体:** Founder × Product Designer × Mobile UX Specialist × Interaction Designer × Information Architect × Behavioral Designer × SaaS Founder × Product Strategist × Growth Lead × Customer Representative × AI Experience Designer × Data Product Architect
**開催日:** 2026-07-07
**前提文書:** GENERAL_RELEASE_EXPERIENCE_COUNCIL.md / PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md / MONETIZATION_COUNCIL_REPORT.md / APP_EXPERIENCE_FRAMEWORK.md / docs/business/*（5文書）/ USER_JOURNEY.md / GENERAL_RELEASE_SCREEN_MAP.md / PRO_INSIGHT_ARCHITECTURE.md / FEATURE_INVENTORY.md / BUSINESS_STRATEGY.md / GROWTH_STRATEGY.md
**検証方法:** 既存15文書の再読解、および Phase2実装に転用可能な既存資産の実コード確認（`src/services/recommendation-engine.js` 504行・`src/services/companion-intelligence.js` 485行の実装範囲・実際の呼び出し元）。新規のブラウザ操作検証は行っていない。

---

## Executive Summary

### 最重要発見: Phase2は「ゼロから作る」のではなく「眠っている資産を起こす」

Council が本会議の準備として既存コードを確認した結果、Phase2で新規開発すると想定されていた「Question Layer」「Experiment Suggestion」に相当する機能ロジックが、すでに `src/services/companion-intelligence.js`（`generateGentleSuggestion()` / `generateReflections()` / `rankInsightPriorities()`）と `src/services/recommendation-engine.js`（`getRecommendations()` / `getAdaptiveCopy()` / `getInsightDensity()`）に実装済みであることを発見した。

しかし、この2つのサービスは現在ほぼ死蔵状態にある。`generateGentleSuggestion()` 等の主要な呼び出し元は `src/modules/home-next/home-next-reflections.js` であり、この `home-next` 系統は `app.html` / `main.js` のいずれからもimportされておらず、過去の PR-092A-1（home-next実態調査）で確認された「並行して存在するが有効化されていない実装」の一部である。唯一の生きた呼び出し元は `src/modules/experiments.js`（`window.getRecommendations()` を条件付きで呼ぶ）のみであり、Home/Insightsの本番描画パス（`home-insight-engine.js`、PRO_INSIGHT_ARCHITECTURE.mdの `DerivedInsight` 系統）とは接続されていない。

**この発見はPhase2の設計・実装コストの前提を大きく変える。** Phase2の「Question Layer」「Experiment Suggestion」は、AIエンジンを新規開発するタスクではなく、**既存の `companion-intelligence.js` / `recommendation-engine.js` を本番描画パスに正しく接続し、UIとして表現するタスク**として設計し直すべきである。本文書の実装設計はこの前提に基づく。

### 8つの最重要テーマへの回答（要約）

| # | テーマ | Council回答 |
|---|---|---|
| ① | 毎日使いたい体験か | Phase2終了時点で「Yes」となるためには、Experiment Suggestionが「押し付け」ではなく「小さな好奇心」として機能する設計が必須（第7章参照） |
| ② | 記録の負荷・離脱 | Record画面は Phase2〜Finalを通じて一切変更しない（第2章「進化しない画面」の設計思想） |
| ③ | 視覚的情報量 | Home/Insightsとも要素数に上限（Homeは5、Insightsのトップは3）を設け、増加分は折りたたみ/タブで吸収する（第9章） |
| ④ | 疲労感 | 色・アニメーション・通知はGROWTH_STRATEGY.md 6-Cの既存原則（週1回サマリー、圧のない通知）をPhase2以降も継承する（第10章） |
| ⑤ | Premiumへの自然な進行 | Value Ladderの「③改善」の穴を埋めることで、STARTER→PRO転換が「機能の比較」ではなく「体験の連続」になる（第6章） |
| ⑥ | AIが主役になっていないか | 生成された示唆はすべて「問い」の形を取り、断定を避ける。ユーザーの気づきをAIが代弁しない設計を徹底する（第11章） |
| ⑦ | 機能同士の自然な接続 | Experiment Suggestion → Question Layer → Similarity → Research Contributionは、単一の「気づきカード」を起点に段階的に開示される一本のチェーンとして設計する（第7章） |
| ⑧ | レイアウトを壊さない進化 | 全てのPhase2〜4要素は既存Injection Point（PRO_INSIGHT_ARCHITECTURE.md）への「追加」であり、既存要素の位置・役割は変えない（第3章） |

---

## 第1章 Final Vision（完成形の定義）

10年後、General Releaseから積み上げられたIPPOの完成形は次のように描写できる。

```
ユーザーがIPPOを開くと、今日の自分の状態がすぐに分かる。
記録すれば、静かな気づきが返ってくる。
時々AIが小さな問いを投げかけ、試してみたくなる一歩をそっと提案する。
自分と似たパターンを持つ人が存在することを感じられる。
自分の記録が、女性疾患の研究に確かに繋がっている実感がある。

そこに派手さはなく、押し付けもなく、
毎日開いても疲れることがない。

それを、Founderがたった一人で、10年間守り続けている。
```

この完成形は、BUSINESS_STRATEGY.md（「データ資産を育てる会社」）・GROWTH_STRATEGY.md（「記録を続けるユーザーが自然に増え続ける仕組み」）・VALUE_LADDER.md（記録→理解→改善→習慣化→資産化）という既存の3つの思想の交点として導かれるものであり、本 Council が新たに発明したものではない。本文書の役割は、この交点を「画面設計」という具体に翻訳することである。

### Final Visionを支える3つの設計原則

**原則1: 骨格は増えない、中身だけが深化する。** 7画面・5タブという構成は、GA時点からFinalまで一切変わらない（[GENERAL_RELEASE_SCREEN_MAP.md](GENERAL_RELEASE_SCREEN_MAP.md)がすでに確認した通り、Phase2以降の機能追加は既存画面への追加であり新規画面の新設ではない）。10年間タブが増えないことは「使い方を覚え直さなくていい」という信頼の源泉になる。

**原則2: AIは主役ではなく、静かな伴走者である。** すべてのAI生成物は「問い」または「事実の提示」であり、「答え」や「診断」ではない。これはREGULATORY_MEDICAL_COUNCIL.md BD-031・BD-044という医療安全上の制約と完全に一致するが、本Councilはこれを「規制だから守る」のではなく「ユーザー自身が発見する体験こそが継続動機になる」という体験設計上の理由からも支持する。

**原則3: 進化は追加であり、破壂ではない。** 既存の要素（Home CTA、Insightsヒーロー、Record 3カード、Calendar月表示）は、Phase2以降も物理的に同じ場所に存在し続ける。新しい要素は必ずその「隣」か「下」に追加され、既存要素を置き換えたり移動させたりしない。

---

## 第2章 画面別 Screen Evolution（GA → Phase2 → Phase3 → Phase4 → Final）

### Home

| Phase | 状態 |
|---|---|
| General Release | CTA（記録する/振り返る）・週間記録行・状態カード4枚・疾患別ヒーローメッセージ・今日のインサイト1件（Free） |
| Phase2 | 上記に加え `hn-experiment-card`（週1回、PRO、「今週試してみること」）を最下部に追加。要素数上限5を維持するため、状態カードとインサイトカードは統合表示に整理する余地を検討 |
| Phase3 | 状態カードの1枚が「同疾患グループ内での自分の位置」に拡張されうる（BD-026 Phase3完了条件達成後のみ） |
| Phase4 | Clinic連携が有効なユーザーには「かかりつけ医と共有中」バッジが状態カード群の末尾に追加される |
| Final | 骨格（CTA→気づき→状態→週間）は不変。表示される中身の知性だけが10年かけて深化する |

### Record

| Phase | 状態 |
|---|---|
| General Release | 3カード入力フロー（体調→症状→気持ち）、Free全機能 |
| Phase2 | 変更なし |
| Phase3 | 変更なし |
| Phase4 | 変更なし |
| Final | **唯一「意図的に進化させない」画面。** 記録という行為の神聖さ・摩擦ゼロ原則（BUSINESS_STRATEGY.md 5-A）を10年間守り抜くことが、この画面の完成形である |

### Calendar

| Phase | 状態 |
|---|---|
| General Release | 月表示・月相アイコン・曜日色分け・凡例・「今日」ジャンプ |
| Phase2 | `cal-day-insight-dot`（痛みピーク日マーク）・`cal-phase-banner`（周期フェーズ帯）をPRO要素として追加 |
| Phase3 | 同疾患グループの一般的パターンとの重ね合わせ表示（Similarity Match条件達成後） |
| Phase4 | Clinic連携時、「次回受診まであとX日」等の医療連携要素 |
| Final | カレンダーは「自分の物語を映す鏡」であり続ける。レイヤーは増えるが、月を見る・振り返るという基本行為は変わらない |

### Insights

| Phase | 状態 |
|---|---|
| General Release | ヒーロー（挨拶＋気づき1件）・観察サマリー（Free）・PRO導線ボタン |
| Phase2 | 既存4つの空きInjection Point（`ins-trend-cards`全件・`ins-question-card`・`ins-correlation-chart`・`ins-medical-report`）を埋める |
| Phase3 | Similarity Match・Pattern Searchカードを追加（BD-026条件付き） |
| Phase4 | Disease Intelligence Model連携による予測的インサイト（将来技術、本文書では設計しない） |
| Final | 「今日の気づき1件」という核（ヒーロー）は不変。周辺のPRO要素が階層的に深化し、Insightsは「浅い気づき」から「深い自己理解」までの1つの導線として完成する |

### Premium

| Phase | 状態 |
|---|---|
| General Release | 単一有料層（表示名「PRO」）の機能showcase（9カード）。価格/CTA復旧はPR-EXP-03で対応中 |
| Phase2 | tier分離（STARTER/PRO 2段階）実装、プラン比較表UI追加、Phase2新機能カードの追加 |
| Phase3 | Similarity/Pattern機能カードの追加（条件付き） |
| Phase4 | Research Contribution実績の提示（「あなたのデータが研究に使われました」）、Clinic連携の企業向け案内 |
| Final | 個人向け2プラン＋研究貢献の可視化＋医療連携の入口、という構造が完成する |

### Settings

| Phase | 状態 |
|---|---|
| General Release | 疾患設定・目標・表示スタイル・通知・バックアップ/CSV・フィードバック・About・医療免責文言 |
| Phase2 | Research Consent専用UIの追加（GRX-FD-3のFounder判断次第）、AI利用同意の明示 |
| Phase3 | Similarity参加設定（匿名比較への参加可否のオプトイン/アウト） |
| Phase4 | Clinic共有設定（医師とのデータ共有オンオフ） |
| Final | Consentが完全に透明化され、「何がどう使われているか」をユーザーが常に自分で確認できる状態が完成する |

### Navigation

| Phase | 状態 |
|---|---|
| General Release | 5要素（ホーム・カレンダー・記録FAB・インサイト・設定）、アイコン修復対応中（PR-EXP-01） |
| Phase2〜Final | **一切変更しない。** 10年間タブを増やさないことそのものが設計思想である |

---

## 第3章 Phase2画面設計（Injection Point単位）

`PRO_INSIGHT_ARCHITECTURE.md` 第7章がすでに定義した8つのUI Injection Pointのうち、Phase2で新たに埋めるのは以下の5点である。既存要素の位置・役割の変更は一切ない。

| Injection Point | 配置画面 | 表示条件 | データソース（既存資産） |
|---|---|---|---|
| `[C]` hn-experiment-card | Home最下部 | PRO、週1回のみ、表示済みなら7日間非表示 | `companion-intelligence.js` `generateGentleSuggestion()` を接続 |
| `[E]` ins-trend-cards（全件） | Insights中段 | PRO、上位5件 | 既存 `DerivedInsight[]`（`home-insight-engine.js`系） |
| `[F]` ins-question-card | Insights中段 | PRO、週1回のみ | `companion-intelligence.js` `generateReflections()` を接続 |
| `[G]` ins-correlation-chart | Insights中段 | PRO、記録30日以上で表示 | 既存 `lag-correlation-engine.js`（実装済み、FEATURE_INVENTORY.md確認） |
| `[H]` ins-medical-report | Insights下段 | PRO、明示的なボタン操作時のみ生成 | 既存 `modules/pro/doctor-summary/`（実装済み） |

`[G]` と `[H]` は、実は裏側のロジック自体が既に実装済み（`analytics/lag-correlation-engine.js`、`modules/pro/doctor-summary/`）であることをFEATURE_INVENTORY.mdで確認済みである。したがってPhase2の実質的な新規設計対象は `[C]` と `[F]`（Experiment Suggestion / Question Layer 相当）のみであり、これは第1章で述べた「眠っている資産（companion-intelligence.js）を起こす」タスクに帰着する。

---

## 第4章 Information Architecture（Phase2版）

### Home（Phase2後の優先順位）

1. 今日の記録CTA（不変）
2. 今日のインサイト1件（不変）
3. 疾患別ヒーローメッセージ（不変）
4. 状態カード4枚（不変）
5. 週間記録行（不変、PR-EXP-04で復旧予定）
6. **`hn-experiment-card`（新規、PRO、週1回のみ表示）**

情報量の上限を守るため、6番目の要素は「常設」ではなく「週1回・7日間のみ表示」という時限的な出現にすることで、Home全体の要素数を実質的に増やさない設計とする。

### Insights（Phase2後の優先順位）

1. ヒーロー（挨拶＋気づき、無料、不変）
2. `ins-clinical-summary`（観察サマリー、無料、不変）
3. **`ins-trend-cards`（新規、PRO、上位5件）**
4. **`ins-question-card`（新規、PRO、週1回）**
5. **`ins-correlation-chart`（新規、PRO、記録30日以上）**
6. **`ins-medical-report`（新規、PRO、ボタン操作時のみ生成）**

3〜6は「常時全部表示」ではなく、タブ切り替え（「傾向」「問いかけ」「相関」「レポート」）による分割表示を推奨する。これにより1画面あたりのスクロール量を増やさずに機能を追加できる（第9章 Visual Load Reviewで詳述）。

---

## 第5章 User Journey（Phase2反映版）

GROWTH_STRATEGY.md 6-Bが定義した既存のフィードバック段階設計に、Phase2要素を統合する。

| 期間 | GA時点の体験 | Phase2後の追加体験 |
|---|---|---|
| Day 1〜7 | 最初の記録、7日間の継続促進 | 変更なし |
| Day 8〜30 | 基本統計の提示 | 変更なし |
| Day 31〜90 | Longitudinal比較（STARTER価値） | + 週1回のExperiment Suggestion（「今週、こんなことを試してみませんか？」という問い） |
| Day 91〜365 | Signal Insight（パターン発見） | + Question Layer（「〇〇という傾向がありますが、心当たりはありますか？」）+ 相関チャート |
| Day 365以降 | 縦断データの価値体験 | + Research Contribution Badge（「あなたの1年間の記録が、研究に貢献しています」） |

この統合により、Phase2はGROWTH_STRATEGY.mdが既に設計した時間軸を破壊せず、その中に自然に組み込まれる。

---

## 第6章 Value Ladder整合

[VALUE_LADDER.md](business/VALUE_LADDER.md)が特定した2つのギャップは、Phase2によって次のように解消される。

**③改善のギャップ**は、`hn-experiment-card` と `ins-question-card` の実装によって解消される。ユーザーは「理解」の次に「何を試すか」という具体的な一歩を得られるようになる。これにより「記録→理解→改善」という連鎖が初めて完成する。

**⑤資産化のギャップ**は、Research Contribution Badgeの実装によって解消される。ただし、このBadgeが「Consentのどの粒度で何を開示するか」は、REGULATORY_MEDICAL_COUNCIL.md 4章のConsent設計と密接に関わるため、UI設計だけでは完結せずFounder Decision（第14章 IMPL-FD-3）を要する。

Value Ladder全体が完成すると、STARTER（理解）からPRO（改善）への転換は、「機能を比較して選ぶ」行為ではなく、「記録を続けた自然な結果として次の段階に進む」という体験になる。これは第8章「Premium体験」の設計原則と直結する。

---

## 第7章 機能間の接続設計（テーマ⑥⑦への回答）

### AIは主役にならない、という設計原則の徹底

Council は、Experiment Suggestion・Question Layer・Similarity・Pattern・Research Contributionという5つの新機能が、それぞれ独立した「AIからの提案」の集合体として提示されることを明確に禁止する。かわりに、これらは**単一の「今日の気づき」を起点とした1本の連鎖**として設計する。

```
① 気づき（Insight）: 「黄体期に痛みスコアが上がる傾向があります」（事実の提示、既存）
        ↓
② 問い（Question Layer）: 「この傾向、心当たりはありますか？」（対話、Phase2新規）
        ↓
③ 提案（Experiment Suggestion）: 「今週、就寝時間を30分早めてみませんか？」（行動の提案、Phase2新規）
        ↓
④ 比較（Similarity/Pattern）: 「同じような傾向の人が他にもいます」（孤独感の解消、Phase3）
        ↓
⑤ 貢献（Research Contribution）: 「あなたの記録が、この発見の一部になっています」（意義の実感、Phase2後半〜Phase4）
```

この連鎖のどの段階でも、ユーザーは「読むだけ」で次に進むことができ、無理に全段階に進む必要はない。すべての段階は「問いかけ」の形式を取り、「〜すべきです」という断定形は一切使わない（REGULATORY_MEDICAL_COUNCIL.md BD-031・BD-044の安全ラインと一致）。

### AIが答えを押し付けていないかの検証基準

Council は以下をPhase2実装時のコピーライティング審査基準として定める。

```
禁止表現: 「〜すべきです」「〜が原因です」「〜を試してください」（命令形）
許容表現: 「〜という傾向があります」「〜してみませんか？」「気になりますか？」（提示・問いかけ）
```

これは医師アドバイザーによる文言レビュー（REGULATORY_MEDICAL_COUNCIL.md BD-045）の対象であり、UI設計段階でも同じ基準を先取りして適用する。

---

## 第8章 Premium体験（テーマ⑤への回答）

Premium画面（PR-EXP-03で修復予定）は、Phase2でtier分離（STARTER/PRO）が実装された時点で、単なる「機能一覧」から「Value Ladderの可視化」へと役割を拡張する。具体的には、STARTER欄には「理解」に対応する機能（Longitudinal Analysis・医師レポート等、既存実装済み）を、PRO欄には「改善」に対応する機能（Experiment Suggestion・Question Layer等、Phase2新規）を配置し、**プラン比較表そのものがValue Ladderの視覚化**になるよう設計する。

これにより、ユーザーがPremium画面を訪れたとき「機能が多いから高い方を買う」という比較購買ではなく、「自分は今どの段階にいて、次の段階に進むと何が変わるか」を理解した上での自然な転換になる。押し売りにならないための原則（[PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md)）は第3章で確認した通りPhase2でも変更されない。

---

## 第9章 Layout Review / Visual Load Review

### レイアウトを壊さないか（テーマ⑧）

第3章で確認した通り、Phase2の全要素は既存Injection Pointへの追加であり、既存要素（Home CTA、Insightsヒーロー等）の位置は変わらない。ただし、[GENERAL_RELEASE_EXPERIENCE_COUNCIL.md](GENERAL_RELEASE_EXPERIENCE_COUNCIL.md)がPR-EXP-02として設計したInsightsヒーローのレイアウト修正は、Phase2のカード追加より**先に**完了させる必要がある。壊れたレイアウトの上に新しいカードを積み上げると、崩れが複合化するリスクがあるためである（[PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md](PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md)第3章がすでに確認した通り、PR-EXP-02はPhase2と無関係に独立して先行実施される）。

### カードが増えすぎていないか

Home は6要素（既存5＋Experiment Suggestion）を上限とし、それ以上の要素追加はFinal形態まで行わない。Insightsは、常時表示されるヒーロー＋観察サマリーの2要素に加え、PRO領域はタブ切り替え式（傾向／問いかけ／相関／レポート）にすることで、画面上の同時表示要素数を常に4以下に保つ。

### スクロールが長すぎないか

Homeはスクロールがほぼ発生しない設計を維持する（`hn-experiment-card`は週1回のみの出現のため、常時のスクロール増加にはならない）。Insightsはタブ切り替え式の採用により、1画面あたりのスクロール量をGeneral Release時点とほぼ同水準に保つ。

---

## 第10章 Habit Review / Daily Use Review（テーマ①②③④への回答）

### 毎日開きたくなる体験か

Council の結論は、「毎日開く理由」を機能の数で増やすのではなく、**「今日は何が返ってくるか分からない」という穏やかな期待感**で維持すべきというものである。今日の気づき・週1回の問いかけ・週1回の提案は、いずれも「今日は出るか出ないか分からない」という設計にすることで、日々の訪問に軽い新鮮さを持たせる。これは通知を増やすアプローチとは対照的であり、GROWTH_STRATEGY.md 6-Cの「督促ではなく気づかせる通知」という原則と一致する。

### 見るだけで満足して記録しなくならないか

これは Council が特に重要視した論点である。もしAIが十分に「気づき」を与えてしまうと、ユーザーは記録を続けなくても満足してしまう恐れがある。これを防ぐため、Phase2のすべての新規要素（Question Layer・Experiment Suggestion）は、**直近7日以内に新しい記録がある場合にのみ生成される**という表示条件を設ける。記録が止まっている期間は、新しい気づき・問い・提案は生成されず、代わりに「最近の記録が少ないようです。今日のあなたを教えてください」という穏やかな記録への呼び戻し文言のみが表示される。これにより「読むだけで満足する」ループを構造的に防止する。

### 記録したくなる導線になっているか

上記の表示条件（記録があるときのみ新しい気づきが生まれる）自体が、「記録する→気づきが増える」という因果関係をユーザーに体感させる導線になる。

### 初回利用と100日後で印象は変わるか

初回（Day1〜7）はAI要素がほぼ出現しない（データ不足のため）。100日後（Day91〜365）にはヒーロー・観察サマリーに加え、傾向・問いかけ・相関・提案が揃った、情報密度の高いInsights体験になる。この変化は「使うほど賢くなるアプリ」という体験として意図的に設計されたものであり、初日から機能過多にならないための自然な情報解禁でもある。

### 習慣化を邪魔する要素はないか

通知は週1回のサマリーのみ（GROWTH_STRATEGY.md既存原則を継承）、Phase2でも増やさない。アニメーションは達成時（マイルストーン）のみに限定し、日常操作には使わない。色は既存のブランドカラー（ローズ系グラデーション）を維持し、Phase2の新規要素にも新しい色を追加しない（視覚的な一貫性の維持）。

### 長期間使っても飽きないか・一人運営で保守できるか

10年間タブを増やさない（第1章 原則1）という設計そのものが、ユーザーの「飽き」とFounderの「保守負荷」の両方を同時に解決する。新機能は常に「既存の型」への当てはめ（Injection Point方式）であり、Founderは新しい画面構造を都度発明する必要がない。これは`BUSINESS_STRATEGY.md` 9章が定めるFounder週45時間上限の遵守にも直結する。

---

## 第11章 AI Experience Review（テーマ⑥への回答、詳細）

Phase2のAI要素はすべて `PRO_INSIGHT_ARCHITECTURE.md` の設計制約（Rule-based first、Explainable、Cacheable、Tier-pure）を継承する。加えて、本Councilは以下を追加の設計原則として定める。

```
原則A: AIの発言は常に「観測」であり「主張」ではない
  ✓ 「黄体期の記録に痛みという単語が多く出現しています」（観測）
  ✗ 「あなたは黄体期に痛みが悪化しやすい体質です」（主張・断定）

原則B: ユーザーの回答・反応は必ず次の表示に影響する
  Question Layerでユーザーが選んだ選択肢（例:「ストレスが重なっていた」）は、
  次回のExperiment Suggestionの提案内容に反映される（PRO_INSIGHT_ARCHITECTURE.md
  Section5の`InsightQuestion.answer`設計を踏襲）。これにより「AIが勝手に進める」
  のではなく「ユーザーとの対話の結果として提案が進化する」体験になる。

原則C: 「わからない」「スキップ」を常に選べる
  Question Layer・Experiment Suggestionのいずれにも、回答を強制しない
  ニュートラルな選択肢を必ず用意する（PRO_INSIGHT_ARCHITECTURE.md既存設計の
  'unknown'オプションを踏襲）。
```

---

## 第12章 Monetization整合（再確認）

Phase2で新たにPaywallの対象となるのは `[C]` `[E]` `[F]` `[G]` `[H]` の5要素であり、いずれも既存の `isPremium()`（Phase2ではtier分離後の `getTierLevel()`）ゲート機構をそのまま使う。[PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md)が定める「絶対に出してはいけない場面」（Record画面・保存直後・エラー画面・Empty State・Consent画面）は、Phase2の新規要素にもそのまま適用され、変更はない。

Research Contribution Badgeについては、これを「無料/有料どちらのユーザーにも表示するか」という論点が新たに生じる。VALUE_LADDER.mdは「全プラン（Research Consent同意者）」としており、本Councilもこれを支持する。Research Contributionは収益機能ではなく信頼構築機能であるため、プランで差別化しないことが妥当である。

---

## 第13章 実装設計（Phase2機能別）

### 13-A. hn-experiment-card（Experiment Suggestion, Home）

```
配置場所:      Home画面最下部（既存5要素の下、新規6番目の要素）
レイアウト:     既存の状態カードと同じカードスタイルを流用、アイコン+短文+CTA「詳しく見る」
表示条件:      isPremium()=true かつ 直近7日以内に記録がある かつ
              直近7日間に本カードを表示していない（週1回制限）
状態遷移:      未表示→表示→タップで詳細（Experiments画面へ）or 閉じる→7日間非表示
導線:          タップ時 src/modules/experiments.js の startExperiment() 系フローへ接続
Paywall位置:   カード自体はFREEユーザーにも「ロック済みプレビュー」として見せ、
              タップでpremium画面へ（PAYWALL_STRATEGY.md OK-1〜OK-5と整合させる）
Browser Verification: 記録0件時に非表示であること、記録7日以上ありisPremium=falseの場合はロックUIで
              表示されること、週1回のみ表示されること
Regression対象: Home画面の他要素（CTA状態、週間行）に影響しないか
実装PR単位:    PR-P2-01（単独）
Rollback方針:  表示条件をfalse固定にする1行の変更で即時非表示化可能
```

### 13-B. ins-question-card（Question Layer, Insights）

```
配置場所:      Insights画面、タブ切り替え「問いかけ」内
レイアウト:     問い文＋選択肢3〜4個（フリーテキスト任意）
表示条件:      isPremium()=true かつ 直近7日以内に記録がある かつ 週1回制限
状態遷移:      未回答→回答済み（次回のExperiment Suggestionに反映）→2週間再表示しない
              （PRO_INSIGHT_ARCHITECTURE.md既存設計の`ippo_question_last_shown`を踏襲）
導線:          回答結果は`companion-intelligence.js`の`rankInsightPriorities()`等を通じて
              次回提案に反映
Paywall位置:   PAYWALL_STRATEGY.md OK-2（insights画面の各カード）に整合
Browser Verification: 回答後に選択内容が保存されること、2週間以内に同じ問いが再表示されないこと
Regression対象: 既存のins-clinical-summary等、他タブの表示に影響しないか
実装PR単位:    PR-P2-02（単独、ただしP2-01と同一のcompanion-intelligence.js接続作業を共有するため
              実装順序はP2-01の直後を推奨）
Rollback方針:  タブ自体を非表示にする設定値で即時ロールバック可能
```

### 13-C. ins-trend-cards（全件）・ins-correlation-chart・ins-medical-report

```
配置場所:      Insights画面、タブ切り替え「傾向」「相関」「レポート」内
現状:          裏側ロジックは実装済み（lag-correlation-engine.js、modules/pro/doctor-summary/等）
変更方針:      UIとしての表示・タブへの統合のみ。新規ロジック開発は不要
実装PR単位:    PR-P2-03（表示統合のみ、既存ロジックの呼び出し配線）
Browser Verification: 各タブへの遷移、記録30日未満時の相関チャート非表示条件
Regression対象: 既存の`modules/pro/`配下レポート機能が単独で正しく動作することの再確認
Rollback方針:  タブ追加分のみのロールバックで即時対応可能
```

### 13-D. Research Contribution Badge

```
配置場所:      Home状態カード群の末尾、およびPremium画面（第8章参照）
表示条件:      Research Consentに同意済み かつ 記録365日以上（GROWTH_STRATEGY.md 6-B Day365以降の
              設計と整合）
Founder Decision: どの粒度で「貢献」を開示するか（件数か、抽象的な貢献度か）はIMPL-FD-3として
              Founder判断が必要（第14章）
実装PR単位:    PR-P2-04（Founder Decision確定後に着手、本文書では設計のみ）
```

---

## 第14章 Founder Decision

### IMPL-FD-1（High）— companion-intelligence.js / recommendation-engine.jsの再利用可否

Phase2着手前に、Founderがこの2つの既存サービスをレビューし、Question Layer/Experiment Suggestionの実装基盤として採用するか、新規に書き直すかを決定すること。Council はレビュー・再利用を推奨する（第1章）。

### IMPL-FD-2（Medium）— tier分離（STARTER/PRO）の実施タイミング

[FOUNDER_DECISION_REVIEW_MONETIZATION.md](FOUNDER_DECISION_REVIEW_MONETIZATION.md) FD-2で「Phase2に送る」という推奨が出ているが、Phase2内でも「tier分離を先に行うか」「Question Layer等の機能を先に作り、tier分離は後回しにするか」の順序をFounderが決定すること。Council は「機能を先に作り、実装が固まった時点でtier分離する」順序を推奨する（手戻りが少ないため）。

### IMPL-FD-3（Medium）— Research Contribution Badgeの開示粒度

「あなたの記録が研究に貢献しています」という表現を、件数ベース（「〇件のResearch Datasetに含まれています」）にするか、抽象的な貢献度（「あなたの記録は貴重な貢献です」）にするかは、REGULATORY_MEDICAL_COUNCIL.md Consent設計との整合が必要なFounder判断事項である。

### IMPL-FD-4（Low）— Similarity/Pattern（Phase3）着手条件の監視主体

Phase3のSimilarity Match/Pattern Searchは BD-026（k≥50・5疾患達成）が前提条件であり、この達成状況を誰が定期的に確認するか（Founder自身か、自動アラートを設けるか）を決定すること。

---

## 第15章 PR計画（Phase2）

| PR | 目的 | 前提 |
|---|---|---|
| PR-EXP-01〜05 | General Release絶対修正（既存計画） | PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.mdの通り先行実施 |
| **PR-P2-01** | hn-experiment-card実装（Home） | IMPL-FD-1確定後 |
| **PR-P2-02** | ins-question-card実装（Insights） | PR-P2-01と同時期、companion-intelligence.js接続を共有 |
| **PR-P2-03** | ins-trend-cards/correlation-chart/medical-reportのタブ統合 | 既存ロジック活用のため独立着手可能 |
| **PR-P2-04** | Research Contribution Badge | IMPL-FD-3確定後 |
| **PR-P2-05** | tier分離（isPremium()→getTierLevel()拡張）+ Premium比較表UI | IMPL-FD-2の順序決定に従う |

PR-P2-01〜05はいずれも「設計のみ」であり、本文書では実装に着手しない。着手時期はFounder DecisionとPR-EXP-01〜05の完了後とする。

---

## 最終判定

```
CONDITIONAL GO

Phase2の完成形（Final Visionから逆算した体験）は、既存のGeneral Release基盤・
Monetization Framework・App Experience Frameworkのいずれとも矛盾しない。
特に、Phase2の中核機能（Question Layer・Experiment Suggestion）が
ゼロからの新規開発ではなく既存の眠った資産（companion-intelligence.js /
recommendation-engine.js）の再接続で実現しうるという発見は、
Phase2の実装難易度・スケジュールに対する前提を有利に変える。

ただし、以下の条件が満たされるまでPhase2実装には着手しないこと:
  1. General Release絶対修正（PR-EXP-01〜03）の完了
  2. IMPL-FD-1（既存資産の再利用可否)のFounder確認
  3. IMPL-FD-2（tier分離の実施順序）のFounder確認
```

Council は、Phase2が「機能を積み増す」プロジェクトではなく「General Releaseで確立した信頼を、静かに深化させる」プロジェクトであるべきという合意のもとに本文書を完成させた。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-PHASE2-IMPL-001 |
| **作成日** | 2026-07-07 |
| **権威レベル** | LEVEL-1 STRATEGIC DOCUMENT |
| **前提文書** | GENERAL_RELEASE_EXPERIENCE_COUNCIL.md / PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md / MONETIZATION_COUNCIL_REPORT.md / APP_EXPERIENCE_FRAMEWORK.md / docs/business/* / USER_JOURNEY.md / GENERAL_RELEASE_SCREEN_MAP.md / PRO_INSIGHT_ARCHITECTURE.md / FEATURE_INVENTORY.md / BUSINESS_STRATEGY.md / GROWTH_STRATEGY.md |
| **コード変更** | ゼロ（設計のみ） |
| **Founder Decision** | IMPL-FD-1〜IMPL-FD-4 |
| **次回改訂トリガー** | PR-EXP-01〜03完了時 / IMPL-FD-1・2確定時 / Phase2実装着手時 |

---

**PHASE2 IMPLEMENTATION COUNCIL — 議決完了 2026-07-07**
**最終判定: CONDITIONAL GO（Founder Decision 4件、General Release絶対修正完了が前提条件）**
