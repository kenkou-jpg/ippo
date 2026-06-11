# manualCloudRestore Migration Plan

> 作成: 2026-06-11  
> ステータス: Design Complete  
> 根拠: P0 Migration Review + Design Review の実コード調査結果

---

## 背景・目的

`manualCloudRestore` は Data Protection Layer の **P0 コンポーネント**。

- 2026-06-11 のデータ消失インシデントで49件復旧を可能にした主要機能
- 現在 `src/app-legacy.js:1454` にのみ実装
- `src/services/recovery.js:52–54` が `window.manualCloudRestore` を参照（未定義時は `Promise.resolve()` でサイレントスキップ）
- `src/screens/settings.html:205` / `app.html:961` が onclick で直接参照
- app-legacy.js 削除の**ブロッカー**

---

## 移植先決定

**採用: `src/services/recovery.js`**

| 根拠 | コード箇所 |
|---|---|
| `autoRecoveryCheck` が `window.manualCloudRestore` を呼ぶ — 同ファイルで window 参照を直接呼び出しに変換できる | `recovery.js:52–54` |
| `mergeRecords` が既に実装済み | `recovery.js:9` |
| `idbGetAllRecords`, `persistRecords` が既に import 済み | `recovery.js:7` |
| `getState`, `setState` が既に import 済み | `recovery.js:6` |
| 新ファイル作成不要 — 依存を内部化できる | — |

**却下: `services/supabase.js`** — `cloudRestore()` は自動実行専用・UI通知なし・手動起動不可。責務が異なる。  
**却下: 新ファイル `services/data-protection.js`** — Phase 5 以降で検討。今回は既存ファイルへの追加で対応。

---

## Public API

```js
// src/services/recovery.js に追加
export function manualCloudRestore() { ... }
window.manualCloudRestore = manualCloudRestore;
```

`autoRecoveryCheck` 内の `window.manualCloudRestore()` 参照を直接呼び出しに変更：

```js
// 変更前（サイレント失敗リスクあり）
var cloudRestore = typeof window.manualCloudRestore === 'function'
  ? Promise.race([window.manualCloudRestore(), timeout(15000)])
  : Promise.resolve();

// 変更後（直接呼び出し — サイレント失敗排除）
var cloudRestore = Promise.race([manualCloudRestore(), timeout(15000)]);
```

---

## R-1: takeSnapshot('pre-restore') — Restore 前スナップショット

**問題**: 移植計画の初版では Restore 前スナップショットの記載がなかった。  
`rollback-manager.takeSnapshot` は `saveState()` の preSave フックで呼ばれるが、それは Restore **後**の状態が対象になる。  
Restore 前の状態を Rollback の起点にするには、明示的な呼び出しが必要。

**決定**: `manualCloudRestore` 冒頭（Supabase 呼び出し前）で `takeSnapshot('pre-restore')` を呼ぶ。

```js
export function manualCloudRestore() {
  takeSnapshot('pre-restore');  // ← 最初に実行
  return supabase.auth.getSession().then(...)
}
```

**呼び出しタイミング**: セッション取得前。クラウドデータ取得・マージ処理より前に確定させる。

---

## R-2: mergeRecords 実装選択

**問題**: `mergeRecords` が3箇所に独立実装。どれを使うか未決定だった。

| 実装場所 | ID なしレコードの扱い |
|---|---|
| `app-legacy.js:1356` | `r.id = Date.now().toString(36) + ...` で自動付与 |
| `recovery.js:9` | `if (r.id) merged[r.id] = r` でスキップ（ID なしを無視） |
| `supabase.js:82` | app-legacy.js 版と同一（自動付与） |

**決定**: **recovery.js 既存の実装（スキップ方式）を採用する。**

採用根拠:
- ID なしレコードは旧フォーマット（IDB 移行前の極初期データ）であり、現行の `ensureRecordIds()` が起動時に ID を付与済みのはず
- Cloud から取得するレコードは必ず ID を持つ（Supabase upsert は id カラムを必須とする）
- ID 自動付与方式は同一レコードに異なる ID を生成する可能性があり、重複挿入リスクがある
- `mergeRecords` は既に recovery.js に存在するため、追加実装不要（重複削減）

**補足**: ローカル側 ID なしレコードは `idbGetAllRecords` → `ensureRecordIds` が処理済みであることを前提とする。

---

## R-3: trackedConditions 保護設計

**問題**: `cloudRestore()` (supabase.js) の `_safeMergeState` にも `trackedConditions` の保護がない。  
`Object.assign(state, cloudState)` により古いクラウドデータで上書きされるリスクがある。

**決定**: `_safeMergeState` に `trackedConditions` の保護を追加する。  
myDiseases と同じロジック（空配列・null はローカル値を維持）を適用する。

```js
function _safeMergeState(local, cloud) {
  var merged = Object.assign({}, local);
  Object.keys(cloud).forEach(function(key) {
    if (key === 'currentScreen') return;          // 永続化しない
    var cv = cloud[key];
    if (cv === undefined || cv === null) return;

    // myDiseases: 空配列はローカル値を消さない
    if (key === 'myDiseases') {
      if (!Array.isArray(cv) || cv.length === 0) return;
    }

    // trackedConditions: 空配列・空オブジェクトはローカル値を消さない
    if (key === 'trackedConditions') {
      if (cv === null || cv === undefined) return;
      if (Array.isArray(cv) && cv.length === 0) return;
      if (typeof cv === 'object' && !Array.isArray(cv) && Object.keys(cv).length === 0) return;
    }

    merged[key] = cv;
  });
  return merged;
}
```

**PR-2A の範囲**: この `_safeMergeState` を recovery.js 内の manualCloudRestore 専用ローカル関数として実装する。  
**PR-2B の範囲**: supabase.js の `cloudRestore()` にも同等の保護を適用する（trackedConditions 追加）。

---

## R-4: persistRecords() 呼び出し位置

**問題**: IDB と localStorage の整合を取るために必要。`runSelfDiagnosis()` の IDB 件数との一致が Diagnostics の前提。

**決定**: `setState()` → `saveState()` の直後、UI 更新の前に呼ぶ。

```js
setState(mergedState);   // state-integrity-guard が通過を確認
saveState();             // save-transaction-guard が pre/post フック実行 + takeSnapshot('pre-save')
persistRecords();        // ← IDB 書き込み（Diagnostics との整合）
localStorage.setItem('ippo_last_record_count', String(mergedCount));
// UI 更新...
```

`persistRecords()` は Promise を返すが、UI 更新はブロックしない（`.catch` のみ付ける）。

---

## R-5: premiumGate 依存確認

**問題**: `settings.html:205` の `onclick="premiumGate(manualCloudRestore)"` は `premiumGate` も window 参照。  
`premiumGate` は app-legacy.js のみに実装（`window.premiumGate`）。

**決定**: PR-2A では `premiumGate` は触らない。  
`window.manualCloudRestore` を recovery.js から公開することで、onclick の動作は維持される。

**PR-2A checklist 追加項目**:
- [ ] `window.premiumGate` が app-legacy.js から公開されていることを確認（削除していない）
- [ ] `settings.html:205` の onclick が `manualCloudRestore is not defined` エラーを出さないことを確認

**将来**: `premiumGate` の移植は PR-5D (Settings/Premium ドメイン) で実施。

---

## 実装フロー（PR-2A）

```
export function manualCloudRestore() {
  // 1. Restore 前スナップショット（R-1）
  takeSnapshot('pre-restore');

  return supabase.auth.getSession().then(function(res) {
    var session = res.data.session;
    if (!session || !session.user) {
      showToast('ログインしてからご利用ください', 'warn');
      return;
    }
    var userId = session.user.id;

    // 2. 同期インジケーター表示
    showSyncIndicator('クラウドから復元中');

    // 3. user_data テーブルから最新スナップショット取得
    return supabase.from('user_data')
      .select('state,updated_at')
      .eq('user_id', userId)
      .single()
      .then(function(result) {
        hideSyncIndicator();

        // 4. バリデーション
        if (!result.data || !result.data.state) {
          showToast('クラウドにデータが見つかりませんでした', 'warn');
          return;
        }
        var cloudState = result.data.state;
        if (!Array.isArray(cloudState.records)) {
          showToast('クラウドのデータ形式が不正です', 'warn');
          return;
        }

        // 5. カウント記録（Restore 前）
        var localRecs = (getState().records || []).length;
        var cloudRecs = cloudState.records.length;

        // 6. records マージ（R-2: recovery.js 版 = ID なしスキップ）
        var mergedRecords = mergeRecords(
          getState().records || [],
          cloudState.records || []
        );
        var mergedCount = mergedRecords.length;

        // 7. 設定系マージ（R-3: myDiseases/trackedConditions 保護）
        var mergedState = _safeMergeState(getState(), cloudState);
        mergedState.records = mergedRecords;
        var rawDate = result.data.updated_at;
        mergedState.lastSaved = rawDate
          ? new Date(rawDate.endsWith('Z') ? rawDate : rawDate + 'Z').toISOString()
          : new Date().toISOString();

        // 8. state 更新（state-integrity-guard 経由）
        setState(mergedState);

        // 9. 保存（save-transaction-guard + takeSnapshot('pre-save') 経由）
        saveState();

        // 10. IDB 同期（R-4: persistRecords）
        persistRecords().catch(function(e) {
          console.warn('[manualCloudRestore] persistRecords 失敗:', e);
        });

        // 11. last_record_count 更新
        localStorage.setItem('ippo_last_record_count', String(mergedCount));

        // 12. UI 再描画
        if (typeof window.updateStats === 'function') window.updateStats();
        if (typeof window.updateHistory === 'function') window.updateHistory();
        if (typeof window.buildCalendar === 'function') window.buildCalendar();
        if (typeof window.updateDiseaseSettingDisplay === 'function') window.updateDiseaseSettingDisplay();
        if (typeof window.updateDiseaseQuestions === 'function') window.updateDiseaseQuestions();
        if (typeof window.reorderRecordSections === 'function') window.reorderRecordSections();
        if (typeof window.updateFastingWidgetPhase === 'function') window.updateFastingWidgetPhase();

        // 13. 完了通知
        var msg = 'クラウドから復元しました ✅\nローカル' + localRecs + '件 + クラウド' + cloudRecs + '件 → ' + mergedCount + '件';
        showToast(msg, 'success');
        console.log('[manualCloudRestore]', msg);
      })
      .catch(function(e) {
        hideSyncIndicator();
        console.warn('[manualCloudRestore] エラー:', e);
        showToast('復元に失敗しました。通信状況を確認してください。', 'warn');
      });
  });
}

window.manualCloudRestore = manualCloudRestore;
```

---

## 追加インポート（recovery.js に追加）

```js
import { getState, setState, saveState } from '../store/state.js';
import { takeSnapshot } from '../runtime/rollback-manager.js';
import { showSyncIndicator, hideSyncIndicator, showToast } from '../modules/ui-notifications.js';
import { supabase } from './supabase.js';
```

---

## Validation Gate（PR-2A 完了条件）

### Unit Tests
- [ ] manualCloudRestore が export されていることを確認
- [ ] window.manualCloudRestore が設定されていることを確認
- [ ] 未ログイン時に toast 表示して return することを確認
- [ ] クラウドデータなし時に toast 表示して return することを確認
- [ ] 正常 Restore 時に setState / saveState / persistRecords が呼ばれることを確認
- [ ] takeSnapshot('pre-restore') が最初に呼ばれることを確認
- [ ] mergeRecords が正しく動作することを確認（local + cloud = merged）
- [ ] myDiseases 空配列でローカル値が保持されることを確認
- [ ] trackedConditions 空配列でローカル値が保持されることを確認
- [ ] autoRecoveryCheck が window 参照ではなく直接呼び出しになっていることを確認

### Manual Validation
- [ ] Cloud Restore 実行 → records 件数一致（localStorage / state / IDB）
- [ ] Cloud Restore 後リロード → データ保持
- [ ] Cloud Restore 後 Rollback → Restore 前の状態に戻れる
- [ ] myDiseases が Restore 後も保持されている
- [ ] trackedConditions が Restore 後も保持されている
- [ ] `window.premiumGate` が動作することを確認（settings.html ボタンが押せる）

---

## PR-2A 完了後の状態

- `window.manualCloudRestore` が recovery.js から公開される
- `autoRecoveryCheck` の window 参照依存が排除される（サイレント失敗リスク解消）
- app-legacy.js の `manualCloudRestore` は残存するが、`window.manualCloudRestore` は recovery.js 版が上書きして勝つ（モジュールの読み込み順: main.js → recovery.js → app-legacy.js の逆順で window 設定される）

> **注意**: app-legacy.js の `window.manualCloudRestore = manualCloudRestore` は `app-legacy.js:10676` に存在する。  
> モジュールは HTML の `<script type="module">` として先に評価されるため、  
> recovery.js 版が設定された後に app-legacy.js 版が **上書きする可能性がある**。  
> → PR-2A では app-legacy.js 側の window 公開行をコメントアウトすることで移植版を有効にする。

---

## PR-2B（次PR）

- `cloudRestore()` (supabase.js) に `trackedConditions` 保護を追加
- `autoRecoveryCheck` の Disease Configuration 保護確認
- Sync Architecture Protection の Validation
