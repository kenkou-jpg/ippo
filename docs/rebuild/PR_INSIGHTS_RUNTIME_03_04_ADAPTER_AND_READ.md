# PR-INSIGHTS-RUNTIME-03/04: Read-only ViewModel Adapter + ApiGateway Read接続

Founder Decision（Home・Experimentと同じRead-only → Read接続 →
Browser Verificationパターンを維持）に沿って、Insightsの「今週のハイライト」
を2段階で接続した。まとめて1つの文書に記録する（両PRとも小さいため）。

## PR-INSIGHTS-RUNTIME-03: Read-only ViewModel Adapter

`src/modules/insights-next/insights-next-adapter.js`（新規）:
- `getHighlightViewModel(state)`。既存Runtime
  （`services/insight-signals.js`の`extractSignals()`、
  `window.ippoInsightEngine`、`insights-dynamic-renderer.js`の
  `resolveMainInsight()`）をそのまま呼び出して正規化するのみで、新規の
  インサイト生成ロジックは持たない
- **リファクタ**: `insights-dynamic-renderer.js`の`_renderMainInsight()`から
  選定ロジックを`resolveMainInsight(insights, signals, records)`という
  純粋関数へ切り出した（DOM描画とロジックの分離）。挙動は完全に同一
  （3段階フォールバック: engine insight → signalベース → 低データ時の
  定型文）。legacy側`renderInsightsDynamic()`・`_renderMainInsight()`は
  この関数を呼ぶように変更、外部から見た挙動は無変更
- confidenceLabel → confidence-row用ドット数のマッピング
  （low:1 / medium:2 / high:4）はAdapter側で計算し、shell.js側は
  受け取った値をそのまま描画するのみ（Home/Experimentと同じ責務分担）

`insights-next-shell.js`の`renderInsightsNext()`を更新し、
`#insn-highlight-text`・`#insn-highlight-confidence-row`を実際に描画する
ように接続。「実験結果サマリー」は比較用データソース未設計のため
引き続きhiddenのまま。

## PR-INSIGHTS-RUNTIME-04: ApiGateway Read接続（書込みなし）

Adapterの`records`取得元を`window.getState()`（legacy直接参照）から
`window.app.api.getRecords()`（ApiGateway経由の正規経路）へ切り替えた。

**安全性の確認**: `ApiGateway.getRecords()` →
`RecordQueryService.findByUser()` → `RecordRepository`
（`RecordReadSwitchRepository`）→ Read Switch=OFFの間は
`DualWriteRecordRepository`経由でlegacy `RecordRepositoryImpl`を読む。
`RecordRepositoryImpl`は`ippo_state`の`records`配列を読み書きしており
（`src/repositories/record/record-repository.js` `STATE_KEY = 'ippo_state'`）、
これは`window.getState().records`と**同一のデータ**。正規化Record（V2）を
Read Sourceに切り替える変更ではなく（Read Switch自体は無変更・書き込みも
していない）、単にlegacyへの到達経路をApiGateway経由の正規ルートへ
差し替えただけであることを確認済み。既存Founder Decision
（「禁止: 正規化データをCase・InsightsのRead Sourceにすること」）には
抵触しない。

`getHighlightViewModel()`は非同期化（`getRecords()`がPromiseを返すため）。
`window.app.api`が未初期化・`getRecords()`が失敗した場合は、recordsを
空扱いにして安全にフォールバックする（低データ時の定型文表示、例外は
投げない）。myDiseases等records以外の状態は、ApiGateway側に対応する
Read経路が無いため、引き続き呼び出し元（shell.js）が`window.getState()`
から補っている（將来的な拡張余地として残す、このPRのスコープ外）。

## テスト

- `tests/modules/insights-dynamic-renderer.test.js`へ`resolveMainInsight`の
  単体テスト4件を追加（既存10件と合わせ14件）
- `tests/modules/insights-next/insights-next-adapter.test.js`（5件、
  非同期化に合わせ更新）: `window.app.api`未初期化時のfallback、
  `getRecords()`経由のrecords取得、`getRecords()`失敗時のfallback、
  confidence反映、BD-038違反時のfallback
- `tests/modules/insights-next/insights-next-shell.test.js`（7件、
  非同期`renderInsightsNext()`に合わせ更新）

Regression: `tests/modules/`・`tests/domains/`・`tests/application/`・
`tests/bootstrap/`・`tests/arch/`で74ファイル中72ファイルPASS（失敗2ファイル
34件は`record.service.js`import解決エラーに起因する既知の事前失敗、
ベースラインと完全一致・無関係と確認済み）。Build PASS（新規循環chunk
警告なし）。

Browser Verification: 必要（highlightテキストが画面に実際に表示される
ようになったため）。手順は次節参照。

## Browser Verification（PR-INSIGHTS-RUNTIME-02〜04 まとめて）

```
確認方法:
  1. www.ippo-app.com（または該当プレビュー環境）を開く
  2. Feature Flag OFF確認（デフォルト状態）:
     - 既存Insights画面・既存Navigationの挙動に変化がないことを確認
     - Console Errorが出ていないことを確認
  3. Feature Flag ON確認:
     - ブラウザConsoleで以下を実行: window.ippoInsightsNext.preview()
     - 「今週のハイライト」カードにテキストが表示されることを確認
       （記録が少ない場合は「記録が増えると、ここに気づきが届きます」等の
       定型文が表示されれば正常）
     - 記録が一定数ある場合、confidence-row（ドット+タグ）が表示される
       ことを確認
     - 「実験結果サマリー」は非表示のままであること（現時点で正常挙動）
     - 「周期との重なりグラフ」がPremium-lockedな静的表示で見えることを確認
     - パターンカレンダーは意図的に存在しない（現行Calendarタブは別途無変更）
     - 320 / 375 / 390 / 430px の4幅で表示崩れがないことを確認
     - Consoleエラーが0件であることを確認
     - window.ippoInsightsNext.disable() でリロードし、元の状態に戻ることを確認
  4. 結果を本HANDOFFへ反映
```

## Next

PR-INSIGHTS-RUNTIME-04完了により、Founder指定の順序
（RUNTIME-02→03→04→Browser Verification）が完了。Founder Browser
Verification待ちとし、Insights本番既定化・Legacy Insights削除・Pattern
Calendar統合・Similarity表示強化・AI要約追加のいずれにも進まない。
