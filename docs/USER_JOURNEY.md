# USER JOURNEY
## App Experience Council — 初回起動から習慣化までの体験設計

---

> **この文書の役割**: 初回体験（Onboarding）・継続利用導線（Retention）・課金導線（Conversion）・
> Premium体験を、一つの連続した旅として記述する唯一の正典。
> 画面そのものの役割は [SCREEN_FLOW.md](SCREEN_FLOW.md)、Paywallの配置原則は
> [PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md)、価値の段階としての評価は
> [VALUE_LADDER.md](business/VALUE_LADDER.md) が担う。本文書はそれらを「時間軸に沿った一つの体験」
> として統合する場所であり、個々の画面設計・Paywall配置ルールの再掲は行わない。

---

## 1. 旅の全体像

`GTM_COUNCIL.md` Section 4 が描いたユーザージャーニーを土台に、実装済み画面（[SCREEN_FLOW.md](SCREEN_FLOW.md)）と突き合わせて General Release 時点の体験を評価すると、この旅は大きく5つの区間に分かれる。初回起動から最初の記録までの「初回体験」、記録が意味を持ち始めるまでの「理解の獲得」、そこから先の行動へとつながる「改善への一歩」、それが繰り返される「習慣化」、そして有料プランへの「転換」である。結論を先に述べれば、最初の2区間は強固に実装されているが、3区間目に構造的な弱さがあり、これが4区間目・5区間目にも影響を及ぼしている。

---

## 2. Onboarding Experience — 初回起動・初回記録・初回AI分析・初回実験

初回起動時、ユーザーは `screen-welcome` から `modules/onboarding-runtime.js` の案内に沿ってオンボーディングを進める。「疾患を選ぶだけで始められる」という `GTM_COUNCIL.md` 4-A Stage1 が掲げる摩擦最小化の方針は、HANDOFF の記載からも一貫して守られていることが確認できる。

続く初回記録は `screen-record` の3-card記録フローが担う。目標である「5分以内」という摩擦水準は、この3カード構成であれば十分に達成可能だと Council は評価する。

初回のAI分析、すなわち Free でも得られる30日サマリーは `home-insight-engine.js` と `ins-clinical-summary` によってすでに実装されている。ただし「初回」に限定した特別な演出――`GTM_COUNCIL.md` 4-A Stage3 が想定する「30日サマリーの自動生成」を一つのイベントとして際立たせる工夫――が実装に含まれているかどうかは、本監査では確認できなかった。これは Founder が確認すべき事項として第9章に記録する。

そして初回実験である。ここが Onboarding の中で最も弱い区間になる。`modules/experiments.js` は基礎実装に留まり、[VALUE_LADDER.md](business/VALUE_LADDER.md) が指摘する「改善」段階のギャップと同じ原因により、現状はユーザーが自発的に Experiments 機能を見つけて使うことに依存しており、Onboarding の一部として組み込まれてはいない。

---

## 3. Record Experience — 最短秒数・入力ストレス・離脱ポイント

3-card記録フロー（record-three-card.js）に Draft保護（record-draft-guard.js）が組み合わさることで、入力途中の離脱による喪失を防ぐ設計になっている。この Draft保護の存在は、離脱ポイントを緩和する重要な仕掛けだと Council は評価する。3カード構成は「症状→生活習慣→確認」という3ステップで完結し、PR-092Cで完全に削除された旧5ステップwizard（saveRecord経路）よりも明らかに簡素化されている。

実際の入力に何秒かかるかという定量評価は、ブラウザでの実測が必要であり、本監査は文書監査の範囲に留まるため行っていない。`/verify` スキル等を用いた実地検証を推奨する。

---

## 4. Experiment Experience — 開始・進行・終了・結果確認・AI分析

Experiments 機能には「開始」はあるが、「AI分析まで一本化された体験」は存在しない。これは [VALUE_LADDER.md](business/VALUE_LADDER.md) 第2章③で述べたギャップと同一の原因による。Phase2でQuestion LayerとExperiment Suggestionが実装されて初めて、「開始→進行→終了→結果確認→AI分析」という1本の体験が完成する。現時点でこの体験は「開始→進行→終了」までで途切れている。

---

## 5. AI Experience — いつ・どこで・何を表示するか、Free/PRO境界

`PRO_INSIGHT_ARCHITECTURE.md` の設計に従い、home では上位1件が Free/PRO 共通で表示され、PROではより高スコアの候補にもアクセスできる。insights では tier別に全件が表示される。Free/PRO の境界は [FREE_PRO_BOUNDARY.md](business/FREE_PRO_BOUNDARY.md) が定義する通り `isPremium()` の1箇所判定に一元化されており、AI Experience自体の設計原則（Explainable / Cacheable / Tier-pure）は健全に維持されている。

規制面では、`REGULATORY_MEDICAL_COUNCIL.md` BD-044がすべてのAI出力に免責文言を義務付けている。本監査ではコード上の免責文言の網羅的な検証までは行っておらず、BD-048が定める禁止ワードリストの半年ごとのレビュー運用でこれを担保する前提とする。

---

## 6. Timeline Experience — タイムライン・履歴・比較・検索

「比較」（Disease Cluster位置確認等）と「検索」は、現状カレンダー・履歴とは別の画面（insights）に機能として分散している。統合された単一のTimeline画面は存在しないが、これは Home / Calendar / Insights へ意図的に機能を分散させた設計であり、Council はこれを問題として扱わない。新規の統合画面を提案することはUI変更に該当し、本Councilのスコープを超える（[MONETIZATION_COUNCIL_REPORT.md](MONETIZATION_COUNCIL_REPORT.md) 第4章「却下された案」参照）。

---

## 7. Premium Experience — 有料導線が体験を邪魔していないか

[PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md) の設計原則に基づき、Record画面・エラー画面・Empty State・Consent画面にはPaywallが存在しないことを文書レベルで確認した。実装コード上でのgrep確認までは本監査では行っておらず、Founder確認事項として第9章に記録する。設計原則としては、有料導線がユーザー体験を邪魔していないと Council は結論づける。最終的な確認はブラウザでの実地検証を推奨する。

---

## 8. Empty State — データ0件・実験0件・AI結果なしの場合

`modules/pro/shared/render/renderEmptyState.js` の存在を確認した。Empty State用のレンダリング関数自体はすでに存在する。その内容が「まず記録することの価値」を伝える文言になっているかどうかは、コード変更を伴わない文書監査のスコープ外であり、[PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md) 第3章が定める「Empty StateにPaywallを出さない」原則との整合確認は、実装レビュー時に別途行うことを推奨する。

---

## 9. Error Experience — 通信失敗・AI失敗・保存失敗・オフライン

`runtime/health-monitor.js` / `runtime/rollback-manager.js` / `runtime/production-diagnostics.js` が示す通り、インフラレベルの健全性監視は充実している。一方でユーザー向けのエラーメッセージ文言やオフライン時のUI表現は、本監査のスコープ外（UI変更を伴う実装レビューが必要）である。[PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md) 第3章が定める「エラー画面にPaywallを出さない」原則は、設計原則としては担保されている。

---

## 10. Journey全体の評価

この旅を通して見えるのは、明確なコントラストである。Onboarding から初回記録、初回AI分析までの区間――Free体験の核をなす部分――は強く実装されている。一方で初回実験からExperiment Experienceにかけての区間は弱い。原因は共通しており、[VALUE_LADDER.md](business/VALUE_LADDER.md) が指摘した「改善」段階の未実装と同一である。

STARTER への転換動機は、実装済みの Longitudinal Analysis や Signal Insight によって十分に機能する設計になっている。しかし STARTER から PRO への転換を考えたとき、「次の一手」を提案する仕組みが欠けているため、その動機付けは弱いままである。この旅の完成度を左右するのは、結局のところ Experiment Suggestion の実装であり、Council はこれを [MONETIZATION_ROADMAP.md](business/MONETIZATION_ROADMAP.md) Phase2の最優先項目として位置づける（Founder Decision FD-4、詳細は[MONETIZATION_COUNCIL_REPORT.md](MONETIZATION_COUNCIL_REPORT.md) 第9章）。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-APPEXP-004 |
| **作成日** | 2026-07-07 |
| **前提文書** | GTM_COUNCIL.md Section 4 / VALUE_LADDER.md / PAYWALL_STRATEGY.md / FEATURE_INVENTORY.md |
| **親文書** | [MONETIZATION_COUNCIL_REPORT.md](MONETIZATION_COUNCIL_REPORT.md) |
| **未検証事項** | Record入力秒数の実測 / Empty State文言 / Error文言（いずれもFD-5としてブラウザ実地検証を推奨） |
| **次回改訂トリガー** | Experiment Suggestion実装時 / オンボーディングフロー変更時 |
