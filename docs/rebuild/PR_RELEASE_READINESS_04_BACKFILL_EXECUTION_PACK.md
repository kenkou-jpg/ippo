# PR-RELEASE-READINESS-04: PR-REC-06c Backfill 実行準備資料

コード変更なし（ドキュメント整理のみ）。対象スクリプト:
`scripts/backfill-normalized-records.ts`（実装完了済み・未実行）。
SSOT: `docs/rebuild/PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 7節（PR-REC-06c）。

**本PRはデータ変更を一切行わない。** Backfillの実行（Dry RunおよびApply
いずれも）はFounderが行う。AI環境には`SUPABASE_URL`/
`SUPABASE_SERVICE_ROLE_KEY`が存在しないため、技術的に実行不可
（`docs/rebuild/PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 7節に既出）。

---

## 1. 背景（再掲）

`user_records`テーブル（JSONBブロブ）は現在も唯一のRead Source（Shadow Write
方針、Founder Decision 2026-07-12）。PR-REC-06a以降の新規Recordは正規化
テーブル（`records`/`record_symptoms`/`record_factors`）へもDual-Write
されているが、**Dual-Write開始前の過去Recordは正規化テーブルに存在しない**。
本スクリプトはその過去分を正規化テーブルへ反映する一度限りの補完処理。

Shadow Write方針は本Backfill後も変更しない。`user_records`が引き続き
唯一の読取り元・復旧元である（正規化テーブルは将来のRead Source切替に
備えた並行整備という位置づけ）。

---

## 2. 実行前チェック（Founderが実行直前に確認）

```
□ Migration 20260093（列追加）が本番Supabaseに適用済みか
□ Migration 20260094（UNIQUE(user_id, record_date)制約）が適用済みか
□ Migration 20260095（upsert_record_with_children RPC）が適用済みか
  → 未適用の場合、実書込み（--apply）時は該当行が failed:database として
    行単位でスキップされる（全体は止まらない）。Dry Runには影響しない
□ SUPABASE_SERVICE_ROLE_KEY を手元で用意しているか（anon keyでは他ユーザーの
  行を読めないため、Service Role Keyが必須）
□ 実行環境が本番Supabaseプロジェクトに向いているか（SUPABASE_URLの値を
  実行直前に目視確認する。誤った環境に向けて実行しないための最終確認）
□ 実行前の正規化テーブル件数を記録しておく（3節「件数確認」参照、
  Before/After比較に使う）
```

---

## 3. 実行手順

### 3-1. Dry Run（必須、最初に必ず実施）

```bash
SUPABASE_URL=<本番URL> SUPABASE_SERVICE_ROLE_KEY=<Service Role Key> \
  npx tsx scripts/backfill-normalized-records.ts
```

`--apply`を付けない場合は自動的にDry Runになる（スクリプト側のデフォルト）。
Dry Runは`validateDraft()`のみを実行する純粋関数チェックであり、
DB・ネットワークへの書込みは一切発生しない（`processRow()`が`apply=false`
の場合、バリデーション成功時点で`succeeded`と判定して書込み処理へ進まない
実装になっている）。

**出力例**（Console/標準出力に出る）:
```
[backfill] <N> user_records rows found. mode=DRY-RUN
[backfill] skipped user_id=... record_date=...: missing data/record_date
[backfill] skipped user_id=... record_date=...: validation failed: ...
[backfill] done. total=<N> succeeded=<N> skipped=<N> failed=0 mode=DRY-RUN
```

Dry Run時は`failed`は理論上発生しない（DB書込みを試みないため）。
`failed`が1件でも出た場合はスクリプト側の想定外挙動のため、実行を止めて
AIへ報告する。

### 3-2. 出力確認（Dry Run結果の判定）

```
□ total件数が想定と大きく乖離していないか（想定: user_recordsの全行数と
  一致するはず。Supabase側で `select count(*) from user_records` を
  別途実行して突き合わせる）
□ succeeded件数が妥当か（大半のRecordがここに入るはず）
□ skipped件数・理由を確認:
   - "missing data/record_date" → 元データが不完全な行。件数が多い場合は
     データ品質側の問題の可能性があるため、件数と理由の内訳をAIへ共有
   - "validation failed: ..." → 現行の正規化スキーマのバリデーションを
     通らない古いデータ形式。エラー内容を記録し、想定範囲内かAIと確認
□ failed件数が0件であることを確認（Dry Runでは理論上0のはず）
```

**成功条件**: `failed=0` かつ `skipped`の内容がすべて「想定内」
（上記2パターンのいずれか、かつ件数が全体の一部にとどまる）。

**失敗条件**（この場合は本実行に進まず停止してAIへ報告）:
```
□ failed件数が1件以上
□ skipped件数が全体の大部分（目安: 過半数）を占める
□ total件数がSupabase側の実件数と大きく異なる（ページング処理の不具合の
  可能性）
□ スクリプトが例外で異常終了した（"[backfill] fatal error:" が出力される）
```

### 3-3. 本実行（`--apply`）

Dry Runの結果が成功条件を満たした場合のみ実施する。

```bash
SUPABASE_URL=<本番URL> SUPABASE_SERVICE_ROLE_KEY=<Service Role Key> \
  npx tsx scripts/backfill-normalized-records.ts --apply
```

本実行時は`succeeded`の行について実際に
`createRecord()`→`SupabaseRecordRepository.upsert()`
（`upsert_record_with_children` RPC経由）でDB書込みが発生する。
`skipped`判定はDry Runと同じ基準（`validateDraft()`）で行われるため、
Dry Runでskippedだった行は本実行でも同じ理由でskippedになる
（Dry Runの出力とほぼ一致するはずで、差異があれば要調査）。

### 3-4. 本実行後の確認

```
□ 出力サマリー（total/succeeded/skipped/failed）をDry Runの結果と比較し、
  succeeded/skipped件数がほぼ一致することを確認（totalは同じはず）
□ failed件数を確認。1件以上ある場合は該当user_id/record_dateと理由
  （Console出力の "[backfill] failed ..." 行）を記録
```

---

## 4. 件数確認・差分確認（本実行後）

```
□ 正規化テーブル側の件数を確認:
  select count(*) from records;
□ 実行前に記録した件数（2節）と比較し、増分がsucceeded件数と整合するか
  確認（Dual-Write済みの既存行にはBackfillでのupsertが「上書き」として
  作用するため、単純な加算にはならない点に注意。増分 ≦ succeeded件数が
  目安）
□ サンプル抽出で内容を確認（任意、推奨）:
  legacy側 user_records の任意の1行と、正規化テーブル側の対応行
  （records + record_symptoms + record_factors）を突き合わせ、
  症状・行動タグが正しく変換されているか目視確認
```

---

## 5. ログ確認

```
□ 標準出力に出た "[backfill] skipped ..." / "[backfill] failed ..." 行を
  すべて保存しておく（テキストファイルへのリダイレクト推奨:
  `... --apply > backfill-log.txt 2>&1`）
□ failed行がある場合、理由（Console出力の理由文字列）を記録。
  Migration未適用が理由であれば、該当Migrationの適用状態を再確認した上で
  再実行を検討（本スクリプトは冪等なため、再実行しても既存行への
  影響はない）
```

---

## 6. ロールバック

```
本スクリプトはlegacy user_records には一切書き込まない（読み取りのみ）。
そのためRead Source（既存アプリの表示・復旧経路）への影響はゼロ。

誤実行時のロールバック手順:
  1. 正規化テーブル側で、本Backfillにより追加・更新された行を特定する
     （実行前に記録した件数・タイムスタンプ列があればそれを使う。
     upsert_record_with_children RPCで作成された行は record_date が
     user_records の対象行と一致するため、user_id + record_date の
     組で特定可能）
  2. 該当行を records / record_symptoms / record_factors から手動削除する
  3. 削除後、5節の件数確認を再実施し、Backfill実行前の件数に戻っている
     ことを確認する

冪等性により、誤って複数回 --apply を実行しても実害はない（同一
user_id + record_date の行はupsertされるのみで重複行は作られない）。
ロールバックが必要になるのは「Backfill自体を取り消したい」場合のみ。
```

---

## 7. Founder承認ポイント

```
承認ポイント1: Dry Run実行前
  → 2節「実行前チェック」全項目の確認（特にMigration適用状況とKey管理）

承認ポイント2: Dry Run → 本実行への移行
  → 3-2節「成功条件」を満たしていることの確認。満たさない場合はAIへ
    報告し、本実行に進まない

承認ポイント3: 本実行後のクローズ
  → 4節「件数確認・差分確認」で正規化テーブル側の整合性を確認した後、
    本HANDOFFおよび`PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 8節
    「RCチェックリスト」の該当項目にチェックを入れる
```

---

## 8. RCチェックリストとの対応

`PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 8節の該当項目:
```
□ PR-REC-06c: Dry Run実行・出力確認・本実行完了
```
本文書の3〜4節の完了をもってこの項目をチェック可能とする。

---

## Next

本PRはドキュメント整理のみで完了。実行自体はFounder操作待ち
（AI環境にSupabase接続情報がないため技術的に実行不可）。
実行結果（Dry Run/本実行のサマリー、件数確認結果）は
`PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 7節および本文書へ追記する形で
Founderが記録することを推奨する。
