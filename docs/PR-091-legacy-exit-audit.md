# PR-091 — Legacy Exit Audit

> 目的: 現行Recovery Program（EXPORT_HUB_REFACTOR_COUNCIL・PR-090-P1〜R5）が
> 自ら定義した対象範囲を完了しているかを再監査する。
> 本文書はコード変更を伴わない監査のみ（Business Logic変更禁止）。
> Known Deferred Items（saveRecordScreen / buildHomeWeekRow / updateHomeCTAState /
> Home Cluster）はFounder Decision（`docs/LEGACY_REMOVAL_PLAN.md` 10-D節）により
> 監査スコープから除外する。

---

## 1. 監査スコープの定義

**対象:** `docs/EXPORT_HUB_REFACTOR_COUNCIL.md`が分類したAPP_LEGACY_EXPORT_HUB
172件（PR-090-P3監査）のうち、以下3分類の解消状況。

- 自己export可能47件（12モジュール、Step A）
- window.state依存70件（18モジュール、Step B = Decision-1）
- Legacy依存55件（8モジュール、Step C）

**対象外（Known Deferred Items、監査しない）:**
- `saveRecordScreen()`（success-overlay.jsのLegacy依存1件を含む）
- `buildHomeWeekRow`/`updateHomeInsightCard`/`updateHomeNumbers`/
  `updateHomeDiseaseAdvice`/`updateHomeCTAState`（Home Cluster）
- 上記はFounder Decision（2026-07-06、選択肢D採用）によりLegacy Removal Program
  対象外。β後のUI/UX Final Councilで判断されるまで一切手を入れない。

**本書のスコープ外（別の未決事項として존재、今回の監査対象ではない）:**
- `docs/LEGACY_COMPLETION_RECOVERY_PLAN.md` 2-4節・2-5節の
  saveRecord/record-modal系（Decision-4、2026-07-05時点で未決のまま）。
  現行Recovery Program（EXPORT_HUB_REFACTOR_COUNCIL系）の実施対象ではなく、
  今回のFounder指示にも含まれないため監査対象から除外する。

---

## 2. Step A — 自己export可能47件（12モジュール）

| モジュール | 状態 |
|---|---|
| meal-quick-input.js / meal-tracker.js / pro-metric-utils.js / quick-log.js / record-edit.js / record-factors.js / record-screen-widgets.js / save-and-sync.js / share.js / symptom-layers.js / ui-notifications.js / string-utils.js | **PR-090-R2で完了。** 各モジュールへ`window.X = X;`自己export行を追加、app-legacy.js側の重複export行47件を削除済み（コミット`c4182af`）。 |

**判定: 完了。**

---

## 3. Step B — window.state依存70件（18モジュール、Decision-1）

`src/store/state.js`の`setState()`で`window.state`を直接同期する変更を
PR-090-R3で実施済み（コミット`47dabd4`）。`app-legacy.js`の`_ippoStateHooks`
フックに依存せず、`state.js`自身が`window.state`のSource of Truthになった。

対象18モジュール（cycle-utils.js/fasting.js/feedback.js/legacy-settings-hero.js/
premium-lock.js/analysis-overlay.js/correlation-report.js/cycle-report.js/
doctor-summary.js/flareup-report.js/monthly-report.js/temp-report.js/
record-screen.js/record-section-order.js/success-message.js/
symptom-settings.js/temp-alert.js/stats-utils.js）は、window.state依存という
観点では自己export可能状態になった。

**ただし、Step Bで解消されたのは「window.stateの同期経路」の問題のみである。
これら18モジュールについて、Step A同様の自己export追加 + app-legacy.js側の
重複export行削除（Step D）が実際に行われたかは別問題として次節で扱う。**

**判定: window.state依存という技術的ブロッカーの解消は完了。ただし自己export化
自体（Step D）は未実施（4節参照）。**

---

## 4. Step C — Legacy依存55件（8モジュール）

| モジュール | Legacy依存の内訳 | PR-090-R4後の状態 |
|---|---|---|
| insights-tab-panel.js（2件） | `__ippoGetIsPremium` | **解消済み**（PR-090-R1、premium-service.jsから直接import） |
| legacy-misc-stats.js（4件） | `__ippoGetIsPremium`/`__ippoGetSupabaseUserId` | **解消済み**（PR-090-R1 + R4、いずれも直接importへ変更） |
| admin.js（3件） | `__ippoGetSupabaseUserId` | **解消済み**（PR-090-R4、supabase.jsから直接import） |
| community.js（8件） | `__ippoGetSupabaseUserId` + window.state | **解消済み**（window.stateはR3、supabaseUserIdはR4で解消） |
| sync-modal.js（6件） | `__ippoGetSyncMode`/`__ippoSetSyncMode` | **解消済み**（PR-090-R4、syncMode自体を本ファイルへ物理移動） |
| data-export.js（5件） | `__ippoLegacyUpdateStats` + window.state | **解消済み**（window.stateはR3、updateStatsはR4でlegacy-misc-stats.jsから直接import） |
| record-input.js（26件） | `SYMPTOM_DETAIL_CONFIG` | **データのみ解消**（PR-090-R4、`src/constants/symptom-detail.js`へ移動。ただしrecord-input.js側は引き続き`window.SYMPTOM_DETAIL_CONFIG`読み取りのままで、window bridgeは意図的に未設置——理由は6節参照） |
| success-overlay.js（1件） | `saveRecordScreen()`連動 | **Known Deferred Item（対象外）**。Founder Decisionによりスコープ外。 |

**判定: 8モジュール中7モジュールの依存関係は解消済み（success-overlay.jsの1件は
Known Deferred Itemのため対象外）。ただし「依存解消」と「自己export化の実行」は
別工程であり、次節でその実施状況を監査する。**

---

## 5. 【新規発見】Step D（自己export追加 + app-legacy.js側dedup）が未実施

Step A（自己export可能47件）はPR-090-R2で自己export追加とapp-legacy.js側の
重複export行削除の両方が実施された。しかしStep B/Cで依存関係が解消された
モジュール（Step B 18モジュール、Step C 7モジュール）については、
**依存関係の解消（物理移動）のみが行われ、自己export行の追加および
app-legacy.js側の重複export行削除（Step D）はまだ実施されていない**ことを
実コードで確認した。

```
$ grep -c 'if (typeof .* === "function") window\.' src/app-legacy.js
151
$ grep -cE '^window\.[A-Za-z_]+ *= *[A-Za-z_]+;' src/app-legacy.js
21
（合計172行 = PR-090-P3監査時点のB分類172件から未削減）
```

さらに、この172行の中に**重複行3件**（`window.openSyncModal`/
`window.closeSyncModal`/`window.toggleSyncMode`が、DEVICE SYNC節の手動export
（2238〜2241行）とアルファベット順自動生成節（2420/2480/2533行）の両方に
存在）を確認した。これはPR-090-R4でsyncModeの物理移動時にsync-modal.js側の
export解決を修正した際に見落とされた、無害だが冗長な重複行である
（同一関数への同一値の再代入のため実害はないが、SAFE_DEADとして削除可能）。

**これはBusiness Logic変更を伴わない、Step A同型の機械的作業（1クラスタ=1PR）で
あり、Founder判断は不要**（EXPORT_HUB_REFACTOR_COUNCIL 7節Step Cの一部として
既に承認済みの範囲）。ただし本Auditはコード変更を伴わないため、ここでは
「未実施」の事実の記録のみに留め、実装は次PRへ引き継ぐ。

---

## 6. SYMPTOM_DETAIL_CONFIGのwindow bridge — 意図的な未完了

record-input.jsは引き続き`window.SYMPTOM_DETAIL_CONFIG`を読む実装のままであり、
`src/constants/symptom-detail.js`側にはwindow bridgeを意図的に追加していない
（PR-090-R4時点の発見: `window.SYMPTOM_DETAIL_CONFIG`は移動前から一度も
設定されたことがなく、症状詳細サブUIは元々機能していなかった。bridgeを追加すると
この機能が初めて有効化されUI変更に該当するため）。

これはStep Dの「未実施」とは性質が異なり、**意図的にBusiness Logic変更を避けた
結果として自己export化を保留している**状態である。record-input.js側の配線見直し
（機能有効化の是非）はFounder確認が必要な別課題として、既にPR-090-R4のHANDOFF
記録に切り出し済み（本Auditで新たに追加するFounder確認事項ではない）。

---

## 7. Build / Regression / Architecture Guard

- **Build**: PASS（`npx vite build`、既存警告のみ——循環チャンク参照・チャンクサイズ超過、本Programと無関係）
- **Regression**: `npx vitest run` 5,193件中 失敗40件。
  既知5ファイル・39件（build-draft-from-ui.test.js / save-record-screen.test.js /
  disease-analyzer.test.js / domain-event-types.test.js / event-menstrual.test.js）に加え、
  `tests/research-query/research-query-api.test.js`の1件が並列実行時のタイムアウト
  （5000ms）で失敗。単体実行では1.5秒でPASSすることを確認済み——PR-090-R2で記録済みの
  Architecture Guardタイムアウトと同型の環境依存フレーキーであり、コード起因の
  新規リグレッションではない。**実質的な既知失敗数は39件のまま、増加なし。**
- **Architecture Guard**: 単体実行時に上記1件のフレーキータイムアウトを除き
  全件PASS（フル`vitest run`内では対象テストも実際にはPASSすることを別途確認）。

---

## 8. app-legacy.js 現状

- 行数: **2,554行**（PR-079開始時10,804行から約76%削減）
- 残存する主要な責務:
  - Known Deferred Items（saveRecordScreen本体・home cluster5関数の実装、
    switchTab、record-modal関連の一部）
  - Step Dが未実施の172行のwindow export hub（うち3行は重複）
  - Decision-4未決のsaveRecord/record-modal系（本Auditのスコープ外）
  - その他、個別のD分類・E分類として過去のPRで維持判断済みの残存項目

---

## 9. 判定

```
現行Recovery Program（EXPORT_HUB_REFACTOR_COUNCIL・PR-090-P1〜R5）の
対象範囲における判定:

Step A（自己export可能47件）:      完了
Step B（window.state依存70件）:     依存解消は完了。自己export化（Step D）は未実施
Step C（Legacy依存55件）:           7/8モジュールの依存解消は完了。自己export化
                                    （Step D）は未実施。残り1件（success-overlay.js）
                                    はKnown Deferred Itemのため対象外
Step D（自己export追加+dedup）:     未実施（Business Logic変更を伴わない機械的作業、
                                    次PRで実施可能）
SYMPTOM_DETAIL_CONFIGのwindow bridge: 意図的に未実施（Founder確認が必要な別課題）

Known Deferred Items（saveRecordScreen/Home Cluster）: Founder Decisionにより
                                    Program対象外。本Auditは関知しない
Decision-4（saveRecord/record-modal系）: 現行Programの実施対象外。本Auditのスコープ外

Build:      PASS
Regression: 5,193件中39件（既知のみ、増加なし。1件は環境依存フレーキーで実質影響なし）
Architecture Guard: PASS

app-legacy.js削除可否: 不可
  理由: (1) Known Deferred Itemsが存在する限りapp-legacy.js内にコードが残存する
        (2) Decision-4（saveRecord/record-modal系）が未決のまま
        (3) Step D（自己export化+dedup、172行）が未実施
  → PR-092 Final Cutoverはこれらすべてが解消されない限り着手できない
    （元々docs/LEGACY_COMPLETION_RECOVERY_PLAN.md 3章Step5に記載の前提と同一）

現行Program自身が定義した範囲（Step A〜C、Known Deferred Items除く）に限れば、
「依存関係の解消」は完了しているが、「自己export化の実行（Step D）」という
最後の1工程が未着手のまま残っている。これは新規のBusiness Logic変更を伴わない
機械的作業のため、Founder判断を待たずに次PRとして実施可能。

Business Logic変更: なし（本PRは監査のみ、コード変更ゼロ）
UI変更: なし
```

---

## 10. 次のアクション提案（実装はしない、提案のみ）

1. **PR-090-R6（提案）**: Step D — window.state依存18モジュール + Legacy依存
   解消済み7モジュール（計25モジュール）へ自己export行を追加し、app-legacy.js側の
   対応する重複export行（約169行、うち3行は既に重複していた分を含む）を削除する。
   Step Aと同型の機械的作業、Founder判断不要。
2. **重複export行3件の削除**（`window.openSyncModal`/`closeSyncModal`/
   `toggleSyncMode`の二重定義）は上記PR-090-R6に含めて良い。
3. Known Deferred Items（saveRecordScreen/Home Cluster）とDecision-4
   （saveRecord/record-modal系）は、それぞれ別のFounder判断・会議体
   （β後UI/UX Final Council）を待つ。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-LEGACY-091-AUDIT |
| **作成日** | 2026-07-06 |
| **権威レベル** | 監査報告書（`docs/LEGACY_COMPLETION_RECOVERY_PLAN.md`の後継、Founder確認待ち） |
| **実装状況** | コード変更ゼロ。本書は監査結果の記録のみ |
| **前提文書** | docs/EXPORT_HUB_REFACTOR_COUNCIL.md / docs/PR-090-R5-saveRecordScreen-migration-decision.md / docs/LEGACY_COMPLETION_RECOVERY_PLAN.md / docs/LEGACY_REMOVAL_PLAN.md 10-D節 |
| **判定** | 現行Program範囲内のStep A〜C依存解消は完了。Step D（自己export化）は未実施のため次PRへ引き継ぎ。app-legacy.js削除は不可（Known Deferred Items・Decision-4未決・Step D未実施のため） |
| **次のアクション** | PR-090-R6（提案、Step D実施）。PR-092 Final Cutoverは着手しない |
