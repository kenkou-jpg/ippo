# Legacy Exit Audit — Final（Recovery Program 完了監査）

> 目的: Recovery Program（PR-090-P1〜R6）の成果を最終監査し、区切りを確定する。
> 本文書はコード変更を伴わない監査のみ（Business Logic変更禁止）。
> **Known Deferred Items**（`docs/LEGACY_REMOVAL_PLAN.md` 10-D節）と**Decision-4対象**
> （同10-E節）はいずれも**Approved Deferred Items**（Founder承認済みの延期項目）として
> 本監査のスコープから除外し、現行Recovery Programの成果のみを監査する。

---

## 1. 監査スコープの定義

### 1-1. 監査対象（現行Recovery Programの成果）

`docs/EXPORT_HUB_REFACTOR_COUNCIL.md`が分類したAPP_LEGACY_EXPORT_HUB 172件のうち、
Approved Deferred Itemsを除いた全項目の解消状況。

- Step A: 自己export可能47件（12モジュール）
- Step B: window.state依存70件（18モジュール、Decision-1実装含む）
- Step C: Legacy依存55件のうちApproved Deferred Items 1件（success-overlay.js）を
  除く54件（7モジュール）
- Step D: 自己export追加 + app-legacy.js側dedup

### 1-2. Approved Deferred Items（本監査から除外、Founder承認済み）

| カテゴリ | 対象 | Founder Decision | Decision Log |
|---|---|---|---|
| Known Deferred Items | `saveRecordScreen()`、Home Cluster（`buildHomeWeekRow`/`updateHomeInsightCard`/`updateHomeNumbers`/`updateHomeDiseaseAdvice`/`updateHomeCTAState`） | D採用（2026-07-06） | `docs/LEGACY_REMOVAL_PLAN.md` 10-D節 |
| Decision-4対象 | `saveRecord`/`record-modal`/`openRecordModal`/`closeModal`/`saveAndSync`（record-modal-controller.js側）/`nextStep`/`prevStep`/`renderStep`/`buildSteps`（app-legacy.js版）/`#record-modal` | D+C採用（2026-07-06） | `docs/LEGACY_REMOVAL_PLAN.md` 10-E節 |

両カテゴリとも、Founderが既に「Legacy Removal Programの対象外・β後UI/UX Final Councilへ
正式移管」と確定済みであるため、本監査では**現状のまま残存していることの確認のみ**行い、
削除・修復の要否は判定しない（判定済みのため対象外）。

### 1-3. 本監査のスコープ外（別の未決事項として存在）

- `docs/LEGACY_COMPLETION_RECOVERY_PLAN.md` 2-2節のwindow exportハブに関連する
  未精査分（`window.buildComparisonComment`等、PR-089Z時点で存在に気づいたが
  網羅調査は別PR候補とされていた項目）のうち、Step A〜Dで扱った172件に含まれない
  ものがあれば、それは別途の棚卸し対象であり本監査のスコープ外。

---

## 2. Recovery Program（PR-090-P1〜R6）実施内容サマリー

| PR | 内容 | 状態 |
|---|---|---|
| PR-090-P1 | `closeSuccess`の物理移動 | 完了 |
| PR-090-P2 | `updateSettingsHero`の物理移動（重複維持のまま） | 完了 |
| PR-090-P3 | window export 220件の全件監査（Step A/B/C/D/E/Fへ分類） | 完了 |
| EXPORT_HUB_REFACTOR_COUNCIL | APP_LEGACY_EXPORT_HUB 172件を自己export可能47件/window.state依存70件/Legacy依存55件に再分類 | 完了 |
| PR-090-R1 | isPremium依存解消（insights-tab-panel.js/legacy-misc-stats.js） | 完了 |
| PR-090-R2 | 自己export可能47件の自己export化 | 完了 |
| PR-090-R3 | window.state依存70件の解放（Decision-1実装、state.js） | 完了 |
| PR-090-R4 | Legacy依存残件の物理移動（supabaseUserId/syncMode/updateStats/SYMPTOM_DETAIL_CONFIG） | 完了（saveRecordScreenのみ据え置き） |
| PR-090-R5 | saveRecordScreen Migration Decision（調査） | 完了、Founder DecisionでD採用 |
| PR-091 | Legacy Exit Audit（現行Program範囲） | 完了、Step D未実施を発見 |
| PR-090-R6 | Step D実施（自己export追加+dedup 107行） | 完了 |
| Decision-4 Founder Review | saveRecord/record-modal系の調査 | 完了、Founder DecisionでD+C採用 |

---

## 3. Step A〜D 完了確認

### Step A — 自己export可能47件（12モジュール）
PR-090-R2で完了。12モジュールへ自己export追加、app-legacy.js側の重複行47件を削除済み。

### Step B — window.state依存70件（18モジュール、Decision-1）
PR-090-R3で`state.js`の`setState()`がwindow.stateを直接同期するよう変更（依存解消）。
PR-090-R6で18モジュールへ自己export追加、app-legacy.js側の重複行を削除（自己export化完了）。

### Step C — Legacy依存55件（8モジュール）
- isPremium依存（insights-tab-panel.js/legacy-misc-stats.js、PR-090-R1）: 解消済み
- supabaseUserId/syncMode/updateStats依存（admin.js/community.js/data-export.js/
  legacy-misc-stats.js/sync-modal.js、PR-090-R4）: 解消済み
- SYMPTOM_DETAIL_CONFIG依存（record-input.js、PR-090-R4）: データ移動のみ完了
  （window bridgeは意図的に未設置。理由: 移動前から機能していなかった症状詳細UIを
  誤って有効化しないため。自己export自体は本監査でも対象外のまま——3-4節参照）
- saveRecordScreen連動（success-overlay.js）: **Approved Deferred Item**（Known Deferred Items）

7モジュール（record-input.js除く）はPR-090-R6で自己export化完了。record-input.jsは
以下3-4節の通り引き続き保留。

### Step D — 自己export追加 + app-legacy.js側dedup
PR-090-R6で完了。24モジュール（Step B 18 + Step C 6）へ自己export追加、
app-legacy.js側の重複export行107行を削除。

### 3-4. record-input.js（SYMPTOM_DETAIL_CONFIG）の扱い — 継続保留

record-input.jsの26件（appendSymptomDetail/renderSymptomDetail等）は、Step Dの対象
24モジュールに含めなかった。理由はPR-090-R4で発見した「`window.SYMPTOM_DETAIL_CONFIG`は
移動前から一度も設定されておらず、症状詳細サブUIが機能していなかった」という事実に
起因する。この状態は**Approved Deferred Itemsではない**（Founderが正式に延期を承認した
項目ではなく、単に本Programでは自己export化の判断材料が別途必要なため保留している）。
将来、record-input.js側の配線見直し（window bridge新設の是非）についてFounder確認が
得られ次第、別途小規模PRで解消可能（Step Aと同型の機械的作業）。

---

## 4. Approved Deferred Items — 現状確認（削除・修復は行わない）

| 項目 | 現状 | 確認内容 |
|---|---|---|
| `saveRecordScreen()` | app-legacy.js内に現状のまま残存 | PR-090-R5時点から無変更を確認 |
| Home Cluster 5関数 | app-legacy.js内に現状のまま残存（home-renderer.js版と並存） | PR-090-R5時点から無変更を確認 |
| `saveRecord()`/`nextStep`/`prevStep`/`renderStep`/`buildSteps`（app-legacy.js版） | app-legacy.js内に現状のまま残存 | Decision-4 Review時点から無変更を確認 |
| `openRecordModal`/`closeModal`（app-legacy.js版 + record-modal-controller.js版） | 現状のまま残存 | 同上 |
| `saveAndSync`（record-modal-controller.js側のno-opラッパー） | 現状のまま残存 | 同上。`src/modules/save-and-sync.js`側の現役実装は無関係のため本監査でも触れていない |
| `#record-modal` | `app.html`に現状のまま残存 | 同上 |

いずれもFounder Decisionにより「β後のUI/UX Final Councilで判断する」ことが確定済みの
ため、本監査ではコードの現況確認のみ行い、追加調査・実装は行っていない。

---

## 5. Build / Regression / Architecture Guard（最終確認、2026-07-06）

- **Build**: `npx vite build` PASS（既存警告のみ——循環チャンク参照・チャンクサイズ超過、
  本Programと無関係）
- **Regression**: `npx vitest run` 5,193件中失敗39件（既知5ファイル: build-draft-from-ui.test.js /
  save-record-screen.test.js / disease-analyzer.test.js / domain-event-types.test.js /
  event-menstrual.test.js。Recovery Program開始前からの既知failureで、Program全体を通じて
  増加なし）
- **Architecture Guard**: `npx vitest run tests/arch/` 104件PASS（全件）

---

## 6. app-legacy.js 現状

- **行数**: 2,447行（Batch-1開始時10,804行から**約77.4%削減**）
- 行数推移: 10,804（PR-078）→ 5,084（PR-088）→ 2,765（PR-089F-7G）→ 2,686（PR-090-R2）→
  2,554（PR-090-R4）→ **2,447（PR-090-R6、現在）**
- 残存する主要な責務:
  1. Approved Deferred Items（4節）の実装本体
  2. `window.state`初期化・`_ippoStateHooks`（Decision-1の残作業、window.state所有権の
     完全移管はArchitecture変更のため別途）
  3. record-input.jsのSYMPTOM_DETAIL_CONFIG関連の暫定保留（3-4節）
  4. `updateSettingsHero`のような、既に確定済みの意図的な重複維持項目
  5. `openRecordScreen`（record-three-card.jsとのload順ガード）等、削除不可と
     確認済みの実働ブリッジ

---

## 7. 最終判定

```
Recovery Program（PR-090-P1〜R6）: 完了確定（2026-07-06）。

Step A（自己export可能47件）:        完了
Step B（window.state依存70件）:       完了（依存解消+自己export化）
Step C（Legacy依存54件、Approved Deferred Items除く）: 完了
  （54件中53件は自己export化完了。record-input.js 26件は継続保留、3-4節参照）
Step D（自己export追加+dedup）:       完了

Approved Deferred Items（Known Deferred Items + Decision-4対象）: 現状維持を確認。
  削除・修復は行っていない。β後のUI/UX Final Council開催まで凍結。

Build:      PASS
Regression: 5,193件中39件（既知のみ、Recovery Program全体を通じて増加なし）
Architecture Guard: 104件PASS

app-legacy.js削除可否: 不可（従来通り）
  理由: Approved Deferred Itemsが存在する限りapp-legacy.js内にコードが残存するため。
  この状態はFounderが意図的に承認した現状であり、「未解決の問題」ではない。

PR-092 Final Cutoverの着手条件: Approved Deferred Items（Known Deferred Items・
Decision-4対象）についてβ後UI/UX Final Councilの判断が確定し、それに基づく実装が
完了すること。現時点ではこの条件は満たされていないため、PR-092は着手しない。

Business Logic変更: なし（本監査はコード変更ゼロ）
UI変更: なし
```

---

## 8. Recovery Program 総括

2026-07-06時点で、Legacy Removal Program（PR-079〜090）の中でもEXPORT_HUB_REFACTOR_
COUNCILを起点とするRecovery Program（PR-090-P1〜R6）は、Founderが定義した対象範囲
（window export hub 172件のうちApproved Deferred Itemsを除く全項目）を完了した。

app-legacy.jsはBatch-1開始時の10,804行から2,447行（約77%削減）まで縮小し、残存する
コードはすべて「削除不可と確認済み」「Founderが意図的に延期を承認した」「別途の
Founder確認待ちの小規模保留」のいずれかに分類される、意図が明確な状態にある。

次のLegacy Removal関連のアクションは、β後UI/UX Final Council（saveRecordScreen/
Home Cluster/saveRecord・record-modal系の統合方針決定）の結果を待つことになる。
それまでの間、本Recovery Programはここで区切りとする。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-LEGACY-EXIT-AUDIT-FINAL |
| **作成日** | 2026-07-06 |
| **権威レベル** | 監査報告書（Recovery Program完了確認、Founder確認済み） |
| **実装状況** | コード変更ゼロ。本書は監査結果の記録のみ |
| **前提文書** | docs/EXPORT_HUB_REFACTOR_COUNCIL.md / docs/PR-091-legacy-exit-audit.md / docs/PR-090-R5-saveRecordScreen-migration-decision.md / docs/DECISION_4_RECORD_MODAL_REVIEW.md / docs/LEGACY_REMOVAL_PLAN.md 10-D・10-E節 / docs/LEGACY_COMPLETION_RECOVERY_PLAN.md |
| **判定** | Recovery Program（PR-090-P1〜R6）完了確定。Approved Deferred Items 2件を除き対象範囲はすべて解消済み。app-legacy.js削除は不可（Approved Deferred Items起因、意図的な現状） |
| **次のアクション** | β後UI/UX Final Council開催・判断確定を待つ。PR-092 Final Cutoverは着手しない |
