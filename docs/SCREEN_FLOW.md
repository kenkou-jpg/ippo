# SCREEN FLOW
## App Experience Council — 画面ごとの役割と遷移

---

> **この文書の役割**: General Release 時点の各画面が「何のためにあるか」と「どう繋がっているか」を定義する唯一の正典。
> 画面内部の情報の優先順位は [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md)、
> ナビゲーション構造（Bottom Nav・FAB）は [NAVIGATION_DESIGN.md](NAVIGATION_DESIGN.md)、
> 公開/非公開の分類は [GENERAL_RELEASE_SCREEN_MAP.md](GENERAL_RELEASE_SCREEN_MAP.md) が担う。
> 本文書は実装済みの画面構成（`app.html` / `src/modules/tab-navigation.js`）を実測した上で整理しており、
> 新規画面の追加提案は行わない（画面の新設は UI 変更に該当し、本 Council のスコープ外）。

---

## 1. 画面ごとの役割

IPPO の General Release 時点の画面構成は、`app.html` の `id="screen-*"` を実測した結果、7画面と1オーバーレイに集約される。それぞれの役割は以下の通りである。

**welcome** は、初回起動時・未ログイン時にのみ現れる画面であり、唯一「課金の話をしない」ことが許される画面でもある。ここでの役割はただ一つ、ユーザーを最初の記録へ導くことに尽きる。

**home** はユーザーの起点であり、毎回のセッションで最初に戻ってくる場所である。今日何をすべきかを即答し、記録の意味を即座に返す役割を担う（詳細な優先順位は [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md) 第1章）。

**record** は IPPO の心臓部にあたる画面である。ここでの役割は記録そのものであり、他のいかなる目的（課金導線を含む）にも利用してはならない。

**calendar** は振り返りのための画面であり、記録の連なりを一覧として見せる役割を持つ。データの取得は `ensureScreenLoaded('calendar')` による遅延fetchで行われる。

**insights**（静的DOM上には存在せず JS によって注入される画面）は、STARTER/PRO の価値が最も集中する画面である。無料の証拠（観察サマリー）から有料の深さ（傾向・相関・レポート）へと段階的に導く役割を持つ。

**settings** はアカウントとプランの状態を確認する画面であり、Consent 管理の窓口でもある。

**premium** はプラン購入そのものを目的とした画面であり、Bottom Navigation のタブには含まれない――これは意図的な設計であり、課金を「常設のタブ」にしないことで、ナビゲーションの大部分を無料体験に使わせるという方針の表れである。

**success-overlay** は記録保存直後にのみ現れるオーバーレイであり、達成感を伝える以外の役割を持たせてはならない（[PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md) 第3章が定める通り、ここに課金導線を混ぜることは禁止されている）。

| 画面ID | 役割 | 読み込み方式 |
|---|---|---|
| `screen-welcome` | 初回起動・未ログイン | 静的DOM |
| `screen-home` | ホーム（起点・ダッシュボード） | 静的DOM |
| `screen-record` | 記録入力（唯一の役割に専念） | 静的DOM |
| `screen-calendar` | カレンダー（振り返り） | 遅延fetch（`ensureScreenLoaded('calendar')`） |
| （insights タブ） | インサイト（STARTER/PRO価値の中核） | 遅延fetch（`ensureScreenLoaded('insights')`、JS注入） |
| `screen-settings` | 設定・アカウント・Consent | 静的DOM |
| `screen-premium` | プラン購入 | 静的DOM |

---

## 2. 画面遷移図

```
                    ┌──────────────┐
                    │   welcome    │  初回起動・未ログイン
                    └──────┬───────┘
                           │ ログイン/オンボーディング完了
                           ▼
        ┌──────────────────────────────────────┐
        │              home（起点）              │
        └───┬────────┬────────┬────────┬────────┘
            │         │        │        │
      [nav] │   [nav] │  [FAB] │  [nav] │
            ▼         ▼        ▼        ▼
       calendar   insights   record  settings
            │         │        │        │
            │         │        │        └──→ premium（アップグレード導線）
            │         │        │
            │         │        └──→ 保存成功 → home へ復帰
            │         │
            │         └──→ ins-trend-cards/question/correlation/report
            │              （PROロックUIから premium へ遷移することがある）
            │
            └──→ editPastRecord → screen-record（過去日編集、PR-092B経路）
```

---

## 3. 主要導線の詳細

### 3-A. 記録導線（最重要・最頻）

home の中央 FAB（記録ボタン）が押されると、`window.openLegacyRecordScreen()` が存在すればそれを優先し、なければ `openRecordScreen()` にフォールバックする形で `screen-record` に遷移する。3-card記録フローを経て `saveRecordScreen()` が呼ばれ、保存成功後は `success-overlay` を経由して home へ自動的に復帰する。この導線のどこにも課金要素は存在しない。

### 3-B. カレンダー経由の過去日編集

calendar 画面から `editPastRecord(date)` を呼ぶと `state.editingDate` に日付がセットされ、同じ `screen-record` が編集モードとして再利用される。保存後は `editingDate` がリセットされ home に復帰する（PR-092B以降 `record-screen.js` に実装された経路）。

### 3-C. インサイト → Paywall 導線

insights タブが表示されると `switchInsTab('recommended')` によりデフォルトタブが表示され、`ins-clinical-summary`（無料、常に表示）を土台として、`ins-trend-cards` / `ins-question-card` / `ins-correlation-chart` / `ins-medical-report` が `tier='pro'` の場合 `isPremium()` でゲートされる。ロックされている場合は `renderProGate()` を経由して premium 画面への導線が示される。

### 3-D. 設定 → プラン確認・変更

settings 画面のプラン表示エリアから premium へ遷移できる。データエクスポート機能（自分の記録、FREE でも利用可）もこの画面に統合されている。

---

## 4. 画面遷移の一貫性チェック

Council は以下の点を確認した。すべてのタブ遷移が `switchTab(tab, btn)` 経由で一元管理されており（`showScreen()` が `state.currentScreen` を更新し、welcome-reset-guard との競合を防止する設計になっている）、record 画面は「新規記録」と「過去日編集」の2経路で共有されている（PR-092A〜D で整理済み、record-modal 等の旧経路は PR-092C で完全に削除済み）。Paywall 遷移は insights 画面内のロック UI からのみ発生し、他画面から唐突に premium へ飛ばされることはない（[PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md) 第3章の禁止事項と整合している）。

一点、本監査で確認しきれなかった事項として、welcome から home への遷移条件（オンボーディング完了判定、`modules/onboarding-runtime.js` に実装）がある。これは [USER_JOURNEY.md](USER_JOURNEY.md) がオンボーディング体験として別途扱う。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-APPEXP-001 |
| **作成日** | 2026-07-07 |
| **検証方法** | `app.html` / `src/modules/tab-navigation.js` の直接確認（grep実測） |
| **前提文書** | HANDOFF_PHASE7_COMPLETE.md（PR-092A〜D記載） |
| **親文書** | [MONETIZATION_COUNCIL_REPORT.md](MONETIZATION_COUNCIL_REPORT.md) |
| **次回改訂トリガー** | 新規画面追加時 / タブ構成変更時 |
