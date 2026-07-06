# Operations Runbook — 障害対応・デプロイ・ロールバック

Operations Recovery Program PR-OPS-04。Founder単独運用を前提としたRunbook。

前提となる現在のCI/CD構成（本Runbookの正確性の根拠）:

| Workflow | トリガー | 役割 |
|---|---|---|
| [.github/workflows/build.yml](../../.github/workflows/build.yml) | push（main / ippo-dev）+ 手動（PR-OPS-04で追加） | テスト → Vite build → **GitHub Pagesへ本番デプロイ**（mainのみ） |
| [.github/workflows/ci.yml](../../.github/workflows/ci.yml) | push（main / claude/** / feature/**）+ PR | テスト + PRのみビルド検証（デプロイはしない） |
| [.github/workflows/deploy-supabase.yml](../../.github/workflows/deploy-supabase.yml) | push（supabase/functions・migrations変更時）+ 手動 | DBマイグレーション + Edge Functionsデプロイ + Secrets同期 |
| [.github/workflows/cluster-batch-schedule.yml](../../.github/workflows/cluster-batch-schedule.yml) | 週次スケジュール + 手動（PR-OPS-03） | cluster-batch Edge Functionの定期実行 |

---

## 1. 障害対応（Incident Response）

### 1-A. 検知手段（現状）

| 手段 | 対象 | 導入状況 |
|---|---|---|
| Sentry | Client実行時エラー・Edge Function error ログ | PR-OPS-01で導入（DSN設定後に有効化、[SENTRY_SETUP.md](SENTRY_SETUP.md)参照） |
| GitHub Actions失敗通知 | CI/デプロイ/cluster-batch実行失敗 | 標準機能（GitHubアカウントのメール通知設定に依存、要Founder確認） |
| Supabase Status Page | Supabase基盤障害 | https://status.supabase.com を手動確認 |
| ユーザー報告 | UI不具合・データ不整合 | 受け皿（問い合わせ先）が未整備 — 4章参照 |

### 1-B. 重大度分類

| 分類 | 定義 | 対応目安 |
|---|---|---|
| P1 | 保存・同期・認証など核心機能が停止、または複数ユーザーのデータ損失リスク | 即時対応（[BACKUP_RESTORE_RUNBOOK.md](BACKUP_RESTORE_RUNBOOK.md) RTO 4h目標） |
| P2 | 一部機能停止（Community/Admin/Report等）、回避策あり | 当日〜翌営業日 |
| P3 | 表示崩れ・軽微なバグ、機能への実害なし | 通常のPRサイクルで対応 |

### 1-C. 初動手順

1. **検知元を確認** — Sentry Issue詳細 / GitHub Actions失敗ログ / Supabase Status Page のいずれで気づいたか記録
2. **影響範囲の切り分け**:
   - Client側か Edge Function側か（Sentry Projectが `ippo-client` / `ippo-edge-functions` のどちらでIssueが出たか）
   - 直近のデプロイと時間的に相関するか（`git log --oneline -10` と発生時刻を突合）
3. **一次切り分け**:
   - 直近デプロイ起因が濃厚 → 2章「ロールバック」へ
   - Supabase基盤側の障害 → Status Pageの復旧を待つ、または[BACKUP_RESTORE_RUNBOOK.md](BACKUP_RESTORE_RUNBOOK.md) 6章
   - 外部サービス（Stripe/Anthropic）起因 → 該当サービスのStatus Pageを確認
4. **記録** — 本書末尾「インシデント記録」に発生日時・症状・原因・対応・所要時間を追記

### 1-D. 外部エスカレーション先

| サービス | 問い合わせ先 |
|---|---|
| Supabase | https://supabase.com/dashboard/support（プロジェクト設定から） |
| Stripe | https://support.stripe.com |
| Anthropic API | https://support.anthropic.com |
| GitHub Actions | https://www.githubstatus.com |

### 1-E. ユーザー問い合わせ受け皿（未整備・Founder Action）

現状、ユーザーからの障害報告を受け付ける専用チャネル（問い合わせフォーム・サポートメール等）が
存在しない。β運用開始前にFounderが決定・整備すること（本Programのスコープ外、Founder Action）。

---

## 2. デプロイ（Deploy）

### 2-A. 通常デプロイフロー

1. `main` へのマージ（PRマージ or 直接push）
2. `build.yml` が自動起動: `npm test` → `npm run build` → GitHub Pagesへ公開
3. `supabase/functions/**` または `supabase/migrations/**` に変更が含まれる場合、`deploy-supabase.yml` も自動起動:
   - DBマイグレーション適用（`supabase db push`）
   - Edge Functions再デプロイ（ai-analyze / stripe-checkout / stripe-webhook / report-generate / cluster-batch）
   - Secrets同期（Stripe / Anthropic / Sentry / Service Role Key）

### 2-B. デプロイ前チェックリスト

- [ ] `npm test` がローカルでPASS（既知39件failのみであること — 新規failがないこと）
- [ ] `npm run build` がPASS
- [ ] `supabase/migrations/` に新規ファイルがある場合、破壊的変更（DROP/ALTER型変更等）がないか確認。ある場合は事前に[BACKUP_RESTORE_RUNBOOK.md](BACKUP_RESTORE_RUNBOOK.md) 3章の手動バックアップを実施
- [ ] RLSポリシーに関わる変更は `supabase/migrations/20260001_rls_setup.sql` 等の既存ポリシーと矛盾しないか確認

### 2-C. Supabase側の手動デプロイ（緊急時・migrate/functionsを個別制御したい場合）

`deploy-supabase.yml` は `workflow_dispatch` に対応済み。GitHub UIの Actions タブから
`Deploy Supabase` を選択 → `Run workflow` → `run_migrations` / `deploy_functions` を
個別にON/OFFして実行できる。

```bash
# gh CLI を使う場合
gh workflow run deploy-supabase.yml -f run_migrations=true -f deploy_functions=false
```

---

## 3. ロールバック（Rollback）

### 3-A. Client（GitHub Pagesデプロイ）のロールバック

GitHub Pagesは「1つ前のバージョンに戻す」ボタンを持たない（常に最新の`build.yml`実行結果を
配信する）。ロールバックは以下のいずれかで行う。

**方法1: git revert（推奨・履歴に残る）**

```bash
git revert -m 1 <問題のマージコミットSHA>
git push origin main
# → build.yml が自動起動し、revert後の状態で再デプロイされる
```

**方法2: 特定のコミットから手動再デプロイ（緊急time-to-recovery優先時）**

```bash
gh workflow run build.yml --ref <正常だった時点のSHA or タグ>
# PR-OPS-04でbuild.ymlにworkflow_dispatchを追加済みのため実行可能
```

方法2は履歴上「最新」が古いコミットになるだけで、mainブランチの実体は変わらない
（次に誰かがmainへpushすると問題のコードが復活する）ため、**必ず事後に方法1のrevertも実施すること**。

### 3-B. Supabase Edge Functionsのロールバック

Edge Functionsは`deploy-supabase.yml`が`supabase/functions/**`の変更を検知して自動デプロイする。
ロールバックは3-Aの方法1（git revert）と同じ要領で行う — revert commitをpushすれば
`deploy-supabase.yml`が起動し、以前のコードで関数が再デプロイされる。

個別の関数だけを緊急に戻したい場合:

```bash
git show <正常だった時点のSHA>:supabase/functions/<function-name>/index.ts > /tmp/rollback.ts
cp /tmp/rollback.ts supabase/functions/<function-name>/index.ts
git add supabase/functions/<function-name>/index.ts
git commit -m "hotfix: rollback <function-name> to <SHA>"
git push origin main
```

### 3-C. DBマイグレーションのロールバック

**Supabase CLIの`db push`は前方適用のみで、自動的な down-migration機構を持たない。**
マイグレーションのロールバックは以下のいずれかで対応する。

1. **軽微な変更**（カラム追加等）— 打ち消す新規マイグレーションを追加する:
   ```sql
   -- supabase/migrations/20260091_rollback_xxx.sql
   ALTER TABLE xxx DROP COLUMN yyy;
   ```
2. **破壊的変更・データ損失を伴う場合** — [BACKUP_RESTORE_RUNBOOK.md](BACKUP_RESTORE_RUNBOOK.md)
   に従い直近のバックアップからリストアする。これが必要になるレベルの変更は、
   本来2-Bのデプロイ前チェックリストで事前にバックアップを取得しておくべき変更である。

### 3-D. 関連する既存の限定的ロールバック手順（参考）

[docs/LEGACY_REMOVAL_PLAN.md](../LEGACY_REMOVAL_PLAN.md) 9章に、PR-089（Batch-11、
app.html全onclick置換）専用のL1〜L3ロールバック手順が定義されている。本書はその汎用版であり、
PR-089実行時は同文書の手順が本書より優先される。

---

## インシデント記録

| 発生日時 | 症状 | 原因 | 対応 | 所要時間 | 分類 |
|---|---|---|---|---|---|
| _（未発生）_ | | | | | |
