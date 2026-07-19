# PR-EXPERIMENT-REBUILD-01 — Recommended Experiment Section

> Founder Decision（2026-07-19、Decision 2）に基づき、Experiment画面（Prototype）の
> 「おすすめの実験」セクションをRuntimeへ実装。既存の`getNextExperimentViewModel()`
> （PR-HOME-REBUILD-01で実装済み）をそのまま再利用し、ロジックの複製・Domain変更は
> 一切行っていない。

---

## 1. 実装方針

Founder Decisionの承認条件を全て満たす形で実装した。

- MVP必須として実装 ✅
- `home-next-experiment-adapter.js`の`getNextExperimentViewModel()`を再利用 ✅
  （`experiment-next-shell.js`から直接import。ExperimentNudgeService呼び出し・
  presetマッピングロジックはコピーしていない）
- 進行中カードと実験ライブラリの間にPrototype準拠で配置 ✅
- 実データが無い場合は非表示 ✅
- 「この実験を試してみる」から既存のpreset開始経路（`startExperimentFromPreset()`）へ接続 ✅
- Domain変更なし ✅
- カスタム実験(Pro)カードはβ後のまま据え置き ✅（対応せず）

---

## 2. 実装ファイル

| ファイル | 変更内容 |
|---|---|
| `src/screens/experiment-next.html` | `#expn-recommended-section`を進行中カードとライブラリの間に追加（`hidden`初期状態） |
| `src/modules/experiment-next/experiment-next-shell.js` | `home-next-experiment-adapter.js`から`getNextExperimentViewModel()`をimportし、`renderExperimentNext()`の末尾で呼び出し・描画。「この実験を試してみる」クリックハンドラを追加（`startExperimentFromPreset()`を再利用、ライブラリカードと同一の実行/エラー経路） |
| `src/modules/experiment-next/experiment-next.css` | `.tint-gold`・`.badge-gold`・`.expn-recommended-*`（Home の`.hn-next-card`と同じgold配色トークンを使用） |
| `tests/modules/experiment-next/experiment-next-recommended.test.js`（新規） | 7件 |

Domain/Repository/ApiGateway層の変更は無し。

---

## 3. 実装詳細

### 3.1 再利用（複製ゼロ）

`getNextExperimentViewModel()`は`home-next-experiment-adapter.js`（PR-HOME-REBUILD-01で実装済み）をそのままimportして使用する：

```js
import { getNextExperimentViewModel } from '../home-next/home-next-experiment-adapter.js';
```

このAdapterは内部で`ExperimentNudgeService`（`ApiGateway.getExperimentNudge()`）と
`NUDGE_TYPE_TO_PRESET_ID`マッピング・`EXPERIMENT_LIBRARY_PRESETS`参照を行っており、
進行中の実験がある間は自動的に`null`を返す（Home側と同一の「複数実験同時進行防止」方針を
Experiment画面側でも重複判定せずそのまま享受する）。

### 3.2 `renderExperimentNext()`の変更点

既存の進行中カード描画ロジック（同期処理）は一切変更していない。関数を`async`化した上で、
既存の同期処理をすべて`if (section) { ... }`ブロック内に残し、その末尾に
「おすすめの実験」の非同期更新を追加した：

```js
if (document.getElementById('expn-recommended-section')) {
  const nextVm = await getNextExperimentViewModel();
  renderRecommendedExperiment(nextVm);
}
```

`async`化しても、既存の同期DOM更新（進行中カードの表示/非表示・ライブラリの活性状態）は
最初の`await`より前に実行されるため、`await`せずに`renderExperimentNext()`を呼び出す
既存呼び出し元・既存テストの挙動には影響しない（実際、既存47件のテストは無改修のまま
全PASSしている）。

### 3.3 「この実験を試してみる」ボタン

`startExperimentFromPreset(presetId)`を実験ライブラリカードと同一の関数で呼び出す。
成功時は`renderExperimentNext()`を再実行（進行中カードへの遷移、おすすめセクションの
自動非表示は`getNextExperimentViewModel()`側の「進行中実験がある間はnull」という既存契約に
従う）。失敗時のエラー表示は既存のライブラリ用エラー枠（`#expn-library-error`）を再利用し、
新しいエラー表示コンポーネントは追加していない。二重タップガードは
`startExperimentFromPreset()`内の既存`_inFlight`ガードにそのまま乗る。

### 3.4 UIコピーの差分（意図的な省略）

Prototypeの「おすすめの実験」カードには「観察すること: 肌の調子・気分」という行があるが、
`EXPERIMENT_LIBRARY_PRESETS`にはこの情報に対応するフィールドが存在せず、`getNextExperimentViewModel()`
の戻り値にも含まれていない。架空のコピーを新設せず、既存Adapterが返すフィールド
（`reasonText`/`title`/`hypothesis`）のみで構成した。これはHomeの次の実験候補カード
（`home-next-next-experiment.js`）と全く同じ情報構成であり、一貫性がある。

---

## 4. テスト

`tests/modules/experiment-next/experiment-next-recommended.test.js`（新規7件）:

1. 候補が無い場合（null）はセクション非表示
2. 候補がある場合、理由/タイトル/仮説を表示
3. 進行中の実験がある間は非表示（`getNextExperimentViewModel()`の既存契約に従うことの確認）
4. クリック→create成功→start成功→進行中カードへ再描画
5. start失敗時はエラー表示・ボタン再有効化
6. 二重タップガード（createExperimentは1回のみ）
7. セクションがDOMに無い場合の後方互換性（例外を投げない）

既存`experiment-next-shell.test.js`（47件）は無改修で全PASS。

---

## 5. Build / Regression結果

```
npm run build   → PASS（既存の警告のみ、本PR起因ではない）
npx vitest run  → 321 test files / 5,539 tests 全PASS
                  （tab-navigation.js由来の既知flaky post-teardownタイマー例外2件のみ、
                   本PRが触れていないファイルで発生、過去セッションでも同種の
                   並列実行環境特有ノイズとして確認済み）
```

---

## 6. 実ブラウザ確認（Browser Visual Gate）

**未実施。** CLAUDE.mdの規定により、AIはBrowser Verificationを自己判断で実施しない。

```
Browser Verification Required:
  対象: Experiment画面（Runtime, Feature Flag ippo_experiment_ui_v2=ON時）
  理由: 「おすすめの実験」セクションが実際に正しく描画され、「この実験を試してみる」から
        実験開始まで一連の操作が実機で機能するかの視覚的確認が必要
  確認方法:
    1. localStorage.setItem('ippo_experiment_ui_v2', 'true') を設定してExperiment画面を開く
    2. 進行中の実験が無い状態で、記録から食事/症状の繰り返しパターンが検出される条件を
       満たしている場合、「おすすめの実験」セクションが進行中カードとライブラリの間に
       表示されることを確認（条件を満たさない場合は非表示のままで正常）
    3. 表示されている場合、「この実験を試してみる」をタップし、実験が開始され、
       進行中の実験カードへ切り替わることを確認
    4. 進行中の実験がある状態では「おすすめの実験」セクションが表示されないことを確認
    5. Console/Networkタブでエラーが出ていないことを確認
```

---

## 7. Founder Decisionとの対応確認

| Founder Decision項目 | 対応 |
|---|---|
| MVP必須として実装 | ✅ |
| `getNextExperimentViewModel()`を再利用 | ✅ |
| ExperimentNudgeService/presetマッピングを複製しない | ✅ |
| 進行中カードとライブラリの間にPrototype準拠で配置 | ✅ |
| 実データがない場合は非表示 | ✅ |
| 「この実験を試してみる」から既存preset開始経路へ接続 | ✅ |
| Domain変更は原則禁止 | ✅（変更なし） |
| カスタム実験(Pro)カードはβ後のまま | ✅（対応せず） |

---

## 8. 次のステップ

実装順の合意（`1. PR-EXPERIMENT-REBUILD-01 → 2. Founder Browser Verification → 3. PR-ME-REBUILD-01 → 4. Founder Browser Verification → 5. Billing Checkout設計・接続`）に従い、
本PRのFounder Browser Verification完了を待つ。完了後、PR-ME-REBUILD-01（Me Plan Cards
Hybrid Integration）へ着手する。
