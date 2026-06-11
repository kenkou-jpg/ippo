# Guard Decommission Plan

> **方針**: guard は即削除しない。責務を基盤へ吸収した後にのみ削除する。
> 削除の根拠は「新構造で再発不可であること」をテストで証明すること。
>
> 最終更新: 2026-06-11

---

## 分析対象 Guard 一覧

| ファイル | 行数 | 層 | 削除方針 |
|---|---|---|---|
| `src/modules/record-draft-guard.js` | 237 | UX | **削除しない** |
| `src/runtime/startup-validator.js` | 77 | Runtime | 低優先度・維持 |
| `src/runtime/hydration-guard.js` | 84 | Runtime | 低優先度・維持 |
| `src/modules/record-freshness-guard.js` | 351 | Module | 中優先度 |
| `src/runtime/save-transaction-guard.js` | 79 | Runtime | 中優先度 |
| `src/runtime/state-integrity-guard.js` | 93 | Runtime | 中優先度 |
| `src/modules/record-edit-save-identity-guard.js` | 375 | Module | 高優先度 |

---

## Guard 別詳細

### record-draft-guard.js — 削除しない

**存在理由**: 記録入力途中のページ離脱からデータを保護する UX 層の機能。

**防いでいる障害**: 保存ボタン押下前のページ離脱による入力データ消失。

**削除判断**: **削除しない**。この機能は基盤層への吸収対象ではなく、UX 保護として独立維持する。

---

### startup-validator.js — 低優先度・維持

**存在理由**: 起動フェーズの重複実行（duplicate init / hydration / render）を検知・警告する。

**防いでいる障害**: 起動シーケンスの二重実行による不定動作。

**吸収先**: `runtime-orchestrator.js` が phase tracking を内包する形に拡張する。

**削除条件**:
- [ ] `runtime-orchestrator.js` に phase tracking が実装された後
- [ ] テストで「各 startup フェーズが 1 回のみ実行されること」を証明した後

---

### hydration-guard.js — 低優先度・維持

**存在理由**: cloud restore / IDB restore が stale なデータでローカル state を上書きしないよう保護する。

**防いでいる障害**: タイムスタンプが古い・records 件数が少ない cloud データによる上書き。

**吸収先**: SyncService (supabase.js) の cloudRestore() に内包する。現在は cloudRestore 呼び出し側が `checkHydration` を opt-in で呼ぶ形。

**削除条件**:
- [ ] SyncService が全 hydration 経路で自動的に stale チェックを行うようになった後
- [ ] テストで「stale cloud データが local state を上書きしないこと」を証明した後

---

### record-freshness-guard.js — 中優先度

**存在理由**: stale overwrite（古いデータによる上書き）を offline/online イベント時に検出・修復する。

**防いでいる障害**: online 復帰時の cloud sync による stale 上書き。

**吸収先**: SyncService の cloudRestore() + hydration-guard.checkHydration() で完全に置換可能。

**削除条件**:
- [ ] hydration-guard が offline/online イベント時のケースをカバーするようになった後
- [ ] SyncService が online 復帰時の同期前に freshness チェックを行うようになった後
- [ ] テストで「offline → online 復帰時に stale 上書きが発生しないこと」を証明した後

---

### save-transaction-guard.js — 中優先度

**存在理由**: saveState() 後に localStorage の records 件数を検証し、保存失敗を検知する。

**防いでいる障害**: saveState() のサイレント失敗（書き込みは成功するが件数が減少するケース）。

**吸収先**: `RecordRepository.persistRecords()` に post-save 整合性チェックを組み込む。

**削除条件**:
- [ ] app-legacy.js 削除（Phase 4-D）完了後
- [ ] RecordRepository が全保存経路の窓口になった後
- [ ] persistRecords() が post-save 件数検証を内包するようになった後
- [ ] テストで「保存後に records 件数が維持されること」を証明した後

---

### state-integrity-guard.js — 中優先度

**存在理由**: setState() 時に records が 3 件以上かつ 50% 未満に減少した場合に setState をブロックし、自動ロールバックを発動する。

**防いでいる障害**: 誤った setState による大量レコード消失・cloud sync による空 state 上書き。

**吸収先**: `RecordRepository.persistRecords()` に「records 大幅減少の事前バリデーション」を組み込む。

**削除条件**:
- [ ] app-legacy.js 削除（Phase 4-D）完了後
- [ ] RecordRepository が全 records 書き込みを制御するようになった後
- [ ] persistRecords() が書き込み前バリデーションを内包するようになった後
- [ ] テストで「50% 以上の records 減少が拒否されること」を証明した後

---

### record-edit-save-identity-guard.js — 高優先度

**存在理由**: 編集保存時に UI フォームの空値・デフォルト値で既存レコードを上書きしないよう保護する。保存後の同一日付レコード重複を統合する。

**防いでいる障害**:
- `buildDraftFromUI()` が返す rating=3, score=5 などのデフォルト値による既存値上書き
- 保存後の同一日付レコード重複作成

**吸収先**:
- merge ロジック → `record-upsert.js:mergeRecordPreservingExisting()` が既に同等のロジックを持つ
- 重複排除ロジック → `RecordRepository.persistRecords()` に upsert 時重複チェックを組み込む

**削除条件**:
- [ ] `buildDraftFromUI()` が既存値を保護する形に修正された後（または廃止後）
- [ ] RecordRepository の persistRecords() が「既存値保護付き upsert」を提供するようになった後
- [ ] テストで「編集保存時に既存値が消えないこと」を証明した後
- [ ] テストで「保存後に同一日付レコードが重複しないこと」を証明した後

---

## 削除実施ロードマップ

```
Phase 4-D (app-legacy.js 削除)
  └─ save-transaction-guard 吸収開始
  └─ state-integrity-guard 吸収開始

Phase 5 (Guard 責務吸収)
  └─ record-edit-save-identity-guard → record-upsert + RecordRepository に吸収 [高優先度]
  └─ record-freshness-guard → SyncService + hydration-guard に吸収 [中優先度]
  └─ save-transaction-guard → RecordRepository に吸収 [Phase 4-D 後]
  └─ state-integrity-guard → RecordRepository に吸収 [Phase 4-D 後]

Post Phase 5
  └─ startup-validator → runtime-orchestrator に統合 [低優先度]
  └─ hydration-guard → SyncService に統合 [低優先度]
  └─ record-draft-guard → 削除しない
```

---

## 参照

- ADR-005: Guard 責務吸収・廃止判断
- ADR-006: Save Domain Boundary 判断
- ADR-007: Sync Architecture 判断
