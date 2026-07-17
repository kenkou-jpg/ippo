# PR-EXP-RUNTIME-03: 既存Experiment Domain接続 — 設計調査（実装なし）

対象: PR-EXP-RUNTIME-02（表示専用シェル）の次段階として、書込み系
（実験開始・完了・中止）を「正」ドメインへ接続する場合の設計調査のみ。
**このPRではコード変更を行わない。** 実装（ExperimentCommandService接続等）は
Founder Browser Verification（PR-EXP-RUNTIME-02分）またはこの設計レビュー後に
別PRとして着手する。

## 1. 「正」の書込み面は現状ApiGatewayから`createExperiment()`しか出ていない

`ApiGateway`が公開するExperiment関連メソッドは`getExperiments()`と
`createExperiment()`の2つのみ。`ExperimentCommandService`は内部に
`update()`/`complete()`/`delete()`も実装済みだが、これらはApiGatewayの
コンストラクタに一切配線されておらず、UI層から到達不可能。

## 2. 新規発見: 「正」側にも書込み実装が2系統存在する

- `src/application/experiment-command-service.js`
  （DI登録済み、ApiGatewayに一部のみ配線）: `create()`はデフォルトで
  `status: 'DRAFT'`を設定。`complete()`は`status: 'COMPLETED'`へ更新。
  'ACTIVE'へ遷移させるメソッドが存在しない（DRAFT→COMPLETEDのみ）。
  'ABANDONED'/中止に相当するメソッドも存在しない
- `src/domains/experiment/experiment-lifecycle-service.js`
  （DI登録済み、PR-016由来、composition-root.jsには登録されているが
  **ApiGatewayには一切配線されていない**）: `complete(id, actualEndDate)`・
  `abandon(id, reason, actualEndDate)`を実装済み。ステータス遷移の状態機械
  （DRAFT→ACTIVE→COMPLETED/ABANDONED、出力14に記載のとおり）を持つ

つまり出力14が「正」と一括りにした`src/domains/experiment/*`は、実際には
CommandService（作成/更新の薄いfacade）とLifecycleService（状態遷移を管理する
本来の状態機械）という**責務が重複する2つの書込み経路**に分かれており、
ApiGatewayはそのどちらも完全には配線していない。ExperimentコマンドをUIへ
接続する前に、この2つをどう統合するか（LifecycleServiceを正としCommandService
を薄いCRUDのみに絞る、等）の設計判断が必要になる可能性がある。

## 3. Statusボキャブラリの不一致

| 系統 | 値 |
|---|---|
| legacy `experiments.js`（`state.experiments`） | `'active'` / `'completed'` / `'cancelled'` |
| `ExperimentCommandService` | `'DRAFT'` / `'COMPLETED'`（大文字、ACTIVE/ABANDONED遷移なし） |
| `ExperimentLifecycleService`（未配線） | DRAFT→ACTIVE→COMPLETED/ABANDONED（大文字、出力14記載の状態機械） |

PR-EXP-RUNTIME-02のView Model Adapterはlegacy側の小文字ボキャブラリのみを
対象にしており、「正」ドメイン接続時はこの不一致の解消（どちらの大文字/
小文字・語彙を正とするか）がFounder判断事項になり得る。

## 4. 認可（PermissionService）

`ApiGateway.createExperiment()`は`permissionService.require('experiment:write')`
を要求する。他のApiGateway書込みメソッド（Record等）と同じ認可パターンのため
仕組み自体は既存踏襲で問題ない。ユーザーが未ログイン・Consent未取得の場合の
挙動は他ドメインと同様のエラーハンドリングに従う想定（本PRでは未検証）。

## 5. 結論・Next

書込み接続（PR-EXP-RUNTIME-03の実装、あるいは名称を改めて再定義）に着手する
前に、以下をFounder判断事項として提示する:

```
a. ExperimentCommandServiceとExperimentLifecycleServiceのどちらを
   「正」の状態遷移管理として採用するか（比重: LifecycleServiceの方が
   出力14の状態機械記述に忠実）
b. legacy 'active'/'completed'/'cancelled' と 正ドメインの
   'DRAFT'/'ACTIVE'/'COMPLETED'/'ABANDONED' のどちらのボキャブラリを
   最終的なUI表示・保存値として採用するか
c. ApiGatewayへ complete/abandon/update を新規に配線してよいか
   （Architecture変更ではなく既存Serviceの配線追加だが、念のため確認）
```

PR-EXP-RUNTIME-02のFeature Flag OFF状態は本調査と無関係に安全なため、
この設計判断待ちの間もHome Phase・Insights Phase等の独立作業は継続可能。
