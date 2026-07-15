# PR-APP-BOOT-01: Application Runtime Bootstrap

Founder Decision（a案採用: ApiGatewayをApplication Facadeとして正式採用、
b案・c案不採用）を実装。Experimentドメインの変更ではなく、Application層
全体に関わる基盤PR。

## 実装した内容

正規構造を確立:

```
boot()
  ↓
CompositionRoot.assemble()
  ↓
Application.initialize()
  ↓
container.resolve(TOKENS.ApiGateway)
  ↓
new ApplicationRuntime(apiGateway)
  ↓
window.app  ( .api でApiGatewayのみ参照可能)
  ↓
UI（今後のPR、window.app.apiのみ利用）
```

### 新規ファイル

- `src/application/application-runtime.js`: `ApplicationRuntime`クラス。
  コンストラクタで受け取った`ApiGateway`を`.api`ゲッターでのみ公開する。
  `DependencyContainer`への参照・`resolve()`メソッドは一切持たない
  （c案不採用: Container依存を画面へ漏らさない）

### 変更ファイル

- `src/application/app.js`: `Application.initialize()`が、既存の
  `LegacyBridge`resolve+boot処理に加えて`TOKENS.ApiGateway`をresolveし、
  `ApplicationRuntime`でラップして`window.app`へ設定するよう変更。
  `Application`はprivateな`#runtime`フィールドと`get runtime()`を追加
  （`window.app`と同一インスタンスをテストから検証可能にするため）

`window.ApiGateway`のような直接公開は行っていない（b案不採用）。UIから
`window.app.api.startExperiment(...)`のように呼び出す形になる想定
（実際のUI接続は次PR以降）。

## 検証した安全性

`container.resolve(TOKENS.ApiGateway)`は過去一度も呼ばれたことがなく、
数十個の依存関係を持つ巨大なグラフだったため、実際のboot()経路へ組み込む前に
独立した診断テストで「フル組み立て済みcontainerからApiGatewayが例外なく
resolveできるか」を先に確認した（既存の`bootstrap.test.ts`と同じモック
─supabase.js/auth-service.jsのCDN依存を回避─を使用）。問題なくresolveできる
ことを確認してから本実装に反映した。

## 完了条件チェック

```
✓ BootでApiGatewayをresolve
✓ Runtime公開（window.app.api）
✓ UIから到達可能にする（window.appはグローバルに公開済み、次PRで実接続）
✓ Containerは隠蔽（ApplicationRuntimeはresolve()もcontainerも持たない）
✓ 既存LegacyBridgeを壊さない
  （bridge.boot()呼び出しは無変更のまま維持。既存テスト2件更新のみ
  ─理由は下記─、LegacyBridge自体のロジックは無変更）
✓ Feature Flag不要（追加していない）
✓ UI変更なし
```

## 禁止事項の遵守確認

```
✓ Experiment CTA接続なし
✓ Home変更なし
✓ Record変更なし
✓ Similarity変更なし
✓ Repository変更なし
✓ Domain変更なし
✓ Supabase変更なし
```

## テスト

新規:
- `tests/application/application-runtime.test.js`（2件）: `.api`が正しく
  公開されること、container/resolve()を一切公開しないこと
- `tests/bootstrap/bootstrap.test.ts`へ追加（5件）:
  - `Application`: ApiGatewayがresolveされ`window.app.api`として公開される、
    `window.app`にcontainer/resolveが露出しない、`app.runtime`ゲッターが
    `window.app`と同一インスタンスを指す
  - `CompositionRoot`: フル組み立て済みcontainerから`ApiGateway`が例外なく
    resolveできる（`getExperiments`/`startExperiment`等の実メソッドを保持）
  - `boot()`（新規describe）: 実際の`boot()`関数を呼び、`window.app.api`が
    本物の`ApiGateway`（fakeではない）であることをend-to-endで確認

更新:
- `tests/bootstrap/bootstrap.test.ts`の既存2件（`Application.initialize()`系）
  は`TOKENS.LegacyBridge`のみを登録した最小containerを使用していたため、
  新しい`initialize()`が`TOKENS.ApiGateway`のresolveも試みることで
  失敗するようになった。両テストへ`c.singleton(TOKENS.ApiGateway, () =>
  ({}))`のfake登録を追加して対応（意図した仕様変更の反映であり、
  意図しない回帰ではない）

Regression: フルテストスイート実行、304ファイル中301ファイルPASS。
失敗3ファイル（`build-draft-from-ui.test.js`/`save-record-screen.test.js`/
`disease-analyzer.test.js`系、`record.js`の`../../domains/record/
record.service.js`import解決エラーが原因）はHANDOFFに記録済みの既知・
無関係な事前失敗で、失敗件数(35件)も既存ベースラインと完全一致することを
確認した。Build PASS（新規循環chunk警告なし）。

Browser Verification: 不要（UI変更なし、`window.app`はUIから未参照のため
挙動に影響しない）

## Next

```
PR-APP-BOOT-01（本PR）
  ↓
PR-EXP-RUNTIME-06
  Prototype CTA → window.app.api 接続
  ↓
Experiment Browser Verification
  ↓
Insights Runtime
```
