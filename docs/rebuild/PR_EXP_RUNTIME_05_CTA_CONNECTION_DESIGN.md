# PR-EXP-RUNTIME-05: Prototype CTA → ApiGateway接続 — 設計確認（実装なし）

対象: PR-EXP-RUNTIME-04で確立した正規経路（ApiGateway→CommandService→
LifecycleService→Repository）へ、Prototype Experiment画面のCTA（実験開始等）
を接続する場合の設計確認のみ。**このPRではコード変更を行わない。**
書込みCTAの実装は、この設計確認をFounderがレビューした後に別PRとして着手する。

## 1. 最重要の発見: UIコードがApiGatewayへ到達する手段が現状存在しない

`ApiGateway`は`composition-root.js`の`TOKENS.ApiGateway`としてDI登録されて
いる（`src/application/composition-root.js:1248`）が、リポジトリ全体を
検索しても**`container.resolve(TOKENS.ApiGateway)`を呼んでいる箇所が
一件も存在しない**。

`src/main.js`は`src/bootstrap/app-bootstrap.js`の`boot()`を呼び、
`boot()`は`CompositionRoot.assemble()`でDIコンテナを組み立てた後、
`Application(container).initialize()`を呼ぶ。しかし`Application.initialize()`
（`src/application/app.js`）が実際にresolveするのは`TOKENS.LegacyBridge`
のみで、`ApiGateway`は一度もresolveされず、`window`にも一切公開されていない。
`container`自体も`boot()`関数内のローカル変数で、外部からアクセスできない。

つまり、**Experiment以外を含めApiGateway層全体が、DI登録済みだが
UIから到達不可能な状態**にある（PR-EXP-RUNTIME-01/04で判明した
Experiment個別の未接続とは別の、より根本的なブートストラップ層の
ギャップ）。

この状態でPrototype UIのCTAを接続するには、以下のいずれかが必要になる:

```
a. window.ippoApiGateway のような一時的なグローバルブリッジを追加する
   （home-next-shell.jsのwindow.ippoHomeNext等、既存の window.ippo* 
   パターンに倣う）
b. app-bootstrap.js/Application を拡張し、resolveしたApiGatewayを
   何らかの形でUI到達可能にする（設計変更の度合いが大きい）
c. 他の正式な導線がFounder側で既に構想されている
```

これは「Experiment CTAをどう接続するか」以前の、**Application層全体に
共通するブートストラップ設計の未決事項**であり、Experimentドメイン単体の
判断では決められない可能性がある。Founder確認が必要。

## 2. CTA → ApiGatewayメソッドの対応案（実装イメージ、未確定）

Prototype Experiment画面（`prototype/index.html`）のCTAのうち、今回
PR-EXP-RUNTIME-02で表示のみ実装済みの範囲との対応:

| Prototype CTA | 対応するApiGatewayメソッド | 備考 |
|---|---|---|
| 実験ライブラリのカードをタップ→実験開始 | `createExperiment(data)` → `startExperiment(id)` の2回呼び出し | DRAFT作成後に即ACTIVEへ遷移させる想定。1呼び出しで済ませる利便メソッドを追加するかはFounder判断（出力14には無い） |
| 「今日もOK」ボタン（進行中実験） | **該当なし** | DRAFT/ACTIVE/COMPLETED/ABANDONEDのいずれの遷移にも当たらない。Outcome記録等、Experiment外のドメインに属する可能性があり、このPRのスコープでは判断できない |
| 「この実験を試してみる」（おすすめの実験） | 未実装（PR-EXP-RUNTIME-02で意図的に省略） | ExperimentNudgeService接続（別PR、NUDGE-01）が前提になるため、それまで対象外 |
| 実験の中止 | `abandonExperiment(id, reason)` | Prototype画面に対応する明示的なUI操作が見当たらず（今回確認した範囲では「いつでもやめられます」という文言のみ）、CTA自体の設計がPrototype側にまだ無い可能性がある |

## 3. Adapter境界の設計方針（案）

`experiment-next-adapter.js`（Read-only）とは別に、書込み用のAdapter
（例: `experiment-next-command-adapter.js`）を新設し、CTAのクリックハンドラは
このAdapterの関数のみを呼ぶ形にする想定。UI（shell.js）からApiGatewayを
直接呼ばせない、という既存のArchitecture境界（禁止: UIからRepository/
Supabase直接呼び出し）と同じ考え方をApiGateway呼び出しにも適用する。

## 4. 結論

上記1（ApiGateway到達手段の欠如）が最優先の確認事項。この設計確認の結果を
Founderがレビューし、到達手段の方針（a/b/cのいずれか）が確定してから
書込みCTAの実装（新PR）に着手する。「今日もOK」ボタンの扱いも、
Experiment外ドメインへの越境の可能性があるため別途整理が必要。
