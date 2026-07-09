# IPPO REBUILD INTEGRATION COUNCIL
## Prototype × Current IPPO 統合評価会議

> 目的: 新Prototype（`ippo-rebuild`）のレイアウトを基盤として、現行IPPO（本リポジトリ）のUI・UX・機能・体験・思想を統合可能かを評価する。
> **コード変更ゼロ。評価・設計・統合方針の決定のみ。**
> 根拠: `ippo-rebuild`の実コード（`index.html`/`src/styles.css`/`src/app.js`）、および本リポジトリの実コード調査（`app.html`、`src/modules/home-next/*`、`src/screens/insights.html`、`src/services/*`、`src/modules/experiments.js`、`src/modules/premium/*` 等）。ドキュメント記載のみに依拠せず、実装状態を直接確認したうえで記述する。

---

## Executive Summary

**Prototype（`ippo-rebuild`）** は、5タブ（Home / Record / Insights / Experiment / Me）構成・Hero・Before→After結果カード・実験候補カードなどにより「女性向け体質改善実験プラットフォーム」という世界観をスクリーンショット単体で伝えることに成功している。ただし中身はダミーデータのみの静的モックアップであり、実データ・実ロジック・疾患特化・アニメーション・空状態設計を一切持たない。

**現行IPPO（本リポジトリ）** は、4タブ+中央FAB（Home / Calendar / Record(FAB) / Insights / Settings）構成で、AIインサイトエンジン4種、707行の実験エンジン（疾患別コンパニオンルール10疾患分）、Tier/決済システム、Consent/Research Badgeシステム、通知システム、PRO Hub（5ステージ・16機能カタログ）など、数ヶ月かけて実装された相当量の機能資産を持つ。Stage1（PR-EXP-01〜06）は完了・Founder実機確認済み、Stage2（PR-P2-01〜06）は一部完了（P2-01/02/04/06完了、P2-03保留、P2-05部分完了）という実装途中の状態にある。

**核心的な緊張関係**: Prototypeは「見た瞬間に伝わる世界観」で現行IPPOに勝るが、現行IPPOは「疾患特化・実データに基づく実験・継続動機付け・信頼感」という、体質改善実験プラットフォームの本質的価値において圧倒的に先を行っている。Prototypeをゼロから育てて現行IPPOに追いつかせるのは、既に検証済みの実装資産を再度作り直す二重コストを生む。

**結論の方向性**: **GO WITH CHANGES**。Prototypeの画面設計・Design Systemを新しいUI基盤として採用しつつ、現行IPPOのエンジン層（AI/実験/決済/Consent）はアダプタ経由で移植し、疾患特化コンテンツを次イテレーションで必ず補うことを条件とする。詳細は各章および末尾のFinal Verdictを参照。

---

## Prototype Evaluation

### 1. 「女性向け体質改善実験プラットフォーム」として十分に伝わるか

十分に伝わる。根拠:
- Heroが「挨拶／実験Day／進捗バー／今日の目的」の4要素を持ち、開いた瞬間に「今、実験中である」ことが伝わる。
- Before→After結果カード（`乳製品断ち → 肌荒れ -38%`）が、記録アプリではなく実験ノートであることを一目で示す。
- 次の実験候補カードに「期待できる変化（62%が寝つきの改善を実感）」という統計的訴求があり、実験への誘導が自然。
- カード全体にアイコンkicker（💡🧪📈🌱📝）を統一配置し、色（Rose/Gold/Sage）で優先度を視覚化するDesign Systemは一貫している。

### 2. 改善点

- **疾患特化コンテンツが皆無**: 現行IPPOは9疾患（PCOS、子宮内膜症、PMS/PMDD等）の個人化・疾患別実験ルール・疾患タブ切り替えを持つが、Prototypeには疾患選択・疾患文脈を示す要素が一切ない。「体質改善実験プラットフォーム」を名乗る以上、これは最も重大な欠落である（詳細は次項「Experiment Platform Gap Analysis」）。
- **Insightsが薄い**: Prototypeの Insights はダミーのヒートマップ風カレンダーと2本棒グラフのみ。現行IPPOの30日推移チャート（ツールチップ付き・4指標）や周期フェーズリングに比べ、情報としての説得力が弱い。
- **実験データモデルが汎用的すぎる**: Prototypeの実験カードは「16時間断食」「カフェイン断ち」という一般的なライフスタイル実験の体裁で、現行IPPOのように疾患に紐づいた実験提案になっていない。
- **継続動機の仕掛けが弱い**: 現行IPPOにはResearch Contribution Badge（365日継続）、Reflection Card、Recovery/Rhythmスパークラインなど継続を後押しする複数の仕掛けがあるが、Prototypeは単一のDayカウンターのみ。
- **マイクロインタラクション・空状態が未設計**: 現行IPPOの段階的フェードイン、モーダルのスプリングイージング、チップのタップフィードバック、`prefers-reduced-motion`対応、空状態（データ0件時の専用UI）が、Prototypeには一切ない（静的モックアップの制約上想定内だが、次段階で必須）。
- **信頼感の要素が不足**: 医師向けサマリー、返金・支払い注記、Consent粒度（4段階）など、現行IPPOが持つ「安心して使える」という設計がPrototypeにはまだ現れていない。

### Experiment Platform Gap Analysis（項目6）

画面だけを見て「実験したくなる」状態には概ね到達しているが、以下が不足しており、具体的な追加場所・内容・レイアウトを提案する。

| 不足要素 | 追加場所 | 追加内容 | レイアウト |
|---|---|---|---|
| 疾患特化の実験提案 | Experimentタブ「おすすめの実験」カード | 「IBSの方に人気の実験」等、ユーザーの疾患に紐づいた提案文言 | 提案カード上部に疾患タグチップを追加。疾患情報の入力元として、オンボーディング/Me画面に疾患選択UIが必要（現状Prototypeに皆無、新規画面として設計が要る） |
| 実験結果の詳細画面 | Home「実験の結果」カードのタップ遷移先 | 現行IPPOの`showExperimentReport()`にある比較表・スパークラインを、Prototypeのカード様式に再設計して表示 | Result カードタップ→モーダル or 専用画面。Before/After棒グラフ＋日次スパークライン＋所見文 |
| 実験の根拠表示 | Experimentタブ「おすすめの実験」の理由テキスト | 現状ダミー文言「肌荒れと乳製品の相関から」を、`lag-correlation-engine.js`が実際に出す相関係数・信頼度に置き換える | 理由テキストの下に小さく「相関強度: 中／サンプル数: 12件」等の根拠表示 |
| 実験アーカイブ | Experimentタブ最下部 | 終了した実験の一覧（現行IPPOにも強いUIはなく、両リポジトリ共通の新規設計課題） | 「過去の実験」セクションを実験ライブラリの下に追加、完了日・結果サマリーを1行で表示 |
| 複数実験（Pro） | Experimentタブ | 設計文書（Foundation Council §7・§8）で意図通りFree=1実験・Pro=複数実験の想定。現行データモデル（`state.experiments`配列）は複数対応済みなので技術的障壁はない | 進行中実験カードの下に、ロックされた「+ もう一つ実験を追加（Pro）」枠を追加 |

---

## Current IPPO Asset Review

Prototypeへ移植すべき資産をA（必須）/B（推奨）/C（不要）で分類する。

### A（必須）

| 資産 | 所在 | 理由 |
|---|---|---|
| Spacing/Rhythm トークン | `design-system.css`（`--screen-top-space/--screen-card-gap/--screen-section-gap`）、`home-next.css`（`--space-4〜40`の4px刻みスケール） | Prototypeの余白は感覚的に決められた値のみで、命名されたスケールがない。保守性のために正式なトークン化が必要 |
| モーダルのスプリングイージング | `app.css`（`--transition-pop: cubic-bezier(0.34,1.56,0.64,1)`、`slideUpModal`） | Prototypeのモーダルは静的フェードのみ。同じ跳ねるような開閉感を追加するだけで体感品質が大きく上がる |
| 段階的フェードインアニメーション | `home-next.css`（`hn-anim-0`〜`hn-anim-5`、増分ディレイ） | Homeを開いた時にカードが順番に現れる演出。実装コストが低く効果が高い |
| チップ/ボタンの押下フィードバック | `app.css`（`.chip:active{transform:scale(.96)}`等） | Prototypeのチップ・ボタンは押下時の反応がゼロ。タップ操作の手応えとして必須 |
| `prefers-reduced-motion`対応 | `app.css:2469-2478` | アクセシビリティ要件。既存実装をそのまま踏襲すればよい |
| 空状態（Empty State）パターン | `src/modules/pro/shared/render/renderEmptyState.js` | Prototypeは常にダミーデータが入っている前提で作られており、「記録0件」「実験0件」の状態が未設計。実データ接続前に必須 |

### B（推奨）

| 資産 | 所在 | 理由 |
|---|---|---|
| 疾患個人化チップ（簡略版） | `home-next-personalize.js` | 9疾患フルセットをそのまま持ち込む必要はないが、Heroまたは実験候補カードに疾患文脈を出す仕組みは必要（詳細は前章のGap Analysis） |
| 30日推移チャート＋ツールチップ | `insights.html`のSVGチャート | 情報価値は高いが、`ipr-*`のCSSごと持ち込むのではなく、Prototypeのカード様式で作り直すべき（後述Design System Review） |
| PRO Hubの5ステージ物語構造（理解する/試してみる/振り返る/医師と共有する/記録を守る） | `src/modules/pro-hub/pro-hub.js` | 16機能カタログのUIそのものは過剰だが、Premium/Proの物語的な語り口はPrototypeの「理解を深める/改善実験を進める」という2分類方針と親和性が高く、拡張時の参考にすべき |
| 同期インジケーター | `app.css`（`#ippo-sync-indicator`／`.ippo-spinner`） | 実データ同期を実装する段階で必要になる。今は不要だが設計だけ把握しておく |
| Unlockバッジ・カスタムレンジスライダー | `app.css:490-496`, `790-808` | Recordの入力を将来スライダー化する場合などに再利用候補 |

### C（不要）

| 資産 | 理由 |
|---|---|
| 4タブ+FABのナビゲーション構造 | Prototypeの5タブ構成はFoundation Councilで既に確定済みのFounder合意事項であり、後退させる理由がない |
| `.ipr-*`/`.ipc`/`.pob-*`等の個別CSSクラス体系 | 現行IPPO自体が3層以上のトークン層（`app.css`/`design-system.css`/`home-next.css`）に分裂しており、この断片化こそPrototypeの単一Design Systemで解消すべき対象。概念だけ抽出し、クラス名ごと持ち込まない |
| Legacy record-modal / `screen-record`（旧） | 既にLegacy Removal Programで整理対象になっている資産。持ち込む価値なし |
| Tablet/Desktop用ボックス化シェル | IPPOはモバイル専用という製品方針（Foundation Council前提）と矛盾する |
| `home-next` vs 非`home-next`の二重経路 | 技術的負債そのもの。Prototype側では単一経路のみを設計する |

---

## UI Comparison

**レイアウト構造**: Prototypeは単一の縦スクロール・ブロック数上限（Home最大6）・一貫したカードkicker言語という規律を持つ。現行IPPOはInsights（60/40・62/38グリッド）やPremium（カテゴリ別9カードグリッド）など、画面ごとに異なるグリッド構造とCSS命名規則（`ipr-`, `ipc`, `pob-`, `hn-`）が並存しており、情報は豊富だが視覚言語が統一されていない。

**タイポグラフィ/アイコン**: 現行IPPOは画面ごとに異なるカスタムSVGアイコンセットを個別実装している（home-next用、insights用、PRO overlay用）。Prototypeは絵文字ベースの単一言語で統一されており、開発コストと一貫性の両面で優れる。

**採用すべき方向**: Prototypeのレイアウト骨格を採用し、現行IPPOの高価値UI要素（30日チャート＋ツールチップ、段階的フェードイン、モーダルのスプリング開閉、チップ押下フィードバック、空状態パターン、PRO Hubの物語構造）をPrototypeの視覚言語に合わせて再実装する。現行IPPOのCSSクラス・命名規則はそのまま持ち込まない。

---

## UX Comparison

| 評価軸 | 優れている方 | 理由 |
|---|---|---|
| 毎日使いたい | 現行IPPO（機構）／Prototype（物語） | 現行IPPOは周期フェーズ連動のHeroメッセージ＋段階的アニメーションで「今日は違う」という生きた感覚を作る。Prototypeは"EXPERIMENT LOG"という強い世界観の枠組みを持つが、現状ダミーで日々変化しない。両者を統合すべき |
| 疲れない | Prototype | Home最大6ブロック・単一カラム・落ち着いた配色の規律が明確。現行Insightsは同時に多数の要素（30日チャート・疾患タブ・周期リング・PROバッジ・Tipsグリッド）が並び、Phase2 Governanceの「同時表示4要素以内」原則を実質的に超えている可能性が高い |
| 記録しやすい | ほぼ互角 | 現行IPPOはHome上に6アイコングリッドのクイック記録（`home-next-quick-record.js`）があり、画面遷移なしで記録できる。Prototypeは記録帯からRecordタブへの遷移が必要。Prototypeの記録帯にクイック記録を統合する余地あり |
| 実験したくなる | Prototype | Heroでの実験Day表示、Before→After結果カード、期待変化つき次実験候補カードが、Home単体で「試したい」という導線を強く作る。現行IPPOの実験導線はInsights内やPremium内に埋もれており、日常導線として弱い |
| 改善したくなる | ほぼ互角（要統合） | 現行IPPOは疾患別メトリクス差分・AI結果レポートという実データに基づく説得力を持つが、提示形式が比較表中心で一目では伝わりにくい。Prototypeの単一の大きな`-38%`表示は瞬時に伝わるが中身がダミー。「Prototypeの見せ方＋現行IPPOの実データ」が理想形 |
| 続けたくなる | 現行IPPO | Research Contribution Badge（365日）、Reflection Card、Recovery/Rhythmスパークラインなど、複数の継続動機付け機構を既に持つ。Prototypeは単一Dayカウンターのみで継続報酬の設計がまだない |
| 疾患特化 | 現行IPPO（圧倒的） | 9疾患個人化・疾患タブ・疾患別実験ルール・疾患ゲート付き日次注意カードを持つ。Prototypeは疾患要素ゼロ。「体質改善実験プラットフォーム」を名乗るうえで最大のギャップ |
| 安心感 | 現行IPPO | 医師向けサマリー、返金・支払い注記、4段階Consent、reduced-motion対応など、成熟した信頼設計を持つ。Prototypeはモックアップ段階のため未着手（想定内） |

---

## Function Migration Matrix

必須8機能について、そのまま移植／改善して移植／作り直し／不要を判定する。

| 機能 | 判定 | 理由 |
|---|---|---|
| **Record** | UI: 作り直し／データ: そのまま移植（アダプタ経由） | Phase2 Implementation Councilにより現行Record画面は「全Phase不変」と設計済み。UIはPrototypeの3カード構成を採用し、`state.records`への読み書きはアダプタで接続する |
| **Insights** | 改善して移植 | Prototypeの方向性（気づきのフィード）は正しいが中身が薄すぎる。現行の30日チャート・周期リング・疾患タブの情報価値をPrototypeのカード様式に再実装して移植する |
| **Experiment** | 改善して移植 | `experiments.js`の疾患別コンパニオンルール・メトリクス差分計算は再利用価値が高いが、DOM文字列組み立てと密結合しているため抽出が必要。データモデル（`title/factor/condition/hypothesis/days`）はPrototypeの形（`name/icon/day/total/pct`）と一致せず、アダプタが必須 |
| **Premium** | 改善して移植 | 価格・Stripe連携ロジック（`stripe.js`）はアダプタで再利用可能。UIはPrototypeの「理解を深める/改善実験を進める」の2分類フレーミングを正式仕様とし、PRO Hubの物語構造を参考に拡張する |
| **AI** | エンジン: そのまま再利用／表面: 作り直し | `lag-correlation-engine.js`・`home-insight-engine.js`は純粋関数で移植コスト最小。`companion-intelligence.js`/`recommendation-engine.js`は軽微なアダプタが必要。UI表出（気づきカード・次の実験候補の文言）はPrototypeのトーンに合わせて作り直す |
| **Notification** | 一部修正 | `push.js`のスケジューリング・本文生成ロジックは再利用可能、DOM直書きのバナー部分は作り直し。未接続の`domains/communication/*`/`domains/delivery/*`スタックは死んだコードであり、そのまま再利用すべきではない（後述） |
| **Research** | そのまま移植 | `consent-service.js`のデータモデル・365日+同意ゲートのバッジ表示ロジックは小さく健全で、ほぼそのまま移植可能。HTML文字列生成部分のみPrototypeのカードコンポーネントに置き換える |
| **Settings** | 作り直し | 現行Settingsは複数の関心事（Consent・バックアップ・アカウント・PRO Hub導線）が混在したレガシー期の画面。Prototypeの「Me」タブはFoundation Councilで意図的に統合設計されているため、個々の設定ロジックは移植しつつ画面構成は作り直す |

### 実装資産の再利用評価（項目8）

| 資産 | 分類 | 理由 |
|---|---|---|
| `lag-correlation-engine.js` | そのまま再利用 | `window`非依存の独立エンジン。純粋関数 |
| `home-insight-engine.js` | そのまま再利用 | 38行の純粋オーケストレータ、出力形式もシンプル |
| `recommendation-engine.js` | アダプタで再利用 | ルールテーブル自体は純粋だが、コンテキストを`window.getCompanionContext()`から読む。注入可能な形にラップが必要 |
| `companion-intelligence.js` | アダプタで再利用 | 大半は純粋だが、`localStorage`直結の関数と読み込み時の`window`グローバル汚染がある。分離が必要 |
| `experiments.js`（ビジネスロジック部分） | 一部修正 | 疾患別ルール・メトリクス差分計算はDOM文字列組み立てと同一関数内に混在。抽出作業が必要、データモデルの命名調整も必要 |
| `experiments.js`（描画部分） | 作り直し | インラインHTML文字列テンプレートを、Prototypeのカードコンポーネントで置き換える |
| `premium-service.js` | そのまま再利用 | ロジック自体はフレームワーク非依存。3層Tierの実体化はStripe側の商品設計というビジネス課題であり、UI刷新とは独立 |
| `stripe.js`（決済ロジック） | アダプタで再利用 | ネットワーク呼び出しはそのままでよいが、DOM直書きのバナー部分をPrototypeのモーダルに置き換える |
| `consent-service.js` | そのまま再利用 | データモデル・純粋なゲートロジックは健全。DOM書き込み関数のみ置き換え |
| `push.js`（スケジューリング・本文生成） | 一部修正 | Notification APIラップ部分は残し、UIバナーは作り直す |
| `state.js`（フラットstore） | 当面そのまま再利用 | `src/domains/*`/`src/repositories/*`のクリーンアーキテクチャ層へ置き換えるのは別の大規模な意思決定であり、本Councilのスコープ外。将来課題として切り離す |
| `domains/*` / `repositories/*`（未接続のクリーン層） | 作り直し扱い | 現状どのレンダリングコードからも呼ばれていない死蔵コード。「実績のない資産」を安易に「再利用」と分類しない。将来正式に接続するか削除するかを別途決定する |
| `app-legacy.js` | 不要（個別関数のみ抽出） | 残存する関数群はまさに置き換え対象のDOM密結合ロジックそのもの。ファイル単位での移植価値はない |

---

## Design System Review

Prototypeのカード・余白・色・タイポグラフィ・Hierarchyは内部整合性が高く、既存の実測カラートークン（`--rose`/`--plum`/`--gold`/`--sage`等）を正しく継承している。弱点は、命名されたSpacingスケール・Easing・Breakpointトークンを持たず、値が個別指定になっている点。

**取り込むべきDesign Component**:
- `--space-4〜40`スケール（`home-next.css`）→ Prototype独自の命名で正式トークン化
- `--transition-pop`スプリングイージング（`design-system.css`）→ モーダル・カード出現アニメーションに適用
- `renderEmptyState()`の空状態パターン（アイコン＋タイトル＋説明＋CTA）→ 実データ接続前に必須
- モーダルのstep-dotインジケーター（`app.css`の`.modal-step-indicator`）→ 複数ステップを要するフロー（実験開始確認等）で有用
- Unlockバッジコンポーネント → Pro機能ロック表示に転用可能

**取り込むべきでないもの**: `.ipr-*`/`.ipc`/`.pob-*`等、画面ごとに増殖した個別CSS命名体系。現行IPPO自身がこの断片化によって保守困難になっている（3層以上のトークン層が並存）ことを、Prototypeでは繰り返さない。

---

## Migration Roadmap

```
Phase1: Home, Record
  - Design Systemトークン（Spacing/Easing/空状態）をippo-rebuildへ正式導入
  - home-insight-engine.js + lag-correlation-engine.js（共に純粋関数）を最初に接続
  - Record UIをPrototypeの3カード構成のまま、state.records読み書きをアダプタ経由で接続

Phase2: Insights, Experiment
  - 30日推移チャート・周期フェーズの情報価値をPrototypeのカード様式で再実装
  - experiments.jsから疾患別コンパニオンルール・メトリクス計算を抽出し、
    Prototypeの実験データモデルへアダプタで接続。ダミーカードを実データに置き換え

Phase3: Premium, AI
  - premium-service.js / stripe.jsをアダプタ経由でPrototypeのPremium/Proカードに接続
  - companion-intelligence.js / recommendation-engine.jsを注入可能な形にラップし、
    「今日の気づき」「次の実験候補」カードの文言を実データ駆動に置き換え

Phase4: Research, Notification, Settings/Me
  - consent-service.js + Research BadgeロジックをほぼそのままMeタブ/Homeカードへ移植
  - push.jsのスケジューリング・本文生成ロジックを再利用しつつ、UIバナーを新規構築
  - SettingsをMeタブとして作り直し、個々の設定ロジック（リマインダー・バックアップ・Consent）を移植
```

疾患特化コンテンツ（Experiment Platform Gap Analysisで指摘した疾患選択・疾患別実験提案）は、上記のどのPhaseにも明示的に組み込まれていない新規要素であるため、Phase1の一部として「疾患選択オンボーディング画面」の設計を追加することを推奨する（Phase2で疾患別実験提案を機能させるための前提条件になるため）。

---

## Repository Strategy

**論点**: Prototype（`ippo-rebuild`）を新しい唯一のRepositoryとすべきか、現行IPPOを段階移植すべきか。

**判断根拠**:
- 現行IPPOは、Stage1完了・Stage2一部完了という「実績のあるFounder確認済み機能」を相当量持つ。同時に、`app-legacy.js`（1,917行）、二重のConsent実装、二重の通知スタック、未接続のクリーンアーキテクチャ層など、**現行リポジトリ自体が過去の「段階移植」の結果として技術的負債を蓄積してきた**という事実がある。同じ手法（既存リポジトリ内での段階置き換え）を繰り返せば、同じ結果（死蔵コードの併存）を再生産するリスクが高い。
- 一方、ユーザーデータ（Supabase上の記録・Stripeサブスクリプション・Consent記録）の継続性は製品として絶対に失えない。これはリポジトリ戦略とは独立した制約である。

**推奨: ippo-rebuildを新しい主フロントエンドリポジトリとする。ただし、バックエンド（Supabaseプロジェクト・Stripeアカウント）は現行IPPOと共用し、データを失わない。**

- フロントエンドコードはippo-rebuildの新しい構造でクリーンに構築するが、現行IPPOのエンジン層（`lag-correlation-engine.js`等の純粋関数、`experiments.js`から抽出したビジネスロジック、`premium-service.js`、`consent-service.js`）は「アダプタ経由の移植資産」としてippo-rebuildに持ち込む。コピー＆改変ではなく、DOM結合部分を切り離した形で移植する。
- 現行`ippo`リポジトリは、ippo-rebuildがMigration Roadmap Phase1〜4を完了し、Stage3相当の統合検証に合格するまで、本番稼働・ロールバック可能な状態のまま維持する。段階的な部分置き換えではなく、検証完了後の一括カットオーバーとする。
- 現行`ippo`リポジトリの削除・アーカイブはこの段階では行わない。

---

## Founder Recommendation

Prototypeのデザイン言語・IA（5タブ構成、Hero、カード統一言語）は、Founderが当初求めた「見た瞬間に体質改善実験プラットフォームと伝わるUI」を達成しており、これを新UIの基盤とすることに合理性がある。

ただし、以下の理由から「Prototypeのまま無条件で本実装へ進む」ことは推奨しない。

1. **実データとの接続なしに設計を深めるリスク**: 既に実験データモデルの不一致（`title/factor/condition/hypothesis/days` vs `name/icon/day/total/pct`）、`DerivedInsight`型の不在、`isPremium()`の3層Tier未実体化など、現実の実装制約とダミー設計の乖離が複数見つかっている。これ以上ダミーデータのまま画面を作り込むと、後で大きな手戻りが発生する。
2. **疾患特化という最大の差別化要素が皆無**: Gap Analysisで示した通り、「体質改善実験プラットフォーム」を名乗るうえで最も重要な要素（疾患個人化）が、既に現行IPPOに実装されているにもかかわらずPrototypeに一切ない。これは追加の「デザイン」ではなく「移植すべき既存資産の接続」で解決可能な問題である。
3. **Repository Strategyは統合作業を要する意思決定**: 新リポジトリを主とする場合も、同一のSupabase/Stripeバックエンドへ接続する必要があり、これは設計作業ではなく実装着手が必要な工程である。

したがって、本Councilの結論は「次はMigration RoadmapのPhase1（Home/Recordの実データ接続）に進むべき」である。

---

## Final Verdict

# GO WITH CHANGES

**条件**:
1. Repository Strategy（ippo-rebuildを主リポジトリとし、Supabase/Stripeバックエンドは現行と共用、一括カットオーバー方式）についてFounderの明示的な承認を得ること。
2. Migration Roadmap Phase1（Home/Recordの実データ接続、Design Systemトークン正式導入）を完了し、Founder実機確認を経てからPhase2へ進むこと。
3. Experiment Platform Gap Analysisで指摘した疾患特化コンテンツについて、最低限「疾患選択オンボーディング画面」の設計をPhase1に組み込むこと（Phase2の疾患別実験提案の前提条件となるため）。

上記3条件が満たされ次第、本Councilの判定は無条件のGOに引き上げられる。
