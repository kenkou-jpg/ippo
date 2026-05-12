# Save / Reload / Sync — 手動スモークチェックリスト

> 公開前・PR マージ前に手動で確認すべき保存・同期シナリオ。
> 自動テストが存在しないため、このチェックリストが代替となる。

## 前提条件

- アプリを GitHub Pages または `npm run preview` で起動
- Chrome と Safari (iOS) の両方で確認推奨
- DevTools Console を開いて `console.warn` を監視

---

## 1. 新規記録の作成

```
手順:
1. 「記録する」ボタンをタップ
2. 症状・気分・痛みレベルを入力
3. 「保存する」をタップ

確認項目:
□ 成功オーバーレイが表示される
□ ホーム画面の連続記録日数が +1 される（当日初回のみ）
□ カレンダーに今日のマークが表示される
□ インサイト画面の「記録日数」が増加している
□ DevTools: console.warn に auth 関連エラーがないこと
```

## 2. 同日の記録編集（上書き）

```
手順:
1. 記録作成後、再度「記録する」ボタンをタップ
   → 自動的に編集モードになること
2. 値を変更して「保存する」

確認項目:
□ 編集モード（rec-screen-title が「今日の記録を編集」になる）
□ 保存後に records 配列が重複していないこと
   (localStorage の ippo_state を JSON.parse で確認)
□ 連続記録日数が二重カウントされていないこと
```

## 3. 過去日の記録追加（カレンダーから）

```
手順:
1. カレンダーで記録のない過去日をタップ
2. 記録画面が開く（対象日付が表示される）
3. 保存する

確認項目:
□ 対象日の日付が画面上部に正しく表示される
□ state.streak が変化しないこと（過去日追加は streak に影響しない）
□ カレンダーに過去日のマークが追加される
□ 当日の streak がそのまま維持される
```

## 4. リロード後の復元

```
手順:
1. 記録を作成
2. ページをリロード（F5 / Cmd+R）

確認項目:
□ 記録データが消えていないこと
□ ホーム画面の連続日数・記録数が保持されている
□ 設定（名前・疾患設定）が維持されている
□ DevTools Application → LocalStorage: ippo_state に records が存在
```

## 5. クラウドバックアップ（ログイン時）

```
前提: Supabase に有効なセッションでログイン済み

手順:
1. 記録を保存
2. 設定 → 「データをバックアップ」（またはサインアウト後再サインイン）

確認項目:
□ syncStatusBrief に email が表示されている
□ console.log に 'Cloud backup完了' が出る
□ window.__ippoLastSyncStatus.result === 'success'
□ エラートーストが出ないこと
```

## 6. クラウドバックアップ スキップ確認（未ログイン時）

```
前提: ログアウト状態

手順:
1. 記録を保存（cloudBackupAll が呼ばれる）

確認項目:
□ エラートーストが出ないこと（silent skip で OK）
□ console.warn に '未ログイン：クラウドバックアップをスキップ' が出る
□ window.__ippoLastSyncStatus.result === 'skipped'
□ window.__ippoLastSyncStatus.reason が 'not-logged-in' または
  'sdk-session-null-stale-token' のどちらか
```

## 7. オフライン → 再接続

```
手順:
1. DevTools → Network → Offline に切り替え
2. 記録を保存
3. Offline を解除
4. 設定画面で「手動で復元」を実行（またはリロード）

確認項目:
□ オフライン中に保存エラーが出ないこと（localStorage には保存される）
□ 再接続後の cloudBackupAll が成功すること
□ データ減少バナーが出ないこと
```

## 8. 認証ミスマッチ検出

```
手順（再現は難しいが念のため確認）:
1. DevTools Console で実行:
   localStorage.setItem('ippo_sb_user_id', 'fake-id-xxxx')
2. ページリロード

確認項目:
□ checkPremiumStatus() 実行後に
  console.warn '[ippo auth] user-id mismatch' が出る
□ window.__ippoAuthMismatch に inlineId/sdkId が記録される
□ アプリがクラッシュしないこと（warning のみで続行）

確認後: DevTools で localStorage.removeItem('ippo_sb_user_id') して元に戻す
```

---

## クイックチェック用コンソールスニペット

```js
// 認証状態の確認
console.table({
  sdkSession: !!(await window.supabase?.auth.getSession()).data?.session,
  inlineToken: !!localStorage.getItem('ippo_sb_token'),
  inlineUserId: localStorage.getItem('ippo_sb_user_id'),
  isPremium: window.isPremium,
  lastSync: window.__ippoLastSyncStatus,
  authMismatch: window.__ippoAuthMismatch,
});

// 記録件数確認
console.log('records:', window.state?.records?.length, 'streak:', window.state?.streak);
```

---

## 既知の制限事項

- Supabase Key が未設定環境（ローカル `.env` なし）では cloudBackupAll は常にスキップ
- Stripe Price ID がプレースホルダーの間は決済ボタンは「準備中」toast のみ
- `initialCloudSync` は `ippo_records_synced` フラグが立つと再実行されない
  （フラグをクリアして再試行: `localStorage.removeItem('ippo_records_synced')`）
