# IPPO REBUILD — DEFINITION OF DONE

> 「ippo-rebuild完全統合」と呼ぶための完了条件。`IPPO_REBUILD_FULL_INTEGRATION_SPEC.md`
> ①の定義を、チェックリストとして実装可能なレベルまで分解したもの。
> **「技術的に接続されている」ではなく、「Founderが実機を開いた瞬間にippo-rebuildだと
> 感じられる」ことを最終基準とする。**

---

## 画面共通の完了条件（5画面すべてに適用）

```
□ Feature Flag ONで、DIFF_MATRIXの「MVP必須」要素がすべて画面上に存在する
□ 上記要素が固定文言・ダミーDay数ではなく、実データ（または正しい空状態の
  定型文）で描画される
□ Feature Flag OFFで、既存Legacy画面の挙動に一切影響がない
  （回帰確認: 既存の関連Unit Testに新規失敗ゼロ）
□ 通常のタップ操作のみ（コンソール操作なし）で、Feature Flag ON状態の
  当該画面のMVP必須要素へ到達できる
□ 320/375/390/430pxでレイアウト崩れがない
□ Console Errorが0件
□ 新規追加箇所にUnit Testが追加されている
□ npm run build が PASS
□ npm test でフルスイート新規失敗ゼロ
```

---

## 画面別の完了条件

### Home（PR-FULL-INTEGRATION-05）

```
□ Hero Ring（実験Day進捗）が実データ（進行中の実験の実際の日数）で表示される
□ 実験が無い場合、Ringは「まだ実験はありません」等の空状態表示になる
  （Prototypeの空状態と同等の文言）
□ 7日ストリークが実際の記録日数から算出される
□ Before→After結果カードが、完了した実験の実データから生成される
  （実験が無ければ非表示、Prototype同様の空状態設計）
□ 次の実験候補カードが表示され、「試してみる」を押すとExperiment開始フロー
  （PR-FULL-INTEGRATION-02で実装した経路）へ接続される
□ Milestoneバナーが実験完了イベント発生時に表示される
□ 既存の疾患パーソナライズ・医療サマリー等のIPPO独自要素が破壊されていない
□ 上記共通条件をすべて満たす
```

### Experiment（PR-FULL-INTEGRATION-02）

```
□ おすすめの実験セクションが表示され、理由テキストが実データ
  （相関・傾向等）またはFounder承認済みの定型ロジックから生成される
□ 「完了」操作が実際にExperimentLifecycleServiceの完了状態遷移を呼び出す
□ 「中止」操作が実際にExperimentLifecycleServiceの中止状態遷移を呼び出す
□ 完了/中止後、進行中実験カードが正しく消える、またはHome結果カードに反映される
□ 上記共通条件をすべて満たす
```

### Insights（PR-FULL-INTEGRATION-01）

```
□ 周期グラフロックオーバーレイに「Premiumを見る」ボタンが存在し、
  タップでBilling画面（またはFounder承認済みの遷移先）へ到達する
□ Pattern Calendarについては、SPEC⑤のFounder確認結果に従う
  （β後のままなら本DoDの対象外、MVP必須に格上げされた場合は追加条件を
  別途DIFF_MATRIXへ追記した上で満たす）
□ 上記共通条件をすべて満たす
```

### Billing（PR-FULL-INTEGRATION-04）

```
□ SPEC③のFounder結論（維持/Prototypeへ戻す/ハイブリッド案）に沿った
  画面構造になっている
□ Checkout非接続であることが誤解なく伝わるコピー・UI状態である
  （変更なし、既存方針を維持）
□ 上記共通条件をすべて満たす（③の結論が「変更なし」の場合、本PRの
  完了条件は「変更が無いことの確認」のみ）
```

### Me（PR-FULL-INTEGRATION-03）

```
□ 設定リスト5行のうち、「気になることを変更する」がクリック可能で、
  オンボーディングのconcern再選択フローへ接続される
□ Planカード表示がSPEC③の結論と一致している
□ 上記共通条件をすべて満たす
```

---

## Feature Flag確認（全画面共通）

```
□ 5画面すべて既定OFFのまま変更されていない
  （`ippo_home_next`/`ippo_experiment_ui_v2`/`ippo_insights_ui_v2`/
  `ippo_billing_ui_v2`/`ippo_me_ui_v2`）
□ Flag ON/OFF切替による表示差分が、PR_RELEASE_READINESS_05の
  切替順序・ロールバック手順と矛盾しない
```

---

## Browser Verification PASS

```
□ PR_RELEASE_READINESS_03_BROWSER_VERIFICATION_GUIDE.mdの手順に沿って
  Founderが5画面すべてを実機確認し、Pass判定を記録している
□ 実機確認時、DIFF_MATRIXの「目標」列に記載した一致率が体感として
  達成されていることをFounderが確認している
```

---

## Founder Approval PASS（最終ゲート）

```
□ Founderが実機（本番またはプレビュー環境、Feature Flag ON）を開き、
  「これはippo-rebuildだ」と感じられることを明示的に確認・承認している
□ 承認は画面ごとに個別に得る（一括承認ではなく、Home/Experiment/
  Insights/Billing/Meそれぞれについて可否を記録する）
```

| 画面 | Founder Approval | 確認日 | 備考 |
|---|---|---|---|
| Home | ☐ Pass ☐ Fail | | |
| Experiment | ☐ Pass ☐ Fail | | |
| Insights | ☐ Pass ☐ Fail | | |
| Billing | ☐ Pass ☐ Fail | | |
| Me | ☐ Pass ☐ Fail | | |

**5画面すべてPassした時点で「ippo-rebuild完全統合」完了とする。**

---

## 完了とは呼ばない状態（明示的な非対象）

```
✗ Runtime/Adapter/Domain接続のみが完了し、UI要素が未実装の状態
  （これまでの「統合済み」という報告がこれに該当していた）
✗ 設計書・Council文書上で「対応済み」と記載されているだけの状態
✗ Feature Flag ON時のみ確認し、OFF時の回帰確認をしていない状態
✗ AIによる自己判定のみで、Founder Approvalが未取得の状態
```

## Next

本文書のチェックリストは`IPPO_REBUILD_PR_ROADMAP.md`の各PR完了時に
実施する。PR-FULL-INTEGRATION-06（最終PR）で全項目のPASSを確認し、
その時点をもって「ippo-rebuild完全統合」の達成日とする。
