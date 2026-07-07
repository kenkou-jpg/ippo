# PAYWALL STRATEGY
## IPPO Monetization Council — 課金導線設計

---

> **この文書の役割**: どこで課金導線を出すべきか、どこでは絶対に出してはいけないかを定義する唯一の正典。
> 何が有料機能かは [FREE_PRO_BOUNDARY.md](FREE_PRO_BOUNDARY.md)、
> 画面ごとの実装上の遷移詳細は [SCREEN_FLOW.md](../SCREEN_FLOW.md) が担う。
> `BUSINESS_STRATEGY.md` 5-C「LTV最大化ではなく継続価値最大化」を継承し、
> ダークパターン・解約妨害・恐怖訴求を明示的に禁止する。

---

## 1. Paywall 設計の考え方

Paywall は「隠す」ための壁ではなく、「なぜ有料なのか」を証明するための窓であるべきだと Council は考える。`BUSINESS_STRATEGY.md` 5-C が定める「解約困難な UI 設計」「値下げ交渉の解約フロー」「データ削除の脅しによる継続誘導」の禁止は、そのまま本文書の前提として引き継がれている。`GTM_COUNCIL.md` 4-A Stage5 が示す通り、Free では「傾向があります」という事実の提示に留め、Premium ではその先の詳細な数値（「黄体期の痛みスコア平均が6.2で卵胞期の2倍」等）を見せる、という設計がすでに存在する。Paywall はこの「証拠だけ見せて、詳細を有料にする」という構造をそのままユーザーインターフェースに翻訳したものである。

したがって Paywall を出す場所を決める基準は一つしかない。**ユーザーがロックに触れた瞬間に「なぜ有料なのか」が一目で分かる場所にのみ出す**。理由もなく機能を使おうとした瞬間にロックが出る設計は、この基準に反するため採用しない。

---

## 2. 画面別 Paywall 配置

| 画面 | 出す/出さない | 内容 |
|---|---|---|
| welcome（初回起動） | 出さない | 課金の話を最初にしない。まず記録を始めさせる |
| home | 条件付きで出す | `hn-experiment-card`（PRO専用、週1回）のみロック表示。他は無料で完結 |
| record（記録画面） | **絶対に出さない** | 記録行動そのものに課金導線を挟むと記録継続率を毀損する（`BUSINESS_STRATEGY.md` 5-A の哲学に直接反する） |
| calendar | 出さない（PROの日別インサイトドットのみ将来ロック候補） | カレンダー閲覧自体は無料。`cal-day-insight-dot` / `cal-phase-banner`（PRO_INSIGHT_ARCHITECTURE.md Injection Point [I][J]）はロック対象になりうるが、カレンダーの基本閲覧を妨げない位置に限定する |
| insights（インサイト画面） | 出す（最重要 Paywall 面） | `ins-trend-cards`（上位5件）/ `ins-question-card` / `ins-correlation-chart` / `ins-medical-report` はロック UI。ただし `ins-clinical-summary`（観察サマリー）は無料のまま表示し、「ここまでは無料で見える」ことを証明する |
| settings | 出す（プラン確認・アップグレード導線） | 現在のプラン表示 + アップグレード CTA。ここは「押し売り」ではなく「確認できる場所」として機能する |
| premium（プラン購入画面） | 画面そのものが Paywall | Stripe Checkout 導線。ここに至る前の画面ではロック UI から遷移してくる形を基本とする |

---

## 3. 絶対に出してはいけない場面

以下の5つの場面は、Council が恒久的な禁止事項として明文化したものである。

初回記録の直前・最中に Paywall を出すことは、Free の障壁ゼロ原則（`BUSINESS_STRATEGY.md` 5-A）に違反するため禁止する。記録直後の保存成功体験（success-overlay）の直後に課金を迫ることも同様に禁止する――「保存できてよかった」という達成感の直後に営業されると、信頼そのものを損なう。これは `GROWTH_STRATEGY.md` 6-A が定める「解約防止は解約したくなくなる設計」という思想の裏返しでもある。

エラー・オフライン状態の画面にも Paywall を出さない。ユーザーが困っている瞬間に課金を迫ることは論外である。記録0件・実験0件などの Empty State にも出さない。まだ何も得ていないユーザーに「もっと欲しければ課金」という提案は成立せず、Empty State では代わりに「まず記録することの価値」を伝えるべきである（これは Paywall ではなく Onboarding の役割である）。

最後に、Research Consent の同意フロー内にも Paywall を出さない。同意は研究協力への純粋な意思表示であるべきで、課金と紐付けると Consent の任意性（`REGULATORY_MEDICAL_COUNCIL.md` BD-049）そのものを歪める疑いが生じるためである。

---

## 4. 出すべき場面

Paywall を積極的に見せるべき場面は、ユーザーが自ら「もっと知りたい」と感じた瞬間に限られる。30日分のデータが蓄積した後に傾向インサイトを表示するタイミング（`GTM_COUNCIL.md` 4-A Stage5 と一致）、insights タブの各カード（trend / question / correlation / medical-report）、settings 画面のプラン表示エリア（能動的に確認しに来た場所）、医師向けレポート生成を試みた瞬間（「先生に見せたい」という強い動機のタイミングでの提示は Behavioral Designer 観点で最も転換率が高い自然な導線である）、そしてマイルストーン通知後（30日記録達成等）の任意タイミング――ただしこれは `GROWTH_STRATEGY.md` 6-C の祝福通知に軽く添える程度に留め、通知自体を Paywall 化しないこと。

---

## 5. Paywall UI の体験原則

ロックされた機能は、何が見えるようになるかのプレビューを必ず見せること。なぜこれが有料かの一言理由を必ず添えること。年払い割引（34%）は同時に提示すること。解約導線は Paywall と同じくらい見つけやすくしておくこと。

逆に、圧力的なカウントダウンや期間限定の煽り演出、「今だけ」「残りわずか」といったスケアシティ演出、Paywall を閉じる操作を分かりにくくする設計は、いずれも Council が明示的に却下した手法である（[MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) 第4章参照）。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-MONETIZATION-004 |
| **作成日** | 2026-07-07 |
| **前提文書** | MONETIZATION_FRAMEWORK.md / FREE_PRO_BOUNDARY.md / GTM_COUNCIL.md / BUSINESS_STRATEGY.md 5-C |
| **親文書** | [MONETIZATION_COUNCIL_REPORT.md](../MONETIZATION_COUNCIL_REPORT.md) |
| **禁止事項** | 第3章はダークパターン防止の恒久ルールとして扱う |
| **次回改訂トリガー** | insights画面の実装変更時 / PRO層tier分離実装時 |
