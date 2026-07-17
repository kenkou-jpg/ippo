# PR-ME-RUNTIME-03/04: Read-only ViewModel Adapter + Read接続

Home/Experiment/Insights/Billingと同じRead-only→Read接続パターンを踏襲。

## 実装した内容

`src/modules/me-next/me-next-adapter.js`（新規）:
- `getMeProfileViewModel()`: **`billing-next-adapter.js`の
  `getSubscriptionViewModel()`をそのまま再利用**（二重実装防止 —
  本セッションのInsights Phaseで指摘された「`resolveMainInsight()`を
  legacy/next共通のSSOTとする」のと同じ原則を、Billing/Meの
  Subscription状態算出にも適用した）
- `unknown`/`error`状態の場合は`null`を返し、呼び出し元（shell.js）は
  「現在のプラン」欄を非表示のままにする（架空の情報を出さない）

`me-next-shell.js`の`renderMeNext()`を更新し、`#men-profile-plan`ボタンへ
「現在のプラン: Free ›」等を描画。クリックで`billing-next`画面へ遷移する
導線は無変更のまま維持。

プロフィール名（アバター・表示名）は対応する既存Read facadeが見当たら
なかったため、引き続き空/hiddenのまま（架空のプロフィールデータを
作らない、PR-ME-RUNTIME-01の方針を維持）。

## テスト

- `tests/modules/me-next/me-next-adapter.test.js`（4件）: free/pro正常系、
  unknown/error時にnullを返すこと（架空の情報を出さない）
- `tests/modules/me-next/me-next-shell.test.js`（6件、
  billing-next-adapter.jsをモックして更新）: 現在のプラン表示、
  Subscription不明時の非表示維持、billing-nextへの遷移導線は無変更で
  継続PASS

Regression: `tests/modules/`・`tests/domains/`・`tests/application/`・
`tests/bootstrap/`・`tests/arch/`で78ファイル中76ファイルPASS（失敗2
ファイル34件は`record.service.js`import解決エラーに起因する既知の事前
失敗、無関係）。Build PASS（新規循環chunk警告なし）。

Browser Verification: 必要（「現在のプラン」表示が画面に実際に出るため）。
手順はPR-ME-RUNTIME-02の文書と合わせて次節に記載。

## Browser Verification（PR-ME-RUNTIME-02〜04 まとめて）

```
確認方法:
  1. www.ippo-app.com（または該当プレビュー環境）を開く
  2. Feature Flag OFF確認（デフォルト状態）:
     - 既存設定画面（app.html内の研究協力トグル含む）の挙動に変化がないことを確認
     - Console Errorが出ていないことを確認
  3. Feature Flag ON確認:
     - ブラウザConsoleで以下を実行: window.ippoMeNext.preview()
     - 「現在のプラン: Free」（または実際のプラン）が表示されることを確認
     - タップでbilling-next画面（Premium/Pro）へ遷移することを確認
     - プライバシーカード（「あなたの記録は、あなただけが見られます」）が
       表示されることを確認
     - 設定リスト5行が表示されることを確認（クリックしても何も起きなくて正常）
     - 320 / 375 / 390 / 430px の4幅で表示崩れがないことを確認
     - Consoleエラーが0件であることを確認
     - window.ippoMeNext.disable() でリロードし、元の状態に戻ることを確認
  4. 結果を本HANDOFFへ反映
```

## Next

Me Phaseは価格変更を伴わない範囲でここまで完了。Research Consent UIは
Prototype設計が存在しないため、Founder DecisionでUI方針が確定するまで
着手しない（PR-ME-RUNTIME-01参照）。
