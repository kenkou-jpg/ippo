# PR-BILLING-RUNTIME-03/04: Read-only ViewModel Adapter + Read接続

Home/Experiment/Insightsと同じRead-only→Read接続パターンを踏襲。
両PRとも小さいため1つの文書にまとめる。

## 設計判断: ApiGatewayではなく既存Application Facadeへ接続

PR-BILLING-RUNTIME-01の現状確認で、ApiGatewayにはSubscription/Billing
読み取り用メソッドが**存在しない**ことを確認済み。一方
`src/modules/premium/premium-service.js`は、Supabase `subscriptions`
テーブルを唯一の参照源とする、既に確立された独立Application Facade
（14箇所以上の既存呼び出し元）。

Founder指定の正規経路が「`window.app.api` **または** 既存Application
Facade」と明記されていたため、新規にApiGateway側の配線
（composition-root.js変更・DI登録・permission設計）を追加することは
「新しい課金状態管理の新設」に近くなると判断し、既存Facade
（`getTierLevel()`/`refreshPremiumStatus()`）へ直接接続する方式を採用した。
`getTierLevel()`の返却値は変更していない（禁止事項の遵守）。

## 実装した内容

`src/modules/billing-next/billing-next-adapter.js`（新規）:
- `getSubscriptionViewModel()`: `refreshPremiumStatus()`で最新化した後
  `getTierLevel()`を読み、`{state, label}`を返す
- 状態: `'free'|'premium'|'pro'|'unknown'|'error'`

`billing-next-shell.js`の`renderBillingNext()`を更新し、
`#bln-current-plan`（新規要素、ヘッダー直下）へ「現在のプラン: Free」等を
描画。`unknown`/`error`時は不確かな情報を出さず非表示のまま。

### 架空のSubscription状態を作らないための誠実な設計（既知の制約）

- **'premium'状態は現状のgetTierLevel()から返ることが無い**
  （PR-BILLING-RUNTIME-01で確認済み、単一課金のため）。View Model型
  としては保持するが、実データから到達することはない。将来Stripeに
  Premium専用の価格が追加された時点で自然に到達可能になる設計
- **'error'状態は現状ほぼ到達不能**: `premium-service.js`の
  `_fetchPremiumFromDB()`は内部エラーを`console.warn`するのみで外部へ
  再送出しないため、本Adapterの`try/catch`は主に将来的な防御・
  `getTierLevel`関数自体が存在しない場合の保険。真の取得失敗検知が
  必要な場合は`premium-service.js`自体の変更が必要（このPRでは対象外、
  生きている本番Billingモジュールへの変更は別途Founder確認・別PRとする）
- Prototype自体はPremium/Proのplan-cardを常時表示する構成（現在の
  tierに応じてカードを出し分けたり隠したりしない、upsell目的の
  informational card）のため、plan-card自体の表示条件は変更していない
  （Prototypeレイアウト・情報設計を変更しないため）

## テスト

- `tests/modules/billing-next/billing-next-adapter.test.js`（6件）:
  free/pro正常系、`refreshPremiumStatus()`が呼ばれた後に`getTierLevel()`を
  読むこと、想定外の値が来ても架空のtierを作らずunknownにすること、
  `refreshPremiumStatus()`/`getTierLevel()`が例外を投げた場合に
  架空の成功状態にせずerrorを返すこと
- `tests/modules/billing-next/billing-next-shell.test.js`（10件、
  premium-service.jsをモックして更新）: free/pro表示、取得失敗時に
  非表示を維持、既存のモーダル開閉・CTA非接続テストは無変更で継続PASS

Regression: `tests/modules/`・`tests/domains/`・`tests/application/`・
`tests/bootstrap/`・`tests/arch/`で76ファイル中74ファイルPASS（失敗2
ファイル34件は`record.service.js`import解決エラーに起因する既知の事前
失敗、無関係）。Build PASS（新規循環chunk警告なし）。

Browser Verification: 必要（「現在のプラン」表示が画面に実際に出るため）。
手順は次節参照。

## Browser Verification（PR-BILLING-RUNTIME-02〜04 まとめて）

```
確認方法:
  1. www.ippo-app.com（または該当プレビュー環境）を開く
  2. Feature Flag OFF確認（デフォルト状態）:
     - 既存Premium/Pro導線（premiumGate経由のロック画面・pro-hub等）・
       既存Checkoutの挙動に変化がないことを確認
     - Console Errorが出ていないことを確認
  3. Feature Flag ON確認:
     - ブラウザConsoleで以下を実行: window.ippoBillingNext.preview()
     - ヘッダー直下に「現在のプラン: Free」（または実際のプラン）が
       表示されることを確認
     - PremiumとProの役割が明確に区別されていることを確認
       （Premium=「自分の体をもっと深く理解する」、Pro=「改善実験を
       進める」）
     - 「Premiumを見る」「Proを見る」を押すと詳細モーダルが開くことを確認
     - モーダル内のCTA（「Premiumにする」「Proにする」）が押せない
       （準備中と明示されている）ことを確認
     - 「あとで」で安全にモーダルが閉じることを確認
     - 押し売り感がないトーン（Prototypeのコピーそのまま）であることを確認
     - 320 / 375 / 390 / 430px の4幅で表示崩れがないことを確認
     - Consoleエラーが0件であることを確認
     - window.ippoBillingNext.disable() でリロードし、元の状態に戻ることを確認
  4. 結果を本HANDOFFへ反映
```

## Next

PR-BILLING-RUNTIME-02〜04が完了し、価格・Stripe接続を伴わない範囲での
自走はここまで。Checkout CTAの本番接続・Premium/Pro商品分割・価格確定は
Founder Decision待ち。Founder Decision待ちの間は、依存しないMe/Consent
Phaseへ進む。
