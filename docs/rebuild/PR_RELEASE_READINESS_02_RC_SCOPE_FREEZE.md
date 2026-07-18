# PR-RELEASE-READINESS-02: RC Scope Freeze & Founder Verification Pack

コード変更なし（ドキュメント整理のみ）。SSOT:
`docs/IMPLEMENTATION_PLAN_V1.md`（V1.1）・`docs/HANDOFF_PHASE7_COMPLETE.md`・
`AI_EXECUTION.md`・`docs/rebuild/PR_RELEASE_READINESS_01_INVENTORY.md`。

このPRの結果はAIが「確認済み」と判断するためのものではない。
すべてのBrowser Verificationは**Founder確認待ち**として終了する。

Build確認: `npm run build` PASS。テスト確認: フルスイート312ファイル中
309ファイルPASS（失敗3ファイル35件は`build-draft-from-ui.test.js`・
`save-record-screen.test.js`・`disease-analyzer.test.js`、
`record.service.js`のimport解決エラー等に起因する既知の事前失敗、
本セッションの変更と無関係、HANDOFFに記録済みのベースラインと一致）。

---

## 1. RC Scope Freeze

### RC対象（Founder確定）

| # | 機能 | 対象範囲 | 理由 |
|---|---|---|---|
| 1 | Home | `home-next`表示 + Prototype配色統合 | Runtime統合完了・BV待ちのみ |
| 2 | Record（現行） | 既存Record保存フロー（Legacy） | Phase 1で完了済み、正式なRead Source |
| 3 | Experiment | `experiment-next`表示 + 実験開始CTA | Runtime統合完了・BV待ちのみ。完了/中止/今日もOKは未接続だが、それらが無くても画面として成立する |
| 4 | Insights | `insights-next`表示 + 今週のハイライトRead接続 | Runtime統合完了・BV待ちのみ |
| 5 | Billing（Runtimeのみ） | `billing-next`表示 + 現在のプランRead接続 | 表示専用として完結。Checkout等の書込みは含まない |
| 6 | Me | `me-next`表示 + 現在のプランRead接続 | Runtime統合完了・BV待ちのみ |

### RC対象外（Founder確定）

| # | 項目 | 対象外の理由 | 扱い |
|---|---|---|---|
| 1 | ~~Consent UI新規設計~~ | ~~Prototypeに設計が存在しない（PR-ME-RUNTIME-01確認済み）~~ | **2026-07-18 Founder Decisionにより方針変更**: 新規UI再設計ではなく、既存`consent-service.js`（同意文言・レベル定義は無変更）をMe-nextへ再接続する形でRuntime実装済み。詳細: `LEGACY_SUNSET_COUNCIL.md` |
| 2 | Pattern Calendar統合 | Calendar/Record/Insight/Patternを横断する情報設計事項 | 現行`calendar-next.js`を無変更維持。**2026-07-18更新**: Founder Decision（`LEGACY_SUNSET_COUNCIL.md`）により、Insights画面内の「パターンカレンダー」UI（prototype由来の色分けグリッド、records実データから算出）はPR-FULL-INTEGRATION-03で実装済み。ただし`calendar-next.js`（Calendarタブの月相カレンダー）自体は無変更のまま、両者の統合・吸収という当初の横断的設計課題は未着手（スコープを分離して個別解決した） |
| 3 | Case/Similarity Runtime新規統合 | Phase 7、本セッション未着手 | General Release後 |
| 4 | Checkout接続 | Billing価格・商品構成が未確定 | `billing-next`は表示専用のまま。既存`startStripeCheckout()`（Legacy）は無変更で稼働継続 |
| 5 | Stripe商品変更 | Founder Decision必要 | 現行Stripe設定を無変更維持 |
| 6 | Premium価格変更 | **解消済み（2026-07-18 Founder Decision）**: ¥580/月・¥4,800/年を正式確定。過去記録の¥980/¥1,980は不採用 | 現行¥580/月・¥4,800/年のまま。Checkout接続自体は別途対応が必要（4番参照） |
| 7 | Subscription Migration | 対象商品構成が未確定なため実施不可 | 該当作業なし |

### Feature Flag対応状況

全5画面ともFeature Flag **デフォルトOFF**。RC作成時点でON/OFFの既定値は
変更しない（詳細は3節）。

---

## 2. Founder Browser Verification Pack

**この節はFounderが実施するための資料です。AIは実施しません。**
各画面のチェック結果は本ファイルへ直接書き込むか、コピーして記録して
ください。全項目チェック後、末尾のPass/Failに記入してください。

共通確認方法:
```
1. www.ippo-app.com（または該当プレビュー環境）を開く
2. Feature Flag OFF状態を先に確認（デフォルト状態、変化がないこと）
3. ブラウザConsoleで window.ippoXxxNext.preview() を実行しFeature Flag ON状態を確認
   （Xxxは画面ごとのnamespace、下記参照）
4. 確認後は window.ippoXxxNext.disable() でリロードし元の状態へ戻す
```

### 2-1. Home（`window.ippoHomeNext`）

- [ ] Feature Flag OFF: 既存Home画面の表示・挙動に変化がない
- [ ] Feature Flag ON: Home画面が表示される（Hero・Status・Insight・
      Experiment・Quick Record各カード）
- [ ] Heroカードが表示され、テキストが折り返し崩れしていない
- [ ] Insightカードがクリーム系の背景で表示される（Prototype配色）
- [ ] Experimentカードがrose系の淡い背景で表示される（データが無ければ
      非表示、正常挙動）
- [ ] カード間の余白・角丸が不自然に破綻していない
- [ ] 320px / 375px / 390px / 430px の4幅で表示崩れがない
- [ ] Navigation: 既存タブ構成に変化がない
- [ ] Runtime動作: `window.ippoHomeNext.isEnabled()`が正しく切り替わる
- [ ] Read動作: Insightカードに実データ（記録に応じた文言・confidence）が
      反映される
- [ ] Console Errorが0件
- [ ] UI崩れなし（総合）

**Home 総合判定: Pass / Fail**（いずれかに丸をつけてください）

参考文書: `docs/rebuild/PR_HOME_01_RUNTIME_INTEGRATION_PLAN.md` 10節

### 2-2. Experiment（`window.ippoExperimentNext`）

- [ ] Feature Flag OFF: 既存Experiment関連の挙動に変化がない
- [ ] Feature Flag ON: Experiment画面が表示される（進行中の実験セクション・
      実験ライブラリ）
- [ ] 進行中の実験が無い場合、ライブラリのみ表示される（正常挙動）
- [ ] 実験ライブラリの「試す」を押せる
- [ ] 実験開始後、進行中カードへ反映される
- [ ] Day 1表示が出る（進捗リング）
- [ ] リロード後もACTIVE状態が維持される
- [ ] 二重クリックで重複実験が作られない
- [ ] 「今日もOK」ボタンは押せない（disabled、書込み未接続でよい）
- [ ] 320px / 375px / 390px / 430px の4幅で表示崩れがない
- [ ] Home / Recordへ戻れる
- [ ] Console Errorが0件
- [ ] UI崩れなし（総合）

**Experiment 総合判定: Pass / Fail**

参考文書: `docs/rebuild/PR_EXP_RUNTIME_06_START_CTA.md`

### 2-3. Insights（`window.ippoInsightsNext`）

- [ ] Feature Flag OFF: 既存Insights画面の挙動に変化がない
- [ ] Feature Flag ON: Insights画面が表示される
- [ ] 「今週のハイライト」カードにテキストが表示される（記録が少ない場合は
      定型文が表示されれば正常）
- [ ] 記録が一定数ある場合、confidence-row（ドット+タグ）が表示される
- [ ] 「実験結果サマリー」は非表示のままである（現時点で正常挙動）
- [ ] 「周期との重なりグラフ」がPremium-lockedな静的表示で見える
- [ ] パターンカレンダーは存在しない（意図的、Founder Decisionにより対象外）
- [ ] 320px / 375px / 390px / 430px の4幅で表示崩れがない
- [ ] Console Errorが0件
- [ ] UI崩れなし（総合）

**Insights 総合判定: Pass / Fail**

参考文書: `docs/rebuild/PR_INSIGHTS_RUNTIME_03_04_ADAPTER_AND_READ.md`

### 2-4. Billing（`window.ippoBillingNext`）

- [ ] Feature Flag OFF: 既存Premium/Pro導線（`premiumGate`経由のロック画面・
      pro-hub等）・既存Checkoutの挙動に変化がない
- [ ] Feature Flag ON: Billing画面が表示される
- [ ] ヘッダー直下に「現在のプラン: Free」（または実際のプラン）が表示される
- [ ] PremiumとProの役割が明確に区別されている（Premium=「自分の体を
      もっと深く理解する」、Pro=「改善実験を進める」）
- [ ] 「Premiumを見る」「Proを見る」を押すと詳細モーダルが開く
- [ ] モーダル内のCTA（「Premiumにする」「Proにする」）が押せない
      （準備中と明示）
- [ ] 「あとで」で安全にモーダルが閉じる
- [ ] 押し売り感がないトーン（Prototypeのコピーそのまま）
- [ ] Checkoutが未接続であることが誤解なく表現されている
- [ ] 320px / 375px / 390px / 430px の4幅で表示崩れがない
- [ ] Console Errorが0件
- [ ] UI崩れなし（総合）

**Billing 総合判定: Pass / Fail**

参考文書: `docs/rebuild/PR_BILLING_RUNTIME_03_04_ADAPTER_AND_READ.md`

### 2-5. Me（`window.ippoMeNext`）

- [ ] Feature Flag OFF: 既存設定画面（研究協力トグル含む）の挙動に変化がない
- [ ] Feature Flag ON: Me画面が表示される
- [ ] 「現在のプラン: Free」（または実際のプラン）が表示される
- [ ] タップでBilling画面（Premium/Pro）へ遷移する
- [ ] プライバシーカード（「あなたの記録は、あなただけが見られます」）が
      表示される
- [ ] 設定リスト5行が表示される（クリックしても何も起きなくて正常）
- [ ] 320px / 375px / 390px / 430px の4幅で表示崩れがない
- [ ] Console Errorが0件
- [ ] UI崩れなし（総合）

**Me 総合判定: Pass / Fail**

参考文書: `docs/rebuild/PR_ME_RUNTIME_03_04_ADAPTER_AND_READ.md`

### 2-6. 総合結果（Founder記入欄）

| 画面 | Pass/Fail | 確認日 | 備考 |
|---|---|---|---|
| Home | ☐ Pass ☐ Fail | | |
| Experiment | ☐ Pass ☐ Fail | | |
| Insights | ☐ Pass ☐ Fail | | |
| Billing | ☐ Pass ☐ Fail | | |
| Me | ☐ Pass ☐ Fail | | |

**5画面すべてPassした時点でHANDOFFへ反映し、各画面の本番既定化検討へ進む。**
**Failした画面がある場合は該当箇所を修正PRとして起票する。**

---

## 3. Feature Flag一覧

| Flag | 現在値 | 対象画面 | 既定 | ON条件 | OFF条件 | 本番切替タイミング |
|---|---|---|---|---|---|---|
| `ippo_home_next` | OFF | Home | OFF | `window.ippoHomeNext.enable()`または`localStorage.setItem('ippo_home_next','1')` | `.disable()`またはキー削除 | Home BV Pass後、Founder承認を経て既定ON化 |
| `ippo_experiment_ui_v2` | OFF | Experiment | OFF | `window.ippoExperimentNext.enable()` | `.disable()` | Experiment BV Pass後、Founder承認を経て既定ON化 |
| `ippo_insights_ui_v2` | OFF | Insights | OFF | `window.ippoInsightsNext.enable()` | `.disable()` | Insights BV Pass後、Founder承認を経て既定ON化 |
| `ippo_billing_ui_v2` | OFF | Billing | OFF | `window.ippoBillingNext.enable()` | `.disable()` | Billing BV Pass後。ただしCheckout接続はRC対象外のため、既定ON化してもCheckout機能は追加されない（表示のみ） |
| `ippo_me_ui_v2` | OFF | Me | OFF | `window.ippoMeNext.enable()` | `.disable()` | Me BV Pass後、Founder承認を経て既定ON化 |

すべて`localStorage`キー。**RC作成時点ではいずれも既定値変更なし**
（「Feature Flag既定変更」は自走ルールの停止対象）。既定ON化はBrowser
Verification Pass後、別途Founder承認を得てから実施する。

**追記（2026-07-17、PR-FEATUREFLAG-01）**: `ippo_home_next`の実装が
opt-out（既定ON）になっていた不整合を修正し、上表通りのopt-in（既定OFF）へ
統一済み。「既定値変更なし」の原則自体は維持（今回の修正は「誤って既定ONに
なっていたものを、本来の既定OFFへ戻した」ものであり、新規に既定ONへ変更した
ものではない）。詳細: `docs/HANDOFF_PHASE7_COMPLETE.md` PR-FEATUREFLAG-01エントリ、
`docs/rebuild/PR_RELEASE_READINESS_03_BROWSER_VERIFICATION_GUIDE.md` 0節。

---

## 4. Legacy一覧

### 削除禁止（RC後も維持、代替方針が別途必要）

| Legacy資産 | 理由 |
|---|---|
| `src/services/consent-service.js` + `app.html`内Consent UI | Prototype v2まで唯一のConsent実装。削除するとResearch Consent機能が失われる |
| `src/modules/calendar-next.js` | Pattern Calendar統合が保留中のため、Calendarタブの唯一の実装 |
| `src/modules/premium/premium-lock.js`（`premiumGate()`） | 現行Premium機能ゲートの唯一の実装。多数の機能から呼ばれる |
| `src/services/stripe.js`（`startStripeCheckout()`） | 唯一の稼働中Checkout実装。Checkout接続がRC対象外のため代替が存在しない |
| `src/modules/experiments.js` | `state.experiments`を直接操作する唯一の稼働中実装。Experiment CommandServiceは実験開始のみ対応のため、完了/中止等はこちらに依存したまま |

### 削除予定（対応するnext画面がBV Pass・本番既定化された後）

| Legacy資産 | 削除条件 |
|---|---|
| `src/screens/home.html`相当（Legacy Home描画パス） | Home BV Pass + `ippo_home_next`既定ON化 + 一定期間のRollback猶予後 |
| `src/screens/insights.html`（Legacy Insights） | Insights BV Pass + `ippo_insights_ui_v2`既定ON化後。ただし`insights-dynamic-renderer.js`（`resolveMainInsight()`）はSSOTのため削除しない、next側も引き続き参照する |
| `src/screens/pro-feature.html`/`pro-hub.html` | Billing BV Pass + 本番既定化後。ただしCheckout機能は`billing-next`に無いため、Checkout接続PRが別途完了するまでは削除不可（実質General Release後） |

### General Release後（今回のRCでは判断しない）

| 項目 | 備考 |
|---|---|
| Pattern Calendar吸収・新設・廃止 | Founder Decision保留中 |
| Case/Similarity Legacy | Phase 7未着手のため対象外 |
| `src/app-legacy.js`全体の依存整理 | 1,917行、詳細な依存グラフ調査は本棚卸しの範囲外 |
| `ExperimentNudgeService`（未接続） | Home Experiment Cardの代替候補、統合方針は未検討 |
| `ConsentRepositoryImpl`（DI登録済み未接続） | Prototype v2再設計時に検討 |

---

## 5. Founder Decision一覧（未決定のみ）

| # | 項目 | 内訳 | 詳細 |
|---|---|---|---|
| 1 | ~~Premium価格~~ | ~~月額/年額の確定額~~ | **解消済み（2026-07-18）**: ¥580/月・¥4,800/年を正式確定 |
| 2 | Pro価格 | Premium/Proを別価格にするか | 現状単一商品（Stripe Price 1種類のみ） |
| 3 | Checkout | 本番接続タイミング | `billing-next`のCTAは現状disabled固定 |
| 4 | Trial | 無料試用の有無 | 現行実装に該当機能なし |
| 5 | Subscription Migration | 既存有料ユーザー（現行'pro'相当）の新tier体系への移行方法 | Premium/Pro分割が決まった場合のみ発生 |
| 6 | Premium/Pro機能境界 | Premiumに何を含め、Proに何を含めるか | Prototypeのモーダルはヒント程度の項目リストのみで確定仕様ではない |

詳細は`docs/rebuild/PR_BILLING_RUNTIME_01_CURRENT_STATE.md` 11節。

**Consent UIは決定済み**（現行維持、Prototype v2以降）のため本一覧から除外
——**2026-07-18 Founder Decisionにより方針変更**: Prototype v2再設計を
待たず、Runtime正式版（Me-next）の一部としてResearch Consent UIを実装
した。詳細: `docs/rebuild/LEGACY_SUNSET_COUNCIL.md`。

---

## 6. Release Blocker一覧（重要度分類）

| 重要度 | 項目 | 理由 |
|---|---|---|
| **Critical** | Home/Experiment/Insights/Billing/MeのFounder Browser Verification（5件） | BV Passなしに本番既定化判断ができない。RC作成の前提条件 |
| **Critical** | PR-REC-06c（バックフィルスクリプト実行） | Founder操作待ち（AI環境にSupabase接続情報なし）。Record Phase 1完了の残タスク |
| **High** | PR-REC-06b（リトライ機構のBV要否判断） | Founder判断待ち。必須ではないが未判定のまま |
| **Medium** | Billing価格・商品構成の確定 | RC作成自体は妨げないが、Billing機能を最終公開する場合は必要 |
| **Low** | Phase 7（Case/Similarity）の現状確認 | 本セッション未着手。今回のRC対象（Home/Record/Experiment/Insights/Billing/Me）には含まれないため、RC作成自体への影響はLow |

**Pattern CalendarとConsent UIはBlockerではない**（Founder Decision確定済み、
4節参照）。

---

## 7. PR-REC-06b / 06c

### PR-REC-06b（リトライ機構）

- **内容**: オフライン→オンライン復帰後の自動再送動作
- **状態**: 実装完了済み
- **Browser Verification要否**: **Founder判断待ち**（必須ではない）
- **次のアクション**: Founderが要否を判断。不要と判断されればRC Blocker
  から除外可能

### PR-REC-06c（バックフィルスクリプト）

- **内容**: `scripts/backfill-normalized-records.ts`。legacy
  `user_records`全行を正規化テーブルへ反映
- **状態**: コード完了済み・未実行
- **実行手順**:
  1. **Dry Run**: `SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY`を設定して
     dry-run実行（`--apply`なし）
  2. **出力確認**: サマリー（total/succeeded/skipped/failed）を確認
  3. **本実行**: 問題なければ`--apply`付きで実行
- **ロールバック**: 冪等性は`upsert_record_with_children` RPC（UNIQUE制約
  前提）により担保される。誤実行時も同じrecordへのupsertとなるため、
  正規化テーブル側の該当行を手動削除すれば実質的にロールバック可能
  （legacy `user_records`は変更しないため、Read Sourceへの影響はない）
- **確認項目**:
  - [ ] Dry Run実行、出力のtotal/succeeded/skipped/failedを確認
  - [ ] skipped/failedの内容が想定範囲内であることを確認
  - [ ] 本実行（`--apply`）
  - [ ] 本実行後、正規化テーブルの件数がlegacy `user_records`と整合することを確認
  - [ ] Migration 20260093/20260094/20260095が本番適用済みであることを再確認
- **前提条件**: 実行前に20260093/20260094/20260095すべてのMigration適用が
  必要（適用済みと記録されているが、実行直前に再確認推奨）
- **AI実行不可の理由**: AI環境にSupabase接続情報（`SUPABASE_URL`/
  `SUPABASE_SERVICE_ROLE_KEY`）が存在しないため、技術的に実行不可

---

## 8. RCチェックリスト

Release Candidate作成前に必要な項目のみ。

```
□ Home Browser Verification: Pass
□ Experiment Browser Verification: Pass
□ Insights Browser Verification: Pass
□ Billing Browser Verification: Pass
□ Me Browser Verification: Pass
□ PR-REC-06c: Dry Run実行・出力確認・本実行完了
□ PR-REC-06b: Browser Verification要否をFounderが判断（実施 or 不要と確定）
□ 5画面のBV結果がすべてPassの場合、本番既定化するFeature Flagの
  スコープをFounderが確定（一括ONにするか、段階的にするか）
□ 全テストスイート再実行・PASS確認（既知の3ファイル35件を除く）
□ Production Build確認
□ Architecture Guard確認
□ Console Error 0件（全対象画面）
```

上記すべて完了後、`ops/recovery-program` →
`release/general-release-integration` ブランチ作成へ進む
（Founder最終承認が必要、本PRでは実施しない）。

---

## Next

本PRはドキュメント整理のみで完了。次のアクションはすべてFounder確認・
判断待ち（2節のBrowser Verification、7節のPR-REC-06b/06c、5節の
Founder Decision）。AIからの追加提案・自走実装は、これらの結果が届く
まで停止する。
