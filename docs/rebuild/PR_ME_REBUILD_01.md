# PR-ME-REBUILD-01 — Me Plan Cards Hybrid Integration

> Founder Decision（2026-07-19、③ハイブリッド案）に基づき、Me画面に
> Prototype準拠のPlanカード2枚をインライン要約表示として追加したPR。
> Billing独立画面は維持し、価格・Checkout・購読状態変更・詳細比較は
> Billing側へ一元化する（二重実装しない）。

---

## 1. Founder Decisionの要約

```
③ハイブリッド案を承認
- Billing独立画面は維持する
- Me画面にもPrototype準拠のPlanカード2枚をインライン表示する
- Me側はプラン概要とBillingへの導線に限定する
- 価格、Checkout、購読状態変更、権限反映はBilling側へ一元化する
- MeとBillingで課金ロジックを二重実装しない
- Consent UIは正式追加要素として維持し、削除しない
```

---

## 2. 実装内容

### Me画面（`src/screens/me-next.html`）

プライバシーカードと設定リストの間に、Prototypeの並び順通りPlanカード2枚を追加。

| カード | 内容 |
|---|---|
| Premium | 「PLAN」kicker + 見出し + タグライン「自分の体をもっと深く理解する」+「Premiumを見る」ボタン |
| Pro | 「PLAN」kicker + 見出し + タグライン「改善実験をもっと進める」+「Proを見る」ボタン |

**Prototypeとの差分（意図的）**: Prototypeは各カードに機能一覧（3〜4項目のリスト）を含むが、
Founder Decisionの「Me側はプラン概要とBillingへの導線に限定する」に従い、本実装では
機能一覧を省略し、タグライン+CTAのみの要約表示とした。機能一覧・詳細比較はBillingへ集約。

### CTAの遷移先（`src/modules/me-next/me-next-shell.js`）

「Premiumを見る」「Proを見る」はいずれも既存`showBillingNext()`を呼び出し、billing-next画面へ
遷移する。billing-next-shell.jsのモーダル表示ロジック・Checkout処理は一切複製していない。

**簡略化した点（透明性のため明記）**: Premium/Proどちらのボタンを押してもBilling画面のトップへ
遷移するのみで、対応する詳細モーダルを自動で開く機能（ディープリンク）は実装していない。
画面間で選択状態を受け渡す新しいグローバル状態の新設が必要になるため、既存のNavigation
Integrationパターン（Flagのみで分岐、新規状態を作らない）を踏襲し、単純な画面遷移に留めた。

### 課金ロジックの二重実装ゼロ

- 「現在のプラン」表示は既存`me-next-adapter.js`の`getMeProfileViewModel()`
  （`billing-next-adapter.js`の`getSubscriptionViewModel()`をSSOTとして呼び出すのみ）を
  そのまま継続使用。本PRでの変更なし。
- Planカード2枚は静的コピー（Prototypeのタグライン文言をそのまま使用）で、価格・tier判定
  ロジックは一切持たない。
- Domain / Application Facade / ApiGateway層の変更はゼロ。

---

## 3. スコープ外（今回のPRに含まれない、既知の別ギャップ）

- 設定リスト（5行）のクリック機能復活（「通知設定」「データのエクスポート」「アカウント」「ヘルプ」）
- 「気になることを変更する」導線の復活
- Billing Checkout接続

これらは`IPPO_REBUILD_UI_DIFF_MATRIX.md`のMeセクションに既存の別ギャップとして記載済みで、
本Founder Decisionのスコープ（③Planカードのみ）には含まれていない。

---

## 4. テスト

| ファイル | 追加件数 | 内容 |
|---|---|---|
| `tests/modules/me-next/me-next-shell.test.js` | 3 | Premium CTAクリック→Billing遷移、Pro CTAクリック→Billing遷移、要素未マウント時も例外なし |

既存17件（うち今回3件追加前は14件）全PASS。テスト実装中に、既存の`showBillingNext`モックが
`beforeEach`でリセットされておらずテスト間で呼び出し回数が累積するバグ（既存テストは実行順の
偶然で見えていなかった）を発見し、`mockShowBillingNext`を明示的にリセットする形に修正した
（`getSubscriptionViewModel`モックは既に同パターンでリセットされていたため、それに合わせた）。

---

## 5. Build / Regression結果

```
npm run build   → PASS
npx vitest run  → PASS（321 test files / 5,542 tests, 0 failures）
```

---

## 6. 実ブラウザ確認（Browser Visual Gate）

**未実施。** CLAUDE.mdの規定により、AIはBrowser Verificationを自己判断で実施しない。
以下はFounderが通常ブラウザで確認すべき手順。

```
Browser Verification Required:
  対象: Me画面（Runtime, Feature Flag ippo_me_ui_v2=ON時）
  理由: PR-ME-REBUILD-01で追加したPlanカード2枚（Premium/Pro）が実際に正しく描画され、
        CTAがBilling画面へ正しく遷移するか、実ブラウザでの視覚的確認が必要
  確認方法:
    1. localStorage.setItem('ippo_me_ui_v2', 'true') を設定してMe画面を開く
    2. プライバシーカードの直後にPremiumカード（薔薇色見出し）とProカード
       （金色見出し）が縦に並んで表示されることを確認
    3. 各カードにタグラインと「Premiumを見る」「Proを見る」ボタンが表示され、
       機能一覧リストは表示されない（意図的な要約表示）ことを確認
    4. 「Premiumを見る」タップ → Billing画面へ遷移することを確認
    5. 「Proを見る」タップ → Billing画面へ遷移することを確認（同じくBilling画面トップ）
    6. Billing画面自体の見た目・機能一覧・モーダルに変化が無い（Billing側は無変更）ことを確認
    7. Flag OFFの場合はLegacy Me画面が表示され、回帰が無いことを確認
    8. Console/Networkタブでエラーが出ていないことを確認
```

---

## 7. Definition of Done 判定

| 項目 | 判定 |
|---|---|
| Prototype準拠のPlanカード2枚がMeに存在 | ✅ |
| Billing独立画面は無変更 | ✅ |
| 課金ロジックの二重実装なし | ✅ |
| Consent UI維持（削除していない） | ✅ |
| Build PASS | ✅ |
| Regression zero-diff | ✅ |
| Browser Visual Gate PASS | ❌ **未実施（Founder確認待ち）** |

**「完全統合」とはまだ記録しない。** Founderの実ブラウザ確認（§6）の完了をもって
「Me統合完了」と記録する。

---

## 8. 次のステップ

合意した実装順の通り、本PRのFounder Browser Verification完了後に
**Billing Checkout設計・接続**へ進む。
