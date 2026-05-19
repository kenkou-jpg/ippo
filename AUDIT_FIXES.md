# AUDIT_FIXES.md
# ippo Production Stabilization — P0/P1 修正仕様書

生成日: 2026-05-20  
対象ブランチ: claude/heuristic-sammet-1d97fc  
ポリシー: minimal safe fix only（architecture rewrite 禁止）

---

## 修正対象サマリー

| ID   | 優先度 | ファイル                         | 内容                                  | 行番号      |
|------|--------|----------------------------------|---------------------------------------|-------------|
| P0-1 | P0     | src/app-legacy.js                | window.state getter bridge 追加       | 15 の直後   |
| P0-2 | P0     | src/app-legacy.js                | STEPS ローカル変数代入の欠落修正       | 4194        |
| P1-1 | P1     | src/app-legacy.js                | save 後の buildCalendarNext notify 保証 | 9372 の直後 |
| P1-2 | P1     | src/app-legacy.js                | persist/sync/notify delegate 接続修正  | 複数箇所    |
| P1-3 | P1     | src/app-legacy.js                | community_topics 401 silent fail      | 5744        |

---

## P0-1: window.state bridge

### 目的
`navbar「記録」` / `home「記録する」` CTA が `window.state` を参照する。  
ES module 化後 `state` が module スコープに閉じ込められ `window.state` が `undefined` になるため、
`openRecordScreen()` 等が ReferenceError を吐いて停止している。

### 修正箇所
**ファイル**: `src/app-legacy.js`  
**行番号**: 15 の直後（state hook 登録直後）

### Before
```js
// L14–15
var state = { records: [] };
window._ippoStateHooks.push(function(nextState) { state = nextState; });
```

### After
```js
// L14–15
var state = { records: [] };
window._ippoStateHooks.push(function(nextState) { state = nextState; });

try {
  Object.defineProperty(window, 'state', {
    get: function () {
      return state;
    },
    configurable: true,
  });
} catch (_) {}
```

### 確認項目
- [ ] `window.state` が `undefined` でない
- [ ] navbar 記録ボタンが動作する
- [ ] home CTA が動作する
- [ ] ReferenceError が出ない
- [ ] onboarding フロー維持
- [ ] reload 後 state 復元維持

---

## P0-2: openRecordModal STEPS ローカル変数代入欠落

### 目的
`openRecordModal` 内で `window.STEPS = buildSteps()` とのみ書かれており、
モジュールスコープの `STEPS` 変数が更新されない。  
`renderStep` 等がモジュールローカルの `STEPS` を参照するため、
quick CTA からモーダルを開くと空ステップになり silent fail する。

### 修正箇所
**ファイル**: `src/app-legacy.js`  
**行番号**: 4194

### Before
```js
window.STEPS = buildSteps();
```

### After
```js
STEPS = window.STEPS = buildSteps();
```

### 確認項目
- [ ] quick CTA からモーダルが開く
- [ ] renderStep が正常動作する
- [ ] モーダルが表示される
- [ ] console error なし

---

## P1-1: calendar notify stabilization

### 目的
`saveRecordScreen` は module スコープの `buildCalendar()` (旧カレンダー / `#calGrid`) を
直接呼ぶが、`buildCalendarNext` (`#calGridNew`) を呼ばない。  
保存後に新カレンダー画面が即時更新されない。

### 根本原因
- `calendar-next.js` が `window.buildCalendar = buildCalendarNext` を設定する（668行目）
- `saveRecordScreen` (L9372) はモジュールローカルの旧 `buildCalendar` を呼ぶ
- `window.buildCalendar` (= `buildCalendarNext`) は呼ばれない

### 修正箇所
**ファイル**: `src/app-legacy.js`  
**行番号**: 9372 の直後

### Before
```js
    buildCalendar();              // L9372
    localStorage.removeItem('ippo_draft');
```

### After
```js
    buildCalendar();              // 旧カレンダー (#calGrid) 更新
    if (typeof window.buildCalendarNext === 'function') window.buildCalendarNext();  // 新カレンダー (#calGridNew) 更新
    localStorage.removeItem('ippo_draft');
```

### 確認項目
- [ ] 保存後にカレンダー画面が即時更新される
- [ ] リロード不要
- [ ] 旧カレンダー (`#calGrid`) も引き続き更新される

---

## P1-2: save verify stabilization

### 目的
`ippoVerifyLastRecordSave()` が `{ ok: false }` を返す。  
原因は `saveRecordScreen` が persist/sync/notify を全てモジュールローカル関数で
直接呼ぶため、`record.js` の delegate wrapper が一切介在せず、
save context にアクション記録が残らない。

### 根本原因
```
saveRecordScreen (app-legacy.js)
  ├── localStorage.setItem(...)  ← saveState() を呼ばない → persist 未記録
  ├── buildCalendar()            ← window.buildCalendar ではなくローカル関数 → notify 未記録
  └── cloudBackupAll()           ← window.cloudBackupAll ではなくローカル関数 → sync 未記録
```

`window.saveState` / `window.cloudBackupAll` は app-legacy.js の
window エクスポートブロック（L11845付近）に記載がないため、
`captureRecordSaveDelegates` が `undefined` を取得し delegate が設定されない。

### 修正箇所（3か所）

#### 修正 A — saveState / cloudBackupAll を window にエクスポート
**行番号**: L11845 付近（グローバル変数エクスポートブロック）

### Before
```js
// ─── グローバル変数エクスポート ───────────────────────────────
if (typeof currentRecord !== "undefined") window.currentRecord = currentRecord;
if (typeof currentStep   !== "undefined") window.currentStep   = currentStep;
if (typeof STEPS         !== "undefined") window.STEPS         = STEPS;
```

### After
```js
// ─── グローバル変数エクスポート ───────────────────────────────
if (typeof currentRecord    !== "undefined") window.currentRecord    = currentRecord;
if (typeof currentStep      !== "undefined") window.currentStep      = currentStep;
if (typeof STEPS            !== "undefined") window.STEPS            = STEPS;
if (typeof saveState        === "function")  window.saveState        = saveState;
if (typeof cloudBackupAll   === "function")  window.cloudBackupAll   = cloudBackupAll;
```

---

#### 修正 B — saveRecordScreen: persist を saveState() 経由に変更
**行番号**: L9334–9341

### Before
```js
    // 保存を即座に実行
    try {
      localStorage.setItem('ippo_state', JSON.stringify(state));
    } catch(storageErr) {
      showAlertModal('記録の保存に失敗しました。端末のストレージ容量を確認してください。');
      console.error('Storage error:', storageErr);
      return;
    }
```

### After
```js
    // 保存を即座に実行（saveState 経由で persist delegate に記録させる）
    try {
      localStorage.setItem('ippo_state', JSON.stringify(state));
      if (typeof window.saveState === 'function') window.saveState();
    } catch(storageErr) {
      showAlertModal('記録の保存に失敗しました。端末のストレージ容量を確認してください。');
      console.error('Storage error:', storageErr);
      return;
    }
```

> **注意**: `localStorage.setItem` を先行させて保存を保証した上で、
> delegate 記録用に `window.saveState()` を追加コールする。
> `saveState()` は `localStorage.setItem('ippo_state', JSON.stringify(state))` と
> 同等の処理なので二重保存は無害。

---

#### 修正 C — saveRecordScreen: cloudBackupAll を window 経由で呼ぶ
**行番号**: L9374–9383

### Before
```js
    if(typeof cloudBackupAll === 'function'){
  cloudBackupAll().catch(function(e){
```

### After
```js
    var _cloudBackupFn = (typeof window.cloudBackupAll === 'function' ? window.cloudBackupAll : cloudBackupAll);
    if(typeof _cloudBackupFn === 'function'){
  _cloudBackupFn().catch(function(e){
```

> `window.cloudBackupAll` が delegate wrapper に差し替えられている場合はそちらを呼び
> sync フェーズを context に記録する。差し替えられていない場合は従来通り。

---

### 確認項目
- [ ] 保存成功後 `ippoVerifyLastRecordSave()` が `{ ok: true }` を返す
- [ ] `hasPersist: true`
- [ ] `hasSync: true`
- [ ] `hasNotify: true`
- [ ] `rejectedCount: 0`
- [ ] `warnings: []`

---

## P1-3: community_topics 401 stabilization

### 目的
起動時に `loadCommunityTopic()` が未認証状態で Supabase `community_topics` テーブルに
anon key でアクセスし 401 を返し続ける。コンソールにスパムが出て startup が汚れる。

### 根本原因
- `loadCommunityTopic()` が L7078 で無条件に呼ばれる
- `community_topics` テーブルに public read policy がないため anon key は 401
- `.catch` で `console.warn` を出すが、HTTP 401 自体はブラウザネットワークログに残る
- 複数画面遷移で繰り返し呼ばれる可能性がある

### 修正箇所
**ファイル**: `src/app-legacy.js`  
**行番号**: `loadCommunityTopic` 関数冒頭（L5744付近）

### Before
```js
function loadCommunityTopic(){
  fetch(SUPABASE_URL + '/rest/v1/community_topics?is_active=eq.true&order=created_at.desc&limit=1', {
    headers: {'apikey': SUPABASE_KEY}
  })
  .then(function(r){
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  ...
  .catch(function(e){
    console.warn('コミュニティトピック読込スキップ:', e.message);
    var qEl = document.getElementById('community-question');
    if(qEl) qEl.textContent = 'コミュニティ機能は準備中です 🌸';
  });
}
```

### After
```js
function loadCommunityTopic(){
  // 未認証時は 401 になるため、認証済みの場合のみリクエストを送る
  if (!supabaseUserId) {
    var qEl = document.getElementById('community-question');
    if(qEl) qEl.textContent = 'コミュニティ機能は準備中です。もうしばらくお待ちください 🌸';
    return;
  }
  fetch(SUPABASE_URL + '/rest/v1/community_topics?is_active=eq.true&order=created_at.desc&limit=1', {
    headers: {'apikey': SUPABASE_KEY}
  })
  .then(function(r){
    if(!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  })
  ...
  .catch(function(e){
    // silent fail — community_topics table policy not set
    var qEl = document.getElementById('community-question');
    if(qEl) qEl.textContent = 'コミュニティ機能は準備中です 🌸';
  });
}
```

### 確認項目
- [ ] 未認証状態で起動時に 401 エラーがコンソールに出ない
- [ ] startup 正常完了
- [ ] fatal console spam なし
- [ ] 認証済み時はコミュニティ機能が引き続き動作する

---

## REQUIRED TEST MATRIX

```
[ ] navbar record button
[ ] home CTA
[ ] quick CTA
[ ] modal open
[ ] save success
[ ] second save
[ ] calendar update（#calGrid + #calGridNew 両方）
[ ] reload restore
[ ] onboarding
[ ] no fatal console errors
[ ] no repeated 401
[ ] localStorage persistence
[ ] ippoVerifyLastRecordSave() === { ok: true }
```

---

## 変更ファイル一覧

| ファイル              | 修正数 | 種別              |
|-----------------------|--------|-------------------|
| src/app-legacy.js     | 5箇所  | bridge/guard追加  |

---

## 残リスク

| リスク | 内容 | 対策 |
|--------|------|------|
| window.state 上書き | 他コードが `window.state = ...` と直接代入した場合、getter が上書きされる | `configurable: true` にしてあるため再定義は可能。現時点で問題なし |
| saveState 二重呼び出し | persist 修正 B で `localStorage.setItem` + `window.saveState()` を両方呼ぶ | `saveState()` は同じ state を再度 localStorage に書くだけなので副作用なし |
| cloudBackupAll wrapper ない場合 | delegate wrapper が未設定の場合は従来通りローカル関数を呼ぶ | フォールバックで従来挙動を維持 |
| community auth タイミング | 認証完了後に `loadCommunityTopic` が再実行されなければコミュニティが空のまま | auth callback 内で `loadCommunityTopic()` を呼ぶ既存コードがある場合は問題なし |

---

## Rollback 方法

```bash
# このブランチの変更をすべて取り消す
git checkout src/app-legacy.js
```

各修正は独立した追加であるため、個別 revert も可能：
- P0-1: `Object.defineProperty` ブロックを削除
- P0-2: `STEPS = window.STEPS = buildSteps()` → `window.STEPS = buildSteps()` に戻す
- P1-1: `window.buildCalendarNext()` 行を削除
- P1-2 A: エクスポート 2行を削除
- P1-2 B: `window.saveState()` 呼び出し行を削除
- P1-2 C: `_cloudBackupFn` ブロックを元に戻す
- P1-3: `if (!supabaseUserId)` ガードと `console.warn` 復元

---

## 実装手順

1. P0-1 → P0-2 の順で `src/app-legacy.js` を修正
2. ブラウザで navbar 記録ボタン・home CTA・quick CTA を確認（P0 検証）
3. P1-1 修正 → 保存後カレンダー即時更新を確認
4. P1-2 修正（A→B→C の順）→ `ippoVerifyLastRecordSave()` で `ok: true` を確認
5. P1-3 修正 → 未ログイン状態で startup の 401 が出ないことを確認
6. TEST MATRIX を全項目チェック
7. commit → PR
