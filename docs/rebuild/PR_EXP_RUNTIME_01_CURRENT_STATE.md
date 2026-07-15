# PR-EXP-RUNTIME-01: Experiment Runtime現状確認

対象: Phase 3（Experiment統合）着手前の現状確認。コード変更なし（調査のみ）。
権威順位: AI_EXECUTION.md → IMPLEMENTATION_PLAN_V1.1（出力14: Experiment Decision）→ 最新HANDOFF → 実コード。

## 1. 出力14の結論は引き続き有効

`docs/IMPLEMENTATION_PLAN_V1.md` 出力14が「正」と定めた
`src/domains/experiment/*`（`ExperimentRepository`/`ExperimentLifecycleService`）+
Application層の`ExperimentQueryService`/`ExperimentCommandService`は、
`composition-root.js`にDI登録され、`ApiGateway.getExperiments()`/
`ApiGateway.createExperiment()`として公開されている。この結論は現在のコードでも
そのまま成立している。

## 2. 出力14には無い新規発見

1. **「正」スタックは現在ゼロ呼び出し**: `ApiGateway.getExperiments()`/
   `createExperiment()`を呼んでいる箇所は`src/`全体に存在しない
   （`grep -r "\.getExperiments(\|\.createExperiment("`が0件）。DI配線・
   テストは揃っているが、実際にはどこからも実行されていない
2. **Legacy `src/modules/experiments.js`は独立した別データストア**:
   出力14は「旧UI専用実装」とだけ記載していたが、実際には
   `window.getState()`経由の`state.experiments`（旧グローバルstate）を
   直接読み書きしており、「正」の`ExperimentRepository`とは一切接続していない。
   部分移行ではなく完全に独立した2系統
3. **Home（`hn-experiment-card`）は既に「実験提案」を表示しているが、
   `ExperimentNudgeService`ではなく別経路**: `home-next-recovery.js`の
   `renderExperiment()`は`window.ippoRecoveryJourney.generateGentleExperiment()`
   （`recovery-journey.js`、companion-intelligence.js文脈ベース、非LLM）を使用。
   DI登録済みの`ExperimentNudgeService`（`ApiGateway.getExperimentNudge()`）は
   これも呼び出し元ゼロ（出力14の記載どおり、現在も未接続のまま）。
   つまり「実験を勧める」という同じ役割に対し、(a) 稼働中のrecovery-journey.js経路
   と (b) 未使用のExperimentNudgeService経路の2つが並存している
4. **Prototypeの`#screen-experiment`はHome次元の実験カードより高機能**:
   `prototype/index.html`には進捗リング（`#experiment-progress-ring`、
   `data-progress`、"Day 5/14"表示）・仮説文（`#experiment-running-hypothesis`）を
   持つ専用画面が存在するが、production側にはこれに相当する画面（`src/screens/`配下）
   が存在しない（`src/screens/*.html`一覧に experiment 系は無し）。
   Home統合ルールで「既存接続済み確認・No-op Close」としたPR-HOME-04の対象は、
   あくまで既存の簡易「提案テキストカード」であり、Prototypeの進捗リング付き
   専用画面とは別物

## 3. 影響（Phase 3スコープへの反映）

- 「正」ドメインへの接続は**データ移行の心配なしに進めてよい**: 現行ユーザー数は
  実質0（PR-REC-06cのFounder判断と同様の前提）であり、`state.experiments`に
  保護すべき本番データが存在する可能性は低い。Record領域のような
  Shadow Write/バックフィルの段取りは不要と判断
- Phase 3の実体は「既存画面の配線し直し」ではなく、**Prototypeの
  `#screen-experiment`相当の新規画面モジュールを、home-nextと同じパターン
  （`home-next-shell.js`のようなオーケストレーター + Feature Flag + 
  Adapter経由でApiGatewayへ接続）でゼロから構築すること**に近い。
  home-next一式（shell/hero/insights/status/quick-record等、複数ファイル）が
  複数PRに分かれて段階構築されたのと同様、Experiment側も同じ粒度の分割が必要
- `ExperimentNudgeService`の接続要否は、Home既存の`recovery-journey.js`経路との
  重複を作らないよう、統合方針（置き換え/併存/退役）をFounder判断が必要な
  可能性がある。今回は接続を保留し、PR-EXP-NUDGE-01で改めて扱う

## 4. PR-EXP-RUNTIME-02: 完了（表示専用シェル統合）

```
方針: Prototype #screen-experiment相当の新規画面モジュールをhome-nextと同じ
パターン（screen HTML + shell.js + Feature Flag + ?raw registration）で追加。
Business Logic層の新設・ExperimentCommandService/ApiGateway.createExperiment()/
legacy experiments.jsへの書込みは一切行わない。

新規ファイル:
  - src/screens/experiment-next.html — 進行中実験セクション（進捗リング・
    仮説・観察対象・「今日もOK」ボタンはdisabled固定）+ 実験ライブラリ
    （静的表示のみ、4項目、Prototypeのカスタム実験Pro枠は今回省略）
  - src/modules/experiment-next/experiment-progress.js — 純粋関数
    computeExperimentProgress({startDate,days,today}) → {currentDay,totalDays,
    progressPercent,isCompleted}。Day 1 = 開始日（home-next-hero.jsの周期日数
    計算と同じ+1規約）。startDate欠落/不正/days<=0はnullを返す安全なfallback
  - src/modules/experiment-next/experiment-next-adapter.js — Read-only View
    Model Adapter。window.getState().experiments（legacy state、複数存在する
    場合はstatus:'active'の先頭1件のみ）を読み取り専用で正規化。書込みは一切
    行わない（テストで保証）
  - src/modules/experiment-next/experiment-next-shell.js — 
    isExperimentNextEnabled()（localStorage['ippo_experiment_ui_v2']==='1'、
    デフォルトOFF）・renderExperimentNext()・showExperimentNext()・
    initExperimentNext()。home-next-shell.jsと同一パターンでwindow.
    ippoExperimentNext（enable/disable/preview/isEnabled/render）を常時公開。
    既存Feature Flag Registryは見つからなかった（home-next含め各機能が
    localStorageキーを個別管理する現行の慣習に合わせた）
  - src/modules/experiment-next/experiment-next.css — src/styles/app.cssの
    既存トークン（--rose/--plum/--ink/--white/--radius-card等）を直接参照。
    新規画面のため--hn-*のようなスコープ変換層は不要（置き換えるべき旧資産が
    存在しないため）

変更ファイル:
  - src/modules/screen-router.js — SCREEN_HTMLへ'experiment-next'を追加登録
  - src/main.js — experiment-next-shell.jsをimport（home-next-shell.jsの
    直後、既存コメントと同じ「フラグOFFなら既存挙動に影響しない」文言で明記）

Navigation: 既存タブ・既存Navigation構造は無変更。到達方法は
window.ippoExperimentNext.preview()のみ（開発用関数、Founder向けBV手順に記載）

禁止事項の遵守確認:
  ✓ ExperimentCommandService/ApiGateway.createExperiment()は未接続
  ✓ 実験開始・完了・中止は未実装（「今日もOK」はdisabled固定、実験開始CTAは
    そもそも実装せず省略、ライブラリカードはbuttonではなくdiv・クリック
    ハンドラなし）
  ✓ Supabase書込みなし
  ✓ legacy experiments.jsへの新規書込みなし（read-onlyであることをテストで
    明示的に保証）
  ✓ ExperimentNudgeService未接続
  ✓ Home Experiment Card / recovery-journey.js 無変更
  ✓ 新タブ追加なし・Navigation再設計なし

Tests: 新規14件PASS
  - experiment-progress.test.js（6件）: 開始日当日/中間日/終了日/終了日超過/
    未来日startDate/欠落データのfallback
  - experiment-next-adapter.test.js（4件）: active実験なし→null、
    window.getState欠落時も例外なくnull、view model変換、legacy stateへの
    書込みが発生しないことの確認
  - experiment-next-shell.test.js（4件）: Flag OFF時の既存挙動不変・
    window.ippoExperimentNext常時公開、Flag ON検出、running-section
    表示/非表示切替、CTA非接続の確認
  （デバッグ中に発覚した注意点: src/store/state.jsがモジュール読み込み時に
  window.getState=getStateを副作用として上書きするため、テストでモックする
  場合はdynamic import解決後にwindow.getStateを設定する必要がある）

Build: PASS（新規循環chunk警告なし、既存のサイズ警告のみ）
Regression: home-next関連17件・experiment-next関連14件、計31件PASS。
  フルスイートの既知failure（build-draft-from-ui.test.js・
  disease-analyzer.test.js、いずれもHANDOFFに既知・無関係と記録済み）は
  今回の変更と無関係と確認済み
Browser Verification: 必要（9節参照）
```

## 5. Browser Verification（PR-EXP-RUNTIME-02）

```
確認方法:
  1. www.ippo-app.com（または該当プレビュー環境）を開く
  2. Feature Flag OFF確認（デフォルト状態）:
     - 通常どおりアプリを操作し、Home/Record/Insights/Experiment関連の
       既存画面・既存ボタンの挙動に変化がないことを確認
     - ブラウザConsoleにエラーが出ていないことを確認
  3. Feature Flag ON確認:
     - ブラウザConsoleで以下を実行: window.ippoExperimentNext.preview()
     - Experiment画面（進捗リング・実験ライブラリ）が表示されることを確認
     - 進行中の実験データが無い場合は「進行中の実験」セクションが表示されず
       ライブラリのみ表示されることを確認（正常挙動）
     - 320 / 375 / 390 / 430px の4幅で表示崩れがないことを確認
     - 「今日もOK」ボタンが押せない（disabled）ことを確認
     - ライブラリカードを押しても何も起きない（書込み処理が発動しない）ことを
       確認
     - Consoleエラーが0件であることを確認
     - Console: window.ippoExperimentNext.disable() でリロードし、元の状態に
       戻ることを確認
  4. 結果を本HANDOFFへ反映
```
