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

## 4. Next: PR-EXP-RUNTIME-02

Prototypeの`#screen-experiment`相当の新規画面モジュールを、Feature Flag
デフォルトOFF・表示のみ（`ApiGateway.getExperiments()`の読み取り表示、
Day X/14進捗算出ロジックを新規実装）で追加する。screen-router.js/
tab-navigation.jsへの登録方法をhome-nextの実装パターンに合わせて確認してから
着手する。
