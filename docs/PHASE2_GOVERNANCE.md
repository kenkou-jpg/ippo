# PHASE2 GOVERNANCE
## Phase2〜Phase4 設計品質維持ルール

---

> **文書権威レベル: LEVEL-1 GOVERNING DOCUMENT**
>
> **【2026-07-07 追記】** 第4章 Tier Branding Architecture・第7章 Founder Decisionは
> [FOUNDER_FINAL_DECISIONS.md](FOUNDER_FINAL_DECISIONS.md) で確定済み。
> Tier名称は FREE/Premium/Pro（既存"PRO"機能群→Premium、Phase2新機能+ヘルス実験→Pro）に決定した。
>
> 本文書は [PHASE2_ARCHITECTURE_FREEZE.md](PHASE2_ARCHITECTURE_FREEZE.md) の結果を受けて、
> Phase2以降の実装で設計が崩れないようにするためのGovernanceルールを定める。
> **本文書に反するレイアウト・導線・情報設計の変更は、Founder承認なしに実施してはならない。**
> コード変更・実装は一切行っていない。

---

**文書番号:** IPPO-PHASE2-GOV-001
**作成日:** 2026-07-07
**前提文書:** PHASE2_ARCHITECTURE_FREEZE.md / PHASE2_IMPLEMENTATION_COUNCIL.md / PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md / GENERAL_RELEASE_EXPERIENCE_COUNCIL.md / MONETIZATION_COUNCIL_REPORT.md
**検証方法:** `src/styles/app.css` の実測値（`:root` カスタムプロパティ、`.btn-primary`・`.nav-item` 等の既存クラス）を根拠とする。実測できなかった値は「要実測」と明記し、架空の数値は記載しない。

---

## 1. Design System Freeze

Phase2以降に新規追加するUI要素は、以下の既存デザイントークンをそのまま使用する。**新しい色・新しいフォント・新しい影のスタイルを追加しない。**

### 1-A. 色（`src/styles/app.css` `:root` 実測値）

| トークン | 値 | 用途 |
|---|---|---|
| `--rose` | `#c8747b` | プライマリアクション（CTA等） |
| `--rose-dark` | `#b8707a` | カードのデバッグ背景等 |
| `--rose-light` | `#ecd0d2` | 補助的な強調 |
| `--rose-pale` | `#f7f2f2` | 淡い背景 |
| `--rose-hover` | `#FF8A8A` | ホバー状態 |
| `--plum` | `#b14e56` | セカンダリアクセント |
| `--gold` | `#e8b870` | 強調（達成・マイルストーン系） |
| `--sage` | `#8abf9a` | ポジティブ/健康系の補助色 |
| `--ink` | `#2d1f1a` | 本文の最も濃いテキスト |
| `--ink-mid` | `#4a3830` | 通常本文 |
| `--ink-light` | `#8a7a70` | 補助テキスト |
| `--cream` | `#F8F3EF` | ベース背景 |
| `--white` | `#ffffff` | カード背景 |
| `--shadow` | `rgba(200,120,140,0.10)` | 影の基調色 |

**新規要素（Experiment Suggestion・Question Layer・Research Contribution Badge等）は、上記の中から選んで使うこと。新しい色相を追加してはならない。**

### 1-B. タイポグラフィ

```
--font-body:   'Noto Sans JP', sans-serif   （本文・UI全般）
--font-serif:  'Shippori Mincho', serif     （情緒的な見出し、Insightsヒーロー等）
```

見出しサイズは既存実測値（Insightsヒーロー `.ipr-hero-h1` = 28px）を基準とし、新規カードの見出しはこれを超えない（28px以下）。カード内の本文は13〜15px程度（`.btn-primary`のfont-size:15px、insights.htmlの各種本文13.5px実測値を参照）とする。

### 1-C. 角丸（border-radius、実測値の頻度順）

```
最頻出: 14px, 12px（一般カード）
次点:   16px, 10px
大型カード: 18px, 24px（ヒーロー等の大型ブロック）
ピル型ボタン: 50px, 999px（.btn-primary等の完全な丸角ボタン）
```

新規カード（`hn-experiment-card`・`ins-question-card`等）は14px、ピル型ボタンは既存の`.btn-primary`と同じ50pxに統一する。

### 1-D. ボタン高さ・タップ領域

```
.btn-primary:  padding 16px（実測）、font-size 15px
.nav-item:     min-height 44px（実測、iOS Human Interface Guidelinesのタップ領域基準と一致）
```

新規ボタン・タップ可能要素は、最小タップ領域44px（`.nav-item`実測値）を下回ってはならない。

### 1-E. 余白（spacing）

既存CSSで確認された値（4px/6px/8px/10px/12px/14px/16px/18px/20px/24px/28px/32px）を基本単位とし、Phase2の新規要素もこの並びから外れる余白を使わない。カード間の余白は既存の `--screen-card-gap`（insights.html内で参照される変数）を踏襲する。

### 1-F. シャドウ

```
--shadow-card:    0 2px 12px var(--shadow)   （通常カード）
--shadow-card-sm: 0 2px 8px var(--shadow)    （小型要素）
記録FABのシャドウ: 0 10px 28px rgba(217,143,154,0.28) （強調要素、実測）
```

新規カード（Experiment Suggestion等）は `--shadow-card` を使用し、記録FAB相当の強い影は使わない（強い影は「最頻アクション」である記録ボタンの専用表現として予約する）。

### 1-G. アイコンサイズ

ボトムナビアイコンは実測 `ICONS.home(20, ...)` `ICONS.plus(22, ...)` 相当の20〜22pxを基準とする（`src/app-legacy.js` `initNavIcons()` 実測）。新規カード内アイコン・絵文字はこれと視覚的に釣り合うサイズ（20〜28px程度）とする。

### 1-H. AIカードの表現規則

```
✓ アイコンは「問い」「気づき」を連想させる控えめなもの（電球・吹き出し等）
✓ 背景色は既存のPROカード配色パターン（背景に淡い色、アイコンに濃い色）を踏襲
✗ AIカードだけを目立たせる特別な枠線・アニメーション・新色の導入は禁止
```

### 1-I. Badgeの表現規則

```
既存の "PRO" バッジ（`.pf-lock-badge`相当、背景var(--rose)、白文字、角丸ピル）を
Research Contribution Badge等の新規バッジにも流用する。
新しいバッジ形状・配色を追加しない。
```

### 1-J. Premiumカードの表現規則

既存の `.pf-grid-card`（アイコン＋タイトル＋サブテキスト＋PROバッジ、角丸14px相当）のレイアウトパターンを、Phase2で追加する新規Premium機能カードにもそのまま適用する。

---

## 2. Information Density Freeze

画面ごとの情報量上限を以下の通り固定する。**この上限を超える追加は、要素数を減らす、タブに分割する、または非表示条件を強化することでのみ対応し、上限自体を引き上げてはならない。**

| 画面 | 上限 |
|---|---|
| Home | 最大6ブロック（CTA・今日のインサイト・ヒーロー・状態カード・週間行・実験提案の6種を上限とし、7つ目のブロックは追加しない） |
| Insights | 同時表示4要素以内（タブ切り替えにより、1画面で目に入る要素は常に4以下に保つ） |
| Premium | 比較項目最大6件（プラン比較表の行数は6行を超えない。機能が増える場合は「詳細を見る」の折りたたみで吸収する） |
| Settings | 新カテゴリの追加はFounder承認必須（既存カテゴリ内への項目追加は可） |
| Record | 入力カード増加禁止（3カード構成を維持する。各カード内の質問項目数の追加も原則禁止、既存の「詳しく記録する」展開枠内でのみ調整可） |
| Calendar | 新規レイヤー（Similarity重ね合わせ等）は既存の月相・凡例表示を隠さない範囲でのみ追加可 |
| Navigation | 5要素固定（変更不可、第3章参照） |

---

## 3. Phase2で禁止すること

以下はPhase2〜Phase4を通じて明示的に禁止する。これらの禁止事項に反する変更は、たとえ小さな改善であってもFounder承認を必須とする。

```
✗ 新しいBottom Navigationの追加（タブ数を5から増やすこと）
✗ 新しい主要画面の追加（Home/Record/Calendar/Insights/Premium/Settings以外の新規画面）
✗ Record画面の複雑化（3カード構成を超える入力ステップの追加）
✗ 新しい入力フローの追加（Record以外の記録経路を新設すること）
✗ Popupの乱用（モーダル・オーバーレイを安易に増やすこと。既存のExperiments overlay等の
  パターンを再利用し、新種のPopup UIを発明しない）
✗ 通知の追加（GROWTH_STRATEGY.md 6-Cが定める「週1回のサマリーのみ」を超える通知）
✗ AIが主役になるUI（AI生成物が画面の主要な視覚的重心を占めるレイアウト。
  AIは常に「気づき」「問い」という控えめな形式に留める、PHASE2_IMPLEMENTATION_COUNCIL.md
  第11章の原則を継承）
✗ Premiumの押し売り（カウントダウン・期間限定訴求・解約妨害等のダークパターン）
✗ PaywallをRecord画面・保存直後・Error画面・Empty Stateに出すこと
  （PAYWALL_STRATEGY.mdが定める絶対禁止の場面、Phase2でも変更しない）
```

---

## 4. Tier Branding Architecture

[PHASE2_ARCHITECTURE_FREEZE.md](PHASE2_ARCHITECTURE_FREEZE.md) FREEZE-FD-1を、本文書では**「tier名称の再定義」ではなく「課金ブランド体系の決定」**として再定義する。これは単なる呼称の問題ではなく、FREE/既存PRO/将来のSTARTER相当/将来のPROという4つの概念をユーザーにどう提示するかという、ブランド全体のアーキテクチャの問題であるためである。

### 論点の整理

```
概念1: FREE（現行、変更なし）
概念2: 既存の「PRO」表示（実機確認済み、単一の有料層を指す）
概念3: 将来の下位有料層（STARTER相当、現行の「PRO」機能群の大半が該当）
概念4: 将来の上位有料層（本当のPRO、Phase2新機能=Experiment Suggestion/
       Question Layer等が該当）
```

**この場では名称を決定しない。** 決定に必要な検討事項のみを整理し、Founder Decisionとして記録する。

### 検討事項（Founderが決定する際に考慮すべき論点）

```
論点A: 既存ユーザーへの心理的影響
  現在「PRO」を使っているユーザーが、Phase2後に「実はSTARTER相当だった」と
  感じることを避けられるか。

論点B: ブランドの一貫性
  BUSINESS_STRATEGY.md（BBS-001）が定めた正式名称（Premium/Pro）との整合。
  実装済みUIの「PRO」という表示は、BBS-001のどちらとも文字面としては一致しない。

論点C: 将来の拡張性
  Phase3のSimilarity/Pattern Search、Phase4のClinic連携が加わった時点で、
  さらに上位のブランド階層（例: Enterprise相当）が必要になった場合に、
  今回の命名がその拡張を妨げないか。
```

この論点はFounder Decision（FREEZE-FD-1、本文書ではIMPL-FD-5として整理、第7章参照）として維持し、本Governanceでは確定させない。

---

## 5. UX Change Control

Freeze後、以下の変更を行う場合はFounder承認を必須とする。**実装担当者・AIエージェントの判断のみで変更してはならない。**

```
□ Layout（画面レイアウトの変更）
□ Navigation（ナビゲーション構造の変更）
□ Information Architecture（情報優先順位の変更）
□ Paywall（課金導線の位置・条件の変更）
□ AI表示位置（AI生成要素の画面内配置の変更）
□ Record入力構造（3カード構成・入力項目の変更）
□ Home優先順位（Home画面の要素順序の変更）
□ Insightsタブ構成（タブの追加・削除・順序変更）
□ Premium比較表（プラン比較表の項目・構成の変更）
□ Research Badge表示（表示条件・頻度・文言の変更）
```

これらの変更提案が生じた場合、実装を進める前に本文書の該当章を更新し、Founder承認を得ることを手順として定める。

---

## 6. Value Ladder維持ルール

Phase2以降のすべての実装は、以下の流れを壊してはならない。

```
記録 → 理解 → 改善 → 習慣化 → 資産化
```

具体的な維持基準は以下の通りとする。

```
✓ 「記録」の摩擦をいかなる新機能によっても増やさない
  （Record画面への変更禁止は本文書第3章で担保済み）

✓ 「理解」の到達に「改善」以降の機能を前提条件にしない
  （FREE/STARTERユーザーも「理解」段階には到達できる設計を維持する）

✓ 「改善」（Experiment Suggestion/Question Layer）は「理解」の自然な延長として
  提示し、唐突な機能として切り離さない（PHASE2_IMPLEMENTATION_COUNCIL.md第7章の
  「気づき→問い→提案→比較→貢献」という1本の連鎖設計を維持する）

✓ 「習慣化」を脅かす表現（督促・脅し・恐怖訴求）を通知・UIに一切含めない

✓ 「資産化」（Research Contribution）は下位段階の完了を条件とし、
  無条件・唐突に提示しない（Day365以上・Research Consent同意済みという
  条件を維持する）
```

Value Ladderのいずれかの段階を「飛び級」させるような機能設計（例: 記録0件でPremiumへ誘導する、理解を経ずに改善提案を出す等）は、本ルールへの違反として扱う。

---

## 7. Founder Decision（本文書が保持するもの）

| ID | 内容 | 状態 |
|---|---|---|
| FREEZE-FD-1（＝IMPL-FD-5） | 課金ブランド体系の決定（第4章） | 未決定、Phase2 PR-P2-05着手前に確定必須 |
| IMPL-FD-1 | companion-intelligence.js / recommendation-engine.jsの再利用可否 | 未決定、PR-P2-01/02着手前に確定必須 |
| IMPL-FD-2 | tier分離の実施順序 | 未決定、PR-P2-05の順序に影響 |
| IMPL-FD-3 | Research Contribution Badgeの開示粒度 | 未決定、PR-P2-04着手前に確定必須 |
| IMPL-FD-4 | Phase3着手条件の監視主体 | 未決定、Phase3着手時まで猶予あり |

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-PHASE2-GOV-001 |
| **作成日** | 2026-07-07 |
| **権威レベル** | LEVEL-1 GOVERNING DOCUMENT |
| **前提文書** | PHASE2_ARCHITECTURE_FREEZE.md / PHASE2_IMPLEMENTATION_COUNCIL.md / GENERAL_RELEASE_EXPERIENCE_COUNCIL.md |
| **コード変更** | ゼロ（Governanceルールの制定のみ） |
| **適用範囲** | Phase2〜Phase4のすべての画面・機能実装 |
| **違反時の扱い** | 第5章「UX Change Control」に定める各項目はFounder承認なしの変更を禁止する |
| **次回改訂トリガー** | Founder DecisionがFREEZE-FD-1/IMPL-FD-1〜4を確定した時 / Phase3 Governance追補時 |
