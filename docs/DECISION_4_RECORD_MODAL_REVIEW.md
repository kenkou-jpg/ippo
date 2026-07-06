# Decision-4 Founder Review — saveRecord / record-modal系

> 目的: `saveRecord`/`#record-modal`/`openRecordModal`/`closeModal`/`saveAndSync`/
> `nextStep`/`prevStep`/`renderStep`/`buildSteps`を、削除・修復・β後延期のいずれに
> 分類するかFounderが判断するための資料。
> 本文書はコード変更を伴わない調査のみ（Business Logic変更禁止）。
> 前提: `docs/LEGACY_COMPLETION_RECOVERY_PLAN.md` 2-4節・2-5節（Decision-4として
> 2026-07-05時点で既に未決事項化）、`docs/PR-089F-7F-safe-dead-candidates-investigation.md`、
> `docs/PR-089F-7G-ambiguous-shims-final-classification.md`、
> `docs/PR-089Z-final-cutover-decision.md`（いずれもBatch-11期の既存調査）。
> 本書はこれらの既存調査を2026-07-06時点の実コードで再確認し、統合・更新したものである。

---

## 1. 対象と現状サマリー

| 対象 | 所在 | 現状 |
|---|---|---|
| `#record-modal` | `app.html:1178-1204` | 2026-05-27付けで「LEGACY — SOFT-ISOLATED」と明記済み |
| `openRecordModal()` | `app-legacy.js:1179`（ローカル実装）+ `record-modal-controller.js:32`（no-opラッパー） | ローカル実装は`handleHomeCTA`のfallback経由で**現に呼ばれ得る**。no-opラッパーの方は外部から呼んでも何もしない |
| `closeModal()` | `app-legacy.js:1204`（ローカル実装）+ `record-modal-controller.js:38`（no-opラッパー） | ローカル実装は内部フロー（Escapeキー等）で機能する。`window.closeModal`（HTML onclick経由）はno-op |
| `saveRecord()` | `app-legacy.js:1272-1359` | **到達経路ゼロ**（bare呼び出しなし、`window.saveRecord`ブリッジはrecord.js自身の自己参照no-opラッパーのみ） |
| `saveAndSync` | ①`app-legacy.js`内bare呼び出し（`saveRecord`内2箇所+`saveRecordScreen`内1箇所）②`record-modal-controller.js`のno-opラッパー | **名前は同じだが実体は2つ**（4節参照）。①は`src/modules/save-and-sync.js`の実装を指し**現役**。②（`window.saveAndSync`）はno-op |
| `nextStep`/`prevStep`/`renderStep`/`buildSteps` | `app-legacy.js`内（旧5ステップwizard専用のローカル実装）+ `record-input.js`（現行フロー用の別実装、「同一実装」とコメントされた独立コピー） | app-legacy.js版は`#record-modal`内でのみ使用。record-input.js版は現行の記録入力フローで現役 |

---

## 2. 到達経路の全体像（実コード確認済み）

```
[通常フロー]
bottom-nav「記録」→ handleHomeCTA()（home-renderer.js）
  → window.openRecordScreen が定義済み（record-three-card.js等がロード成功） → 3-card UI（現役）

[フォールバック経路 — record-three-card.js未ロード時のみ]
handleHomeCTA() → window.openRecordScreen が未定義
  → window.__ippoLegacyOpenRecordModal()（app-legacy.js:1215のブリッジ）
  → openRecordModal()（app-legacy.js:1179、ローカル実装）
  → #record-modal が表示される（renderStep()もapp-legacy.js自身のローカル実装を使用、正常動作）

[フォールバック経路がここまで到達した場合の既知の問題]
- 背景タップで閉じる（onclick="closeModal()" → window.closeModal）
  → record-modal-controller.jsのno-opラッパー → 何も起きない（閉じない）
- Escapeキーで閉じる（app-legacy.js:691、bare closeModal()）
  → app-legacy.js自身のローカル実装 → 正常に閉じる（背景タップとは異なる経路のため生存）
- 「次へ」を5回押して最終ステップで保存（onclick="nextStep()" → record-input.jsのnextStep）
  → window.saveRecord() を呼ぶ → record.js自身の自己参照no-opラッパー
  → 何も保存されない（データロスト、成功メッセージも出ない）
```

**この「フォールバック経路」自体は、record-three-card.js（現行の記録入力UI）が何らかの理由で
ロードに失敗した場合にのみ発生する。通常運用では到達しない。**

---

## 3. 各要素の詳細確認

### 3-1. `saveRecord()` — 到達経路ゼロ

- `app-legacy.js`内でbare呼び出しは1件もない（定義のみ）。
- `window.saveRecord`への代入は`src/modules/record.js:625`
  （`if (typeof window.saveRecord !== 'function') { window.saveRecord = saveRecord; }`）
  のみで、これはrecord.js自身のトレースラッパー。
- `record.js`の`callExistingFunction('saveRecord', ...)`は
  `window['saveRecord'] !== exportedFunctions['saveRecord']`の場合のみ委譲するが、
  `window.saveRecord`は常にrecord.js自身（`exportedFunctions.saveRecord`）と同一参照のため、
  この条件は常にfalse。**呼んでも何も起きない（no-op）ことを実コードで確認済み。**
- `record-input.js:708`の`nextStep()`が`window.saveRecord()`を呼ぶが、上記の通り無効。

### 3-2. `openRecordModal()` — フォールバック経路として現に生存

- `app-legacy.js:1215`: `window.__ippoLegacyOpenRecordModal = openRecordModal;`
- `home-renderer.js:1074`（`handleHomeCTA()`内）:
  ```js
  } else if (typeof window.__ippoLegacyOpenRecordModal === 'function') {
    window.__ippoLegacyOpenRecordModal(); // fallback: record-three-card.js 未ロード時のみ
  }
  ```
- **`openRecordModal`は「呼び出し元ゼロ」ではない。** record-three-card.jsが正常にロードされる
  限りこの分岐には到達しないが、ロード失敗時の唯一のフォールバックとして機能する設計。
- `record-modal-controller.js`側の`export function openRecordModal()`（`window.openRecordModal`）は
  別物で、こちらはno-op（3-4節参照）。

### 3-3. `closeModal()` — 経路によって挙動が割れている

- app-legacy.js内のbare呼び出し3箇所（Escapeキー処理691行目、`saveRecord()`内2箇所）は、
  ES moduleのスコープ規則により常にapp-legacy.js自身のローカル実装を指すため**正常動作**。
- `app.html:1184`の`onclick="closeModal()"`（モーダル背景タップ）は`window.closeModal`
  （グローバルスコープ）を呼ぶ。これは`record-modal-controller.js`が上書きしており、
  中身は次の通り（現行コード確認済み・変更なし）:
  ```js
  const _inlineCloseModal = typeof window.closeModal === 'function' ? window.closeModal : null;
  export function closeModal() {
    if (typeof _inlineCloseModal === 'function') return _inlineCloseModal.apply(this, arguments);
  }
  window.closeModal = closeModal;
  ```
  `app-legacy.js`は`window.closeModal`を一度も設定しないため`_inlineCloseModal`は常に`null`。
  **背景タップで閉じようとしても何も起きない（no-op、ユーザー影響のある潜在バグ）。**

### 3-4. `saveAndSync` — 同名だが実体が2つある（本レビューでの新規整理）

これは既存調査（PR-089F-7F/7G）でも触れられていたが、本レビューで改めて明確化する。

- **実体A（現役）**: `src/modules/save-and-sync.js`の`saveAndSync()`。
  `window.ensureRecordIds()`/`window.saveState()`/`syncRecordImmediately()`を呼ぶ、
  実際に動作する実装。`app-legacy.js`はこれをimportしており、
  `saveRecord()`内2箇所（1296/1339行目、旧5ステップwizard内）と
  **`saveRecordScreen()`内1箇所（2129行目、現行の記録画面保存フロー、
  `editingDate`分岐＝カレンダー経由の記録編集時）**の計3箇所から呼ばれる。
  `window.__ippoLegacySaveAndSync`として自己export済み（PR-090-R2）、
  `fasting.js`/`quick-log.js`もこの実体を明示的に参照する。
- **実体B（no-op）**: `record-modal-controller.js`の`saveAndSync()`。`window.saveAndSync`を
  占有しているが、`_inlineSaveAndSync`キャプチャが常に`null`のため何もしない。
  `app.html`のonclick等、`window.saveAndSync()`を明示的に呼ぶコードが存在すれば影響するが、
  現行`app.html`にそのようなonclickは存在しない（`#record-modal`内に`saveAndSync()`を
  直接呼ぶボタンはない——保存は`nextStep()`経由の`saveRecord()`が担う設計）。

**結論: `saveAndSync`という「概念」はDead Codeではない。現行の記録保存フロー
（`saveRecordScreen`のカレンダー編集分岐）でも使われている、正真正銘の現役コードである。
Dead/no-opなのは`record-modal-controller.js`側の`window.saveAndSync`ラッパーのみ。**
将来この一帯を整理するPRでは、`src/modules/save-and-sync.js`自体には一切触れず、
`record-modal-controller.js`の`saveAndSync`export + `window.saveAndSync`代入のみを
対象とする必要がある（誤って`save-and-sync.js`を削除すると`saveRecordScreen`の
カレンダー編集フローが壊れるため、細心の注意が必要）。

### 3-5. `nextStep`/`prevStep`/`renderStep`/`buildSteps`

- `app-legacy.js`側のローカル実装（旧5ステップwizard専用）は、`#record-modal`の
  `onclick="prevStep()"`/`onclick="nextStep()"`（グローバルスコープ、`window.*`経由）、
  および`openRecordModal()`内の`renderStep()`呼び出し（bare、ローカル）からのみ使われる。
- `record-input.js`側は同名だが独立した別実装（ファイル内コメントで「app-legacy.js:XXXX
  ○○()と同一実装」と明記）で、現行の記録入力フロー（3-card UI）が使用する現役コード。
  **両者は無関係な別コピーであり、統合されていない。**
- app-legacy.js側の4関数はいずれも`#record-modal`経由でしか到達せず、
  かつ最終的な保存（`nextStep`→`saveRecord`）が3-1節の通り無効化されているため、
  **「モーダルの中を行き来できるが、保存はできない」状態。**

---

## 4. Release Risk

**Release Risk: Low〜Medium（新規変更なし、現状維持の場合）。**

| リスク | 内容 |
|---|---|
| データロストの潜在バグ | record-three-card.jsのロードに失敗した稀なケースで、ユーザーが`#record-modal`
フォールバックに到達し、5ステップ入力後「次へ」を押しても保存されない（無言の失敗、
成功メッセージも出ない）。発生条件が「主要UIのロード失敗」という稀な状況に限定されるため
発生頻度は低いと推定されるが、発生した場合のユーザー影響は大きい（記録データの喪失）。 |
| モーダルが閉じないバグ | 同フォールバック到達時、背景タップで閉じられない（Escapeキーのみ有効）。同上、発生頻度は低い。 |
| フォールバック自体の削除リスク | もし`openRecordModal`/`#record-modal`を削除した場合、record-three-card.jsが
将来ロードに失敗するケースで「記録する手段が一切ない」状態になる（現状は壊れたモーダルが
出るだけマシ、という考え方もできる）。フォールバックの要否自体がプロダクト判断。 |
| 削除の実施コスト | `#record-modal`のHTML削除は`app.html`変更を伴う（Legacy Removal Programの
標準的な禁止事項）。`saveAndSync`は実体が2つあるため、削除PRは高い精度で
`record-modal-controller.js`側のみを対象にする必要がある（誤削除で現役コードを壊すリスク）。 |

---

## 5. 選択肢の評価

| 選択肢 | 内容 | 評価 |
|---|---|---|
| **A. 今すぐ修復** | `window.saveRecord`/`window.closeModal`/`window.openRecordModal`の
ブリッジを実装に正しく結線し、旧5ステップwizardを実働のfallbackとして復活させる | 現在no-opの挙動が
「実際に保存される」に変わるため**Business Logic変更**に該当（本レビューの禁止事項、かつ
Legacy Removal Programの標準的な禁止事項）。また「壊れたfallbackを直す」以前に
「このfallback自体を今後も残すべきか」という設計判断が先に必要。 |
| **B. 今すぐ削除** | `#record-modal`のHTML、`saveRecord`/`nextStep`/`prevStep`/`renderStep`/
`buildSteps`（app-legacy.js版）、`openRecordModal`/`closeModal`（app-legacy.js版+
record-modal-controller.js版）、`record-modal-controller.js`の`saveAndSync`部分を削除 | `app.html`変更を
伴う（UI変更として別途承認が必要）。`handleHomeCTA`のfallback分岐自体も削除する必要があり
（さもないと`window.__ippoLegacyOpenRecordModal`未定義エラーの分岐が残る）、これは
「record-three-card.jsロード失敗時のフォールバックを持たない」という**可用性設計の変更**
でもある。`saveAndSync`の実体分離（3-4節）を誤ると現役コードを破壊するリスクもある。 |
| **C. β後UI/UX Final Councilへ延期** | 統合方針（fallbackを残すか、直すか、廃止するか）自体の
判断をβ後の会議体に委ねる | Home Cluster（Decision-3）と同型の性質——「削除/修復いずれを
選んでも製品判断が伴う」ため、Founderが既に採用した枠組みと一貫する。 |
| **D. Legacy Exit Auditから除外** | Known Deferred Itemとして今後の監査対象から外す | Cと併用可能
（Home Clusterで採用した「D+C」の組み合わせと同型）。 |

---

## 6. 推奨案

**D + C（Home Clusterと同型の扱い）を推奨する。**

理由:
- 3つの要素（`saveRecord`のno-op、`closeModal`のno-op、`openRecordModal`の
  fallback機能）は互いに独立した「単純なDead Code」ではなく、**「record-three-card.js
  ロード失敗時のフォールバックUXをどう設計するか」という一つのプロダクト判断**に
  収斂する。今すぐ直す（A）にせよ消す（B）にせよ、その前提として
  「フォールバック自体の要否」を誰かが決める必要があり、これはエンジニアリング側の
  Legacy Removal作業の範疇を超える。
- `saveAndSync`の実体分離（3-4節）は、削除PRの実施難度を上げる要因であり、
  今すぐ着手するにはリスクが高い。方針確定後、着手前に改めて詳細設計を行うべき。
- Home Cluster（Decision-3）と全く同じ理由構造（どちらを選んでもBusiness Logic/UI変更、
  Legacy Removalの目的を超える）であるため、既にFounderが下した判断との一貫性を保てる。

---

## 7. Founder確認事項

```
□ 選択肢A/B/C/Dのいずれを採用するか（推奨: D+C）
□ Dを採用する場合、Home Clusterと同じβ後UI/UX Final Councilで扱うか、
  別の会議体・タイミングとするか
□ 「record-three-card.jsロード失敗時のフォールバック」という設計自体を
  今後も維持したいか（維持するなら修復が必要、不要なら削除でよい、
  この一次判断がA/B/Dいずれを選ぶかの前提になる）
□ 万一この判断を待つ間に本フォールバック経路が実際にトリガーされた場合
  （record-three-card.jsのロード失敗）、ユーザーがデータを保存できない
  無言の失敗が起きるリスクを許容するか、それとも緊急の別対応
  （例: フォールバック自体を一時的にコメントアウトし記録画面へのリンクに差し替える等）を
  検討すべきか
```

---

## 8. 判定

```
saveRecord / record-modal / openRecordModal / closeModal / saveAndSync（record-modal-
controller.js側）/ nextStep・prevStep・renderStep・buildSteps（app-legacy.js版）/
#record-modal:

分類: D + C（Legacy Exit Auditから除外し、β後UI/UX Final Councilで判断）

Business Logic変更: なし（本レビューはコード変更ゼロ）
UI変更: なし
Founder判断待ち。
```

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-LEGACY-DECISION-4 |
| **作成日** | 2026-07-06 |
| **権威レベル** | 監査報告書（Founder確認待ち） |
| **実装状況** | コード変更ゼロ。本書は調査結果の記録のみ |
| **前提文書** | docs/LEGACY_COMPLETION_RECOVERY_PLAN.md 2-4節・2-5節 / docs/PR-089F-7F-safe-dead-candidates-investigation.md / docs/PR-089F-7G-ambiguous-shims-final-classification.md / docs/PR-089Z-final-cutover-decision.md |
| **検証方法** | 実コード全文確認（grep全件+関数本体読解）。2026-07-06時点で再検証、PR-089Z（2026-07-05）時点の結論を再確認し、`saveAndSync`実体分離・`openRecordModal`fallback生存の2点を新規に明確化 |
| **判定** | D+C（Legacy Exit Audit除外、β後UI/UX Final Councilへ） を推奨。Founder最終判断待ち |
| **次のアクション** | Founder判断確定後、対応するPR（A/B選択時は個別実装PR、C/D選択時はβ後Councilまで凍結）を起票する |
