# NAVIGATION DESIGN
## App Experience Council — 導線設計

---

> **この文書の役割**: アプリ全体のナビゲーション構造（Bottom Nav・FAB・Menu・Profile）を定義する唯一の正典。
> 各画面の役割・遷移は [SCREEN_FLOW.md](SCREEN_FLOW.md)、画面内の情報優先順位は
> [INFORMATION_ARCHITECTURE.md](INFORMATION_ARCHITECTURE.md) が担う。
> 実装済みの Bottom Navigation（`app.html` 実測）を基準に整理しており、
> 新規ナビゲーション要素の追加提案は行わない。

---

## 1. 実測済み Bottom Navigation

```html
<nav class="bottom-nav" role="navigation" aria-label="メインナビゲーション">
  [home]  [calendar]  [record-FAB（中央・強調）]  [insights]  [settings]
</nav>
```

| 位置 | data-tab | 役割 | アイコン強調 |
|---|---|---|---|
| 1 | home | ホーム | 通常 |
| 2 | calendar | カレンダー | 通常 |
| 3（中央） | （record-btn、data-tab属性なし） | 記録（最頻アクション） | 強調（FABスタイル） |
| 4 | insights | インサイト | 通常 |
| 5 | settings | 設定 | 通常 |

記録ボタンを中央に FAB 的に強調配置する構成は、`GTM_COUNCIL.md` の ICP プロファイル（記録動機は強いが「面倒だと感じたら離脱する」）に合致していると Council は評価する。5タブ構成は現状維持が妥当であり、追加タブは認知負荷を増やすため推奨しない。

---

## 2. Menu / Profile の扱い

独立した「Menu」「Profile」画面は現状存在しない。Profile相当の情報（アカウント状態・プラン）は settings 画面に統合されている。これは Founder一人運営・機能を絞る方針（`BUSINESS_STRATEGY.md` 2-A）と整合しており、Council は Menu/Profile を分離新設する提案を却下した（[MONETIZATION_COUNCIL_REPORT.md](MONETIZATION_COUNCIL_REPORT.md) 第4章参照。UI変更・新規画面追加は本 Council のスコープ外であることも理由の一つである）。

---

## 3. Premium（プラン購入画面）への導線

premium 画面への導線は3つある。settings 画面のプラン表示エリアからの能動的な導線、insights 画面の PRO ロック UI からの文脈的な導線（[PAYWALL_STRATEGY.md](business/PAYWALL_STRATEGY.md) 第4章）、そして医師向けレポート生成を試みた瞬間の導線（同章）である。premium 画面は Bottom Navigation のタブには含まれない。課金を「常設タブ」にしないことで、ナビゲーションの大部分を無料体験に使わせるという設計判断であり、これは `BUSINESS_STRATEGY.md` 5-A の「記録の障壁ゼロ」思想と一致する。

---

## 4. ナビゲーション一貫性の監査

全タブが `switchTab()` 経由で一元管理されており（[SCREEN_FLOW.md](SCREEN_FLOW.md) 第4章参照）、アクティブ状態の同期は `nav-item` の `.active` クラスで統一されている。「戻る」導線は個別画面（calendar等）に用意されており、Bottom Navigation と併存しても混乱しない設計になっている。

一点、観察事項として記録する価値のある事実がある。中央の記録ボタンは `data-tab` 属性を持たないため、`switchTab` のアクティブ状態管理から意図的に外れている。これは記録が「タブ」ではなく「アクション」として設計されていることの表れであり、一貫した設計判断として妥当なため修正の必要はない。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-APPEXP-003 |
| **作成日** | 2026-07-07 |
| **前提文書** | SCREEN_FLOW.md / app.html（実測） |
| **親文書** | [MONETIZATION_COUNCIL_REPORT.md](MONETIZATION_COUNCIL_REPORT.md) |
| **次回改訂トリガー** | Bottom Navigation構成変更時 |
