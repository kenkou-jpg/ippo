# IPPO EVOLUTION PROGRAM — マスターダッシュボード兼ハンドブック

## プロジェクト概要

ippoの設計・実装を進めている。

> **製品定義（2026-07-07 Release Readiness Council Review v2 で正式確認、BD-061/BD-062）**:
> IPPOは「自己実験プラットフォーム」である。ユーザー自身が食事・睡眠・運動・断食・サプリ・
> 生活習慣などを組み合わせて自分自身の身体で実験し、結果を記録・比較・分析するためのアプリ。
> 診断・治療・医療判断・医師への指示・症状改善の保証は一切行わない。AIの役割は記録整理・
> 要約・傾向分析・自己実験結果の可視化・類似パターン表示に限定される。
> 詳細: docs/RELEASE_READINESS_COUNCIL.md 21章。以下の本文書内の記述（「女性疾患」「疾患プラットフォーム」等）は
> Wave1〜Wave2設計当時の呼称であり、歴史的記録として保持する（Append-Only方針により本文は書き換えない）。

作業ブランチ: feat/phase4d-batch1-record-input

リポジトリ: C:/Users/USER/Documents/ippo

---

## Governing Document Hierarchy

設計変更時はこの優先順位を厳守する。矛盾がある場合は上位文書が正。

### LEVEL-1 — Binding Authority（変更にはFounder承認 + Council開催が必要）

| 文書 | ファイル | 主な管轄 |
|---|---|---|
| LEGACY ASSET INVENTORY | docs/LEGACY_ASSET_INVENTORY.md | 資産戦略・BD-001〜BD-014 |
| NETWORK ASSET COUNCIL | docs/NETWORK_ASSET_COUNCIL.md | Signal Schema・Edge属性・Longitudinal / BD-009〜BD-014 |
| DATA ASSET COUNCIL | docs/DATA_ASSET_COUNCIL.md | データ資産8層・BD-015〜BD-025 |
| NETWORK EVOLUTION COUNCIL | docs/NETWORK_EVOLUTION_COUNCIL.md | 7フェーズ進化モデル・BD-026〜BD-033 |
| WAVE2 MASTER DESIGN | docs/WAVE2_MASTER_DESIGN.md | Wave2全体設計・BD-034〜BD-043 |
| WAVE2 ARCHITECTURE | docs/WAVE2_ARCHITECTURE.md | Wave2技術憲法 |
| WAVE2 ROADMAP | docs/WAVE2_ROADMAP.md | PR-041〜075 / 35PR |
| WAVE2 IMPLEMENTATION GOVERNANCE | docs/WAVE2_IMPLEMENTATION_GOVERNANCE.md | 品質ゲート・GP-01〜GP-08 |
| BUSINESS STRATEGY | docs/BUSINESS_STRATEGY.md | 事業モデル・価格・BBS-001〜006 |
| GROWTH STRATEGY | docs/GROWTH_STRATEGY.md | 成長戦略・KPI・BGS-001〜005 |
| REGULATORY & MEDICAL COUNCIL | docs/REGULATORY_MEDICAL_COUNCIL.md | 規制・医療・倫理・BD-044〜052 |
| GO-TO-MARKET COUNCIL | docs/GTM_COUNCIL.md | 市場投入戦略・BD-053〜060 |
| FOUNDER STRATEGIC REVIEW | docs/FOUNDER_STRATEGIC_REVIEW_WAVE2.md | Wave2 Go/No-Go 監査（CONDITIONAL GO） |
| RELEASE READINESS COUNCIL | docs/RELEASE_READINESS_COUNCIL.md | β公開可否監査・製品定義（自己実験プラットフォーム）・BD-061〜062 |

### LEVEL-2 — Architecture Authority（変更にはアーキテクチャレビューが必要）

| 文書 | ファイル | 主な管轄 |
|---|---|---|
| Architecture V3 | docs/ARCHITECTURE_V3.md | Strangler-Fig戦略・レイヤー定義 |
| Implementation Plan | docs/IMPLEMENTATION_PLAN_V1.md | PRロードマップ・74PR計画（Wave1）|
| Domain Model | docs/DOMAIN_MODEL_V1.md | エンティティ・集約境界 |
| Schema V1 | docs/SCHEMA_V1.md | DBスキーマ確定 |
| Repository Constitution | docs/REPOSITORY_CONSTITUTION_V1.md | コーディング規約・DI設計 |

### LEVEL-3 — Implementation Reference（PR単位で更新可）

| 文書 | 主な管轄 |
|---|---|
| PR Spec（各会話内） | 個別PRの実装詳細・制約 |
| Test Files | 仕様の機械的証明 |
| このHANDOFF文書 | 引き継ぎ・現在地確認 |

---

## 戦略設計フェーズ 完了ステータス

| Council | 文書番号 | 最終判定 | BD |
|---|---|---|---|
| Business Strategy Council | IPPO-BUSINESS-001 | CONDITIONAL GO | BBS-001〜006 |
| Growth Strategy Council | IPPO-GROWTH-001 | GO | BGS-001〜005 |
| Regulatory & Medical Council | IPPO-REGULATORY-001 | CONDITIONAL GO（5条件）| BD-044〜052 |
| Go-To-Market Council | IPPO-GTM-001 | GO | BD-053〜060 |

**本文書をもって IPPO 戦略設計フェーズ完了。**

### 戦略上の条件（Regulatory CONDITIONAL GO 5条件）

| # | 条件 | 期限 |
|---|---|---|
| C-1 | プライバシーポリシー弁護士レビュー + 要配慮個人情報対応 | Wave2 Phase A 前 |
| C-2 | 医師アドバイザー1名招聘 | Wave2 Phase D 前 |
| C-3 | SaMD非該当の書面見解取得（BD-051）| Wave2 Phase D 前 |
| C-4 | Research Consent追加（BD-049）| Wave2 Phase B 前 |
| C-5 | Research Dataset提供契約書雛形作成 | Wave2 Phase F 前 |

> **2026-07-07 更新**: 上記5条件はRelease Readiness Council Review v2（docs/RELEASE_READINESS_COUNCIL.md 21章）
> により再監査済み。C-2（医師アドバイザー招聘）・C-3（SaMD書面見解）は現行の製品定義（自己実験プラットフォーム、
> BD-061/BD-062）では非適用。C-1は推奨へ格下げ。C-4はデータ利用同意として縮小再定義。表自体は当時の記録として保持する。

**PR-OPS-06: Release Readiness Council Review v2 の正式反映**（2026-07-07・文書のみ、コード変更ゼロ）
- docs/RELEASE_READINESS_COUNCIL.md 21章追加（製品定義再監査、Critical 5件→2件、BD-061/062新設、Score 93→95/100）
- docs/release-readiness/FOUNDER_ACTION_CHECKLIST.md 更新（対象2件へ圧縮、対象外4件を記録）
- docs/release-readiness/MEDICAL_ADVISOR_REQUEST.md・SAMD_OPINION_REQUEST.md に非適用注記追加（confirmed:falseは維持）
- 本HANDOFFの製品概要・戦略上の条件表・Governing Document Hierarchy・BD registryを更新
- Decision Log: 本PRで更新済み（Founder Strategy変更・Business変更に該当するため）。詳細はdocs/RELEASE_READINESS_COUNCIL.md 21章を正とする
- 判定: CONDITIONAL GO 継続（Release Readiness Score: 95/100）。Next: NEW-C-1（免責文言・利用規約・プライバシーポリシーの実装）／C-4再定義（データ利用同意の明確化）

**PR-092A: Home Cluster統合**（2026-07-07・UI/UX Final Council採用、Founder承認済み）
- buildHomeWeekRow/updateHomeInsightCard/updateHomeNumbers/updateHomeDiseaseAdvice/updateHomeCTAState/updateStatsを
  `src/modules/home-renderer.js`の統合版へ一本化。`src/app-legacy.js`側の重複ローカル実装を削除し、
  該当6関数をhome-renderer.jsからimportする形に変更（bare呼び出し箇所は変更不要）
- buildHomeWeekRow: 新仕様（円形セルの視覚言語を保ちつつ、痛みレベル4段階色分け+生理周期フェーズ色を統合。
  従来renderer版が呼んでいなかった`buildPhaseBar(monday)`も統合）
- updateHomeCTAState: 新仕様（daily-checkin完了基準を正式採用、完了時サブテキストに
  `buildComparisonComment()`（前回比較コメント）を統合）
- updateHomeInsightCard: 統合（`window.buildHomeInsight()`パケット優先ロジックを追加。
  `src/home/home-insight-engine.js`は現時点でどこからもimportされておらず常にfalseのため
  挙動変更なし、将来同エンジンがバンドルされた場合に自動的に有効化される設計）
- updateHomeNumbers/updateHomeDiseaseAdvice/updateStats: 統合（home-renderer.js側の既存実装を正とし、
  legacy-misc-stats.js側の重複実装・関連import（calcPainFreeDaysThisMonth/calcAvgPainThisMonth）を削除、
  data-export.jsのimport元をhome-renderer.jsへ変更）
- app-legacy.js: 964〜1419行付近の6関数ローカル実装削除、未使用となったcycle-utils.js import
  （getPhaseForDate/isPeriodExpected/buildComparisonComment/buildDayComparison/buildWeekComparison）を削除
- tests/arch/legacy-removal-pr079-line-count-guard.test.js: BASELINE_LINE_COUNTを2,447→2,278
  （app-legacy.js実測170行減、`split('\n').length`基準）に更新
- Build: `npx vite build` PASS（既知の循環チャンク警告のみ）
- Regression: `npx vitest run` 5,193件中5,154件PASS（既知失敗39件・5ファイルのみ、Recovery Program baseline通り増加なし）
- Architecture Guard: `npx vitest run tests/arch/` 104件PASS（全件）
- Browser Verification: 開発サーバーでシード済みstateを用いて確認。週間カレンダー（痛みレベル色分け+✓）・
  CTAカード（「✓ 今日をふり返る」+ buildComparisonCommentによる動的コメント）が意図通り描画されることを確認

**⚠ 重要な新規発見（PR-092B着手前にFounder確認が必要）**
```
Browser Verification中に、UI/UX Final Council（および本HANDOFF・LEGACY_REMOVAL_PLAN・
PR-090-R5・Decision-4のいずれの文書）も認識していなかった事実が判明した:

1. src/modules/home-next/ に、ホーム画面の完全に別実装（home-next-shell.js他11ファイル）が
   存在し、`isHomeNextEnabled()`はデフォルトで有効（フラグ未設定時もtrueを返す実装、
   src/main.jsのコメント「フラグOFFの場合は既存homeに影響しない」は現状のコードと矛盾する
   陳腐化した記載）。
2. home-next有効時、`initHomeNext()`が`window.showMain`をhome-next版に差し替え、かつ
   `window.buildHomeWeekRow`等5関数を明示的にno-op化する（home-next-shell.js:242-248）。
   ただしapp-legacy.js側は本PRでbare importに変更したためwindow経由ではなくimportされた
   実体を直接参照しており、この差し替えの影響は受けない（意図せず無効化されてはいない）。
3. `src/screens/home-next.html`には`#home-week-row`/`#home-cta-card`/`#home-insight-card`等
   Home Cluster対象DOMが一切存在しない。これらのDOM自体は`#screen-home`として引き続き
   DOMに存在する（screen-router.jsは非activeスクリーンをDOMから除去しない）が、
   home-next有効時はユーザーの目に触れない。
4. `saveRecordScreen()`等の記録保存経路から`window.ippoHomeNext.render()`
   （home-next再描画の正式エントリポイント）を呼ぶ箇所が見当たらない。cloudRestore成功時と
   settings-profile-changedイベント時のみ再描画される。
5. 副次的に、`updateHomeCTA()`（updateHomeCTAStateとは別の第3の実装、home-renderer.js:1061）が
   同じ`#home-cta-title`/`#home-cta-sub`/`#home-cta-card`を対象にしており、
   Council/既存文書のいずれもこの関数の存在に言及していなかった。

含意: UI/UX Final Councilの「保存直後とタブ切替後で見た目が異なる」という問題認識は、
home-next有効時（デフォルト）のユーザーには当てはまらない可能性が高い。PR-092A自体は
安全（テスト全件PASS・重複コード削減・home-next側への影響なし）だが、PR-092B
（saveRecordScreen物理移動）・以降の作業を「Home Clusterの統合によりUXが改善する」という
前提のまま進めてよいかはFounder確認が必要と判断し、PR-092B着手前に報告する。
```

**PR-092A-1: home-next 実態調査**（2026-07-07・Founder指示、コード変更ゼロ）
- 詳細: [docs/PR-092A-1-home-next-reality-audit.md](PR-092A-1-home-next-reality-audit.md)
- 実測確認（開発サーバー、state注入 + save/switchTab直接実行）:
  1. 実際に表示されるHomeはhome-next（デフォルト有効、`#screen-home`はDOM上に存在するが非表示）
  2. 保存直後、home-nextは自動更新**されない**（`window.saveRecordScreen()`実行後も`#hn-status`内容は変化なし）
  3. タブ切替時、home-nextは正しく最新state を反映**する**（`window.switchTab('home', null)`実行後
     `#hn-status`が保存済みの新しい記録を反映）
  4. `disableHomeNext()`が`localStorage`キーを削除するのみで`isHomeNextEnabled()`の
     `flag !== '0'`判定と噛み合わず、home-next無効化が機能しない副次的バグを発見
     （PR-092A-1のスコープ外、Founder参考情報として記録）
  5. `updateHomeCTA()`（`updateHomeCTAState`とは別の第3実装）は、全4呼び出し箇所で
     常に`updateHomeCTAState()`より先に呼ばれるため実害はないが、実質無意味なコードと確認
  6. `#screen-record`の`data-legacy-isolated`/`data-replacement`属性は陳腐化した記載で、
     実際には`editPastRecord()`（カレンダー経由の過去日編集、現役機能）から到達可能と確認。
     `saveRecordScreen()`はDead Codeではない
- 判定: PR-092Bへ進めてよい。home-nextへの即時反映追加・disableHomeNext()バグ修正・
  `updateHomeCTA()`整理はいずれもBusiness Logic拡張のためPR-092Bのスコープに含めず、
  別途Founder判断が必要な項目として切り出し済み（詳細は監査文書4-C節）
- Decision Log: 更新不要（Roadmap/Architecture/Business/Founder Strategy変更なし、調査のみ）
- Next: Founder承認後、PR-092B（saveRecordScreen物理移動、正当化理由を4-Bの通り修正）に着手

**PR-092B: saveRecordScreen物理移動**（2026-07-07・UI/UX Final Council採用、Founder承認済み）
- `saveRecordScreen()`を`src/app-legacy.js`から`src/modules/record-screen.js`へ物理移動。
  Business Logic変更なし（既存保存ロジックを完全維持、bare `state`→`window.state`変換 +
  import解決のみ）
- 新規import: `gatherRecordData`/`gatherDiseaseData`（record-edit.js）、`toLocalDateKey`
  （utils/string-utils.js）、`calcSMIScore`（utils/stats-utils.js）、`parseMealMemo`
  （meal-tracker.js）、`calcWellnessScore`（pro/shared/pro-metric-utils.js）、
  `showAlertModal`（ui-notifications.js）、`saveSymptomSelection`（symptom-settings.js）、
  `updateHomeCTA`/`updateHomeSummary`/`updateStreakBadge`/Home Cluster6関数/
  `updateDailyHintCard`/`updateTodayMessage`（home-renderer.js）、`checkAndShowTempAlert`
  （temp-alert.js）、`updateFastingWidgetPhase`（fasting.js）、`getCurrentCyclePhase`
  （analytics/cycle-engine.js）、`saveAndSync`（save-and-sync.js）
- `cloudBackupAll`/`saveState`の2件のみapp-legacy.js側にローカル実装が残置されており
  （window版が未設定の場合のみ使われるフォールバック）、`window.__ippoLegacyCloudBackupAll`/
  `window.__ippoLegacySaveState`ブリッジを新設して既存フォールバック挙動を完全に保持
- `showToast`（クラウド同期2回失敗時のみ到達する内側catch内）は移動元でもbare参照未解決
  （到達時ReferenceErrorとなるpre-existingの潜在バグ）のため、Scope（Business Logic変更禁止）
  に従いそのまま同一のbare参照として移植（修正しない）
- app-legacy.js側: `saveRecordScreen()`本体・`window.saveRecordScreen`bridge行を削除。
  本関数専用だった7件のimport（gatherRecordData/gatherDiseaseData/toLocalDateKey/
  calcSMIScore/calcWellnessScore/saveSymptomSelection/getCurrentCyclePhase）も
  orphan化したため削除（同じimport文内の他の現役シンボルは維持）
- record-screen.js側: `saveRecordScreen`を自己export化（`window.saveRecordScreen = saveRecordScreen;`）
- tests/arch/legacy-removal-pr079-line-count-guard.test.js: BASELINE_LINE_COUNTを2,278→2,077
  （app-legacy.js実測201行減）に更新
- **調査で判明した事実（Scope変更には至らないが記録）**: `src/modules/record.js`にも
  `saveRecordScreen`/`_saveRecordScreenImpl`という別実装が存在し、「app-legacy.js廃止後の
  フォールバック」として設計されているが、`window.saveRecordScreen`が未設定の場合のみ
  自身を割り当てるガードを持つため、現在は休眠状態（app-legacy.js/record-screen.js側の
  実装が既に`window.saveRecordScreen`を占有しているため）。実機のwrapper chain追跡により、
  現在実行される実体が本PRで移動した実装であることを確認済み（record.js側の実装は
  競合しない）。record.js側は`../../domains/record/record.service.js`を静的importするが、
  このパスはプロジェクトルート直下の`domains/record/record.service.ts`（TypeScript、
  `src/`外の別ドメイン層）に解決される（vite build/dev下では解決成功、vitestの解決設定との
  差異により`tests/modules/save-record-screen.test.js`等の既知失敗が発生している、
  との推定）。将来record.jsへの完全移行を検討する際は、この別TypeScriptドメイン層
  （`domains/record/*.ts`）の存在を前提に精査すること
- Build: `npx vite build` PASS（既知の循環チャンク警告のみ）
- Regression: `npx vitest run` 5,193件中5,154件PASS（既知失敗39件・5ファイルのみ、増加なし）
- Architecture Guard: `npx vitest run tests/arch/` 104件PASS（全件）
- Browser Verification: 開発サーバーでカレンダー経由の過去日編集（`editPastRecord`→
  `#screen-record`→`saveRecordScreen()`）を実行し、既存レコードの上書き保存・
  `editingDate`リセット・成功オーバーレイ表示・Home Cluster再描画が正しく動作することを確認。
  新規レコード保存（`totalDays`/`streak`更新含む）も別途確認。Console Errorは既知の
  vite websocket接続失敗ノイズのみ
- Decision Log: 更新不要（Roadmap/Architecture/Business/Founder Strategy変更なし）
- 判定: PR-092Bはこれをもって完了。禁止事項（home-next即時反映追加・disableHomeNext修正・
  updateHomeCTA整理・Home UX変更・Business Logic変更・Architecture変更）はいずれも実施していない
- Next: PR-092C着手前確認（HIGH risk、Founderへの個別Go要求）

**PR-092C: record-modal完全終了**（2026-07-07・UI/UX Final Council採用・Decision-4確定内容の実施、Founder承認済み）
- 削除: `#record-modal`（`app.html:1178-1204`、HTMLブロック全体）
- 削除: `switchTab`（app-legacy.js版ローカル実装。`window.switchTab`はtab-navigation.js版が
  引き続き保持し無変更。app-legacy.js版はcloseModal()経由のbare呼び出し専用だったため削除）
- 削除: `_prevTab` / `openRecordModal()` / `closeModal()` / `window.__ippoLegacyOpenRecordModal`ブリッジ
- 削除: `saveRecord()`（旧5ステップwizard保存ハンドラ、Decision-4で到達経路ゼロを確認済み）
- 削除: `renderStep`/`nextStep`/`prevStep`/`buildSteps`（app-legacy.js側のconst alias 4件と
  そのwindowブリッジ4件。実体である`record-input.js`側・3-card UIでの利用は無変更）
- 削除: `src/modules/record-modal-controller.js`（openRecordModal/closeModal/saveAndSyncの
  no-op export、実測でいずれも`_inline*`が常にnullと確認済み）。`main.js`のimportも削除
- 削除: `ui-notifications.js`・`app-legacy.js`（2箇所重複していたことを実装中に発見）の
  Escapeキーハンドラから`#record-modal`分岐を削除
- 置換: `home-renderer.js`の`handleHomeCTA()`フォールバック分岐を、
  `window.__ippoLegacyOpenRecordModal()`呼び出しから`window.showToast()`による
  最小限のエラー通知（「読み込みに問題が発生しました。ページを再読み込みしてください。」）に置換
- 副次的なorphan import削除: `getSuccessMessage`（旧saveRecord用、success-message.js）
- `save-and-sync.js`本体・`record-input.js`実体・`tab-navigation.js`版switchTabには
  一切触れていない（Founder条件を遵守）
- tests/arch/legacy-removal-pr079-line-count-guard.test.js: BASELINE_LINE_COUNTを2,077→1,918
  （app-legacy.js実測159行減）に更新
- Build: `npx vite build` PASS（既知の循環チャンク警告のみ）
- Regression: `npx vitest run` 5,193件中5,154件PASS（既知失敗39件・5ファイルのみ、増加なし）
- Architecture Guard: `npx vitest run tests/arch/` 104件PASS（全件）
- Browser Verification:
  - `#record-modal`がDOMに存在しないことを確認
  - 通常の3-card記録フロー（handleHomeCTA→screen-record-three-card）が無変更で動作することを確認
  - カレンダー経由の過去日編集（editPastRecord→#screen-record→saveRecordScreen、PR-092Bの経路）が
    record-modal-controller.js削除後も無変更で動作することを確認
  - `window.openRecordScreen`未定義時の新フォールバック（showToastによるエラー通知）が
    正しく表示され、`#record-modal`は表示されないことを確認
  - Escapeキーによる他のオーバーレイ（dmOverlay等）の開閉が無変更で動作することを確認
  - **検証中の注記**: 開発サーバーに登録済みのService Workerが変更前のバンドルをキャッシュしており、
    最初の検証で`window.openRecordModal`等が誤って「まだ存在する」ように見えた。
    Service Worker登録解除 + Cache Storage削除後に再検証し、削除が正しく反映されていることを
    確認した。実装上の問題ではなくブラウザ側のキャッシュによる見かけ上の結果であったため、
    Rollback Planは発動していない
  - Console Errorは既知のvite websocketノイズのみ
- Decision Log: 更新不要（Roadmap/Architecture/Business/Founder Strategy変更なし）
- 判定: PR-092Cはこれをもって完了。禁止事項（Business Logic追加・UI追加・Architecture変更・
  Scope外変更・save-and-sync.js本体変更・record-input.js実体変更・tab-navigation.js版switchTab変更）
  はいずれも実施していない
- Next: PR-092D（Final Cutover Exit Audit）

**PR-092D: Final Cutover Exit Audit**（2026-07-07・コード変更ゼロ、監査のみ）
- 詳細: [docs/PR-092D-final-cutover-exit-audit.md](PR-092D-final-cutover-exit-audit.md)
- 目的: PR-092A〜C（UI/UX Final Council採用・Decision-3/Decision-4実施）の成果を
  実コードで再確認し、PR-092 Final Cutoverの区切りを確定する監査
- 確認結果: Decision-3対象（Home Cluster 6関数・saveRecordScreen）・Decision-4対象
  （saveRecord/openRecordModal/closeModal/record-modal-controller.js/nextStep/
  prevStep/renderStep/buildSteps/`#record-modal`）はいずれもapp-legacy.js・app.html・
  src/modules/から実装ゼロ件を確認（grepで再検証、報告内容と差異なし）
- Build: `npx vite build` PASS（既知警告のみ）
- Regression: `npx vitest run` 5,193件中5,154件PASS（既知失敗39件、PR-092C時点から増加なし）
- Architecture Guard: `npx vitest run tests/arch/` 104件PASS（全件）
- app-legacy.js: 1,917行（PR-092C完了時点の1,918行から不変。BASELINE_LINE_COUNT=1,918のまま）
- 副次的発見（対応不要・Founder確認事項）: `.claude/worktrees/`配下に古いgit worktree
  ディレクトリが多数残存し、削除済みのはずの`record-modal`実装を含む古いスナップショットが
  存在することを確認。現行の`src/`・ルート`app.html`には影響しないため本監査スコープ外。
  整理の要否はFounder判断
- Decision Log: 更新不要（Architecture/Roadmap/Business/Founder Strategy変更なし。
  監査のみ）
- 判定: PR-092 Final Cutover（PR-092A〜C）完了確定。Approved Deferred Items
  （Decision-3・Decision-4対象）の未解消項目なし
- Next: 次工程（Release Preparation等）の要否・進行はFounderが別途判断する

---

## Current Architecture Snapshot（PR-048時点）

### Domains（実装済み）

| Domain | 主要サービス | 状態 |
|---|---|---|
| Record | RecordRepositoryImpl / RecordCommandService / RecordQueryService / DualWrite | Wave1完了 |
| Experiment | ExperimentRepositoryImpl / ExperimentStateMachine / ExperimentLifecycleService | Wave1完了 |
| Case | CaseRepositoryImpl / CaseGenerationService / TierEvaluator / OutcomeResolver | Wave1完了 |
| Consent | ConsentRepositoryImpl / ConsentEnforcementService | Wave1完了 |
| Similarity | VectorBuilder(8dim) / SimilarityCalculator / EdgeGenerator / SimilarityEngine | Wave1完了（非公開） |
| Auth | PermissionService / SimilarityAccessGuard | Wave1完了 |
| Symptom | symptom-types(SSOT) / symptom-entity / symptom-validator / symptom-service | Wave1完了 |
| Disease | disease-types(SSOT) / disease-entity / disease-validator / disease-service | Wave1完了 |
| Network Signal | network-signal-types(SSOT) / signal-entity / validator / service | Wave1完了 |
| Signal Intelligence | signal-aggregation / signal-trend / signal-timeline / signal-summary | Wave1完了 |
| Longitudinal | trend-window-builder / moving-average / baseline / longitudinal-signal / longitudinal-summary | Wave1完了 |
| Communication | NotificationSchedule / Template / Metrics | Wave1完了 |
| Delivery | DeliveryQueue / Scheduler / Processor / Retry / HealthMetrics | Wave1完了 |
| Analytics | KpiSnapshot / Wave1Dashboard / SnapshotAutomation / KpiScheduler | Wave1完了 |
| B2B Export | 匿名化 / アクセス制御 / 監査ログ | Wave1完了 |
| Event Sourcing | EventStore / EventBus / EventPublisher / EventReplayService / AuditTimelineService | PR-037完了 |
| Emotion | emotion-types(SSOT) / emotion-entity / emotion-validator / emotion-repository / emotion-service / emotion-signal-mapper | PR-038完了 |
| Menstrual | menstrual-types(SSOT) / menstrual-entity / menstrual-validator / menstrual-repository / menstrual-service / phase-calculator / cycle-analysis-service | PR-039完了 |
| Research Dataset | research-dataset-repository / research-dataset-builder / research-dataset-service / anonymization-service / dataset-export-service | PR-040完了 |
| **NetworkSignal V2 (Repository Interface)** | INetworkSignalRepository / NetworkSignalMemoryRepository / NetworkSignalPersistenceService / RepositoryFactory / RepositoryProvider / PersistenceConfig | **PR-041完了** |
| **NetworkSignal V2 (Supabase永続化)** | NetworkSignalSupabaseRepository / SupabaseEventPersistenceRepository / PersistenceConfig(supabase) | **PR-042完了** |
| **Disease Cluster Statistics** | disease-cluster-statistics-service / disease-cluster-snapshot-entity / DiseaseClusterStatisticsService(DI) | **PR-046完了** |
| **FeatureVector V2 (12次元)** | feature-vector-v2-types / feature-vector-v2-entity / feature-vector-v2-repository(BD-042) / feature-vector-v2-builder / feature-vector-v2-service | **PR-047完了** |
| **Longitudinal Edge Enricher** | longitudinal-edge-enricher / LongitudinalEdgeEnricher / computeCaseTrend / TREND_BONUS=0.05 / displayScore=rawScore+trendBonus | **PR-048完了** |
| **Environmental Signal Collector** | environmental-signal-types(SSOT) / EnvironmentalSignalCollector / computeLunarAge / computeLunarPhase / EnvironmentalSignalSnapshotService / ENVIRONMENTAL_SIGNAL_RECORDED | **PR-049完了** |
| **Signal Intelligence V2** | signal-intelligence-v2-service / SignalIntelligenceV2Service / aggregateByPhase / BD-024 Emotion含む全6種別 / createDailySnapshot | **PR-050完了** |
| **Knowledge Graph Foundation** | knowledge-graph-types(SSOT) / knowledge-graph-node-entity / knowledge-graph-edge-entity / knowledge-graph-repository(Append-Only) / knowledge-graph-service / KNOWLEDGE_GRAPH_NODE_ADDED / KNOWLEDGE_GRAPH_EDGE_ADDED | **PR-051完了** |
| **Knowledge Graph Builder** | knowledge-graph-builder / KnowledgeGraphBuilder.build() / Disease×Symptom×Outcome×Phase×SignalPattern / 全6エッジ種別 / knowledge-graph-snapshot-entity / KgVersion / KNOWLEDGE_GRAPH_SNAPSHOT_CREATED | **PR-052完了** |

### Architecture Health

```
Features (RouteRegistry):  62（PR-078: KNOWN_FEATURESに'DataDeletion'追加。既存17ファイルの固定値ドリフト(61→62)を是正 — PR-073/075/077と同型の回帰）
ApiGateway methods:        185+（PR-078: requestDataDeletion / confirmDataDeletionAnonymization / confirmDataDeletionSoftDelete / executeDataHardDelete / getDataDeletionRequestStatus / getAllDataDeletionRequests / getDataDeletionStatus の7メソッド追加）
Domain Event Types:        49（PR-078: DATA_DELETION_STAGE_ADVANCED追加）
DI TOKENS:                 333（PR-078: DataDeletionRepository / DataDeletionService追加）
Tests (全パス):            5,149件 / 279ファイル（39件は5ファイルの既知pre-existing failure、PR無関係。内訳: tests/modules/2ファイル(壊れたインポート) + domain-event-types.test.js + event-menstrual.test.js(29固定値ドリフト) + disease-analyzer.test.js(日付依存)。PR-078でtests/data-deletion/に32件・tests/arch/architecture-guard-pr078.test.jsに3件追加（既知failure件数・対象ファイルとも増加なしを確認済み））
ArchitectureGuard rules:   165（PR-078: screen/feature→DataDeletionService直接アクセス禁止 +2ルール）
Architecture Health:       A（違反ゼロ）
Technical Debt:            TD-001〜（TECHNICAL_DEBT_AUDIT.md参照。2026-06-24時点のまま陳腐化 — docs/RELEASE_READINESS_COUNCIL.md M-1で指摘済み、未再生成）
```

### Layer Stack（Strangler-Fig — Wave2 Phase A-2完了）

```
UI / Legacy (app-legacy.js)
         ↓  ApiGateway (82 methods)
Application Layer (CompositionRoot / DI Container)
         ↓
Domain Services (21 domains)
         ↓
NetworkSignalPersistenceService (Decorator / Event Publishing)
         ↓
NetworkSignalSupabaseRepository (Write-Through Cache + Supabase INSERT)
         ↓
Event Sourcing Layer (EventStore / SupabaseEventPersistenceRepository / BD-015)
         ↓
Supabase (network_signals / ippo_events)
```

---

## Roadmap Status

```
Phase 5 (基盤設計)
  ✓ PR-001〜010  基盤スケルトン / ドメイン実装 / E2E

Phase 6 (Strangler-Fig移行)
  ✓ PR-011       Bootstrap Bridge (DI / CompositionRoot / ArchGuard)
  ✓ PR-011.5     Contract Layer
  ✓ PR-012       Infrastructure Adapter Layer
  ✓ PR-013       Record Migration Hook
  ✓ PR-014       Dual Write & Diff Audit
  ✓ PR-015       Experiment Core Migration
  ✓ PR-016       Experiment State Machine & Case Foundation
  ✓ PR-017       Case Generation Engine V1
  ✓ PR-018       Consent Enforcement & Similarity Foundation
  ✓ PR-019       Similarity Engine V1

Phase 7 (Intelligence Foundation) — Wave1完了
  ✓ PR-020       Auth Domain & API Gateway
  ✓ PR-021       Record V2 ReadSwitch + UX Foundation
  ✓ PR-022       Engagement & Consent Layer
  ✓ PR-023       Communication Decision Layer
  ✓ PR-024       Delivery & Admin Analytics Layer
  ✓ PR-025       Delivery Infrastructure Completion
  ✓ PR-026       Operations & KPI Automation
  ✓ PR-027       Operations Automation & Analytics Completion
  ✓ PR-028       Symptom Intelligence Foundation
  ✓ PR-029       Disease Entity Foundation
  ✓ PR-030       Network Signal Foundation (137 tests)
  ✓ PR-031       Signal Intelligence Foundation (+118 tests)
  ✓ PR-032       Longitudinal Signal Foundation (+125 tests)
  ✓ PR-033       NetworkSignal Persistence / Disease Cluster / Snapshot / Similarity Intelligence
  ✓ PR-034       Disease Cluster Foundation (BD-009)
  ✓ PR-035       Signal Snapshot Foundation（日次/週次）
  ✓ PR-036       Similarity Intelligence Foundation（NetworkScore）
  ✓ PR-037       Event Sourcing Foundation（EventStore / EventBus / EventPublisher / BD-015・BD-017）
  ✓ PR-038       Emotion Signal Foundation（emotion-types / entity / validator / repository / service / mapper）
  ✓ PR-039       Menstrual Intelligence Foundation（menstrual-types / entity / validator / repository / service / phase-calculator / cycle-analysis）
  ✓ PR-040       Research Dataset Foundation（BD-021 / research-dataset-repository / builder / service / anonymization / export）

Wave2 (PR-041〜075) — 全PR実装完了。Wave2正式完了 済（Founder承認取得済み、BD-027/BD-040）
  Phase A (PR-041〜045): Supabase Migration Foundation
    ✓ PR-041  NetworkSignal Repository V2 — Interface / Adapter / Factory / PersistenceService / Migration / DI
    ✓ PR-042  Supabase Persistence Foundation — NetworkSignalSupabaseRepository / SupabaseEventPersistenceRepository / backend切替
    ✓ PR-043  Emotion Signal Generation
    ✓ PR-044  MenstrualPhase Auto-Resolution — MenstrualPhaseResolverService / MENSTRUAL_PHASE_RESOLVED / saveRecord統合
    ✓ PR-045  Disease Entity V2 Upgrade — DiseaseEntityUpgradeService / CONFIRMED_BY / diseaseKey / DISEASE_ENTITY_UPGRADED
  Phase B (PR-046〜050): Disease Entity V2 + Cluster Statistics
    ✓ PR-046  Disease Cluster Statistics — DiseaseClusterStatisticsService / computeClusterProfile / createClusterSnapshot / BD-028
    ✓ PR-047  FeatureVector V2 — 12次元 / VECTOR_VERSION='2' / FeatureVectorV2Builder / BD-042 V1/V2 混在ガード
    ✓ PR-048  Longitudinal Edge Enricher — LongitudinalEdgeEnricher / computeCaseTrend / displayScore=rawScore+trendBonus / BD-012
    ✓ PR-049  Environmental Signal Collector — EnvironmentalSignalCollector / computeLunarPhase / EnvironmentalSignalSnapshotService / BD-043
    ✓ PR-050  Signal Intelligence V2 — SignalIntelligenceV2Service / aggregateByPhase / BD-024 Emotion含む全6種別 / createDailySnapshot / BD-022
  Phase C (PR-051〜056): Knowledge Graph Foundation
    ✓ PR-051  Knowledge Graph Foundation — KgNodeEntity / KgEdgeEntity / KnowledgeGraphRepository(Append-Only BD-036) / KnowledgeGraphService / KNOWLEDGE_GRAPH_NODE_ADDED / KNOWLEDGE_GRAPH_EDGE_ADDED / ArchGuard+8ルール
    ✓ PR-052  Knowledge Graph Builder — KnowledgeGraphBuilder.build() / Disease×Symptom×Outcome×Phase×SignalPattern / 全6エッジ種別(HAS_SYMPTOM/OBSERVED_IN/WORSE_IN_PHASE/LEADS_TO_OUTCOME/COMORBID_WITH/SIGNAL_INDICATES) / KgSnapshot(BD-018) / KNOWLEDGE_GRAPH_SNAPSHOT_CREATED / ArchGuard+4ルール
    ✓ PR-053  Feature Store V1 — FeatureStoreService.compute() / Feature 6種(avg_pain_30d/avg_sleep_30d/avg_symptom_30d/menstrual_regularity/longitudinal_delta_pain/phase_pain_distribution) / BD-037 Supabase-only入力強制 / FeatureMatrix(BD-018 computedAt) / FEATURE_STORE_UPDATED / ArchGuard+8ルール / 54件テスト
    ✓ PR-054  Cohort Builder — CohortBuilderService / CohortDefinition / BD-039 k-anonymity k≥5強制 / confirmKAnonymity()(BD-032 新frozen返却) / checkPublicationEligibility() / COHORT_DEFINED / ArchGuard+8ルール / 57件テスト
    ✓ PR-055  Dataset Version Management — DatasetVersionService.publish() / 命名IPPO-DATASET-{TYPE}-v{MAJOR}.{MINOR}-{YYYYMMDD} / doiCandidate UUID / BD-021 Append-Only(delete/update throw) / DATASET_VERSION_PUBLISHED / ArchGuard+8ルール / 52件テスト
    ✓ PR-056  Evidence Layer — EvidenceLayerService.compile() / DatasetVersion+ClusterStats+PatternEvidence+EventLog+KgSnapshot統合 / citationMetadata(Wave3基盤) / evidenceScore(0-5) / EVIDENCE_SUMMARY_CREATED / phaseCComplete:true / ArchGuard+6ルール / 56件テスト
  ★ Phase C (PR-051〜056) 完了 — Phase D (AI Platform) 入口条件成立
  Phase D (PR-057〜062): AI Platform + Signal Insight
    ✓ PR-057  Signal Insight Service — SignalInsightService.generateInsights() / ForbiddenWordValidator(BD-038) / PAIN/SLEEP/SYMPTOM/LONGITUDINAL_DELTA/PHASE_COMPARISON 5種インサイト / isMedicalAdvice:false機械付与 / LOW信頼度抑制 / SIGNAL_INSIGHT_GENERATED / ArchGuard+6ルール / 64件テスト
    ✓ PR-058  Pattern Discovery Service — PatternDiscoveryService.discoverPatterns() / PHASE_CORRELATION/SIGNAL_CO_OCCURRENCE/EXPERIMENT_RESPONSE/LONGITUDINAL_TREND 4種パターン / Pearson相関係数計算 / LOW信頼度返却（抑制なし）/ 因果断定ワード自動ブロック(BD-038) / PATTERN_DISCOVERED / ArchGuard+6ルール / 64件テスト
    ✓ PR-059  Case Recommendation Foundation — CaseRecommendationService.recommend() / FV V2コサイン類似度 / k-anonymity k≥5 ZERO TOLERANCE(BD-030 KAnonymityError) / BD-026 Phase3未完でpublic拒否(Phase3NotCompleteError) / 個人識別フィールド機械的除去 / admin:research限定 / CASE_RECOMMENDATION_GENERATED / ArchGuard+8ルール / 67件テスト
    ✓ PR-060  Similar Case Search — SimilarCaseSearchService.search() / SearchQuery{diseaseKey/signalTypes/phaseFilter/minScore} / k-anonymity k≥5 ZERO TOLERANCE(BD-030) / ClusterProfile集計 / 個人識別フィールド機械的除去 / admin:research限定 / SIMILAR_CASE_SEARCHED / ArchGuard+7ルール / 55件テスト
    ✓ PR-061  Research Assistance — ResearchAssistanceService.analyze() / 記述統計(mean/std/min/max/median/count) / Pearson相関係数ペア計算 / Cluster比較 / EvidenceLayerService統合 / 因果推論表現自動ブロック(BD-038 ForbiddenWordValidator) / isMedicalAdvice:false機械付与 / RESEARCH_ASSISTANCE_GENERATED / admin:research限定 / 58件テスト
    ✓ PR-062  AI Safety Layer — AISafetyValidator / 拡張禁止ワードリスト(PR-057 FORBIDDEN_WORDS + extended 35パターン) / validate()/validateStrict()/validateBatch() / auditServiceStatus() / getAuditReport()→phaseDComplete / 違反ログ累積 / BD-031/BD-038全Phase Dサービス横断監査 / PR-059/060 bd031+bd038フィールド追加 / Phase D完了宣言 / AI_SAFETY_AUDIT_COMPLETED / 73件テスト
  ★ Phase D (PR-057〜062) 完了 — Phase E (Similarity Evolution) 入口条件成立
  Phase E (PR-063〜067): Similarity Evolution
    ✓ PR-063  Similarity Engine V2 — SimilarityEngineV2.computeSimilarity()/.generateEdge()/.run() / FeatureVector V2(12次元)コサイン類似度 / vectorVersion='2'固定Edge生成 / BD-042 V1/V2混在は#assertV2で即例外 / BD-001 既存V1 Edgeは無変更（同一SimilarityRepositoryへ追記のみ）/ threshold=EdgeGenerator.DEFAULT_THRESHOLD(0.5)でV1と同値 / edgeId prefix "EDGEV2-"でV1と判別 / SIMILARITY_V2_EDGE_GENERATED / ApiGateway: runSimilarityV2/computeSimilarityV2/getSimilarityV2Status / ArchGuard+2ルール / 28件テスト
    ✓ PR-064  Disease Network Score V2 — DiseaseNetworkScoreV2Service.computeNetworkScore()/.computeForAllClusters() / ClusterProfile(PR-046) × V2 Edge(PR-063) × LongitudinalContext(PR-048)統合 / NetworkScore{diseaseKey,nodeCount,edgeCount,avgScore,clusterCohesion,longitudinalTrend} / BD-042 edges配列はV1/V2混在store前提でV2のみ内部フィルタ（例外にしない） / avgScoreはdisplayScore優先 / clusterCohesion=edgeCount/maxPossiblePairs（1でクランプ）/ longitudinalTrendはsourceTrend+targetTrendの多数決 / DISEASE_NETWORK_SCORE_V2_COMPUTED / ApiGateway: computeDiseaseNetworkScoreV2/computeDiseaseNetworkScoresV2/getDiseaseNetworkScoreV2Status / ArchGuard+2ルール / 26件テスト
    ✓ PR-065  Similarity Snapshot V2 — SimilaritySnapshotV2Service.createSnapshot()/.getSnapshots()/.getLatestSnapshot() / buildSimilaritySnapshotV2(){snapshotId,vectorVersion:'2',edgeCount,caseCount,threshold,computedAt} / BD-042 edges配列はV1/V2混在store前提でV2のみ内部フィルタ / SimilaritySnapshotV2Repositoryは非'2'を例外で拒否 → V1/V2世代分離を型レベルで保証 / BD-023 再計算のたびに新snapshotIdを発行（上書きなし、Append-Only）/ SimilarityEngineV2との統合テストでedgeId再計算非重複を実証 / SIMILARITY_SNAPSHOT_V2_CREATED / ApiGateway: createSimilaritySnapshotV2/getSimilaritySnapshotsV2/getLatestSimilaritySnapshotV2/getSimilaritySnapshotV2Status / ArchGuard+4ルール / 31件テスト
    ✓ PR-066  Phase 3 Completion Validator — Phase3CompletionValidator.checkDiseaseCluster()/.validatePhase3()/.assertComplete() / NETWORK_EVOLUTION_COUNCIL Section 2-C機械検証（BD-026）/ 疾患クラスターごとにcaseCount≥50（Section 2-C）かつsignalPercentiles計算済み（信頼水準）をpassed判定 / Phase3ValidationReport{result,phase3Complete,qualifiedDiseaseCount,requiredDiseaseCount:5,diseaseChecks,generatedAt}（Founder確認用）/ Section 1-A「5疾患以上でk≥50」= qualifiedDiseaseCount≥5でphase3Complete判定 / assertComplete()はPhase3IncompleteErrorを投げPR-067のSimilarity UI公開を自動ブロック（BD-026/BD-027）/ PHASE3_VALIDATION_COMPLETED / ApiGateway: validatePhase3Completion/getPhase3ValidationStatus / ArchGuard+2ルール / 21件テスト
    ✓ PR-067  Similarity UI Public Gate — SimilarityPublicGateService.checkGate()/.approvePublication()/.verifyCaseRecommendationAlignment() / Phase3CompletionValidator（PR-066）検証→Founder承認フロー→公開状態管理（BD-026/BD-027）/ GateStatus.gateState: BLOCKED（Phase3未達）→READY_FOR_APPROVAL（Phase3達成・未承認）→APPROVED（Founder承認済）/ approvePublication()はphase3Validator.assertComplete()を経由しPhase3IncompleteErrorで強制ブロック / ApprovalRecordはSimilarityPublicGateRepositoryにAppend-Only永続化（BD-032、Wave2 Supabase: similarity_public_gate_approvals table）/ verifyCaseRecommendationAlignment()はCaseRecommendationService（PR-059）の構造的PHASE3_COMPLETE定数との整合を検証し、Founder承認後もソース変更+再デプロイが別途必要なことを明示 / SIMILARITY_PUBLICATION_APPROVED / ApiGateway: checkSimilarityPublicGate/approveSimilarityPublication/getSimilarityPublicationApprovals/getSimilarityPublicGateStatus / ArchGuard+4ルール / 29件テスト
  Phase E (PR-063〜067) 完了 — Similarity Evolution完了。Phase F入口条件成立
  Phase F (PR-068〜072): Research Platform
    ✓ PR-068  Research Dataset V2 — ResearchDatasetV2Service.buildDatasetV2()/.publishDatasetV2()/.exportJSON()/.exportCSV() / Record×Signal(6種)×DiseaseEntity×Case×V2Edge(PR-063)×ClusterStats(PR-046)×KG骨格(PR-052)統合 / buildDatasetV2()はclusterProfiles中にcaseCount<5があれば全体をDatasetKAnonymityErrorで拒否（BD-030 ZERO TOLERANCE、部分生成なし）/ publishDatasetV2()はfounderId必須 — 未指定はDatasetV2PublicationNotApprovedError（BD-021）/ 命名はDatasetVersionService（PR-055）経由でIPPO-DATASET-FULL-v2.0-{YYYYMMDD} / CSV ExportはV2Edgeプール（edgeId,sourceCaseId,targetCaseId,diseaseKey,score,displayScore,vectorVersion）でV1（signals行）と差別化 / RESEARCH_DATASET_V2_BUILT / ApiGateway: buildResearchDatasetV2/publishResearchDatasetV2/exportResearchDatasetV2JSON/exportResearchDatasetV2CSV/getResearchDatasetV2Status / ArchGuard+2ルール / 26件テスト
    ✓ PR-069  Cohort Research Export — CohortResearchExportService.exportCohort()/.exportJSON()/.exportCSV()/.exportPARQUET() / CohortDefinition（PR-054）→ ResearchDataset(PR-040形式) → DatasetVersion(PR-055)統合 / exportCohort()は毎回CohortBuilderService.checkPublicationEligibility()を呼びBD-039を再検証（未検証・k<5は例外で拒否、completion条件②）/ DatasetVersionServiceのbuildDatasetVersion()にcohortId対応命名を追加（PR-055拡張、後方互換）：cohortId指定時はIPPO-DATASET-{TYPE}-{cohortId}-v{MAJOR}.{MINOR}-{DATE} / JSON・CSV・PARQUET-stub ExportはDatasetExportService（PR-040）を直接再利用しフォーマットロジック重複なし / DATASET_VERSION_PUBLISHED（新規イベント型なし、PR-055既存イベントを再利用）/ ApiGateway: exportCohortResearchDataset/exportCohortDatasetJSON/exportCohortDatasetCSV/getCohortResearchExportStatus / ArchGuard+2ルール / 17件テスト
    ✓ PR-070  Dataset DOI Candidate — DOICandidateService.assignDoiCandidate()/.attachDoiCandidateToDatasetV2()/.generateCitation() / DatasetVersion（PR-055）を入力に10.{IPPO_DOI_PREFIX}/{datasetVersionId}形式のDOI候補IDを付与（IPPO_DOI_PREFIX='10.99999'はWave2プレースホルダー、Wave3で正式Crossref/DataCiteプレフィックスに置換予定）/ attachDoiCandidateToDatasetV2()はdatasetV2.metadata.doi_candidateへ非破壊で付与（BD-021、新規frozenオブジェクトを返す）/ citation-generator.jsでAPA・Nature形式のCitation文字列を生成 / 既存のdataset-version-entity.jsやDatasetVersionServiceは無変更（Architecture変更なし、STANDARD_MODE）/ 新規Domain Event追加なし（既存DatasetVersionへの純粋計算のみ）/ ApiGateway: assignDatasetDoiCandidate/attachDoiCandidateToDatasetV2/generateDatasetCitation/getDoiCandidateStatus / ArchGuard+2ルール / 20件テスト
    ✓ PR-071  Research Query API — ResearchQueryApiService.executeQuery()/.getStatus() / QueryType4種：COHORT_STATS（CohortBuilderService再検証+EvidenceLayerService統合）/ SIGNAL_CORRELATION（ResearchAssistanceService委譲、caseCount構造的k-anonymityゲート）/ DISEASE_CLUSTER_COMPARE（diseaseKeyごとに個別k-anonymityゲート）/ KG_PATH_QUERY（KnowledgeGraph BFS探索、maxDepth=4、構造データのみのためBD-030適用除外）/ BD-030 ZERO TOLERANCE：case-bearing結果はK_ANONYMITY_MIN(5)未満でKAnonymityError / BD-031：LLM/ML不使用、決定論的集計・グラフ探索のみ / BD-036：KG読み取り専用（追記・変更なし）/ 全結果isMedicalAdvice:false機械付与・Object.freeze / RESEARCH_QUERY_EXECUTED / ApiGateway: executeResearchQuery（admin:research）/getResearchQueryStatus / ArchGuard+2ルール / 28件テスト
    ✓ PR-072  Research Platform Audit — ResearchPlatformAuditService.auditPlatform()/.auditDatasetAttribution()/.auditKAnonymity()/.auditKnowledgeGraphAppendOnly()/.auditAiSafetyAlignment()/.getStatus() / BD-021（DatasetVersionService.getVersions()全件のcreatedBy Founder attribution再確認）/ BD-030・BD-036（clusterProfiles + CohortBuilderService.getCohorts()全件のk-anonymity再検証、ZERO TOLERANCE k>=5、目標k>=50を別途集計）/ BD-037（KnowledgeGraphRepository.deleteNode()/deleteEdge()が必ず例外を投げることを構造的に確認、副作用なしのprobe呼び出し）/ BD-039（AISafetyValidator.getAuditReport()委譲、phaseDComplete=true かつ累積違反ゼロを確認）/ phaseFComplete=true は4BD全PASS時のみ / ResearchPlatformAuditReport（Founder確認用、Object.freeze）/ RESEARCH_PLATFORM_AUDIT_COMPLETED / ApiGateway: auditResearchPlatform（admin:research）/getResearchPlatformAuditStatus（record:read）/ ArchGuard+2ルール / 29件テスト
  ★ Phase F (PR-068〜072) 完了 — Phase G（Wave2 Exit）入口条件成立
  Phase G (PR-073〜075): Integration + Quality Gate
    ✓ PR-073  Architecture Guard Wave2 Complete — Wave2全Domain（PR-041〜072）に対するArchitectureGuard禁止依存ルールの完成 / 発見したギャップ: PR-042（Supabase Persistence: network-signal-supabase-repository / supabase-event-persistence-repository）・PR-050（SignalIntelligenceV2Service）・PR-057〜062（Phase D全6PR: SignalInsight/PatternDiscovery/CaseRecommendation/SimilarCaseSearch/ResearchAssistance/AISafetyValidator）にArchGuardルールが皆無だった欠落を解消（+18ルール）/ 責務③新規ルール: AIサービスDomain（signal-insight/pattern-discovery/case-recommendation/similar-case-search/research-assistance/ai-safety）→ research-dataset-repository・builder・v2-entityへの直接アクセス禁止（+3ルール、EvidenceLayerService/ResearchAssistanceService経由を強制）/ 責務②KG等直接アクセス禁止は既存PR-051ルールで充足済みを確認 / composition-root.js _registerFeatures()にPR-066〜070（Phase3Validation/SimilarityPublicGate/ResearchDatasetV2/CohortResearchExport/DoiCandidate）のr.register()呼び出しが丸ごと欠落していたギャップを解消 / route-registry.js KNOWN_FEATURESにPR-051〜072の22Feature名を追加（PR-050以降ずっと未反映だった構造的ギャップを解消、これまでWave2全PRのregister()呼び出しが「Unknown feature」で黙って握りつぶされていた）/ 既存テストの37→59固定値ドリフトを16ファイルで是正（KNOWN_FEATURES拡張の直接帰結）/ tests/arch/architecture-guard-pr073.test.js 31件テスト / ArchGuard+21ルール
    ✓ PR-074  Wave2 Integration Test Suite — tests/wave2/ 新設、Phase A〜Fの全PRを横断する統合テスト（責務①）/ Exit Criteria EC-01〜EC-14自動検証スクリプト（責務②、tests/wave2/wave2-exit-criteria.test.js 21件）: EC-01(NetworkSignalSupabaseRepository capabilities.supabase) / EC-02(EmotionSignalMapper) / EC-03(MenstrualPhaseResolverService — cycleDay 1〜28全件でUNKNOWNゼロ確認) / EC-04(buildDiseaseEntry icdCode/category/severity) / EC-05(EventStore/SupabaseEventPersistenceRepositoryにupdate/delete不在) / EC-06(VECTOR_VERSION_V2='2' / FV_V2_DIMENSION_COUNT=12) / EC-07(LongitudinalEdgeEnricher.enrich()のlongitudinalContext) / EC-08(KnowledgeGraphService.getStatus()) / EC-09(ForbiddenWordValidator.validateOutput) / EC-10(CohortBuilderService k-anonymity gate) / EC-11(DatasetVersionService.publish() versionId) / EC-12(DiseaseClusterStatisticsService.computeClusterProfile) / EC-13〜14はtests/wave2/wave2-integration.test.js（7件）: EC-13(EventStoreが全DOMAIN_EVENT_TYPESを型無差別に記録) / EC-14・QC-01(root.assemble()がPR-041〜072の31Feature全件を登録、PR-073が修正した「Unknown feature握りつぶし」regressionのガード) + Disease Entity V2→Cluster Stats→Cohort→DatasetVersion のPhase横断データフロー統合テスト / QC-03(k-anonymity強制) / QC-04(診断・治療文言ブロック) はwave2-exit-criteria.test.jsに含む / QC-02（BD-001〜043違反ゼロ確認）とFounder向けレポート生成・WAVE2_EXIT_CONFIRMED Eventの発行はPR-075スコープのため本PRでは実装せず / vitest run全件パス確認（責務④）: 5,028件 / 270ファイル、失敗39件は既知5ファイルのpre-existing failureのみで増加なし（責務⑤）/ 新規Domain Service・ApiGateway・DIトークン・ArchGuardルール追加なし（テストのみのPRのためScope外）
    ✓ PR-075  Wave2 Exit Audit — src/domains/wave2-exit-audit/ 新設。Wave2ExitAuditService.generateExitReport()/.confirmWave3Migration()/.generateWave3MigrationDocument()/.getStatus() / EC-01〜15の全項目確認レポート生成（責務①、EC-01〜14はtests/wave2/(PR-074)通過を根拠、EC-15はvitest run結果(failedTests/newFailureFiles)を入力に判定）/ QC-01〜04の全項目確認（責務②、QC-01はEC-14委譲、QC-02はBD監査集約、QC-03はResearchPlatformAuditService.auditKAnonymity()委譲、QC-04はAISafetyValidator.getAuditReport()委譲）/ BD-001〜BD-043の全43件チェックリスト生成（責務③）: 機械的検証可能な9件（BD-021/026/027/030/031/036/037/038/039）はResearchPlatformAuditService（PR-072）/Phase3CompletionValidator（PR-066）/AISafetyValidator（PR-062）に委譲しPASS/FAIL判定、残り34件は正直にFOUNDER_REVIEW_REQUIRED（コードで証明不可能な業務・歴史的決定を虚偽PASSにしない）/ confirmWave3Migration()はfounderId必須のFounder承認ゲート（責務④、BD-027）— wave3ReadyForFounderApproval=false時はWave2ExitCriteriaNotMetErrorで強制ブロック、承認時のみWAVE2_EXIT_CONFIRMED Event発行 + Wave2ExitAuditRepository(Append-Only)へ記録 / generateWave3MigrationDocument()はFounder向け移行承認文書を生成（責務⑤、承認記録なしでは生成不可）/ ApiGateway: generateWave2ExitReport/confirmWave2ExitAudit/getWave2ExitAuditApprovals/generateWave3MigrationDocument/getWave2ExitAuditStatus（admin:research、statusのみrecord:read）/ ArchGuard+2ルール（screen/feature→Wave2ExitAuditService直接アクセス禁止）/ KNOWN_FEATURES 59→60件（既存16ファイルの固定値ドリフトをPR-073と同型で是正）/ tests/wave2-exit-audit/wave2-exit-audit-service.test.js 30件 + tests/arch/architecture-guard-pr075.test.js 3件 / vitest run全件: 5,061件、失敗39件は既知5ファイルのpre-existing failureのみで増加なし
  ★ Phase G (PR-073〜075) 実装完了 — Wave2正式完了。Founderが generateWave2ExitReport() の結果（EC-01〜15全PASS・QC-01〜04全PASS・機械監査可能9BD全PASS・残り34BDはFOUNDER_REVIEW_REQUIRED）を確認のうえ「APPROVE WAVE2 EXIT」を明示し、confirmWave2ExitAudit({ founderId: 'kenkou-jpg', exitReport }) を実行。ApprovalRecord: approvalId=wave2exit_1782980527914_1 / founderId=kenkou-jpg / ecPassCount=15 / qcPassCount=4 / confirmedAt=2026-07-02T08:22:07.914Z。

  詳細: docs/WAVE2_ROADMAP.md（IPPO-COUNCIL-006）参照

Release Readiness Recovery Program（PR-076〜077）— docs/RELEASE_READINESS_COUNCIL.md（IPPO-RELEASE-001）Critical是正
  ✓ PR-076  Research Dataset Consent Gate — src/domains/research/consent-gate-service.js 新設 / BD-021・BD-049準拠 / ResearchDatasetBuilder.build()・ResearchDatasetV2Service.buildDatasetV2()・CohortResearchExportService.exportCohort()にConsent Gate統合 / Case はconsentLevel>=2（RESEARCH許諾）でfilterCasesByResearchConsent()によりフィルタ、consentLevel未設定・0のCaseはfail-closedで除外 / Signal はNetworkSignal entityがuserId/consentLevelを保持しない設計制約のためsignalsConsentVerified:true の明示的表明を必須化（未表明時はResearchConsentNotVerifiedError、BD-030 all-or-nothing踏襲）/ 18件テスト追加（tests/research/consent-gate-service.test.js 10件 + 既存3ファイルへBD-049テスト追加8件）/ Architecture変更なし・Wave2ExitAudit等既存ドメイン無変更 / vitest run全件: 5,079件、失敗39件は既知5ファイルのみで増加なし
  ✓ PR-077  Release Readiness Evidence Ledger — src/domains/release-readiness/ 新設。ReleaseReadinessService.confirmItem()/.getConfirmationStatus()/.checkBetaReadinessGate()/.getHistory()/.getStatus() / Wave2ExitAuditRepository（PR-075、Append-Only・Founder承認済み）には一切触れない独立追加台帳 / REGULATORY_CONDITIONS（C-1〜C-5、REGULATORY_MEDICAL_COUNCIL.md 条件一覧）+ FOUNDER_REVIEW_BD_LIST（BD_SCOPE_LIST − MECHANICALLY_AUDITED_BDS = 34件、wave2-exit-audit-types.jsから動的導出しドリフト不可能）計39項目をFounderが個別に確認・記録 / checkBetaReadinessGate()は39項目全件confirmed:trueでない限りready:falseを返す fail-closed設計（confirmed:falseの明示記録も「未レビュー」とは区別してブロック対象に含める）/ RELEASE_READINESS_ITEM_CONFIRMED Event追加 / ApiGateway: confirmReleaseReadinessItem/getReleaseReadinessConfirmationStatus/checkReleaseReadinessBetaGate/getReleaseReadinessHistory/getReleaseReadinessStatus（admin:research、read系はrecord:read）/ ArchGuard+2ルール（screen/feature→ReleaseReadinessService直接アクセス禁止）/ KNOWN_FEATURES 60→61件（既存16ファイルの固定値ドリフトをPR-073/075と同型で是正）/ tests/release-readiness/ 32件 + tests/arch/architecture-guard-pr077.test.js 3件 / vitest run全件: 5,114件、失敗39件は既知5ファイルのみで増加なし
  ★ Release Readiness Recovery Program 完了 — 元Critical 3件のうち工学的に対処可能な設計欠陥（Consent Gate欠落・承認ゲート素通り）は解消。ただしReleaseReadinessServiceの確認台帳は現時点で0/39 confirmed — Founderが実際にC-1〜C-5の完了状況とFOUNDER_REVIEW_REQUIRED BD 34件を確認・記録するまで、β Release Readinessは引き続きCONDITIONAL GO（Score 90/100）。詳細: docs/RELEASE_READINESS_COUNCIL.md 16章参照。

Founder Confirmation — HOLD RELEASE READINESS（2026-07-02、Founder: kenkou-jpg）
  Founderより「全39項目を一括承認しない」との明示指示。以下を confirmItem() で個別実行:
    17-A: confirmed:false（外部証跡・実データ不足）: C-1 / C-2 / C-3 / C-5 / BD-034 / BD-042 の6件
    17-B/17-D: 承認候補15件（C-4 + BD 14件）を ① Code Verified 7件 / ② Evidence Verified 7件 / ③ Founder Judgment Required（C-4）1件 に分類 → Founderが①②をconfirmed:true、③(C-4)をconfirmed:false維持で確定指示
      confirmed:true化14件: BD-002/010/013/017/022/032/035（①コード確認のみで確認可能）+ BD-004/006/012/014/024/040/041（②HANDOFF・既存承認記録で確認可能）
      confirmed:false維持1件: C-4（理由: Signal経路がsignalsConsentVerified:trueの自己申告モデルに依存しBD-049/C-4の完全充足は追加判断が必要なため）
    17-F: 残り18件を「確認過程を短縮」の指示のもと ① Code Verified 4件 / ② Evidence Verified 9件 / ③ Hold Before GO 5件 に再分類 → Founderが①②の13件を一括confirmed:true承認、③の5件はconfirmed:false（未レビュー）のまま保留する指示
      confirmed:true化13件: BD-001/008/011/018（①コード確認）+ BD-005/007/009/016/020/023/025/028/043（②既存文書・監査記録で確認）
      Hold Before GO維持5件（未レビューのまま）: BD-003（calendar-next.jsの旧暦UI表示とBD-003の整合性未確認）/ BD-015（Layer1→Layer2-7再構築保証が未検証）/ BD-019（削除パイプライン実装の所在未確認）/ BD-029（Similarity UI個人識別不可要件の未レビュー）/ BD-033（定性的戦略命題のため機械検証不可）
  confirmed:true累計27件・confirmed:false累計7件（C-1/C-2/C-3/C-4/C-5/BD-034/BD-042）・未レビュー累計5件（Hold Before GO）。checkBetaReadinessGate().ready=false。CONDITIONAL GO維持。
  詳細・記録全件: docs/RELEASE_READINESS_COUNCIL.md 17章（Founder Confirmation Log、17-F/17-G）参照。

Release Readiness Completion Program（PR-078）— docs/RELEASE_READINESS_COUNCIL.md 18章
  ✓ PR-078  Data Deletion Pipeline — src/domains/data-deletion/ 新設。DataDeletionService.requestDeletion()/.confirmAnonymization()/.confirmSoftDelete()/.executeHardDelete()/.getRequestStatus()/.getAllLatest()/.getHistory()/.getStatus() / BD-019準拠：REQUESTED→ANONYMIZED→SOFT_DELETED→HARD_DELETEDの順序をサーバー側で強制、段階スキップ・後戻りはDeletionStageOrderErrorで拒否 / SOFT_DELETED→HARD_DELETEDはHARD_DELETE_HOLD_DAYS=90を満たすまでHardDeleteNotEligibleErrorで拒否 / 既存RecordRepository/ConsentRepositoryには一切触れない自己完結的Append-Only監査台帳（PR-076/077と同型、Architecture変更なし）/ DATA_DELETION_STAGE_ADVANCED Event追加 / ApiGateway: requestDataDeletion/confirmDataDeletionAnonymization/confirmDataDeletionSoftDelete/executeDataHardDelete/getDataDeletionRequestStatus/getAllDataDeletionRequests/getDataDeletionStatus（admin:research、状態参照系はrecord:read）/ ArchGuard+2ルール（screen/feature→DataDeletionService直接アクセス禁止）/ KNOWN_FEATURES 61→62件（既存17ファイルの固定値ドリフトをPR-073/075/077と同型で是正）/ tests/data-deletion/ 32件 + tests/arch/architecture-guard-pr078.test.js 3件 / vite build PASS / vitest run全件: 5,149件、失敗39件は既知5ファイルのみで増加なし / 完了後 BD-019 を confirmItem() で confirmed:true 記録
  BD-034監査（未実装）— persistence-config.jsのPERSISTENCE_CONFIGはnetworkSignalの1エントリのみで、Emotion/Menstrual/DiseaseCluster/KnowledgeGraph/ResearchDataset/Cohort等15以上のWave2ドメインがSupabaseアダプタ皆無の完全in-memoryと判明。1PRで閉じられる規模ではなく新規Roadmap起票を要するためImplementationからFounder Actionへ再分類。confirmed:falseのまま維持
  confirmed:true累計28件・confirmed:false累計6件（C-1/C-2/C-3/C-4/BD-034/BD-042）・未レビュー累計5件（BD-003/BD-015/BD-029/BD-033/C-5）。checkBetaReadinessGate().ready=false。CONDITIONAL GO継続（Score 90→93/100）。
  詳細・記録全件: docs/RELEASE_READINESS_COUNCIL.md 18章（Release Readiness Completion Program）参照。

Next: Founder Action 3件（C-2医師アドバイザー招聘／C-4 Signal Consent自己申告モデルの是非判断／BD-034適用範囲の再解釈 or 新Roadmap起票判断）と External Evidence 2件（C-1プライバシーポリシー弁護士レビュー／C-3 SaMD非該当書面見解）が必須ブロッカー。Major 3件（BD-003/BD-015/BD-029）はLegacy Removal・Operations Council前に確認、Minor 3件（C-5/BD-033/BD-042）は当面保留可。checkBetaReadinessGate().ready=trueを確認した時点でβ公開可否を最終判断し、その後 Legacy Removal Council へ進む。Wave3 Roadmap起点（Wave3 MASTER DESIGN入力）はβ運営開始後に着手する。
```

---

Legacy Removal Program（PR-079〜090）— docs/LEGACY_REMOVAL_PLAN.md（IPPO-LEGACY-001）
  ✓ PR-079  Batch-1: Record Input UI — app-legacy.js の Record Input UI 系 約28関数
  （renderStep/nextStep/prevStep/buildSteps/renderWellness/selectWellness/renderFood/selectFood/
  toggleFoodItem/renderFasting/selectFasting/renderEmotion/selectEmotion/getBodyCheckTitle/
  renderBodyCheck/selectBodyCheckItem/selectBodyCheckExtra/getDiseaseMorningQuestion/getDailyHint/
  renderSymptomDetail/toggleSymptomChip/appendSymptomDetail/toggleDetailItem/updateSliderDetail/
  selectBowelCount）を src/modules/record-input.js（既存骨格コミットe62a8b3を土台に再利用、再実装ゼロ）へ
  委譲。app-legacy.js側は `import * as RecordInput from './modules/record-input.js'` + `const fn = RecordInput.fn`
  形式のエイリアスのみで、onclick文字列から呼ばれる関数名は既存の window bridge（ファイル末尾）経由で
  そのまま record-input.js 側へ向くよう変更済み / STEPS・currentStep は record-input.js の
  内部変数 `_steps`/`_currentStep`（initSteps()/getSteps()/getCurrentStep()）へ完全移行、
  app-legacy.js側の同名グローバル宣言は削除 / openRecordModal()（Batch-2非対象だがSTEPS/currentStep/
  currentRecordを直接初期化する唯一の箇所のため本PRで更新）は `RecordInput.resetCurrentRecord()` +
  `RecordInput.initSteps()` を呼ぶ形に変更 / currentRecordはPR-080でsaveRecordが移植されるまでの
  一時ブリッジとして `var currentRecord = RecordInput.getCurrentRecord()` を維持（saveRecord本体は
  無変更、bare identifier経由で同一オブジェクト参照を共有）。window.currentRecordへの同期エクスポートは
  SG-4により廃止し、代わりに `window.getCurrentRecord = RecordInput.getCurrentRecord`（ライブ参照）を
  bridge / SG-7: tests/arch/legacy-removal-pr079-line-count-guard.test.js 新設（app-legacy.js行数の
  CI監視、ARCHITECTURE_V3.md C-20のCIロック欠如を是正、以降のBatch PRはBASELINE_LINE_COUNTを更新するたび
  減少を確認）/ app-legacy.js: 10,804行→10,247行 / ブラウザ実機検証（record-modal-controller.js経由の
  window.openRecordModal wrapperは`_inlineOpenRecordModal`未設定のためno-op — これはPR-079以前からの
  既存挙動で本PR起因ではない。実際の呼び出し経路はhandleHomeCTA内のbare `openRecordModal()`
  フォールバックのみで、app.htmlのrecord-modalは2026-05-27時点で既にsoft-isolated/unreachableと判明
  （app.html:1178コメント記載）。record-input.jsを直接importして initSteps()→renderStep()→
  selectEmotion()の一連の流れを検証し、currentRecordブリッジが同一オブジェクト参照を
  正しく共有することを確認済み）/ 新規テスト追加なし（既存tests/modules/record-input-b1-*.test.js
  80件が引き続き対象）/ vitest run全件: 5,152件（新規3件はSG-7 line-count-guard）、失敗39件は既知5ファイル
  （tests/modules/build-draft-from-ui.test.js・save-record-screen.test.js・
  tests/disease/disease-analyzer.test.js・tests/events-domain/domain-event-types.test.js・
  tests/menstrual-domain/event-menstrual.test.js）のみで増加なし / vite build PASS
  ✓ PR-080  Batch-2（Scope縮小版）: currentRecord Bridge撤去 — 当初Scopeは
  openRecordScreen/editPastRecord/saveRecord等 約14関数だったが、実装前調査で
  openRecordScreen()・editPastRecord()の安全な物理移動には追加のDIスキャフォールドが
  必要と判明（Founder判断によりPR-081以降へ繰り越し。詳細は次段落）。本PRは
  saveRecord() / getSuccessMessage() / closeSuccess() の currentRecord 依存解消のみを実施 /
  PR-079で導入した `var currentRecord = RecordInput.getCurrentRecord();`
  モジュールスコープbridge変数（1521行付近）を完全撤去。saveRecord() 内で毎回
  `var currentRecord = RecordInput.getCurrentRecord();` をローカル取得する形に変更
  （責務不変・取得元のみ変更、SG-4準拠）。getSuccessMessage/closeSuccessはcurrentRecord非依存と
  判明したため無変更 / openRecordModal() から一時ブリッジ同期行を削除 / Adapter完全撤去確認
  （`window.__recordInputBridge`等の追加Adapterは存在せず、上記1行のみが対象だった）/
  app-legacy.js: 10,247行→10,242行、SG-7 BASELINE_LINE_COUNTを10,242に更新 / vitest run全件:
  5,152件、失敗39件は既知5ファイルのみで増加なし（新規テスト追加なし、PR-079由来の
  record-input-b1-*.test.js 80件を含め全PASS）/ vite build PASS。

  【Batch-2繰り越し・重要な発見】openRecordScreen()（app-legacy.js、約378行）は
  home CTA経由のwindow.openRecordScreenでは到達不能（record-three-card.jsが
  window.openRecordScreen=openThreeCardRecordで上書きするため）だが、
  calendar.js/timeline.jsのonclick="editPastRecord(...)" → window.editPastRecord →
  window.openLegacyRecordScreen（app-legacy.js側が別名で常時export）という
  独立した到達経路が存在し、Dead Codeではないと確認済み。ただし物理移動には
  saveAndSync/updateStats/updateHistory/buildCalendar/updateHomeCTAState/closeModal等の
  window未エクスポートのbare呼び出し、および_bowelCount/_prevTab共有変数への対応
  （DIスキャフォールド新設）が必要でBatch-2の責務を超えるためFounder判断によりPR-081以降の
  専用PRへ繰り越し。あわせて以下の**PR-080に起因しない既存の不具合**を発見・記録した
  （本PRでは修正せず、Scope外として現状維持）:
    - `window.saveRecord` は record.js の自己参照ガード（`callExistingFunction`）により
      恒常的にno-op。app-legacy.js は `window.saveRecord` を一度もexportしていないため、
      saveRecord()（app-legacy.js）はwindow経由では到達不能（app-legacy.js内にbare
      `saveRecord()`呼び出し箇所も存在しない）。
    - `window.closeModal` は record-modal-controller.js の `_inlineCloseModal` が
      未設定のままno-op（PR-079で確認済みの `window.openRecordModal` と同型の
      pre-existingバグ）。
    - 上記により、通常のUI操作からは openRecordModal()/saveRecord() 系の
      currentRecordモーダルフローに到達しない。ブラウザ検証は
      `window.openRecordScreen` を一時的にundefinedにして `handleHomeCTA()` の
      正規フォールバック分岐からbareの `openRecordModal()` を発火させ、
      saveRecord() は検証専用の一時的な `window.__pr080VerifySaveRecord` フック
      （検証後に削除済み、最終diffには含まれない）経由で直接呼び出して実施した。
      新規記録→保存→一覧反映／編集→保存→一覧更新／編集キャンセル→データ非破壊／
      モーダル再オープン時のドラフト破棄／currentRecordが旧bare変数に依存しないこと、
      をすべて確認しエラーなし。

  ✓ PR-080A  Record Screen DI Scaffold（設計のみ、コード変更ゼロ）— 詳細:
  docs/PR-080A-record-screen-di-scaffold.md。実コード確認によりopenRecordScreen/saveRecord/
  editPastRecordのbare依存関係を完全監査。新規発見（HANDOFF未記載だった事項）:
  ① updateStats/buildCalendar/closeModalはapp-legacy.js内ローカル実装と、
  home-renderer.js/calendar.js/record-modal-controller.jsのwindow.*export版が
  重複併存しており、app-legacy.js内部のbare呼び出しは常にローカル版を実行する
  （windowの同名propertyは無視される）。単純なwindow bridge化では済まず、
  重複解消PRが物理移動の前提条件と判明 / ② app.html:346のbottom-nav「記録」ボタンは
  window.openLegacyRecordScreen（=openRecordScreen）を直接呼んでおり、editPastRecord経由に
  加えてopenRecordScreenへの第3の到達経路が存在する（app.htmlのコメントは3-card誘導と
  記載しているが実装と矛盾）/ _bowelCount（app-legacy.js内で完全自己完結）・_prevTab
  （openRecordModal/closeModal専用、openRecordScreenとは無関係と判明）のShared State監査完了 /
  Physical Move判定: updateHistory=A（空関数、削除のみ）、saveAndSync/_bowelCount/saveRecord/
  editPastRecord/openRecordScreen等=B（DI後に移動可）、updateStats/buildCalendar/closeModal=C
  （重複解消PRが別途必要）、window.saveRecord・window.closeModalのno-opバグ=D（現状維持、
  Founder判断待ち）/ PR分割案PR-080B〜F を提示（Founder承認後に番号確定）/
  コード変更なし（Step2「DI設計のみ作成する」指示に従い、消費者が存在しないDIコードの
  先行実装を避けた。推測によるScope外実装禁止 — AI_EXECUTION.md 5章）/
  docs/LEGACY_REMOVAL_PLAN.md 4章・9-A章・10章（Decision Log追補）を更新し、
  既存PR-081〜090の番号は変更せずPR-080AをBatch-2とBatch-3の間に挿入 /
  vitest run・vite build: 変更なし（コード非変更のため既存ベースラインのまま、
  新規リグレッションなし）。

  ✓ PR-080B  Batch-2 Completion Program①: updateHistory依存の整理 — Founderが
  PR-080B〜F（Batch-2 Completion Program）の内訳を確定（docs/LEGACY_REMOVAL_PLAN.md
  4章・9-A章に反映、PR-081〜090は無変更）。updateHistory()（確定Dead Code・空関数）への
  bare呼び出し8箇所のうち、saveRecord()内の無条件呼び出し2箇所（禁止事項によりPR-080Eへ
  据え置き）を除く6箇所を整理: cloudRestore()内（1506、guard付き）/ clearData()内（4818）/
  saveEditRecord()内（5018、day-detail経由の別編集フロー・editPastRecordとは別物）/
  deleteEditRecord()内（5042）/ **saveRecordScreen()内（8019）**/ ログイン後クラウド復元
  callback内（9576、guard付き）。updateHistory()定義自体は
  saveRecord()の残存呼び出しが存在する限り削除不可のため維持し、その理由をコメントで明記。
  【新規発見】`saveRecordScreen()`（app-legacy.js:7875〜、app.html:677
  `id="save-record-btn"`の実際の保存ハンドラ）が、PR-080Aの監査で対象とした`saveRecord()`
  （record-modal/3-card用、record-input.jsのnextStep()から呼ばれる別関数）とは
  **完全に別の関数**であり、openRecordScreen()と対になる本来の保存ハンドラだったと判明。
  saveRecordScreen()はupdateHomeSummary/updateHomeCTA/buildHomeWeekRow/
  updateHomeInsightCard等、saveRecord()より遥かに多くのbare依存を持つため、
  PR-080E（物理移動）のスコープはPR-080Aの想定より拡大する可能性がある（次PRで詳細監査要）。
  SG-7 line-count-guard: 6箇所整理により app-legacy.js 10,242行→10,237行
  （`split('\n').length`計測、BASELINE_LINE_COUNTを10,237に更新）。vitest run全件:
  5,152件、失敗39件は既知5ファイルのみで増加なし。vite build PASS。Browser Verification:
  bottom-nav「記録」→openRecordScreen()表示→この内容で記録する→saveRecordScreen()実行
  →records反映、calendar→editPastRecord('2026-07-03')→編集画面に既存データ復元、
  戻るボタン→home、いずれもConsole Errorなし（vite websocket接続失敗の環境ノイズのみ）。
  Decision Log: 更新不要（Architecture/Roadmap/Business/Founder Strategy変更なし）。

  ✓ PR-080C  Batch-2 Completion Program②: updateStats/buildCalendar重複実装整理 —
  前チャットの調査結果（①updateStatsはcalcPainFreeDaysThisMonth/calcAvgPainThisMonthを
  含め3関数×2実装の重複連鎖、②buildCalendarはcalYear/calMonthという別々の独立状態を
  参照しており単純統合は状態不整合リスクを伴う、③openDayDetailも別実装）を前提に、
  本チャットのプロンプトで明示された「禁止: Business Logic変更」を踏まえ、PR-080Bで
  確立した「呼び出し元は変更せず、定義箇所にのみ理由をコメントする」保守的パターンを
  踏襲。実コードの挙動は一切変更せず、home-renderer.js（calcPainFreeDaysThisMonth/
  calcAvgPainThisMonth/updateStats）とcalendar.js（calYear/calMonth宣言部/
  buildCalendar/changeMonth/openDayDetail）に、app-legacy.js側との重複関係と統合を
  見送った理由を明記するコメントを追加。
  【重要】app-legacy.js側には当初同内容のコメントを追加したが、SG-7
  line-count-guard（tests/arch/legacy-removal-pr079-line-count-guard.test.js、
  BASELINE_LINE_COUNT=10237、`app-legacy.jsは縮小のみ許容・増加禁止`という
  Legacy Removal監視の趣旨）に反する（10237→10255行、guard test FAIL）ことが
  判明したため差し戻し、app-legacy.js側は無変更（0 diff）を維持。SG-7の監視対象外である
  モジュール側ファイルのみにコメントを配置する方針に変更した。
  【新規発見・次PRへの引き継ぎ事項】Browser Verification中に、カレンダー画面の実UIは
  calendar.js（buildCalendar/calYear/calMonth）ではなく、第3の実装
  `src/modules/calendar-next.js`（`buildCalendarNext()`、module-local
  `_calYear`/`_calMonth`は1-12月表記でcalendar.jsの0-11月表記とも異なる）が
  担っていることが判明。calendar-next.js:609で`window.buildCalendar = buildCalendarNext`
  と明記されており（コメント「旧calendar.jsもwindow.buildCalendarを設定するが、
  後からロードする本ファイルが上書き」）、calendar.js側のwindow.buildCalendar exportは
  現在事実上到達不能（dead）。calendar.js自体のbuildCalendar/changeMonth/
  openDayDetail関数定義とexportは残存しているため「2実装の重複」ではなく
  「3実装の並存（うち1つは事実上dead）」が実態。PR-080D以降でcalendar.js関連に
  触れる場合はこの前提を踏まえること（calendar.js自体の要否確認が別途必要な可能性）。
  Build: PASS。Regression: vitest run全件 5,152件、失敗39件は既知のみ（新規0件。
  一時的にapp-legacy.jsへのコメント追加でSG-7 guardが1件追加failしたが差し戻しで解消、
  最終状態で39件に一致を確認）。なお本チャットでのRegression実行時、
  `tests/modules/build-draft-from-ui.test.js`・`tests/modules/save-record-screen.test.js`
  で`src/modules/record.js`が存在しない`../../domains/record/record.service.js`を
  importしようとして発生する失敗が含まれることを確認したが、`git stash`でPR-080Cの
  変更を退避した状態でも再現するため、PR-080C以前から存在する既存の壊れたimport
  （PR-080Cの変更とは無関係）であり、既知39件の内数として扱った。
  Browser Verification: ホーム表示（updateStats経由の統計）→カレンダー画面表示
  （2026年7月、今月）→前月ナビゲーション（calPrevNew→2026年6月）→今日ボタン
  （calTodayBtn→2026年7月に復帰）→ホームに戻る→記録タブ（今日を記録する画面表示）
  →戻るボタン（ホームに復帰）、いずれもConsole Errorなし（vite websocket接続失敗・
  Supabase未設定・cloud restore失敗はローカル開発環境ノイズのみ、既知）。
  SG-7: PASS（app-legacy.js無変更、10,237行のまま、BASELINE_LINE_COUNT=10,237）。
  Decision Log: 更新不要（Architecture/Roadmap/Business/Founder Strategy変更なし）。

  ✓ PR-080D  Batch-2 Completion Program③: closeModal/saveAndSync周辺依存整理 —
  調査の結果、closeModalは既にrecord-modal-controller.jsで「Phase D-1」パターン
  （app-legacy.js inline実装をwindow.*経由で捕捉し委譲する薄いラッパー）としてDI境界が
  確立済みと判明（新規対応不要）。saveAndSyncには同等のラッパーが存在しなかったため、
  同じ確立済みパターンをsaveAndSyncにも適用（record-modal-controller.jsに
  `_inlineSaveAndSync`捕捉＋`export function saveAndSync()`委譲＋
  `window.saveAndSync = saveAndSync`を追加）。app-legacy.js側の実装・呼び出し元・
  Record保存ロジックは一切変更なし（0 diff）。Build: PASS。Regression: 5,152件中
  失敗39件、既知のみ・新規0件。Browser Verification: Founder指示によりPR-080D以降
  スキップ（PR-080Eのみ実施の方針に変更）。Decision Log: 更新不要。

  ✓ PR-080E  Batch-2 Completion Program④: openRecordScreen/editPastRecord物理移動 —
  着手前にdocs/PR-080A-record-screen-di-scaffold.md（唯一の設計入力）9章の指示に従い
  saveRecordScreen()の依存関係を追加監査。その結果、saveRecordScreenが呼ぶ
  buildHomeWeekRow/updateHomeCTAState/updateHomeInsightCard/updateHomeNumbers/
  updateHomeDiseaseAdvice の5関数が、PR-080Cで扱ったupdateStats/buildCalendarと
  全く同型の「app-legacy.jsローカル実装（非export）vs home-renderer.js側window
  export版」という重複を持つことが新規発見された（prefillRecordFromModalも
  calendar.js側に重複実装ありと判明したが、こちらは物理移動により解消済み—後述）。
  window bridge経由でsaveRecordScreenを移動すると、これら5関数の呼び出しが
  意図せずhome-renderer.js版に切り替わりBusiness Logic変更のリスクを伴うため、
  Founderに方針を確認。「重複のない部分のみ限定的に移動」の判断を得て、
  openRecordScreen自体（依存関数はすべてwindow export済み・重複なしと監査済み。
  ただしprefillRecordFromModalはcalendar.js版との重複が判明したため実装ごと同梱移動）と
  editPastRecordのみをsrc/modules/record-screen.js（新設）へ物理移動し、
  saveRecordScreen（前述の5関数重複が未解決のため）は次PRへ持ち越し。
  実装詳細: ①bare `state`参照は`window.state`に置換（app-legacy.js冒頭の
  `_ippoStateHooks`機構によりbare stateとwindow.stateは常に同一オブジェクト参照と
  確認済み、挙動変更なし）。②`_bowelCount`（app-legacy.js側に残存するbare var、
  adjustBowelCount/saveRecordScreen内の保存時読み取りが引き続き参照するため未移動）は
  `window.__ippoGetBowelCount()`/`window.__ippoSetBowelCount()`という最小限のブリッジを
  app-legacy.js側に追加して橋渡し。③renderSymptomLayers/updateRecProgressDots/
  updateDiseaseQuestions/toggleSympLayer/selectTempMethod/updateMealParseは
  重複実装が存在しないことを監査済みのためwindow.*経由でそのまま呼び出し（DI bridge）。
  ④prefillRecordFromModalはcalendar.js版と衝突させないよう、window非exportの
  private helperとしてrecord-screen.js内に同梱。⑤app-legacy.js側は
  `import { openRecordScreen, editPastRecord } from './modules/record-screen.js';`を
  追加し、既存のalphabetical export block（`if (typeof editPastRecord === "function")
  window.editPastRecord = editPastRecord;`等、record-three-card.jsによる
  window.openRecordScreen上書きガードを含む）はimportされた識別子をそのまま参照する形で
  無改造のまま機能（Legacy Adapter除去は「ローカル定義削除＋import化」で達成、
  export blockの構造自体は温存）。
  結果: app-legacy.js 10,237行→9,767行（約470行削減）。SG-7 BASELINE_LINE_COUNTを
  9768に更新（`split('\n').length`計測、末尾改行分でwc -lと1行ズレるため要注意）。
  Build: PASS。Regression: 5,152件中失敗39件、既知のみ・新規0件。
  Browser Verification: HIGH risk（全画面UI回帰リスク）と判定されたため、
  Founder判断によりこのPRのみ実施——①カレンダー→日付クリック→day detail
  →「編集する」→editPastRecord実行、既存データ（症状「腰痛」）が正しく復元 /
  ②保存ボタン→saveRecordScreen（app-legacy.js残存、無変更）実行、成功メッセージ表示、
  editingDateがnullにリセット、records件数不変（重複作成なし） / ③戻るボタン→
  ホーム画面（screen-home-next）に正しく遷移 / ④bottom-nav「記録」ボタン
  （PR-080A監査で発見した第3の到達経路、window.openLegacyRecordScreen直接呼び出し）
  →openRecordScreen実行、今日の既存記録により自動編集モードに遷移（既存ロジックの
  挙動を維持、Business Logic変更なし）。いずれもConsole Errorなし
  （vite websocket接続失敗等の環境ノイズのみ）。Decision Log: 更新不要。

  ✓ PR-080F  Batch-2 Exit Audit（capstone、監査のみ・新規実装ゼロ） —
  □ app-legacy.jsから対象コード削除済み: **部分的**。openRecordScreen/editPastRecord/
    prefillRecordFromModalは削除済み（PR-080E）。updateStats/buildCalendar/
    closeModal/saveAndSync/saveRecordScreenはapp-legacy.js内に現状維持
    （PR-080C/Dでコメント・DIラッパーのみ追加、物理削除なし）。
  □ Record Screen Moduleへ完全移行: **未完了**。record-screen.jsは新設され
    openRecordScreen/editPastRecordは移行済みだが、saveRecordScreen
    （実際の保存ハンドラ、PR-080Bで発見）は5関数の重複未解決のため未移行。
  □ Legacy Adapter撤去済み: openRecordScreen/editPastRecord系のみ撤去。
    saveRecordScreen系・updateStats/buildCalendar/closeModal/saveAndSyncの
    Adapterは残存（意図的、Business Logic変更禁止の制約による）。
  □ Browser Verification PASS: PR-080Eで実施しPASS（他PRはFounder指示によりskip）。
  □ Build PASS: 全PR（C/D/E）で確認済み。
  □ Regression PASS: 全PR（C/D/E）で5,152件中失敗39件・既知のみを確認済み。
  □ Line Count減少: PASS。10,237行→9,767行（PR-080D以前は横ばい、PR-080Eで大幅減）。
  □ SG-7 PASS: PASS（BASELINE_LINE_COUNT=9768に更新済み）。
  □ Architecture Guard PASS: PASS（tests/arch/ 全11ファイル・104件確認）。
  □ Legacy Access Audit PASS: 該当する専用テストは未検出（tests/arch/に
    "Legacy Access Audit"という名称のテストは存在しない）。SG-7 line-count-guardと
    Architecture Guard群がこれに相当する監視機構と判断。
  □ Rollback可能: 各PR（C/D/E）は独立した差分として整理されており、
    git管理下でPR単位のrevertが可能な状態（未コミット、作業ツリーに保持）。
  □ HANDOFF更新: 本節で実施（Founder指示によりC/D/E/Fをまとめて一括更新）。
  結論: Batch-2 Completion Program（PR-080B〜F）はupdateHistory削除（B）・
  openRecordScreen/editPastRecord物理移動（E）を達成したが、saveRecordScreen物理移動と
  updateStats/buildCalendar/closeModal/saveAndSyncの重複解消は、Business Logic変更
  リスクを理由に完了できなかった。Batch-2は「部分完了」であり、残課題は新規PR
  （番号は次回Founderと確定）として切り出す必要がある。

  ✓ PR-080G  Batch-2残課題整理・saveRecordScreen物理移動の前提条件解消 —
  対象9項目（buildHomeWeekRow/updateHomeCTAState/updateHomeInsightCard/
  updateHomeNumbers/updateHomeDiseaseAdvice/updateStats/buildCalendar/closeModal/
  saveAndSync + calendar.js/calendar-next.js関係）を分類（A:今回削除可能／
  B:bridge化可能／C:別PR／D:Legacy最後まで残す）した上で、実装可能なA区分のみ実施。

  【分類結果】
  A（今回削除可能・実装済み）:
    ・buildCalendar（app-legacy.js・calendar.js両方）/ renderCalendarMonthlySummary
      （同）/ changeMonth（同）: `#calLabel`・`#calGrid`・`#cal-monthly-summary`・
      `#cal-screen-month-label`がapp.html/src/screens/calendar.htmlに存在しないこと
      をgrepで直接確認（動的生成もJS内に存在しないことを確認）。calendar-next.js
      （2026年7月時点の実UI、"cn-"markup・calLabelNew/calGridNext/calPrevNew/
      calNextNew/calTodayBtn）が`window.buildCalendar`を上書き済みであることも
      合わせて確認。changeMonth自体もbare呼び出し0件・window export
      （app-legacy.js側）なしで元々到達不能だったことを確認。
    ・toggleHomeCalendar / prefillRecordFromModal（calendar.js）: 外部呼び出し元が
      ゼロであることをrepo全体grepで確認（app-legacy.js版prefillRecordFromModalは
      PR-080Eで既にrecord-screen.jsへ移動済み、calendar.js側はそれとは別の
      オーファン化した実装）。
  B（bridge化可能・未実装、参考記録のみ）:
    ・calcPainFreeDaysThisMonth/calcAvgPainThisMonth（updateStatsの内部依存）は
      app-legacy.js版とhome-renderer.js版が、状態取得経路（bare `state` 対
      `getState()`）を除き完全に同一ロジックであることを確認。PR-080Eの調査で
      bare `state` と `window.state`/`getState()`は`_ippoStateHooks`により常に
      同一オブジェクト参照であることが判明済みのため、実質的に等価。ただし
      updateStats自体（親関数）はcalcPainFreeDays呼び出し方法の違いと
      buildHomeWeekRow等の連鎖的重複がありC区分のままのため、本PRでは見送り
      （次PRでの部分的bridge化候補として記録のみ）。
    ・closeModal/saveAndSync: PR-080Dで既にrecord-modal-controller.js経由の
      DI委譲ラッパーが確立済み（bridge化は完了済みだが、bare呼び出しが
      app-legacy.js内に複数残るためローカル定義自体は削除不可、実質D区分）。
  C（別PR・Founder/設計判断が必要、要Business Logic差異解消）:
    ・buildHomeWeekRow: app-legacy.js版（フェーズカラー週帯+buildPhaseBar連動の
      独自UI）とhome-renderer.js版（チェック/プラス円のシンプルUI）は同じ
      `#home-week-row`を対象に**全く異なるビジュアルデザイン**を描画する別物と判明。
      統合はUI変更に直結するため、単純な重複解消ではなくどちらを正とするかの
      製品判断が必要。
    ・updateHomeInsightCard: app-legacy.js版のみ`window.buildHomeInsight`
      （prediction付き高度ロジック）を使用、home-renderer.js版は簡易フォールバック
      ロジックのみ。統合はBusiness Logic変更。
    ・updateHomeNumbers: home-renderer.js版のみ`home-next-info`要素を追加更新。
    ・updateHomeCTAState: app-legacy.js版は`buildComparisonComment(rec)`による
      詳細な比較コメント、home-renderer.js版は`_isDailyCheckinCompleted`による
      シンプルな完了判定。UIテキストが異なる別実装。
    ・updateHomeDiseaseAdvice: home-renderer.js版のみPR-6 homeModules可視性制御
      （`dataset.moduleHidden`）を持つ。
    ・updateStats: PR-080C判断を維持（buildHomeWeekRow等の連鎖的重複が残る限り
      安全な統合不可）。
  D（Legacy最後まで残す）:
    ・closeModal/saveAndSync（上記参照、bridge化済みだがbare呼び出し依存のため
      ローカル定義は削除不可）。

  【実装内容】
  app-legacy.js: buildCalendar/renderCalendarMonthlySummary/changeMonthの関数本体
  （93行）を削除し理由コメントに置換。buildCalendar()の無条件bare呼び出し8箇所
  （cloudRestore内・saveRecord内×2・saveEditRecord内・deleteEditRecord内・
  quick-log内・saveRecordScreen内・switchTab内のcalendarタブ分岐）を削除
  （typeof guard付きの3箇所は`typeof`が未宣言識別子に対して安全にfalseを返すため
  無改修で放置）。calYear/calMonth変数とopenDayDetail/openDayDetailByDate
  （bottom-nav・ホーム週セルから到達する生存パス）は変更なし。
  calendar.js: buildCalendar/renderCalendarMonthlySummary/changeMonth/
  toggleHomeCalendar/prefillRecordFromModal、および専用ヘルパー
  `_setCalMonth`/`_setCalYear`（changeMonth削除により無用化）を削除。
  openDayDetail・calYear/calMonth（window mirror含む）は保持。
  window export blockも生存分（`window.openDayDetail`のみ）に整理。

  結果: app-legacy.js 9,767行→9,679行（88行削減）、calendar.js 377行→239行。
  SG-7 BASELINE_LINE_COUNTを9680に更新。Build: PASS。Regression: 5,152件中
  失敗39件、既知のみ・新規0件。念のため実施した軽量Browser確認（正式要求外）:
  カレンダー画面表示（calendar-next.js経由、2026年7月）→日付クリック→
  day detail正常表示（calendar.js生存版openDayDetail経由）、Console Errorなし。

  結論: saveRecordScreen物理移動の前提条件（5関数の重複）は未解消のまま
  （C区分、Founder/製品判断が必要）だが、buildCalendar関連の重複（3関数×2実装＋
  calendar.js側2関数のオーファンコード）はDead Code削除により完全解消。
  Decision Log: 更新不要（Architecture/Roadmap/Business/Founder Strategy変更なし。
  buildHomeWeekRow等5関数のUI差異解消は製品判断を要するためDecision Log候補として
  次回Founderへ提起することを推奨）。

  ✓ PR-081  Batch-3: Premium Gate & Lock — docs/phase4d-legacy-migration-audit.md
  5章「Batch-3」記載の対象6関数（premiumGate/closePremiumLock/updateSettingsHero/
  renderProHero/updatePremiumBadges/submitPremiumWaitlist）を実装前に再監査した結果、
  premiumGate/closePremiumLock/renderProHero/updatePremiumBadges/submitPremiumWaitlist
  の5関数を src/modules/premium/premium-lock.js（新設）へ物理移動 / updateSettingsHero
  のみ対象から除外——settings-display-runtime.js に既に別実装（window.updateSettingsHero、
  initSettingsPanels()呼び出しを追加で行う点のみ相違、load順で後着のため
  window.updateSettingsHeroは常にそちらが勝つ）が存在すると判明し、PR-080C/PR-080Gと
  同型の「重複実装は統合しない」判断を適用（app-legacy.js側のローカル実装は無変更のまま
  維持、どちらを正とするかは製品判断が必要なため本PRのScope外）/ 移動した
  updatePremiumBadges()内の bare `updateSettingsHero()`呼び出しは従来どおり
  app-legacy.js側ローカル実装を呼ぶ必要があるため、`window.__ippoLegacyUpdateSettingsHero`
  という専用ブリッジをapp-legacy.js側に追加（PR-080E `__ippoGetBowelCount`と同型パターン、
  挙動変更なし）/ premiumGate内の callback比較（`callback===openTempReport`等）および
  `state.records`参照は、record-screen.js（PR-080E）と同型でそれぞれ
  `window.openTempReport`等・`window.state.records`に置換（openTempReport/
  openCorrelationReport/openFlareupReport/openCyclePhaseReport/openExperiments/
  calcTemperaturePhases/detectFlareupsはBatch-4以降のScopeのためapp-legacy.jsに残存、
  window export経由で同一オブジェクト参照を維持）/ app.htmlの11箇所
  `onclick="premiumGate(...)"`（音査時点の想定「8箇所」よりapp.html実装は11箇所と判明）は
  window.premiumGateブリッジが維持されるため無改造（PR-079以降のwindow bridge方針を踏襲、
  audit文書が想定していた「onclick全置換」は不要と判明）/ tests/modules/premium-lock.test.js
  新設19件（premiumGate分岐5種・renderProHero両分岐・updatePremiumBadges・
  submitPremiumWaitlist正常/異常系を網羅）/ app-legacy.js: 9,680行→9,569行
  （111行削減）、SG-7 BASELINE_LINE_COUNTを9569に更新 / vitest run全件: 5,171件
  （新規22件はpremium-lock.test.js 19件+line-count-guard更新分）、失敗39件は既知5ファイル
  のみで増加なし / vite build PASS / Browser Verification: app.html実機（Vite dev server）で
  設定タブ→renderProHero()が無料プランUpsellヒーロー（¥580/¥4,800表示）を正しく描画、
  インサイトタブ→premiumGate(openCorrelationReport)等5種のonclickカードクリックで
  premiumLockOverlayが正しく開き、callback別の動的メッセージ（🔬相関/🌸周期/🧪実験/
  該当なしでメッセージ非表示）が期待通り分岐、closePremiumLock()でoverlay解除、
  updatePremiumBadges()で.pf-lock-badge（9箇所）が正しくinline表示、Console Errorなし
  （vite websocket接続失敗・Supabase未設定はローカル開発環境ノイズのみ、既知。なお
  Service Workerの古いキャッシュにより初回ロードでwindow.__ippoLegacyUpdateSettingsHero
  が未定義に見える事象を検出したが、SW cache clear + reloadで解消する検証専用の
  環境要因でありPR-081のコード起因ではないと確認済み）。Decision Log: 更新不要
  （Architecture/Roadmap/Business/Founder Strategy変更なし）。

  ✓ PR-082A  Batch-4 分割①: Doctor Summary / Doctor PDF — 実装前に対象関数の重複実装を
  監査した結果、`openDoctorSummary`/`closeDoctorSummary`（ds-prefix、「からだサマリー」）は
  既存の`src/modules/pro/doctor-summary/doctor-summary.js`が提供する`openDoctorVisitSummary`/
  `closeDoctorVisitSummary`（dvs-prefix、「受診用まとめ」）とは識別子・overlay要素とも
  完全に別物（ファイル冒頭コメントに「完全分離」と明記済み）で衝突なしと確認 → A区分
  （同一ファイルへの拡充として物理移動可能）。`gatherRecordData`は監査対象に含まれていたが、
  実際には`draftRecordScreen`/`saveRecordScreen`（Record Screen保存フロー、PR-080F/080Gで
  未移動と判断済み）専用のデータ収集関数でありPro Reportsのどの関数からも呼ばれていないと
  判明 → C区分（Founder判断が必要、本PRではapp-legacy.js内に現状維持）。
  実装: `openDoctorSummary`/`closeDoctorSummary`/`generateDoctorSummary`（未文書化の結合
  ヘルパー、同梱移動）/`downloadDoctorPDF`/`_generateDoctorPDF`（同）/`copyDoctorSummary`を
  `src/modules/pro/doctor-summary/doctor-summary.js`へ物理移動 / bare `state`参照は
  `window.state`に置換（_ippoStateHooksにより同一オブジェクト参照、挙動変更なし）/
  `document.getElementById('doctorSummaryOverlay').addEventListener(...)`（closeDoctorSummary
  呼び出し元）はapp-legacy.js側のDOM配線処理のためapp-legacy.jsに残置し、importされた
  識別子をそのまま参照する形に変更（PR-079以降のimport-binding方式を踏襲）/
  `generateDoctorSummary`内の`typeof DISEASE_CONFIG !== 'undefined'`分岐は、app-legacy.jsが
  DISEASE_CONFIGをbare importしていないため現状も常にfalseの到達不能コードと判明、
  移動後も同一の到達可能性を保つためDISEASE_CONFIGのimportは追加せず分岐をそのまま温存 /
  jsPDF依存（R-4/MEDIUM）を確認: npm依存ではなくcdnjs.cloudflare.com経由のCDN動的
  スクリプト注入（`window.jspdf`未定義時のみ`<script>`生成、既存機構を無変更のまま移動）
  と判明、リスク解消済みとして記録 / app-legacy.js: 8,977行→（importで6行追加・
  関数本体598行削除）、SG-7 BASELINE_LINE_COUNTを8,977に更新 / vitest run全件:
  5,171件、失敗39件は既知5ファイルのみで増加なし（新規テスト追加なし、DOM操作中心の
  UI関数の純粋物理移動のためBrowser Verificationで代替、PR-080E/PR-081と同型判断）/
  vite build PASS / Browser Verification: `window.openDoctorSummary()`実行→
  doctorSummaryOverlayに`active`クラス付与・からだサマリー本文生成（体温/エネルギー等の
  集計文章）を確認、`window.closeDoctorSummary()`→`active`クラス除去→再度open可能、
  `window.copyDoctorSummary()`→コピー処理自体は実行されるがクリップボード読み取り確認は
  ヘッドレス環境のdocument focus制約により未検証（既存コードと同一のnavigator.clipboard
  API呼び出しのため本PR起因の問題ではない）、`window.downloadDoctorPDF()`→
  「PDF生成中…」表示・jsPDF CDN読み込み試行を確認（サンドボックス環境の外部ネットワーク
  制限によりCDN読み込み完了は未確認、既存コードと同一の動作でありPR起因ではない）、
  いずれもConsole Errorなし（vite websocket接続失敗の環境ノイズのみ、既知）。
  Decision Log: 更新あり（docs/LEGACY_REMOVAL_PLAN.md 10-B章、PR-082のA〜G分割）。

  【Scope分割・次PRへの引き継ぎ】Founder指示によりPR-082をPR-082A〜G
  （Doctor Summary→AI Analysis→Monthly Report→Cycle Phase Report→Temperature Report→
  Flareup/Correlation Report→Exit Audit）に分割（詳細: docs/LEGACY_REMOVAL_PLAN.md
  4章・10-B章）。本チャットではPR-082Bの先行ドラフトとして以下7ファイルを作成/編集済み
  だがapp-legacy.js側への配線（import追加）は未実施（Scope外のため保留、Founder判断で
  「次PR用に保持」を選択）: `src/modules/pro/analysis/analysis-overlay.js`（新設）/
  `src/modules/pro/monthly-report.js`（新設）/`src/modules/pro/cycle-report.js`（新設）/
  `src/modules/pro/temp-report.js`（新設）/`src/modules/pro/flareup-report.js`（新設）/
  `src/modules/pro/correlation-report.js`（新設）/`src/modules/pro/shared/
  pro-metric-utils.js`（`calcWellnessScore`追加）。PR-082B以降の着手時は、これらドラフトの
  内容をapp-legacy.jsの最新状態と再照合してから正式に組み込むこと（本PR時点のapp-legacy.js
  からの抽出のため、後続PRでのapp-legacy.js変更と差分が生じていないか要確認）。
  ✓ PR-082B  Batch-4 分割②: AI Analysis Overlay — 先行ドラフト
  `src/modules/pro/analysis/analysis-overlay.js`をapp-legacy.js最新状態と再照合し
  差分なしを確認、`openAIAnalysis`/`closeAIAnalysis`/`runAIAnalysis`/`copyAIAnalysis`を
  import参照化。`callAIAPI`はwindow非公開の内部ヘルパーのため非export（元実装と同型）。
  bare `state`→`window.state`置換のみ（Business Logic変更なし）。PR-082B単体では
  Founder指示（実行プログラム）によりRegression/Build実施を保留し実装のみ完了。
  ✓ PR-082C  Batch-4 分割③: Monthly Report — `src/modules/pro/monthly-report.js`
  （ドラフト差分なし）を配線。`openMonthlyReport`/`closeMonthlyReport`/
  `changeReportMonth`/`updateMonthLabel`/`downloadReportPDF`をimport参照化
  （`generateMonthlyReport`は非export内部ヘルパー、元実装と同型）。本PRでRegression
  実施時、PR-082Bが原因で`tests/analytics/phase4-c4-legacy-removal.test.js`が
  4件FAILしていたことを検出（callAIAPI/runAIAnalysisの文字列一致アサーションが
  app-legacy.jsの生テキストを直接参照していたため、物理移動後にFAILした）。
  アサーション対象をanalysis-overlay.jsへ向け直す形でテスト側を修正し20件全PASSへ
  回復（Business Logic変更なし、テストのアサーション対象ファイル訂正のみ）。
  vitest run全件: 5,132件PASS、失敗39件は既知5ファイルのみで増加なし / vite build PASS。
  ✓ PR-082D  Batch-4 分割④: Cycle Phase Report — `src/modules/pro/cycle-report.js`
  （ドラフト差分なし）を配線。`openCyclePhaseReport`（385行付近）と
  `renderPhaseMap`/`selectPhaseTab`/`_buildPhaseBarPreview`（3077行付近、app-legacy.js内
  で不連続な2ブロックだった）をそれぞれimport参照化。premium-lock.jsの
  `callback === window.openCyclePhaseReport`同一性比較はimport bindingがそのまま
  window bridgeへ渡るため無改造で機能継続を確認。vitest run全件: 5,132件PASS、
  失敗39件は既知5ファイルのみで増加なし / vite build PASS。
  ✓ PR-082E  Batch-4 分割⑤: Temperature Report — `src/modules/pro/temp-report.js`
  （ドラフト差分なし）を配線。`calcTemperaturePhases`/`openTempReport`/
  `showTempEducation`をimport参照化。Scope外のPR-082F対象関数（line 3610/4992の
  bare `calcTemperaturePhases(state.records)`呼び出し）およびapp-legacy.js内の
  `_origOpenRecord`ラップ処理（showTempEducationをbareで呼ぶglue code、Scope外）が
  import binding経由で無改造のまま解決されることを確認。vitest run全件: 5,132件PASS、
  失敗39件は既知5ファイルのみで増加なし / vite build PASS。
  ✓ PR-082F  Batch-4 分割⑥: Flareup Report / Correlation Report —
  `src/modules/pro/flareup-report.js`/`src/modules/pro/correlation-report.js`/
  `src/modules/pro/shared/pro-metric-utils.js`（`calcWellnessScore`、ドラフト差分なし）を
  配線。`detectFlareups`/`openFlareupReport`/`calcFactorCorrelations`/`setCGRange`/
  `toggleCGFactor`/`getMetricValue`/`getMetricLabel`/`getMetricMax`/
  `renderComparisonChart`/`openCorrelationReport`/`calcWellnessScore`の11関数は
  app-legacy.js内で完全に連続した1ブロックだったため一括物理移動。
  saveRecordScreen()内のbare `calcWellnessScore(rec)`呼び出し（Scope外・Record Screen
  保存フロー）はimport binding経由で解決継続を確認。vitest run全件: 5,132件PASS、
  失敗39件は既知5ファイルのみで増加なし / vite build PASS。
  ✓ PR-082G  Batch-4 Exit Audit（capstone）— Architecture Guard（tests/arch/
  全13ファイル120件PASS、Forbidden Dependency違反ゼロ）/ Regression（vitest run全件
  5,171件中5,132件PASS、失敗39件は既知5ファイル(build-draft-from-ui.test.js・
  save-record-screen.test.js・disease-analyzer.test.js・domain-event-types.test.js・
  event-menstrual.test.js)のみで増加なし）/ Build（vite build PASS、警告は既存の
  チャンク循環参照・動的/静的import混在・チャンクサイズ超過のみで本Batch無関係）/
  Browser Verification（Vite dev server + app.htmlで6機能全て実機確認: AI Analysis
  Overlay/Monthly Report/Cycle Phase Report/Temperature Report/Flareup Report/
  Correlation Reportのopen→データ描画（月次統計・体温二相性解析・フレアアップ検出・
  ファクター相関計算いずれも21日分の合成データで正しい数値を算出）→close一連の
  動作を確認、insufficient-data分岐（体温14日未満）も正しくフォールバック表示、
  Console Errorは既知のvite websocket接続失敗ノイズのみで新規エラーなし）/
  SG-7更新（tests/arch/legacy-removal-pr079-line-count-guard.test.js
  BASELINE_LINE_COUNTを7,071に更新、PR-082A→G累計でBatch-4のみ8,977→7,071行
  ・1,906行削減）/ Decision Log確認（docs/LEGACY_REMOVAL_PLAN.md 10-B章に
  完了報告を追記、10-B章の既存決定事項の範囲内で完了のため新規Decision Log項目なし）
  / 4章ロードマップ表のPR-082B〜F「変更ファイル数」列を「未定」から実際の移動先
  ファイル名で確定。app-legacy.js: 8,977行（PR-082A時点）→7,071行（Batch-4累計、
  Doctor Summary/AI Analysis/Monthly Report/Cycle Phase Report/Temperature Report/
  Flareup・Correlation Report・calcWellnessScoreの物理移動完了）。
  ★ Legacy Removal Program Batch-4（PR-082A〜G、Pro Reports）完了。
  ✓ PR-083  Batch-5: Sync Modal & Auth UI — docs/phase4d-legacy-migration-audit.md Batch-5節（約6関数）に基づき、
  openSyncModal/closeSyncModal/showLoginForm/toggleSyncMode/showMessage/hideMessageの6関数を
  src/modules/sync-modal.js（新設）へ物理移動 / renderSyncUI/submitSync/syncNow/logoutSync/
  migrateDataToUserはSync本体ロジック（Supabase認証フロー）のため本PRのScope外、app-legacy.jsに残置 /
  移動した openSyncModal 内の bare `renderSyncUI()`呼び出しは、renderSyncUI が app-legacy.js側に
  残置されているため `window.renderSyncUI` 専用ブリッジ（PR-080E `__ippoGetBowelCount`と同型パターン）
  経由に変更 / toggleSyncMode が読み書きする `syncMode`（app-legacy.js側の var、submitSyncが参照）は
  `window.__ippoGetSyncMode()`/`__ippoSetSyncMode()` 経由の読み書きに変更（同型パターン）/
  showLoginForm内の`onclick="submitSync()"`/`onclick="toggleSyncMode()"`は既存のwindow bridge
  （app-legacy.js末尾のEXPOSE FUNCTIONS TO GLOBAL SCOPEブロック・alphabetical typeof-listブロック）が
  import後の識別子をそのまま参照するため無改造で解決を確認 / 新規テスト追加なし（DOM操作中心のUI関数の
  純粋物理移動のためBrowser Verificationで代替、PR-082A〜Fと同型判断）/ app-legacy.js: 7,071行→7,024行、
  SG-7 BASELINE_LINE_COUNTを7,025（countLines=split('\n').length、実行数+1）に更新 / vitest run全件:
  5,171件、失敗39件は既知5ファイル（build-draft-from-ui.test.js・save-record-screen.test.js・
  disease-analyzer.test.js・domain-event-types.test.js・event-menstrual.test.js）のみで増加なし /
  vite build PASS（警告は既存のチャンク循環参照・動的/静的import混在・チャンクサイズ超過のみで
  本PR無関係）/ Browser Verification: Vite dev server + app.html実機で `window.openSyncModal()` →
  未ログイン状態のためrenderSyncUI→showLoginForm()が発火しログインフォーム表示を確認、
  `toggleSyncMode()`（#syncToggleBtnクリック）でsignup/login表示切替とsyncModeブリッジの値同期を確認、
  空欄で送信→`showMessage()`によるエラー表示を確認、モード再トグルで`hideMessage()`によるメッセージ
  クリアを確認、`.sync-close-btn`クリックで`closeSyncModal()`によるoverlay解除を確認。Console Errorは
  vite websocket接続失敗ノイズと、Supabase未設定環境（VITE_SUPABASE_ANON_KEY未設定のSAFE_BOOTSTRAP_MODE）
  によるrenderSyncUI内`supabase.auth.getSession()`のTypeError（try/catchで正しくshowLoginForm()に
  フォールバック済み、renderSyncUI自体は本PR無変更・環境要因）のみで新規エラーなし。なお初回ロード時に
  Service Workerの古いキャッシュにより`window.renderSyncUI`/`window.__ippoGetSyncMode`が未定義に
  見える事象を検出したが、SW cache clear + reloadで解消する検証専用の環境要因でありPR-081と同型
  （PR起因ではない）。Decision Log: 更新不要（Architecture/Roadmap/Business/Founder Strategy変更なし）。
  ✓ PR-084  Batch-6: Settings & Data Management — docs/phase4d-legacy-migration-audit.md Batch-6節（約18関数）に基づき、
  以下4ファイルへ物理移動 / 移植先はaudit文書の想定（settings-panel.js/disease-settings.js拡充）から
  実装前調査の結果修正（後述）:
    - `src/modules/symptom-settings.js`（新設）: openSymptomSettings/closeSymptomSettings/
      saveSymptomSettings/getRecentSymptoms/saveSymptomSelection/updateSymptomSettingDisplay/
      buildSymptomChips/applySymptomChipPriority + ALL_SYMPTOMS（症状設定は既存settings-panel.js
      と無関係の別UI体系のため、audit想定の「settings-panel.js拡充」ではなく専用新設ファイルへ変更
      — doctor-summary.js「1 feature = 1 screen owner」設計ルールを踏襲）
    - `src/modules/record-section-order.js`（新設）: reorderRecordSections（audit想定の
      「disease-settings.js拡充」から変更。理由: disease-settings.jsは実装前調査でsrc/内のどこからも
      importされていない orphaned module と判明——app.html/settings.htmlの
      `onclick="openDiseaseSettings()"`が現在window.openDiseaseSettings未定義で機能していない
      既存バグ（本PR起因ではない、別タスクで追跡）。もしreorderRecordSectionsをdisease-settings.js
      へ追加するとapp-legacy.jsからのimportが必要になり、副作用としてdisease-settings.js全体が
      初めてバンドルされ`window.openDiseaseSettings`等が意図せず「直る」——Business Logic変更なし
      原則に反するため回避し独立ファイルへ分離)
    - `src/modules/data-export.js`（新設）: exportJSON/exportCSV/csvSafe/formatDiseaseCheck/clearData
    - `src/modules/ui-notifications.js`（拡充）: showConfirmModal/showAlertModal/showPrivacyInfo/
      setDailyMessage
  bare `state`→`window.state`（_ippoStateHooks経由、全ファイル共通）/ saveSymptomSettings内の
  `saveState()`/`updateRecordSymptoms()`は既存window bridge idiom経由の呼び出しに変更 / clearData内の
  bare `updateStats()`はhome-renderer.js側の別実装と衝突するため（PR-080C重複整理と同型の
  「統合しない」判断）専用ブリッジ`window.__ippoLegacyUpdateStats`を新設（PR-081
  `__ippoLegacyUpdateSettingsHero`と同型）/ clearData内のbare `fastInterval`操作（Batch-7未移植の
  Fasting Timer機能変数）は`window.__ippoStopFastInterval()`専用ブリッジ経由に変更（PR-080E
  `__ippoGetBowelCount`と同型）/ openSyncModal→renderSyncUIと同型で、reorderRecordSections内の
  bare `updateDiseaseQuestions()`はapp-legacy.js側ローカルラッパーと同一のguarded window呼び出しに
  変更（disease-settings.js未import状態のため現状も実質no-op、挙動変更なし）/
  buildSymptomChips内の bare `DISEASE_CONFIG[d]`（未import、dead code）はPR-082A方式で温存 /
  【実装前調査での追加発見】openSymptomSettings/closeSymptomSettings/saveSymptomSettings/
  updateSymptomSettingDisplayが操作するDOM（symptom-setting-display等）は現行app.html/settings.htmlに
  存在せず、呼び出し元onclickも見つからない（openSymptomSettings系4関数は現行UIから到達不能。
  buildSymptomChips/applySymptomChipPriorityと同型のdead code、本PR起因ではなく既存状態を保持）/
  disease-settings.jsが未importで実質死んでいる件（`気になる疾患を選択`ボタンが本番で無反応）は
  spawn_taskで別タスク化済み（本PRのScope外）/ 新規テスト追加なし（DOM操作中心のUI関数の純粋物理移動、
  PR-082A〜Fと同型判断、Browser Verificationで代替）/ app-legacy.js: 7,025行→6,649行（wc -l）、
  SG-7 BASELINE_LINE_COUNTを6,650（countLines=split('\n').length）に更新 / vitest run全件: 5,171件、
  失敗39件は既知5ファイル（build-draft-from-ui.test.js・save-record-screen.test.js・
  disease-analyzer.test.js・domain-event-types.test.js・event-menstrual.test.js）のみで増加なし /
  vite build PASS（警告は既存のチャンク循環参照・動的/静的import混在・チャンクサイズ超過のみで
  本PR無関係）/ Browser Verification: Vite dev server + app.html実機（SW cache clear必須、PR-081/083と
  同型の既知環境要因）で以下を確認 — `window.openSymptomSettings()`→症状チップ20件描画→2件選択→
  `saveSymptomSettings()`→`window.state.mySymptoms`に正しく反映・overlay解除を確認（到達経路は
  window直接呼び出しのみ、上記の通り現行UIからは到達不能）/ 設定画面「記録をCSVで書き出す」行の
  実クリックで`exportCSV()`が正しいファイル名・BOM付きUTF-8（先頭バイト239,187,191を確認）でBlobを
  生成しa.click()を実行することを確認 / 「データをリセット」行の実クリック→確認モーダル→確認ボタンで
  `clearData()`が発火しrecords/streak/totalDaysが空になり2.5秒後も復元されないことを確認（手動で
  window.state.recordsを直接上書きする形の検証手順ではsetState()フック外の書き込みにより一時的に
  復元されて見える現象を確認したが、実際のUIクリック起点のフローでは問題なし、本PR起因ではない
  テスト手法上のアーティファクトと判断）/ `showConfirmModal`→`showPrivacyInfo`→`showAlertModal`の
  連鎖呼び出しを確認 / `reorderRecordSections()`はstate.myDiseases設定時・DOM未マウント時でも
  エラーなく実行（既存のguard節により安全にno-op）/ Console Errorはvite websocket接続失敗ノイズと
  Supabase未設定環境ノイズのみで新規エラーなし。Decision Log: 更新不要（Architecture/Roadmap/Business/
  Founder Strategy変更なし）。

  ✓ PR-084A  disease-settings.js復旧（Bugfix, FASTモード）— PR-084で発見・spawn_task化された
  「disease-settings.jsが未importで実質死んでいる」件を修正 / 原因調査（git log -S）の結果、
  491d0fd（Phase 4-C: 10モジュール新設）でapp-legacy.jsからDisease Settings UI 7関数を
  disease-settings.jsへ抽出した際、import wiring自体が一度も追加されていなかったと判明
  （「外れた」のではなく「最初から未接続」）/ 同一コミットで新設されたtimeline.js/experiments.js/
  vision.js/meal-tracker.js/pain-scale.jsも同様に未importと確認したが、本PRはdisease-settings.js
  のみがScope（他ファイルは別タスク）/ disease-settings.jsは末尾でwindow.openDiseaseSettings等を
  自己登録する設計（settings-panel.jsと同型、symptom-settings.js等のapp-legacy.js内named-import+
  window bridge方式とは異なる）と判明したため、src/main.jsのsettings-panel.js import直後
  （app-legacy.js importより後、Settings系importのまとまりに追加）に
  `import './modules/disease-settings.js';` を1行追加 / disease-settings.js本体・app-legacy.js・
  app.html・settings.htmlは無変更（Business Logic変更ゼロ、UI変更ゼロ）/ Browser Verification
  （Vite dev server + app.html実機、SW cache clear必須・PR-081/083/084と同型の既知環境要因）:
  window.openDiseaseSettings()→「気になる疾患を選択」overlay表示→子宮内膜症チップ選択→
  saveDiseaseSettings()→state.myDiseases=["子宮内膜症"]反映・disease-setting-display表示更新・
  overlay解除を確認 / Record画面へ遷移しSTEP 4「疾患セルフチェック」に子宮内膜症の質問
  （生理痛の強さ/性交痛/排便時の痛み/生理以外の骨盤痛）が表示されることを確認 / Console Errorは
  vite websocket接続失敗ノイズのみで新規エラーなし / 新規テスト追加なし（1行importのみ、
  Browser Verificationで代替）/ vitest run全件: 5,171件、失敗39件は既知5ファイル
  （build-draft-from-ui.test.js・save-record-screen.test.js・disease-analyzer.test.js・
  domain-event-types.test.js・event-menstrual.test.js）のみで増加なし / vite build PASS
  （警告は既存のチャンク循環参照・動的/静的import混在・チャンクサイズ超過のみで本PR無関係）。
  Decision Log: 更新不要（Architecture/Roadmap/Business/Founder Strategy変更なし）。

  ✓ PR-085  Batch-7: Meal Tracker & Fasting — docs/LEGACY_REMOVAL_PLAN.md 4章 / phase4d-legacy-migration-audit.md
  Batch-7節（約13関数）に基づき、以下2ファイルへ物理移動:
    - `src/modules/meal-tracker.js`（拡充）: parseMealMemo/_updateMealParseFreetextLegacy/
      saveMealDraft/toggleMealSection/renderMealSections/updateMealParse + 付随するmodule-scope
      `mealSectionConfig`/`openMealSections`（toggleMealSection/renderMealSections/updateMealParse
      間でのみ共有のため非export）+ `rs-meal-free` input リスナー登録（`_ippoInputListenerAdded`
      ガード込み）
    - `src/modules/fasting.js`（新設）: setFastGoal/endFast/startFastTimer/resumeFasting/
      updateFastingWidgetPhase/toggleFastingFeature/applyFastingVisibility
  【実装前調査での重要な発見】meal-tracker.jsはPhase 4-C（openMealTimePicker/addMealTime新設）
  以来 main.js/app-legacy.jsのどこからもimportされていないorphaned moduleだったと判明
  （disease-settings.js・PR-084Aと同型のギャップ）。本PRでapp-legacy.js冒頭に
  `import { ... } from './modules/meal-tracker.js';` を追加したことで、追加の復旧PRなしに
  初めてバンドル対象になり解消（PR-084A同様の個別バグ修正PRは不要だった）/
  FAST_PHASE_CONFIG/FAST_DISEASE_OVERRIDE（疾患別ファスティング推奨値データ）はtoggleFast()
  （app-legacy.js残置、Batch-7対象外）も参照するためfasting.jsをsource of truthとしexport、
  app-legacy.js側でimport back（既存の物理移動→import-back idiomをデータ定数にも適用）/
  fastInterval（module-scopeタイマーID）とwindow.__ippoStopFastInterval ブリッジ
  （PR-084 clearData()が呼ぶ）もfasting.jsへ完全移動 / endFast内のbare `saveAndSync()`は、
  window.saveAndSyncがrecord-modal-controller.jsのPhase D-1パターンに既に先取りされ現状no-op
  のため、専用ブリッジ`window.__ippoLegacySaveAndSync`経由に変更（PR-084
  `__ippoLegacyUpdateStats`と同型パターン、実体のsaveAndSync呼び出しは維持）/
  getCurrentCyclePhase()/showRecoveryGuide()はapp-legacy.js側にも同名の薄いwindowブリッジ
  委譲ラッパーが残る（toggleFast等Batch-7対象外関数が使用）ため、fasting.js側にも同一実装を
  ローカル複製（真の実装はcycle側/recovery-journey.js側にあり単なる委譲ラッパーの複製）/
  【実装前調査でのもう一つの発見】toggleMealSection/renderMealSections/updateMealParse/
  saveMealDraftが対象とするDOM（`meal-sections`コンテナ・`meal-btn-*`ボタン・
  `draft-saved-msg`）およびfasting.jsの7関数が対象とするDOM
  （`fast-start-btn`/`fast-stop-btn`/`fast-timer`/`fast-status`/`.fw-pill`/
  `fasting-toggle-label`等）は現行app.htmlに一切存在せず（`home-fasting-widget`は常に空div）、
  呼び出し元onclickも見つからない — 現行UIから到達不能な既存のdead code
  （PR-084 symptom-settings.js系4関数と同型判断、本PR起因ではなく現状維持）。一方
  parseMealMemo/_updateMealParseFreetextLegacy（`rs-meal-free`自由記述メモ欄の自動解析）は
  現行UIから到達可能でactiveなことをBrowser Verificationで確認 / 新規テスト追加なし
  （DOM操作中心のUI関数の純粋物理移動、PR-082A〜PR-084と同型判断、Browser Verificationで代替）/
  SG-7: tests/arch/legacy-removal-pr079-line-count-guard.test.js BASELINE_LINE_COUNTを
  6,650→6,242に更新 / app-legacy.js: 6,650行→6,242行 / vitest run全件: 5,171件、失敗39件は
  既知5ファイル（build-draft-from-ui.test.js・save-record-screen.test.js・
  disease-analyzer.test.js・domain-event-types.test.js・event-menstrual.test.js）のみで増加なし
  / vite build PASS（警告は既存のチャンク循環参照・動的/静的import混在・チャンクサイズ超過の
  みで本PR無関係）/ Browser Verification: Vite dev server + app.html実機で以下を確認 —
  record画面`rs-meal-free`に食事メモ3件を入力→input イベント発火→`meal-auto-parse`ボックスが
  表示され食事回数3・最初07:00・最後19:00を正しく算出することを確認 / settings画面
  `toggleFastingFeature()`のonclick経由でstate.fastingEnabled切替・`home-fasting-widget`表示
  切替・localStorage永続化（`window.saveState()`経由）を確認 / setFastGoal/startFastTimer/
  endFast/resumeFasting/updateFastingWidgetPhaseを直接呼び出しエラーなく実行されること
  （`__ippoStopFastInterval`/`__ippoLegacySaveAndSync`ブリッジ経由の呼び出しを含む）を確認 /
  Console Errorはvite websocket接続失敗ノイズとSupabase未設定環境ノイズのみで新規エラーなし。
  Decision Log: 更新不要（Architecture/Roadmap/Business/Founder Strategy変更なし）。

  ✓ PR-086  Batch-8: Home Insight & Cycle UI — docs/LEGACY_REMOVAL_PLAN.md 4章 /
  phase4d-legacy-migration-audit.md Batch-8節（約12関数）に基づき実装。実装前調査の結果、
  audit記載の12関数のうち getDailyHint / getDiseaseMorningQuestion の2件はPR-079
  （Batch-1）で既に record-input.js へ物理移動済み（app-legacy.js側は
  `const getDailyHint = RecordInput.getDailyHint;` 等のaliasのみ残置）と判明したため、
  本PRの実対象は残り10関数
  （renderInsightDiscoveries/_updateInsMainCard/switchInsTab/updateFoodBodyCorrelation/
  updateCycleSymptomCorrelation/buildComparisonComment/isPeriodExpected/getPhaseForDate/
  updateTodayMessage/updateDailyHintCard）+ 未文書化ヘルパー2件
  （buildDayComparison/buildWeekComparison、buildComparisonCommentからのみ呼ばれる専用
  ヘルパーのためクラスタごと同伴移動、PR-082分割クラスタと同型判断）:
    - `src/modules/cycle-utils.js`（新設）: getPhaseForDate/isPeriodExpected/
      buildComparisonComment/buildDayComparison/buildWeekComparison
    - `src/modules/insights-tab-panel.js`（新設）: switchInsTab/renderInsightDiscoveries/
      _updateInsMainCard/updateFoodBodyCorrelation/updateCycleSymptomCorrelation
      （audit想定の「insights-dynamic-renderer.js拡充」から変更。理由: 実装前調査で
      insights-dynamic-renderer.jsはsignal→resolver→templateパイプライン・comment
      stabilization等の設計原則を持つ別世代の独立した動的インサイトレンダラーと判明し、
      本PRが扱う旧5タブ切り替え体系（ins-pane-*/ins-tab-btn-*/discoveries-cards）とは
      責務・DOM体系が異なるためsymptom-settings.js/disease-settings.js分離＝
      「1 feature = 1 owner」判断を踏襲し専用新設ファイルへ）
    - `src/modules/home-renderer.js`（拡充）: updateTodayMessage/updateDailyHintCard
  bare `state`→`window.state`（既存idiomと同型）/ raw `isPremium`
  （updateFoodBodyCorrelation/updateCycleSymptomCorrelationが参照）はapp-legacy.js側に
  新設した専用ブリッジ `window.__ippoGetIsPremium()` 経由（isAdminOrPremium()は管理者
  バイパスを含み意味が異なるため使用せず、PR-080E __ippoGetBowelCountと同型の新規ブリッジ）/
  switchInsTab内のrenderMonthlySummaryText/renderComparisonChart/renderPhaseMap/
  renderTimeline（いずれもBatch-8対象外・app-legacy.js等に残置）はwindow.*経由の
  guarded呼び出しに変更（モジュール境界を越えるため、既存挙動は不変）/
  updateTodayMessage内のgetCurrentCyclePhase（app-legacy.js残置、多数の他関数が使用中の
  ため移動不可）はrecovery-journey.js/onboarding-runtime.jsと同型のwindow.getCurrentCyclePhase
  guarded呼び出しに変更。
  【実装前調査での重要な発見・3件】
  1) `updateCycleSymptomCorrelation`内の`displayPhases[cycle]`は、app-legacy.js含め
     リポジトリ全体のどこにも定義が存在しない未解決識別子（ReferenceErrorを起こす
     潜在バグ）と判明。ただし対象コンテナ`#cycle-symptom-correlation`が現行app.htmlに
     存在せず関数冒頭で必ず早期returnするため到達不能（pre-existing dead code、
     本PR起因ではない）。挙動を変えないためbareのまま温存し修正せず。
  2) `switchInsTab`/`renderInsightDiscoveries`/`updateFoodBodyCorrelation`/
     `updateCycleSymptomCorrelation`が対象とするDOM（`ins-pane-*`/`ins-tab-btn-*`/
     `ins-main-insight-*`/`discoveries-cards`/`food-body-correlation`/
     `cycle-symptom-correlation`）は現行app.htmlに一切存在せず、旧5タブ切り替え体系
     全体が現行UIから到達不能と確認（insights-dynamic-renderer.js/
     insights-clinical-summary.js等の新世代UIに置き換わっている）。ファイル分離判断
     （上記）の直接的根拠。
  3) `updateTodayMessage`含む7関数（buildHomeWeekRow/updateHomeInsightCard/
     updateHomeNumbers/updateHomeDiseaseAdvice/updateHomeCTAState/
     updateHomePhaseBanner/updateTodayMessage）は、`home-next-shell.js`の
     `initHomeNext()`がデフォルト有効（`isHomeNextEnabled()`は明示的に無効化
     されない限りtrueを返す設計、ファイル冒頭コメント「フラグOFFの場合は既存homeに
     影響しない」は実装と不一致の記述）でありapp起動時に無条件で`window.X = noOp`
     上書きするため、通常起動では常にno-op（pre-existing、Batch-8対象外・
     home-next側の設計判断）。物理移動後の実装自体はmodule importを直接介した
     Browser Verificationで正しく動作することを確認済み。
  新規テスト追加なし（DOM操作中心のUI関数の純粋物理移動、PR-082A〜PR-085と同型判断、
  Browser Verificationで代替）/ SG-7: tests/arch/legacy-removal-pr079-line-count-guard.test.js
  BASELINE_LINE_COUNTを6,242→5,611に更新 / app-legacy.js: 6,242行→5,611行 / vitest run全件:
  5,171件、失敗39件は既知5ファイル（build-draft-from-ui.test.js・save-record-screen.test.js・
  disease-analyzer.test.js・domain-event-types.test.js・event-menstrual.test.js）のみで増加なし
  / vite build PASS（警告は既存のチャンク循環参照・動的/静的import混在・チャンクサイズ超過の
  みで本PR無関係）/ Browser Verification: Vite dev server + app.html実機（SW cache clear必須、
  PR-081/083/084/085と同型の既知環境要因）で以下を確認 — getPhaseForDate/isPeriodExpected/
  buildComparisonCommentを実データで実行し「卵胞期」判定・比較コメント生成が正しいことを確認 /
  home-renderer.js経由のdynamic importでupdateTodayMessageを直接呼び出し
  （home-next no-op上書きを回避）、streak表示テキストが正しく算出されることを確認 /
  updateDailyHintCardはno-op対象外のためwindow経由の直接呼び出しでヒントカードHTML生成を確認 /
  switchInsTab('recommended')実行でrenderInsightDiscoveries→_updateInsMainCardの連鎖が
  正しく動作しインサイト文言・タブ表示切替を確認 / updateFoodBodyCorrelationで
  `ippo:premium-updated`イベント経由のisPremium切替に応じロック/アンロック表示が
  正しく切り替わることを確認（`__ippoGetIsPremium()`ブリッジの動作確認を兼ねる）/
  Console Errorはvite websocket接続失敗ノイズとSupabase未設定環境ノイズのみで新規エラーなし。
  Decision Log: 更新不要（Architecture/Roadmap/Business/Founder Strategy変更なし）。

  ✓ PR-087  Batch-9: Utility & Misc（純粋関数）— docs/LEGACY_REMOVAL_PLAN.md 4章 /
  phase4d-legacy-migration-audit.md Batch-9節（約18関数）に基づき実装。実装前調査の結果、
  audit記載18件のうち csvSafe / formatDiseaseCheck（PR-084 Batch-6で既にdata-export.jsへ）・
  calcWellnessScore（PR-082F Batch-4分割⑥で既にpro-metric-utils.jsへ）の3件は既に物理移動済み
  と判明したため、本PRの実対象は残り15関数:
    - `src/utils/string-utils.js`（新設）: escapeHtml/getTimeAgo/toLocalDateKey
    - `src/utils/stats-utils.js`（新設）: calcPainFreeDaysThisMonth/calcAvgPainThisMonth/calcSMIScore
    - `src/modules/share.js`（新設）: shareApp/addToHome
    - `src/modules/feedback.js`（新設）: setRating/submitFeedback
    - `src/modules/temp-alert.js`（新設）: checkSuddenTempRise/checkAndShowTempAlert/showTempAlertBanner
    - `src/modules/record-factors.js`（新設）: addCustomFactor
    - `src/modules/success-message.js`（新設）: getSuccessMessage
  addCustomFactor / getSuccessMessage はaudit文書が移植先を明示していなかったため実装前調査を実施:
  addCustomFactorが操作する`#rs-factors`チップ群のtoggleRsChipはBatch-9対象外でapp-legacy.js残置
  （Batch-2系のopenRecordScreen DIスキャフォールド待ち）と判明したが直接依存はないため、
  disease-settings.js/symptom-settings.js分離と同型の「1 feature = 1 owner」判断で
  record-factors.js/success-message.jsへそれぞれ専用新設分離（cycle-utils.js/temp-alert.js等の
  既存前例踏襲）/ bare `state`→`window.state`、bare `ICONS`→`window.ICONS`（home-renderer.js等の
  既存idiomと同型）/ 全15関数はapp-legacy.js側で該当import経由で再取得し、既存のwindow bridge
  （`if (typeof X === "function") window.X = X;`）は無変更で機能継続を確認 / 新規単体テスト22件
  追加: tests/utils/string-utils.test.js（10件）+ tests/utils/stats-utils.test.js（7件）+
  tests/modules/temp-alert.test.js（5件、checkSuddenTempRiseのみ — 他2関数はDOM操作中心のため
  Browser Verificationで代替、既存Batch方針を踏襲）/ SG-7:
  tests/arch/legacy-removal-pr079-line-count-guard.test.js BASELINE_LINE_COUNTを5,611→5,408に更新 /
  app-legacy.js: 5,611行→5,408行 / vitest run全件: 5,193件、失敗39件は既知5ファイル
  （build-draft-from-ui.test.js・save-record-screen.test.js・disease-analyzer.test.js・
  domain-event-types.test.js・event-menstrual.test.js）のみで増加なし（新規22件はすべてPASS）/
  vite build PASS（警告は既存のチャンク循環参照・動的/静的import混在・チャンクサイズ超過のみで
  本PR無関係）/ Browser Verification: Vite dev server + app.html実機で以下を確認 —
  escapeHtml/getTimeAgo/calcSMIScoreを実データで実行し既存挙動と一致することを確認 /
  getSuccessMessage(streak=7)が★アイコン・「7日連続達成！」を正しく返すことを確認 /
  checkSuddenTempRiseが前日比0.9℃上昇でcaution判定を返すことを確認 / setRating(4)実行で
  .fb-star 4個がactiveクラスを持つことを確認 / addCustomFactor実行で#rs-factorsに新規chipが
  追加されテキストが反映されることを確認（toggleRsChip依存なしの動作確認を兼ねる）/
  Console Errorはvite websocket接続失敗ノイズのみで新規エラーなし。
  Decision Log: 更新不要（Architecture/Roadmap/Business/Founder Strategy変更なし）。
  Next: PR-088 — Batch-10: Community & Admin（docs/LEGACY_REMOVAL_PLAN.md 4章参照、
  MEDIUM リスク・Supabase直接呼び出しのためsupabase.js経由への整理を要確認）。

  ✓ PR-088  Batch-10: Community & Admin — docs/LEGACY_REMOVAL_PLAN.md 4章 /
  phase4d-legacy-migration-audit.md Batch-10節（約9関数）に基づき実装。audit記載9件
  （loadCommunityTopic/loadCVArchive/toggleArchiveReplies/loadCommunityReplies/
  postCommunityReply/likeCommunityReply/initAdminPanel/adminSetPremium/
  adminLoadPremiumUsers）に加え、実装前調査で発見した未文書化ヘルパー4件
  （switchCVTab/deleteCommunityReply/updateReplyLikeCount/checkMyLikes、Community Voice
  クラスタ内でのみ相互参照）をPR-086/087と同型の「1 feature = 1 owner」判断で合わせて
  物理移動:
    - `src/modules/community.js`（新設、13関数）: Community Voice一式
    - `src/modules/admin.js`（新設、3関数 + ADMIN_USER_ID）: Admin Panel一式
  MEDIUM リスク対応（Supabase直接呼び出し整理）: 両ファイルとも bare `supabase`/
  `SUPABASE_URL` を services/supabase.js から直接importする形に変更（旧
  bare識別子フォールバック依存を解消）。SUPABASE_KEYはsupabase.js側の既存設計
  （window.SUPABASE_KEYのみexport）に合わせwindow経由を維持 / bare `supabaseUserId`
  （app-legacy.js側var、ログイン処理が更新）はwindow.__ippoGetSupabaseUserId()経由の
  読み取りに変更（PR-080E window.__ippoGetBowelCountと同型パターン、新設）/
  ADMIN_USER_ID はisAdminOrPremium()（app-legacy.js残置、Batch-10対象外）も参照する
  ためadmin.jsからimport back（fasting.js FAST_PHASE_CONFIGと同型の既存idiom）/
  全13関数はapp-legacy.js側で該当import経由で再取得し、既存のwindow bridge
  （`if (typeof X === "function") window.X = X;`）は無変更で機能継続 / switchCVTab・
  deleteCommunityReplyはapp.htmlに対応するonclick/DOM要素が見当たらず実質到達不能な
  pre-existingの状態と判明（PR-080 window.saveRecord等と同型の既存事象）、Physical
  Moveのみが責務のため挙動は変更せずwindow非公開のまま移動 / 新規単体テスト追加なし
  （既存のDOM操作・fetch中心の構成のためBrowser Verificationで代替、Batch-9方針を踏襲）/
  SG-7: tests/arch/legacy-removal-pr079-line-count-guard.test.js BASELINE_LINE_COUNTを
  5,408→5,084に更新 / app-legacy.js: 5,408行→5,083行 / vitest run全件: 5,193件、
  失敗39件は既知5ファイル（build-draft-from-ui.test.js・save-record-screen.test.js・
  disease-analyzer.test.js・domain-event-types.test.js・event-menstrual.test.js）のみで
  増加なし / vite build PASS（警告は既存のチャンク循環参照・動的/静的import混在・
  チャンクサイズ超過のみで本PR無関係）/ Browser Verification: Vite dev server +
  app.html実機でloadCommunityTopic()/initAdminPanel()がstartup時（未認証状態）で
  例外なく実行されることを確認 / window.loadCommunityTopic等13関数すべてが既存
  window bridge経由で到達可能なことを確認 / __ippoGetSupabaseUserId()ブリッジが
  正しくnullを返すことを確認 / Console Errorはvite websocket接続失敗ノイズと
  Supabase未設定環境ノイズのみで新規エラーなし。
  Decision Log: 更新不要（Architecture/Roadmap/Business/Founder Strategy変更なし）。

  ✓ PR-089A  Legacy Final Cutover 事前監査（2026-07-04、Founder個別承認によりPR-089着手）—
  `docs/PR-089A-legacy-final-cutover-audit.md` 新設。コード変更ゼロ、調査のみ。
  `src/app-legacy.js`（実測5,083行）の残存トップレベル関数101件を機械的に分類:
  A. SAFE_DEAD 24件（Wave2モジュール側がmain.jsで後読みされwindowを上書き済み・削除候補）/
  B. ORPHAN 9件（`experiments.js`/`cycle-engine.js`/`pain-scale.js`等、Wave2ファイルは存在するが
  main.jsから未import・app-legacy.js側が実質稼働中）/ C. NO_OTHER_IMPL 65件（Wave2側に同名実装
  なし、うち3件は既存Dead Code確定分、実質62件が未移植）/ D. AMBIGUOUS 3件（`mergeRecords`/
  `getGreetingText`/`openDayDetail`、個別検証要）。`docs/LEGACY_REMOVAL_PLAN.md`が前提としていた
  「Batch-11=shim約20件+確定DeadCode4件の削除のみ」は成立せず、Experiment機能一式・Cloud Sync
  本体（`cloudBackupAll`/`cloudRestore`は既にsupabase.js側が勝っているが`renderSyncUI`/
  `submitSync`/`migrateDataToUser`/`syncNow`/`logoutSync`等は未移植）・Record編集/Quick Log/
  Meal入力等のUI操作系が未移植のまま残存していることが判明。`docs/LEGACY_REMOVAL_PLAN.md`
  6-9章末尾にFounder審議中の追記を実施（4章ロードマップ表自体は未改訂、Founder確認後に別PRで
  改訂予定）。PR-089B〜G＋PR-089Z（旧PR-089本体）への分割を提案。Architecture/Business Logic/
  UI/仕様/データ構造の変更ゼロ。
  Decision Log: 更新不要（本PRは調査のみ。Roadmap改訂そのものはFounder確認後に別途記録）。

  ✓ Founder Decision（2026-07-04）— PR-089A監査結果を採用し、PR-089を一括削除PRとして
  実施せずCategory単位の段階移植へ再編成する決定。新ロードマップ: PR-089A(完了)→089B
  (Experiment)→089C(Cloud Sync)→089D(Home Remaining)→089E(Calendar Remaining)→089F
  (Utility/Misc)→089Z(Final Cutover)→090(Exit Audit)。分類スキームをSAFE_DEAD/ORPHAN/
  ALREADY_OVERRIDDEN/NEEDS_IMPORT/REAL_IMPLEMENTATION/AMBIGUOUSの6分類へ再定義。
  Decision Log: `docs/LEGACY_REMOVAL_PLAN.md` 10-C章に記録済み（4章ロードマップ表も改訂済み）。

  ✓ PR-089B  Experiment Module Migration — Batch-11分割①。app-legacy.jsの
  「ヘルスエクスペリメント」機能一式（`_DISEASE_COMPANION_RULES` / `_bleedingToNum`(呼び出し元の
  み・実体はCalendar/Cycle系のため残置) / `_expMetric` / `_buildExperimentCompanion` /
  `EXPERIMENT_PRESETS` / `openExperiments` / `startExperiment` / `startCustomExperiment` /
  `cancelExperiment` / `completeExperiment` / `_buildAIResultReport` / `showExperimentReport`）を
  `src/modules/experiments.js`へ物理移動。PR-089A時点でORPHAN分類だった`experiments.js`の
  既存ドラフト（`_expMetric`/`_buildExperimentCompanion`）は app-legacy.js 最新版と再照合した
  結果、`_DISEASE_COMPANION_RULES`（全10疾患ルール）が欠落し`_expMetric`も5ケースしか
  実装されていない（app-legacy.js側は8ケース: sleep/mood/symptoms/pain/fatigue/temp/
  bleeding/bloating）不完全な状態と判明したため、app-legacy.js側を正として全面差し替え。
  `_bleedingToNum`はCalendar/Cycle系（`analyzeCyclePhases`が使用、PR-089E対象）と共有のため
  app-legacy.js側を無変更で残置し、experiments.js側には`_expMetric`が必要とする最小限の
  変換ロジックを一時的に複製（PR-089E完了後に一本化予定、コメントで明記）。状態アクセスは
  既存ドラフトの`window.getState()`/`window.setState()`パターンに統一（bare `state`直接変更
  → immutable update、`store/state.js`のsetState実装(_state全置換)と整合、外部観測される
  最終結果は同一）。`saveState()`/`cloudBackupAll()`は`window.saveState()`/
  `window.cloudBackupAll()`に、`showAlertModal`/`showConfirmModal`は`./ui-notifications.js`
  からのimportに変更（app-legacy.js自身の既存import文と同一パターン）。app-legacy.js側は
  該当6関数を`./modules/experiments.js`からnamed importし、既存のwindow bridge（末尾、
  無変更）がそのまま機能継続。main.jsの変更は不要（app-legacy.js自身がexperiments.jsを
  importするため、main.js:52のapp-legacy.js import解決時に連鎖的にロードされる）。
  SG-7: tests/arch/legacy-removal-pr079-line-count-guard.test.js BASELINE_LINE_COUNTを
  5,084→4,450に更新 / app-legacy.js: 5,083行→4,449行 / vitest run全件: 5,193件、
  失敗39件は既知5ファイルのみで増加なし / vite build PASS（既知警告のみ）/
  Architecture Guard・Legacy Guard: 11ファイル104件全PASS / Browser Verification:
  PR-089B〜Fでは未実施（Founder方針によりPR-089Zでまとめて実施）。
  Business Logic/Architecture/UI/仕様/データ構造の変更ゼロ（純粋な物理移動+モジュール境界
  越え時の機械的なAPI変換のみ）。
  Decision Log: 更新不要（10-C章の決定範囲内で実施）。
  Next: PR-089C — Cloud Sync Migration。Experiment/Home/Calendar/Utility/Final Cutoverは
  読み込まない。

---

## 完了済みPhase

| Phase | 成果物 | 状態 |
|-------|--------|------|
| Phase 0 | docs/REPOSITORY_MAP.md / FEATURE_INVENTORY.md / DATA_FLOW_MAP.md / DATABASE_AUDIT.md / TECHNICAL_DEBT_AUDIT.md | 完了 |
| Phase 2 | docs/DOMAIN_MODEL_V1.md | 完了 |
| Phase 3 | docs/ARCHITECTURE_V3.md | 完了 |
| Phase 4 | docs/SCHEMA_V1.md | 完了 |
| Phase 4.5 | docs/REPOSITORY_CONSTITUTION_V1.md | 完了 |
| Phase 4.75 | docs/CONSTITUTION_AUDIT_V1.md | 完了 |
| Phase 4.76 | docs/CONSTITUTION_RECONCILIATION_V1.md | 完了 |
| Phase 5 | docs/IMPLEMENTATION_PLAN_V1.md | 完了 |
| Phase 5 実装 PR-001〜002 | domains/ スケルトン + ドメインモデル確定 | 完了 |
| Phase 5 実装 PR-003〜006 | Record / Experiment / Case / Consent domain実装 | 完了 |
| Phase 5 実装 PR-007 | domains/similarity/ — Similarity Engine | 完了 |
| Phase 5 実装 PR-008 | domains/analytics/ — Analytics Layer | 完了 |
| Phase 5 実装 PR-009 | domains/b2b/ — B2B Export Layer | 完了 |
| Phase 5 実装 PR-010 | tests/e2e/ + infrastructure/validation/ — E2E/リリースゲート | 完了 |
| Phase 6 PR-011〜019 | Strangler-Fig移行完了（Bootstrap / Contract / Adapter / Record / Experiment / Case / Consent / Similarity） | 完了 |
| LEGACY ASSET INVENTORY COUNCIL | docs/LEGACY_ASSET_INVENTORY.md — BD-001〜BD-014 | 完了 |
| NETWORK ASSET COUNCIL | docs/NETWORK_ASSET_COUNCIL.md (IPPO-COUNCIL-002) — BD-009〜BD-014 | 完了 |
| DATA ASSET COUNCIL | docs/DATA_ASSET_COUNCIL.md (IPPO-COUNCIL-003) — BD-015〜BD-025 | 完了 |
| Phase 7 PR-020〜039 | Intelligence Foundation全完了（Auth / UX / Engagement / Comm / Delivery / Operations / Symptom / Disease / NetworkSignal / SignalIntelligence / Longitudinal / EventSourcing / Emotion / Menstrual）| 完了 |
| PR-040 | Research Dataset Foundation（research-dataset-repository / builder / service / anonymization / export）| 完了 |
| **PR-041** | **NetworkSignal Repository V2 — INetworkSignalRepository / MemoryAdapter / PersistenceService(Decorator) / Factory / Provider / Migration / DI / ApiGateway** | **完了** |
| **PR-042** | **Supabase Persistence Foundation — NetworkSignalSupabaseRepository(Write-Through Cache) / SupabaseEventPersistenceRepository(ippo_events) / PersistenceConfig(backend:supabase) / ArchGuard+8ルール** | **完了** |
| NETWORK EVOLUTION COUNCIL | docs/NETWORK_EVOLUTION_COUNCIL.md (IPPO-COUNCIL-004) — 7フェーズ進化モデル / BD-026〜BD-033 | 完了 |
| WAVE2 MASTER DESIGN | docs/WAVE2_MASTER_DESIGN.md (IPPO-COUNCIL-005) — Wave2全体設計 / BD-034〜BD-043 | 完了 |
| WAVE2 ROADMAP | docs/WAVE2_ROADMAP.md (IPPO-COUNCIL-006) — PR-041〜075 / 35PR | 完了 |
| WAVE2 ARCHITECTURE | docs/WAVE2_ARCHITECTURE.md (IPPO-COUNCIL-007) — Wave2技術憲法 | 完了 |
| WAVE2 IMPLEMENTATION GOVERNANCE | docs/WAVE2_IMPLEMENTATION_GOVERNANCE.md (IPPO-COUNCIL-008) — GP-01〜GP-08 | 完了 |
| FOUNDER STRATEGIC REVIEW | docs/FOUNDER_STRATEGIC_REVIEW_WAVE2.md (IPPO-STRATEGIC-REVIEW-001) — CONDITIONAL GO / CR-01〜03 / MO-01〜03 | 完了 |
| **BUSINESS STRATEGY COUNCIL** | docs/BUSINESS_STRATEGY.md (IPPO-BUSINESS-001) — 二段ロケットモデル / BBS-001〜006 | **完了** |
| **GROWTH STRATEGY COUNCIL** | docs/GROWTH_STRATEGY.md (IPPO-GROWTH-001) — 成長戦略 / BGS-001〜005 | **完了** |
| **REGULATORY & MEDICAL COUNCIL** | docs/REGULATORY_MEDICAL_COUNCIL.md (IPPO-REGULATORY-001) — 規制憲法 / BD-044〜052 | **完了** |
| **GO-TO-MARKET COUNCIL** | docs/GTM_COUNCIL.md (IPPO-GTM-001) — 市場投入戦略 / BD-053〜060 | **完了** |

---

## 上位憲法（必ず読む順序）

矛盾がある場合は上にあるものが正。

1. **docs/LEGACY_ASSET_INVENTORY.md (IPPO-GOV-001 v1.2)** — BD-001〜BD-014
2. **docs/NETWORK_ASSET_COUNCIL.md (IPPO-COUNCIL-002)** — BD-009〜BD-014
3. **docs/DATA_ASSET_COUNCIL.md (IPPO-COUNCIL-003)** — BD-015〜BD-025
4. **docs/NETWORK_EVOLUTION_COUNCIL.md (IPPO-COUNCIL-004)** — BD-026〜BD-033
5. **docs/WAVE2_MASTER_DESIGN.md (IPPO-COUNCIL-005)** — BD-034〜BD-043
6. **docs/WAVE2_ARCHITECTURE.md (IPPO-COUNCIL-007)**
7. **docs/WAVE2_ROADMAP.md (IPPO-COUNCIL-006)** — PR-041〜075
8. **docs/WAVE2_IMPLEMENTATION_GOVERNANCE.md (IPPO-COUNCIL-008)** — GP-01〜GP-08
9. **docs/BUSINESS_STRATEGY.md (IPPO-BUSINESS-001)** — BBS-001〜006
10. **docs/GROWTH_STRATEGY.md (IPPO-GROWTH-001)** — BGS-001〜005
11. **docs/REGULATORY_MEDICAL_COUNCIL.md (IPPO-REGULATORY-001)** — BD-044〜052
12. **docs/GTM_COUNCIL.md (IPPO-GTM-001)** — BD-053〜060
13. docs/FOUNDER_STRATEGIC_REVIEW_WAVE2.md (IPPO-STRATEGIC-REVIEW-001)
14. docs/CONSTITUTION_RECONCILIATION_V1.md
15. docs/IMPLEMENTATION_PLAN_V1.md
16. docs/REPOSITORY_CONSTITUTION_V1.md

---

## Founder Fixed Decisions（絶対に変更しない）

**FD-001 Quality Score (100点満点):**
- Coverage = 30 / Duration = 30 / Completeness = 15 / Outcome = 15 / Consent = 10
- diseaseTagMultiplier: **廃止** / Experiment独立項: **廃止**

**FD-002 Tier Definition:**
- Tier3: disease_tag≥1 + 30日 + 60% coverage（Consent不要）
- Tier2: disease_tag≥1 + 90日 + 70% + exp完了1件 + Outcome必須 + Consent Level1以上
- Tier1: disease_tag≥1 + 180日 + 80% + exp完了2件 + Outcome必須 + Consent Level2以上

**その他確定事項:**
- experiment.status: DRAFT|ACTIVE|COMPLETED|ABANDONED（PAUSEDなし）
- consent.level: CHECK (BETWEEN 0 AND 3)（Level4なし）
- テーブル名: similarity_edges
- ABANDONED後Outcome生成: 7日後から
- consent_events: append-only（DELETE不可）
- similarity_edges: DELETE禁止

---

## Binding Decisions 全一覧

### BD-001〜BD-025（Wave1 / Data Asset）

| 番号 | 内容 | 出典 |
|---|---|---|
| BD-001 | similarity_edges DELETE禁止 | IPPO-GOV-001 |
| BD-002 | consent_events DELETE禁止（Consent Immutability）| IPPO-GOV-001 |
| BD-003 | Lunar CalendarをUIとして実装しない | IPPO-GOV-001 |
| BD-004 | Disease TagをWave1でEntityに昇格させない（Wave2） | IPPO-GOV-001 |
| BD-005 | FoodはFoodログでなくExposure Signalとして設計 | IPPO-GOV-001 |
| BD-006 | Symptom IntelligenceはWave1で即時拡張対象 | IPPO-GOV-001 |
| BD-007 | DROP判定ゼロ。旧資産はHOLDまたはREFACTOR | IPPO-GOV-001 |
| BD-008 | 疾患情報は4層（Record/Profile/Case/Network）に分離 | IPPO-GOV-001 |
| BD-009 | Disease Cluster IDはWave2まで diseaseKey と同一 | NETWORK ASSET COUNCIL |
| BD-010 | FeatureVectorは VECTOR_VERSION 定数を持ち、次元拡張時バージョンを上げる | NETWORK ASSET COUNCIL |
| BD-011 | EdgeGeneratorが生成する全エッジは vectorVersion フィールドを持つ | NETWORK ASSET COUNCIL |
| BD-012 | Longitudinal SignalのEdge付与はWave2スコープ | NETWORK ASSET COUNCIL |
| BD-013 | NetworkSignal SSOTは network-signal-types.js | NETWORK ASSET COUNCIL |
| BD-014 | MenstrualPhase自動判定はWave2 | NETWORK ASSET COUNCIL |
| BD-015 | Layer 1（Record）保全でLayer 2〜7を決定論的に再構築できること | DATA ASSET COUNCIL |
| BD-016 | 各データ資産はSSOT以外に永続化してはならない | DATA ASSET COUNCIL |
| BD-017 | Wave2 ippo_eventsテーブルはImmutable（UPDATE/DELETE禁止） | DATA ASSET COUNCIL |
| BD-018 | Snapshotは必ず generatedAt と vectorVersion を含めること | DATA ASSET COUNCIL |
| BD-019 | データ削除要求: 匿名化優先 → SoftDelete → 90日後HardDelete | DATA ASSET COUNCIL |
| BD-020 | Layer 1保全でLayer 2〜7の再構築可能性を損なう変更はCouncil承認が必要 | DATA ASSET COUNCIL |
| BD-021 | Research Datasetの作成・公開はFounder承認 + k-anonymity(k≥5) | DATA ASSET COUNCIL |
| BD-022 | NetworkSignalはWave2でSupabaseに永久保存（Wave1はin-memory暫定） | DATA ASSET COUNCIL |
| BD-023 | SimilarityEdge再計算時は新edgeIdを発行（既存IDの上書き禁止） | DATA ASSET COUNCIL |
| BD-024 | Emotion SignalはWave2 Signal層で実装（Wave1では生成しない） | DATA ASSET COUNCIL |
| BD-025 | PR-033〜PR-040はDATA ASSET COUNCIL Section 14に従って実装すること | DATA ASSET COUNCIL |

### BD-026〜BD-043（Wave2 設計）

| 番号 | 内容 | 出典 |
|---|---|---|
| BD-026 | Phase 3（k≥50 / 5疾患以上）達成前にSimilarity UIを公開しない | NETWORK EVOLUTION COUNCIL |
| BD-027 | 各フェーズ移行はFounder確認を必須とする | NETWORK EVOLUTION COUNCIL |
| BD-028 | Disease Cluster統計はk≥5（最終目標k≥50）を下回るデータを公開しない | NETWORK EVOLUTION COUNCIL |
| BD-029 | Similarity UIはCaseノード同士の接続表示のみ。個人特定可能なUIを禁止 | NETWORK EVOLUTION COUNCIL |
| BD-030 | Research Dataset利用者が個人特定を試みることはZERO TOLERANCE（契約条件） | NETWORK EVOLUTION COUNCIL |
| BD-031 | AIはいかなる状況でも診断・治療指示・緊急度判定を行ってはならない | NETWORK EVOLUTION COUNCIL |
| BD-032 | Knowledge GraphのエッジはAppend-Only（削除・上書き禁止） | NETWORK EVOLUTION COUNCIL |
| BD-033 | Founder Moat = 縦断の長さ × Consent純潔性 × Disease Intelligence深度 | NETWORK EVOLUTION COUNCIL |
| BD-034 | Wave2のすべての永続化層はSupabaseとする | WAVE2 MASTER DESIGN |
| BD-035 | FeatureVector V2は12次元（VECTOR_VERSION='2'）| WAVE2 MASTER DESIGN |
| BD-036 | Disease Cluster統計はk≥50を目標とし、k≥5未満は公開しない | WAVE2 MASTER DESIGN |
| BD-037 | Knowledge GraphノードはAppend-Only（削除禁止）| WAVE2 MASTER DESIGN |
| BD-038 | Wave2 AIはルールベース + 統計テンプレートのみ（LLM禁止）| WAVE2 MASTER DESIGN |
| BD-039 | AISafetyValidatorはすべてのAI出力の必須ゲートキーパー | WAVE2 MASTER DESIGN |
| BD-040 | Research Dataset V2はk-anonymity k≥5を構造的に保証すること | WAVE2 MASTER DESIGN |
| BD-041 | Wave2 PR-041〜075の実装順序は依存関係を厳守すること | WAVE2 MASTER DESIGN |
| BD-042 | Wave2完了条件: Phase 3達成（k≥50 / 5疾患）+ Research Platform稼働 | WAVE2 MASTER DESIGN |
| BD-043 | Wave3以降の設計はWave2完了後にCouncilを開催して決定する | WAVE2 MASTER DESIGN |

### BD-044〜BD-060（規制・GTM）

| 番号 | 内容 | 出典 |
|---|---|---|
| BD-044 | すべてのAI出力には免責文言を付与。免責なしのAI出力公開を絶対禁止 | REGULATORY COUNCIL |
| BD-045 | Signal Insight/Pattern Discovery出力テンプレートは医師アドバイザー書面承認後のみ公開可 | REGULATORY COUNCIL |
| BD-046 | Research Dataset外部提供前に提供先IRB承認証明書の受領を必須とする | REGULATORY COUNCIL |
| BD-047 | プライバシーポリシーは年1回以上弁護士レビューを受けること | REGULATORY COUNCIL |
| BD-048 | AI禁止ワードリストは医師アドバイザーが半年ごとにレビューし Founder が承認 | REGULATORY COUNCIL |
| BD-049 | Research ConsentなしのユーザーのRecordをResearch Datasetに含めることを絶対禁止 | REGULATORY COUNCIL |
| BD-050 | 「医療行為の代替」を示唆する表現をいかなる媒体でも使用禁止 | REGULATORY COUNCIL |
| BD-051 | Wave2 Phase D（PR-057: Signal Insight Service）着手前にSaMD非該当の書面見解取得を必須とする | REGULATORY COUNCIL |
| BD-052 | 海外展開は対象国の医療データ規制専門家による書面確認後のみ開始可 | REGULATORY COUNCIL |
| BD-053 | 最優先ICPは子宮内膜症/PCOS。記録継続率・Research Consent率を最優先指標とする | GTM COUNCIL |
| BD-054 | DAU / ページビュー / ダウンロード数 / CAC をKPIとして採用してはならない | GTM COUNCIL |
| BD-055 | 「医師の代わりになる」「診断できる」等の医療代替を示唆する表現を永久禁止 | GTM COUNCIL |
| BD-056 | Research License価格（L1: ¥350K〜700K / L2: ¥3M〜10M / L3: ¥1M〜5M）を下回る提供禁止 | GTM COUNCIL |
| BD-057 | Clinic APIのパイロット先は医師アドバイザー紹介 or 既存ユーザー流入のみ | GTM COUNCIL |
| BD-058 | 海外展開順序は台湾→韓国→オーストラリア→EU→米国を厳守 | GTM COUNCIL |
| BD-059 | Founder週間GTM稼働時間は3時間以内（通常期）| GTM COUNCIL |
| BD-060 | IPPO Dataset使用論文にはAcknowledgment記載を提供条件とする | GTM COUNCIL |

### BD-061〜BD-062（Release Readiness Council Review v2 / 製品定義再確認）

| BD | 内容 | 出典 |
|---|---|---|
| BD-061 | IPPOは自己実験プラットフォームであり、診断・治療・医療判断・医師への指示・症状改善の保証を一切行わない。この定義に反する機能・AI出力・マーケティング表現は禁止する | RELEASE READINESS COUNCIL（21章） |
| BD-062 | AIの役割は記録整理・要約・傾向分析・自己実験結果の可視化・類似パターン表示に限定する。診断的・治療的・因果断定的なAI出力は設計上禁止する（BD-031/BD-038/BD-050は継続適用） | RELEASE READINESS COUNCIL（21章） |

### BBS-001〜006（Business Strategy）/ BGS-001〜005（Growth Strategy）

詳細は各文書参照（IPPO-BUSINESS-001 / IPPO-GROWTH-001）。

変更にはLevel-1改訂プロセス（Founder承認 + Council開催）が必要。

---

## 現在の実装状況

- ユーザー数: 0 / 本番依存: なし / 後方互換義務: なし
- app-legacy.js: 10,804行 God Object（削減中）
- 既存DBテーブル: profiles / records / user_data / user_records / subscriptions（5つのみ）
- **テスト: 3,272件 全パス（191ファイル）※ 35件はtests/modules/のpre-existing failure（src/modules/record.js壊れたインポート、PR無関係）**

### Strangler-Fig 移行層（PR-011〜PR-039 完了）

| 層 | 主要クラス |
|---|---|
| Bootstrap | DI Container / CompositionRoot / RouteRegistry / ArchitectureGuard |
| Contract | 10インターフェース（IStorageService〜INotificationProvider） |
| Infrastructure | LocalStorageAdapter / LegacyAuthAdapter |
| Record | RecordRepositoryImpl / DualWriteRecordRepository / RecordV2Repository / RecordReadSwitch |
| Experiment | ExperimentRepositoryImpl / ExperimentStateMachine / ExperimentLifecycleService |
| Case | CaseRepositoryImpl / CaseGenerationService / TierEvaluator / OutcomeResolver |
| Consent | ConsentRepositoryImpl / ConsentEnforcementService |
| Similarity | VectorBuilder（8次元）/ SimilarityCalculator / EdgeGenerator / SimilarityEngine |
| Auth | PermissionService / SimilarityAccessGuard |
| UX Foundation | TierProgressService / ProfileFormationService / DiseaseTagValidator |
| Engagement | ExperimentNudgeService / CommitmentService / OutcomeReminderService |
| Communication | NotificationScheduleService / NotificationTemplateService / CommunicationMetrics |
| Delivery | DeliveryQueue / DeliveryScheduler / DeliveryProcessor / DeliveryRetryService / DeliveryHealthMetrics |
| Analytics（Admin） | KpiSnapshot / Wave1DashboardService / KpiSnapshotAutomationService / KpiSchedulerService |
| Symptom Intelligence | symptom-types（SSOT）/ symptom-entity / symptom-validator / symptom-repository / symptom-service |
| Disease Intelligence | disease-types（SSOT）/ disease-entity / disease-validator / disease-repository / disease-service |
| **Network Signal** | network-signal-types（SSOT, BD-013）/ network-signal-entity / network-signal-validator / network-signal-repository（in-memory）/ network-signal-service |
| **Signal Intelligence** | signal-aggregation-service / signal-trend-service / signal-timeline-service / signal-summary-service |
| **Longitudinal** | trend-window-builder / moving-average-service / baseline-service / longitudinal-signal-service / longitudinal-summary-service |
| Event Sourcing | EventStore / EventBus / EventPublisher / EventReplayService / AuditTimelineService |
| **Emotion** | emotion-types（SSOT）/ emotion-entity / emotion-validator / emotion-repository / emotion-service / emotion-signal-mapper |
| **Menstrual** | menstrual-types（SSOT）/ menstrual-entity / menstrual-validator / menstrual-repository / menstrual-service / phase-calculator / cycle-analysis-service |
| API Gateway | ApiGateway（**71メソッド**） |

---

## RouteRegistry — KNOWN_FEATURES（PR-039時点）

```
Record / Experiment / Case / Consent / Analytics / Similarity
Auth / API / RecordV2 / Engagement / B2BExport / Communication / Delivery
Operations / OperationsAutomation / Symptom / Disease
NetworkSignal / SignalIntelligence / Longitudinal
PersistentSignal / DiseaseCluster / SignalSnapshot / SimilarityIntelligence
EventSourcing / Emotion / MenstrualIntelligence
計27件
```

---

## API Gateway メソッド一覧（PR-039時点、計71メソッド）

| メソッド | 権限 | PR |
|---|---|---|
| getRecords(userId) | record:read | PR-020 |
| saveRecord(data) | record:write | PR-020 |
| getExperiments(userId) | experiment:read | PR-020 |
| createExperiment(data) | experiment:write | PR-020 |
| generateCase(recordId) | case:read:own | PR-020 |
| getSimilarCases(caseId, opts) | similarity:read:own | PR-020 |
| getTierProgress(candidate) | case:read:own | PR-021 |
| getProfileFormation(candidate) | record:read | PR-021 |
| getCaseEvents() | case:read:own | PR-021 |
| getExperimentNudge(...) | experiment:read | PR-022 |
| createCommitment({...}) | experiment:write | PR-022 |
| getOutcomeReminders(experiments) | experiment:read | PR-022 |
| getConsentMotivation(currentLevel) | record:read | PR-022 |
| getDueNotifications(userContext) | record:read | PR-023 |
| getNotificationPreview(type) | record:read | PR-023 |
| getCommunicationMetrics() | record:read | PR-023 |
| scheduleNotifications(userContext) | record:read | PR-024 |
| getWave1Dashboard({users}) | admin:dashboard | PR-024 |
| getCommunicationDashboard() | admin:dashboard | PR-024 |
| getKpiSnapshots() | admin:dashboard | PR-024 |
| processPendingNotifications() | admin:dashboard | PR-025 |
| getDeliveryMetrics() | admin:dashboard | PR-025 |
| getDeliveryHealth() | admin:dashboard | PR-026 |
| getLatestKpiSnapshot() | admin:dashboard | PR-026 |
| getKpiHistory() | admin:dashboard | PR-026 |
| getSnapshotScheduleStatus() | admin:dashboard | PR-027 |
| retryFailedDeliveries() | admin:dashboard | PR-027 |
| getAnalyticsStatus() | admin:dashboard | PR-027 |
| validateSymptom(data) | record:write | PR-028 |
| getSymptomTypes() | record:read | PR-028 |
| getPainTypes() | record:read | PR-028 |
| createDisease(data) | record:read | PR-029 |
| getDiseases() | record:read | PR-029 |
| getActiveDiseases() | record:read | PR-029 |
| getResolvedDiseases() | record:read | PR-029 |
| validateNetworkSignal(data) | record:write | PR-030 |
| createNetworkSignal(data) | record:read | PR-030 |
| getNetworkSignals() | record:read | PR-030 |
| getSignalsByRecord(recordId) | record:read | PR-030 |
| getSignalsByType(signalType) | record:read | PR-030 |
| getSignalAggregation() | record:read | PR-031 |
| getSignalTrend(signalType) | record:read | PR-031 |
| getSignalTimeline() | record:read | PR-031 |
| getSignalSummary() | record:read | PR-031 |
| getLongitudinalSummary(options?) | record:read | PR-032 |
| getBaseline(signalType) | record:read | PR-032 |
| getMovingAverage(signalType, days, refDate?) | record:read | PR-032 |
| getTrendWindow(days, refDate?) | record:read | PR-032 |
| publishEvent(params) | admin | PR-037 |
| getEvents() | admin | PR-037 |
| getEventsByType(type) | admin | PR-037 |
| getEventsByAggregate(aggregateId) | admin | PR-037 |
| replayEvents() | admin | PR-037 |
| getAuditTimeline() | admin | PR-037 |
| validateEmotion(data) | record:write | PR-038 |
| createEmotion(params) | record:read | PR-038 |
| getEmotions() | record:read | PR-038 |
| getEmotionStatistics() | record:read | PR-038 |
| convertEmotionSignals() | record:read | PR-038 |
| validateMenstrual(data) | record:read | PR-039 |
| createMenstrualRecord(params) | record:read | PR-039 |
| getMenstrualRecords() | record:read | PR-039 |
| getCurrentCycle() | record:read | PR-039 |
| getCycleStatistics() | record:read | PR-039 |
| estimateNextCycle() | record:read | PR-039 |

---

## Network Signal SSOT（PR-030〜032確定）

### SIGNAL_TYPES（6種）
SYMPTOM / PAIN / MENSTRUAL / EMOTION（Wave2）/ SLEEP / EXPOSURE

### VECTOR_VERSION
`'1'`（Wave2拡張時に `'2'` へ bump。全Edgeにフィールドあり BD-010/BD-011）

### 正規化ルール
| type | rawValue | normalizedValue |
|---|---|---|
| SYMPTOM / PAIN / EMOTION | 0〜10 | / 10 |
| MENSTRUAL | 0〜3 | / 3 |
| SLEEP | hours | / 8（clamped） |
| EXPOSURE | count | / 5（clamped） |

### Record → Signal 自動生成（saveRecord時）
symptoms[] → SYMPTOM / painLevel → PAIN / sleepBed+Wake → SLEEP / foods[] → EXPOSURE / menstrualFlow → MENSTRUAL / EMOTION: Wave2

### Trend Direction
| type | lower is better | higher is better | neutral |
|---|---|---|---|
| PAIN / SYMPTOM | Improving / Stable / Worsening | — | — |
| SLEEP | — | Increasing / Stable / Decreasing | — |
| MENSTRUAL / EXPOSURE / EMOTION | — | — | Increasing / Stable / Decreasing |
| データ不足（<2件） | — | — | Unknown |

---

## DATA ASSET COUNCIL 確定事項（IPPO-COUNCIL-003）

### 8層データ資産モデル
```
Layer 0:  Raw Input（保存しない）
Layer 1:  Record（永久保存 / SSOT / 再生成不可）
Layer 2:  NetworkSignal（Wave2でSupabase永久保存 / BD-022）
Layer 3:  Disease Entity（永久保存）
Layer 4:  Profile（Snapshot保存 / 再生成可能）
Layer 5:  Case（永久保存 / caseId不変）
Layer 6:  Intelligence Layer（再計算 + Snapshot）
Layer 7:  Network Layer（Wave2でEdge永久保存）
Layer 8:  Research Asset（匿名化 + バージョン管理）
Layer 9:  Knowledge Graph（Wave2 / Append-Only）
Layer 10: Feature Store / Embedding（Wave3）
Layer 11: Disease Intelligence Model（Wave4）
Layer 12: Disease Ontology（Wave5+）
```

### 永久保存対象（DELETE禁止）
Record / Disease Entity / Case / Consent Event / Experiment / SimilarityEdge / Research Dataset / Knowledge Graph Node・Edge

### 再計算可能（保存しない）
MovingAverage計算結果 / TrendWindow / FeatureVector中間値 / SignalTimeline / UIセッション状態

---

## Wave2 アーキテクチャ概要（IPPO-COUNCIL-007）

### 3つの設計哲学
```
哲学 1: Record is the only origin（Recordのみが真実の源泉）
哲学 2: Append-Only is trust structure（追記のみが信頼の構造）
哲学 3: AI assists, diagnosis forbidden（AIは補助のみ、診断禁止）
```

### Wave2 主要追加コンポーネント
```
Supabase永続化層:
  NetworkSignalRepository（Supabase）
  DiseaseClusterRepository（Supabase）
  KnowledgeGraphRepository（Supabase / Append-Only）

AI Platform（ルールベース / LLMなし）:
  SignalInsightService（パターン提示のみ）
  PatternDiscoveryService
  AISafetyValidator（必須ゲートキーパー / BD-039）

Research Platform V2:
  ResearchDatasetV2（k-anonymity k≥5 / BD-040）
  DatasetVersionManager
  IRBComplianceChecker

FeatureVector V2（12次元 / VECTOR_VERSION='2'）:
  FeatureVectorBuilderV2
  SimilarityEngineV2
```

---

## Phase 6〜7 最重要制約（全PRで共通）

- app-legacy.js への新規ロジック追加: **禁止**
- DB Migration / Schema変更: **禁止**（PR-033まで / Wave2は別設計）
- feature→feature 依存: **禁止**
- localStorage 直叩き（Adapter外）: **禁止**
- UI → ApiGateway → Application → Repository: **この経路のみ許可**
- similarity_edges DELETE: **禁止**（BD-001）
- consent_events DELETE: **禁止**（BD-002）
- NetworkSignal系サービスへのUI直アクセス: **禁止**（ArchGuard PR-030〜032）
- Signal Intelligence系サービスへのUI直アクセス: **禁止**（ArchGuard PR-031）
- Longitudinal系サービスへのUI直アクセス: **禁止**（ArchGuard PR-032）
- Similarity結果のUI公開: **Phase 3達成前禁止**（BD-026）
- Disease診断AI / Recommendation / 診断示唆: **永久禁止**（BD-031）
- Lunar CalendarのUI実装: **禁止**（BD-003）
- Emotion Signalの生成: **Wave2まで禁止**（BD-024）
- Research Dataset公開: **Founder承認 + IRB証明なし禁止**（BD-021 / BD-046）
- AI出力の免責文言なし公開: **絶対禁止**（BD-044）
- SaMD確認なしのSignal Insight公開: **禁止**（BD-051）

---

## 技術スタック

- フロントエンド: Vanilla JS + Vite（React/Vue/Svelteなし）
- バックエンド: Supabase（PostgreSQL + Edge Functions）
- 決済: Stripe（¥980/月、¥7,800/年 / ¥1,980/月、¥15,800/年）← BUSINESS_STRATEGY更新値
- テスト: Vitest（**3,272件 全パス** / 191ファイル）
- 言語: JavaScript（TypeScript移行中）

---

## SimilarityEngine仕様（PR-019確定 / Wave2でV2に拡張予定）

- FeatureVector次元数: 8（VECTOR_VERSION='1'）→ Wave2で12（VECTOR_VERSION='2'）
- 類似度計算: Cosine Similarity [0.0, 1.0]
- Edge生成条件: score ≥ 0.5 かつ同一diseaseKey
- Consent要件: consentLevel ≥ 2
- **Phase 3達成前: Similarity UI非公開**（BD-026）

---

## 次のPR

**Founder承認済み（2026-07-06）**: EXPORT_HUB_REFACTOR_COUNCILの結果、および
Decision-1（限定範囲: `window.state`同期経路を`state.js`へ移管）・Decision-2
（172件の自己export方式統一）を承認。Recovery Programを以下の順序で再開する。

```
Decision-1 承認済み / Decision-2 承認済み
  ↓
PR-090-R1 — isPremium依存解消（import差し替え）        [完了]
  ↓
PR-090-R2 — 自己export可能47件の自己export化            [完了]
  ↓
PR-090-R3 — window.state依存70件（Decision-1実装含む）  [完了]
  ↓
PR-090-R4 — Legacy依存残件の整理（supabaseUserId/syncMode/
            updateStats/SYMPTOM_DETAIL_CONFIG/saveRecordScreen） [完了、
            saveRecordScreenのみ既知の理由により未着手・据え置き]
  ↓
PR-090-R5 — saveRecordScreen Migration Decision（調査・判定のみ） [完了、Founder Decision確定]
  ↓
PR-091 — Legacy Exit Audit（現行Recovery Program範囲のみ、Known Deferred Items除外） [完了]
  ↓
PR-090-R6 — Step D: 自己export追加+app-legacy.js側dedup（107行） [完了]
  ↓
Decision-4 Founder Review — saveRecord/record-modal系（調査のみ） [完了、Founder Decision確定]
  ↓
Legacy Exit Audit Final — Recovery Program完了監査 [完了]

Recovery Program（PR-090-P1〜R6）: Founder確認により完了確定（2026-07-06）
```

**Founder Decision（2026-07-06・Decision-4）**: Decision-4の選択肢はD+Cを採用。
`saveRecord`/`record-modal`/`openRecordModal`/`closeModal`/`saveAndSync`
（record-modal-controller.js側）/`nextStep`/`prevStep`/`renderStep`/`buildSteps`
（app-legacy.js版）/`#record-modal`はLegacy Exit Audit対象から除外し、β後のUI/UX
Final Councilへ正式移管する。Decision Log: `docs/LEGACY_REMOVAL_PLAN.md` 10-E節。
Recovery Plan更新: `docs/LEGACY_COMPLETION_RECOVERY_PLAN.md` 2-4節・2-5節・Step 4。

**Recovery Program（PR-090-P1〜R6）完了確定**: Founder確認により、現行Recovery
Programはこれで区切りとする。Known Deferred Items（saveRecordScreen/Home Cluster、
10-D節）とDecision-4対象（10-E節）は合わせて**Approved Deferred Items**として、
以後のLegacy Exit Audit対象から除外する。

**Legacy Exit Audit Final**（完了）: Recovery Program（PR-090-P1〜R6）の成果を最終監査。
詳細は`docs/LEGACY_EXIT_AUDIT_FINAL.md`参照。

- Step A（自己export可能47件）〜Step D（自己export化+dedup）はApproved Deferred
  Items（success-overlay.js 1件・record-input.js 26件の暫定保留を除く）を除き完了確認。
- Build PASS / `vitest run` 5,193件中失敗39件（既知のみ、Program全体を通じて増加なし）/
  Architecture Guard 104件PASS。
- app-legacy.js: 10,804行（Batch-1開始時）→ 2,447行（現在、約77%削減）。
- app-legacy.js削除は引き続き不可（Approved Deferred Itemsが存在する限り、意図的な
  現状）。PR-092 Final Cutoverはβ後UI/UX Final Councilの判断確定まで着手しない。
- 次のLegacy Removal関連アクションは、β後UI/UX Final Councilの開催・判断確定を待つ。

**Decision-4 Founder Review**（完了、Founder DecisionでD+C確定）: `docs/LEGACY_COMPLETION_RECOVERY_PLAN.md`
2-4節・2-5節で2026-07-05時点から未決だったDecision-4（`saveRecord`/`#record-modal`/
`openRecordModal`/`closeModal`/`saveAndSync`/`nextStep`/`prevStep`/`renderStep`/
`buildSteps`）を実コードで再調査し、分類判定資料を作成した。
詳細は`docs/DECISION_4_RECORD_MODAL_REVIEW.md`参照。

調査で判明した要点（Founder Decision確定後も記録として残す）:
- `saveRecord()`は到達経路ゼロ（`window.saveRecord`ブリッジは自己参照no-op）で
  実質的にdeadだが、`openRecordModal()`は`handleHomeCTA()`の
  「record-three-card.js未ロード時のみ」のフォールバックとして**現に生存**している。
- `closeModal()`はapp-legacy.js内部フロー（Escapeキー等）では正常動作するが、
  `#record-modal`背景タップ（`window.closeModal`経由）はno-op——同じ関数名で
  経路によって挙動が割れている。
- **新規整理**: `saveAndSync`は同名で実体が2つある。`src/modules/save-and-sync.js`の
  実装は`saveRecordScreen()`のカレンダー編集分岐でも使われる**現役コード**であり、
  Dead/no-opなのは`record-modal-controller.js`側の`window.saveAndSync`ラッパーのみ。
  将来の削除PRでは誤って`save-and-sync.js`本体を壊さないよう要注意。
- 選択肢A(修復)/B(削除)はいずれもBusiness Logic変更・UI変更（app.html変更含む）を
  伴うため、Home Cluster（Decision-3）と同型の理由で採用不可と判定し、
  Founderも同じ理由でD+Cを確定採用した（2026-07-06）。

**PR-090-R6**（完了、STANDARD Mode）: PR-091で発見されたStep D未実施分を解消。
window.state依存18モジュール + Legacy依存解消済み6モジュール（admin.js/community.js/
data-export.js/insights-tab-panel.js/legacy-misc-stats.js/sync-modal.js）、計24モジュールへ
自己export行を追加し、app-legacy.js側の重複export行107行を削除した
（アルファベット順hub 93行 + DEVICE SYNC節の旧手動exportブロック14行）。

- `openSyncModal`/`closeSyncModal`/`toggleSyncMode`の二重定義（DEVICE SYNC節の
  手動exportブロック+アルファベット順自動生成節）は両方とも削除し、
  `sync-modal.js`側の自己exportに一本化。
- `openRecordScreen`（record-three-card.jsとのload順依存ガードあり）・
  `updateSettingsHero`（settings-display-runtime.jsとの重複、製品判断待ち）は
  引き続き対象外（app-legacy.js側の実装のまま無改造）。
- `record-input.js`（SYMPTOM_DETAIL_CONFIG関連26件）は、PR-090-R4での意図的な
  window bridge未設置判断と一貫させるため、本PRでも自己export対象から除外
  （別途Founder確認が必要な課題として維持）。
- `success-overlay.js`（closeSuccess、Known Deferred Item）・Home Cluster関連は
  一切変更していない。
- SG-7 line-count-guard: `app-legacy.js`: 2,554行→2,447行（107行削減）。
  BASELINE_LINE_COUNTを2,447に更新。
- Build PASS / `vitest run` 5,193件中失敗39件（既知5ファイルのみ、増加なし）/
  Architecture Guard 104件PASS。
- Browser Verification: Vite dev server + app.html実機で①自己export対象95関数すべてが
  `typeof window.X === 'function'`で解決可能なことを確認 ②`toggleSyncMode()`実行後の
  タイトル/ボタン文言切替、`openSyncModal()`/`closeSyncModal()`のoverlay開閉が
  正しく機能することを確認 ③`initAdminPanel()`/`openSymptomSettings()`/
  `isAdminOrPremium()`/`updateUnlock()`/`calcPainFreeDaysThisMonth()`/
  `loadCommunityTopic()`が例外なく実行されることを確認 ④`openRecordScreen`/
  `openLegacyRecordScreen`/`updateSettingsHero`/`submitSync`/`syncNow`/`logoutSync`の
  特殊ケースが引き続き解決可能なことを確認。Console ErrorはSupabase未設定環境ノイズ
  （既知）のみで新規エラーなし。
- Decision Log: 更新不要（Architecture/Roadmap/Business/Founder Strategy変更なし。
  純粋な自己export化+重複削除のみ）。
- **PR-091再監査は不要と判定**（12節参照）。Step Dは本PRで完了し、PR-091の判定内容
  （Known Deferred Items・Decision-4の扱い）自体には変更がないため。

**Founder Decision（2026-07-06）**: PR-090-R5の選択肢はDを採用。saveRecordScreenおよび
Home Cluster（buildHomeWeekRow/updateHomeInsightCard/updateHomeNumbers/
updateHomeDiseaseAdvice/updateHomeCTAState）はLegacy Removal Programから除外し、
β後のUI/UX Final Councilで判断する。理由: (1)どちらの実装に統一してもBusiness Logic
変更になる (2)どちらに統一してもUI変更になる (3)Legacy Removalの目的（物理移動）では
なく機能統合の製品判断が必要なため (4)判断はβ後のUI/UX Final Councilに委ねる。
Decision Log: `docs/LEGACY_REMOVAL_PLAN.md` 10-D節に記録。Recovery Plan更新:
`docs/LEGACY_COMPLETION_RECOVERY_PLAN.md` 2-3節・Step 3（Decision-3を「確定済み・
対象外」に変更）。

**PR-091 Legacy Exit Audit**（完了）: 監査スコープを「現行Recovery Program
（EXPORT_HUB_REFACTOR_COUNCIL・PR-090-P1〜R5）の対象範囲」のみに限定し、
saveRecordScreen/buildHomeWeekRow/updateHomeCTAState/Home ClusterはKnown Deferred
Itemsとして監査対象から除外して実施した（`docs/PR-091-legacy-exit-audit.md`）。

要点:
- Step A（自己export可能47件）: 完了（PR-090-R2）。
- Step B（window.state依存70件・Decision-1）/ Step C（Legacy依存55件のうち
  Known Deferred Item 1件を除く7モジュール）: **依存関係の解消は完了**
  （PR-090-R1/R3/R4）だが、**自己export行の追加とapp-legacy.js側の重複export行
  削除（Step D）は未実施**であることを新規発見（`grep`で現在も172行の
  window exportブロックが手つかずのまま残存していることを確認）。
- 【副次的発見】`window.openSyncModal`/`closeSyncModal`/`toggleSyncMode`の
  3行が、DEVICE SYNC節の手動exportとアルファベット順自動生成節の両方に
  重複して存在（実害なしだが冗長、SAFE_DEAD）。
- Build PASS / `vitest run` 5,193件中40件失敗（既知39件+
  research-query-api.test.jsの1件が並列実行時タイムアウト、単体実行では
  1.5秒でPASSする環境依存フレーキーと確認、実質増加なし）。
- 判定: app-legacy.js削除は不可（Known Deferred Items・Decision-4未決・
  Step D未実施のため）。ただしStep D自体はBusiness Logic変更を伴わない機械的
  作業（Step Aと同型）のため、Founder判断を待たずに次PRとして実施可能と判定。
- 次のアクション提案: PR-090-R6（Step D実施、約169行のexport行整理+重複3行削除）。

**PR-090-R5**（完了）: `saveRecordScreen()`が呼ぶ
`buildHomeWeekRow`/`updateHomeInsightCard`/`updateHomeNumbers`/`updateHomeDiseaseAdvice`/
`updateHomeCTAState`の5関数（app-legacy.jsローカル実装 vs home-renderer.js export版の
重複、PR-080Eで新規発見・据え置き済み）を実コード全文比較し、移動可否を判定した。
詳細は`docs/PR-090-R5-saveRecordScreen-migration-decision.md`参照。

要点:
- 5関数はいずれも**現在も両実装が同時に生存**しており、トリガー（起動時/タブ切替 vs
  保存直後/編集直後）によって描画される実装が異なる、pre-existingの実挙動不整合を
  新規発見。
- `buildHomeWeekRow`は正方形（痛みレベル色分け+周期フェーズ色+buildPhaseBar副作用、
  app-legacy.js版）vs 円形（✓/+のみ、home-renderer.js版）という**デザインそのものが
  別物**。
- `updateHomeCTAState`は完了判定基準が異なる（app-legacy.js版:「今日の記録が1件でも
  あれば完了」/ home-renderer.js版:「`record.meta.uiFlow === 'daily-checkin'`のみ完了」
  ——後者は`daily-record-card-guard.js`Hotfixが正としている現行基準で、app-legacy.js版は
  Hotfix以前の旧基準）。**これは重複整理ではなくプロダクト判断（どちらの完了基準を
  正式採用するか）に該当**。
- 選択肢A（app-legacy.js版へ統一）/B（home-renderer.js版へ統一）はいずれも
  Business Logic変更・UI変更を伴うため、本Program（Business Logic/UI変更禁止）の
  制約下では選択不可。C（現状維持）/D（β後UI/UX Final Councilで決定）のみ制約を満たす。
- 推奨: **D**（Cと同一の措置＝現状維持を取りつつ、判断主体をエンジニアリングから
  プロダクト/UXへ明示的に移管）。

各PRはFounder OS Scope Guard・Progressive Loadingに従い、Business Logic変更・
UI変更を禁止し、Architecture変更はDecision-1/2承認済み範囲のみ許可する。

Legacy Removal Program（PR-079〜PR-090-R6）としては、app-legacy.jsをBatch-1開始時
10,804行から2,447行（約77%削減、PR-090-R6時点）まで縮小し、現行Recovery Program
（EXPORT_HUB_REFACTOR_COUNCIL Step A〜D）が定義した範囲をすべて完了した時点で、
一旦の区切りとする。残るKnown Deferred Items（saveRecordScreen/Home Cluster）と
Decision-4（saveRecord/record-modal系）はいずれもFounder判断待ちであり、
これらが確定するまでPR-092 Final Cutoverには進まない。

**Release Readiness Council**（Wave2正式完了後の次ステップ、Legacy Removal Programとは別系統）
- Wave2（PR-041〜075）は2026-07-02にFounder承認（kenkou-jpg）を得て正式完了。
- Wave3 MASTER DESIGN入力・Wave3 Roadmap起点はRelease Readiness Council開催後に着手する。
- 本HANDOFFはPR実行ルールのエントリポイントであり、Release Readiness Council / Legacy Removal / Operations Council開始の要否・進行はFounderが別途判断する。

---

## 直前PR完了メモ

**PR-091: Legacy Exit Audit（監査のみ、コード変更ゼロ）**（Founder Decision後1本目、
FULL Mode相当——Legacy Removal判断を伴うため）
- Founder Decision（saveRecordScreen/Home ClusterのProgram除外、選択肢D採用）を受け、
  `docs/LEGACY_REMOVAL_PLAN.md` 10-D節・`docs/LEGACY_COMPLETION_RECOVERY_PLAN.md`
  2-3節/Step 3・`docs/PR-090-R5-saveRecordScreen-migration-decision.md`を確定版に更新。
- 続けて、現行Recovery Program（EXPORT_HUB_REFACTOR_COUNCIL・PR-090-P1〜R5）が
  自ら定義した対象範囲を完了しているか監査し、`docs/PR-091-legacy-exit-audit.md`に
  まとめた。Known Deferred Items（saveRecordScreen/buildHomeWeekRow/
  updateHomeCTAState/Home Cluster）は監査対象から除外。
- **新規発見**: Step A（自己export可能47件、PR-090-R2）は自己export追加+
  app-legacy.js側dedupの両方が完了済みだが、Step B（window.state依存70件）・
  Step C（Legacy依存55件のうちKnown Deferred Item除く7モジュール）は
  「依存関係の解消」（PR-090-R1/R3/R4）のみが完了しており、**自己export行の追加と
  app-legacy.js側の重複export行削除（Step D）が未実施**のまま残っていることを
  実コードで確認（`window.X = X`パターンが現在も172行、うち3行
  ——openSyncModal/closeSyncModal/toggleSyncMode——は二重定義）。
- Build PASS / `vitest run` 5,193件中40件失敗（既知39件 +
  `research-query-api.test.js`の1件が並列実行時タイムアウト、単体実行で
  1.5秒PASSを確認した環境依存フレーキー。実質増加なし）。Architecture Guard PASS
  （フル実行内、単体実行時の同型フレーキー1件は既知）。
- 判定: app-legacy.js削除は不可（Known Deferred Items・Decision-4未決・Step D未実施）。
  Step D自体はBusiness Logic変更を伴わない機械的作業のためFounder判断不要と判定し、
  PR-090-R6として次PRに提案。
- Decision Log: 更新不要（本PRは監査のみ、新たなFounder判断を要する事項なし。
  Founder Decision自体の記録はPR-090-R5完了時点で10-D節に反映済み）。
- 次: PR-090-R6（Step D実施）。実施可否・優先順位はFounderの通常のPR着手指示を待つ。

**PR-090-R5: saveRecordScreen Migration Decision（調査・判定のみ、コード変更ゼロ）**
（Recovery Program再開後5本目、FULL Mode相当——Founder判断が必要な変更のため）
- `saveRecordScreen()`が呼ぶ5関数（buildHomeWeekRow/updateHomeInsightCard/
  updateHomeNumbers/updateHomeDiseaseAdvice/updateHomeCTAState）の
  app-legacy.js実装とhome-renderer.js実装を全文比較し、あわせて実際の呼び出し経路
  （app.html onclick解決先・window export・ES module bare識別子解決）を追跡した。
- 全文比較の結果を`docs/PR-090-R5-saveRecordScreen-migration-decision.md`にまとめた。
  詳細な差分表・選択肢評価・Release Riskは同文書参照。
- 【新規発見の要旨】
  1. 5関数はいずれも両実装が現在も同時に生存しており、起動時/タブ切替では
     home-renderer.js版、`saveRecordScreen`/`saveEditRecord`直後はapp-legacy.js版が
     描画される、pre-existingの実挙動不整合（本文書作成による調査でのみ判明、
     PR-090-R1〜R4のいずれの変更にも起因しない）。
  2. `switchTab`自体も同型の2実装並存状態（app.htmlのonclickは`tab-navigation.js`版
     `window.switchTab`に解決され、app-legacy.js版switchTabはbottom-nav経由では
     到達しないが、`closeModal()`内のbare呼び出しでは生存）。PR-091 Legacy Exit Audit
     で考慮すべき別課題として記録。
  3. `updateHomeCTAState`の完了判定基準の相違は「重複」ではなく
     「`daily-record-card-guard.js`Hotfixによる基準変更が片方の実装にしか反映
     されていない」状態——エンジニアリングの物理移動判断ではなくプロダクト判断が必要。
- 選択肢A（app-legacy.js版に統一）/B（home-renderer.js版に統一）はいずれも
  Business Logic変更・UI変更を伴うため本Programの制約下では採用不可と判定。
  C（現状維持）/D（β後UI/UX Final Councilで決定）のみ制約を満たす。
- **推奨: D**。Cと同一の措置（現状維持）を取りつつ、判断主体をエンジニアリングから
  プロダクト/UXへ明示的に移管する。
- Build/Test: 未実施（コード変更ゼロのため対象外）。
- Decision Log: 本件はDecision候補（saveRecordScreen統合方針の最終決定）として
  Founder確認待ち。A/B/C/Dのいずれを採用するか、Dの場合UI/UX Final Councilの
  開催時期、updateHomeCTAStateの完了基準がHotfix導入時に正式決定済みかの3点を
  9節にまとめた。
- 次: Founderの判断（A/B/C/D選択）を待つ。判断確定までPR-091 Legacy Exit Auditは
  着手しない。

**PR-090-R4: Legacy依存残件の物理移動（supabaseUserId/syncMode/updateStats/SYMPTOM_DETAIL_CONFIG）**
（Recovery Program再開後4本目、STANDARD Mode。指示範囲は5項目だったが、うち
saveRecordScreenは下記理由により本PRでは未着手）
- **supabaseUserId**（Council 6-2）: `src/services/supabase.js`へ物理移動。
  `getSupabaseUserId()`/`setSupabaseUserId()`をexportし、admin.js/community.js/
  legacy-misc-stats.js（isAdminOrPremium）・app-legacy.js（import back、4箇所の
  bare参照を置換）はいずれも直接importに変更。`window.__ippoGetSupabaseUserId`/
  `__ippoSetSupabaseUserId`ブリッジは廃止。
- **syncMode**（Council 6-4）: `src/modules/sync-modal.js`へ物理移動（`toggleSyncMode`が
  唯一のmutatorであるため同ファイルが自然な所有者と判断）。`getSyncMode()`/
  `setSyncMode()`をexportし、`src/services/supabase.js`（submitSync、2箇所）が
  直接import。`window.__ippoGetSyncMode`/`__ippoSetSyncMode`ブリッジは廃止。
- **updateStats**（Council 6-4）: app-legacy.jsローカル実装（home-renderer.js版とは
  別実装、PR-080C重複整理と同型の「統合しない」判断を踏襲）を
  `src/modules/legacy-misc-stats.js`（calcPainFreeDays/updateUnlockと同型のDOM更新系
  ヘルパーが既に集約されている場所）へ物理移動。data-export.js（clearData）は
  `window.__ippoLegacyUpdateStats()`ブリッジ経由を廃止し同モジュールから直接import。
  app-legacy.js側はimport backし、bare呼び出し4箇所（オブジェクト定義部除く）は無改造。
- **SYMPTOM_DETAIL_CONFIG**（Council 6-4）: `src/constants/symptom-detail.js`（新設、
  ICONS/DISEASE_CONFIGと同型）へデータのみ物理移動。
  **【新規発見】** 移動前調査で、`window.SYMPTOM_DETAIL_CONFIG`を設定するコードが
  リポジトリ中に一切存在しないと判明（`window.DISEASE_CONFIG`はconstants/disease.js側
  window bridgeにより実際に機能しているのと対照的）。つまりrecord-input.jsの
  `appendSymptomDetail`/`renderSymptomDetail`は常時`{}`フォールバックが発火しており、
  症状詳細サブUI（部位/タイプ/スライダー）は移動前から機能していなかった
  （pre-existing、本PR起因ではない）。ICONS/DISEASE_CONFIGと同様に`window.X = X;`
  ブリッジを新設すると、この症状詳細UIが初めて表示されるようになり実質的な機能有効化
  ＝Business Logic/UI変更に該当するため、本PRでは意図的にwindow bridgeを追加せず
  data-onlyの物理移動に留めた。record-input.js側の配線見直しは別途Founder判断が
  必要な別課題として扱う（詳細はsrc/constants/symptom-detail.jsのコメント参照）。
- **saveRecordScreen**（Council 6-4）: **未着手**。実装前調査で、
  `saveRecordScreen()`が呼ぶ`buildHomeWeekRow`/`updateHomeCTAState`/
  `updateHomeInsightCard`/`updateHomeNumbers`/`updateHomeDiseaseAdvice`の5関数は
  PR-080Eで新規発見済みの「app-legacy.jsローカル実装 vs home-renderer.js側export版」
  重複問題（未解消のままFounder判断により据え置き中）を持つと判明。この重複を
  解消せずに`saveRecordScreen`を物理移動すると、移動先が5関数のどちらの実装を
  importするか次第でBusiness Logic変更のリスクを伴う（PR-080E時点でFounderが
  同じ理由で「重複のない部分のみ限定的に移動」と判断済み）。本PRの「Business Logic
  変更なし」の制約と矛盾するため、他4項目とは切り離し次PR（重複解消方針の
  Founder確認後）へ据え置いた。
- SG-7 line-count-guard: `app-legacy.js`: 2,686行→2,554行（132行削減）。
  BASELINE_LINE_COUNTを2,554に更新。
- Build PASS / `vitest run` 5,193件中失敗39件（既知5ファイルのみ、増加なし）/
  Architecture Guard 113件PASS。
- Browser Verification: Vite dev server + app.html実機で①`toggleSyncMode()`実行後
  タイトル/ボタン文言が「新規登録」⇔「ログイン」に正しく切り替わることを確認
  ②`window.__ippoGetSupabaseUserId`等の旧ブリッジが未定義になったことを確認
  ③`clearData()`実行後、物理移動後の`updateStats()`が例外なく実行され
  `state.totalDays`が0にリセットされることを確認。Console Errorは
  vite websocket接続失敗・Supabase未設定環境ノイズ（`renderSyncUI`の
  `supabase.auth.getSession()`呼び出し、既知）のみで新規エラーなし。
- Decision Log: 更新不要（Architecture/Roadmap/Business/Founder Strategy変更なし。
  SYMPTOM_DETAIL_CONFIGのwindow bridge新設判断とsaveRecordScreenの5関数重複解消方針は
  Founder確認が必要な別課題として切り出し済み）。
- 次: saveRecordScreen物理移動の前提条件（5関数重複）を実コードで比較・判定する
  PR-090-R5（調査PR）を実施。

**PR-090-R3: window.state依存70件の解放（Decision-1実装）**（Recovery Program再開後3本目、STANDARD Mode）
- `docs/EXPORT_HUB_REFACTOR_COUNCIL.md` 5節・7節Step Bの実装。`src/store/state.js`の
  `setState()`内、`_state = newState;`の直後に`try { window.state = _state; } catch (_) {}`
  を追加し、`window.state`を`state.js`自身が直接同期するよう変更（Decision-1承認範囲）。
- 冒頭の設計方針コメントも実態に合わせて修正（存在しない
  `Object.defineProperty`ゲッターの記述を削除し、実装済みの直接同期方式を記載）。
- 変更は`src/store/state.js`1ファイルのみ。`app-legacy.js`側の既存`_ippoStateHooks`
  ブリッジ（`window.state`への同型の同期）はそのまま維持しており、二重同期になるが
  同一値の再代入のため副作用なし。
- これによりCouncil 4節の「window.state依存」18モジュール・70件（一部は
  Legacy依存と複合、6-3節参照）が、`app-legacy.js`の実行有無に関わらず
  `window.state`の値が保証される状態になった。
- Build PASS / `vitest run` 5,193件中失敗39件（既知5ファイルのみ、増加なし）/
  Browser Verification: Vite dev server + app.html実機で`setState()`呼び出し後に
  `window.state === getState()`（同一参照）であることを確認、新規Console Errorなし。
- 次: PR-090-R4（Legacy依存残件の物理移動、Founder判断不要）。

**PR-090-R2: 自己export可能47件の自己export化**（Recovery Program再開後2本目、STANDARD Mode）
- `docs/EXPORT_HUB_REFACTOR_COUNCIL.md` 4節「自己export可能」12モジュール・47件
  （meal-quick-input.js/meal-tracker.js/pro/shared/pro-metric-utils.js/quick-log.js/
  record-edit.js/record-factors.js/record-screen-widgets.js/save-and-sync.js/
  share.js/symptom-layers.js/ui-notifications.js/utils/string-utils.js）へ
  `window.X = X;`の自己export行を追加。
- `save-and-sync.js`は`window.saveAndSync`（record-modal-controller.jsの別実装が
  既に使用中）ではなく、fasting.js/quick-log.jsが明示的に呼ぶための専用ブリッジ
  `window.__ippoLegacySaveAndSync`のみを自己export（bridge維持タグ対象、
  Council 3-1節の設計通り）。
- `app-legacy.js`側の重複export行47件を削除（末尾のexportブロックから、
  `if (typeof X === "function") window.X = X;`形式46件 + `window.__ippoLegacySaveAndSync
  = saveAndSync;`1件）。importと内部bare呼び出しは維持（app-legacy.js自身が
  これらの関数を直接呼ぶ箇所が残っているため）。
- `app-legacy.js`: 2,733行 → 2,686行。line-count-guardの`BASELINE_LINE_COUNT`を更新。
- Build PASS / `vitest run` 5,193件中失敗39件（既知5ファイルのみ、増加なし）/
  Architecture Guard 120件PASS（`tests/arch`単体実行時に1件flaky timeout発生も、
  フル`vitest run`内では該当テストは正常PASSしていることを確認済み）。
- 次: PR-090-R3（Decision-1実装、`state.js`でのwindow.state直接同期）。

**PR-090-R1: isPremium依存解消（import差し替え）**（Recovery Program再開後1本目、FAST Mode）
- Founder承認（Decision-1/2 + EXPORT_HUB_REFACTOR_COUNCIL結果）後の最初のPR。
- `src/modules/insights-tab-panel.js`（`updateFoodBodyCorrelation`/
  `updateCycleSymptomCorrelation`内、2箇所）と`src/modules/legacy-misc-stats.js`
  （`isAdminOrPremium`内、1箇所）の`window.__ippoGetIsPremium()`呼び出しを、
  既存の正式なPremium Source of Truthである`src/modules/premium/premium-service.js`の
  `isPremium()`直接importへ差し替え。挙動変更なし（同一の値を参照）。
  `app-legacy.js`は未変更（`window.__ippoGetIsPremium`ブリッジ自体は
  `__ippoSetIsPremium`との対で残置、呼び出し元ゼロになったが削除はScope外）。
- **実装中に発見・訂正した誤り**: Council報告書6-1節は「isPremium依存17件、
  import差し替えのみで解決可能」としていたが、実際に呼び出し元を再検証したところ
  `admin.js`/`community.js`は`__ippoGetSupabaseUserId`のみに依存しており
  `__ippoGetIsPremium`とは無関係（真の対象は`insights-tab-panel.js`+
  `legacy-misc-stats.js`の計6件のみ）。さらに`community.js`/
  `insights-tab-panel.js`の一部関数（`renderInsightDiscoveries`、
  `switchInsTab`が呼ぶ`updateFoodBodyCorrelation`/`updateCycleSymptomCorrelation`）
  は`window.state`にも依存する**複合ブロッカー**であることが判明し、
  本PRの範囲では完全な自己export可能化には至っていない（PR-090-R3のDecision-1
  実装待ち）。詳細・訂正は`docs/EXPORT_HUB_REFACTOR_COUNCIL.md` 6節参照。
- 本PRでは自己export追加・app-legacy.js側export行削除は行っていない
  （対象exportの一部が依然window.state/supabaseUserId依存のため、PR-090-R2以降
  「全ブロッカー解消済み」の単位でまとめて実施する）。
- Build PASS / `vitest run` 5,193件中失敗39件（既知5ファイルのみ、増加なし）。

**EXPORT_HUB_REFACTOR_COUNCIL**（Recovery Program一時停止中の設計提案、コード変更ゼロ）
- Founder指示により、PR-090-E1着手前にAPP_LEGACY_EXPORT_HUB 172件（PR-090-P3で判明、
  全exportの78%）を依存関係レベルで再調査し、`docs/EXPORT_HUB_REFACTOR_COUNCIL.md`を作成。
- 172件を38モジュールに集約し、自己export可能12モジュール/47件（27%）・window.state依存
  18モジュール/70件（41%）・Legacy依存8モジュール/55件（32%）に分類。
- **新規発見**: `src/store/state.js`の設計コメントが想定する「window.stateの
  Object.definePropertyゲッター」は実装に存在せず、実際は`app-legacy.js`の
  `_ippoStateHooks`フックのみが`window.state`を同期している（app-legacy.js削除で
  即stale化する）。対処は`state.js`1ファイル内で完結する見積もり。
- **新規発見**: Legacy依存55件のうち17件（`__ippoGetIsPremium`系）は、実は既に
  独立した正式なSource of Truth（`src/modules/premium/premium-service.js`、
  Supabase subscriptions realtime購読）が存在し、importを差し替えるだけで
  Architecture変更なしに解決できる。
- 判定: Legacy依存55件はArchitecture変更不要（個別の物理移動PRで解決可能、
  Recovery Programの延長として続行可）。window.state依存70件は`state.js`への
  限定的な変更（Decision-1拡張版）が前提。自己export可能47件はDecision-2承認のみ。
- コード変更ゼロ。Build PASS / Architecture Guard 120件PASS（1件は無関係なflaky
  timeoutで単体実行では合格を再確認済み）。
- Founder確認待ちで停止。詳細は`docs/EXPORT_HUB_REFACTOR_COUNCIL.md`参照。

**PR-090-P3: Window Export Inventory Audit**（Legacy Completion Recovery Plan Step1、監査のみ・コード変更ゼロ）
- `src/app-legacy.js`のwindow export行**220件全件**を機械的に抽出・分類。
  A.SELF_EXPORTED_BY_MODULE 18件 / B.APP_LEGACY_EXPORT_HUB 172件（78%）/
  C.STATE_PROVIDER 6件 / D.LIVE_LEGACY_IMPLEMENTATION 18件 / E.DEAD_EXPORT 6件 /
  F.AMBIGUOUS 0件。詳細は`docs/PR-090-P3-window-export-inventory.md`参照。
- **最重要の発見**: PR-089Zの定性的判断（「移動先モジュール自身はwindow exportしていない
  ケースを確認」）が、B分類172件（全体の78%）に該当すると定量的に確定。これが
  `app-legacy.js`削除の最大の障壁であることを数値で裏付けた。
- E分類6件のうち`updateHomeVision`は本PRで新規発見（`src/modules/app-bootstrap.js`の
  起動時呼び出しがtypeof guardにより常にno-opになっている、home cluster5関数とは別枠）。
- 補助検証として`app.html`のonclick参照全件を突合、孤立参照（呼び出し先不在）はゼロを確認。
- コード変更ゼロ（監査文書1件のみ追加）。Build PASS / Architecture Guard 120件PASS。
- 次: PR-090-E1（E分類6件の削除、Founder判断不要）。Decision-1〜4はFounder確認待ちで
  本Recovery Programを一旦停止。

**PR-090-P2: updateSettingsHero Physical Move**（Legacy Completion Recovery Plan Step1、FAST Mode）
- `docs/LEGACY_COMPLETION_RECOVERY_PLAN.md` 2-6節の定義通り、Founder判断・Business Logic変更
  なしの純粋な物理移動として実施。settings-display-runtime.js版との統合はPR-081時点で
  「製品判断が必要、Scope外」と確定済みのため再確認せず、現状（重複維持）のまま実施。
- `updateSettingsHero()`（app-legacy.js側のローカル実装）を`src/modules/legacy-settings-hero.js`
  （新設）へ物理移動。挙動変更なし。bare `state`→`window.state`、`isAdminOrPremium`は
  `src/modules/legacy-misc-stats.js`から直接import。
- `window.__ippoLegacyUpdateSettingsHero`ブリッジ（premium-lock.jsのupdatePremiumBadges()が
  本ローカル実装を明示的に呼び出すための専用経路）はimport経由の関数を指すよう自動的に解決、
  挙動変更なし。`window.updateSettingsHero`エクスポートも同様に維持（実際にはload順で
  settings-display-runtime.js版に上書きされる、PR-081時点と同じ挙動）。
- `app-legacy.js`: 2,759行 → 2,733行。`tests/arch/legacy-removal-pr079-line-count-guard.test.js`の
  `BASELINE_LINE_COUNT`を更新。
- Build PASS / `vitest run` 5,193件中失敗39件（既知5ファイルのみ、増加なし）。
- 次: PR-090-P3（window exportブロック全件棚卸し監査）。

**PR-090-P1: closeSuccess Physical Move**（Legacy Completion Recovery Plan Step1、FAST Mode）
- `docs/LEGACY_COMPLETION_RECOVERY_PLAN.md` 2-6節の定義通り、Founder判断・Business Logic変更
  なしの純粋な物理移動として実施。
- `closeSuccess()`（成功オーバーレイのクローズ処理）を`src/app-legacy.js`から
  `src/modules/success-overlay.js`（新設）へ物理移動。挙動変更なし。
  `window.closeSuccess`ブリッジはapp-legacy.js側のexportブロックをそのまま維持（import経由で解決）。
- `app-legacy.js`: 2,765行 → 2,759行。`tests/arch/legacy-removal-pr079-line-count-guard.test.js`の
  `BASELINE_LINE_COUNT`を更新。
- Build PASS / `vitest run` 5,193件中失敗39件（既知5ファイルのみ、増加なし）。
- 次: PR-090-P2（updateSettingsHeroの物理移動）。

**PR-089Z: Legacy Removal Final Cutover判定**（Legacy Removal Program最終PR、コード変更ゼロ）
- 目的: PR-089A〜PR-089F-7GまでのLegacy Removal監査・移植結果をもとに、`app-legacy.js`の
  最終削除可否を判定する。
- **判定: `app-legacy.js`は削除不可。** 静的解析（grep全件確認）+ ビルドレベル実地検証
  （`import './app-legacy.js';`を一時除外して`npx vite build`実行 → ビルド自体は成功、
  検証後に復元）+ Node.js/jsdomによるモジュール単体実行時検証、の3手法で確認した。
- 削除不可の主因: (1) `window.state`の唯一の提供元であり`src/store/state.js`側の設計もこれに
  依存、(2) PR-079〜088で物理移動済みの多数のモジュールにとって、app-legacy.js末尾の
  window exportブロックが唯一の`window.*`公開経路になっている（移動先モジュール自身は
  window exportしていないケースを確認）、(3) `initNavIcons`/`initSettingsIcons`等、
  他に委譲先のない実働コードを内包。
- `closeModal`/`openRecordModal`/`saveAndSync`のno-op疑惑（`record-modal-controller.js`の
  `_inline*`委譲パターン）をjsdom実行時検証で確定。設計コメントが前提とする「inline
  `<script>`実行後にロード」という条件が、現行コード（`<script type="module">`1本のみ）では
  満たされないため。ユーザー影響のある潜在バグだが、到達経路が2026-05-27付けsoft-isolated済み
  の`#record-modal`に限定されるため、Release Riskは低〜中と判定。修正は別途Founderが優先度判断。
- Chrome拡張機能（claude-in-chrome）が本PR実施中終始接続不可のため、実ブラウザでの
  クリック検証は未実施。代替としてNode.js/jsdomのモジュール単体実行時検証を採用。
- Build PASS / `tests/arch/`(Legacy Guard含む) 104件PASS / `vitest run` 5,193件中失敗39件
  （既知5ファイルのみ、増加なし）。
- 詳細・Remaining Legacy一覧・Decision Log候補は`docs/PR-089Z-final-cutover-decision.md`参照。

**Wave2 Official Completion — Founder Approval**（Wave2正式完了、Phase G capstone後続）
- 2026-07-02、Founder（kenkou-jpg）が `generateWave2ExitReport()` の結果を確認し「APPROVE WAVE2 EXIT」を明示。
- Exit Report: EC-01〜15 全15件PASS / QC-01〜04 全4件PASS / BD-001〜043のうち機械監査可能9件（BD-021,026,027,030,031,036,037,038,039）全PASS・FAILなし / 残り34件はFOUNDER_REVIEW_REQUIRED（コードで証明不可能な業務・歴史的決定のため、虚偽PASSにせずFounder自身が確認）。
- EC-15根拠: `vitest run` 実測 5,061件中5,022件PASS・失敗39件＝既知5ファイル（tests/modules/build-draft-from-ui.test.js, tests/modules/save-record-screen.test.js, tests/events-domain/domain-event-types.test.js, tests/menstrual-domain/event-menstrual.test.js, tests/disease/disease-analyzer.test.js）のpre-existing failureのみ、新規失敗ゼロを確認。
- `confirmWave3Migration()` 実行結果（ApprovalRecord）: approvalId=`wave2exit_1782980527914_1` / founderId=`kenkou-jpg` / ecPassCount=15 / qcPassCount=4 / confirmedAt=`2026-07-02T08:22:07.914Z`。
- Wave3 Readiness: `wave3ReadyForFounderApproval=true`。Next: Release Readiness Council。

**PR-073: Architecture Guard Wave2 Complete**（Phase G開始・完了）
- KNOWN_FEATURES（route-registry.js）がPR-050以降ずっと未更新で、composition-root.jsのPR-051〜072全register()呼び出しが「Unknown feature」で黙って握りつぶされていた構造的ギャップを解消（22Feature追加、57→59件）。
- composition-root.js `_registerFeatures()` にPR-066〜070（Phase3Validation/SimilarityPublicGate/ResearchDatasetV2/CohortResearchExport/DoiCandidate）の`r.register()`呼び出し自体が存在しなかった欠落を追加で解消。
- ArchitectureGuardルール欠落: PR-042（Supabase Persistence）/ PR-050（SignalIntelligenceV2）/ PR-057〜062（Phase D全6PR）にルールが皆無だった（+18ルール）。責務③としてAIサービスDomain→ResearchDataset内部への直接アクセス禁止ルールを新規追加（+3ルール、domain→domain種別の新パターン）。
- 副作用: 既存テスト16ファイルがKNOWN_FEATURES件数の固定値（37）をハードコードしており、正しい59に更新（PR-073の直接帰結、スコープ内）。
- **Pre-existing failure 5ファイル・39件は本PRと無関係**（tests/modules/2ファイル: src/modules/record.js の壊れたインポート / domain-event-types.test.js・event-menstrual.test.js: DOMAIN_EVENT_TYPES固定値29のドリフト（PR-057以降未更新、PR-073スコープ外）/ disease-analyzer.test.js: 日付依存の既存テスト）。PR-074でこれらの増加有無を確認する。
