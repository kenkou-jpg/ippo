# DEPENDENCY_AUDIT.md
## ippo — 依存関係監査

Generated: 2026-06-24

---

## 外部依存

| パッケージ | バージョン | 用途 | リスク |
|-----------|-----------|------|--------|
| `@supabase/supabase-js` | ^2.105.3 | DB/Auth/Realtime | 低 |
| `vite` | ^6.3.0 | ビルドツール | 低 |
| `vitest` | ^2.0.0 | テスト | 低 |
| `jsdom` | ^29.1.1 | テスト用DOM | 低 |

**CDN依存 (runtime):**
- `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.105.3/+esm` — バージョン固定済み
- Stripe.js SDK — 未使用（Edge Function経由のみ）

---

## 中核モジュール依存グラフ

```
main.js
  ├── modules/boot-stability.js         (副作用: window前提チェック)
  ├── services/environment-service.js   (window.SUPABASE_URL/KEY設定)
  ├── runtime/runtime-brain.js          (全runtime観測器)
  ├── runtime/startup-render-gate.js
  ├── modules/ownership-registry.js
  ├── modules/render-authority.js
  ├── modules/timer-registry.js
  ├── modules/module-lifecycle.js
  ├── modules/auth/auth-service.js
  ├── modules/editing-state.js
  ├── app-legacy.js                     ← ★ 全UI依存の根
  │     依存: window.ICONS, window.DISEASE_CONFIG, window.SYMPTOM_LAYERS
  │           window.getState, window.setState, window.saveState
  │           window.supabase, window.cloudBackupAll, ...
  ├── services/supabase.js
  │     依存: store/state.js, utils/safe-merge-state.js
  ├── modules/record.js
  │     依存: modules/record/save.js, modules/tab-navigation.js
  │           modules/record-upsert.js
  ├── modules/pro/analysis/analysis-module.js
  │     依存: analytics/* (8エンジン全て)
  │           disease/disease-registry.js
  │           ai/prompt-builder.js, ai/feature-engine.js
  └── ...
```

---

## God Object: `app-legacy.js`

**規模:** 10,804行

**保有機能 (抜粋 / ~100+関数):**
- 全UI更新関数 (updateStats, updateHistory, renderBodyCheck...)
- 記録入力UI関数 (toggleRsChip, selectEmotion, selectMood...)
- ファスティング管理 (startFastTimer, resumeFasting...)
- 分析表示 (renderComparisonChart, renderPhaseMap...)
- 設定管理 (saveSymptomSettings, openSymptomSettings...)
- 認証フロー (_notifyAuthReady, showLoginForm...)
- Premium管理 (premiumGate, checkPremiumStatus...)
- 実験管理 (startExperiment, openExperiments...)
- コミュニティ機能 (postCommunityReply, toggleArchiveReplies...)
- 100+個の関数を window.* に export

**window依存パターン:**
```js
// app-legacy.js が参照するグローバル
window.getState()       // state.js
window.setState()       // state.js
window.saveState()      // state.js
window.supabase         // supabase.js
window.SUPABASE_URL     // environment-service.js
window.ICONS            // constants/icons.js
window.SYMPTOM_LAYERS   // constants/symptoms.js
window.DISEASE_CONFIG   // constants/disease.js
window.buildAIPrompt    // main.js
window.analyzePatterns  // main.js
// ... 50+ window.* 参照
```

---

## 循環参照リスク

| パターン | リスク | 詳細 |
|----------|--------|------|
| main.js → app-legacy.js → window.* → main.jsが設定したもの | 中 | windowグローバル経由で実質循環 |
| record.js → record/save.js → window.saveState | 低 | window経由のため実行時解決 |
| app-legacy.js の自己参照 | 高 | 10804行内で関数が互いを呼び合う |

---

## 技術的結合点 (Coupling Hotspots)

```
app-legacy.js が直接管理するもの:
  ├── DOM操作 (全画面)
  ├── 記録入力ロジック
  ├── Analytics表示
  ├── 認証フロー
  ├── Premium判定
  ├── Fasting状態
  └── Community機能

= 6ドメインが1ファイルに混在
```

---

## ロードオーダー依存 (main.js より)

```
1. boot-stability.js           (最初に: ブート保護)
2. environment-service.js      (2番目に: window.SUPABASE_URL確立)
3. runtime-brain.js            (3番目に: 状態観測)
4. startup-render-gate.js      (app-legacyより前に: hydration防止)
5. ownership-registry.js       (app-legacyより前に必須)
6. render-authority.js         (同上)
7. modules/auth/auth-service.js (app-legacyより前に: _notifyAuthReady用)
8. editing-state.js            (record-edit-hydrate.jsより前に)
9. app-legacy.js               ← ここでDOMとstateに依存する全コードが実行
10. ownership-map.js           (app-legacy後: window.* export確認後)
11. store/state.js import      (stateは実際にはapp-legacy前に副作用実行済み)
...
```

このロードオーダーが壊れると白画面バグが発生する（過去に多発）。

---

## 依存なしモジュール (独立済み)

以下は `app-legacy.js` に依存しない純粋関数群:

- `src/analytics/` 全8エンジン — window参照ゼロ
- `src/disease/` 全11アナライザー — window参照ゼロ
- `src/store/state.js` — ほぼ独立 (window互換export除く)
- `src/utils/safe-merge-state.js`
- `src/utils/checkin-snapshot.js`
