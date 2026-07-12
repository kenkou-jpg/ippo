# GENERAL RELEASE EXPERIENCE COUNCIL
## General Release 画面レイアウト・UX最終監査

---

> **文書権威レベル: LEVEL-1 STRATEGIC DOCUMENT**
>
> 設計フェーズ（Business Strategy / Monetization Council / App Experience Council /
> Legacy Removal / Release Readiness / Operations）はすべて終了している。
> 本 Council は General Release 時点で「ユーザーが実際に触れる体験」のみを最終監査する。
> **実装・コード変更は一切行っていない。** 本文書は監査結果と実装設計（設計のみ）を記録する。

---

> **追記（2026-07-07）**: 本文書のPR-EXP-01〜05は、実装着手前に
> [PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md](PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md) による
> Phase2構想との整合レビューを経ている。判定: PR-EXP-01・02・04・05はそのまま実行可（Proceed）、
> PR-EXP-03のみスコープを限定（Modify、価格確定値はFD-1決定まで暫定表示・3層tier比較表は作らない）。
> 実装時は本文書ではなく上記文書の第5章を優先すること。

**文書番号:** IPPO-GENREL-EXP-001
**開催体:** Founder × Product Designer × Mobile UX Specialist × Information Architect × Interaction Designer × Customer Representative × Behavioral Designer
**開催日:** 2026-07-07
**前提文書:** MONETIZATION_COUNCIL_REPORT.md / docs/business/（MONETIZATION_FRAMEWORK / FREE_PRO_BOUNDARY / VALUE_LADDER / PAYWALL_STRATEGY / MONETIZATION_ROADMAP）/ APP_EXPERIENCE_FRAMEWORK.md / SCREEN_FLOW.md / INFORMATION_ARCHITECTURE.md / NAVIGATION_DESIGN.md / USER_JOURNEY.md / GENERAL_RELEASE_SCREEN_MAP.md
**検証方法:** 本番相当ビルド（`npx vite build` → `vite preview`、ポート4173）を実機起動し、`app.html` を実際にブラウザ操作（クリック・スクロール・DOM/CSS計測・スクリーンショット）して検証した。過去の Council 文書（doc監査のみ）とは異なり、本 Council は**実機体験に基づく一次情報**を主要な根拠とする。

---

## 検証環境に関する重要な注記

本 Council の実機検証は `npm run build` の本番相当ビルドに対して行った（`npm run dev` はデバッグオーバーレイが常時表示されるため使用していない。デバッグオーバーレイは `import.meta.env.DEV` 判定のみで表示され、本番ビルドには含まれないことをコード確認済み）。

本検証環境には Supabase 認証情報（`.env`）が設定されていない。そのため welcome 画面の「はじめる」ボタンを押しても、内部的に `auth: timeout` → `SAFE_CLOUD_MODE` に入り、オンボーディングが自然には先に進まなかった。この制約により、Council は `localStorage.setItem('ippo_onboarding_completed','1')` および `window.showScreen()` / `window.switchTab()` を直接呼び出すことで各画面に到達し、検証した。**この操作自体はテスト手法であり、実装や状態を変更するものではない。** ただし、この制約により以下2点は「本 Council では確定できず、Supabase 認証情報を持つ環境での再検証が必要」という留保をつけている。

```
留保1: オンボーディング「はじめる」ボタンからの自然な遷移（実際の認証フロー）
留保2: 疾患選択直後のHome画面（ヒーローメッセージ・状態カード等）の表示
```

それ以外の全ての所見は、本番相当ビルドに対する直接操作・DOM計測・CSS計測による**確認済みの事実**である。

---

## Executive Summary

Council は General Release 画面を実機で操作した結果、設計文書（App Experience Framework 等）が想定する体験と、実装コードが実際にレンダリングする結果との間に、**3件の重大な乖離**を発見した。

第一に、ボトムナビゲーションの4つのアイコン（ホーム・インサイト・設定・記録FABの「＋」）が、あらゆる画面で一貫して表示されない。原因はコード上で特定済みであり、`app-legacy.js` 内でアイコン注入関数 `initNavIcons()` が `DOMContentLoaded` イベントリスナーとして登録されているが、このリスナーが実際には発火していないことを実機で確認した。

第二に、Insights画面（STARTER/PRO価値の中核画面）のヒーロー見出し「今日のあなたへ、ひとつの気づきを。」が、実機のモバイル幅（375px、実際のiPhone相当）で1〜2文字ごとに折り返される致命的なレイアウト崩れを起こしている。原因はCSS特定済みで、`.ipr-hero` はベースで `display:flex` だが、`@media(max-width:767px)`（＝実質すべてのモバイル画面）のオーバーライドが `grid-template-columns` を指定するのみで `display:grid` へ切り替えていないため、モバイル用の縦積みレイアウトが一度も発動しない。

第三に、Premium画面の価格・比較表を表示すべき領域（`#pro-hero`、コード内コメント「Hero（JSで描画）」）が空のままレンダリングされ、`#screen-premium` 全体を通じて購入導線となる `<button>` が1つも存在しないことを確認した。これは Monetization Council が設計した課金導線（PAYWALL_STRATEGY.md）が実装レベルで機能していないことを意味する。

これら3件はいずれも「絶対修正」に分類する。加えて、Home画面の週間記録行が記録保存後も日付・記録有無を一切表示しない点、Premium画面のカードがボトムナビに隠れる点、ボトムナビ「カレンダー」ラベルが2行に折り返る点を「修正推奨」として記録した。一方、Welcome画面・Record 3カードフロー・Calendar画面・Settings画面の基本構成は高品質であり、修正不要と判定した。

---

## Home監査

### 第一印象・3秒ルール

welcome画面は簡潔で好印象だが、`showScreen('home')` 直後の Home 画面（新規ユーザー相当、記録0件）は「今週」ラベル、「今日を記録する」CTA、空の週間行のみで構成されており、疾患別ヒーローメッセージ・インサイトカード・状態カード4枚は表示されなかった（留保2に該当、疾患プロファイル未設定時の挙動である可能性が高い）。CTAボタン自体は視認性が高く、3秒以内に「記録する」という次の行動は理解できる。

### CTA位置・Insight位置・Status Card

記録済み後は CTA が「✓ 今日をふり返る」に変化し、サブテキスト「チェックイン完了 — 静かに振り返る」が表示されることを確認した。状態遷移のフィードバックとしては適切に機能している。ただし Insight カード・Status Card 4枚は本検証セッションを通じて一度も表示されず、これが疾患プロファイル未設定によるものか実装上の欠落かは切り分けられなかった（留保2）。

### 週間カレンダー

`buildHomeWeekRow()` に対応すると思われる週間行は、記録を実際に保存した直後であっても「日月火水木金土」という曜日ラベルのみを表示し、日付・記録有無のドットが一切描画されないことを確認した（`innerText` 取得で確認、CSSの視覚的な非表示ではなくDOM上にテキストが存在しない）。これは INFORMATION_ARCHITECTURE.md が定義する「直近の記録継続の可視化」という役割を果たしていない。

### 情報量・スクロール量・Premium導線

現状の情報量は非常に少なく、スクロールはほぼ発生しない。Premium導線はHome画面には見当たらず（hn-experiment-card自体が未実装のため、PAYWALL_STRATEGY.mdの設計通りHomeにはPaywallがほぼ存在しない状態）、これは意図通りである。

### Home 判定

| 項目 | 判定 |
|---|---|
| 週間カレンダーの日付・記録表示欠落 | **修正推奨** |
| Insight/Status Card非表示（疾患プロファイル依存の可能性） | 将来改善（Founder確認後に再評価） |
| CTA状態遷移 | 修正不要（正しく機能） |
| 情報量・第一印象 | 修正不要 |

---

## Record監査

3-card入力フロー（今日のからだの状態 → 気になる症状 → 気持ちとメモ）を実際に最後まで操作し、保存が正常に完了してHome画面のCTA状態が変化することを確認した。各カードのアイコン・絵文字・選択チップは正しくレンダリングされ、入力順（全体の調子→睡眠→エネルギー→症状→気持ち→メモ）は負荷の低い順に設計されている。進捗表示「1/3」「2/3」「3/3」は明確。「← ホームへ」「← 戻る」の両方の離脱経路が常に用意されている。

保存ボタン押下後、home画面へ自動遷移し、CTAが完了状態に切り替わることを確認した。ただし success-overlay の視覚的確認（アニメーション・表示時間）は、遷移が速すぎてスクリーンショットのタイミングでは捕捉できなかった。エラー時・オフライン時の挙動は、本検証環境（Supabase未接続）では意図的な通信断のシミュレーションができず、確認できていない。

### Record 判定

| 項目 | 判定 |
|---|---|
| 3カード構成・入力順・入力負荷 | 修正不要（高品質） |
| ボタン位置（次へ／戻る／保存する） | 修正不要 |
| 保存完了・Home状態遷移 | 修正不要（確認済み） |
| エラー時・オフライン時の挙動 | 将来改善（実地検証未完了、Founder Decision参照） |

---

## Calendar監査

月表示・月相アイコン・曜日の色分け（日曜赤・土曜青）・「今日」クイックジャンプ・凡例（生理／排卵期／排卵日予測／妊娠しやすい／低温期／高温期）を確認した。ヘッダーのベル・アバターアイコンは正しく表示されており、これは同じ「アイコン注入」でもボトムナビとは異なる仕組み（画面固有のレンダリング関数）で描画されていることを示唆する。「今日のからだメモ」カードは記録0件時に「生理周期: —」という適切な空値表示になっており、Empty State設計として妥当である。編集導線（日付タップでの詳細表示）は本セッションでは深掘りしていない。

### Calendar 判定

| 項目 | 判定 |
|---|---|
| 一覧性・色・アイコン・凡例 | 修正不要（高品質） |
| 編集導線の詳細確認 | 将来改善（次回セッションで深掘り推奨、必須ではない） |

---

## Insights監査

### 無料価値・有料価値・情報量

ヘッダー「あなたの記録を深く振り返る」+「PRO機能を見る」ボタンは適切に配置されている。ただし、その直下にあるべき無料の挨拶・ヒーローメッセージが致命的なレイアウト崩れを起こしている（次項参照）。

### 致命的レイアウト崩れ（絶対修正）

ヒーロー見出し「今日のあなたへ、ひとつの気づきを。」の実測幅は **67px**（フォントサイズ28px）であり、1〜2文字ごとに折り返る「柱のような」表示になることを実機（375×812、iPhone相当ビューポート）で確認した。リード文「昨日より少し休めていますね。自分を労わる時間を、大切に。」も同様に極端に狭い列に押し込まれている。

原因をCSS実測で特定した。`.ipr-hero` は `display:flex; justify-content:space-between;`（横並び）であり、`@media(max-width:767px)` のオーバーライドは `grid-template-columns: 1fr` を指定するが、**`display: grid` への切り替えを行っていない**。`grid-template-columns` は `display:grid` のコンテナにのみ効果があるため、モバイル幅では常にベースの `display:flex` の横並びレイアウトが有効なままになる。横に並ぶイラスト（`.hero-art`/`.ipr-art`、幅180px固定）とテキスト列が375px幅の中で場所を奪い合い、日本語テキストは「ほぼどの文字間でも改行できる」という特性上、`min-width:auto` のflexアイテムとして極端に狭い列に収束してしまう。IPPOはモバイル専用アプリであり、767px以下の画面幅は実質100%のユーザーに該当するため、この崩れは一部端末の問題ではなく標準的な利用条件で常に発生する。

### AI分析・読みやすさ・理解しやすさ

上記の崩れにより、Insights画面が提供するはずの最重要価値（気づきの提示）が実質的に読めない状態になっている。これは Value Ladder「②理解」の入口を物理的に破壊しているに等しく、Monetization Council が確認した「理解は強固に実装されている」という前提（VALUE_LADDER.md）を、UIレベルで裏切っている。

### Insights 判定

| 項目 | 判定 |
|---|---|
| ヒーロー見出し・リード文のレイアウト崩れ | **絶対修正** |
| ヘッダー・PRO導線ボタンの配置 | 修正不要 |
| PROロックカードの構成（本セッションでは詳細未検証） | 将来改善（次回深掘り推奨） |

---

## Premium監査

### 価値説明・比較表・価格説明

`#screen-premium` の実装済みマークアップを確認したところ、`<div id="pro-hero">`（コード内コメント「Hero（JSで描画）」）が完全に空のままレンダリングされていた。価格（¥580/¥4,800、または Founder Decision待ちの¥980/¥1,980）、プラン比較表、安心材料に相当する文言は、本検証で一切見つからなかった。

### CTA・課金導線

`#screen-premium` 配下の `<button>`・`<a>` 要素数を計測したところ **0件** だった。画面に並ぶのはすべて `onclick="premiumGate(openXxx)"` を持つ機能紹介カードであり、購入・アップグレードを明示する常設ボタンは存在しない。カードをクリックした際に期待される「アップグレード促進モーダル」等の反応も、本検証セッションでは視覚的な変化が確認できなかった（`premiumGate` はモジュールスコープのため `window` 経由での直接検証はできず、実際のクリックイベント経由でも変化が見えなかった）。

これは MONETIZATION_COUNCIL_REPORT.md・PAYWALL_STRATEGY.md が設計した課金導線が、実装レベルで機能していない可能性を示す最重要所見である。ただし、モーダル表示がアニメーション遅延やスクリーンショットのタイミングで捕捉できなかった可能性も残るため、「確認できなかった」という事実を正確に記録し、次項Founder Decisionで扱う。

### ダークパターンの有無

現状観察できた範囲（機能紹介カードの一覧表示）に、カウントダウン・煽り文句・解約妨害等のダークパターンは見当たらなかった。ただし価格・購入導線自体が見えない状態のため、Paywall UI原則（PAYWALL_STRATEGY.md 第5章）の遵守可否を判定できる段階にそもそも達していない。

### レイアウトの軽微な問題

PROカードグリッドの最終行がボトムナビゲーションバーに隠れて一部が見えなくなっている（下部パディング不足）。

### Premium 判定

| 項目 | 判定 |
|---|---|
| 価格説明・比較表（`#pro-hero`が空） | **絶対修正** |
| 購入CTAボタンの不在 | **絶対修正** |
| カードグリッドのボトムナビ occlusion | 修正推奨 |
| `premiumGate()`クリック時の無反応 | Founder Decision（要・実環境での再検証） |
| ダークパターン | 該当なし（現状観察範囲内） |

---

## Settings監査

設定項目一覧（アカウント状態、記録日数/連続日数、疾患・目標・優先度のパーソナライズ、表示スタイル、通知設定、データバックアップ/CSV書き出し/クラウド復元/バックアップ履歴/データ診断/データリセット、フィードバック、About、医療免責文言）を実機のテキスト抽出で確認した。医療アドバイスに関する免責文言（「このアプリは医療アドバイスを提供するものではありません。卵巣嚢腫・PCOS・子宮内膜症などは婦人科への受診をおすすめします。」）が明示されていることを確認した。

一点、Council が過去に作成した [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md) 第5章は「Consent管理（Research Consent等）」をSettings内の優先度4項目として記載していたが、実機のテキスト抽出では「同意」「コンセント」「リサーチ」に類する文言は一切見つからなかった。これは実装が伴わないままドキュメント側が先行していた可能性がある（Research Consent GateはPR-076でバックエンドのみ実装済み、ユーザー向け設定UIは別、という過去のHANDOFF記載と整合する）。

また、「データをバックアップ」「クラウドから復元」「バックアップ履歴」がいずれも PRO バッジ付きで表示されていることを確認した。これは Monetization Council の [FREE_PRO_BOUNDARY.md](business/FREE_PRO_BOUNDARY.md) が捕捉していなかった PRO 機能であり、同文書の機能棚卸しに漏れがあったことを示す。

### Settings 判定

| 項目 | 判定 |
|---|---|
| 設定項目の網羅性・優先順位 | 修正不要（高品質） |
| 医療免責文言 | 修正不要（BD-044準拠を確認） |
| Research Consent UIの不在 | Founder Decision（Business Logic領域のため） |
| FREE_PRO_BOUNDARY.mdのPRO機能棚卸し漏れ | 将来改善（ドキュメント更新、コード変更不要） |

---

## Navigation監査

### Bottom Navigation・FAB

全画面を通じて、ボトムナビの5要素（ホーム・カレンダー・記録FAB・インサイト・設定）自体は一貫して同じ位置に表示され、タブ切り替えも正しく機能することを確認した。しかし、**4つのアイコン（ホーム・インサイト・設定のアイコン、および記録FABの「＋」）が一貫して描画されない**ことを、複数回のフレッシュリロードで再現した。

原因をコードで特定した。`src/app-legacy.js` 内の `initNavIcons()`（`nav-icon-home`/`nav-icon-insights`/`nav-icon-settings`/`nav-icon-plus` の4要素にSVGを注入する関数）は、`document.addEventListener('DOMContentLoaded', function(){ ... initNavIcons(); ... })` という形でのみ呼び出される（`app-legacy.js` 1259行目付近）。フレッシュリロード直後に `document.readyState` が既に `"complete"` であることを確認しており、`DOMContentLoaded` リスナーの登録が実際のイベント発火より後になっている可能性が高い。他画面（Calendar・Settingsのヘッダーアイコン等）は同じ問題を持たないため、原因はこの特定の初期化経路に限定される。

「戻る」導線は各画面固有に用意されており（calendar等）、ボトムナビと併存しても迷いは生じない。

### 迷わないか

アイコンが欠落していても、各ボタン下のテキストラベル（ホーム/カレンダー/記録/インサイト/設定）は表示されているため、致命的にナビゲーションできなくなるわけではない。ただし視覚的な完成度としては明確な欠陥であり、「壊れて見える」第一印象を全画面で与え続ける。

なお「カレンダー」ラベルがボタン幅に対して長く、2行（「カレンダ」／「ー」）に折り返ることも確認した。

### Navigation 判定

| 項目 | 判定 |
|---|---|
| ボトムナビ4アイコンの欠落 | **絶対修正** |
| 「カレンダー」ラベルの2行折り返り | 修正推奨 |
| タブ切り替え・戻る導線 | 修正不要（正しく機能） |

---

## Onboarding監査

Welcome画面（最初の30秒に相当）は、ブランド名・タグライン・「記録が続くほどパターンが見えてくる」という価値提案・プライバシー安心材料（🔒 広告利用/第三者販売なし）・明確なCTA「はじめる」を備え、非常に高い完成度であることを確認した。

しかし、本検証環境（Supabase未接続）では「はじめる」ボタン押下後にオンボーディングが先に進まないことを確認した。内部状態は `auth: timeout` → `SAFE_CLOUD_MODE` に遷移しており、これは認証情報未設定という環境要因による可能性が高い。**この一点は実際のSupabase認証情報を持つ環境での再検証が必須であり、本 Council では「バグと確定」はしない。** ただし、この検証ができなかったこと自体が、以前の Founder Decision Review（FD-5「実地検証を実施する」）で予期されていたリスクが現実化したものであり、General Release前に必ず解消すべき優先事項として重みを増したと判断する。

初回記録・初回AI分析・初回実験の体験は、オンボーディングを経由しない状態（Council の強制遷移経由）でのみ確認できており、疾患選択を経た本来のオンボーディング完了後の状態（ヒーローメッセージ等が正しく表示されるか）は未検証のままである。

### Onboarding 判定

| 項目 | 判定 |
|---|---|
| Welcome画面の第一印象・価値提案・安心材料 | 修正不要（高品質） |
| 「はじめる」ボタン後の遷移未検証 | Founder Decision（実環境での再検証必須） |
| 疾患選択後のHome画面表示未検証 | Founder Decision（同上） |

---

## Empty State監査

記録ゼロの状態におけるHome画面は、CTAボタンと空の週間行のみといった非常にミニマルな構成であり、「記録するとここに何が表示されるか」を予告するガイダンス文言は見当たらなかった。Calendar画面の「今日のからだメモ」カードは、「生理周期: —」という適切なダッシュ表示を採用しており、Empty Stateとして妥当である。Insights画面・実験機能のEmpty State表現は、疾患プロファイル未設定の影響で正確な評価ができなかった（留保2）。

### Empty State 判定

| 項目 | 判定 |
|---|---|
| Home Empty Stateのガイダンス文言不足 | 修正推奨 |
| Calendar Empty State（生理周期「—」表示） | 修正不要（適切） |
| Insights/Experiment Empty State | 将来改善（疾患プロファイル設定後に再評価） |

---

## Error Experience監査

通信失敗・AI失敗・オフライン時の画面表示は、本検証環境で意図的な障害シミュレーションができなかったため確認できていない。`runtime/health-monitor.js` 等のインフラレベルの健全性監視は存在することをコード上確認しているが、ユーザーに見える文言・UIの検証はできていない。

### Error Experience 判定

| 項目 | 判定 |
|---|---|
| 通信失敗・AI失敗・保存失敗・オフラインのUI検証 | 将来改善（実地検証が別途必要、Founder Decision参照） |

---

## Information Architecture監査

Home・Insights・Calendar・Settingsの情報優先順位設計（[INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md)）は、実装が意図通りに機能していれば妥当な設計である。しかし本監査により、その設計が前提とする要素の一部（Insightsのヒーロー文言、Home週間行の記録表示、Settings内のConsent管理項目）が、レイアウト崩れ・未実装・非表示という形で実際には成立していないことが判明した。**情報設計そのものの優先順位付けは適切だが、その実装が一部欠落している**、というのが Council の結論である。

---

## User Journey監査

初回 → 記録 → 理解 → 改善 → 継続 → Premium という流れのうち、「初回」はオンボーディング未検証（留保）、「記録」は高品質、「理解」はInsights画面のレイアウト崩れにより実質的に破壊されている、「改善」は既存の Value Ladder監査（VALUE_LADDER.md）通り未実装、「継続」はHome週間行の欠落により可視化されない、「Premium」は購入導線そのものが見当たらない。

この結果、User Journeyは「記録」の直後で二重に断絶している。ひとつは既知の断絶（VALUE_LADDER.mdが指摘した「改善」機能の未実装）、もうひとつは今回新たに発見した断絶（「理解」のUIが物理的に読めない、「Premium」への導線が存在しない）である。後者は設計の問題ではなく、実装がGeneral Releaseの前提を満たしていないという、より緊急性の高い問題である。

---

## Monetization整合監査

無料体験（Home・Record・Calendar）は壊れておらず、Free層の「記録の障壁ゼロ」原則は実装レベルでも保たれている。Premium価値の説明は自然かという問いに対しては、そもそも価格・比較表が表示されないため評価不能というのが実態である。Paywall位置は設計通り（Record画面等には出現しない）だが、出すべき場所（Premium画面そのもの）で機能していない。押し売りの有無について、ダークパターンは見当たらないが、これは「押し売りする仕組みそのものが動いていない」ことの裏返しでもある。

結論として、Monetization Frameworkの設計とApp Experienceの設計は矛盾していない（APP_EXPERIENCE_FRAMEWORK.mdの整合監査は文書レベルで正しい）。しかし**設計と実装の間に重大な乖離がある**。これは前回の Founder Decision Review（FD-1〜FD-6）が扱った「価格の不整合」とは別種の、より根本的な「そもそも購入導線が機能していない」という問題であり、FD-1〜FD-6の議論の前提を再確認する必要がある。

---

## General Release判定（分類別まとめ）

### 絶対修正

| # | 項目 | 該当画面 |
|---|---|---|
| 1 | ボトムナビ4アイコン（ホーム/インサイト/設定/記録＋）が描画されない | Navigation（全画面） |
| 2 | Insightsヒーロー見出し・リード文がモバイル幅で致命的に折り返る | Insights |
| 3 | Premium画面の価格・比較表領域が空、購入CTAボタンが不在 | Premium |

### 修正推奨

| # | 項目 | 該当画面 |
|---|---|---|
| 4 | Home週間行が日付・記録有無を表示しない | Home |
| 5 | Premiumカードグリッド最終行がボトムナビに隠れる | Premium |
| 6 | ボトムナビ「カレンダー」ラベルが2行に折り返る | Navigation |
| 7 | Home Empty Stateにガイダンス文言がない | Home |

### 将来改善

| # | 項目 | 該当画面 |
|---|---|---|
| 8 | Insights PROロックカードの詳細UX（未深掘り） | Insights |
| 9 | Calendar編集導線の詳細確認 | Calendar |
| 10 | エラー/オフライン体験の実地検証 | 全画面 |
| 11 | FREE_PRO_BOUNDARY.mdのPRO機能棚卸し更新（クラウドバックアップ等） | ドキュメントのみ |

### 修正不要

Welcome画面、Record 3カード入力フロー、Calendar画面の基本構成、Settings画面の項目網羅性・医療免責文言、Navigation のタブ切り替え・戻る導線。

---

## Founder Decision

Council が発見した事項のうち、**UIの範囲を超え Founder の判断を要する事項のみ**をここに整理する（実装可能な項目はPR設計として後述）。

### GRX-FD-1（Critical）— 実環境（Supabase接続済み）での再検証

本 Council の検証はSupabase認証情報が存在しない環境で行われた。オンボーディングの自然な遷移、疾患選択後のHome画面表示、`premiumGate()` クリック時の実際の挙動、エラー/オフライン体験は、実認証環境での再検証なしには確定できない。**General Release前に、実際のSupabase接続環境（steging等）で本Councilの未検証項目を再実施することを推奨する。**

### GRX-FD-2（High）— Premiumクリック時の挙動確認

`#screen-premium` にボタンが存在しない件は、コードの静的構造として確認済みの事実である。一方 `premiumGate()` の実際の動作（モーダル表示等）は本環境で検証できなかった。GRX-FD-1の再検証と合わせて、Founderが実環境で実際にPROカードをタップし、期待通りの購入導線（モーダル・料金表示・Stripe Checkout遷移）が機能するかを確認すること。

### GRX-FD-3（Medium）— Research Consent UIの要否

Settings画面に Research Consent（研究利用同意）の専用UIが存在しないことを確認した。これをGeneral Release前に追加すべきか、現行のバックエンドのみの実装（PR-076 Consent Gate）で足りるとするかは、Business Logic領域の判断であり、本Councilのスコープ外（UI実装のみでは解決できない）。REGULATORY_MEDICAL_COUNCIL.md BD-049・決定R-CR-01との整合を踏まえ、Founderが判断すること。

### GRX-FD-4（Low）— 価格表示の扱い

Premium画面の価格表示を修正するPR（後述PR-EXP-03）は、表示の「仕組み」を直すものであり、表示する「金額」自体は[FOUNDER_DECISION_REVIEW_MONETIZATION.md](FOUNDER_DECISION_REVIEW_MONETIZATION.md) FD-1の結論に従う。FD-1が未決定のまま本PRを実施する場合、現状の実装済み価格（¥580/¥4,800）をそのまま仮表示し、FD-1決定後に差し替える運用とする。

---

## 実装設計（Implementation Design）

以下は「絶対修正」「修正推奨」の各項目について、コード変更を伴わない設計のみを記載する。実装そのものは別PRで行う。

### 設計1: ボトムナビアイコン注入タイミングの是正

1. **対象画面**: 全画面（共通ボトムナビゲーション）
2. **現在の問題**: `initNavIcons()` が `document.addEventListener('DOMContentLoaded', ...)` 内でのみ呼ばれており、フレッシュロード後に `document.readyState` が既に `"complete"` の状態でもアイコンが注入されないことを実機で確認した。
3. **望ましい体験**: ページロード直後、常にボトムナビ4アイコン（ホーム・インサイト・設定・記録＋）が表示される。
4. **変更方針**: `initNavIcons()` の呼び出しを、`DOMContentLoaded` イベント発火済みかどうかに関わらず確実に実行されるガード付きの即時実行に変更する（例: `document.readyState === 'loading'` なら listener登録、そうでなければ即時呼び出し）。ICONSモジュールの読み込み順序も併せて確認する。
5. **変更対象ファイル候補**: `src/app-legacy.js`（`initNavIcons()` 定義・呼び出し箇所、1251〜1272行付近）
6. **影響範囲**: 表示のみ。Business Logic・状態管理には影響しない。
7. **実装PR分割案**: PR-EXP-01（単独、他の修正と独立）
8. **Browser Verification項目**: フレッシュリロード直後・複数回のリロードで、`nav-icon-home`/`nav-icon-insights`/`nav-icon-settings`/`nav-icon-plus` の4要素すべてに空でない`innerHTML`が入ることを確認する。全画面（home/calendar/insights/settings/record）で一貫して表示されることを確認する。
9. **Regression対象**: 既存の `tests/` 配下でナビゲーション関連のテストがあれば実行。手動でのタブ切り替え動作確認。
10. **Rollback方針**: 変更は初期化タイミングのみのため、問題があれば呼び出し箇所を元の `DOMContentLoaded` リスナーに戻すのみで即時ロールバック可能。
11. **Release Risk**: 低。表示専用の初期化ロジックであり、データ・状態には影響しない。

---

### 設計2: Insightsヒーローのモバイルレイアウト修正

1. **対象画面**: Insights
2. **現在の問題**: `.ipr-hero` はベースで `display:flex`。`@media(max-width:767px)` のオーバーライドが `grid-template-columns:1fr` を指定するが `display:grid` へ切り替えないため、モバイル幅で横並びレイアウトのまま残り、テキスト列が1〜2文字幅まで潰れる。
3. **望ましい体験**: モバイル幅では見出し・リード文・CTAが縦積みで表示され、通常の行間で読める。
4. **変更方針**: `@media(max-width:767px)` 内の `.ipr-hero` に `display: grid;`（または `flex-direction: column;` への変更）を明示的に追加する。イラスト（`.hero-art`/`.ipr-art`）の配置も縦積みに合わせて調整する。
5. **変更対象ファイル候補**: `src/screens/insights.html`（69〜115行の `.ipr-hero` 系CSS、384〜392行の `@media(max-width:767px)` ブロック）
6. **影響範囲**: 表示のみ。デスクトップ幅（768px以上）のレイアウトには影響しない設計とする。
7. **実装PR分割案**: PR-EXP-02（単独）
8. **Browser Verification項目**: 375×812（iPhone相当）・320×568（小型端末）・768px境界の3幅で、見出し・リード文が正常な行間で表示されることを確認する。768px以上のデスクトップ表示に regression がないことを確認する。
9. **Regression対象**: Insights画面のPROロックカード・相関グラフ等、同一screen内の他要素のレイアウトに影響がないか確認する。
10. **Rollback方針**: CSS追加のみのため、該当プロパティを削除すれば即時ロールバック可能。
11. **Release Risk**: 低〜中。Insights画面はSTARTER/PRO価値の中核画面であるため、修正後の見た目は複数端末幅で入念に確認すること。

---

### 設計3: Premium画面のヒーロー（価格・比較表・CTA）復旧

1. **対象画面**: Premium
2. **現在の問題**: `<div id="pro-hero">`（コメント「Hero（JSで描画）」）が常に空。`#screen-premium` 内に購入導線となる `<button>` が0件。
3. **望ましい体験**: Premium画面を開いた瞬間に、プラン名・価格・年払い割引・主要な価値訴求・明確な購入CTAボタンが見える。
4. **変更方針**: `#pro-hero` を描画するはずのJSモジュールを特定し、なぜ実行されていない（またはターゲット要素に描画されていない）かを調査した上で復旧する。価格の表示値は [FOUNDER_DECISION_REVIEW_MONETIZATION.md](FOUNDER_DECISION_REVIEW_MONETIZATION.md) FD-1の結論に従う（未決定の場合は実装済み値を仮表示し、決定後に差し替える）。
5. **変更対象ファイル候補**: `app.html`（`#pro-hero`コンテナ定義、684〜692行付近）、当該JSモジュール（本監査では未特定、`src/modules/premium/` 配下を優先的に調査）
6. **影響範囲**: Premium画面の表示・購入導線。Stripe連携自体（決済処理）には触れない設計とする。
7. **実装PR分割案**: PR-EXP-03（単独。ただし調査の結果、原因がBusiness Logic層に及ぶ場合はGRX-FD-2に差し戻す）
8. **Browser Verification項目**: `#pro-hero` に価格・プラン名・CTAボタンが表示されること。CTAボタンをクリックしてStripe Checkoutへの遷移（またはログイン要求）が発生することを確認する。
9. **Regression対象**: 各PROカードの `premiumGate()` クリック時の挙動（モーダル表示や画面遷移）が壊れていないか。
10. **Rollback方針**: 描画ロジックの復旧のみであれば、変更前の状態（空表示）に戻すことで即時ロールバック可能。ただし「購入導線が全くない」状態への逆戻りになるため、ロールバックする場合は暫定的な代替CTA（例: 静的な「アップグレードについて問い合わせる」導線）の用意を検討する。
11. **Release Risk**: **高**。本画面は収益機能の入口そのものであり、General Release時点で購入導線が機能しない場合、Monetization Frameworkの前提（MONETIZATION_COUNCIL_REPORT.md）が成立しない。最優先で調査・検証すること。

---

### 設計4: Home週間行の日付・記録表示の復旧

1. **対象画面**: Home
2. **現在の問題**: `buildHomeWeekRow()` に対応する週間行が、記録保存直後でも曜日ラベルのみで日付・記録有無ドットを表示しない。
3. **望ましい体験**: 直近7日分の日付と、記録がある日には視覚的なマーク（ドット等）が表示され、継続状況が一目で分かる。
4. **変更方針**: `buildHomeWeekRow()` の呼び出しタイミング・データソース（`state.records`）を確認し、日付セルの描画ロジックを復旧する。
5. **変更対象ファイル候補**: `src/modules/home-renderer.js`（`buildHomeWeekRow` 関連箇所）
6. **影響範囲**: 表示のみ。
7. **実装PR分割案**: PR-EXP-04（単独）
8. **Browser Verification項目**: 記録0件時・記録保存直後の両方で、週間行に7日分の日付が表示され、記録がある日にマークが付くことを確認する。
9. **Regression対象**: Home画面の他要素（CTA状態、将来的なInsightカード等）に影響しないか。
10. **Rollback方針**: 表示ロジックの変更のみで、即時ロールバック可能。
11. **Release Risk**: 低。

---

### 設計5: 軽微なUI調整（ボトムナビラベル・Premiumカード下部余白）

1. **対象画面**: Navigation（全画面）／Premium
2. **現在の問題**: 「カレンダー」ラベルがボタン幅に対して長く2行に折り返る。Premium画面のPROカードグリッド最終行がボトムナビに隠れる（下部パディング不足）。
3. **望ましい体験**: ラベルは1行に収まる（文言短縮 or フォントサイズ調整）。カードグリッド全体がボトムナビに隠れず閲覧できる。
4. **変更方針**: ナビラベルのfont-sizeまたは文言を調整する。Premium画面のコンテナに `padding-bottom` を追加し、固定ボトムナビの高さ分を確保する。
5. **変更対象ファイル候補**: ナビゲーションCSS（`src/styles/app.css` 等、`.nav-item` 関連）、Premium画面CSS（`.pf-grid` 等の下部余白）
6. **影響範囲**: 表示のみ。
7. **実装PR分割案**: PR-EXP-05（両者を1つの軽微修正PRとしてまとめる）
8. **Browser Verification項目**: 「カレンダー」ラベルが1行に収まること。Premium画面を最下部までスクロールし、最終カードがボトムナビに隠れず全体が見えること。
9. **Regression対象**: 他のナビラベル（ホーム・記録・インサイト・設定）の表示崩れがないか。
10. **Rollback方針**: CSSのみの変更で即時ロールバック可能。
11. **Release Risk**: 低。

---

## PR設計一覧

| PR | 目的 | 対象ファイル | 禁止事項 | 検証項目 | 完了条件 |
|---|---|---|---|---|---|
| **PR-EXP-01** | ボトムナビ4アイコンの描画復旧 | src/app-legacy.js | Business Logic変更・状態管理変更 | 全画面でのアイコン表示確認（複数回リロード） | 4アイコンが常時表示される |
| **PR-EXP-02** | Insightsヒーローのモバイルレイアウト修正 | src/screens/insights.html | デスクトップレイアウトの変更 | 375px/320px/768px境界での表示確認 | 見出し・リード文が正常な行間で表示される |
| **PR-EXP-03** | Premiumヒーロー（価格・比較表・CTA）復旧 | app.html, src/modules/premium/配下（要調査） | 価格の値そのものの決定・Stripe決済ロジックの変更 | CTAボタンのクリックからCheckout遷移までの確認 | 価格・CTAが表示され、購入導線が機能する |
| **PR-EXP-04** | Home週間行の日付・記録表示復旧 | src/modules/home-renderer.js | Record保存ロジックの変更 | 記録0件時・保存直後の表示確認 | 週間行に日付と記録マークが表示される |
| **PR-EXP-05** | ボトムナビラベル・Premium下部余白の軽微調整 | src/styles/app.css, Premium画面CSS | 他要素のレイアウト変更 | ラベル1行表示・カード全体の視認確認 | 折り返りとoccluionが解消される |

**禁止事項（全PR共通）**: Business Logic変更・Architecture変更・Database変更はいずれのPRでも行わない。PR-EXP-03の調査の結果、原因がBusiness Logic層（例: 認証状態に応じた条件分岐の欠陥）に及ぶと判明した場合は、その時点でPRを中断しGRX-FD-2として Founder に差し戻す。

---

## 分類

```
A. General Release前に必須:      設計1（PR-EXP-01）/ 設計2（PR-EXP-02）/ 設計3（PR-EXP-03）
B. General Release前に推奨:      設計4（PR-EXP-04）/ 設計5（PR-EXP-05）
C. General Release後でよい:      Insights PROカード詳細UX / Calendar編集導線深掘り /
                                  エラー・オフライン体験の実装改善 / Research Consent UI追加（Founder判断次第）
D. 実装不要:                      Welcome画面 / Record 3カードフロー / Calendar基本構成 /
                                  Settings項目網羅性・医療免責文言 / タブ切り替え・戻る導線
```

---

## General Release Readiness（100点満点評価）

| カテゴリ | 配点 | 評価点 | 所見 |
|---|---|---|---|
| Onboarding/初回体験 | 15 | 10 | Welcome画面は高品質。ただし実環境での遷移未検証（GRX-FD-1） |
| Home体験 | 15 | 9 | CTA状態遷移は良好。週間行・Empty Stateガイダンスに欠落 |
| Record体験 | 20 | 19 | 3カードフロー・保存完了とも高品質 |
| Calendar体験 | 10 | 9 | 高品質、月相・凡例が充実 |
| Insights体験 | 15 | 4 | ヒーロー見出しの致命的レイアウト崩れにより中核価値が損なわれている |
| Premium/課金体験 | 15 | 2 | 価格・比較表・CTAが実質的に機能していない |
| Navigation | 10 | 5 | 4アイコン欠落は全画面に影響する見た目の完成度低下 |
| **合計** | **100** | **58** | |

**General Release Experience Readiness Score: 58 / 100**

この点数は「設計の質」ではなく「実装が設計通りに動いているか」を反映している。設計自体（Monetization Framework・App Experience Framework）の評価は既存文書の通り高い水準にあるが、実装との乖離が採点を押し下げている。絶対修正3件（PR-EXP-01〜03）が解消されれば、スコアは85点前後まで回復すると Council は見込む。

---

## Council判定

```
CONDITIONAL GO
```

Home・Record・Calendar・Settingsという記録行動の中核体験は高品質であり、General Releaseの基盤として十分に機能する。しかし、収益化の入口（Premium画面）が実質的に機能しておらず、STARTER/PRO価値の中核画面（Insights）が読めない状態にあり、さらに全画面の見た目の完成度を左右するボトムナビアイコンが欠落している。この3点は、たとえ記録体験が優れていても「Founderが安心して公開できる」水準には達していないと Council は判断する。

これらはいずれも Business Logic・Architecture・Database の変更を伴わない、UI/レイアウト/初期化タイミングの修正で解消可能な性質の不具合であり、修正自体の難易度は高くない。したがって NO GO ではなく、CONDITIONAL GO と判定する。

---

## 次工程

```
Release Preparation Council への進行可否: 現時点では NOT READY

条件:
  1. PR-EXP-01・PR-EXP-02・PR-EXP-03（絶対修正3件）の実装・Browser Verification完了
  2. GRX-FD-1（実環境でのオンボーディング・Premium導線の再検証）の実施
  3. GRX-FD-2（premiumGate()実際の挙動確認）の結果、追加のBusiness Logic修正が
     不要と確認されること（必要と判明した場合は別途 Founder Decision）

上記3条件を満たした時点で、Release Preparation Council への進行が可能と Council は判定する。
PR-EXP-04・05（修正推奨）はGeneral Release前の実施を推奨するが、
Release Preparation Council進行の必須条件とはしない。
```

---

## 最終出力サマリー

```
1. General Release体験評価:        58 / 100（絶対修正3件の解消により85点前後まで回復見込み）
2. 絶対修正項目:                    3件（ボトムナビアイコン欠落 / Insightsレイアウト崩れ /
                                     Premium価格・CTA不在）
3. 推奨修正項目:                    4件（Home週間行 / Premium下部余白 / ナビラベル折返り /
                                     Home Empty Stateガイダンス）
4. 将来改善項目:                    4件（Insights PROカード詳細 / Calendar編集導線 /
                                     エラー体験実装 / ドキュメント更新）
5. Founder Decision項目:            4件（GRX-FD-1〜4）
6. 実装PR一覧:                      PR-EXP-01〜05（5件、詳細は上表）
7. 最短リリースルート:              PR-EXP-01→02→03を並行実装・検証 → GRX-FD-1/2を実環境で
                                     再検証 → 問題なければRelease Preparation Councilへ
8. Release Preparation Councilへ進める条件: 絶対修正3件の解消 + GRX-FD-1/2の実環境再検証完了
```

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-GENREL-EXP-001 |
| **作成日** | 2026-07-07 |
| **権威レベル** | LEVEL-1 STRATEGIC DOCUMENT |
| **検証方法** | 本番相当ビルド（vite preview）の実機ブラウザ操作。コード変更ゼロ |
| **前提文書** | MONETIZATION_COUNCIL_REPORT.md / APP_EXPERIENCE_FRAMEWORK.md / SCREEN_FLOW.md / INFORMATION_ARCHITECTURE.md / NAVIGATION_DESIGN.md / USER_JOURNEY.md / GENERAL_RELEASE_SCREEN_MAP.md |
| **Founder Decision** | GRX-FD-1〜GRX-FD-4 |
| **次回改訂トリガー** | PR-EXP-01〜05実装完了時 / 実環境再検証完了時 |

---

**GENERAL RELEASE EXPERIENCE COUNCIL — 議決完了 2026-07-07**
**最終判定: CONDITIONAL GO**
**絶対修正3件・Founder Decision 4件**
**次工程: Release Preparation Council — NOT READY（上記条件解消後に再判定）**
