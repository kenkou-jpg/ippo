# Supabase Backup / Restore Runbook

Operations Recovery Program PR-OPS-02。
対象: Supabase管理下のPostgreSQL（`profiles` / `records` / `user_data` / `user_records` /
`subscriptions` 他、[docs/HANDOFF_PHASE7_COMPLETE.md](../HANDOFF_PHASE7_COMPLETE.md) 記載の全テーブル）。

このRunbookは「DBを丸ごと失った・大規模に破壊した」レベルの障害を対象とする。
ユーザー個人のレコード欠損は別のセーフティネットで対応済み（本書末尾「関連する既存の仕組み」参照）。

---

## 1. 現状（要Founder確認）

Supabaseのバックアップ機能はプランTierに依存する。**以下はFounderが実際のプロジェクト設定
（Supabase Dashboard → Project Settings → Backups）で確認し、値を埋めること。**

| 項目 | 確認方法 | 現在値（要記入） |
|---|---|---|
| プランTier | Dashboard → Settings → Billing | `[ ] Free / [ ] Pro / [ ] Team` |
| 自動バックアップ | Dashboard → Database → Backups | `[ ] 有効 / [ ] 無効` |
| バックアップ保持期間 | 同上（Freeは対象外、Proは7日、Team以上は要確認） | `___日間` |
| Point-in-Time Recovery (PITR) | 同上（Pro以上でアドオン） | `[ ] 有効 / [ ] 無効` |

**Free tierの場合、Supabase側の自動バックアップは提供されない。** その場合は本書 3章の
手動バックアップ（pg_dump）を定期実行することが唯一のDB保護手段になる。

---

## 2. RPO / RTO 目標（提案値、Founder承認待ち）

現状これらの目標値が一切定義されていなかった（Operations Council Report指摘）。以下を暫定目標として提案する。

| 指標 | 提案値 | 理由 |
|---|---|---|
| RPO（Recovery Point Objective、許容データ損失） | 24時間 | ユーザー数0〜少数の段階では日次バックアップで十分。Supabase PITR未導入なら手動日次dumpで達成 |
| RTO（Recovery Time Objective、復旧所要時間） | 4時間 | Founder単独運用のため、深夜帯の障害は翌朝対応を許容する現実的な値 |

ユーザー数が増加した場合はPITR導入（RPO短縮）とRunbook演習頻度の引き上げを再検討すること。

---

## 3. 手動バックアップ（pg_dump、プランTierに依存しない）

既存のGitHub Secrets（`SUPABASE_DB_URL`、[.github/workflows/deploy-supabase.yml](../../.github/workflows/deploy-supabase.yml)で使用中のものと同一）を流用できる。

### 3-A. ローカルから手動実行

```bash
# Supabase CLI がインストール済みであること（deploy-supabase.ymlと同じCLI）
supabase db dump --db-url "$SUPABASE_DB_URL" -f backup_$(date +%Y%m%d_%H%M%S).sql

# データのみ（スキーマ除く）が必要な場合
supabase db dump --db-url "$SUPABASE_DB_URL" --data-only -f backup_data_$(date +%Y%m%d_%H%M%S).sql
```

生成された`.sql`ファイルは**リポジトリにコミットしない**（個人情報を含むため）。
Founder個人のセキュアなストレージ（暗号化された外部ドライブ・パスワード付きクラウドストレージ等）に保管する。

### 3-B. 自動化する場合（推奨・未実施）

GitHub Actions の scheduled workflow で3-Aのコマンドを実行し、暗号化した上で
Founder管理の外部ストレージ（S3等、リポジトリ外）へ転送する構成が理想だが、
**保管先の秘密鍵管理が新たな責務になるため、本Recovery Programでは実装しない
（Founder Action — 保管先を決定した上で別途PRを起票）。**
当面は3-Aの手動実行を月次で行うことを必須運用とする（4章参照）。

---

## 4. 定期チェックリスト（Founder運用タスク）

- [ ] **月次**: 3-Aの手動pg_dumpを実行し、ファイルサイズが前回から極端に増減していないか確認
- [ ] **四半期**: 5章のリストアドリルを実施（ステージング環境 or ローカルPostgreSQLで検証）
- [ ] **四半期**: 1章の表を再確認し、プランTier変更の有無をチェック

---

## 5. リストアドリル手順（四半期実施）

**本番環境に対して直接実行しないこと。** ローカルまたはステージング用の別Supabaseプロジェクト /
ローカルPostgreSQLに対して実施する。

```bash
# 1. ローカルにテスト用DBを用意（例: Docker Postgres、または新規Supabaseプロジェクト）
# 2. バックアップファイルからリストア
psql "$TEST_DB_URL" -f backup_YYYYMMDD_HHMMSS.sql

# 3. 主要テーブルの件数・整合性を確認
psql "$TEST_DB_URL" -c "SELECT count(*) FROM records;"
psql "$TEST_DB_URL" -c "SELECT count(*) FROM user_data;"
psql "$TEST_DB_URL" -c "SELECT count(*) FROM profiles;"

# 4. RLSポリシーが復元されていることを確認（supabase/migrations/20260001_rls_setup.sql 内容と突合）
psql "$TEST_DB_URL" -c "SELECT tablename, policyname FROM pg_policies;"
```

ドリル結果（成功/失敗・所要時間・気づいた問題点）は本書末尾「ドリル実施記録」に追記する。

---

## 6. 本番復旧手順（実際にDB障害が発生した場合）

1. **状況確認**: Supabase Dashboard → Database → 稼働状況、Status Page（status.supabase.com）を確認
2. **Supabaseマネージドバックアップがある場合**: Dashboard → Database → Backups からPITR/スナップショットの復元をリクエスト（Supabaseサポートへの連絡が必要な場合あり）
3. **マネージドバックアップがない/失敗した場合**: 直近の手動pg_dumpファイルから5章の手順でリストア用DBを作成し、内容確認後に本番へ反映
4. **反映後**: `npx vitest run` でRegressionを実行し、アプリケーション層からの疎通を確認
5. **記録**: 発生日時・原因・復旧までの所要時間・RPO/RTO目標との比較を本書末尾に追記

---

## 7. 関連する既存の仕組み（本書の対象外・参考）

以下はユーザー個人単位のデータ欠損に対する既存のセーフティネットであり、
DB全体の障害・破壊に対する代替にはならないが、日常的なデータ保護として機能している。

- `src/services/recovery.js` の `autoRecoveryCheck()` — ローカルレコード件数の急減を検知しIndexedDB/クラウドから自動復元
- `src/services/recovery.js` の `manualCloudRestore()` — ユーザー自身による「クラウドから復元」操作
- `src/services/supabase.js` の `cloudBackupAll()` — レコード保存時のクラウド同期（空データでの上書きを防ぐガード付き）

---

## ドリル実施記録

| 日付 | 実施者 | 結果 | 所要時間 | 気づいた問題点 |
|---|---|---|---|---|
| _（未実施）_ | | | | |
