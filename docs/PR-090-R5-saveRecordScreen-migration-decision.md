# PR-090-R5 — saveRecordScreen Migration Decision

> 目的: `saveRecordScreen()`を`app-legacy.js`から物理移動できるか判定する。
> 本文書はコード変更を伴わない調査・判定のみ（Founder確認事項の整理）。
> 前提: PR-090-R4（[EXPORT_HUB_REFACTOR_COUNCIL.md](EXPORT_HUB_REFACTOR_COUNCIL.md) 6-4節）で
> saveRecordScreenの物理移動は「5関数重複問題が未解消のため見送り」と結論済み。
> 本PRはその5関数を実コードで比較し、移動可否をFounderが判断できる材料を揃える。

---

## 1. 背景

`saveRecordScreen()`（app-legacy.js、記録画面の保存ハンドラ）は以下5関数を
bare呼び出ししている。

- `buildHomeWeekRow`
- `updateHomeInsightCard`
- `updateHomeNumbers`
- `updateHomeDiseaseAdvice`
- `updateHomeCTAState`

これら5関数はいずれも **`app-legacy.js`側のローカル実装** と
**`src/modules/home-renderer.js`側のexport実装** の2実装が並存している
（PR-080Eで新規発見・Founder判断により据え置き済み、
docs/HANDOFF_PHASE7_COMPLETE.md PR-080E節参照）。

`saveRecordScreen`を単純に物理移動すると、移動先モジュールが5関数の
どちらの実装をimportするかという選択自体がBusiness Logic変更のリスクを
伴う。本文書はこの5関数を実コードで比較し、移動可否を判定する。

---

## 2. 手法

`src/app-legacy.js`側の5関数の実装と、`src/modules/home-renderer.js`側の
5関数の実装を全文比較。あわせて、**実際にどちらの実装が呼ばれているか**を
呼び出し経路ごとに追跡した（app.htmlのonclick解決先・window export・
ES module内のbare識別子解決の3種を区別）。

---

## 3. サマリー

**両実装は現在も同時に生存しており、トリガーによってどちらが描画されるか
異なる（pre-existingの実挙動不整合、本Council調査で新規発見）。**

| 呼び出し元 | 呼び出し方 | 実際に解決される実装 |
|---|---|---|
| `ippo:state-ready`イベント（起動時1回、ownership-map.js STEP 6） | `window.buildHomeWeekRow()`等 | **home-renderer.js版**（RenderAuthority経由） |
| bottom-nav タブ切替（`onclick="switchTab('home', this)"`） | `window.switchTab`（tab-navigation.js版、app-legacy.js側は`window.switchTab`を設定しないため常に敗北） → `window.buildHomeWeekRow()`等 | **home-renderer.js版** |
| `document.addEventListener('DOMContentLoaded', ...)`（app-legacy.js冒頭付近、起動時1回） | bare `buildHomeWeekRow()`等 | **app-legacy.js版** |
| `saveRecordScreen()`（記録保存時、毎回） | bare `buildHomeWeekRow()`等 | **app-legacy.js版** |
| `saveEditRecord()`（day-detail経由の記録編集時） | bare `updateHomeCTAState()`のみ | **app-legacy.js版** |
| `closeModal()`内の`switchTab(_prevTab, prevBtn)`（record-modal閉時、bare呼び出し） | app-legacy.js自身の`switchTab`（bare、window.switchTabとは別物） | app-legacy.js版switchTab自体は生存 → 中身は上記「タブ切替」行と同じ5関数のwindow版呼び出しではなくbare呼び出し（1163〜1167行）のため**app-legacy.js版** |

**結論: 「物理移動すればどちらか一方に統一される」のではなく、
現在すでに両実装がユーザー操作の種類によって使い分けられている
（意図された設計ではなく、2つの独立した移行過程が競合して残った状態）。**
`saveRecordScreen`の移動は、この既存の二重状態のうち「保存直後の描画」だけを
どちらの実装に固定するかという選択になる。

---

## 4. 関数別 差分表

| 関数 | app-legacy.js版 | home-renderer.js版 | 差分の性質 |
|---|---|---|---|
| **buildHomeWeekRow** | 週7日を**正方形セル**で描画。`painLevel`に応じた4段階の背景色グラデーション（無記録/軽度/中度/重度）+ 生理周期フェーズ色。**副作用として`buildPhaseBar(monday)`も呼ぶ**。 | 週7日を**円形セル**で描画。記録の有無のみで✓/+/空を出し分け（痛みレベルの色分けなし、周期フェーズ色なし）。`buildPhaseBar`は呼ばない。 | **UI（見た目）が別デザイン**。同一機能に対する2つの異なるビジュアル実装であり、統合はUI変更そのもの。 |
| **updateHomeInsightCard** | `window.buildHomeInsight()`（新しめのインサイト生成関数）があればそちらを優先使用、無ければ旧ロジック（週内痛み日数/らくな日数/平均痛みスコアの3パターン）にフォールバック。`moduleHidden`チェックなし。 | `window.buildHomeInsight()`は参照しない。旧ロジック3パターンに加え、**疾患別追加文言**（子宮内膜症時）と**睡眠×痛み相関の追加文言**を持つ。`card.dataset.moduleHidden === '1'`なら早期return（Settings > ホームモジュール表示設定を尊重）。 | **生成されるインサイト文言の内容が異なる**（Business Logic差）。さらにhome-renderer.js版のみユーザーのホームモジュール表示設定を尊重する。 |
| **updateHomeNumbers** | streak/次の生理までの日数を`home-streak-num`/`home-next-num`等に反映。 | 同一ロジック + `home-next-info`要素にも同内容を反映（表示先DOM要素が1つ多い）。 | 軽微（表示先DOM要素の差のみ、計算ロジックは同一）。 |
| **updateHomeDiseaseAdvice** | 疾患別デイリーヒントを表示。`moduleHidden`チェックなし。 | 同一ロジック + `card.dataset.moduleHidden === '1'`なら早期return。 | 軽微〜中程度（ホームモジュール表示設定の尊重有無）。 |
| **updateHomeCTAState** | 「今日の記録」の完了判定基準が**「今日の日付のrecordが1件でも存在するか」**。完了時の文言は「✓ 今日の記録完了」。 | 完了判定基準が**「today's recordの`meta.uiFlow === 'daily-checkin'`か」**（`_isDailyCheckinCompleted`）。完了時の文言は「✓ 今日をふり返る」、未完了時のsub文言も異なる。 | **Business Logicが明確に異なる**。`record.meta.uiFlow`は`record-three-card.js`（3-card daily-checkin入力）が付与するフラグで、`daily-record-card-guard.js`（Hotfix）・`today-reflection.js`もこの基準を正としている。app-legacy.js版は**この新しい判定基準を反映していない旧ロジック**。 |

---

## 5. 重要な追加発見

1. **app.htmlのbottom-nav「ホーム」ボタンは、実際にはapp-legacy.js版の
   switchTabを一切呼んでいない。** `onclick="switchTab(...)"`は
   `window.switchTab`（`tab-navigation.js`がexport、main.js読み込み順で
   app-legacy.jsより後にロード）に解決される。`app-legacy.js`は
   `window.switchTab`を設定しないため、**app-legacy.js側のswitchTab
   （1148行、5関数のbare呼び出しを含む）はbottom-nav経由では到達しない**。
   ただし`closeModal()`内の`switchTab(_prevTab, prevBtn)`（record-modal
   閉時のbare呼び出し）は同ファイル内解決のためapp-legacy.js版が生きている
   ——つまりswitchTab自体もこの5関数と同型の「2実装並存・別経路で両方生存」
   状態にある（本文書のスコープ外だが、PR-091 Legacy Exit Auditで
   考慮すべき別課題として記録）。
2. **`updateHomeCTAState`の判定基準の違いは、単なる重複ではなく
   「機能追加が片方にしか反映されていない」状態。** `daily-record-card-guard.js`
   のコメント（「空/自動生成に近い今日recordを『記録済み』扱いしない」）が
   示す通り、`uiFlow === 'daily-checkin'`基準はHotfixとして意図的に導入された
   もの。app-legacy.js版のCTAは、記録画面（`saveRecordScreen`経由の保存）
   から戻った直後にこのHotfix以前の基準で「完了」表示を出してしまう
   ——**今まさに起きている可能性のあるUXの矛盾**（3-card入力を使わず
   `saveRecordScreen`経由で保存した場合、home-renderer.js版CTAの基準では
   「未完了」のはずが、app-legacy.js版が直後に上書きし「完了」と表示する）。
3. これらの発見はいずれも**本文書作成による調査のみで判明したpre-existingの
   状態**であり、PR-090-R1〜R4のいずれの変更によっても発生していない。

---

## 6. 選択肢の評価

| 選択肢 | 内容 | 評価 |
|---|---|---|
| **A. app-legacy.js版を正として移動** | `saveRecordScreen`と5関数をまとめてapp-legacy.js側の実装で新モジュール化 | `buildHomeWeekRow`の正方形デザインが「保存直後」以外の全画面（起動時・タブ切替）でも表示されることになり、home-renderer.js版（円形）との統一にはなるが、現状「タブ切替では円、保存直後は四角」という不整合を「常に四角」に倒す＝**現状のhome-renderer.js版表示（起動時・タブ切替時に多くのユーザーが目にしている方）を置き換えるUI変更**。`updateHomeCTAState`もHotfix以前の基準に戻ることになり、Hotfixの意図と矛盾する**Business Logic後退**。 |
| **B. home-renderer.js版を正として統合** | `saveRecordScreen`側の5関数呼び出しをhome-renderer.js版のimportに差し替え | Hotfix基準・ホームモジュール表示設定を尊重する現在支配的な実装に統一されるため設計的には筋が良いが、**保存直後の週間カレンダー行の見た目が正方形→円形に変わり、CTAの完了判定基準も変わる**（保存しても「今日をふり返る」表示にならないケースが出うる）——これも**ユーザーから見えるUI/Business Logic変更**であることに変わりはない。 |
| **C. saveRecordScreenは現状維持** | 本PRでは何も変更しない | **Business Logic変更・UI変更ゼロ**。ただし5関数の重複およびCTA判定基準の不整合という pre-existing の問題はそのまま残存し、`saveRecordScreen`は今後もapp-legacy.js削除の障壁であり続ける。 |
| **D. β後にUI/UX Final Councilで決める** | 本PRはFounderへの報告のみに留め、統合方針（A/B/別案）自体をUI/UX観点を含めてβ後の会議体に委ねる | Cと同じくBusiness Logic変更・UI変更ゼロ。加えて、選択がエンジニアリング上の物理移動の都合ではなく**プロダクト/UX判断**（どちらの週間カレンダーデザインを残すか、CTA完了基準をどちらに正式統一するか）であることを明示的に切り分けられる。 |

---

## 7. 推奨案

**D（β後にUI/UX Final Councilで決める）を推奨する。Cと同一の措置（現状維持）を
即座に取りつつ、統合可否の判断主体をエンジニアリングからプロダクト/UXへ
明示的に移管する。**

理由:
- A/Bのいずれも、5関数のうち少なくとも`buildHomeWeekRow`（デザイン差）と
  `updateHomeCTAState`（完了基準の差）は**実装統合ではなくプロダクト判断**
  そのものである（「どちらの週間カレンダーの見た目が正しいか」
  「記録完了の定義をどちらにするか」はコードの綺麗さではなくユーザー体験の
  問題）。
- 本Programの制約（Business Logic変更禁止・UI変更禁止）の下では、
  A/Bどちらを選んでも制約に抵触する。制約を満たせる選択肢はC/Dのみ。
- CとDの違いは実質的な挙動ではなく「次に誰が・いつ決めるか」の記録であり、
  Dを選んでおくことで本問題が再度sleepしたまま忘れられることを防げる
  （HANDOFFのNextに明記）。

---

## 8. Release Risk

**Release Risk: Low（本PRでコード変更を行わないため）。**

ただし将来A/Bいずれかを選択して実装する際のRelease Riskは以下の通り:

| 項目 | Risk | 理由 |
|---|---|---|
| `buildHomeWeekRow`統合 | **Medium〜High** | 全ユーザーが毎日目にするホーム画面最上部のビジュアルが変わる。デザインレビュー・スクリーンショット比較が必須。 |
| `updateHomeCTAState`統合 | **Medium** | 「今日の記録完了」表示条件が変わるため、3-card入力を使わないユーザー（`saveRecordScreen`経由の保存のみ利用）にとって体感的な変化が生じる可能性。 |
| `updateHomeInsightCard`統合 | **Low〜Medium** | 表示される文言のバリエーションが増減する（機能追加/削除どちらの向きでも軽微なコンテンツ変化）。 |
| `updateHomeNumbers`/`updateHomeDiseaseAdvice`統合 | **Low** | 差分が軽微（DOM要素1つ・表示フラグ1つ）で挙動への実質的影響は小さい。 |

---

## 9. Founder確認事項（この判断を待って停止する）

```
□ 選択肢A/B/C/Dのいずれを採用するか
□ Dを採用する場合、「UI/UX Final Council」をβ後のどの時点で開催するか
  （Release Readiness Council・Wave3 Roadmap起点との前後関係）
□ updateHomeCTAStateの完了判定基準（「記録さえあれば良い」か
  「daily-checkin経由のみ」か）は、daily-record-card-guard.js Hotfix導入時に
  Founderとして正式決定済みか、それとも今回が初めての気づきか
  （初めての場合、Hotfixの影響範囲を再確認する別課題が生まれる可能性）
```

---

## 判定

```
saveRecordScreenの物理移動: 見送り（選択肢C/Dのいずれかを採用するまで、
Legacy Removal Programとしてはこれ以上進めない）。

Business Logic変更: なし（本PRはコード変更ゼロ）
UI変更: なし
saveRecordScreenの即時移動: 実施せず
app-legacy.js削除: 実施せず

Founder判断待ち。
```
