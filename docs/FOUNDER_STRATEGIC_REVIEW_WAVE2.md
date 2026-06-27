# FOUNDER STRATEGIC REVIEW — Wave2 Go / No-Go Council
## IPPO 事業設計 最終戦略監査

---

> **文書権威レベル: LEVEL-1 ADVISORY DOCUMENT**
>
> 本文書は PR-041 着手前の最終戦略レビューである。
> 設計の補足・修正・戦略的意思決定の根拠として永久保存する。
> 技術設計の変更には別途 Council 開催が必要。

---

**文書番号:** IPPO-STRATEGIC-REVIEW-001
**開催体:** Founder × CTO × SaaS Architect × AI Platform Architect × Data Platform Architect × Product Strategist × VC Due Diligence Reviewer × Enterprise Architect
**開催日:** 2026-06-27
**スコープ:** Wave2 Go / No-Go 最終判断

---

## Executive Summary

### 現在地

IPPO は Wave1（PR-001〜PR-040）を完了し、以下を保有している:

```
✓ 堅牢な 8 層データアーキテクチャ（Layer 0〜8）
✓ 18 ドメイン / 3,424 テスト / Architecture Health: A
✓ k-anonymity 設計 / Consent Immutability / Append-Only 保証
✓ Research Dataset Foundation（Layer 8）
✓ Event Sourcing / Knowledge Graph 骨格
✓ 6種 NetworkSignal（in-memory）
✓ 世界最高水準のデータ設計思想
```

しかし同時に、以下の「見えないリスク」が存在する:

```
⚠ 有料ユーザーが何人いるか、この文書のどこにも書かれていない
⚠ app-legacy.js（10,804行）はまだ稼働中
⚠ ユーザーが今日受け取れる「お金を払う理由」が薄い
⚠ Wave2 終了まで Similarity UI は非公開（最大の差別化機能が隠れたまま）
⚠ 規制リスク（医療機器、個人情報保護法、IRB）に対する対応設計がない
⚠ 競合（Clue, Flo, Natural Cycles）との差別化が「設計レベル」にとどまっている
```

### 総合評価

| 評価軸 | 点数 | 理由 |
|---|---|---|
| データ設計の質 | **95/100** | 世界水準。Append-Only + k-anonymity + Layer 0〜12 は競合不能 |
| 技術アーキテクチャ | **88/100** | Strangler-Fig 設計は正しい。app-legacy.js の残存が減点 |
| ビジネスモデル明確性 | **42/100** | 「誰がいくら払うか」が設計文書に存在しない |
| 市場戦略 | **35/100** | 競合分析・ユーザー獲得戦略・価格設計が未文書化 |
| 規制リスク管理 | **20/100** | 医療機器規制・個人情報保護法への対応設計がない |
| 短期ユーザー価値 | **40/100** | Wave2 完了まで最大の差別化機能が非公開 |
| 長期事業価値 | **85/100** | データ資産の設計は10年後も価値がある |
| Exit Readiness | **55/100** | データ資産は売却可能だが事業指標が未整備 |

**総合: 60/100**

> 技術・設計の質は Outstanding。
> しかし「事業として成立するか」の確認が未完了。
> 世界最高のデータ設計をしても、ユーザーがいなければ資産は空洞である。

### Wave2 Go / No-Go 判定

```
CONDITIONAL GO

条件:
  1. 現在の有料ユーザー数・継続率・解約率をFounderが把握していること
  2. Wave2 実装と並行してユーザー価値の短期化戦略を持つこと
  3. 規制リスクへの基本対応方針を Founder が決定していること

条件未達の場合: NO-GO（設計より先に事業検証が必要）
```

---

## Strong Points

長期競争優位となる設計を列挙する。

---

### SP-01: データ設計の「理論的完全性」

Layer 0〜12 のデータ資産モデルは、現存する患者向け健康アプリの中で最も洗練されたものの一つである。

```
競合比較:
  Clue / Flo:    Record は保存されるが Signal は構造化されない。研究利用不可。
  Natural Cycles: 体温データのみ。Disease Entity なし。
  IPPO:           Record → Signal → Case → KG → Research Dataset という
                  完全に決定論的な再構築チェーン。

IPPOの Record が消えない限り、10年後の AI でも再分析できる。
これは設計資産として10年後も価値がある。
```

### SP-02: Consent Immutability が作る「信頼の堀」

consent_events が DELETE 禁止（BD-002）である設計は、医療・研究分野で最も重要な競争優位の一つである。

```
競合が模倣できない理由:
  「後からConsent履歴を変更できない」設計を既存プロダクトに追加するためには
  全データを再設計する必要がある。先行者が構造的優位を持つ。

研究機関が最初に問うこと:
  「このデータのConsentは証明可能か」
  IPPO は consent_events の Append-Only 履歴でこれを証明できる唯一のプラットフォームになる。
```

### SP-03: 「症例（Case）」をネットワークのノードにした設計判断

ユーザーをノードにするのではなく「疾患×実験×転帰の症例」をノードにしたことは、

```
・ユーザーが退会してもネットワーク価値が残る（Append-Only）
・1人のユーザーが複数疾患で複数 Case を持てる（密度が高い）
・類似症例マッチングが「人の繋がり」ではなく「症状の類似」になる（医療的に正確）
```

この設計は競合が容易に模倣できない。ユーザーベースを構築してからでは変更不可能な設計決定である。

### SP-04: k-anonymity の「設計への埋め込み」

k < 5 のデータを構造的に公開できない設計は、GDPR・個人情報保護法対応の観点で大きな先行優位を生む。

```
競合の現状:
  多くの女性健康アプリは研究利用時に「事後的匿名化」を行う。
  これは研究倫理上の問題点として指摘されるケースがある。

IPPO:
  「設計時点で k-anonymity を組み込んでいる」という主張が可能。
  これは研究倫理委員会・IRB との交渉で決定的な優位になる。
```

### SP-05: Append-Only がもたらす「縦断データの純粋性」

類似するアプリが「ユーザーが過去データを修正・削除できる」設計になっている中で、

```
IPPO の Record は一度書いたら消えない（BD-015/BD-001）。
これは縦断疫学研究における「データの純粋性」として最も価値が高い。

医学論文における縦断データの価値:
  横断研究（1時点）< 縦断研究（複数時点）< 介入研究
  IPPOは「変更不可能な縦断記録」として最高品質の縦断データを提供できる唯一の基盤になりうる。
```

---

## Critical Risks

### [CRITICAL] CR-01: 「現在のユーザーが何人いるか」が設計文書に存在しない

```
深刻度: CRITICAL
影響範囲: Wave2 全体の意義

Wave2 の Phase 3 完了条件は「5疾患以上で k≥50 の匿名クラスター形成」である。
k≥50 は、各疾患グループに 50 人以上の Records が必要を意味する。

問い:
  現在の有料ユーザー数は何人か？
  そのうち疾患を登録しているユーザーは何割か？
  最多疾患グループで何 Case あるか？

もし現在のユーザー数が「数百人以下」であれば:
  Phase 3（k≥50クラスター）の完了は 2028〜2029 年に達成できない可能性がある。
  それは Wave2 最大の差別化機能（Similarity UI）が永遠に非公開のままになることを意味する。

Wave2 35 PRs を実装し終えた後に「ユーザーが足りない」と気づくのは致命傷である。
```

**推奨アクション:** PR-041 着手前に以下の数値を Founder が確認・文書化すること。
- 現 MAU（月間アクティブユーザー）
- 有料ユーザー数・無料ユーザー数の内訳
- 疾患登録率（Record 保有ユーザーに対する Disease Entity 設定率）
- 継続率（3ヶ月後 / 6ヶ月後 / 12ヶ月後）

---

### [CRITICAL] CR-02: 規制リスクが設計文書に存在しない

```
深刻度: CRITICAL
影響範囲: Research Platform 全体 / AI Platform

日本の規制環境:
  ① 医療機器プログラム（SaMD）規制:
     AI が「Signal Insight」「Pattern Discovery」を提供する場合、
     内容によっては厚生労働省の薬事承認が必要になる可能性がある。
     BD-031（診断・治療・緊急度判定の禁止）はこのリスクを認識しているが、
     「どこまでがセーフで、どこからがアウト」の法的見解を取得していない。

  ② 臨床研究法 / 倫理指針:
     「疾患 × 転帰 × 治療の相関を分析した Research Dataset」を学術論文で利用する場合、
     倫理審査委員会（IRB相当）の承認が必要になる可能性がある。
     BD-021（Founder承認 + k≥5）は設計上の要件だが、法的要件ではない。

  ③ 個人情報保護法（2022年改正):
     「要配慮個人情報」（病歴・診療情報）の取扱いには特別な規定が適用される。
     k-anonymity による匿名化が法的に「匿名加工情報」の要件を満たすかの確認が必要。

  ④ 月経・妊娠関連データへの海外規制（米国):
     Dobbs 判決（2022年）以降、月経記録・妊娠関連データの取扱いは
     米国では政治的・法的に高感度な問題になっている。
     海外展開時に致命的なリスクになる。

Wave2 の Research Platform が「研究者が本当に使える基盤」になるためには、
この規制リスクの事前整理が不可欠である。整理なしで実装しても学術利用不可になる。
```

**推奨アクション:** 法律家・医療規制専門家への相談を Wave2 開始前に実施すること。

---

### [CRITICAL] CR-03: Wave2 完了まで最大の差別化機能が非公開

```
深刻度: CRITICAL
影響範囲: ユーザー獲得・継続率・収益

IPPO の最大の差別化機能は「類似症例マッチング（Similarity UI）」である。
しかし Similarity UI は Phase 3（BD-026/027）まで非公開と設計されている。

Wave2 のロードマップ:
  Phase A（PR-041〜045）: Infrastructure Migration
  Phase B（PR-046〜050）: Disease Intelligence
  Phase C（PR-051〜056）: Knowledge Architecture
  Phase D（PR-057〜062）: AI Platform
  Phase E（PR-063〜067）: Similarity Evolution → PR-066 で Phase 3 Validator
  Phase F（PR-068〜072）: Research Platform
  Phase G（PR-073〜075）: Wave2 Exit

ユーザーから見ると:
  PR-041 から PR-065 まで、ユーザーが受け取る価値の増加がほぼゼロ。
  ユーザーは「Infrastructure Migration」を体験できない。
  「Disease Entity Upgrade」も体験できない。
  「Feature Store」も「Knowledge Graph」も画面に現れない。

これは「18〜24ヶ月間、ユーザーへの価値提供なしに実装を続ける」ことを意味する。

継続率への影響:
  有料ユーザーは「価値を感じ続ける」間だけ課金する。
  Wave2 の前半で価値が増加しなければ、継続率が低下し、
  Phase 3 完了条件の「k≥50 クラスター」の達成がさらに遅れる悪循環になる。
```

**推奨アクション:**
ユーザーが受け取れる中間価値を Wave2 に組み込むことを検討する。
例: Signal Insight の簡易版（Phase D の AI なしバージョン）を早期公開する設計変更。

---

### [HIGH] CR-04: app-legacy.js（10,804行）の長期リスク

```
深刻度: HIGH
影響範囲: 開発速度・品質・採用

Wave1 完了後も app-legacy.js は 10,000 行を超えて稼働している。
Strangler-Fig 戦略は正しいが、「いつ解体完了するか」が設計文書に存在しない。

リスク:
  ① Wave2 終了時（PR-075）でも app-legacy.js が残存する可能性が高い
  ② 外部エンジニア採用時に「10,000 行の God Object が稼働している」は大きなマイナス
  ③ exit 時の事業評価で技術負債として大幅な Haircut（減額）を受ける
  ④ Wave3 で「AI + Knowledge Graph」を本格統合しようとした時に
     app-legacy.js との境界管理が複雑になる
```

---

### [HIGH] CR-05: ビジネスモデルが設計文書に存在しない

```
深刻度: HIGH
影響範囲: 事業持続性・資金調達・Exit

WAVE2_MASTER_DESIGN / WAVE2_ROADMAP / WAVE2_ARCHITECTURE を精読したが、
以下の情報が一切記載されていない:

  ・月額課金はいくらか？
  ・無料プラン vs 有料プランの機能境界はどこか？
  ・Research Dataset のライセンス料はいくらか？
  ・誰が Research Dataset を買うのか（製薬会社？大学？）
  ・Similarity UI は有料機能か無料機能か？
  ・B2B API の価格体系はどうなるか？
  ・Wave3 以降の AI 機能の課金設計は？

設計文書はすべて「何を作るか」を定義しているが
「誰がいくら払うか」が定義されていない。

事業として成立するかどうかは、技術設計の質ではなく
「ユーザーが継続的にお金を払い続けるか」で決まる。
```

---

### [HIGH] CR-06: 競合分析が設計文書に存在しない

```
深刻度: HIGH
影響範囲: 差別化戦略・ポジショニング

主要競合:
  Clue (Berlin): 1,200万 MAU / シリーズ C / 医療研究連携実績あり
  Flo (London/Belarus): 7,000万 MAU / IPO申請中 / 医師監修付き
  Natural Cycles (Stockholm): 80万 MAU / FDA認定 / 避妊アプリとして承認
  ルナルナ（NTT）: 日本最大 / 650万以上 / 医療機関連携
  カラダノート (Japan): 妊活・育児特化 / 上場済み

IPPOの現在地:
  これらの競合と比較したユーザー数・MAU・継続率の位置が不明。

競合が模倣しにくい点:
  ✓ Append-Only × Consent Immutability × k-anonymity 埋め込み → 設計上不模倣
  ✓ Case をノードにした Similarity Network → 設計上不模倣
  ✗ 「縦断データの蓄積」自体 → Clue/Flo も蓄積している（差別化には設計の清潔さが重要）

競合がすでに持っているもの:
  ✗ 医師監修 → IPPO にはない（BD-031 で AI 診断禁止だが、人間の医師監修も未定）
  ✗ 研究機関との提携 → Clue はオックスフォード・スタンフォードと実績あり
  ✗ 規制承認 → Natural Cycles は FDA 認定（月経追跡として）

5年後に IPPO が Clue/Flo と戦う場合、
「データ設計の清潔さ」だけで勝てるかは今から検証が必要。
```

---

### [MEDIUM] CR-07: Wave2 の 35 PR は「長すぎる」

```
深刻度: MEDIUM
影響範囲: 実装速度・フォーカス

PR-041〜PR-075 は以下の順序で進む:
  Phase A: Infrastructure
  Phase B: Disease
  Phase C: Knowledge
  Phase D: AI
  Phase E: Similarity
  Phase F: Research
  Phase G: Exit

ユーザーに見える価値が届くのは Phase E 以降（PR-063〜）。
PR-041 から PR-062 まで、ユーザーには何も届かない 22 PR が続く。

SaaS の現実:
  月次リリースでユーザーが「アプリが進化している」と感じることが継続率に直結する。
  22 PR の間「見えない改善」しかなければ、
  Founder のモチベーション維持も、ユーザーの継続も困難になる。

提案:
  Wave2 内で「ユーザーに届く中間マイルストーン」を設計する。
  例: Phase B 完了時に「あなたの疾患グループでの症状分布」の簡易表示を追加する。
```

---

### [MEDIUM] CR-08: Research Platform の実際の顧客が不明

```
深刻度: MEDIUM
影響範囲: Research Platform の事業価値

WAVE2_ROADMAP には Research Platform（Phase F / PR-068〜072）が含まれるが、
「誰がこの Research Dataset を使うのか」「いくらで売るのか」が未定義。

想定顧客候補:
  ① 製薬会社（子宮内膜症・多嚢胞性卵巣症候群の新薬開発）
  ② 大学医学部（疫学研究）
  ③ 医療機器メーカー（診断補助ツール）
  ④ 政府・厚生労働省（女性疾患実態調査）

しかし:
  ・DOI Candidate（Wave2 で付与）から実際の学術論文化（Wave3 以降）まで
    どの顧客がいつお金を払うかが明確でない
  ・IRB 承認なしに製薬会社への Research Dataset 販売が可能かは法的に不明
  ・「匿名化済み」が研究倫理上の要件を満たすかは国ごとに異なる

VC が Due Diligence で最初に問うこと:
  「Research Dataset を誰に、いくらで、何件売る見込みがあるか」
  これに回答できる準備が Wave2 完了後に必要。
```

---

### [MEDIUM] CR-09: 医師・専門家との連携設計が存在しない

```
深刻度: MEDIUM
影響範囲: 信頼性・規制承認・学術利用

IPPO の AI（BD-031）は「診断・治療・緊急度判定を禁止」している。
これは正しい判断だが、その代わりに「誰が医学的正確性を担保するか」が設計に存在しない。

問題:
  ・Signal Insight（「あなたの痛みは黄体期に増悪する」）は医学的に正確か？
  ・Knowledge Graph のエッジ（Disease × Symptom 相関）は医学文献と整合するか？
  ・ユーザーが AI の Insight を医学的アドバイスと誤解した場合の責任は？

競合比較:
  Clue / Flo: 婦人科医の監修チームを持ち、医学的正確性を保証
  Natural Cycles: FDA 認定 / スウェーデン CE マーク取得
  IPPO: 「医療ではない」という免責だけでは不十分になる可能性がある

推奨:
  Wave2 実装と並行して、婦人科医 1〜2 名をアドバイザーとして招聘する。
  これは規制リスク管理だけでなく、ユーザー信頼性・研究機関への説得力に直結する。
```

---

### [LOW] CR-10: Knowledge Graph の「骨格だけ問題」

```
深刻度: LOW（Wave2 時点では問題ない / Wave3 で顕在化する）
影響範囲: AI Platform の価値

Wave2 で構築する Knowledge Graph は「Disease × Symptom × Outcome の骨格」である。
しかし骨格だけでは AI に十分なコンテキストを提供できない。

Wave3 で必要なもの:
  ・医学文献との照合（ICD-11 / SNOMED CT / MedDRA）
  ・KG エッジの医学的検証（AI が提案する相関が医学的に妥当か）
  ・Ontology との接続（Layer 12）

Wave2 段階では問題ない（骨格構築が目標）が、
Wave3 設計に「外部医学知識との統合」を計画に明記しておく必要がある。
```

---

## Missing Opportunities

現時点で設計に含まれていないが、長期事業価値を大きく向上させる可能性がある領域。

---

### MO-01: 「記録継続率」を KPI として設計に組み込む

```
IPPO の最大の競争優位は「縦断データ」である。
縦断データの価値は「記録が続くこと」によって生まれる。

しかし現在の設計には「記録継続率を高める機能」が組み込まれていない。

提案:
  Wave2 の Phase B 完了時点で、ユーザーに「あなたは 90 日連続記録中」の
  フィードバックを返す機能を追加する（Rule Engine の最初のユースケース）。

  「記録すること自体への報酬」を設計に組み込むことで、
  k≥50 クラスター達成のためのユーザー密度を自然に高められる。
```

### MO-02: 患者コミュニティとの接続

```
子宮内膜症・多嚢胞性卵巣症候群等の患者は
「同じ経験をした人と繋がりたい」という強い欲求を持つ。

競合:
  Clue は「Clue for Research」でコミュニティ機能を持つ
  ルナルナは医療機関予約機能を持つ

IPPO の Similarity UI（Phase 4 / Wave3 以降）は
このニーズに応えられる設計になっているが、
「患者コミュニティ組織（患者会）」との接続設計がない。

提案:
  Wave2 の Research Platform が完成したタイミングで、
  子宮内膜症学会・日本女性医学学会等との MOU 締結を目標にする。
  これが Research Dataset の実際の「顧客」への道筋になる。
```

### MO-03: B2B SaaS としての婦人科クリニック向けダッシュボード

```
現在の IPPO はすべて「患者向け」として設計されている。
しかし IPPO のデータは「婦人科医向けの診察補助ツール」としても価値がある。

具体的には:
  「患者が自宅で記録した 6 ヶ月分の症状推移を
   診察室でリアルタイムに確認できるダッシュボード」

このユースケースは:
  ・患者の記録継続率を高める（「先生に見せるために記録する」）
  ・B2B 収益源（クリニックへの月額課金）を追加できる
  ・医師との連携でリスク対策にもなる（BD-031 遵守の文脈で医師が補完する）
  ・Research Dataset の品質確認者として医師を組み込める

これは Wave3 のスコープとして WAVE2_ROADMAP に接続点を作っておくべきである。
```

### MO-04: 「経験の言語化」への Research 価値

```
IPPO の現在の Signal は定量データ（痛みの強度 0〜10 / 睡眠時間等）である。
しかし患者の最も貴重な経験は「言語」で記録されている。

例:
  「黄体期に入ると、なぜか甘いものが食べたくなる」
  「生理 3 日目に仕事への集中力が完全に失われる」
  「子宮内膜症の手術後 6ヶ月は痛みが激減したが、1 年後から戻ってきた」

これらは定量 Signal で捉えられない「経験の文脈」であり、
研究者が最も必要としているが、現在どのデータベースにも存在しない。

Wave2 の Observation Notes（PR-072）がこのニーズに応える可能性を持つが、
「Natural Language Processing で意味を抽出し KG に反映する」設計が
Wave3 の接続点として明示されていない。

提案:
  Wave3 設計に「Patient Voice → KG Edge」パスを接続点として明記する。
```

### MO-05: 月経追跡以外の女性疾患への拡張設計

```
現在の IPPO の Disease Entity は「diseaseKey」で管理されており、
理論上は任意の疾患に拡張可能である。

しかし Wave2 の設計全体を見ると、
「月経周期 × 疾患」の構造が中心になっており、
以下への拡張が設計文書に言及されていない:

  ・更年期障害（閉経後 = 月経フェーズなし）
  ・妊娠中（月経なし / 別フェーズ体系）
  ・がん治療中（化学療法による月経停止）
  ・トランスジェンダー女性（生物学的月経なし）

これらは「女性疾患プラットフォーム」が10年後に直面する拡張要件であり、
今から設計の「拡張性」として検討しておく必要がある。

現在の MenstrualPhase（MENSTRUAL/FOLLICULAR/OVULATION/LUTEAL/UNKNOWN）の
UNKNOWN カテゴリがこれらを吸収できるか確認が必要。
```

---

## Founder Recommendations

重要度順に提示する。

---

### FR-01（最優先）: 現在の事業数値を把握・文書化する

```
対象: Founder
期限: PR-041 着手前（即時）
理由: Wave2 の意義はユーザー密度なしには成立しない

確認事項:
  □ 現在の MAU（月間アクティブユーザー数）
  □ 有料ユーザー数
  □ 月額課金単価 / 月次収益（MRR）
  □ 疾患登録ユーザー率
  □ 最多疾患の Case 数（k≥50 到達見込み）
  □ 3ヶ月継続率 / 12ヶ月継続率

判断基準:
  もし MAU が 100 未満であれば:
    Wave2 実装より「ユーザー獲得 / 記録継続率改善」が最優先事項
  MAU 500 以上あれば:
    Wave2 への進行は正当化できる

この数値なしに Wave2 35 PR を実装することは、
「誰もいない街にインフラを建設すること」になるリスクがある。
```

---

### FR-02: 規制リスクの法的整理（Wave2 開始前）

```
対象: Founder + 法律顧問
期限: Phase D（AI Platform / PR-057）着手前
理由: AI 出力の規制境界を実装前に確認する

確認事項:
  □ 「Signal Insight」は薬事法上のプログラム医療機器（SaMD）に該当するか
  □ Research Dataset の学術利用に IRB 承認は必要か
  □ k-anonymity による匿名化が個人情報保護法上の「匿名加工情報」要件を満たすか
  □ 月経データの海外移転（将来の海外展開時）への法的制約
  □ AI 出力に関する免責文言の法的十分性

リスク:
  AI Platform（Phase D）を実装した後に
  「SaMD 該当」と判定された場合、薬事承認なしには公開できなくなる。
  承認プロセスは 2〜3 年かかる。
```

---

### FR-03: 「Wave2 中間価値」の設計追加

```
対象: Founder + Product Architect
期限: Phase A 完了前に設計決定
理由: ユーザーが PR-041〜PR-065 の間に受け取れる価値がゼロ

提案（実装規模が小さいもの優先）:

  ① Phase B 完了時（PR-050）:
     「あなたの症状強度は同疾患グループと比較して上位 X% です」の
     匿名集計表示（クラスター統計の簡易版）

  ② Phase C 完了時（PR-056）:
     「あなたの過去 90 日の Signal パターン」の Longitudinal 可視化
     （Similarity UI なしで実装可能 / Rule Engine で代替）

  ③ Phase D 完了時（PR-062）:
     AI Safety Layer 通過済みの「Signal Insight」の最初の提供

これらはロードマップの順序を変えずに、
「既存機能の可視化」として追加できる可能性がある。
Founder が設計判断として決定すること。
```

---

### FR-04: 婦人科医アドバイザーの採用

```
対象: Founder
期限: Phase D（AI Platform）開始前
理由: AI Insight の医学的正確性の担保 + 規制リスク管理 + 研究機関への説得力

採用プロフィール:
  ・婦人科専門医（子宮内膜症 / PCOS の専門性が理想）
  ・研究活動がある（大学病院所属が理想）
  ・デジタルヘルスへの理解がある

役割:
  ① Knowledge Graph エッジの医学的妥当性レビュー
  ② AI Insight 文言の医学的正確性確認
  ③ 研究機関への IPPO 紹介
  ④ IRB 申請のアドバイス

コスト:
  株式報酬（アドバイザーストック）で採用可能。
  このコストは Wave2 Research Platform の価値を 10 倍にする可能性がある。
```

---

### FR-05: app-legacy.js 解体の「終了条件」を設定する

```
対象: Founder + CTO
期限: Wave2 Phase G（PR-075）完了時の評価
理由: Exit Readiness の観点で技術負債の見通しが必要

現在の Strangler-Fig 戦略では「いつ解体するか」が未定義。

提案:
  Wave2 完了後の評価として:
  「PR-075 完了時点で app-legacy.js は何行か」を Metrics に追加する。
  10,000 行から 5,000 行に減少していれば「Wave3 で完全解体」を目標設定できる。

Exit（売却）の観点:
  買い手の技術デューデリジェンスで
  「10,000 行の God Object が稼働している」は減点要因になる。
  Wave3 完了時に app-legacy.js = 0 を目指すタイムラインを設定することを推奨。
```

---

### FR-06: 海外展開の「最初のターゲット市場」を決定する

```
対象: Founder
期限: Wave3 設計開始前（Wave2 後半）
理由: 日本市場のみでは Phase 7（国際標準）に達しない

推奨ターゲット（優先順）:
  1. 台湾:
     日本に類似した文化・規制環境。繁体字対応で参入障壁低。
     台湾の子宮内膜症有病率は高く、データ需要がある。

  2. 韓国:
     K-Pop 文化での健康意識の高さ。デジタルヘルス受容度が高い。
     IPPO の設計思想（Append-Only / 科学的厳密性）が受け入れられやすい。

  3. 英語圏（オーストラリア）:
     FDA リスクなしに英語でテストできる最大市場。
     Clue/Flo との直接競合になるが、Research Platform で差別化できる。

海外展開に必要なこと:
  ・多言語対応（UI 層の設計 / Layer 0〜1 の言語非依存化）
  ・各国の医療規制確認
  ・GDPR 対応（EU展開の場合）
```

---

## Roadmap Review

### PR-041〜075 の順序評価

---

#### 現在の順序

```
Phase A（PR-041〜045）: Infrastructure Migration
Phase B（PR-046〜050）: Disease Intelligence
Phase C（PR-051〜056）: Knowledge Architecture
Phase D（PR-057〜062）: AI Platform
Phase E（PR-063〜067）: Similarity Evolution
Phase F（PR-068〜072）: Research Platform
Phase G（PR-073〜075）: Wave2 Exit
```

#### 評価

**Phase A（Infrastructure First）: 正しい**

```
PR-041（NetworkSignal Persistence）が最初であることは正しい（BD-034）。
Signal が Supabase に永続化されなければ、以降の全 Phase が成立しない。
順序変更の必要なし。
```

**Phase B-C の順序: 正しい**

```
Disease Intelligence（Phase B）の完成が Feature Store（Phase C）の入力になる。
Knowledge Architecture（Phase C）は Feature Store を必要とする。
順序変更の必要なし。
```

**Phase D（AI Platform）の位置: やや遅い可能性**

```
Issue:
  AI Platform（Phase D）は Phase C 完了後に始まるが、
  「Signal Insight の簡易版」は Feature Store 完成前でも提供できる可能性がある。
  Rule Engine（PR-057）は Feature Store よりも Domain Service の Signal 集計で動作できる。

提案（Conditional）:
  PR-057〜058（Signal Insight Foundation / Rule Engine）を
  Phase B 完了後に前倒しする設計変更を検討する。
  これにより Phase B 完了時点（PR-050）でユーザーへの中間価値を提供できる。
  
  ただしこの変更は Feature Store への依存関係の精査が必要。
  Feature Store なしでも Signal Rule Engine が動作するなら前倒し可能。
  Founder が判断すること。
```

**Phase E（Similarity Evolution）の位置: 正しいが Phase Gate が課題**

```
PR-066（Phase 3 Completion Validator）が存在することは正しい。
しかし Phase 3 完了条件（k≥50 クラスター、5疾患以上）の
達成見込みが現在のユーザー数に依存する。

推奨:
  Phase 3 完了条件の「しきい値」をユーザー規模に応じて段階的に設定する。
  例: 「最初の Similarity UI 公開は k≥10 で可能 / k≥50 でフル公開」
  この変更は BD-027 の見直しが必要（Council 開催必要）。
```

**Phase F（Research Platform）: 位置は正しいが顧客設計が必要**

```
Research Platform は Similarity Engine V2（Phase E）の後に来ることは正しい。
しかし Phase F 実装前に「実際の研究者との接触」が必要。
実装→顧客探しではなく、顧客確認→実装の順序にすることを推奨。
```

**全体の順序変更提案（最小限）:**

```
変更なし（Phase A〜G の順序は技術的に正しい）

追加推奨（順序変更ではなく追加）:
  PR-050.5（非公式 PR）:
    Phase B 完了後に「Disease Signal 簡易 Dashboard」を追加する。
    ユーザーが受け取れる中間価値として。
    これは Route Registry / Feature Registry への追加のみで実装可能。
```

---

## Final Decision

### GO / CONDITIONAL GO / NO-GO

```
CONDITIONAL GO

Wave2（PR-041〜PR-075）への進行を許可する。
ただし以下の条件を満たすことを Founder が確認・宣言すること。
```

---

### 条件 1（即時確認必須）

```
Founder は PR-041 着手前に以下の数値を把握していること:

  ① 現在の有料ユーザー数
  ② 現在の MAU
  ③ 最多疾患グループの Case 数
  ④ 3ヶ月継続率

これらが「Wave2 の意義を正当化する水準」（Founder が判断）にあれば GO。
水準を下回る場合は、Wave2 と並行してユーザー獲得施策を起動すること。
```

---

### 条件 2（Phase D 開始前に必須）

```
AI Platform（PR-057）着手前に、法律顧問との相談を経て
「Signal Insight が薬事法上のプログラム医療機器に該当しないこと」
または「該当する場合の対応方針」を Founder が決定していること。
```

---

### 条件 3（Wave2 全体で継続）

```
Wave2 の実装フェーズにおいて、Founder は毎月以下を確認すること:
  ① MAU の推移（低下していれば中間価値の追加を検討）
  ② 最多疾患グループの Case 数推移（Phase 3 達成見込みの確認）
  ③ 継続率の推移
```

---

### Council 所見

```
IPPO の設計哲学は正しい。

「縦断データ × Append-Only × Consent Immutability × k-anonymity」の組み合わせは
現存する女性健康アプリの中で最も学術的に信頼できる設計である。

しかしプロダクトは「最高の設計」で成立するのではなく
「ユーザーが継続的にお金を払い続けること」で成立する。

Wave2 は「孤島を大陸に変えること」を使命とする。
しかし大陸に変えるためには、まず「孤島に人が住んでいること」が必要である。

Founder が現在の事業数値を把握し、Wave2 の意義を確認した上で進行することを
Council 全員一致で推奨する。

Wave2 の技術設計は CONDITIONAL GO である。
事業戦略の整合性確認後、完全な GO になる。
```

---

**FOUNDER STRATEGIC REVIEW COUNCIL — 審議完了 2026-06-27**
**判定: CONDITIONAL GO**
**条件: 上記 3 条件の Founder 確認・宣言**
