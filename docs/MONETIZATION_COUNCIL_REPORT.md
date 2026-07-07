# MONETIZATION COUNCIL REPORT
## IPPO 収益構造 正式決定書（Monetization Council × App Experience Council 合同会議）

---

> **文書権威レベル: LEVEL-1 STRATEGIC DOCUMENT**
>
> 本文書は Monetization Council および App Experience Council（2026-07-07 合同開催）の
> 正式な議事録・決定書である。個別の詳細設計は `docs/business/` および `docs/` 直下の
> 関連文書に委ね、本文書はその親レポートとして「なぜその決定に至ったか」を記述する。
> 本 Council は価格そのものを決定せず、Business Logic / Architecture / Database / UI /
> Stripe 実装 / 課金画面実装のいずれも行っていない。

---

**文書番号:** IPPO-MONETIZATION-000
**開催体:** Monetization Council（Founder × Product Strategist × SaaS Founder × PLG Specialist × Growth Lead × UX Lead × Behavioral Designer × Pricing Strategist × Data Product Architect × Customer Representative）+ App Experience Council（App Experience Architect × Information Architect × Interaction Designer × Mobile UX Specialist）合同開催
**開催日:** 2026-07-07
**前提文書:** CLAUDE.md / AI_EXECUTION.md / docs/HANDOFF_PHASE7_COMPLETE.md / docs/ARCHITECTURE.md / docs/BUSINESS_STRATEGY.md（IPPO-BUSINESS-001）/ docs/GROWTH_STRATEGY.md（IPPO-GROWTH-001）/ docs/GTM_COUNCIL.md（IPPO-GTM-001）/ docs/REGULATORY_MEDICAL_COUNCIL.md（IPPO-REGULATORY-001）/ docs/RELEASE_READINESS_COUNCIL.md / docs/PRO_INSIGHT_ARCHITECTURE.md / docs/FEATURE_INVENTORY.md

補足として、依頼文が参照した `docs/PRODUCT_THESIS.md`・`docs/ROADMAP.md`・単独の「UI/UX Final Council Report」はリポジトリに存在しなかった。実質的に同じ役割を担う文書（本 CLAUDE.md 冒頭の SSOT 定義、`docs/WAVE2_ROADMAP.md`、`docs/HANDOFF_PHASE7_COMPLETE.md` 内の PR-092A〜D 各節）を代わりに参照した旨をここに記録する。

---

## 第1章 Council 開催の目的

IPPO は General Release を控え、「何を無料にし、何に対価を求め、その構造を将来どう拡張するか」という問いに、実装可能な粒度で答える必要があった。この問いに対する一次回答はすでに `BUSINESS_STRATEGY.md`（IPPO-BUSINESS-001、2026-06-27、Founder 承認済み）が与えている。同文書は Free / Premium（¥980）/ Pro（¥1,980）という 3 層構成、Research License、Clinic API という 4 本の収益の柱を Binding Decision（BBS-001〜006）として既に確定していた。

したがって本 Council の使命は、価格を新たに決めることではない。使命は次の 3 点に限定される。

第一に、既存の Founder 決定を「Monetization Framework」という実装可能な様式――North Star Value、無料/有料境界、Value Ladder、Paywall 戦略、ロードマップ――に翻訳し、`docs/business/` 以下に構造化して残すこと。第二に、その決定と実際のコードの間に不整合がないかを監査し、あれば Founder が意思決定すべき論点として提示すること。第三に、その Monetization 体験を成立させる App Experience（画面構成・導線・ユーザージャーニー）を同時に監査し、両者が矛盾しないことを確認すること。

この目的設定自体が、本 Council の性格を決めている。本 Council は「価格を作る場」ではなく「すでにある決定を安全に実装へつなぐための最終監査と文書化の場」である。

---

## 第2章 議論内容

### 2-1. Monetization Council における議論

Council はまず、IPPO がなぜ課金されるのかという North Star Value の確認から始めた。既存文書（`BUSINESS_STRATEGY.md` 5-A、`PRO_INSIGHT_ARCHITECTURE.md` 1章）はすでに「無料にするものは記録する行動そのもの、有料にするものは記録の先にある理解の体験」という思想を確立しており、Council はこれを覆す理由を見出さなかった。North Star Value は「記録するだけでは終わらない。自分のパターンが見え、次に何を試せばいいかが分かり、医師にも伝わる形になる」という一文に集約されると再確認した。

次に、この North Star を実際の機能にどう配分するかを議論した。ここで PLG Specialist と Pricing Strategist から、「単なる制限解除を有料化してはならない」という Founder の指示を機械的に守るだけでは不十分だという指摘があった。実際に FEATURE_INVENTORY.md を精査した結果、Premium 層に該当する機能（Longitudinal Analysis、医師向け PDF レポート、相関レポート、周期・体温・フレアレポート、月次レポート）はすでに実装済みであり、いずれも「量の制限解除」ではなく「新しい認知体験」として設計されていることを確認した。この点において、既存実装は Founder の哲学を裏切っていない。

一方で、Data Product Architect が `PRO_INSIGHT_ARCHITECTURE.md` を精査した結果、同文書が設計する Question Layer（問いかけ層）と Experiment Suggestion（実験提案）は仕様として完成しているにもかかわらず実装が着手されていないことが判明した。この 2 機能は Value Ladder における「理解」から「改善」への橋渡しを担う中核機能であり、Council はこの欠落を単なる実装漏れではなく、**Value Ladder の構造的な断絶**として扱うべきだと結論づけた（詳細は [VALUE_LADDER.md](business/VALUE_LADDER.md)）。

Council 終盤、Customer Representative の立場から「ユーザーが実際に払う価格」を確認する作業として `src/services/stripe.js` を実測したところ、¥580/月・¥4,800/年という価格が発見された。これは BBS-001 が定めた ¥980/月・¥1,980/月（Premium/Pro 2 プラン）のいずれとも一致しない。Council はこれを些末な実装の遅れではなく、**Founder の公式決定と実際にユーザーへ提示されている価格が食い違っているという事業上の重大な不整合**と認定した。この論点は価格そのものの決定を伴うため、本 Council では解決せず、第6章「Important Founder Decisions」に引き継ぐ。

### 2-2. App Experience Council における議論

App Experience Council は、Monetization Council と並行して「General Release 時点で完成したプロダクト体験と呼べるか」を検証した。実装済みの画面（`app.html` 実測: welcome / home / calendar / record / insights / settings / premium の 7 画面と success-overlay）を確認した上で、Information Architect から「画面数自体は Founder 一人運営の哲学（`BUSINESS_STRATEGY.md` 2-A）に照らして適切な最小構成である」という所見が出された。この所見に対する異論はなく、Council は新規画面の追加を提案しないことで合意した。

Interaction Designer と Mobile UX Specialist は、ユーザージャーニー全体（初回起動から習慣化まで）を GTM_COUNCIL.md の既存設計と突き合わせ、「記録」から「理解」までの区間は実装・設計ともに強固である一方、「理解」から「改善」（実験を試す）への導線が弱いという結論に至った。これは Monetization Council が Value Ladder 監査で独立に発見した断絶と完全に一致する。二つの Council が異なる角度（収益構造としての価値の階段、体験としてのユーザージャーニー）から同じ場所に同じ欠落を見出したことは、単なる偶然ではなく、この欠落が IPPO の成長にとって構造的に重要であることの傍証だと Council は判断した。

App Experience Architect からは、Paywall の配置が体験を阻害していないかという監査結果が共有された。record 画面・保存成功直後・エラー画面・オフライン画面・Empty State・Research Consent 同意フローのいずれにも Paywall が存在しない設計であることを確認し、これは Behavioral Designer が Monetization Council 側で提示した「ダークパターン禁止」の原則と完全に整合していた。

---

## 第3章 採択された仕様

Council として正式に採択した仕様は以下の通りである。詳細は各リンク先文書を正とする。

**プラン構成**として、General Release 時点では FREE と STARTER（既存表示名 Premium）の 2 層で開始し、PRO 層は Phase2 に送ることを採択した（[MONETIZATION_FRAMEWORK.md](business/MONETIZATION_FRAMEWORK.md) 第5章）。3 層を同時に立ち上げると Paywall の説明コストが増え、「Premium と Pro の違いが分からない」という離脱を招くリスクがあるという Behavioral Designer の分析を採用した結果である。

**無料/有料の境界**は、量的な制限ではなく体験の質で分ける方針を維持した上で、機能単位の境界表を確定した（[FREE_PRO_BOUNDARY.md](business/FREE_PRO_BOUNDARY.md)）。

**Value Ladder**は「記録→理解→改善→習慣化→資産化」の 5 段階を正式なフレームワークとして採択し、現状の実装がどこまでこの段階を満たしているかを段階別に監査した（[VALUE_LADDER.md](business/VALUE_LADDER.md)）。

**Paywall 戦略**は、画面ごとに「出す場所」と「絶対に出してはいけない場所」を明文化し、ダークパターンの排除を恒久ルールとして採択した（[PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md)）。

**将来ロードマップ**は Phase2（PRO 層完成）→ Phase3（Similarity / Pattern、データ量条件付き）→ Phase4（B2B / API / Enterprise）という順序を採択した（[MONETIZATION_ROADMAP.md](business/MONETIZATION_ROADMAP.md)）。

**画面構成**は、現行の 7 画面 + 1 オーバーレイを General Release 時点の正式な構成として採択し、新規画面の追加は行わないことを確認した（[GENERAL_RELEASE_SCREEN_MAP.md](GENERAL_RELEASE_SCREEN_MAP.md)、[SCREEN_FLOW.md](SCREEN_FLOW.md)）。

**ユーザージャーニー**は、初回起動から習慣化までの一連の体験を単一の文書に統合し、そのうち「初回実験」の区間が構造的に弱いことを明記した（[USER_JOURNEY.md](USER_JOURNEY.md)）。

---

## 第4章 却下された案

Council は以下の案を検討した上で、明示的に却下した。却下の理由も含めて記録する。

**3 層プランの同時立ち上げ**は、Pricing Strategist から一度提案されたが、前述の離脱リスクを理由に却下した。PRO 層は Phase2 に送る。

**表示名「Premium」を「STARTER」へ変更する案**は、本文書内での整理上の呼称としては採用したが、ユーザー向け UI 文言としての変更は却下した。理由は、名称変更が UI 変更に該当し本 Council のスコープ（コード変更禁止）を超えること、また「Premium」という既存の呼称にすでにブランド認知があり、変更する積極的な理由がないことによる。

**Calendar・Insights・履歴を統合した単一の Timeline 画面の新設**は、Information Architect から一度提案されたが却下した。現行設計は機能をあえて複数画面に分散させた意図的な設計であり、統合は新規画面の追加という UI 変更を伴う。画面数を増やすことは Founder 一人運営の維持可能性を損なうという判断が優先された。

**独立した Menu / Profile 画面の新設**も同様の理由で却下し、既存どおり Settings 画面への統合を維持することとした。

**個人ユーザー向けコミュニティ機能の General Release 内での実装**は、`GROWTH_STRATEGY.md` の Binding Decision（BGS-003、独自コミュニティ開設は Wave3 完了後まで禁止）にすでに抵触するため、検討すら行わず即座に却下した。

**広告収益・データブローカー等、既存 4 本柱以外の新規収益源の追加**は、`BUSINESS_STRATEGY.md` 3-C が定める「やらないビジネスモデル」に反するため却下した。ただし「テンプレート・教育コンテンツ販売」については、既存の禁止事項に直接抵触しない可能性がある将来検討事項として、採否を Founder 判断に委ねる形で記録するに留めた（採択でも却下でもない、保留事項）。

**Paywall におけるカウントダウン・期間限定訴求などの緊急性演出**は、Behavioral Designer の提案により明示的に禁止事項として却下した。`BUSINESS_STRATEGY.md` 5-C が定める「解約できない仕組みは信頼を毀損する」という Founder 哲学の延長線上にある判断である。

**`isPremium()` を 3 値の tier 判定へ即時拡張する実装**は、技術的には Phase2 で必要になることが分かっているが、本 Council のスコープ（コード変更禁止）では実施しなかった。実装そのものを却下したわけではなく、実施時期を Founder Action として次章に送った。

---

## 第5章 Founder Decision（本 Council が前提とした既存決定）

本 Council は以下の Founder 決定を所与の前提として運営された。これらは本 Council が新たに作ったものではなく、`BUSINESS_STRATEGY.md`・`GROWTH_STRATEGY.md`・`GTM_COUNCIL.md`・`REGULATORY_MEDICAL_COUNCIL.md` によってすでに Founder が承認済みの Binding Decision である。

価格体系そのもの（BBS-001: Free / Premium ¥980 / Pro ¥1,980）、VC 資金調達の禁止（BBS-004）、週 45 時間労働上限（BBS-005）、記録継続率を最重要 KPI とする方針（BGS-001）、独自コミュニティ開設の制限（BGS-003）、AI 出力の免責文言義務化と診断的表現の絶対禁止（BD-044、BD-050）、Research Consent のオプトイン設計（BD-049）は、いずれも本 Council が変更する権限を持たない上位決定である。本 Council の全ての議論と結論は、これらの決定と矛盾しないことを確認した上で行われている。

---

## 第6章 General Release への影響

本 Council の結論が General Release の実装範囲に与える影響は限定的である。画面数・ナビゲーション構造に変更はなく、無料/有料の機能境界も既存実装（FREE 全機能・STARTER 相当の各種レポート）をそのまま踏襲できる。つまり **本 Council の結論を反映するために追加で実装しなければならないコードは、原則として存在しない**。

唯一の例外は、第2章で述べた価格の不整合である。実装済みコードの価格表示（¥580/¥4,800）をそのまま General Release に持ち込むか、Founder が公式決定した BBS-001 の価格（¥980/¥1,980）に修正するかは、General Release 前に必ず解消しなければならない。この決定が下るまで、premium 画面の価格表示に関するいかなる変更も行うべきではない。

---

## 第7章 今後のロードマップ

General Release 後の展開は、Value Ladder の断絶を解消することを最優先課題として設計した。Phase2 では PRO 層の tier 分離実装と、Question Layer・Experiment Suggestion の実装により、「理解」から「改善」への導線を完成させる。あわせて Research Contribution Badge を実装し、Value Ladder 最終段階である「資産化」の実感をユーザーに還元する仕組みを整える。

Phase3 は Similarity Match・Pattern Search など、Phase3 Completion Validator（BD-026、k≥50・5 疾患達成）という既存の完了条件に連動する機能群を扱う。これらはデータ量の達成が実装より先に必要となる性質を持つため、Phase2 と並行して着手時期を機械的に判定できる。

Phase4 は Clinic API・Research License の本格展開など、B2B・Enterprise 領域の収益源に該当する。これは `BUSINESS_STRATEGY.md` 第7章・`GTM_COUNCIL.md` 第9章がすでに定める Wave4 以降の展開時期と一致させる。詳細な機能配置表は [MONETIZATION_ROADMAP.md](business/MONETIZATION_ROADMAP.md) を参照されたい。

---

## 第8章 成果物と文書構成

本 Council の成果物は、本文書を頂点として以下の 11 文書に分割して記録されている。重複を避けるため、各文書は明確な役割を持ち、詳細はその文書のみが正とする。

`docs/business/` 配下は Monetization の詳細設計を担う。[MONETIZATION_FRAMEWORK.md](business/MONETIZATION_FRAMEWORK.md) はプラン構成と収益の柱の全体像を、[FREE_PRO_BOUNDARY.md](business/FREE_PRO_BOUNDARY.md) は機能単位の無料/有料境界を、[VALUE_LADDER.md](business/VALUE_LADDER.md) は価値の段階とその実装状況監査を、[PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md) は課金導線の配置原則を、[MONETIZATION_ROADMAP.md](business/MONETIZATION_ROADMAP.md) は将来の機能配置とフェーズ計画を、それぞれ単独の正とする。

`docs/` 直下は App Experience の詳細設計を担う。[APP_EXPERIENCE_FRAMEWORK.md](APP_EXPERIENCE_FRAMEWORK.md) は体験全体の統括と Monetization Framework との整合監査を、[SCREEN_FLOW.md](SCREEN_FLOW.md) は画面ごとの役割と遷移を、[INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md) は各画面内の情報優先順位を、[NAVIGATION_DESIGN.md](NAVIGATION_DESIGN.md) はナビゲーション構造を、[USER_JOURNEY.md](USER_JOURNEY.md) は初回体験から継続利用・課金導線・Premium 体験までの一連の旅を、[GENERAL_RELEASE_SCREEN_MAP.md](GENERAL_RELEASE_SCREEN_MAP.md) は公開画面と将来解放画面の分類を、それぞれ単独の正とする。

---

## 第9章 Important Founder Decisions

両 Council を通じて発見された、**Founder の判断なしには先に進められない事項**のみをここに集約する。実装の詳細や理由の全文は各リンク先を参照されたい。各項目について選択肢・推奨案・リスク・General Releaseへの影響・最小判断を整理した検討資料、および Founder がそのまま採用可否を返信できる決定案は [FOUNDER_DECISION_REVIEW_MONETIZATION.md](FOUNDER_DECISION_REVIEW_MONETIZATION.md) に用意した。

### FD-1（Monetization / Critical）— 価格の不整合の解消

`BUSINESS_STRATEGY.md` が公式決定した価格（Premium ¥980・Pro ¥1,980）と、実装済みコードが実際にユーザーへ提示している価格（¥580・¥4,800）のどちらを正とするかを Founder が決定する必要がある。General Release の課金開始前に必ず解消すること。詳細: [MONETIZATION_FRAMEWORK.md](business/MONETIZATION_FRAMEWORK.md) 第6章。

### FD-2（Monetization / High）— PRO 層の実装時期

FD-1 の帰結として、Premium と Pro を区別する 3 層構成を General Release 時点で実装するか、Phase2 に送るかを Founder が決定する必要がある。Council の推奨は「Phase2 に送る」だが、最終判断は Founder に委ねる。詳細: [MONETIZATION_FRAMEWORK.md](business/MONETIZATION_FRAMEWORK.md) 第6章、[MONETIZATION_ROADMAP.md](business/MONETIZATION_ROADMAP.md) 第2章。

### FD-3（Monetization / Low）— プラン呼称の扱い

本文書群では整理のため「STARTER」という呼称を用いたが、ユーザー向け表示は既存の「Premium」を維持するか否かを Founder が最終確認すること。Council としては変更を提案していない（第4章参照）。

### FD-4（App Experience / High）— Value Ladder 断絶の解消着手時期

Question Layer・Experiment Suggestion の実装着手時期を Founder が決定する必要がある。これは Monetization Council と App Experience Council の双方が独立に指摘した最重要ギャップであり、Phase2 内での優先順位付けが求められる。詳細: [VALUE_LADDER.md](business/VALUE_LADDER.md) 第3章、[USER_JOURNEY.md](USER_JOURNEY.md) 第9章。

### FD-5（App Experience / Medium）— 実地体験の検証

Record 画面の入力所要秒数、Empty State の文言、エラー時の文言について、本 Council は文書監査のみを行い、ブラウザでの実地検証は行っていない。Founder が `/verify` 等の実機検証を別途実施することを推奨する。詳細: [USER_JOURNEY.md](USER_JOURNEY.md) 第2章・第7章・第8章。

### FD-6（App Experience / Low）— Premium 画面価格表示の凍結

FD-1 が解決するまで、premium 画面の価格表示文言を変更しないこと。詳細: [APP_EXPERIENCE_FRAMEWORK.md](APP_EXPERIENCE_FRAMEWORK.md) 第4章。

---

## Council 結論

---

# MONETIZATION COUNCIL

**議決完了**
2026-07-07

**最終判定**
CONDITIONAL GO

**Founder Action**
6件（FD-1〜FD-6のうちFD-1・FD-2・FD-3がMonetization起因）

---

# APP EXPERIENCE COUNCIL

**議決完了**
2026-07-07

**最終判定**
CONDITIONAL GO

**Founder Action**
6件（FD-1〜FD-6のうちFD-4・FD-5・FD-6がApp Experience起因、Monetization起因のFD-1〜3とも整合監査済み）

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-MONETIZATION-000 |
| **作成日** | 2026-07-07 |
| **権威レベル** | LEVEL-1 STRATEGIC DOCUMENT |
| **承認** | Founder確認待ち（第9章 FD-1〜FD-6） |
| **前提文書** | IPPO-BUSINESS-001 / IPPO-GROWTH-001 / IPPO-GTM-001 / IPPO-REGULATORY-001 |
| **コード変更** | ゼロ（監査・文書化のみ、AI_EXECUTION.md Implementation Rule準拠） |
| **次回改訂トリガー** | FounderがFD-1〜FD-6を決定した時 / Phase2着手時 |
