# PR-RELEASE-READINESS-01: General Release Readiness棚卸し

コード変更なし（棚卸しのみ）。IMPLEMENTATION_PLAN_V1.1・本セッションの
`docs/rebuild/PR_*_RUNTIME_*.md`群・HANDOFFを突き合わせて作成。

Founder Decision（今回）: **Consent Runtime = 新規UIは作らず現行Consent UI
を維持、再設計はPrototype v2で行う。ConsentはRelease Blockerにしない。**

---

## 1. Runtime統合済み画面一覧

`Prototype UI → Runtime → Application Facade → Domain` という統一
アーキテクチャで、5画面が同じパターンで統合済み。

| 画面 | Feature Flag | Adapter | 接続先 | 書込み | 状態 |
|---|---|---|---|---|---|
| Home（`home-next`） | `ippo_home_next` | `home-next-insights.js`等 | `window.ippoInsightEngine`等の既存Runtime | なし | 表示統合済み、Prototype配色統合済み（PR-HOME-06） |
| Experiment（`experiment-next`） | `ippo_experiment_ui_v2` | `experiment-next-adapter.js`（read）+ `experiment-next-command-adapter.js`（write） | `window.app.api`→ApiGateway→ExperimentCommandService→ExperimentLifecycleService→Repository | **あり**（実験開始のみ。完了/中止/今日もOKは未接続） | 実験開始CTA接続済み（PR-EXP-RUNTIME-06） |
| Insights（`insights-next`） | `ippo_insights_ui_v2` | `insights-next-adapter.js` | `window.app.api.getRecords()`→ApiGateway | なし | 今週のハイライトのみ接続。Pattern Calendarは意図的に未着手 |
| Billing（`billing-next`） | `ippo_billing_ui_v2` | `billing-next-adapter.js` | `premium-service.js`（既存Application Facade、ApiGateway経由ではない） | なし | 現在のプラン表示のみ。Checkout未接続 |
| Me（`me-next`） | `ippo_me_ui_v2` | `me-next-adapter.js`（`billing-next-adapter.js`を再利用） | `premium-service.js`（billing-next経由） | なし | 現在のプラン+billing-next遷移導線のみ。プロフィール名未接続 |

いずれも**Feature Flag デフォルトOFF**、到達手段は`window.ippoXxxNext.preview()`
のみ（Navigation変更なし）。**本番既定化・旧UI削除は5画面すべて未実施**
（Founder Browser Verification後の次段階）。

Home以外の4画面（Experiment/Insights/Billing/Me）は今セッションで
ゼロから追加した新規スクリーンモジュール。Homeのみ既存の
`home-next`（PR-092〜PR-P2系で以前から段階構築済み）に対する追加接続。

## 2. Feature Flag一覧

| Flag | 画面 | デフォルト |
|---|---|---|
| `ippo_home_next` | Home | OFF |
| `ippo_experiment_ui_v2` | Experiment | OFF |
| `ippo_insights_ui_v2` | Insights | OFF |
| `ippo_billing_ui_v2` | Billing | OFF |
| `ippo_me_ui_v2` | Me | OFF |

すべて`localStorage`キー。既存のFeature Flag Registryは存在せず、各画面が
`isXxxNextEnabled()`を個別に持つ（Home以降一貫した命名パターン）。
RC固定時の「Feature Flag棚卸し」で、本番既定化するものと廃止するものを
確定する必要がある。

**追記（2026-07-17、PR-FEATUREFLAG-01）**: 上表は本来の意図通り5画面とも
opt-in（`flag==='1'`の場合のみ有効・既定OFF）である。ただし2026-07-17の
Runtime Switch監査で、実装上`ippo_home_next`のみopt-out（既定ON）になって
いたことが判明し、同日中に他4画面と同じopt-inパターンへ修正済み。詳細:
`docs/HANDOFF_PHASE7_COMPLETE.md` PR-FEATUREFLAG-01エントリ。

## 3. Browser Verification一覧

**未実施（5件、Founder確認待ち）**。今回の方針により、RC作成前に
まとめて一括実施する。

1. Home（PR-HOME-02 Hero再接続 + PR-HOME-06 配色統合）
2. Experiment（PR-EXP-RUNTIME-02〜06、実験開始CTA含む）
3. Insights（PR-INSIGHTS-RUNTIME-02〜04）
4. Billing（PR-BILLING-RUNTIME-02〜04）
5. Me（PR-ME-RUNTIME-02〜04）

各画面の詳細手順は対応する`docs/rebuild/PR_*_RUNTIME_*.md`に記載済み
（320/375/390/430px・Console Error 0件が共通確認項目）。

## 4. Legacy依存一覧

Runtime統合先の既存資産（削除・退役はまだ判断していない、参考情報）。

| Legacy資産 | 規模 | 依存元 | 備考 |
|---|---|---|---|
| `app.html`（インライン画面群） | 1,262行 | 既存Navigation全体 | Consent UI（研究協力トグル）もここに存在 |
| `src/app-legacy.js` | 1,917行 | 多数のwindow関数 | 未調査の広範な依存グラフ、本棚卸しでは詳細化していない |
| `src/screens/insights.html`（legacy） | 1,205行 | 既存Insightsタブ | `insights-dynamic-renderer.js`（534行）を共有ロジックとして参照（`resolveMainInsight()`はlegacy/next共通SSOT化済み） |
| `src/modules/experiments.js` | 707行 | `premiumGate`経由の複数呼び出し元 | `state.experiments`を直接操作、正ドメイン（ExperimentRepository）とは別データ経路（ただし同一storage keyのため実データは共有） |
| `src/modules/premium/premium-lock.js` | 164行 | `premiumGate()`が多数の機能ゲートで使用 | 稼働中、無変更 |
| `src/services/stripe.js` | 165行 | `startStripeCheckout()`が本番稼働中 | 無変更、billing-nextは未接続 |
| `src/screens/pro-feature.html`/`pro-hub.html` | — | 既存Premium/Pro画面 | billing-nextと役割重複、退役判断は未実施 |
| `src/modules/calendar-next.js` | — | Calendarタブ | Pattern Calendar統合の対象だが**Founder Decisionにより現状維持**（吸収・廃止いずれも保留） |
| ApiGateway未接続の「正」ドメイン | — | — | `ExperimentNudgeService`（Home experiment card代替候補、未接続のまま）、`ConsentRepositoryImpl`（DI登録済み未接続） |

## 5. 未解決Founder Decision一覧

| # | 項目 | 状態 | 詳細 |
|---|---|---|---|
| 1 | Billing価格・商品構成 | **未解決** | 実コード¥580/月・¥4,800/年（単一商品） vs 過去記録¥980/¥1,980の不一致。Premium/Pro分割可否・機能境界・既存有料ユーザー移行・Trial有無・Checkout本番接続タイミング。`docs/rebuild/PR_BILLING_RUNTIME_01_CURRENT_STATE.md` 11節 |
| 2 | Pattern Calendar方針 | **保留（確定）** | Calendar/Record/Insight/Patternを横断する情報設計事項。吸収・新設・廃止いずれもGeneral Release後の独立PR。現状維持で確定 |
| 3 | Research Consent UI設計 | **解消（今回のFounder Decision）** | 新規UIは作らず現行維持、Prototype v2で再設計。Release Blockerではない |
| 4 | ApiGateway到達手段（`window.app.api`） | **解消済み**（PR-APP-BOOT-01） | 参考: 過去の未解決事項、今は解決済み |
| 5 | Experiment状態機械の権威 | **解消済み**（PR-EXP-RUNTIME-03/04 Founder Decision） | 参考: ExperimentLifecycleServiceを正として確定済み |

## 6. Release Blocker一覧

Consent除外・Pattern Calendar保留を踏まえた、現時点の真のBlocker:

```
必須（RC作成前）:
  □ Home/Experiment/Insights/Billing/Me の Founder Browser Verification
    （5件、一括実施予定）
  □ Browser Verification結果を受けた各画面の本番既定化 or 修正判断
  □ PR-REC-06c（バックフィルスクリプト）の実行 — Founder操作待ち
    （AI環境にSupabase接続情報なし）
  □ PR-REC-06b（リトライ機構）の実機確認要否のFounder判断

Blockerではない（確定済み）:
  ✓ Consent UI再設計 — 現行維持、Prototype v2以降
  ✓ Pattern Calendar統合 — General Release後の独立PR
  ✓ Billing価格確定 — 未解決だがCheckout自体が現状未接続のため、
    Checkout接続を伴わないRC作成自体は妨げない
    （ただし「Billing Runtime統合済み」を最終公開機能として謳う場合は
    別途価格確定が必要）

未着手・要現状確認:
  □ Phase 7（Case/Similarity）— 本セッションでは未着手。
    IMPLEMENTATION_PLAN_V1.1の完全なPhase順序に含まれるが、
    今回のBrowser Verification対象5画面には含まれていない。
    RC範囲に含めるか、後続フェーズとして分離するかはFounder確認が必要
```

## 7. RCに必要な残PR一覧（現時点の見立て）

```
Phase 1 (Record):
  - PR-REC-06c 実行（Founder操作）
  - PR-REC-06b BV要否判断（Founder）

Phase 2〜6 (Home/Experiment/Insights/Billing/Me):
  - Founder Browser Verification（5画面、一括）
  - BV結果を受けた本番既定化 or 修正PR
  - （既定化後）旧UI・Temporary Bridge退役PR

Phase 7 (Case/Similarity):
  - 現状確認PR（未着手、RUNTIME-01相当）— スコープにするか要確認

Release Candidate:
  - ops/recovery-program → release/general-release-integration ブランチ作成
  - Release Gate一括検証（全テスト・Architecture Guard・Production Build/
    Preview・全画面BV・Console Error 0・Feature Flag棚卸し・
    Migration状態確認・Rollback確認）
```

---

## 総括

本セッションで、Home・Experiment・Insights・Billing・Meの5画面が
`Prototype → Runtime → Application Facade → Domain`という統一
アーキテクチャで揃った。実装フェーズの重心は「画面追加」から
「リリース準備」へ移った、というFounder評価のとおりと考える。

残る作業は主に**Founder確認・判断待ち**（Browser Verification 5件、
Billing価格、PR-REC-06b/06c）であり、AI側の自走実装で埋められる範囲は
現時点でほぼ尽きている。Phase 7（Case/Similarity）の現状確認PRのみ、
Founderの意向次第で追加の自走余地がある。
