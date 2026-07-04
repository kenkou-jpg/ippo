# DATABASE_AUDIT.md
## ippo — データベース完全監査

Generated: 2026-06-24  
根拠: supabase/migrations/*.sql + services/supabase.js

---

## テーブル一覧

### 1. `auth.users` (Supabase管理)
- Supabase Auth が管理する標準テーブル
- `on_auth_user_created` trigger → `public.profiles` へ自動INSERT

---

### 2. `public.profiles`

| Column | Type | Constraint | 説明 |
|--------|------|-----------|------|
| `id` | uuid | PK, FK → auth.users | ユーザーID |
| `email` | text | — | メールアドレス |
| `is_premium` | boolean | NOT NULL DEFAULT false | プレミアムフラグ (subscriptionsへ移行中) |
| `premium_expires_at` | timestamptz | NULL | プレミアム有効期限 |
| `baseline_json` | jsonb | NULL | calcBaseline()結果キャッシュ |
| `baseline_updated_at` | timestamptz | NULL | ベースライン更新日時 |
| `cluster_id` | integer | NULL | クラスタID (cluster-batch Edge Function) |
| `cluster_meta` | jsonb | NULL | クラスタメタデータ |
| `cluster_updated_at` | timestamptz | NULL | クラスタ更新日時 |
| `prediction_cache` | jsonb | NULL | 予測キャッシュ |
| `prediction_updated_at` | timestamptz | NULL | 予測キャッシュ更新日時 |
| `created_at` | timestamptz | — | 作成日時 |

**RLS:**
- `profiles_select_own`: auth.uid() = id
- `profiles_update_own`: auth.uid() = id (ユーザー自身のみ)
- `is_premium` の直接更新はService Role経由のみ（運用制約）

---

### 3. `public.records`

※ マイグレーションから定義が確認できる列（CREATE TABLE文は不確認、RLSのみ確認済み）

| Column | Type | 確認根拠 |
|--------|------|---------|
| `user_id` | uuid | RLS: auth.uid() = user_id |
| `symptoms` | jsonb | GINインデックス (20260002) |
| `factors` | jsonb | GINインデックス (20260002) |

**RLS:**
- `records_select_own` / `records_insert_own` / `records_update_own` / `records_delete_own`
- 全ポリシー: auth.uid() = user_id

**インデックス:**
```sql
CREATE INDEX idx_records_symptoms ON public.records USING GIN(symptoms);
CREATE INDEX idx_records_factors  ON public.records USING GIN(factors);
```

---

### 4. `public.user_data`

※ supabase.js の cloudBackupAll() / cloudRestore() から逆引き確認

| Column | Type | 説明 |
|--------|------|------|
| `user_id` | uuid | FK → auth.users |
| `state` | jsonb | ippo_state全体のJSONブロブ |
| `updated_at` | timestamptz | 最終更新日時 |

**特記:**
- state JSONB内に records配列・myDiseases・experiments 等が全て混在
- 正規化ゼロ — 全データが1カラムのJSONブロブ
- `user_records` と `user_data` の二重保存構造

---

### 5. `public.user_records`

※ supabase.js の syncRecordImmediately() から逆引き確認

| Column | Type | 説明 |
|--------|------|------|
| `id` | text | record.id (nanoid) |
| `user_id` | uuid | FK → auth.users |
| `record_date` | date | 記録日 |
| `data` | jsonb | record object全体 |
| `updated_at` | timestamptz | 更新日時 |

**制約:** `UPSERT ON CONFLICT id`  
**用途:** user_data の補完/バックアップ。記録単位の同期。

---

### 6. `public.subscriptions` (20260005)

| Column | Type | Constraint | 説明 |
|--------|------|-----------|------|
| `id` | uuid | PK | — |
| `user_id` | uuid | UNIQUE, FK → auth.users | 1ユーザー1行 |
| `stripe_customer_id` | text | — | StripeカスタマーID |
| `stripe_subscription_id` | text | — | Stripeサブスクリプション |
| `plan` | text | CHECK('monthly','annual') | プランタイプ |
| `status` | text | NOT NULL CHECK(active/canceled/past_due/inactive) | 購読状態 |
| `current_period_end` | timestamptz | — | 現在期間終了日 |
| `created_at` | timestamptz | NOT NULL | — |
| `updated_at` | timestamptz | NOT NULL | trigger自動更新 |

**RLS:**
- `subscriptions_select_own`: SELECT のみユーザー自身
- INSERT/UPDATE/DELETE は Service Role のみ (stripe-webhook)

**Realtime:** `supabase_realtime` publication に追加済み  
**ADR-003:** Premium Source of Truth を profiles.is_premium → subscriptions に移行中

---

## kk_records の特別分析

`kk_records` は旧localStorage キー（旧アプリ名「健康記録」由来）。

- **現状:** `state.js migrateStorageKeys()` にて `ippo_state` へ移行後に `localStorage.removeItem()` される
- **移行ロジック:** タイムスタンプ比較 (legacyTs > currentTs のみ上書き)
- **DBテーブルとしては存在しない** — localStorage キーのみ
- **データ:** 旧形式の records 配列

---

## DB設計上の問題点

| 問題 | 重要度 | 詳細 |
|------|--------|------|
| 非正規化ブロブ (`user_data.state`) | Critical | records/myDiseases/experimentsが全て1カラムに混在。症例DBとして使えない |
| 二重保存 (`user_data` + `user_records`) | High | 同じデータが2箇所に存在。整合性保証なし |
| `records` テーブルの完全定義不明 | High | マイグレーション内にCREATE TABLE文なし（既存テーブルへのALTERのみ） |
| `profiles.is_premium` vs `subscriptions` 移行中 | Medium | ADR-003で移行決定済みだが共存状態 |
| クラスタ列がprofilesに混在 | Medium | profiles肥大化。cluster専用テーブルが適切 |
| `user_data.state` にexperimentsが埋まっている | High | Experiment正規テーブルへの移行が必要 |
