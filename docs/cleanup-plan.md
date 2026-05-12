# Codebase クリーンアップ計画

> Phase 3 実行計画。原則: 1PR = 1責務 = 1〜3ファイルまで。削除前に必ずビルド・起動・保存確認。

## 方針

- **削除は一括禁止**
- 各 PR で必ず: startup / render / save / sync / rollback を記録
- REQUIRED 分類のファイルは削除しない
- OBSERVE-ONLY は価値があるので急がない
- MINIFIED-STUB → REHEARSAL → CANDIDATE（遅延ロード系）の順に進める

---

## Wave 1: MINIFIED-STUB 削除（最安全・最優先）

17ファイル、推定 430 行削減。デフォルト disabled のため本番に影響なし。

### PR 1-A（3ファイル）

```
削除候補:
  src/modules/app-html-hydration-render-slimming-runtime.js  (10行)
  src/modules/app-html-startup-slimming-runtime.js           (10行)
  src/modules/final-app-shell-cleanup-runtime.js             (10行)

確認事項:
  □ src/main.js のインポートリストから削除
  □ npx vite build 成功
  □ アプリ起動確認
  □ 記録保存確認

rollback: git revert
```

### PR 1-B（3ファイル）

```
削除候補:
  src/modules/guarded-render-screen-adoption.js              (10行)
  src/modules/guarded-startup-hydration-adoption.js          (10行)
  src/modules/legacy-window-bridge-reduction-runtime.js      (10行)

同上確認
```

### PR 1-C（3ファイル）

```
削除候補:
  src/modules/render-activation-rehearsal-runtime.js         (11行)
  src/modules/render-candidate-runtime.js                    (10行)
  src/modules/render-screen-guarded-execution.js             (10行)

同上確認
```

### PR 1-D（3ファイル）

```
削除候補:
  src/modules/screen-activation-candidate-runtime.js         (10行)
  src/modules/screen-activation-extraction-planning-runtime.js (10行)
  src/modules/screen-activation-rehearsal-runtime.js         (10行)

同上確認
```

### PR 1-E（3ファイル）

```
削除候補:
  src/modules/service-boundary-cleanup-runtime.js            (10行)
  src/modules/startup-hydration-guarded-execution.js         (10行)
  src/modules/state-store-ownership-cleanup-runtime.js       (10行)

同上確認
```

### PR 1-F（2ファイル）

```
削除候補:
  src/modules/final-compatibility-cleanup-runtime.js         (64行)
  src/modules/startup-ownership-extraction-planning-runtime.js (227行)

※ 後者は行数が多いため単独または2ファイルまで

同上確認
```

---

## Wave 2: REHEARSAL 削除

5ファイル、推定 1,160 行削減。ドライラン・シャドウコピー。

### PR 2-A（2ファイル）

```
削除候補:
  src/modules/hydration-activation-rehearsal-runtime.js      (228行)
  src/modules/startup-extraction-activation-rehearsal-runtime.js (227行)

確認事項:
  □ src/main.js またはダイナミックインポートリストから除外
  □ npx vite build 成功
  □ 起動・記録・カレンダーの3点確認

rollback: git revert
```

### PR 2-B（2ファイル）

```
削除候補:
  src/modules/startup-extraction-ownership-activation-rehearsal-runtime.js (234行)
  src/modules/startup-extraction-ownership-candidate-runtime.js             (228行)

同上確認
```

### PR 2-C（1ファイル）

```
削除候補:
  src/modules/limited-startup-extraction-rehearsal.js  (242行)

※ このファイルは main.js lane 3 でロードされる。lane からの除外が必要。
確認: lane 3 の他のランタイムが独立して動作すること

同上確認
```

---

## Wave 3: CANDIDATE（遅延ロード系）削除評価

各ファイルについて **個別に評価**してから削除。  
以下はリスト。実際の削除は module-inventory.md の確認後、1PRずつ。

| ファイル | lane | 確認ポイント |
|---------|------|------------|
| `persistence-candidate-execution.js` | lane 2 | persistence レイヤーへの影響なし確認 |
| `startup-extraction-candidate-shell.js` | lane 3 | 起動シーケンスへの影響なし確認 |
| `startup-extraction-adoption-candidate-runtime.js` | lane 3 | 同上 |
| `startup-extraction-activation-candidate-runtime.js` | lane 3 | 同上 |
| `hydration-candidate-runtime.js` | lane 2 | hydration フローへの影響なし確認 |
| `record-date-limited-adoption-candidate.js` | lane 4 | record 日付ブランチへの影響なし確認 |
| `record-date-draft-candidate.js` | lane 4 | 同上 |

> ⚠️ Candidate の削除は Wave 1・2 が完了してから着手する。

---

## app.html 内の安全分離候補

以下は `app.html` から `src/utils/` に切り出せる純粋関数候補。  
詳細は `docs/app-logic-extraction-proposal.md` を参照。

| 候補 | 移植先 | 行数概算 |
|-----|--------|---------|
| 日付フォーマット関数 | `src/utils/format.js` | ~50行 |
| 生理周期計算 | `src/utils/cycle.js` | ~80行 |
| 痛みスコア集計 | `src/utils/pain.js` | ~60行 |

**条件**: DOM アクセスなし / state 書き込みなし / 純粋関数のみ

---

## 削除前チェックリスト（全 PR 共通）

```
[ ] ファイルが src/main.js の静的インポートにないことを確認
[ ] ファイルがダイナミックインポートリストにある場合はリストから除外
[ ] npx vite build 成功（エラーなし）
[ ] ローカルでアプリを起動（npm run dev or preview）
[ ] ホーム画面が表示される
[ ] 記録を保存できる
[ ] カレンダーに記録が表示される
[ ] console.error がないこと（console.warn は許容）
[ ] PR に: startup影響/render影響/save影響/rollback手順 を記載
```

---

## 進行状況トラッキング

| Wave | 状態 | PR数 | 削減行数 |
|------|------|-----|---------|
| Wave 1: MINIFIED-STUB | ⏳ 未着手 | 6 | ~430行 |
| Wave 2: REHEARSAL | ⏳ 未着手 | 3 | ~1,160行 |
| Wave 3: CANDIDATE | ⏳ 未着手 | 7+ | ~3,500行 |
| utils 切り出し | ⏳ 未着手 | 3 | ~190行 |
