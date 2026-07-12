# APP EXPERIENCE FRAMEWORK
## App Experience Council — General Release時点の完成プロダクト体験

---

> **文書権威レベル: LEVEL-1 STRATEGIC DOCUMENT（Monetization Councilと同時開催）**
>
> **この文書の役割**: App Experience 側の総括であり、[SCREEN_FLOW.md](SCREEN_FLOW.md) /
> [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md) / [NAVIGATION_DESIGN.md](NAVIGATION_DESIGN.md) /
> [USER_JOURNEY.md](USER_JOURNEY.md) / [GENERAL_RELEASE_SCREEN_MAP.md](GENERAL_RELEASE_SCREEN_MAP.md) の
> 個々の監査結果を統合し、Monetization Framework（`docs/business/`）との整合性を確認する場所である。
> 個々の詳細（画面の役割、情報設計、ナビゲーション、ジャーニー、画面分類）はこの文書では繰り返さず、
> 各リンク先を正とする。全体の親文書は [MONETIZATION_COUNCIL_REPORT.md](MONETIZATION_COUNCIL_REPORT.md)。

---

**文書番号:** IPPO-APPEXP-000
**開催体:** App Experience Council（App Experience Architect × Information Architect × Interaction Designer × Mobile UX Specialist）+ Monetization Council合同
**開催日:** 2026-07-07
**スコープ:** 画面構成・情報設計・導線・体験評価（実装・コード・UI変更は対象外）

---

## 1. 全体構成サマリー

General Release時点の IPPO は、7画面と1オーバーレイ、5要素の Bottom Navigation という最小構成に集約される（[SCREEN_FLOW.md](SCREEN_FLOW.md)、[NAVIGATION_DESIGN.md](NAVIGATION_DESIGN.md)）。起点は home であり（[INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md)）、旅は Onboarding から習慣化へと続くが、「理解」から「改善」への区間に弱さが残る（[USER_JOURNEY.md](USER_JOURNEY.md)）。Founder一人運営・週45時間上限（`BUSINESS_STRATEGY.md` 9-A）という制約の中で、この最小構成は「保守可能な複雑性」を保っていると Council は評価する。

---

## 2. Monetization FrameworkとApp Experience Frameworkの整合監査

両フレームワークが矛盾していないかを確認することは、本 Council に課された明示的な議題であった。Council は以下の観点でこれを監査した。

Paywallの位置と画面構成は整合している。[PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md) 第2章が定める画面別配置と、[SCREEN_FLOW.md](SCREEN_FLOW.md) 第3章の実際の導線は完全に一致する。

Value LadderとUser Journeyもまた整合しているが、それは単に矛盾がないという以上の意味を持つ。[VALUE_LADDER.md](business/VALUE_LADDER.md) が「③改善」の未実装を指摘し、[USER_JOURNEY.md](USER_JOURNEY.md) が「Experiment Experience」の弱さを指摘した。この二つは全く異なる分析軸（収益構造としての価値の階段、体験としてのユーザーの旅）から出発しながら、同一の実装ギャップに行き着いた。二つの独立した監査が同じ場所を指し示したという事実は、単なる整合以上に、この論点の優先度の高さそのものを裏付けている。

FREE_PRO_BOUNDARYとINFORMATION_ARCHITECTUREも整合している。Home優先順位（[INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md) 第1章）でPRO要素が最下部に配置されている点は、[FREE_PRO_BOUNDARY.md](business/FREE_PRO_BOUNDARY.md) が掲げる「制限解除ではなく新価値」の原則を情報の並び順として体現したものである。

MONETIZATION_ROADMAPとGENERAL_RELEASE_SCREEN_MAPも整合しており、Phase2送りとされた機能リストは両文書で完全に一致している。

唯一、注意を要する論点が価格実装ギャップである。[MONETIZATION_FRAMEWORK.md](business/MONETIZATION_FRAMEWORK.md) 第1章が指摘した価格の不整合は、premium 画面のCTA文言（¥580 vs ¥980の表示）に直接影響する。Founderがこの点を決定するまでは、premium画面の表示価格を変更してはならない。

総合すると、二つのFrameworkは矛盾していない。むしろ Value Ladder と User Journey が独立に同じギャップを指摘したことは、それが次に着手すべき最優先課題であることの強い裏付けになっていると Council は結論づける。

---

## 3. 完成したプロダクト体験の定義（General Release時点）

ユーザーが最初に起動してから毎日使い続けるまでの体験は、次のように描ける。Day 0 に welcome から疾患選択、初回記録（5分以内が目標）へと進む。Day 1〜7 は home を起点とした記録の継続であり、今日のインサイトを1件得る。Day 30 には傾向インサイトと観察サマリーによって「パターンが見える」体験が生まれる。Day 30〜90 にかけて、Longitudinal Analysis や医師向けレポートの価値を実感することでSTARTERへの転換が起こる。Day 90以降は記録の継続がベースとなり、将来的には実験提案による「次の一手」が加わることでこの体験は完成する（Phase2で実現）。

この体験の中で「記録から理解へ」という区間は価値が自然に伝わる設計になっている。実装も設計原則も明確である。一方で「理解から改善へ」という区間は、現状ユーザーの自発性に依存しており、価値が自然に伝わるとは言い難い。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-APPEXP-000 |
| **作成日** | 2026-07-07 |
| **権威レベル** | LEVEL-1 STRATEGIC DOCUMENT |
| **前提文書** | SCREEN_FLOW.md / INFORMATION_ARCHITECTURE.md / NAVIGATION_DESIGN.md / USER_JOURNEY.md / GENERAL_RELEASE_SCREEN_MAP.md / docs/business/* |
| **親文書** | [MONETIZATION_COUNCIL_REPORT.md](MONETIZATION_COUNCIL_REPORT.md) |
| **Founder Decision** | FD-4・FD-5・FD-6（詳細は親文書第9章「Important Founder Decisions」） |
| **次回改訂トリガー** | Phase2着手時 |
