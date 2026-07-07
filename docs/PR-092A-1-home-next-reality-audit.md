# PR-092A-1 — home-next 実態調査（Reality Audit）

> 目的: General Release時点で実際にユーザーが見ているHome実装を確定し、PR-092Bのスコープが
> 正しい前提の上に立っているかを検証する。
> 本文書はコード変更を伴わない調査のみ（Business Logic変更・UI変更・実装は一切行っていない）。
> 前提: PR-092A（Home Cluster統合）の Browser Verification 中に、`src/modules/home-next/` という
> 既存文書のいずれにも記載のなかった並行実装の存在が判明したため、Founder指示により実施。

---

## 1. 調査対象・手法

```
対象:
  - src/modules/home-next/（home-next-shell.js 他11ファイル）
  - src/screens/home-next.html
  - window.showMain / window.ippoHomeNext.render()
  - saveRecordScreen 保存後の再描画経路
  - updateHomeCTA / updateHomeCTAState / Home Cluster の関係
  - #screen-home と home-next の表示優先順位

手法:
  - 実コード読解（grep + 全文確認）
  - 開発サーバー（vite dev）上でのブラウザ実測（state.jsへ直接シードデータを注入し、
    保存・タブ切替を模擬実行してDOMの実際の変化を確認）
  - Business Logic変更・UI変更・実装は一切行っていない（確認のみ）
```

---

## 2. 結論サマリー（Executive Summary）

```
1. 実際に表示されるHomeは home-next である（デフォルト有効。#screen-home はDOM上に
   存在し続けるが、通常のユーザー操作では画面に表示されない）。

2. 保存直後、home-next は自動的には更新されない（実測確認）。

3. タブ切替時、home-next は正しく最新状態に再描画される（実測確認）。

4. PR-092B（saveRecordScreen物理移動）は、home-next対応を追加しなくても
   「物理移動のみ」というスコープのまま完結できる。home-nextへの即時反映が
   ないことは本Programが生んだギャップではなく、home-next自体の既存設計
   （タブ切替時にのみ再描画する設計）であり、saveRecordScreenの移動可否とは無関係。

5. PR-092Bのスコープは実質的に変更不要。ただし「正当化の理由」を修正する
   （4章参照）。home-nextへの即時反映を追加することはBusiness Logic拡張に
   該当するため、PR-092Bのスコープには含めず、別途Founder判断が必要な項目として
   切り出す。

判定: PR-092Bへ進めてよい（4章の「Founder確認事項」を除く）。
```

---

## 3. 調査結果詳細

### 3-A. #screen-home と home-next の表示優先順位

```
src/modules/home-next/home-next-shell.js:62-72（isHomeNextEnabled()）:
  st.homeNextEnabled === false の場合のみ無効。それ以外（未設定含む）はデフォルト有効。
  localStorage['ippo_home_next'] === '0' の場合のみ無効。

  → デフォルト有効（opt-out方式）。

src/main.js:194 のコメント「フラグOFFの場合は既存homeに影響しない」は、
opt-in方式を前提にした陳腐化した記載であり、実装（opt-out方式）と矛盾する。

initHomeNext()（home-next-shell.js:253-262）:
  isHomeNextEnabled() が true の場合、window.showMain を showHomeNext に差し替え、
  patchTabNavigation() で window.switchTab も差し替える。

実測（開発サーバー、フラグ未設定の初期状態）:
  window.getCurrentScreen() → "home-next"
  document.getElementById('screen-home')?.classList.contains('active') → false
  document.getElementById('screen-home-next')?.classList.contains('active') → true
  document.getElementById('home-week-row') → 存在する（#screen-home内、非表示のまま残存）

結論: home-next がデフォルトで表示される。#screen-home は削除されておらず
DOMに存在し続けるが、通常操作でユーザーの目に触れることはない。
```

### 3-B. home-next 無効化スイッチの不具合（副次的発見）

```
disableHomeNext()（home-next-shell.js:75）は localStorage の FLAG_KEY を削除するのみ:
  export function disableHomeNext() { try { localStorage.removeItem(FLAG_KEY); } catch {} }

しかし isHomeNextEnabled() は「flag !== '0'」を有効条件としているため、
キーが削除された（= null）状態は「'0' ではない」ため有効と判定されてしまう。

実測: state.homeNextEnabled = false をlocalStorageの保存stateに設定した上でreloadしても、
      currentScreen は "home-next" のままだった（無効化されなかった）。

これは本調査で新たに発見した pre-existing のバグであり、PR-092A-1のスコープ外
（Business Logic修正が必要なため）。Founderへの参考情報として記録するのみとする。
```

### 3-C. 保存直後の home-next 再描画（実測）

```
手順:
  1. 開発サーバーにレコード5件（今日の記録なし）をシードし、home-next表示を確認
     （#hn-status の「炎症負荷」が「中程度」と表示されることを確認）
  2. window.saveRecordScreen() を直接呼び出し、今日の記録（painLevel低め）を保存
  3. 保存直後（画面遷移前）の #hn-status の内容を確認

結果:
  state.records.length: 5 → 6（保存は正常に成功）
  document.getElementById('screen-home-next').classList.contains('active'): true（変化なし）
  #hn-status の内容: 保存前と同じ「炎症負荷: 中程度」のまま変化なし

結論: saveRecordScreen() は home-next の再描画を一切トリガーしない。
      window.ippoHomeNext.render() の呼び出しはコードベース全体で以下2箇所のみ
      （grep確認済み）:
        - src/modules/app-bootstrap.js:236（cloudRestore成功時）
        - src/modules/home-next/home-next-shell.js:213（settings-profile-changedイベント時）
      記録保存イベントに紐づく呼び出しは存在しない。
```

### 3-D. タブ切替時の home-next 再描画（実測）

```
手順（3-Cの続き、保存直後の状態から）:
  4. window.switchTab('home', null) を呼び出す（bottom-nav「ホーム」タップ相当）

結果:
  #hn-status の内容: 「炎症負荷: 中程度」→「炎症負荷: 低い、安定しています」に変化
  （直前に保存した今日の低め記録が反映された）

結論: home-next は switchTab('home', ...) 経由で正しく最新state を反映する。
      home-next-shell.js の renderAll()（146行）は毎回 getState() を呼び直す設計のため、
      呼び出されさえすれば常に最新値を描画する。「保存後にstaleな表示が残る」という
      意味でのバグではなく、「保存直後・画面遷移前の一瞬」だけ更新されないという、
      home-next自体の設計（タブ切替時にのみ再描画）に起因する。
```

### 3-E. updateHomeCTA / updateHomeCTAState / Home Cluster の関係

```
updateHomeCTA()（home-renderer.js:1061、PR-092Aの対象外）は、updateHomeCTAState()とは
別の第3の実装で、同じ #home-cta-title / #home-cta-sub / #home-cta-card を対象にする。
判定基準も異なる（isPeriodExpected() による「生理がきた？」プロンプトを含む、
daily-checkin基準を認識しない旧ロジック）。

呼び出し順序（app-legacy.js内、grep確認済み、全4箇所）:
  1198: updateHomeCTA(); → 1199: updateHomeCTAState()
  1418: updateHomeCTA(); → 1419: updateHomeCTAState()
  1877: updateHomeCTA(); → 1878: updateHomeCTAState()
  1020: updateHomeCTAState() のみ（updateHomeCTA呼び出しなし）

結論: updateHomeCTA() は必ず updateHomeCTAState() の直前に呼ばれており、
      DOM上の最終的な表示は常に updateHomeCTAState()（PR-092Aで統合済みの実装）が
      上書きするため、機能的な不具合は発生していない。ただし updateHomeCTA() 自体は
      「呼ばれるが結果が常に即座に上書きされる」実質的な無意味コードであり、
      別途の技術負債整理候補として記録する（Home Clusterの6関数には含まれておらず、
      Council決定の対象外）。
```

### 3-F. saveRecordScreen の到達経路（再確認）

```
#screen-record（saveRecordScreen()の保存ボタンを含む画面）には
data-legacy-isolated="2026-05-27" data-replacement="screen-record-three-card" という
HTML属性が付与されているが、これは「将来置き換える意図」を示す注記であり、
実際の到達性を示すものではない。

実コード確認の結果、以下の現役経路から #screen-record が実際に表示されることを確認:
  - calendar.js / timeline.js の editPastRecord(dateStr) 呼び出し
    （「この日の記録を作成する」「過去日の記録を編集」ボタン、日常的に使われる機能）
    → record-screen.js の editPastRecord() が直接 #screen-record を active化（480-481行）
  - window.openLegacyRecordScreen（app-legacy.js:2237、"➕" nav ボタン専用の明示的経路）

一方、home CTA からの通常の新規記録フローは window.openRecordScreen 経由だが、
これは record-three-card.js が先にロードされ window.openRecordScreen を占有するため
（app-legacy.js:2227-2234 のコメントで明記済み）、通常は3-card UIが開き、
#screen-record ではない。

結論: saveRecordScreen() は「カレンダー経由の過去日編集」という現役の経路を持ち、
      Dead Codeではない。PR-090-R5時点の記述（「カレンダー編集分岐で使用」）と整合する。
```

---

## 4. PR-092B スコープの再定義

### 4-A. 変更が必要な点

```
なし。PR-092B（saveRecordScreen のapp-legacy.jsからの物理移動、PR-092A統合後のHome Cluster
呼び出しへの配線）は、home-next の存在・挙動と独立して完結できる。理由:

  - saveRecordScreen() の責務は「データ永続化 + 呼び出し可能な範囲でのUI即時反映」であり、
    home-next への即時反映は home-next 自体が「タブ切替時にのみ再描画する」設計を
    採用しているため、saveRecordScreen側が何かを追加で呼ぶ必要がない。
  - PR-092Aで統合したHome Cluster（buildHomeWeekRow等）への呼び出しは、
    #screen-home が非表示でも実行され続けて問題ない（副作用がなく、対象DOMが
    存在しない場合は早期returnするだけ）。
  - saveRecordScreen自体の到達経路（カレンダー経由の過去日編集）は確認済みの現役機能。
```

### 4-B. 正当化理由の修正（Council Reportからの変更点）

```
修正前（UI/UX Final Council Report）:
  「Home Cluster統合により、保存直後の見た目の一貫性が改善される」

修正後（本調査を踏まえて）:
  「home-nextがデフォルト表示のため、Home Cluster統合自体が保存直後の見た目に
    与える影響はユーザーにはほぼ見えない。PR-092Bの主な価値は
    (a) app-legacy.js の継続的な削減（Legacy Removal Programの目的）、
    (b) #screen-home 経由の到達経路（home-next無効時、または将来home-nextが
        撤去された場合）における一貫性確保、
    (c) saveRecordScreenをapp-legacy.jsという凍結ファイルから解放し、
        通常のモジュールとしてメンテナンス可能にすること
    に純化される」
```

### 4-C. PR-092Bのスコープに含めないこと（Founder判断が必要な別項目として切り出し）

```
以下はPR-092Bの「物理移動のみ」という制約を超えるため、スコープに含めない。
実施する場合は別途Founder確認・別PRとする:

  □ saveRecordScreen() から window.ippoHomeNext.render() を呼び、
    保存直後にhome-nextへ即時反映させる（Business Logic拡張に該当）
  □ disableHomeNext() のバグ修正（3-B節、localStorage削除ではなく '0' を明示設定する）
  □ updateHomeCTA()（第3の実装、3-E節）の削除・整理（Home Cluster 6関数の
    Council決定対象外のため、別途の技術負債整理として扱う）
  □ src/main.js:194 の陳腐化したコメント修正（home-next のfeature flag挙動の実態と
    一致させる）
```

---

## 5. Founder確認事項

```
□ 4-Cの4項目について、PR-092Bとは別に対応が必要か（対応する場合は別PR/別Councilで）
□ home-next の存在・デフォルト有効という前提を踏まえた上で、PR-092Bへ進めてよいか
  （本調査の結論: 進めてよい）
□ 3-Bで発見したdisableHomeNext()の不具合について、緊急度の判断
  （現状ユーザーがhome-nextを無効化する手段がないことを意味するが、
    home-next自体は正常に機能しているため、ユーザー体験の破綻ではない）
```

---

## 6. 判定

```
PR-092Bへ進めてよい。

理由:
  - saveRecordScreenの物理移動は home-next の有無・挙動と独立して安全に実施できる
  - saveRecordScreen自体は Dead Code ではなく、カレンダー経由の過去日編集という
    現役の到達経路を持つ
  - home-nextへの即時反映という新機能はBusiness Logic拡張であり、PR-092Bのスコープには
    含めない（4-C参照、別途Founder判断が必要な項目として切り出し済み）

Business Logic変更: なし（本調査はコード変更ゼロ）
UI変更: なし
次のアクション: Founder承認後、PR-092B（saveRecordScreen物理移動、4-Bの修正済み
正当化理由を採用）に着手する。
```

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-UI-UX-PR-092A-1 |
| **作成日** | 2026-07-07 |
| **権威レベル** | 調査報告書（Founder確認待ち） |
| **実装状況** | コード変更ゼロ。本書は調査結果の記録のみ |
| **検証方法** | 実コード全文確認（grep+読解）+ 開発サーバーでのブラウザ実測（state注入・save/switchTab実行・DOM確認） |
| **前提文書** | docs/HANDOFF_PHASE7_COMPLETE.md（PR-092A節）/ docs/PR-090-R5-saveRecordScreen-migration-decision.md / docs/DECISION_4_RECORD_MODAL_REVIEW.md |
| **判定** | PR-092Bへ進めてよい。4-Cの項目は別途Founder判断が必要な切り出し事項として記録 |
| **次のアクション** | Founder判断待ち（5章参照）。承認後PR-092Bへ着手 |
