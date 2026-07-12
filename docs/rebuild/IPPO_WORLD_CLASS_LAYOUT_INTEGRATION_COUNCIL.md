# IPPO WORLD-CLASS LAYOUT INTEGRATION COUNCIL

> [IPPO_WORLD_CLASS_LAYOUT_EVOLUTION_COUNCIL.md](IPPO_WORLD_CLASS_LAYOUT_EVOLUTION_COUNCIL.md) と [IPPO_PRODUCT_IDENTITY_AUDIT.md](IPPO_PRODUCT_IDENTITY_AUDIT.md) を統合し、「世界トップクラスの女性向け体質改善実験プラットフォーム」としての完成度を最大化するための最終レイアウト統合会議。
> 本Council終了後、PR-LAYOUT-02としてレイアウト・UI・UXの実装（HTML/CSS/ダミーデータ/コピー/画面遷移/アニメーションのみ）に着手する。Supabase/Stripe/AI API/認証/Business Logic/DB設計/新規バックエンドは対象外。
> 前提資料はすべて読み込み済み（[UI_UX_FOUNDATION_COUNCIL.md](UI_UX_FOUNDATION_COUNCIL.md) / [IPPO_REBUILD_INTEGRATION_COUNCIL.md](IPPO_REBUILD_INTEGRATION_COUNCIL.md) / [IPPO_FINAL_PRODUCT_EXPERIENCE_AUDIT.md](IPPO_FINAL_PRODUCT_EXPERIENCE_AUDIT.md) / [IPPO_FIRST_30_MIN_EMOTIONAL_JOURNEY_AUDIT.md](IPPO_FIRST_30_MIN_EMOTIONAL_JOURNEY_AUDIT.md) / 両対象文書 / `ippo-rebuild`の実コード）。

---

## Executive Summary

World-Class Layout Evolution CouncilとProduct Identity Auditは、独立した評価軸（前者=競合比較、後者=ブランド・記憶定着力）から出発したにもかかわらず、**同一の3項目を独立に最重要課題として特定した**。これは偶然の一致ではなく、Prototypeの現状における最大のボトルネックが単一の根本原因（Homeに視覚的主役が存在しない）に収束していることを意味する。

両監査を統合すると、真に必要な改善は多くない。World-Class側のMedium/Low項目の一部は、主役指標の再設計に吸収されるか、そもそも今実施する必要性が薄い。Identity側で新たに浮上した「共有前提ビジュアル」「固有ブランドマーク」は、既存の3項目と組み合わせることで初めて「ブランドとして選ばれる」水準に届く、独立した価値を持つ。

統合の結論として、PR-LAYOUT-02は5項目（Homeシグネチャービジュアル・確信度メーター・マイルストーン演出・固有ブランドマーク・共有前提ビジュアル）に絞り込み、残りはPR-LAYOUT-03（オンボーディング濃厚化・継続可視化・磨き込み）に振り分ける。

**現時点（PR-LAYOUT-01完了時点）のExit Criteria充足状況**: Critical=0件（達成）、High=3件（未達、PR-LAYOUT-02完了で0件化見込み）。したがって本Councilの**Final Verdict: CONDITIONAL GO**（PR-LAYOUT-02実行を条件とする）。

---

## Integrated Improvement List（重複を除いた改善一覧）

### 1. 両監査で共通して指摘された事項（最優先・完全一致）

| # | 項目 | World-Class側の表現 | Identity側の表現 |
|---|---|---|---|
| A | Homeのシグネチャービジュアル確立 | 「単一の圧倒的な指標がない」（High#1） | 「シグネチャービジュアルが存在しない」（P1、最大レバレッジ項目） |
| B | 気づきカードの確信度メーター | 「相関の強さを視覚的に示す仕組みがない」（High#2） | 「科学的根拠を伝える力で一歩劣る」（P6） |
| C | 実験完了時のマイルストーン演出 | 「お祝いの演出がない」（High#3） | 「感情のピークを演出しきれていない」（P5） |

この3項目が両監査で独立に最重要と特定されたこと自体が、統合Councilとしての最も重要な発見である。

### 2. World-Class Councilのみで指摘された事項 — 必要性評価

| 項目 | 分類 | 必要性評価 |
|---|---|---|
| 継続ストリップ（直近7日ドット） | Medium | **条件付きYes**。Home情報密度規律（6ブロック上限）を圧迫するリスクがあるため、新規ブロックとしてではなくHero内への軽量統合を条件とする |
| 気分ピッカー拡大＋スケールアニメーション | Medium | **Yes（低優先）**。低コスト・低リスクだが効果も限定的、PR-LAYOUT-03の磨き込みに回す |
| 進行中実験リングをHome上で拡大 | Medium | **不要（Aに吸収）**。Aのシグネチャービジュアル再設計次第で実質的に解決される可能性が高く、独立実施は不要 |
| Premiumロックのコンテキスト連動文言化 | Low | **今回不要**。実データ接続が前提のため、レイアウトのみの本Councilのスコープでは実施不可。将来（本実装後）に確定送り |
| Recordタップフィードバック強化 | Low | **Yes（低優先）**。PR-LAYOUT-03の磨き込みに回す |

### 3. Product Identity Auditのみで指摘された事項 — 必要性評価

| 項目 | 必要性評価 |
|---|---|
| 固有アイコン/ブランドマーク（P2） | **Yes、必要**。ただし全アイコンのSVG化はPrototype段階では過剰投資。Heroまたはナビ内に1点、IPPO固有のシグネチャーアイコンを導入する範囲に絞る（全面SVG化は本実装時でよい、と既存監査で分類済みの方針を維持） |
| 結果カードの共有前提ビジュアル（P3） | **Yes、必要**。App Store/SNS訴求に直結する新規の具体的提案で、他のどの監査にもなかった独自の価値を持つ |
| Home自体への女性向け軽量シグナル（P4） | **Yes、必要だが要注意**。「疾患特化コンテンツ皆無」という既存の根本課題（Rebuild Integration Council由来）の応急措置に過ぎない。今回のExit Criteria「オンボーディングを濃厚にして差別化」とセットで実施することで、応急措置ではなく一貫した設計にできる |

### 4. 改善効果評価（Impact / UX改善量 / ブランド向上）

| 項目 | Impact | UX改善量 | ブランド向上 |
|---|---|---|---|
| A. Homeシグネチャービジュアル | 高 | 中 | 高 |
| B. 確信度メーター | 中 | 中 | 中 |
| C. マイルストーン演出 | 中 | 高 | 中 |
| D. 継続ストリップ | 低〜中 | 中 | 低 |
| E. 気分ピッカー強化 | 低 | 低 | 低 |
| F. 固有ブランドマーク | 高 | 低 | 高 |
| G. 結果カード共有ビジュアル | 高 | 低 | 高（App Store/SNS直結） |
| H. Home女性向けシグナル＋オンボーディング濃厚化 | 高 | 中 | 高 |

A・F・G・Hの4項目がImpact/ブランド向上ともに「高」であり、PR-LAYOUT-02の中核とすべきであることがこの表からも裏付けられる。

---

## 世界トップとの差分（11アプリ比較）

| アプリ | IPPOが学ぶべき点 | 対応する改善項目 |
|---|---|---|
| Flo | 有機的イラストによる柔らかさ | F（現状は絵文字止まりで及ばない） |
| Clue | 自信のあるタイポグラフィスケールと省略美 | A（Heroはまだ要素過多） |
| Stardust | AIを人格化した会話的インターフェース | 対応なし（IPPOはAIを主役にしない設計方針のため、これは差分ではなく意図的な方針の違いとして是認する） |
| Ovia | マイルストーン別の励ましカード | C |
| Bearable | 相関強度の視覚的表現 | B |
| Visible | 低刺激設計 | 対応不要（IPPOは既に同水準、既存の強み） |
| Guava Health | 受診準備向けサマリーの整理力 | 対応なし（Phase4以降の症例DB構想に関連、現時点では対象外） |
| Daylio | 2タップ完結の軽快さ | 対応不要（IPPOは複数軸観察が目的のため直接比較は不適切、現状のタップ数は妥当水準） |
| Zero | 単一巨大メトリクスの説得力 | A（最大の差分） |
| Habitify | ストリーク・進捗リングの一覧性 | D |
| Exist | 相関の確信度表示 | B（Bearableと合わせて二重の裏付け） |

---

## Screen-by-Screen Improvement

### Home
- **削るべきもの**: Hero挨拶文の視覚的比重（削除ではなく縮小・統合）
- **追加すべきもの**: シグネチャービジュアル（A）、直近7日継続ストリップ（D、Hero内に軽量統合）、実験完了時のマイルストーン演出（C、一時的な専用バナー）
- **残すべきもの**: Home最大6ブロックの規律、record-stripの控えめな扱い、カードkicker統一言語

### Record
- **削るべきもの**: なし
- **追加すべきもの**: 気分ピッカーの拡大＋タップフィードバック（E、低優先）
- **残すべきもの**: 3カード固定構成、「今週の実験対象」バナー、仮説明示をExperiment画面に集約するという既存の設計判断

### Insights
- **削るべきもの**: なし
- **追加すべきもの**: 気づきカードの確信度メーター（B）
- **残すべきもの**: 問いかけ調コピー、パターンカレンダー、比較セクションの問いかけリード文

### Experiment
- **削るべきもの**: なし
- **追加すべきもの**: 「試す」CTAの視覚的重み強化（両監査で繰り返し指摘・未解消のためPR-LAYOUT-02で確実に解消する）、ロック中Proカードの好奇心演出（低優先）
- **残すべきもの**: 仮説文・観察対象・reassuranceの3行構成

### Me
- **削るべきもの**: なし
- **追加すべきもの**: 「気になること」の反映強化（H、オンボーディング濃厚化と連動）
- **残すべきもの**: Premium/Proの物語的2分類、プライバシーカード、「あとで」導線、プレビュー日数切り替え（レビュー専用と明記のまま維持、本実装前に削除予定）

---

## World-Class Checklist（世界トップとの差分一覧）

- [ ] Homeに単一の圧倒的指標がある（Zero/Clue水準）
- [ ] 気づきカードに相関強度の視覚表現がある（Bearable/Exist水準）
- [ ] 実験完了時に控えめな専用演出がある（Zero/Habitify/Ovia水準）
- [ ] 直近の継続が一目でわかる（Clue/Habitify水準）
- [x] 情報密度が低刺激設計として機能している（Visible水準、既に達成）
- [x] Recordのタップ数が妥当水準（Daylio〜Bearable水準、既に達成）

---

## Identity Checklist（IPPOらしさを強める改善一覧）

- [ ] Homeを見ただけでIPPOだとわかる固有のビジュアル（シグネチャービジュアル＋固有ブランドマーク）がある
- [ ] 結果カードが共有したくなる専用ビジュアルになっている
- [ ] Home自体に「これは私のためのアプリ」という軽量な手がかりがある
- [ ] オンボーディングが「実験ノートを開く」という体験として濃厚に設計されている
- [x] 「記録」より「実験」が視覚的に主役になっている（既に達成、Identity Auditで最も評価の高かった項目）
- [x] 生理管理アプリとの差別化ができている（既に達成、ただしその代償の是正がHチェック項目）

---

## Final Layout Roadmap

```
PR-LAYOUT-02（中核5項目・最優先）
  A. Homeのシグネチャービジュアル確立（Hero再設計、単一指標への視覚的重心の集中）
  B. 気づきカードへの確信度メーター追加
  C. 実験完了時のマイルストーン演出追加
  F. 固有ブランドマーク（Hero or ナビ内に1点、全面SVG化はしない）
  G. 結果カードの共有前提ビジュアル
  + Experiment「試す」CTAの視覚的重み強化（両監査共通の未解消項目、確実に解消）

  ↓ Founder実機確認（Browser Verification）

PR-LAYOUT-03（濃厚化・磨き込み）
  H. Home女性向け軽量シグナル追加 ＋ オンボーディング濃厚化
     （「気になること」選択後に軽い仮説設定導線を追加し、Exit Criteria
       「オンボーディングを濃厚にして差別化」を満たす）
  D. 直近7日継続ストリップ（Hero内軽量統合）
  E. 気分ピッカー拡大＋タップフィードバック
  ロック中Proカードの好奇心演出
  Record送信後の達成フィードバックアニメーション
  プレビュー日数切り替えUIの取り扱い最終確認（本実装直前に削除する前提を再確認）

  ↓ Founder実機確認（Browser Verification）

Prototype Review
  Founderが全画面・全Day状態を実機確認し、Exit Criteriaの充足を判定

  ↓

Prototype Freeze
  以後レイアウト変更を凍結。Migration Roadmap Phase1（実データ接続）着手前の最終ゲート

  ↓

本実装開始
  IPPO_REBUILD_INTEGRATION_COUNCIL.md の Migration Roadmap Phase1へ
```

---

## Exit Criteria（Prototype完成判定）

| 基準 | 現状（PR-LAYOUT-01完了時点） | PR-LAYOUT-02完了後の見込み |
|---|---|---|
| Critical：0件 | ✅ 達成済み | 維持 |
| High：0〜2件 | ❌ 未達（3件: A/B/C） | ✅ 達成見込み（A/B/C解消により0件） |
| 「女性疾患向け体質改善実験プラットフォーム」が5秒以内に伝わる | △ 「実験」は伝わるが「体質改善」「女性向け」までは弱い | PR-LAYOUT-02（A/F/G）で「実験」の説得力が向上、PR-LAYOUT-03（H）で女性向けの手がかりが補強される見込み |
| オンボーディングを濃厚にして差別化 | ❌ 未着手 | PR-LAYOUT-03で対応 |
| 「健康記録アプリ」ではなく「実験ノート」と認識される | △ コピー・ラベルレベルでは達成、記録の構造自体は未達（既知・本実装時対応の方針） | 本Councilのスコープでは変わらず。Record入力構造の再設計はレイアウトのみの制約下では困難なため、方針通り本実装時に持ち越す |
| Home・Record・Insights・Experiment・Meの情報設計が一貫している | ✅ 概ね達成 | 維持・強化 |
| App Storeの最初のスクリーンショットとして十分な訴求力がある | ❌ 未達（Identity Audit: App Store Impression 60/100） | PR-LAYOUT-02（A/G）で大幅改善見込み、確定判定はPrototype Review時 |
| Prototypeではなく完成品に近い印象を与える | △ 部分達成 | PR-LAYOUT-02・03のマイクロインタラクション追加で改善見込み |

8項目中、現時点で確実な達成は2項目のみ。PR-LAYOUT-02完了時点で3項目が新たに達成見込みとなるが、「オンボーディング濃厚化」と「Record構造」の2項目はPR-LAYOUT-03または本実装まで持ち越しとなる。**Prototype完成の最終判定はPrototype Reviewまで確定できない**。

---

## Final Verdict

# CONDITIONAL GO

**理由**: 両監査の統合により、真に必要な改善が5項目（A/B/C/F/G）に収束することが明らかになった。これはCriticalな欠陥ではなく、World-Class Councilの前回判定（Critical=0）を覆すものではない。しかし、Exit Criteriaの「High：0〜2件」を現時点で満たしておらず（3件残存）、「App Storeスクリーンショットとしての訴求力」「オンボーディング濃厚化」も未達であるため、無条件のGOとは判定できない。

**条件**: PR-LAYOUT-02（中核5項目＋Experiment CTA強化）の実行完了とFounder実機確認をもって、Exit CriteriaのHigh項目は0件化される見込みである。その後PR-LAYOUT-03（濃厚化・磨き込み）を経てPrototype Reviewに進み、そこで初めてPrototype Freeze可否を判定する。
