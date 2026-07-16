# PR-EXP-RUNTIME-06: Prototype Experiment Start CTA Integration

対象: 実験開始のみ。complete/abandon/「今日もOK」/ExperimentNudgeService接続は
行わない（Founder指示）。

## 正規経路（実装済み）

```
実験ライブラリの「試す」CTA（experiment-next.html .expn-library-card）
  ↓
experiment-next-shell.js（クリックハンドラ・二重タップ防止・エラー表示）
  ↓
experiment-next-command-adapter.js（Experiment Screen Application Adapter）
  ↓
window.app.api（PR-APP-BOOT-01のApplicationRuntime）
  ↓
ApiGateway.createExperiment() → ApiGateway.startExperiment()
  ↓
ExperimentCommandService → ExperimentLifecycleService
  ↓
ExperimentRepository
```

## create→startの非原子性

`ApiGateway`/`ExperimentCommandService`に`createAndStartExperiment()`相当の
原子的メソッドが存在するか確認したが、**存在しない**
（`ExperimentCommandService`は`create`/`update`/`start`/`complete`/
`abandon`/`delete`のみ）。このPRでは独自の補償処理（自動ロールバック・
自動削除・自動リトライ）を作らず、2段階の失敗状態を明示的に扱った:

- `create()`失敗 → `startExperiment()`を呼ばない。ユーザーへエラー表示、
  ライブラリCTAを再有効化。DRAFTは作成されていないため状態は変化しない
- `create()`成功 → `start()`失敗 → **DRAFTは削除しない**。
  `experiment-next-command-adapter.js`の戻り値に`draftId`を含めて
  呼び出し元へ明示する。UI側はエラーメッセージを表示するのみで、
  DRAFT自体は`state.experiments`（`ExperimentRepository`経由）に残ったまま
  次回起動時も存在し続ける。再試行時に同じ人が再度「試す」を押すと
  新たなDRAFTが増える可能性があるが、これは今回のPRでは許容し、
  DRAFT状態の整理（一覧表示・重複削除）は将来のPRの課題として残す

## 実装した内容

### 新規ファイル

- `src/modules/experiment-next/experiment-next-command-adapter.js`:
  Experiment Screen Application Adapter。`EXPERIMENT_LIBRARY_PRESETS`
  （ライブラリ4項目のtitle/hypothesis/diseaseKey/interventionType/days）と
  `startExperimentFromPreset(presetId)`を提供。`window.app.api`からのみ
  ApiGatewayへ到達し、Container/Repository/Supabase/legacy stateへは
  一切直接アクセスしない。二重送信ガード（モジュールレベルの`_inFlight`
  フラグ）、AuthError判別によるpermission stage分離を実装

### 変更ファイル

- `src/screens/experiment-next.html`: `.expn-library-card`を`<div>`から
  `<button data-preset-id="...">`へ変更（Prototype本来の`<button
  class="library-card">`markup により忠実になる方向の変更、レイアウト自体は
  無変更）。エラー表示用`<p id="expn-library-error" hidden>`を追加
- `src/modules/experiment-next/experiment-next.css`: `.expn-library-card`の
  button化に伴うリセットスタイル・`:disabled`状態・`.expn-error`を追加
  （視覚的には従来のカード外観を維持）
- `src/modules/experiment-next/experiment-next-shell.js`:
  `renderExperimentNext()`にライブラリカードへのクリックハンドラ登録
  （初回のみ）、進行中実験がある間はライブラリCTAを無効化（複数実験同時進行
  防止）、エラーメッセージの表示/クリア処理を追加

### 「今日もOK」の扱い

接続していない。Founder指示のとおり、既存4状態（DRAFT/ACTIVE/COMPLETED/
ABANDONED）のいずれの遷移にも該当しないため、無理に対応させていない。
`disabled`固定のまま維持

### おすすめ実験セクション

PR-EXP-RUNTIME-02時点で意図的に未実装（ExperimentNudgeService接続が前提の
ため）。本PRでも同様に未実装のまま。「試す」CTA接続の対象は実験ライブラリ
（静的4項目）のみ

## 禁止事項の遵守確認

```
✓ completeExperiment接続なし
✓ abandonExperiment接続なし
✓ 「今日もOK」の独自実装なし（disabled固定のまま）
✓ ExperimentNudgeService接続なし
✓ Home Experiment Card変更なし
✓ Legacy experiments.jsへの直接書込みなし（command adapterはwindow.app.api
  のみを呼ぶ。legacy state.experimentsへの実際の書込みは
  ExperimentRepositoryImpl経由で行われるが、これはPR-EXP-RUNTIME-04で
  確立済みの正規経路であり、UIやAdapterからの直接書込みではない）
✓ Repository直接呼び出しなし
✓ Supabase直接呼び出しなし
✓ Feature Flag既定ONへの変更なし
✓ 旧Experiment UI削除なし
✓ Migration追加なし
✓ Case / Similarity接続なし
✓ Premium制御変更なし
✓ Prototypeレイアウト変更なし（library-cardのbutton化はPrototype本来の
  markupへ近づける修正）
```

## エラー処理

`experiment-next-command-adapter.js`が返す`stage`で区別:

| stage | 意味 | UI表示 |
|---|---|---|
| `guard` | 二重タップ | 無音（既に処理中） |
| `validation` | 未知のpreset | エラーメッセージ |
| `runtime` | `window.app.api`未初期化 | エラーメッセージ |
| `permission` | AuthError（FORBIDDEN/UNAUTHENTICATED） | エラーメッセージ |
| `create` | createExperiment()失敗 | エラーメッセージ |
| `start` | startExperiment()失敗（DRAFT残存） | エラーメッセージ |

成功扱いの無音失敗は発生しない（`ok:false`の場合は必ずいずれかのstageを持つ）。

## テスト

新規:
- `tests/modules/experiment-next/experiment-next-command-adapter.test.js`
  （9件）: runtime未初期化・validation失敗・create成功→start成功・payload
  内容（正規domainフィールド名のみ、statusを含まない）・create失敗時に
  startを呼ばない・start失敗時にDRAFT保持（削除APIを呼ばない）・
  AuthErrorのpermission分離・二重送信ガード・プリセットID整合性
- `tests/modules/experiment-next/experiment-next-shell.test.js`へ6件追加
  （既存4件は維持・一部アサーション強化）: 進行中実験がある間ライブラリ
  無効化、Flag OFF時のふるまい、CTAクリック→再描画、start失敗時のエラー
  表示とCTA再有効化、二重タップ時にcreateExperimentが1回のみ、
  「今日もOK」がdisabled固定のまま

Regression: `tests/bootstrap`・`tests/arch`・`tests/domains/experiment`・
`tests/application`・`tests/modules/experiment-next`・
`tests/modules/home-next`で計930件PASS。Build PASS（新規循環chunk警告なし）。

Browser Verification: 必要（下記手順）

## Browser Verification 手順

```
1. Feature Flag OFF（デフォルト状態）でアプリを一通り操作し、既存挙動に
   変化がないこと・Console Errorが出ていないことを確認
2. Console: window.ippoExperimentNext.preview() でExperiment画面へ遷移
3. 実験ライブラリの4カードのいずれかをタップ → 「進行中の実験」カードに
   反映され、Day 1 / 総日数（14）が表示されることを確認
4. 二重クリック・連打しても実験が複数作られないことを確認
   （進行中カードが1件のみのまま）
5. リロード後も同じ実験がACTIVE状態のまま「進行中の実験」に表示され続ける
   ことを確認（永続化の確認）
6. 進行中の実験がある状態でライブラリカードがタップできない
   （薄く表示され反応しない）ことを確認
7. 「今日もOK」ボタンがまだ押せない（disabled）ことを確認
8. Home / Recordタブへ問題なく戻れることを確認
9. Console Errorが0件であることを確認
10. 320 / 375 / 390 / 430px の4幅で表示崩れがないことを確認
```
