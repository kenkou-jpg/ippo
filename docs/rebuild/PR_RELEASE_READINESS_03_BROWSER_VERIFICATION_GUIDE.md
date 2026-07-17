# PR-RELEASE-READINESS-03: Browser Verification 実施ガイド（Founder向け）

コード変更なし（ドキュメント整理のみ）。SSOT: `docs/rebuild/PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md`
2節（チェックリスト本体）。本文書はそのチェックリストを**実施しやすくするための補助資料**であり、
チェック項目自体を変更・追加するものではない。

**AIはBrowser Verificationを実施しない。** 本文書はFounderが迷わず・抜け漏れなく確認できるように、
画面遷移手順・期待結果・失敗時の確認項目・Console確認手順・モバイル幅確認手順を明文化したもの。

---

## 0. 共通準備（5画面共通、最初に1回だけ実施）

```
1. 対象環境を開く（本番 www.ippo-app.com、またはFounderが指定するプレビュー環境）
2. ブラウザDevToolsを開く（F12 または 右クリック→検証）→ Consoleタブを表示
3. Consoleタブは確認中ずっと開いたままにする（各画面のConsole Errorチェックのため）
4. Applicationタブ（Chrome）またはStorageタブ（Firefox）でlocalStorageを開けるようにしておく
   （Feature Flagキーの目視確認に使う。必須ではないが推奨）
5. 5画面とも初期状態はFeature Flag OFF（未設定 = OFF）。他画面の確認で誤ってONのまま
   残っていないか、各画面の確認開始前に一度 `localStorage` を目視確認するとよい
```

**共通の画面遷移パターン**（5画面すべて同じ、Navigation自体は変更されていない）:

```
OFF状態の確認 → Console上で `window.ippoXxxNext.preview()` を実行
  → 画面が該当タブ内でnext版に切り替わる（新しいURLやタブ遷移は発生しない）
  → 確認完了後 `window.ippoXxxNext.disable()` を実行 → リロード → OFF状態へ復帰
```

Xxxと対応タブ・Namespaceの対応表:

| 画面 | Namespace | 既存タブ | Flagキー |
|---|---|---|---|
| Home | `ippoHomeNext` | ホームタブ | `ippo_home_next` |
| Experiment | `ippoExperimentNext` | 実験タブ（存在する場合）/ Home経由 | `ippo_experiment_ui_v2` |
| Insights | `ippoInsightsNext` | インサイトタブ | `ippo_insights_ui_v2` |
| Billing | `ippoBillingNext` | Premium/Proタブ | `ippo_billing_ui_v2` |
| Me | `ippoMeNext` | 設定タブ | `ippo_me_ui_v2` |

**重要な非対称性（2026-07-17 Runtime Switch監査で確認）**: Homeのみ、Flagの
デフォルト挙動が他4画面と逆になっている。

```
Experiment/Insights/Billing/Me: isXxxNextEnabled() は
  localStorage.getItem(FLAG_KEY) === '1' の場合のみ true（opt-in、既定OFF）

Home: isHomeNextEnabled() は
  state.homeNextEnabled === false、または localStorage.getItem('ippo_home_next') === '0'
  の場合のみ false（opt-out、既定ON）
  （src/modules/home-next/home-next-shell.js 65-75行、コメントに「デフォルト有効」と明記）
```

したがって**Homeの「Feature Flag OFF」ベースラインは、何もしなくても得られる
状態ではない**。他4画面は何もしなければ自動的にOFF（legacy）だが、Homeは
明示的に`localStorage.setItem('ippo_home_next','0')`を実行してリロードしない
限り、常にhome-nextが表示された状態のままになる。0節の共通確認方法
（「OFF状態の確認」）をHomeで実施する際は、この手順を追加で行うこと。

---

## 1. 画面ごとの詳細手順

各画面につき「画面遷移」「期待結果」「失敗時確認項目」「Console確認項目」の4点を追記する。
チェックボックス自体（Pass/Fail判定に使う本体）は`PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md`
2節を参照し、本文書では重複させない。

### 1-1. Home（`window.ippoHomeNext`）

**画面遷移**（他4画面と異なり、Homeは既定で有効なため手順が異なる）:
```
ON状態の確認:
  1. アプリを開く（何もしなくても、デフォルトでhome-nextが表示される。
     `window.ippoHomeNext.isEnabled()` を実行して true が返ることを確認）
  2. 確認のため `window.ippoHomeNext.preview()` を実行しても同じ画面が
     再描画されるだけで問題ない

OFF状態の確認（重要: 他4画面と異なり、何もしなくてもOFFにはならない）:
  1. Consoleで `localStorage.setItem('ippo_home_next','0')` を実行
  2. リロード（F5）
  3. legacy Home画面（週間カレンダー + 「今日を記録する」ボタン等）が
     表示されることを確認
  4. 確認後は `localStorage.removeItem('ippo_home_next')` を実行しリロードして
     既定状態（home-next表示）へ戻す
```

**期待結果**: `PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 2-1節のチェック項目通り。
特にInsightカードは実データ（記録件数に応じた文言・confidence表示）が出ること。

**失敗時確認項目**（チェックが1つでもFailの場合、以下を記録してAIへ差し戻す）:
```
□ どのカードで崩れたか（Hero/Status/Insight/Experiment/Quick Record）
□ どの幅で崩れたか（320/375/390/430のいずれか、複数可）
□ Console Errorのメッセージ全文（スクリーンショット可）
□ Insightカードの文言が「記録がありません」等の定型文のままか、実データが
  出ているが内容がおかしいか（後者はデータ側の問題の可能性）
□ Feature Flag OFF時に既存Home画面へ影響が出ていないか（出ていれば重大、
  最優先で報告）
```

**Console確認項目**:
```
- `window.ippoHomeNext.isEnabled()` → true（ON時）/ false（OFF時）と一致するか
- 赤いError行が0件か（黄色いWarningは許容、ただし内容に見覚えがなければ記録）
- `Uncaught TypeError` / `Uncaught ReferenceError` が出ていないか
```

### 1-2. Experiment（`window.ippoExperimentNext`）

**画面遷移**:
```
1. Consoleで `window.ippoExperimentNext.preview()` を実行
2. 進行中の実験がなければライブラリ画面のみが表示される（これは正常）
3. ライブラリから任意の実験の「試す」を押す → 進行中カードに反映されることを確認
4. リロードしてもACTIVE状態（実験データ）が維持されるか確認する。**注意**:
   Home以外の4画面（Experiment/Insights/Billing/Me）は、リロード後に
   next画面が自動的に再表示されるわけではない（Navigation統合が範囲外の
   ため、起動時にnext画面へ自動遷移する仕組みが無い）。リロード後は通常の
   起動画面（Home等）が表示されるので、再度 `window.ippoExperimentNext.preview()`
   を実行してExperiment next画面へ戻り、進行中カードのDay数・進捗が
   維持されていることを確認する。これは想定通りの挙動であり、
   「リロードで画面が戻った」こと自体は不具合ではない
5. 「今日もOK」ボタンは押しても反応しない想定（disabled、書込み未接続のため）
6. Home / Recordタブへ切り替えて戻ってこれることを確認
```

**期待結果**: `PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 2-2節の通り。
Day1表示（進捗リング）が出ること、二重クリックで実験が重複しないこと。

**失敗時確認項目**:
```
□ 「試す」を押した直後に進行中カードへ反映されたか、それとも反映されず
  ライブラリのままか
□ リロード後にACTIVE状態が消えていないか（消えていれば永続化の問題）
□ 二重クリックで実験が2件重複していないか（実験ライブラリまたは進行中
  カードの件数を数える）
□ Console Errorのメッセージ全文
□ Feature Flag OFF時に既存Experiment関連の挙動へ影響が出ていないか
```

**Console確認項目**:
```
- `window.ippoExperimentNext.isEnabled()` の値が想定通りか
- 実験開始時に `window.app.api` 経由のネットワークエラー
  （Networkタブで確認する場合は Supabase への POST/PATCH が 200 系か）
- Uncaught例外が出ていないか
```

### 1-3. Insights（`window.ippoInsightsNext`）

**画面遷移**:
```
1. Consoleで `window.ippoInsightsNext.preview()` を実行
2. インサイトタブ内で「今週のハイライト」カードが表示されることを確認
3. 記録件数が少ない場合は定型文、一定数以上ある場合はconfidence-row
   （ドット+タグ）が出ることを確認（記録件数はFounderのテストアカウントの
   状態に依存するため、どちらが出ても仕様通り）
4. 「実験結果サマリー」が非表示のままであること（意図的な未接続、これは
   正常挙動）
5. 「周期との重なりグラフ」がPremium-locked表示（静的、タップしても
   何も起きない）であることを確認
6. パターンカレンダーが存在しないこと（Founder Decisionにより対象外、
   存在しなくて正常）
```

**期待結果**: `PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 2-3節の通り。

**失敗時確認項目**:
```
□ ハイライトカードが空白/エラー表示になっていないか
□ confidence-rowが出るべき記録件数なのに定型文のままか（データ側の
  閾値問題の可能性、`resolveMainInsight()` 側の挙動確認が必要になるため
  AIへ差し戻す際にその旨を明記）
□ 「実験結果サマリー」が誤って表示されていないか（意図せず表示されて
  いれば実装側のバグ）
□ Console Errorのメッセージ全文
```

**Console確認項目**:
```
- `window.ippoInsightsNext.isEnabled()` の値が想定通りか
- `window.app.api.getRecords()` 呼び出しに伴うネットワークエラーがないか
- Uncaught例外が出ていないか
```

### 1-4. Billing（`window.ippoBillingNext`）

**画面遷移**:
```
1. Consoleで `window.ippoBillingNext.preview()` を実行
2. ヘッダー直下の「現在のプラン」表示を確認（Free/Premium/Proいずれか、
   テストアカウントの実際の契約状態と一致するか）
3. 「Premiumを見る」を押す → 詳細モーダルが開く → 「あとで」で閉じる
4. 「Proを見る」を押す → 同様に確認
5. モーダル内の「Premiumにする」「Proにする」ボタンが押せない
   （準備中の表示のまま）ことを確認
```

**期待結果**: `PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 2-4節の通り。
Checkout未接続であることが誤解なく伝わるコピーになっているか、
押し売り感がないトーンかを含めて確認。

**失敗時確認項目**:
```
□ 「現在のプラン」表示が実際の契約状態と食い違っていないか（食い違って
  いれば`premium-service.js`側の読み取り不整合の可能性、重大度高）
□ モーダルのCTAが誤って押せてしまっていないか（押せてしまう場合は
  Checkout誤発火のリスクがあるため最優先で報告）
□ 「あとで」で閉じずに固まっていないか
□ Feature Flag OFF時に既存Premium/Pro導線・既存Checkoutへ影響が
  出ていないか（最重要、Billingは既存収益導線のため）
□ Console Errorのメッセージ全文
```

**Console確認項目**:
```
- `window.ippoBillingNext.isEnabled()` の値が想定通りか
- モーダルのCTAクリック時に `startStripeCheckout()` 等の既存Checkout系
  関数が誤って呼ばれていないか（Networkタブで stripe.com 宛のリクエストが
  発生していないことを確認するのが確実）
- Uncaught例外が出ていないか
```

### 1-5. Me（`window.ippoMeNext`）

**画面遷移**:
```
1. Consoleで `window.ippoMeNext.preview()` を実行
2. 設定タブ内で「現在のプラン」表示を確認
3. プラン表示部分をタップ → Billing画面（Premium/Pro詳細）へ遷移する
   ことを確認（Me→Billingの画面内遷移、タブそのものは変わらない）
4. プライバシーカード（「あなたの記録は、あなただけが見られます」）の
   表示を確認
5. 設定リスト5行が表示されることを確認（クリックしても何も起きなくて
   正常、書込み未接続のため）
```

**期待結果**: `PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 2-5節の通り。

**失敗時確認項目**:
```
□ 「現在のプラン」表示がBilling画面の表示と食い違っていないか
  （`me-next-adapter.js`が`billing-next-adapter.js`を再利用しているため、
  食い違いがあれば実装側のキャッシュ・再取得タイミングの問題）
□ タップしてもBilling画面へ遷移しないか
□ 研究協力トグル等、既存Me/設定画面の挙動にFeature Flag OFF時の影響が
  出ていないか
□ Console Errorのメッセージ全文
```

**Console確認項目**:
```
- `window.ippoMeNext.isEnabled()` の値が想定通りか
- Billing画面遷移時に二重にadapterが呼ばれてネットワークエラーに
  なっていないか
- Uncaught例外が出ていないか
```

---

## 2. モバイル幅確認手順（320 / 375 / 390 / 430px）

5画面共通の手順。DevToolsのレスポンシブモードを使う。

```
1. DevToolsを開いた状態で、デバイスツールバーを表示（Ctrl+Shift+M / Cmd+Shift+M）
2. 画面幅を手動入力で切り替える: 320 → 375 → 390 → 430（この順で1つずつ）
3. 各幅で以下を確認:
   □ カード・ボタンがはみ出していないか（横スクロールバーが出ていないか）
   □ テキストが不自然に折り返し・重なりしていないか
   □ タップ対象（ボタン・カード）が隠れたり重なったりしていないか
4. 320px（最小幅、iPhone SE相当）で問題がある場合は最優先で報告
   （最も崩れやすい幅のため）
```

参考: 幅の対応端末目安 — 320px: iPhone SE(第1世代)、375px: iPhone SE(第2/3世代)・
iPhone 8、390px: iPhone 12/13/14、430px: iPhone 14/15 Pro Max。

---

## 3. 実施ログテンプレート（Founderがコピーして使用）

```
### [画面名] Browser Verification ログ

確認日時:
確認環境: （本番 / プレビュー環境URL）
確認者:

OFF状態確認: OK / NG
ON状態確認: OK / NG
320px: OK / NG
375px: OK / NG
390px: OK / NG
430px: OK / NG
Console Error: 0件 / [件数と内容]

総合判定: Pass / Fail

Fail時の詳細:
（上記「失敗時確認項目」に沿って記入）
```

記入結果は `PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 2-6節の表へ転記する。

---

## 4. 全画面確認後のNext

5画面すべてPassした場合: HANDOFFへ反映し、Feature Flag既定ON化の検討へ進む
（`PR_RELEASE_READINESS_05_FEATURE_FLAG_RELEASE_PLAN.md`参照）。

いずれかがFailした場合: 該当画面のみ修正PRを起票する。他の画面のBVは
並行して進めてよい（画面間の依存はない。ただしMeはBillingのadapterを
再利用するため、Billingが Fail の場合は Me の「現在のプラン」表示も
併せて疑う）。

---

## Next

本PRはドキュメント整理のみで完了。Browser Verification自体はAIが実施しない
（AI_EXECUTION.md 10節）。Founderが本ガイドを使って2節のチェックリストを
実施し、結果を`PR_RELEASE_READINESS_02_RC_SCOPE_FREEZE.md` 2-6節へ記入する。
