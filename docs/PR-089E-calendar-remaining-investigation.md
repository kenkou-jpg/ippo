# PR-089E — Calendar Remaining Migration 事前調査（AMBIGUOUS 3件・コード変更ゼロ）

> **PR番号:** PR-089E（Batch-11分割④、`docs/LEGACY_REMOVAL_PLAN.md` 10-C章記載）
> **Mode:** FULL（Legacy Removal Program配下）
> **実装方針:** 本PRは調査のみ。Business Logic変更・物理移動・統合・削除・
> `BASELINE_LINE_COUNT`更新のいずれも実施しない（Founder承認・2026-07-04）。
> app-legacy.js への変更は一切なし。

---

## 0. 背景

`docs/PR-089A-legacy-final-cutover-audit.md` 3-D章でAMBIGUOUS判定された3件
（`openDayDetail` / `mergeRecords` / `getGreetingText`）のうち、`openDayDetail`は
PR-089D（Home Remaining Migration）で`openDayDetailByDate`をスコープ外とした理由
（Calendar側`calYear`/`calMonth`・AMBIGUOUS判定済み`openDayDetail`への依存）として
名指しされ、PR-089E（Calendar Remaining Migration）へ持ち越されていた。

PR-089E着手にあたりFounderへ確認した結果、以下の方針が確定した:

```
□ openDayDetailのAMBIGUOUS解消（実装比較・依存関係確認・同一性判定・削除可能性判定）を
  PR-089Eのスコープに含める
□ 残り2件（mergeRecords / getGreetingText）も同じ扱いとする
□ ただし、Business Logic変更・統合・削除・window bridge変更は一切実施しない
□ 実際の統合・削除はPR-089Z（Final Cutover）でまとめて実施する
```

さらに、Calendarクラスタの残存関数を実測した結果、`app-legacy.js`に残る
Calendar関連コードは `calYear`/`calMonth`（1953行目）・`openDayDetailByDate`
（1354行目）・`openDayDetail`（2531行目）の3点のみであり、いずれも
`openDayDetail`のAMBIGUOUSと不可分であることが判明した。統合を伴わずに
安全に物理移動できるCalendar関数は存在しないため、Founder確認の上、
**PR-089Eは調査のみで完了とし、Calendarクラスタの物理移動・統合はPR-089Zへ
先送りする**方針とした。

---

## 1. `openDayDetail`

### 所在
- `src/app-legacy.js:2531`（ローカル関数宣言、export/window設定なし）
- `src/modules/calendar.js:27`（`export function`、かつファイル末尾で`window.openDayDetail = openDayDetail;`）

### 実装比較
両実装はHTML生成ロジック（タグ・記録内容の描画）が実質同一だが、状態アクセス方法が異なる:

| 項目 | app-legacy.js版 | calendar.js版 |
|---|---|---|
| 年月 | ローカル変数 `calYear`/`calMonth` | `window.calYear`/`window.calMonth`（未設定時はモジュールローカルにフォールバック） |
| レコード取得 | ローカル `state.records`（`_ippoStateHooks`経由で最新stateに同期） | `getState().records` |
| エスケープ | ローカル `escapeHtml()` を直接呼び出し | `window.escapeHtml` があれば使用、なければ非エスケープ |

### 依存関係・呼び出し経路
2つの独立した経路が同じDOM（`#dmDate`/`#dmBody`/`#dmOverlay`）に収束している:

1. **Home画面の週セルクリック** → `openDayDetailByDate`（app-legacy.js、bare呼び出し）
   → ローカル`calYear`/`calMonth`を設定 → bare `openDayDetail(...)` →
   **app-legacy.js側のローカル実装が実行される**（ES moduleのため`calendar.js`側の
   `window.openDayDetail`上書きはbare呼び出しに影響しない）。
2. **Calendar画面の月表示グリッドクリック**（`src/modules/calendar-next.js:505-510`）
   → `window.calYear`/`window.calMonth`を設定 → `window.openDayDetail(day)` →
   **calendar.js側の実装が実行される**（`window.openDayDetail`はcalendar.jsのみが
   設定しているため）。

app.html/calendar.html内に`onclick="openDayDetail(...)"`という文字列呼び出しは存在しない
（要確認済み・grep該当なし）。

### 判定
- **同一性:** 機能的に同一（同じ日次記録詳細モーダルを同じ見た目で描画する）だが、
  コードは別実装。状態アクセス方法の差異により、record データの表示内容が完全に
  一致する保証はコード読解のみでは確証できない（`state`と`getState()`は
  `_ippoStateHooks`により同期されるため通常は同値だが、タイミング依存の
  エッジケースは未検証）。
- **削除可能性:** **削除不可（現状）**。両実装ともライブ経路を持ち、片方を単純に
  削除するとその経路（Home週セル or Calendar画面グリッド）の日次詳細モーダルが
  動作しなくなる。統合するには「どちらの実装を正とするか」「呼び出し元
  （`openDayDetailByDate`とcalendar-next.jsのクリックハンドラ）をどう向け直すか」
  というBusiness Logic判断が必要 → **PR-089Z対応**。

---

## 2. `mergeRecords`

### 所在（非export・各ファイルにprivateなローカル関数として3箇所存在）
- `src/app-legacy.js:698`
- `src/services/supabase.js:88`
- `src/services/recovery.js:21`

### 実装比較
- **app-legacy.js版とsupabase.js版はバイト完全一致**（ID未設定レコードには
  `Date.now().toString(36) + Math.random()...`で自動採番してからマージ）。
- **recovery.js版は意図的に異なる実装**。ID未設定のローカルレコードは
  自動採番せず単純にスキップする（`if (r.id) merged[r.id] = r;`）。
  recovery.js内のコメントに「R-2: IDなしレコードはスキップ（recovery.js既存方式を採用）」
  と明記されており、既存の設計判断として意図的な差異であることが確認できる。

### 依存関係
3ファイルとも`mergeRecords`はfile-local（非export）であり、それぞれ自身の
クラウド同期／復元フロー内でのみ使用されている。ES moduleのためファイル間の
名前衝突・bare呼び出しの取り違えリスクはない（`openDayDetail`のような
window経由の経路混線は発生しない）。

### 判定
- **同一性:** app-legacy.js版とsupabase.js版は**真の重複**（同一ロジック）。
  recovery.js版は**別物**（意図的な仕様差異、統合対象外）。
- **削除可能性:** app-legacy.js版は、同ファイル内3箇所（654・786・830行目）の
  呼び出し元がCloud Sync本体ロジック（`renderSyncUI`等、PR-089Cで一部移植済みの
  周辺機能）に依存しているため、単純削除は不可。app-legacy.js側の当該呼び出し元を
  supabase.js側の実装に向け直す統合作業が必要 → **PR-089Z対応**。recovery.js版は
  統合対象から除外（意図的な差異のため現状維持が正）。

---

## 3. `getGreetingText`

### 所在（非export・各ファイルにprivateなローカル関数として2箇所存在）
- `src/app-legacy.js:968`
- `src/modules/home-renderer.js:58`

### 実装比較
**バイト完全一致**。引数なし・状態非依存の純粋関数（`new Date().getHours()`のみを
参照し、時間帯に応じた挨拶文字列を返す）。

### 依存関係
両ファイルとも自身の`updateGreeting()`内でのみ使用（app-legacy.js:977、
home-renderer.js:119）。file-local・非export、ES moduleのため名前衝突リスクなし。

### 判定
- **同一性:** **真の重複**（3件中もっとも単純・リスクが低いケース）。状態を
  参照しないため、どちらの実装を使っても結果は常に同一。
- **削除可能性:** 理論上は片方を削除しもう片方からimportする統合が安全に可能だが、
  Business Logic変更禁止の方針により本PRでは実施しない → **PR-089Z対応**。

---

## 4. 結論・Next

- AMBIGUOUS 3件はいずれも「統合が必要な真の重複、または意図的な差異」であることが
  判明した。削除するだけで解決するものはない。
- Calendarクラスタ（`calYear`/`calMonth`/`openDayDetailByDate`/`openDayDetail`）は
  `openDayDetail`のAMBIGUOUSと不可分のため、PR-089Eでは物理移動を実施しない。
- 本PRでの`app-legacy.js`への変更はゼロ（`BASELINE_LINE_COUNT`更新なし）。
- Calendarクラスタの物理移動・AMBIGUOUS 3件の統合は、いずれも**PR-089Z（Final Cutover）**
  でまとめて実施する。
- Next: **PR-089F — Utility / Misc Remaining Migration**（Founder承認済み、
  Auto Progressive Executionにより連続着手）。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-LEGACY-089E |
| **作成日** | 2026-07-04 |
| **権威レベル** | 調査記録（`docs/PR-089A-legacy-final-cutover-audit.md` 3-D章の補足） |
| **検証方法** | 既存コードの読解・grepによる呼び出し元確認のみ（コード変更・実行時検証は未実施） |
| **判定** | 3件とも統合作業が必要（削除のみで解決するものなし）。統合はPR-089Zへ先送り |
