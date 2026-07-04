# LEGACY REMOVAL PLAN
## IPPO 旧アーキテクチャ解体計画（IPPO-LEGACY-001）

> **文書権威レベル: LEVEL-1 GOVERNING DOCUMENT**
>
> 本文書は `src/app-legacy.js`（10,804行）を中心とする旧アーキテクチャの
> 解体・Wave2アーキテクチャへの完全移行を統治する唯一の文書である。
> 新規実装は行っていない。既存の Phase 4-D 監査（`docs/phase4d-legacy-migration-audit.md`）・
> Legacy Asset Inventory（`docs/LEGACY_ASSET_INVENTORY.md`）・Architecture V3（`docs/ARCHITECTURE_V3.md`）を
> 統合し、PR番号を付与した実行計画に格上げしたものである。

---

**文書番号:** IPPO-LEGACY-001
**バージョン:** 1.0
**作成日:** 2026-07-02
**権威:** Legacy Removal Council
**前提:** Release Readiness Council が CONDITIONAL GO と判定済み（`docs/RELEASE_READINESS_COUNCIL.md`、Score 93/100）
**次PR番号:** PR-079（PR-078 = Data Deletion Pipeline が直近の実装PR）

---

## 0. Council Input

| 入力文書 | 用途 |
|---|---|
| `docs/RELEASE_READINESS_COUNCIL.md`（IPPO-RELEASE-001） | 前提条件（CONDITIONAL GO）・未解消Criticalの確認 |
| `docs/LEGACY_ASSET_INVENTORY.md`（IPPO-GOV-001） | データ資産レベルの分類（KEEP/REFACTOR/HOLD/DROP、BD-001〜014）— 本文書はこれを変更しない |
| `docs/WAVE2_ARCHITECTURE.md` | Strangler-Fig原則（AP-04）・DBスキーマ（`user_data` = Legacy） |
| `docs/ARCHITECTURE_V3.md` | 現状構造分析（P-01〜P-10）・Phase S-1〜S-6移行計画・LOCKED制約（C-20） |
| `docs/phase4d-legacy-migration-audit.md` | app-legacy.js 全198関数の実コード調査・Batch-1〜11分割案（2026-06-12作成、本文書のPR番号割当元） |
| `docs/legacy-dependency-map.md` | app.html / src 内の window.* 依存一覧（2026-06-11作成） |
| `src/application/legacy-access-audit.js` | 既存の Legacy Bypass 監査パターン（KNOWN_VIOLATIONS レジストリ）— 本計画のSafety Gate実装の前例 |

**重要な前提の切り分け:** 本 Council が扱う「Legacy」は **クライアント側コード資産**（`app-legacy.js` / `window.*` グローバル export / `user_data` JSONB 二重書込み）である。Release Readiness Council が指摘した BD-034（15+ Wave2ドメインの Supabase 永続化欠如）は **サーバー側 Wave2 ドメインの永続化ギャップ**であり、対象が異なる。両者を混同しない（詳細は 8 章）。

---

## 1. Executive Summary

```
app-legacy.js（10,804行）は Strangler-Fig パターンの「旧側」として Wave1 から凍結されている
（ARCHITECTURE_V3.md C-20: Phase A 完了後の新規コード追加禁止 / WAVE2_ARCHITECTURE.md AP-04）。
実際に行数は Wave1〜Wave2 を通じて変化していない（10,804行のまま）。

2026-06-12 の Phase 4-D 監査により、198関数の移行方針は 100% 確定済みである:
  ✅ 移植済み（削除対象）    約60件（Phase 4-A/B/C で完了）
  🔲 移植対象（未着手）      約120件
  🔲 削除対象 shim（未削除） 約20件
  🔲 確定 Dead Code          4件

本文書の役割は「新たに調査すること」ではなく、既に確定した Batch-1〜11 分割案
（phase4d-legacy-migration-audit.md 第5章）に PR番号（PR-079〜090）を割り当て、
Safety Gate・Dependency Map・Rollback Strategy を明文化し、実行可能な Roadmap に
格上げすることである。

現在のブランチ（feat/phase4d-batch1-record-input）は Batch-1 着手を意図して作成されているが、
作業ツリーには Batch-1 相当のコード変更は存在しない（Release Readiness / Data Deletion 関連の
変更のみ）。Batch-1（PR-079）は本計画の承認後に着手する。
```

---

## 2. Legacy資産分類

Council指示の4分類（即削除 / 段階削除 / 一時保持 / 永久保持）を、コード資産に適用する。
データ資産（Symptom/Food/Emotion 等）は `LEGACY_ASSET_INVENTORY.md` の KEEP/REFACTOR/HOLD/DROP 判定が
既に確定しており（DROP判定ゼロ、BD-001〜014で拘束）、本文書では**変更しない**。

### ▍即削除（Immediate Deletion）— 対応PRなしで削除可能

| 資産 | 内容 | 根拠 |
|---|---|---|
| `updateHistory`（app-legacy.js:2115） | 空関数（`// deprecated`） | phase4d監査 4章「確定Dead Code」 |
| `showMain`（app-legacy.js:1981） | onboarding-runtime.js に完全移植済み。呼び出し元ゼロ | 同上 |
| `_flushCloudRestoreQueue`（app-legacy.js:32） | app-legacy init 時のみの内部queue。モジュール移行後に消滅 | 同上 |
| `_notifyAuthReady`（app-legacy.js:39） | auth-service.js が代替。二重通知リスクあり | 同上 |

> 4件は Batch-11（PR-089）の一部として一括削除する。個別の即時PRは起票しない（影響範囲が小さく、
> 単独PRのオーバーヘッドがリスクを上回るため）。

### ▍段階削除（Staged Deletion）— PR単位で移植→検証→削除

app-legacy.js の残り約194関数すべて。詳細は 3 章（責務分解）・4 章（PRロードマップ）参照。

- **移植済みshim（約20件）**: 既に新モジュールに実体があり、app-legacy.js 側は `window.*` への委譲のみ。
  Batch-11 で一括削除（3-A章参照）。
- **移植対象（約120件）**: 新モジュールへの移植 → window ブリッジ切替 → 呼び出し元切替 → 旧実装削除、
  の4段階を Batch-1〜10（PR-079〜088）で実施。

### ▍一時保持（Temporary Hold）— 削除の前提条件が未成立

| 資産 | 保持理由 | 解除条件 |
|---|---|---|
| `user_data` JSONB（Supabase テーブル） | `cloudBackupAll` / `cloudRestore` が読み書きする唯一の永続化先。新テーブル（records 等）への完全移行が未確認 | ARCHITECTURE_V3.md Phase S-2〜S-3 の Dual Write 検証完了後 |
| `app.html` の onclick 属性 80+ 箇所 | Batch-1〜10 の移植完了まで、window ブリッジとして必要 | Batch-11 直前まで |
| `<script>` 経由の `app-legacy.js` import（main.js:52） | 未移植関数が残る限り、window 経由の呼び出しが機能する必要がある | Batch-1〜10 完了後 |
| jsPDF 外部ライブラリ依存（`downloadDoctorPDF`） | PR-082Aで確認済み: npm依存ではなくcdnjs.cloudflare.com経由のCDN動的スクリプト注入（`window.jspdf`未定義時のみ読み込み）。既存の読み込み機構は無変更のまま物理移動 | 解消済み（PR-082A） |

### ▍永久保持（Permanent Hold）— 削除しない

| 資産 | 理由 |
|---|---|
| `docs/phase4d-legacy-migration-audit.md` / `docs/legacy-dependency-map.md` | 移行完了後もアーカイブとして保持（WAVE2_IMPLEMENTATION_GOVERNANCE.md と同様の運用） |
| 純粋関数群（`analytics/*` / `disease/*`） | 既に app-legacy.js から独立済み。移行対象外（ARCHITECTURE_V3.md 1035行「移行不要」） |
| `DISEASE_CONFIG` 等の定数定義 | Section 3 のモジュール群が import する。削除ではなく参照元の一本化のみ |

---

## 3. app-legacy.js 責務分解

Phase 4-D 監査（1-A〜1-J）を再掲・要約する。全関数の詳細は `docs/phase4d-legacy-migration-audit.md` を正とする。

| カテゴリ | 件数 | 移行先モジュール | 対応Batch |
|---|---|---|---|
| Record / Save 系 | 15 | `src/modules/record.js`, `record-input.js`（新設） | Batch-1, 2 |
| UI / Render 系 | 35 | `record-input.js`, `home-renderer.js`, `pro/*` | Batch-1, 4, 8 |
| Cloud / Sync 系 | 9 | `services/supabase.js`, `sync-modal.js`（新設） | Batch-5（一部済） |
| Auth 系 | 2 | `sync-modal.js` | Batch-5 |
| Settings 系 | 8 | `settings-panel.js`, `premium-lock.js`（新設） | Batch-3, 6 |
| Premium 系 | 8 | `premium/premium-lock.js`（新設） | Batch-3 |
| Onboarding 系 | 1 | `onboarding-runtime.js` | 移植済み（削除のみ） |
| Report / Analysis 系 | 16 | `pro/doctor-summary.js`, `pro/monthly-report.js` 等（新設） | Batch-4 |
| Pure Utility 系 | 35 | `utils/string-utils.js`, `utils/stats-utils.js`（新設） | Batch-9 |
| その他（Community/Admin/Dialog等） | ~65 | `community.js`, `admin.js`, `ui-notifications.js` 等 | Batch-6, 7, 8, 10 |

**3-A. 責務の混在パターン（ARCHITECTURE_V3.md P-01〜P-10 準拠）**

```
app-legacy.js の実際の責務（混在中）:
  UI描画 + 状態管理 + 認証 + Supabase直接呼び出し + Premium判定 + Export

これは WAVE2_ARCHITECTURE.md AP-05（Dependency Direction: UI→ApiGateway→Domain→Repository）
に違反する構造であり、そもそも app-legacy.js が「新規ロジック追加禁止」（AP-04/C-20）と
凍結されている理由そのものである。Legacy Removal は解体であってリファクタではない —
移行先モジュールは Wave2 の DI/Repository パターンに従うこと（新規に旧パターンを複製しない）。
```

---

## 4. PR-079〜090 削除ロードマップ

Mode 判定: AI_EXECUTION.md 1章「Legacy Removal は必ず FULL」に従い、**全PR Mode: FULL**。

| PR | Batch | 内容 | 対象関数数 | 変更ファイル数 | リスク | 依存 |
|---|---|---|---|---|---|---|
| **PR-079** | Batch-1 | Record Input UI（`renderStep`/`selectMood`等） | 約22 | 2 | HIGH（`currentRecord`グローバル依存） | なし（開始点） |
| **PR-080** | Batch-2 | Record Screen & Edit（`openRecordScreen`/`saveRecord`等）— Scope縮小版。`saveRecord`/`getSuccessMessage`/`closeSuccess`のcurrentRecord依存解消のみ実施 | 約14中3 | 1 | HIGH（`openRecordScreen`最大378行、DI未整備のため本PRでは物理移動せず） | PR-079 |
| **PR-080A** | Batch-2 継続（追加調査タスク） | **Record Screen DI Scaffold** — `openRecordScreen`/`editPastRecord`の物理移動に先立つ依存関係監査・DI設計・Shared State監査・Window Export監査・Physical Move分類・後続PR分割案の確定。PR-080実装中に新規発見された依存解消タスクのため、既存PR番号を変更せずBatch-2とBatch-3の間に挿入 | 0（設計・Scaffoldのみ、Business Logic変更なし） | 未定（Dependency監査後に確定） | HIGH（`openRecordScreen`/`saveAndSync`/`updateStats`/`updateHistory`/`buildCalendar`/`closeModal`のwindow未export依存、`_bowelCount`/`_prevTab`共有変数） | PR-080 |
| **PR-080B** | Batch-2 継続（Completion Program） | `updateHistory`依存の整理（確定Dead Code呼び出しの整理、安全なDI入口作成） | 1 | 未定 | LOW | PR-080A |
| **PR-080C** | Batch-2 継続（Completion Program） | `updateStats`/`buildCalendar`の重複実装整理（app-legacy.jsローカル版とhome-renderer.js/calendar.js版の統合、DI可能な構造へ） | 2 | 未定 | MEDIUM（重複実装の統合） | PR-080B |
| **PR-080D** | Batch-2 継続（Completion Program） | `closeModal`/`saveAndSync`周辺依存整理（window bridge整理、DI化可能な状態へ） | 2 | 未定 | MEDIUM | PR-080C |
| **PR-080E** | Batch-2 継続（Completion Program） | `openRecordScreen`/`editPastRecord`の物理移動（Record Screen Moduleへ完全移行、Legacy Adapter除去） | 2 | 未定 | HIGH（最大378行の物理移動・全画面UI回帰） | PR-080D |
| **PR-080F** | Batch-2 Exit Audit（capstone） | Batch-2 Completion Program 監査のみ（新規実装禁止） | — | — | — | PR-080E |
| **PR-081** | Batch-3 | Premium Gate & Lock | 約6 | 2〜3 | MEDIUM（app.html 8箇所置換） | なし（並行可） |
| **PR-082A** | Batch-4 分割① | Doctor Summary / Doctor PDF（`openDoctorSummary`/`closeDoctorSummary`/`generateDoctorSummary`/`downloadDoctorPDF`/`_generateDoctorPDF`/`copyDoctorSummary`） | 6 | 2（app-legacy.js / doctor-summary.js） | MEDIUM（jsPDF依存確認） | PR-080, PR-081 |
| **PR-082B** | Batch-4 分割② | AI Analysis Overlay（`openAIAnalysis`/`closeAIAnalysis`/`copyAIAnalysis`/`runAIAnalysis`/`callAIAPI`） | 5 | 2（app-legacy.js / analysis-overlay.js） | LOW | PR-082A |
| **PR-082C** | Batch-4 分割③ | Monthly Report（`openMonthlyReport`/`closeMonthlyReport`/`changeReportMonth`/`updateMonthLabel`/`generateMonthlyReport`/`downloadReportPDF`） | 6 | 2（app-legacy.js / monthly-report.js） | MEDIUM（jsPDF依存） | PR-082B |
| **PR-082D** | Batch-4 分割④ | Cycle Phase Report（`openCyclePhaseReport`/`renderPhaseMap`/`selectPhaseTab`/`_buildPhaseBarPreview`） | 4 | 2（app-legacy.js / cycle-report.js） | LOW | PR-082C |
| **PR-082E** | Batch-4 分割⑤ | Temperature Report（`calcTemperaturePhases`/`openTempReport`/`showTempEducation`） | 3 | 2（app-legacy.js / temp-report.js） | LOW | PR-082D |
| **PR-082F** | Batch-4 分割⑥ | Flareup / Correlation Report（`detectFlareups`/`openFlareupReport`/`calcFactorCorrelations`/`renderComparisonChart`/`openCorrelationReport`/`setCGRange`/`toggleCGFactor`/`getMetricValue`/`getMetricLabel`/`getMetricMax`/`calcWellnessScore`） | 11 | 4（app-legacy.js / flareup-report.js / correlation-report.js / pro-metric-utils.js） | MEDIUM（renderComparisonChart系の一体化クラスタ） | PR-082E |
| **PR-082G** | Batch-4 Exit Audit（capstone） | Pro Reports Exit Audit（監査のみ・新規実装禁止） | — | — | — | PR-082F |
| **PR-083** | Batch-5 | Sync Modal & Auth UI | 約6 | 2 | LOW | なし（並行可） |
| **PR-084** | Batch-6 | Settings & Data Management | 約18 | 3〜4 | LOW | なし |
| **PR-085** | Batch-7 | Meal Tracker & Fasting | 約13 | 2 | LOW | PR-079（`state.draft`参照） |
| **PR-086** | Batch-8 | Home Insight & Cycle UI | 約12 | 2〜3 | LOW | なし |
| **PR-087** | Batch-9 | Utility & Misc（純粋関数） | 約18 | 5〜6 | LOW | なし（即時着手可） |
| **PR-088** | Batch-10 | Community & Admin | 約9 | 2 | MEDIUM（Supabase直接呼び出し） | なし |
| **PR-089** | Batch-11 | **app.html Cleanup & Legacy Removal**（`<script>`削除・shim20件削除・DeadCode4件削除） | 全残存 | app.html + app-legacy.js | **HIGH**（onclick全置換・全画面UI回帰） | PR-079〜088 **全完了後** |
| **PR-090** | — | **Legacy Removal Exit Audit**（capstone） | — | — | — | PR-089 |

**実施順序（依存グラフ、phase4d監査 5章を継承）:**

```
PR-079 (Batch-1)
  ↓
PR-080 (Batch-2)
  ↓
PR-080A (Record Screen DI Scaffold)   PR-081 (Batch-3)   PR-083 (Batch-5)
  ↓                                        ↓
PR-080B (updateHistory整理)
  ↓
PR-080C (updateStats/buildCalendar重複整理)
  ↓
PR-080D (closeModal/saveAndSync整理)
  ↓
PR-080E (openRecordScreen/editPastRecord物理移動)
  ↓
PR-080F (Batch-2 Exit Audit)
  ↓
PR-082A (Doctor Summary/PDF) ←───────────────┘
  ↓
PR-082B (AI Analysis Overlay)
  ↓
PR-082C (Monthly Report)
  ↓
PR-082D (Cycle Phase Report)
  ↓
PR-082E (Temperature Report)
  ↓
PR-082F (Flareup/Correlation Report)
  ↓
PR-082G (Batch-4 Exit Audit)
  ↓
PR-084 (Batch-6)   PR-085 (Batch-7)   PR-086 (Batch-8)   PR-087 (Batch-9)   PR-088 (Batch-10)
  ↓ (全Batch完了後)
PR-089 (Batch-11: app.html Cleanup & Legacy Removal)
  ↓
PR-090 (Legacy Removal Exit Audit)
```

**PR-087（Batch-9）は依存ゼロのため PR-079 と並行着手可能** — 純粋関数の移植は他Batchの完了を待たない。

**PR-080A 命名規則:** PR-080着手後に発見された `openRecordScreen`/`editPastRecord` のDI未整備という追加調査タスクを、既存PR-081〜090の番号を変更せずに挿入するため `PR-080A` とした。PR-080Aの成果物（Step6: PR分割）が新たな物理移動PRを要求する場合は `PR-080B`・`PR-080C`… の形式で追番する（既存PR-082=Pro Reports等の番号とは衝突させない）。

**PR-082A〜G 分割規則:** PR-082（Batch-4: Pro Reports、約18関数）は実装前調査の結果、
Doctor Summary / AI Analysis / Monthly Report / Cycle Phase Report / Temperature Report /
Flareup・Correlation Report の6機能クラスタが、それぞれ独立したoverlay・状態を持つ
一体化された実装単位であり、かつ複数クラスタでaudit文書に無かった未文書化のヘルパー関数
（`generateDoctorSummary`/`_getMrOverlay`/`_getAiOverlay`/`setCGRange`等）が発見されたため、
1PRでまとめて実装するとRegression確認・Rollback単位が粗くなりすぎると判断し、
PR-080B〜Fと同型の分割命名（`PR-082A`〜`PR-082G`）を適用した。既存PR-083〜090の番号は
変更しない。分割順はPro Reportsクラスタの依存グラフ上の独立性が高い順
（Doctor Summary→AI Analysis→Monthly→Cycle→Temperature→Flareup/Correlation→Exit Audit）。

**PR-090 の役割（Wave2 Exit Audit / Release Readiness Recovery と同型パターン）:**

```
PR-089完了後、以下を機械的に検証し記録する:
  □ app-legacy.js の行数 = 0（または削除済み）
  □ main.js:52 の import './app-legacy.js' 削除
  □ app.html の <script src="app-legacy.js"> 削除
  □ window.* legacy export の残存数 = 0（意図的なもの除く）
  □ npx vitest run 新規リグレッションなし
  □ npx vite build PASS
  □ ArchitectureGuard に「app-legacy.js 参照禁止」ルールを追加し PASS

これは PR-075（Wave2 Exit Audit）・PR-077（Release Readiness Evidence Ledger）と
同一パターン（Founder確認台帳への記録）を踏襲する。
```

---

## 5. Dependency Map

`docs/legacy-dependency-map.md`・phase4d監査 2章を統合した最終版。

### 5-A. グローバル依存（優先度順）

| 依存 | 現状 | 移行先 | リスク |
|---|---|---|---|
| `window.state` | `store/state.js` が既に window 公開済み | 変更不要（shimのみ削除） | LOW |
| `currentRecord`（app-legacy.js内グローバル） | app-legacy.js のみで管理 | `record.js` / `record-input.js` の内部変数へ移行 | **HIGH** — Batch-1着手前に方針確定必須（6章参照） |
| `STEPS` / `currentStep`（app-legacy.js内グローバル） | app-legacy.js のみ | `record-input.js` に封じ込め | **HIGH** — 同上 |
| `localStorage` 直接アクセス | `saveState`/`cloudBackupAll`等 | `store/state.js` 経由に統一 | MEDIUM（`legacy-access-audit.js` の KNOWN_VIOLATIONS に既に一部登録済み） |
| `supabase` 直接アクセス | `cloudBackupAll`/community系/admin系 | `services/supabase.js` 経由に統一 | HIGH（Batch-10で対応） |
| `window.createProOverlay` | `openCyclePhaseReport`等 | `pro-hub.js` 経由に統一 | MEDIUM |
| `DISEASE_CONFIG` | 定数参照のみ | モジュール側 import（削除ではなく参照元一本化） | LOW |

### 5-B. app.html onclick 依存（60〜80+箇所）

`docs/legacy-dependency-map.md` 2章の一覧を正とする。`saveRecordScreen()`（677行目、最重要）を含む
全onclick は Batch-1〜10 完了まで window ブリッジとして維持し、**Batch-11（PR-089）で一括置換**する
（個別Batchでの部分置換はUIの整合性リスクを高めるため行わない）。

### 5-C. `user_data` JSONB との関係

```
user_data（Supabase テーブル）は app-legacy.js の cloudBackupAll/cloudRestore が
読み書きする唯一の永続化先である。WAVE2_ARCHITECTURE.md 4-A で「Legacy / Strangler-Fig移行中」
と明記されている。

app-legacy.js の削除（PR-089）は user_data テーブルの廃止を意味しない。
records 等の新テーブルへの完全移行（ARCHITECTURE_V3.md Phase S-2〜S-3のDual Write検証）が
別途完了するまで、user_data は「一時保持」のまま残る（2章参照）。
コード削除とデータ移行は別トラックであり、本ロードマップは前者のみを扱う。
```

---

## 6. Safety Gate

各PRのマージ条件。`src/application/legacy-access-audit.js` の KNOWN_VIOLATIONS レジストリパターンを
Legacy Removal 用に拡張する。

```
□ SG-1: npx vitest run で新規リグレッションなし（既知失敗39件から増加しないこと。
        2026-07-02時点のベースライン: 5,149件中失敗39件）
□ SG-2: npx vite build PASS
□ SG-3: 移行対象の window.* 関数について、旧実装と新実装の並行動作期間を設ける
        （= 新モジュールに実装 → window ブリッジを新モジュール側に向け替え →
        旧実装が呼ばれていないことを1PR以上確認 → 旧実装削除）
□ SG-4: currentRecord / STEPS グローバルの移行方針は Batch-1（PR-079）着手前に
        record.js の実コードを読んで確定する（推測禁止。phase4d監査6章の未解決事項）
□ SG-5: Batch-11（PR-089）のみ追加ゲート:
        - app.html 全onclick置換後、主要画面（home/record/calendar/insights/settings）の
          手動スモークテストを実施
        - UI Safety Gate（既存の回帰テストスイートに加え、目視確認）
□ SG-6: 各PRで ArchitectureGuard に「新規削除済み関数への参照が残っていないか」の
        静的チェックを追加する（legacy-access-audit.js と同型のレジストリ方式）
□ SG-7: app-legacy.js の行数がPR前後で減少していること（増加は即座に差し戻し。
        ARCHITECTURE_V3.md C-20 の「CIチェックで行数増加を検知したらビルド失敗」は
        現状コード化されていないため、PR-079で `tests/arch/` に行数監視テストを追加する）
```

> **注記（SG-7）:** ARCHITECTURE_V3.md は「CIチェックでLOCKED」と記載しているが、
> `src/application/architecture-guard.js` を確認した結果、実際には app-legacy.js の
> 行数を検証するルールは存在しない（文書上の意図とコードの実態に乖離あり）。
> PR-079 のスコープに「行数監視テストの追加」を含める。

---

## 7. Rollback Strategy

```
原則: 各Batchは「追加 → 検証 → 切替 → 削除」の4段階を1PR内、または連続する2PR内で完結させる。
      旧実装は新実装が本番で確認されるまで残す（ARCHITECTURE_V3.md Phase S-1「app-legacy.jsへの
      変更ゼロ」の思想を踏襲 — ただし Legacy Removal は最終的に削除するため「変更ゼロ」ではなく
      「検証されるまで削除しない」と読み替える）。

Rollback レベル:
  L1（PR単位）: 当該PRの git revert。window ブリッジが旧実装（app-legacy.js）を
                再度指すよう戻すだけで即座に復旧可能（Batch-1〜10）。
  L2（Batch内の一部関数）: 個別関数のみ window ブリッジを旧実装に戻す
                （新モジュール側の実装は残したまま無効化）。
  L3（Batch-11のみ）: 最もリスクが高い。<script src="app-legacy.js"> の復元と
                app.html onclick の復元をセットで行う revert PR を用意する。
                Batch-11 は他Batchと異なり「削除のみ」で新規追加コードがないため、
                L1のgit revertで完全復旧可能（追加コードの巻き戻し不要）。

Rollback判定基準:
  - 本番相当環境でのE2E/手動確認で機能retrogressionが1件でも見つかった場合 → 即座にL1
  - Batch-11マージ後、24時間以内に予期しないエラーレポートが閾値を超えた場合 → L3
  - Founder判断による任意タイミングでのHOLD指示 → 該当PRの着手を停止（このロードマップは
    Founderの明示的な各PR承認を前提とする。AI_EXECUTION.md Mode:FULLは「Founder判断が
    必要な変更」を含むため、PR-079着手前にFounderの明示的なGoが必要）
```

---

## 8. Risk一覧

| # | 重大度 | 内容 | 対応Batch/PR |
|---|---|---|---|
| R-1 | **HIGH** | `currentRecord`/`STEPS` グローバルの移行方針が未確定（phase4d監査6章より継承） | PR-079着手前に確定必須（SG-4） |
| R-2 | **HIGH** | app.html onclick 80+箇所の一括置換（Batch-11）— 全画面UIへの影響 | PR-089、SG-5で軽減 |
| R-3 | **HIGH** | `openRecordScreen`（最大378行）の分割 — three-card実装との優先順位制御が既存 | PR-080 |
| R-4 | MEDIUM | jsPDF外部ライブラリ依存の存在未確認（`downloadDoctorPDF`） | 解消済み（PR-082Aで確認、2章参照） |
| R-5 | MEDIUM | community/admin系のSupabase直接呼び出し — Mock Supabaseでのテストが必要 | PR-088 |
| R-6 | MEDIUM | `premiumGate`のapp.html 8箇所onclick置換 | PR-081 |
| R-7 | LOW | 純粋関数の移動自体はリスク低いが、35件と件数が多く見落としやすい | PR-087（機械的チェックリストで対応） |
| R-8 | **構造的（コード外）** | ARCHITECTURE_V3.md記載のCIロック（C-20）が実装されていない — 本文書SG-7で是正するまで、app-legacy.js増加を防ぐ機械的な壁がない | PR-079スコープに含める |
| R-9 | **監督（コード外）** | Release Readiness CriticalであるBD-034（Wave2ドメインのSupabase永続化欠如）は本ロードマップの対象外だが、Founderが両者を混同しないよう明示する必要がある | 本文書0章・9章で明示 |

---

## 9. 判定 — Legacy Removal Strategy

### 9-A. Phase別削除順

```
Phase 1（並行着手可）: PR-079（Batch-1）+ PR-087（Batch-9・依存ゼロ）
Phase 2: PR-080（Batch-2）→ PR-080A（Record Screen DI Scaffold）+ PR-081（Batch-3）+ PR-083（Batch-5）
Phase 3: PR-082A〜G（Batch-4、分割実装）
Phase 4（並行着手可）: PR-084, PR-085, PR-086, PR-088（Batch-6/7/8/10）
Phase 5（最終）: PR-089（Batch-11: app.html Cleanup & Legacy Removal）
Phase 6（capstone）: PR-090（Legacy Removal Exit Audit）
```

### 9-B. main反映タイミング

```
PR-079〜088: 各PRは独立してmainにマージ可能（Safety Gate SG-1〜SG-4通過が条件）。
             Batch間の依存関係（4章の依存グラフ）に従う限り、順序はマージタイミングの
             制約であって「一括マージ」ではない。

PR-089: 前提PR（079〜088）すべてがmainにマージ済みであることを確認してから着手する。
        マージにはSG-5（手動スモークテスト）を追加条件とする。

PR-090: PR-089マージ後、即座に着手し監査結果を記録する。
```

### 9-C. 完全削除条件

```
以下すべてを満たした時点で「app-legacy.js 完全削除」と宣言する:

□ app-legacy.js の行数 = 0（ファイル自体の削除、または空ファイル化）
□ src/main.js:52 の import './app-legacy.js' 削除
□ app.html の <script src="app-legacy.js"> 削除
□ window.* legacy export の残存数 = 0
□ npx vitest run で新規リグレッションなし
□ npx vite build PASS
□ PR-090（Legacy Removal Exit Audit）が全項目PASSを記録

「user_data JSONB テーブルの廃止」は完全削除条件に含まれない（5-C章参照、別トラック）。
```

### 9-D. ロールバック条件

```
7章のRollback Strategyに従う。特に以下の場合は即座にロールバックを実施する:

□ 記録保存フロー（saveRecordScreen経由）に1件でも不具合が確認された場合
  （Record は全資産の基底単位 — LEGACY_ASSET_INVENTORY.md 4章「★★★★★ 代替不可」）
□ Premium課金フロー（Stripe checkout含む）に不具合が確認された場合
□ Batch-11マージ後の初回本番相当環境スモークテストで1画面でも致命的なUI崩壊が確認された場合
```

### 9-E. 総合判定

```
GO（PR-079着手可）— ただし以下2条件付き:

  条件1: PR-079 着手前に SG-4（currentRecord/STEPS移行方針の確定）を完了すること
         （推測禁止。record.js の実コードを読んで確定する — phase4d監査からの継続課題）

  条件2: PR-089（Batch-11、app.html全置換・最終削除）は Founder の明示的な着手承認を
         個別に得ること。PR-079〜088とは異なり、本番ユーザー向けUI全体に影響するため、
         AI_EXECUTION.md Mode:FULL の「Founder判断が必要な変更」に該当する。

Release Readiness Council の CONDITIONAL GO（未解消Critical: C-1/C-2/C-3/C-4/BD-034）は
本ロードマップの着手条件ではない（0章参照 — 対象が異なるため）。ただし BD-034
（Wave2ドメインのSupabase永続化欠如）の解消方針をFounderが決定するまでは、
Legacy Removalと並行して新規Roadmap起票の要否が判断されるべきであり、
両プログラムの優先順位はFounderが決定する。
```

---

## 10. Decision Log 追補（2026-07-03）

```
決定事項: PR-080（Batch-2 Scope縮小版）実装中に、openRecordScreen()/editPastRecord()の
安全な物理移動には追加のDIスキャフォールド（依存関係監査・DI設計・Shared State監査・
Window Export監査）が必要と判明した。この追加調査タスクをどのPR番号で扱うかについて
Founder判断を仰いだ結果、以下の方針が確定した:

  □ 既存PR-081〜090の番号は変更しない（historical referenceの安定性を優先）
  □ 追加タスクは PR-080A としてPR-080とPR-081の間に挿入する
  □ PR-080Aの成果物（後続の物理移動PR分割案）が新PRを要する場合は
    PR-080B・PR-080C…の形式で追番し、既存PR-082（Pro Reports）等の番号と衝突させない
  □ 本追補・4章ロードマップ表・依存グラフ・9-A章の更新のみを行い、
    5章以降のDependency Map/Safety Gate/Risk一覧/9-E判定は無変更

根拠: CLAUDE.md「Legacy Removalは小PRで進める」「PR-081はDI Scaffoldから開始」との
Founder確定事項、およびAI_EXECUTION.md 9章（Roadmap変更はDecision Log候補）に基づく。
```

## 10-B. Decision Log 追補（2026-07-03・PR-082分割）

```
決定事項: PR-082（Batch-4: Pro Reports、約18関数）着手前の重複実装監査の結果、
Doctor Summary / AI Analysis / Monthly Report / Cycle Phase Report / Temperature Report /
Flareup・Correlation Report の6機能クラスタがそれぞれ独立したoverlay・module-scope状態
（_mrOverlayApi/_aiOverlayApi/_cycleOverlayApi/_tempOverlayApi/_flareupOverlayApi/
_corrOverlayApi/_cgRange/_cgFactors等）を持ち、かつ複数クラスタでaudit文書
（phase4d-legacy-migration-audit.md）に無かった未文書化の結合ヘルパー関数
（generateDoctorSummary/_generateDoctorPDF/_getMrOverlay/generateMonthlyReport/
downloadReportPDF/_getAiOverlay/callAIAPI/setCGRange/toggleCGFactor/getMetricValue/
getMetricLabel/getMetricMax）が新規発見されたため、Founderの指示によりPR-082を
PR-082A〜G（Batch-4分割①〜⑥＋Exit Audit）へ分割することが確定した。

  □ 既存PR-083〜090の番号は変更しない
  □ PR-082A（Doctor Summary/Doctor PDF）を本チャットで実装完了
  □ PR-082B〜Fは各機能クラスタ単位（AI Analysis→Monthly→Cycle→Temperature→
    Flareup/Correlation）で今後個別に実装する
  □ PR-082Bで実装するsrc/modules/pro/analysis/analysis-overlay.js・
    src/modules/pro/monthly-report.js・src/modules/pro/cycle-report.js・
    src/modules/pro/temp-report.js・src/modules/pro/flareup-report.js・
    src/modules/pro/correlation-report.jsおよびsrc/modules/pro/shared/
    pro-metric-utils.jsのcalcWellnessScore追加は、本チャットで先行ドラフト作成済み
    （app-legacy.js側は未配線・Scope外のためimport追加せず現状維持）。次PR着手時に
    内容の再検証（app-legacy.js側の最新状態との整合確認）を行った上で正式に組み込む
  □ PR-082G（Exit Audit）でPR-082A〜Fの物理移動完了・Business Logic無変更を
    まとめて監査する（Batch-2のPR-080F/Wave2 Exit Auditと同型パターン）
  □ 本追補・4章ロードマップ表・依存グラフ・9-A章・2章（jsPDF依存確認）・
    8章（R-4）の更新のみを行い、5章以降のDependency Map/Safety Gate/Rollback/
    9-E判定は無変更

根拠: Founder指示「PR-082のScopeを分割してください」、およびAI_EXECUTION.md 9章
（Roadmap変更・Legacy Removal判断はDecision Log候補）に基づく。
```

### 10-B 完了報告（2026-07-04・PR-082B〜G実装完了）

```
PR-082B〜Fは10-B章の計画通り、先行ドラフト（analysis-overlay.js/monthly-report.js/
cycle-report.js/temp-report.js/flareup-report.js/correlation-report.js/
pro-metric-utils.jsのcalcWellnessScore）をapp-legacy.js最新状態と再照合のうえ
逐次配線（import追加）し、Business Logic変更ゼロで物理移動完了。新規の重複実装・
未文書化ヘルパーの発見なし（10-B章時点の想定どおり）。PR-082G（Exit Audit）にて
Architecture Guard（120件全PASS）・Regression（5,171件中5,132件PASS、失敗39件は
既知5ファイルのみで増加なし）・Build（vite build PASS）・Browser Verification
（6機能全てopen/render/close確認、console error 0件）を実施し、Batch-4完了を確認。
本追補以降の新規Decision Log項目なし（10-B章の決定事項の範囲内で完了したため）。
```

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-LEGACY-001 |
| **バージョン** | 1.2（2026-07-04、PR-082B〜G実装完了により4章ロードマップ表の移動先ファイルを確定・10-B章に完了報告を追記） |
| **作成日** | 2026-07-02 |
| **権威レベル** | LEVEL-1 GOVERNING DOCUMENT（Founder承認待ち） |
| **前提文書** | RELEASE_READINESS_COUNCIL（IPPO-RELEASE-001）/ LEGACY_ASSET_INVENTORY（IPPO-GOV-001）/ WAVE2_ARCHITECTURE / ARCHITECTURE_V3 / phase4d-legacy-migration-audit.md / legacy-dependency-map.md |
| **検証方法** | 既存監査文書の読解・突合のみ（新規コード調査は実施していない） |
| **判定** | GO（条件2件付き。9-E参照） |
| **次のアクション** | PR-080A（Record Screen DI Scaffold）着手 → Step1〜6完了後、後続PR-080B等の分割案を確定 |
| **本文書がOperations Councilへの入力となる項目** | PR-079〜090 削除ロードマップ／Dependency Map／Safety Gate／Rollback Strategy（Council Output要件） |
