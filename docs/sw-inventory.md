# Service Worker Inventory

_ippo – production reliability engineering_

---

## ファイル一覧

| ファイル | 状態 | 役割 |
|---|---|---|
| `public/sw.js` | ✅ **正規ソース** | 本番 SW の唯一の編集対象 |
| `sw.js` (root) | ⚠️ **削除予定ミラー** | dist deploy 移行前の旧配信用コピー |
| `service-worker.js` (root) | 🔒 **レガシー封じ込め** | 旧パス `/kenkou-kiroku/` の古い登録を無効化 |

---

## 各ファイルの詳細

### `public/sw.js` — 正規ソース

- **バージョン:** `v4`
- **Vite の扱い:** `publicDir: 'public'` により、ビルド時に `dist/sw.js` へコピーされる
- **本番配信パス:** `/sw.js`（dist deploy 後）
- **登録元:** `src/services/push.js` → `navigator.serviceWorker.register('/sw.js', { scope: '/' })`
- **更新手順:** このファイルの `CACHE_VERSION` を上げ → PR → main マージ → deploy

### `sw.js` (root) — 削除予定ミラー

- **バージョン:** `v4`（`public/sw.js` と同内容）
- **存在理由:** GitHub Pages が raw source tree を直接配信していた期間（PR #178 以前）に `/sw.js` として機能していた
- **現在の役割:** dist deploy 移行完了後は不要
- **削除タイミング:** PR #178 マージ → 本番で dist 配信を確認 → このファイルを削除する PR を出す
- **⚠️ 編集禁止:** 変更は `public/sw.js` に加えること

### `service-worker.js` (root) — レガシー封じ込め

- **旧バージョン:** `ippo-v1`（`/kenkou-kiroku/` サブパス時代）
- **現在の役割:** 旧 URL に古い登録が残っているユーザーの端末を安全に移行させる封じ込めワーカー
  - install → `skipWaiting()`（即座に有効化）
  - activate → 旧キャッシュ（`ippo-v`、`ippo-legacy-`、`kenkou-kiroku` 接頭辞）を全削除
  - fetch → `respondWith()` なし（現行 `/sw.js` に委譲）
- **削除タイミング:** 旧ユーザーの移行が完了したと判断できたら削除可能（消極的に保持でよい）

---

## 登録フロー

```
src/services/push.js
  └─ navigator.serviceWorker.register('/sw.js', { scope: '/' })
        │
        ├─ dist deploy (PR #178 以降): dist/sw.js ← public/sw.js
        └─ raw source (PR #178 以前):  root/sw.js  ← 旧ミラー
```

---

## 今後のアクション

1. **PR #178 マージ → 本番 dist 配信を確認**
2. `root/sw.js` を削除（PR を立てる）
3. `service-worker.js` は残存ユーザー移行の猶予期間を見て削除判断

---

_最終更新: 2026-05-12_
