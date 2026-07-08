# HOME WEEK ROW REMOVAL AUDIT
## buildHomeWeekRow() / 週間カレンダーバー 削除・保留・移植 判断監査

---

> **文書権威レベル: LEVEL-1 STRATEGIC DOCUMENT（調査専用）**
>
> 本文書は、PR-EXP-04（Home週間行の日付・記録表示復旧）の判定保留を受け、
> `buildHomeWeekRow()` および週間カレンダーバー機能を削除・保留・移植のいずれとすべきかを
> 設計・実装・将来計画の観点から監査するものである。**コード変更・削除・実装は一切行っていない。
> 調査と設計判断のみである。**

---

**文書番号:** IPPO-HOMEWEEKROW-AUDIT-001
**作成日:** 2026-07-07
**契機:** PR-EXP-04着手時に発覚した「home-next有効時、`window.buildHomeWeekRow`がno-op化され、
描画先DOM（`#home-week-row`）も非表示になっているため、home-renderer.js側の修正が
ユーザーに一切届かない」という実装ギャップ（Founder報告済み）
**検証方法:** リポジトリ全体のコード参照調査（Grep）+ 既存Council文書（Phase2関連4文書）の再読解。
新規のブラウザ操作検証は前回セッション（PR-EXP-04調査時）の実測結果をそのまま根拠として使用。

---

## Executive Summary

週間カレンダーバー（`buildHomeWeekRow()` / `#home-week-row`）は、**4件のLEVEL-1governing文書
（PHASE2_IMPLEMENTATION_COUNCIL.md・PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md・
PHASE2_ARCHITECTURE_FREEZE.md・PHASE2_GOVERNANCE.md）すべてにおいて、Home画面の
恒久的な構造要素（Final Visionまで不変）として明記されている**。削除や恒久的な保留を
正当化する記述は、調査した全文書中に一件も存在しなかった。

一方、実装上は home-next（デフォルト有効）が `window.buildHomeWeekRow` を明示的に
no-op化し、描画先DOM自体も非表示にしているため、**設計文書が前提とする「週間行は
Homeに存在する」という状態と、実装の実態（週間行はどのユーザーにも見えない）が
完全に乖離している**。これは Phase2 の `hn-experiment-card`（PR-P2-01）の
Browser Verification 項目が週間行の表示を前提としていることから、Phase2着手前に
解消しなければ Phase2 自体の検証が成立しなくなるという実務上の緊急性も伴う。

判定: **C. Migrate（home-nextへ移植する）**。詳細根拠は第6章参照。

---

## ① 参照調査

### 検索対象と結果

`buildHomeWeekRow` / `window.buildHomeWeekRow` / `home-week-row` をリポジトリ全体
（`src/`・`tests/`・`docs/`）で検索した。

#### src/ 内の参照（現役コード）

| ファイル | 内容 | 状態 |
|---|---|---|
| `src/modules/home-renderer.js:190` | `buildHomeWeekRow()` 本体定義 | 実装済み・ロジック健全（後述③参照） |
| `src/modules/home-renderer.js:571` | `updateHomeCTAState()`等から内部呼び出し | 現役（呼び出されるがno-op経由） |
| `src/modules/home-renderer.js:1143-1144` | `window.buildHomeWeekRow = buildHomeWeekRow` 代入 | 現役（ただしhome-next初期化後は上書きされる） |
| `src/app-legacy.js:166,1283` | import・DOMContentLoaded内でのbare呼び出し | 現役（旧Home画面向け） |
| `src/screens/home.html:36` | `<div id="home-week-row">` DOM定義 | 現役だがhome-next有効時は非表示 |
| `src/modules/record-screen.js:59,684` | 保存直後の再描画呼び出し | 現役（record保存フロー内） |
| `src/modules/onboarding-runtime.js:11,43` | オンボーディング完了時の再描画呼び出し | 現役 |
| `src/modules/tab-navigation.js:271` | Homeタブ切替時の再描画呼び出し | 現役 |
| `src/modules/ownership-map.js` 複数箇所 | render-authority経由のラップ・スロット管理 | 現役（ownership基盤には正式登録済み） |
| `src/modules/ownership-registry.js:178,220` | REGIONS定義（`HOME_WEEK_ROW`） | 現役（ただし`selector: '.home-week-row'`は実DOMの`id`属性と不一致、メタデータ上の軽微な不整合） |
| `src/modules/render-authority.js:251` | SLOTS定義（`HOME_WEEK_ROW: 'home-week-row'`） | 現役 |
| **`src/modules/home-next/home-next-shell.js:242`** | **`window.buildHomeWeekRow = noOp;`** | **home-next初期化時に無条件で上書き。以降実体に到達不能** |
| `src/modules/home-next/home-next-shell.js:17,33` | Feature Parity Map・Legacy dependency map内の記載 | ドキュメンテーションコメント（移植未完了として明記） |

#### tests/ 内の参照

`buildHomeWeekRow`/`home-week-row` の直接的な振る舞いを検証するテストは**存在しない**。
唯一のヒットは `tests/arch/legacy-removal-pr079-line-count-guard.test.js` 内の
PR-092A行数変遷コメント（コード参照ではなくドキュメンテーション文字列）のみ。
→ **この機能は現時点でテストカバレッジがゼロ**。削除・移植いずれの判断をしても
既存テストへの影響はないが、裏を返せば現在の壊れた状態（no-op化）も
テストでは検知できていない。

### 呼び出しチェーンの実態（PR-EXP-04調査で実測済み）

1. `window.buildHomeWeekRow` は `ownership-map.js` の `_wrapRender()` によって
   render-authority経由のラップ関数に置き換えられる。
2. しかし `_wrapRender()` が `original = window['buildHomeWeekRow']` を捕捉する時点で、
   home-next-shell.js の `noOp` 代入が**先に**実行されているケースでは、
   `original` はno-op自体になる。
3. 実測（`AUTH.request`の引数を横取りして確認）で、`original` の実体が
   `() => {}` であることを確認済み。
4. 加えて、描画先の `#home-week-row` は `#screen-home` 配下にあるが、
   home-next有効時は `#screen-home` が非active（`offsetParent === null`）のため
   そもそも画面に存在しても不可視。

### 結論（①）

- **現在参照されているか**: コード上は9ファイル・14箇所以上から参照されており、
  「呼ばれていない」わけではない。むしろ save/onboarding/tab-switch等、複数の
  現役フローから呼び出されている。
- **将来参照予定か**: `ownership-map.js`・`render-authority.js`・`ownership-registry.js`
  という「PR-092以降に新設された現行アーキテクチャ基盤」に正式登録されており、
  廃止予定のマークは一切ない。
- **dead codeか**: **否**。呼び出し元は生きているが、home-next側の`noOp`代入により
  「呼んでも効果がない」状態であり、古典的な意味でのdead code（呼び出し元が存在しない
  コード）ではない。むしろ「生きているのに機能しない」という別種の不具合である。

---

## ② home-next設計上の位置付け

### home-next-shell.js Feature Parity Map（実装コメント）

```
✅ covered by home-next  ┆  ⬜ legacy-only (未移植)
✅ Hero / greeting       ┆  ⬜ 週間カレンダーバー (buildHomeWeekRow)
```

home-next-shell.js は自らのコメントで、週間カレンダーバーを「legacy-only（未移植）」と
明記している。これは「移植の意図はあるが未完了」という位置付けであり、
「意図的に廃止する」という記述ではない。同ファイルはさらに、
Legacy dependency map として `window.buildHomeWeekRow → home-renderer.js:buildHomeWeekRow`
という対応関係を明示しており、将来この関数を置き換える形で移植することを
前提とした構造になっている。

### ownership-map.js

`ownership-map.js` は `buildHomeWeekRow` を `home-module` の管理対象として正式に
オーナーシップ登録し（27・32・232行）、render-authority経由の重複描画防止ラップも
適用している。これは「まだ使う現役コード」として扱われていることを意味する。
廃止対象のコードであれば、そもそもownership登録・render-authorityラップの対象に
含める必要がない。

### AI_EXECUTION.md

`AI_EXECUTION.md` には週間行固有の記載は存在しない（PR実行時の汎用ルールのみを定めた
軽量ランタイム文書のため）。本項目については中立。

### GENERAL_RELEASE_IMPLEMENTATION_MASTER_PLAN.md

Master Plan（PR Master List）は PR-EXP-04 の対象モジュールを
`src/modules/home-renderer.js` とのみ記載しており、home-next側への言及がない。
これは Master Plan 作成時点（GENERAL_RELEASE_EXPERIENCE_COUNCIL.mdの実機検証結果を
そのまま踏襲）で、「週間行はhome-next裏で完全に無効化されている」という実装の実態が
把握されていなかったことを示唆する（後述③・⑤で詳述）。**Master Planの対象ファイル
指定はこの監査により更新が必要と考えられる**。

### 結論（②）

home-next設計の内部では「Legacy廃止予定」と位置付ける記述は一切なく、
一貫して「home-nextへ移植予定（未完了）」として扱われている。

---

## ③ Phase2との整合

Phase2関連のLEVEL-1文書4件すべてで、週間行はHomeの恒久的構成要素として
明記されている。

### PHASE2_IMPLEMENTATION_COUNCIL.md（Final Vision逆算設計）

- 第4章 Information Architecture（Phase2版）Home優先順位リストの **5番目**に
  「週間記録行（不変、PR-EXP-04で復旧予定）」と明記。6番目が新規Phase2要素
  （`hn-experiment-card`）であり、週間行はその**直前**に位置づけられている。
- Phaseロードマップ表（第1章）では「Final | 骨格（CTA→気づき→状態→週間）は不変。
  表示される中身の知性だけが10年かけて深化する」と明記。週間行はHomeの
  「骨格」を構成する4要素の一つとして、General ReleaseからFinalまで
  10年間変更されない前提で設計されている。

### PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md（General Release修正 vs Phase2再設計 判断会議）

- 第3章画面別監査で、週間行を明示的に **分類1（今すぐ修正すべきもの＝Phase2の構想が
  実装されてもこの部分の構造・役割は変わらない）** と判定。
- 判定理由: 「週間行の日付・記録表示欠落は、Phase2の有無に関わらず存在する不具合であり、
  Phase2実装後もこの部分の役割は変わらない」
- 同文書はPR-EXP-04自体を「**Proceed**（無条件）」と判定している
  （「Phase2のhn-experiment-cardとは別領域。既存不具合を直すのみ」）。
  ただしこの判定は「前回Councilの実機所見をそのまま根拠として使用」しており、
  home-next側のno-op化・DOM非表示という実装の実態までは検証していない
  （検証方法欄に明記: 新規のブラウザ操作検証は行っていない）。

### PHASE2_ARCHITECTURE_FREEZE.md

- 「週間表示・AIカード・Status Card」節: 「週間記録行（PR-EXP-04で復旧予定）、
  今日のインサイト1件、状態カード4枚は、いずれもPhase2で位置・役割を変更しない。
  Phase2の新規要素はこれらの『下』に追加されるのみである」
- Information Priority節: 「CTA→今日のインサイト→疾患別ヒーロー→状態カード→
  **週間行（継続の可視化）**→実験提案」という視線誘導の優先順位を明記。
  週間行の役割を明示的に「継続の可視化」と定義している（④のUX評価と直結）。
- **PR-P2-01（hn-experiment-card）自体のBrowser Verification項目**に
  「週間行の日付表示」が含まれている（206-208行）。これは、Phase2の
  hn-experiment-card実装時点で週間行が正しく表示されていることを
  **前提条件**としていることを意味する。

### PHASE2_GOVERNANCE.md（Information Density Freeze）

- Home画面の情報量上限「最大6ブロック」の内訳として
  「CTA・今日のインサイト・ヒーロー・状態カード・**週間行**・実験提案の6種を上限とし、
  7つ目のブロックは追加しない」と明記。週間行はHomeの6ブロック構成の
  正式な一員として、ガバナンス上固定（Freeze）されている。

### 結論（③）

週間行は Phase2 の新規機能（Experiment Suggestion・Question Layer等）による
「置き換え対象」ではなく、それらの**土台となる既存構造**として、4件の
governing文書すべてで一貫して必要と位置づけられている。さらに
PR-P2-01自体の完了条件が週間行の表示を前提としているため、**週間行を
放置したままPhase2（特にPR-P2-01）に着手すると、Browser Verification自体が
成立しなくなる**という実務上の依存関係が存在する。

---

## ④ UX観点

### 週間行は継続率・記録モチベーションに寄与しているか

PHASE2_ARCHITECTURE_FREEZE.mdが週間行の役割を明示的に「継続の可視化」と
定義している通り、週間行は「直近7日間、いつ記録したか」を視覚的に一覧化する
唯一の要素である。`buildHomeWeekRow()`の実装（home-renderer.js:190-251）を見ると、
記録がある日は痛みレベルに応じた色分けされたチェックマーク、今日は「+」の
強調表示、それ以外は薄い枠線のみという設計になっており、
「今日はまだ記録していない」ことに気づかせ、記録を促す視覚的トリガーとして
機能する設計である。これはGROWTH_STRATEGY.md 6-Cが定める「督促ではなく
気づかせる通知」という原則（PHASE2_IMPLEMENTATION_COUNCIL.md第10章でも
踏襲）と同じ思想に基づく、**通知に頼らない継続動機付けの主要な仕掛け**と
位置付けられる。

### 代替UXは存在するか

home-next側には、`home-next-insights.js`（236-244行）に
「今週は${week.length}日、記録が続いています」という**テキストのみの**
条件付きインサイトが存在する。ただしこれは:

- 直近7日の記録が5日以上あり、かつ他に優先度の高いインサイトがない場合のみ
  出現する条件付き・非常設の表示であり、
- 「どの曜日に記録したか／していないか」という**空間的・視覚的な粒度**を
  提供しない（合計日数のみのテキスト表現）、
- Settings画面には「記録日数」「連続日数」という数値バッジが存在するが、
  Home画面内には存在せず、ユーザーは別タブへ移動しないと確認できない。

したがって、**現状home-next内に週間行と同等の代替UXは存在しない**。
テキストインサイトは部分的な代替にはなり得るが、視覚的な7日間カレンダー
ストリップとしての機能（どの曜日が空白か一目で分かる）は代替されていない。

### 結論（④）

週間行は「毎日開きたくなるUX」「継続率」「記録モチベーション」に対して、
設計文書上も実装ロジック上も明確な寄与を持つ要素であり、home-next側に
機能的に同等な代替は存在しない。

---

## ⑤ 削除した場合の影響

| 領域 | 影響 |
|---|---|
| **Business Logic** | 影響なし。`buildHomeWeekRow()`は`state.records`を読み取るのみの純粋な描画関数であり、状態の書き込み・Business Logicへの副作用は一切ない（`buildPhaseBar()`の呼び出しも同様に描画専用）。削除してもデータ層・Domain層には波及しない。 |
| **Analytics** | 影響なし。週間行はイベント発火・計測タグを持たない純粋なUI描画であり、Analytics層との接続は確認されなかった。 |
| **Home UX** | **影響大**。④で述べた通り、継続可視化・記録動機付けの主要な視覚的仕掛けが失われる。GENERAL_RELEASE_EXPERIENCE_COUNCIL.mdの評価でもHome体験の減点理由として明示的に挙げられている（「Home体験 15点中9点、週間行・Empty Stateガイダンスに欠落」）。 |
| **Progress（進捗管理）** | 影響なし。`totalDays`/`streak`等の進捗指標はrecord保存ロジック側（`saveRecordScreen`等）で独立して計算されており、週間行の描画有無に依存しない。 |
| **Future Roadmap** | **影響大**。③で述べた通り、PHASE2_IMPLEMENTATION_COUNCIL.md・PHASE2_ARCHITECTURE_FREEZE.md・PHASE2_GOVERNANCE.mdの3文書がHomeの「骨格」「6ブロック上限」の一員として週間行を明記している。削除すると、これら3件のLEVEL-1文書との間に新たな矛盾が生じ、Decision Log改訂（新Council開催）が必要になる。さらにPR-P2-01（hn-experiment-card）のBrowser Verification項目が週間行の表示を前提としているため、削除するとPhase2着手時に当該PRの完了条件を別途再定義する必要が生じる。 |

---

## ⑥ 判定

### 選択肢の評価

- **A. Delete（完全削除）**: 不採用。③⑤で示した通り、4件のLEVEL-1文書が
  週間行をHomeの恒久的構成要素として明記しており、削除を正当化する記述は
  どこにも存在しない。削除するとPhase2側の複数文書との矛盾が新たに生じ、
  かつPR-P2-01の完了条件が満たせなくなる。
- **B. Archive（Legacyとして保存、現状は使わない）**: 不採用。これは実質的に
  「現状維持」と同義であり（すでにhome-next有効時は誰にも見えていない状態が
  継続する）、③で確認したPR-P2-01の前提条件（週間行が表示されていること）を
  満たせないままPhase2に突入するリスクをそのまま先送りするだけである。
- **C. Migrate（home-nextへ移植する）**: **採用**。理由は以下の通り。
  1. home-next-shell.js自身が「legacy-only（未移植）」と明記しており、
     移植は既存設計が予定していた方向性と一致する。
  2. Phase2の4文書すべてが週間行をHomeの恒久要素として前提にしており、
     移植によって初めてこれらの文書と実装が整合する。
  3. PR-P2-01（hn-experiment-card）の完了条件が週間行の表示を前提とするため、
     Phase2着手前（できればPR-EXP-04の段階）で移植を完了させる必要がある。
  4. `buildHomeWeekRow()`自体のロジックは健全（PR-EXP-04調査で実証済み）であり、
     再設計ではなく「描画先をhome-next側のDOM・レンダリングパイプラインに
     つなぎ直す」作業で足りる可能性が高く、C案の実装コストはA・D案からの
     再設計コストより低いと見込まれる。
- **D. Keep（現状維持）**: 不採用。「現状維持」は実質的にB（Archive）と
  同じ結末（home-next裏で無効化されたまま）になるため、独立した選択肢としての
  合理性がない。

### 最終判定: **C. Migrate（home-nextへ移植する）**

---

## PR-EXP-04 再判定

### Proceed / Modify / Defer / Cancel

**判定: Modify**

### 理由

Master Plan記載の元のスコープ（`src/modules/home-renderer.js`内の修正のみ）は、
本監査により**home-nextが有効な限りユーザーに一切効果が届かないこと**が
確定した（PR-EXP-04調査時の実測 + 本監査の文書横断調査で二重に裏付け済み）。
したがって元のスコープのまま Proceed することは、実質的に何も解決しない
無効なPRとなる。

一方、Cancel（完全に取りやめる）は⑥で示した通り不適切である。週間行は
Phase2の前提条件でもあり、いずれ必ず対応が必要になる。Defer
（無期限保留）も、PR-P2-01がこの機能の存在を前提にしている以上、
Phase2着手前には解消しておく必要があるため、単純な先送りは
Phase2全体のスケジュールリスクを増大させる。

よって、PR-EXP-04は**スコープを修正（Modify）した上でProceedすべき**という
判定になる。修正後のスコープ案（実装はまだ行わない、次回Founder確認事項として提示）:

```
対象モジュール（修正案）:
  - src/modules/home-next/ 配下（home-nextの描画パイプラインへの週間行相当機能の追加）
  - src/modules/home-renderer.js（buildHomeWeekRow()自体は既存ロジックを流用可能、
    描画先の付け替えが主作業）
完了条件（修正案）:
  - home-next有効時（デフォルト）に、直近7日間の日付・記録有無が視覚的に表示される
  - PHASE2_GOVERNANCE.mdのHome最大6ブロック制約を超えない
Release Risk: 低〜中（新規DOM統合を伴うため、元のRelease Risk「低」からわずかに格上げが妥当）
```

**本項目はスコープ変更（home-renderer.js単体修正 → home-next統合）を伴うため、
AI_EXECUTION.mdの定めに従い、実装着手前に改めてFounder承認を要する。**

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-HOMEWEEKROW-AUDIT-001 |
| **権威レベル** | LEVEL-1 STRATEGIC DOCUMENT（調査専用、コード変更ゼロ） |
| **調査範囲** | src/全体のGrep参照調査、docs/内Phase2関連4文書の再読解 |
| **コード変更** | ゼロ |
| **削除** | 行っていない |
| **実装** | 行っていない |
| **次のアクション** | PR-EXP-04の修正スコープ案についてFounder確認後、着手可否を判断 |
