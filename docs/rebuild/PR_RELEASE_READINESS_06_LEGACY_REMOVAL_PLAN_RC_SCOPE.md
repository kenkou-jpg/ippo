# PR-RELEASE-READINESS-06: Legacy Removal Plan（RC Scope）

コード変更なし（ドキュメント整理のみ）。**削除は本PRでは一切行わない。**
SSOT: `docs/rebuild/PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 4節・
`docs/rebuild/PR_RELEASE_READINESS_01_INVENTORY.md` 4節。

**スコープの区別**: 本文書は今回の5画面Runtime統合（Home/Experiment/
Insights/Billing/Me）に直接関わるLegacy資産のみを対象とする。
`app-legacy.js`（10,804行）全体の解体計画は別文書
`docs/LEGACY_REMOVAL_PLAN.md`（IPPO-LEGACY-001、PR-079〜090）が管轄しており、
本文書はそれを変更・代替しない。両者はスコープが異なる
（本文書 = next画面切替に伴うLegacy退役、`LEGACY_REMOVAL_PLAN.md` =
app-legacy.js責務分解）。

---

## 1. 分類

### 1-A. 削除可能（今すぐ承認可能）

```
該当なし。
```

RC対象5画面はいずれもFeature Flag OFFかつBrowser Verification未実施の
段階であり、next側への切替が確定していない。next/legacyが並存する
Strangler-Figパターンの途中段階のため、現時点で無条件に削除可能な資産は
存在しない。

### 1-B. 削除保留（構造的に依存あり、削除条件が成立しない）

| Legacy資産 | 保留理由 | 解除条件 |
|---|---|---|
| `src/services/consent-service.js` + `app.html`内Consent UI | Prototypeに設計が存在せず、唯一のResearch Consent実装 | Prototype v2で新規Consent UI設計が確定するまで（Founder Decisionにより現行維持が確定済み、General Release後の独立検討） |
| `src/modules/calendar-next.js` | Pattern Calendar統合方針が保留中で、Calendarタブの唯一の実装 | Pattern Calendar吸収・新設・廃止のFounder Decision確定後（General Release後） |
| `src/modules/premium/premium-lock.js`（`premiumGate()`） | 現行Premium機能ゲートの唯一の実装、多数の機能から呼び出される | Billing/Me next画面が本番既定化され、既存のゲート呼び出し元が全てnext経由へ置き換わった後 |
| `src/services/stripe.js`（`startStripeCheckout()`） | 唯一の稼働中Checkout実装。`billing-next`は表示専用でCheckout非接続 | Checkout接続PR（RC対象外、Billing価格Founder Decision確定後に着手）完了後 |
| `src/modules/experiments.js` | `state.experiments`（`ippo_state.experiments`）を直接操作する唯一の稼働中実装。完了/中止操作はこちらに依存 | ExperimentCommandServiceが実験の完了/中止/継続確認まで対応した後（RC対象外、現時点では実験開始のみ接続） |

### 1-C. 削除予定（BV Pass + 本番既定化後、対応するnext側が完全代替した時点）

| Legacy資産 | 削除条件 | 備考 |
|---|---|---|
| `src/screens/home.html`相当（Legacy Home描画パス） | Home BV Pass + `ippo_home_next`既定ON化 + 一定期間のRollback猶予後 | Rollback猶予期間の長さはFounderが本番既定化時に確定 |
| `src/screens/insights.html`（Legacy Insights） | Insights BV Pass + `ippo_insights_ui_v2`既定ON化後 | `insights-dynamic-renderer.js`（`resolveMainInsight()`）はSSOTのため**削除しない**。next側も引き続き参照するため本項目には含まれない |
| `src/screens/pro-feature.html`/`pro-hub.html` | Billing BV Pass + 本番既定化後 | Checkout機能が`billing-next`に無いため、Checkout接続PR（RC対象外）が別途完了するまでは実質削除不可。**実質General Release後** |

### 1-D. General Release後（今回のRCでは判断しない）

| 項目 | 備考 |
|---|---|
| Pattern Calendar吸収・新設・廃止 | Founder Decision保留中（1-B節`calendar-next.js`と同一論点） |
| Case/Similarity Legacy | Phase 7未着手のためRC対象外 |
| `src/app-legacy.js`全体の依存整理 | `docs/LEGACY_REMOVAL_PLAN.md`（IPPO-LEGACY-001）が別途管轄、本文書のスコープ外 |
| `ExperimentNudgeService`（未接続） | Home Experiment Cardの代替候補、統合方針は未検討 |
| `ConsentRepositoryImpl`（DI登録済み未接続） | Prototype v2再設計時に検討（1-B節Consent UIと同一論点） |

---

## 2. 削除順（1-Cのみ、削除可能になった場合の推奨順序）

```
1. src/screens/home.html相当（Legacy Home描画パス）
   理由: 読み取り専用画面、書込み依存がなく最も安全

2. src/screens/insights.html（Legacy Insights）
   理由: 読み取り専用画面。ただしresolveMainInsight()はSSOTとして
   削除対象から除外することを毎回確認する

3. src/screens/pro-feature.html / pro-hub.html
   理由: Checkout接続PR完了が前提のため最後。実質General Release後
```

1-B（削除保留）の資産は本RCでは削除順の対象に含めない
（解除条件がRC範囲外のFounder Decisionに依存するため）。

---

## 3. ロールバック方法（1-C削除実施後、問題が発覚した場合）

```
1. 削除PRをgit revertする（Strangler-Fig方式のため、legacy側コードは
   削除PRのコミット履歴上に残っており、revertで即座に復元可能）
2. revert後、該当Feature Flag（例: ippo_home_next）を再度OFFへ戻す
   ことで、next側の問題を切り離しつつlegacy側の動作を復元する
3. Service Worker配信環境の場合、キャッシュされた新バージョンの
   JS/HTMLが残っていると復元が反映されないことがある（PR-092系で
   確認済みのgotcha）。ロールバック後に反映されない報告があれば、
   まずSWキャッシュのバージョニング・強制更新を確認する
4. 「一定期間のRollback猶予」を設ける場合、猶予期間中は削除PRを
   マージせず、Feature Flag既定ON化のみで運用し、legacy側コードは
   物理削除しない（コードは残したまま、既定値のみ切り替える）という
   運用も選択肢に含める
```

---

## 4. 削除後確認項目（1-C各項目、削除PRマージ後）

```
□ 対象画面が本番でnext版のみで正常表示されることを再確認
  （Console Errorなし、UI崩れなし）
□ 削除したlegacy関数・要素を参照する`window.*`呼び出しが他に残って
  いないか（grep範囲は削除対象ファイルへの直接参照のみに限定し、
  広範囲探索は行わない）
□ 全テストスイート実行、削除に伴う新規失敗がないことを確認
  （既知失敗3ファイル35件は許容、新規失敗はゼロであること）
□ Production Build成功を再確認
□ Architecture Guard確認（該当する場合）
□ 削除後、該当Feature Flagの`isXxxNextEnabled()`分岐自体が不要に
  なる場合は、Flag判定コードの整理を別PRとして検討する
  （本削除PRのスコープには含めない）
```

---

## 5. 削除対象ファイル一覧（1-Cのみ、現時点の見立て）

| ファイル | カテゴリ | 状態 |
|---|---|---|
| `src/screens/home.html`相当（Legacy Home描画パス） | 削除予定 | BV Pass待ち |
| `src/screens/insights.html` | 削除予定 | BV Pass待ち（`insights-dynamic-renderer.js`は除外） |
| `src/screens/pro-feature.html` | 削除予定 | Checkout接続PR完了待ち |
| `src/screens/pro-hub.html` | 削除予定 | Checkout接続PR完了待ち |

1-B（削除保留）・1-D（General Release後）の資産は「削除対象ファイル」
としては現時点でリストに含めない（削除条件が成立していないため）。

---

## Next

本PRはドキュメント整理のみで完了。削除の実施はいずれもBrowser Verification
Pass・本番既定化・（Billingのみ）Checkout接続PR完了が前提であり、
すべてFounder確認・判断待ち。次のアクションは
`PR_RELEASE_READINESS_03_BROWSER_VERIFICATION_GUIDE.md`の結果を待つこと。
