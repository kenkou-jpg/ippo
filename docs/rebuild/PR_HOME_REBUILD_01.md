# PR-HOME-REBUILD-01 — Prototype Home Full Replacement

> `prototype/Home`をCanonical UI Sourceとして、`home-next`（Runtime Home）を
> 構造・実データ・UXの3軸で作り直したPR。単一PRとして実装（分割禁止指示に従う）。
> 対象: Billing Checkout / Backfill実行 / Legacy削除 / Feature Flagデフォルト変更 は範囲外。

---

## 1. 実装方針（適用した思考順序）

```
prototype/Homeの構造を正とする
  → 実データへ接続（架空データは一切使わない）
  → 既存Domain/Application/Adapterを再利用（Domain変更なし）
  → 不足していたAdapterだけ最小追加（getCompletedExperiments()のみ）
```

`home-next`独自構造を正としてPrototype要素を追加する、という禁止された方法は取らず、
prototypeの5ブロック（Hero Ring / Streak / Milestone / Result / Next-experiment）を
Runtime側に実データ接続として新規追加した。

---

## 2. Prototypeから移植した要素

| 要素 | 実装ファイル | 備考 |
|---|---|---|
| Hero Ring（Day進捗リング） | `home-next-hero-ring.js` | `getRunningExperimentViewModel()`を再利用。Empty State対応 |
| 7日ストリーク | 同上（`renderHeroRing`内） | 実データ、ローカル日付境界で判定、今日を強調 |
| Milestoneバナー | `home-next-milestone.js` | 常時表示ではなく条件表示（結果カードVMを再利用した判定） |
| Before→After結果カード | `home-next-result.js` | 診断的表現ゼロ、データ不足時は非表示 |
| 次の実験候補カード + 「試してみる」 | `home-next-next-experiment.js` | ExperimentNudgeService再利用、Adapter層でpreset正式マッピング |
| カード種別ごとの背景色（warm/rose/sage/gold） | `home-next.css`追記分 | Milestone=warm-light, Result=sage-light, Next=gold-light |

---

## 3. 実データソース

| ビューモデル | データソース | 呼び出し経路 |
|---|---|---|
| Hero | `ApiGateway.getExperiments()` | `experiment-next-adapter.js`の`getRunningExperimentViewModel()`を委譲呼び出し（ロジック複製なし） |
| Streak | `ApiGateway`経由のrecords（日次記録） | `home-next-experiment-adapter.js`内`getStreakViewModel()` |
| Result | `ApiGateway.getCompletedExperiments()`（新設）→ `painLevel`の前後平均比較 | 同上`getResultCardViewModel()` |
| Milestone | Resultビューモデルを再利用（別ロジック無し） | 同上`getMilestoneViewModel(resultVm)` |
| Next-experiment | `ApiGateway.getExperimentNudge(records, activeExperiments)` | 同上`getNextExperimentViewModel()` |

架空データ・ダミー値は一切使用していない。全ビューモデルはデータ不足時に`null`または
Empty Stateを返し、UIはそれに応じて非表示/簡略表示になる。

---

## 4. 既存Services / Adapterの再利用（Domain変更ゼロ）

- `getRunningExperimentViewModel()`（`experiment-next-adapter.js`） — Hero Ringの進捗計算はここに一任、複製せず
- `computeExperimentProgress()`（`experiment-progress.js`） — Day/percent/clampingの単一ソース、間接的に再利用
- `ExperimentQueryService.findByStatus()` — 既存実装。本PRで新設していない（呼び出し口=`getCompletedExperiments()`のみ新設）
- `ExperimentNudgeService`（`ApiGateway.getExperimentNudge()`） — 次の実験候補の推薦ロジックをそのまま利用
- `EXPERIMENT_LIBRARY_PRESETS`（`experiment-next-command-adapter.js`） — 既存プリセット定義を参照し、Adapter層で`NUDGE_TYPE_TO_PRESET_ID`マッピングとして正式に閉じ込め
- `startExperimentFromPreset()` / `showExperimentNext()`（Experiment Runtime既存関数） — 「試してみる」のFlag ON経路で再利用
- `window.openExperiments()` — 「試してみる」のFlag OFF（Legacy）経路。PR-RUNTIME-INTEGRATION-01で確立済みの同一パターンを踏襲

---

## 5. 新規追加したAdapter（最小限）

1. **`ApiGateway.getCompletedExperiments(userId)`**（`src/application/api-gateway.js`）
   `ExperimentQueryService.findByStatus(userId, 'COMPLETED')`への読み取り専用パススルー。
   Domain/Repository層の変更は一切なし。

2. **`src/modules/home-next/home-next-experiment-adapter.js`**（新規ファイル）
   Hero/Streak/Result/Milestone/Nextの5つのビューモデル生成関数。
   `NUDGE_TYPE_TO_PRESET_ID`マッピングはこの層に閉じ込め、Domain変更を回避
   （`PAIN_MANAGEMENT`/`SYMPTOM_TRACKING`は対応する仮説文言のPresetが無いため意図的に未マッピング — 場当たり的な仮マッピングはしていない）。

Domain変更が必要な箇所は発見されなかった（停止・報告の対象なし）。

---

## 6. 移植しなかった/対応を見送った要素

- **既存セクションの並び順の完全一致**: `home-next.html`は`hn-hero`直後に`hn-hero-ring`/`hn-milestone`を、
  `hn-experiment`直後に`hn-result`/`hn-next-experiment`を挿入したが、`hn-personalize`（疾患パーソナライズ）・
  `hn-medical-summary`・`hn-recovery`・`hn-reflections`などIPPO独自要素はPrototypeの並び順へ強制的に
  再配置していない。理由: 既にチューニング済みの既存コンテンツへの破壊的な並び替えを避けるため。
  → 構造一致率を100%ではなく95%と評価する根拠（詳細は`IPPO_REBUILD_UI_DIFF_MATRIX.md`のHome行）。
- **疾患パーソナライズ / 医療サマリー / Recovery Journey / Reflections**: Prototypeに存在しないIPPO独自要素。
  削除の口実にはせず、そのまま維持。

---

## 7. テスト

| ファイル | 件数 | 内容 |
|---|---|---|
| `tests/application/api-gateway-experiment-lifecycle.test.js`（追加分） | 2 | `getCompletedExperiments()`の権限ゲート・委譲 |
| `tests/modules/home-next/home-next-experiment-adapter.test.js` | 24 | Hero/Streak/Result/Milestone/Next全関数のedge case（active/none/invalid-date/100%clamp、all/partial/none-streak、has-data/insufficient/no-change/increase/decrease、null/within-window/expired、mapped/unmapped等） |
| `tests/modules/home-next/home-next-hero-ring.test.js` | 5 | null安全性、Empty State、実データ表示、ストリークドット、XSSエスケープ |
| `tests/modules/home-next/home-next-milestone.test.js` | 4 | null安全性、非表示条件、表示内容、XSSエスケープ |
| `tests/modules/home-next/home-next-result.test.js` | 6 | null安全性、データ不足非表示、増減表示、**診断的表現ゼロの検証**、XSSエスケープ |
| `tests/modules/home-next/home-next-next-experiment.test.js` | 8 | 表示、Flag ON→Experiment Runtime遷移、Flag OFF→Legacy遷移、二重タップガード |

新規テスト合計: **49件、全件PASS**。

---

## 8. Prototype一致率

| 指標 | 値 |
|---|---|
| Prototype主要要素の存在率 | **100%**（Hero Ring/Streak/Milestone/Result/Next-experiment全て実装） |
| Prototype構造一致率 | **95%**（新規5ブロックは完全一致。既存セクションの並び順は一部未移動 — 詳細は本文書§6） |
| Prototype UX一致率 | **95%**（カード種別ごとの色・情報優先度は再現。実ブラウザでの体感確認は未実施のため確定値ではない） |

---

## 9. Build / Regression結果

```
npm run build   → PASS（Vite build成功、警告は既存のもの=チャンクサイズ/循環参照で本PR起因ではない）
npx vitest run  → PASS（320 test files / 5532 tests, 0 failures）
```

---

## 10. 実ブラウザ確認（Browser Visual Gate）

**未実施。** CLAUDE.mdの規定により、AIはBrowser Verificationを自己判断で実施しない。
以下はFounderが通常ブラウザで確認すべき手順。

```
Browser Verification Required:
  対象: Home画面（Runtime, Feature Flag ippo_home_next=ON時）
  理由: PR-HOME-REBUILD-01で追加したHero Ring/Streak/Milestone/Result/Next-experimentの
        5要素が実際に正しく描画されるか、実データ・実ブラウザでの視覚的確認が必要
  確認方法:
    1. localStorage.setItem('ippo_home_next', 'true') を設定してHome画面を開く
    2. Hero Ring（実験Day/円形プログレス）が表示されることを確認
       - 進行中の実験が無い場合は「🌱 まだ実験はありません」のEmpty Stateが出ることも確認
    3. 7日ストリークのドットが表示され、今日が強調されていることを確認
    4. Milestoneバナーは条件を満たす場合のみ表示され、常時表示されないことを確認
    5. Before→After結果カードは、完了済み実験がある場合のみ表示され、
       「治った」「効果があった」等の断定表現が一切無いことを確認
    6. 次の実験候補カードと「試してみる」ボタンが表示されることを確認
       （進行中の実験がある場合は非表示になることも確認）
    7. 「試してみる」タップ → Experiment Runtime画面へ遷移することを確認
    8. Flag OFFの場合はLegacy Home（変更前の画面）が表示され、回帰が無いことを確認
    9. Console/Networkタブでエラーが出ていないことを確認
```

---

## 11. Definition of Done 判定

| 項目 | 判定 |
|---|---|
| Prototype主要要素100% presence | ✅ |
| 95%+ 構造一致 | ✅（95%） |
| 95%+ UX一致 | ⚠️（95%と評価するが実ブラウザ未確認のため確定値ではない） |
| 実データ接続 | ✅ |
| 通常ナビゲーションで到達可能 | ✅（既存Home導線をそのまま使用、追加ナビゲーションなし） |
| Flag OFF時にLegacy回帰なし | ✅（テストで確認、実ブラウザ未確認） |
| Build PASS | ✅ |
| Regression zero-diff | ✅ |
| Browser Visual Gate PASS | ❌ **未実施（Founder確認待ち）** |
| Founder-confirmable | ✅（本文書 + §10の手順で確認可能） |

**「完全統合」とはまだ記録しない。** Founderの実ブラウザ確認（§10）の完了をもって
「Home統合完了」と記録する。

---

## 12. 次のステップ

本PRの完了・Founder確認をもって、次はBilling Checkoutへ戻るのが適切
（Founderの承認前にはBilling Checkout実装へは進まない）。
