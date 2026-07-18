# PR-RELEASE-READINESS-07: Release Candidate Preparation

コード変更なし（ドキュメント整理のみ）。SSOT: `docs/rebuild/PR_RELEASE_READINESS_01_INVENTORY.md`・
`docs/rebuild/PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md`・
`docs/rebuild/PR_RELEASE_READINESS_03_BROWSER_VERIFICATION_GUIDE.md`・
`docs/rebuild/PR_RELEASE_READINESS_04_BACKFILL_EXECUTION_PACK.md`・
`docs/rebuild/PR_RELEASE_READINESS_05_FEATURE_FLAG_RELEASE_PLAN.md`・
`docs/rebuild/PR_RELEASE_READINESS_06_LEGACY_REMOVAL_PLAN_RC_SCOPE.md`。

**本PRはRCタグ作成・Release実行・Beta公開のいずれも行わない。** すべて
Founder最終承認後にFounderまたはFounder指示のもとで実施する。

---

## 1. Release Candidate Checklist

```
□ Home Browser Verification: Pass（Founder確認待ち）
□ Experiment Browser Verification: Pass（Founder確認待ち）
□ Insights Browser Verification: Pass（Founder確認待ち）
□ Billing Browser Verification: Pass（Founder確認待ち）
□ Me Browser Verification: Pass（Founder確認待ち）
□ PR-REC-06c: Dry Run実行・出力確認・本実行完了（Founder操作待ち）
□ PR-REC-06b: Browser Verification要否をFounderが判断（判断待ち）
□ 5画面のBV結果がすべてPassの場合、本番既定化するFeature Flagのスコープを
  Founderが確定（`PR_RELEASE_READINESS_05_FEATURE_FLAG_RELEASE_PLAN.md`
  2節の推奨順序を参照可能）
□ 全テストスイート再実行・PASS確認 — 2026-07-17時点で実施済み
  （5節「Regression結果」参照、既知の3ファイル35件を除き全PASS）
□ Production Build確認 — 2026-07-17時点で実施済み（5節「Build情報」参照）
□ Architecture Guard確認 — 未実施（該当PRがある場合に限り実施）
□ Console Error 0件（全対象画面）— Browser Verification実施時にFounderが確認
```

本チェックリストは`PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 8節と同一
内容。本文書では进捗（2026-07-17時点でAIが自走完了できた項目）を反映して
再掲した。

---

## 2. Release Note（ドラフト、Founder最終確認後に公開用へ整形）

```
## IPPO Release Candidate — 2026-07 General Release Integration

### 主な変更
- Home・Experiment・Insights・Billing・Meの5画面が
  Prototype UI → Runtime → Application Facade → Domain という統一
  アーキテクチャで再構築されました（Feature Flagにより段階的に有効化）
- Experiment画面から新しい実験を開始できるようになりました
  （完了・中止操作は既存画面から引き続き行います）
- Insights画面に「今週のハイライト」が表示されるようになりました
- Billing画面で現在のプラン（Free/Premium/Pro）を確認できるようになりました
  （購入・変更はまだできません、準備中です）
- Me画面から現在のプラン確認・Billing画面への遷移ができるようになりました

### 変更されていない項目
- Record（記録）の保存フローは既存のまま変更ありません
- パターンカレンダーは既存のまま変更ありません
- 同意（研究協力）設定は既存のまま変更ありません
- 決済・購入手続きは既存のまま変更ありません
```

---

## 3. Known Issues

| # | 内容 | 影響範囲 | 回避策 |
|---|---|---|---|
| 1 | Experiment画面の「完了」「中止」「今日もOK」操作が新UIから未接続 | Experiment next画面のみ | 既存画面（legacy）から操作する |
| 2 | Billing/Pro画面のCTA（購入・変更ボタン）が押せない（準備中固定） | Billing next画面のみ | Checkout接続PR完了まで意図的な制限 |
| 3 | `build-draft-from-ui.test.js`・`save-record-screen.test.js`・
    `disease-analyzer.test.js`（既知3ファイル35件）が`record.service.js`の
    import解決エラーによりテスト実行時に失敗 | テスト実行環境のみ、本番挙動への影響なし（HANDOFFに記録済みの既知failure、本セッションの変更と無関係） | 該当なし（既知の事前失敗として許容） |

---

## 4. Known Limitations

```
- Pattern Calendarは今回のRCに含まれない（現状維持、General Release後の
  独立PRで検討）
- ~~Research Consent UIは新規再設計されていない~~ **2026-07-18更新**:
  Founder DecisionによりPrototype v2再設計を待たず、既存consent-service.js
  をMe-nextへ再接続する形でRuntime実装済み（同意文言・レベル定義は無変更）
- Case/Similarity（Phase 7）は今回のRCに含まれない（未着手）
- ~~Billing価格・商品構成（¥580/月・¥4,800/年 vs 過去記録の¥980/¥1,980の
  不一致）は未解消~~ **2026-07-18 Founder Decisionにより解消**:
  ¥580/月・¥4,800/年を正式確定。Checkout接続自体は別途実装判断が必要
- 全5画面ともFeature Flag既定OFFのままRCに含まれる（本番既定化は
  Browser Verification Pass後、別途Founder承認を経て実施）
```

---

## 4-A. Production Deployment Record（2026-07-17、Founder承認済み本番反映）

本セクションは通常のRC→Release手順（14〜15節）とは別に、Founderが
Browser Verification未完了のまま先行して`main`へ反映することを明示承認
した記録。

```
Deployment: 完了
Source Branch: ops/recovery-program（先端コミット f0a596a）
Main Commit（マージ前の直前main）: b68cf0d
Merge Commit: c364d6c（PR #371、GitHub上でFounderがマージ）
Build: PASS（Build and Deploy workflow run 29554613572、3分16秒、成功）
Regression: 差分ゼロ（マージ前にops/recovery-program上で313ファイル中
  310PASS・既知3ファイル35件除き新規失敗ゼロを確認済み）
GitHub Actions:
  - CI: 成功（run 29554613580）
  - Build and Deploy: 成功（run 29554613572）
  - Deploy Supabase: 失敗（run 29554613588、`supabase db push`が対話確認
    待ちで停止。PR #370マージ時も同様に失敗した既知の事前問題であり、
    本デプロイのフロントエンド反映とは無関係。Migration実行は本デプロイの
    スコープ外のため未対応）
Production URL: https://www.ippo-app.com/（GitHub Pages、cname設定済み、
  HTTPS証明書approved・有効期限2026-09-18）
Production Smoke Test（AI実施、非破壊確認のみ）:
  - トップページ・app.html双方 200応答、静的アセットすべて200
  - Console致命的エラーなし
  - blank screenではない（未ログイン状態でwelcome画面が正常表示）
  - window.ippoHomeNext / ippoExperimentNext / ippoInsightsNext /
    ippoBillingNext / ippoMeNext がすべて定義済み（コード配信確認）
  - window.ippoHomeNext.isEnabled() = false（Home含む5画面ともFeature
    Flag既定OFFであることを本番で確認）
  - ログイン後のLegacy Home実表示・実データでのRuntime動作は未確認
    （アカウント作成・ログインはAIが行わない範囲のため、Founder確認が
    別途必要）
Feature Flags: 5画面すべて本番で既定OFFを確認（上記smoke test参照）
Data Changes: なし（Migration・Backfill・Stripe操作・Consent変更いずれも
  未実施）
Rollback: 未実施（発生条件に該当する事象なし）。必要な場合は
  `git revert c364d6c`→`git push origin main`（force push不可）
Documentation: 本項目・`docs/HANDOFF_PHASE7_COMPLETE.md`引継ぎサマリーに
  記録済み
Known Issues: `Deploy Supabase`workflow失敗（上記、既知・スコープ外）
Remaining Founder Actions:
  - ログイン後のLegacy Home実機確認（本番で意図通りLegacy表示のままか）
  - 5画面のBrowser Verification（`PR_RELEASE_READINESS_03`ガイド使用、
    本番URLまたは`window.ippoXxxNext.preview()`経由で実施可能になった）
  - PR-REC-06c Backfill・PR-REC-06b BV要否判断は引き続き未着手
```

---

## 5. Feature Flag一覧（現在値スナップショット、2026-07-17時点）

| Flag | 対象画面 | 現在値 |
|---|---|---|
| `ippo_home_next` | Home | OFF |
| `ippo_experiment_ui_v2` | Experiment | OFF |
| `ippo_insights_ui_v2` | Insights | OFF |
| `ippo_billing_ui_v2` | Billing | OFF |
| `ippo_me_ui_v2` | Me | OFF |

切替順・依存・リスクの詳細は`PR_RELEASE_READINESS_05_FEATURE_FLAG_RELEASE_PLAN.md`
を参照。

---

## 6. Blocker一覧

| 重要度 | 項目 | 状態 |
|---|---|---|
| Critical | Home/Experiment/Insights/Billing/MeのFounder Browser Verification（5件） | Founder確認待ち |
| Critical | PR-REC-06c（バックフィルスクリプト実行） | Founder操作待ち |
| High | PR-REC-06b（リトライ機構のBV要否判断） | Founder判断待ち |
| Medium | Billing価格・商品構成の確定 | Founder Decision待ち |
| Low | Phase 7（Case/Similarity）の現状確認 | 未着手、RC範囲外 |

（`PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 6節と同一、本文書では
サマリーとして再掲）

---

## 7. Rollback Plan

```
Feature Flagレベル（各画面）:
  該当Flagをdisable()するか、localStorageキーを削除する。コード変更不要で
  即座にlegacy画面へ戻る（詳細: PR_RELEASE_READINESS_05 3節）

コードレベル（本番既定化・Legacy削除後に問題が発覚した場合）:
  該当PRをgit revertし、Feature Flagを再度OFFへ戻す（詳細:
  PR_RELEASE_READINESS_06 3節）

データレベル（PR-REC-06c Backfill実行後に問題が発覚した場合）:
  正規化テーブル側の該当行を手動削除する。legacy user_recordsは変更
  していないためRead Sourceへの影響はゼロ（詳細:
  PR_RELEASE_READINESS_04 6節）

共通の注意点:
  Service Worker配信環境では、キャッシュされた古いJS/HTMLがロールバック
  後も残ることがある（PR-092系で確認済みのgotcha）。ロールバック後に
  変化が反映されない場合はまずSWキャッシュを疑う
```

---

## 8. Monitoring Plan

```
Feature Flag既定ON化後に確認すべき項目（Founderが実施、AIは監視代行しない）:
  □ Console Error発生率（該当画面のみ、既存画面と比較して増加していないか）
  □ Sentry等のエラーレポート（`@sentry/browser`が依存関係に存在、
    本番導入済みであれば該当ダッシュボードを確認）
  □ Experiment開始操作のSupabase書込みエラー率
    （唯一の書込み系Flagのため優先度高）
  □ Billing画面表示時の「現在のプラン」表示とpremium-service.js側の
    実際の契約状態との不一致報告の有無
  □ ユーザーからの表示崩れ・動作不良フィードバック
```

---

## 9. Build情報（2026-07-17時点、AI自走で確認済み）

```
コマンド: npm run build
結果: PASS（4.93秒）
警告: 既知の循環チャンク警告4件（record-modules⇄ui-home等）・
  動的/静的import混在の警告（domain-event-types.js等）・
  873.90 kBチャンクサイズ警告（app-D6Ov1RxW.js）
  — いずれも新規ではなく、既存のビルド構成に起因する既知の警告
新規エラー: なし
```

---

## 10. Regression結果（2026-07-17時点、AI自走で確認済み）

```
コマンド: npm test（vitest run）
結果: 312テストファイル中309ファイルPASS、5,429テスト中5,394 PASS
失敗: 3ファイル35件
  - tests/modules/build-draft-from-ui.test.js
  - tests/modules/save-record-screen.test.js
  - tests/modules/disease-analyzer.test.js
  （いずれも src/modules/record.js が
  `../../domains/record/record.service.js` を解決できないことに起因する
  既知の事前失敗。HANDOFF・PR_RELEASE_READINESS_02に記録済みのベースラインと
  完全一致。本セッションの変更と無関係、新規失敗ゼロ）
所要時間: 167.60秒
```

---

## 11. Browser Verification結果（Founder記入欄）

| 画面 | Pass/Fail | 確認日 | 備考 |
|---|---|---|---|
| Home | ☐ Pass ☐ Fail | | |
| Experiment | ☐ Pass ☐ Fail | | |
| Insights | ☐ Pass ☐ Fail | | |
| Billing | ☐ Pass ☐ Fail | | |
| Me | ☐ Pass ☐ Fail | | |

実施手順: `PR_RELEASE_READINESS_03_BROWSER_VERIFICATION_GUIDE.md`。
チェックリスト本体: `PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 2節。

---

## 12. Backfill結果（Founder記入欄）

```
Dry Run実行日:
  total:        succeeded:        skipped:        failed:

本実行日:
  total:        succeeded:        skipped:        failed:

正規化テーブル件数（本実行後）:
件数確認・差分確認の結果:
```

実施手順: `PR_RELEASE_READINESS_04_BACKFILL_EXECUTION_PACK.md`。

---

## 13. Beta Release Checklist

```
□ 本文書1節「Release Candidate Checklist」全項目完了
□ ops/recovery-program → release/general-release-integration ブランチ作成
  （Founder最終承認必須、AIは実施しない）
□ Release Note（2節）の最終確認・公開用への整形（Founder）
□ Known Issues（3節）・Known Limitations（4節）のユーザー向け告知要否判断
  （Founder）
□ Monitoring体制（8節）が実際に稼働していることの確認（Founder）
□ Rollback Plan（7節）の実施権限者・連絡経路の確認（Founder）
```

---

## 14. RCタグ作成手順（Founderが実施、AIは実施しない）

```
1. 1節のRelease Candidate Checklistが全項目完了していることを確認
2. release/general-release-integration ブランチを ops/recovery-program
   から作成
3. RCタグを作成（例: v-rc-YYYYMMDD、命名規則はFounderが決定）
4. タグ作成後、本文書9〜10節のBuild/Regression結果を再実行し、タグ時点の
   状態と一致することを確認（推奨）
```

**AIはRCタグ作成・ブランチ作成のいずれも自己判断で実施しない**
（自走ルールの絶対停止対象）。

---

## 15. Release手順（Founderが実施、AIは実施しない）

```
1. RCタグ作成後、Founder最終承認
2. 本番デプロイ（デプロイ手順は既存の運用フローに従う、本文書では規定しない）
3. デプロイ直後、5画面のFeature Flagが引き続きOFFのままであることを確認
   （デプロイ自体はFlag値を変更しない設計）
4. Founderが承認したスコープ・順序（PR_RELEASE_READINESS_05参照）に従い、
   Flagを段階的にON化
```

---

## 16. Release後監視項目

8節「Monitoring Plan」を参照。特に以下を優先:
```
1. Feature Flag ON化直後24時間のConsole Error / Sentryエラー率
2. Experiment開始操作の書込み成功率（唯一の書込み系画面）
3. Billing/Me画面のプラン表示不整合報告の有無
```

---

## 17. 障害時対応

```
1. 該当画面のFeature FlagをOFFへ戻す（7節「Rollback Plan」参照、
   最速の一次対応）
2. 影響範囲を確認（該当画面のみか、他画面・既存機能に波及していないか）
3. Console Error / Sentryログを収集し、AIへ調査を依頼する場合は
   本文書・該当PR文書（PR_*_RUNTIME_*.md）を参照情報として渡す
4. データ不整合が疑われる場合（Backfill関連等）は
   `PR_RELEASE_READINESS_04_BACKFILL_EXECUTION_PACK.md` 6節の
   ロールバック手順に従う
5. 復旧後、原因・対応内容をHANDOFFへ記録する
```

---

## Next

本PRはドキュメント整理・Build/Regression確認のみで完了。RCタグ作成・
Release実行・Beta公開はすべてFounder最終承認待ちで停止する。
次のアクションは11節・12節（Browser Verification / Backfill結果）への
Founder記入。
