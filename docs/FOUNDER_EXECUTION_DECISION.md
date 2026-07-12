# Founder Execution Decision

**位置づけ**: 本文書は、General Releaseまでの**Founderによる唯一の実装判断文書**である。以後、新しい設計会議（Council）は原則開催しない。実装は本文書と`docs/GENERAL_RELEASE_IMPLEMENTATION_MASTER_PLAN.md`の2文書のみを基準に進める。

**作成日**: 2026-07-07
**兼務ロール**: Founder / CTO / Product Architect / Repository Auditor / Execution Manager
**根拠文書**: Repository Execution Audit（Execution Gap Audit、2026-07-07実施、静的コード追跡による検証）
**制約**: 本文書はコード変更を含まない。設計判断のみ。

---

## Executive Summary

Repository Execution Auditを**条件付き採用**する。前回監査（Business Validation Audit）が「`domains/`層は本番から完全に切断されている」と判定していた点は、今回の静的コード追跡により誤りと判明した——`src/domains/*`・`src/services/*`は`composition-root.js`経由で実際に配線されている。真のGhost Architectureはルート直下の別系統`domains/*.ts`ツリーであり、これとは切り分けて扱う。

一方で今回新たに検出された**`initNavIcons`二重実装**と**`record.js`の壊れたimport**は、General Releaseに進む前に解消すべきRelease Blockerとして扱う。Premium購入導線の欠如（PR-EXP-03）と合わせて、Critical項目は3件に確定する。

Experiment DomainのConstructed-but-Unconsumed状態は「段階移行」で扱い、旧実装(`experiments.js`)と新実装(`domains/experiment`)を即座にどちらかへ統一する判断はしない。ConsentはPR-P2-06のまま据え置くが、General Release前に1点（同意なしにケース生成が起きない設計になっているかの安全確認）だけをCriticalへ追加する。

Founder最終判定は **READY WITH FIXES**。

---

## Repository Execution Decision

**判定：条件付き採用**

採用理由:
- 監査手法（静的コード追跡）が、独立した別手法（実機ブラウザ検証、General Release Experience Council）と同一のスコア（58/100）に収束しており、結論の信頼性を相互に補強している
- `composition-root.js`による配線の実在確認、PR-EXP-01/02/04/05のコード上の修正確認など、具体的なfile:line証拠に基づく主張が中心であり、推測に基づく記述がない

条件（採用の前提として解消すべき事項）:
- 本監査が「未確認」と明記した2点（`initNavIcons`のロード順、`record.js`のimport実害）は、監査結論のうちPR-EXP-01の「完了」評価とrecord機能の安全性評価に直接影響するため、これらを解消してはじめて監査結果を完全な形で実装方針に反映できる

差し戻しはしない。監査の分析枠組み・分類（A/B/C/D、Ghost Architecture、二重実装リスト）自体に構造的な誤りは見つかっていない。

---

## Critical Issues

### 1. Premium購入導線欠如（PR-EXP-03関連）
**Release Blocker：Yes**
決済ボタンが0件の状態は収益ゼロと同義であり、General Releaseの定義上、必須。

### 2. `initNavIcons`二重実装
**Release Blocker：Yes**
`app-legacy.js:251`と`settings-display-runtime.js:48`の両方が`window.initNavIcons`を定義しており、どちらが最終的に勝つか未確定。これはPR-EXP-01（ボトムナビアイコン修正）が「完了」と評価できるかどうかの土台そのものに関わる。全画面共通のコア導線（ナビゲーション）に関わる問題であるため、他の修正がすべて完了していてもこの1点が未解決であればGeneral Releaseの判断材料として不十分。
**対応方針**: どちらか一方の定義を削除し単一の実装に統一する。新規ロジックの追加は不要——既存2実装のうち機能的に正しい方を残すだけの整理作業と位置づける。

### 3. `record.js`の壊れたimport
**Release Blocker：Yes**
`src/modules/record.js:26`が存在しないファイル（`../../domains/record/record.service.js`）をimportしている。通常、ESMの静的importは対象ファイルが存在しなければビルド自体が失敗するはずであり、それにも関わらずアプリが動作しているらしいという他の証拠（テスト5,154件通過、他PR-EXPの修正確認）と矛盾している。
**対応方針**: まず実害の有無（ビルドエラーになっていないか、実行時にどう解決されているか）を確認することが最優先。原因が解明されない限り、これを「軽微」として見過ごすことはリスク管理上認められない。Record画面はアプリの中核体験であるため、放置した状態でのGeneral Releaseは不可。

**Critical 3件はいずれもRelease Blockerと判定する。** ただし3件とも修正の複雑度自体は低いと想定され（導線の統一、importパスの修正または不要コードの削除）、他のCritical/High項目のような設計判断を要する性質のものではない。

---

## Ghost Architecture Decision

| 対象 | 判定 |
|---|---|
| ルート直下`domains/*.ts`ツリー（40ファイル超） | **アーカイブ**。即時削除はしない。Founderの初期設計意図の記録として価値がある可能性があり、Phase3/4での症例DB設計時に再参照する余地を残す。`docs/archive/`等への退避を推奨するが、実施はGeneral Release後でよい |
| `domains/experiment`のApiGateway等（Constructed-but-Unconsumed） | **保留**（Experiment Decision章で別途判定） |
| Consent Backend（`ConsentRepository`/`ConsentEnforcementService`） | **維持・Phase2で活用**。PR-P2-06でUIを接続する前提のまま据え置く |
| 8つのGhostテーブル（`outcomes`, `similarity_edges`, `disease_definitions`, `symptoms`, `factor_definitions`, `anonymization_log`, `research_exports`, `record_symptoms`/`record_factors`） | **Phase3で活用**。症例DB化・類似検索の着手タイミングに合わせて活性化する。今削除・変更する理由がない |
| `src/application/legacy-access-audit.js` | **削除**。他のどこからもimportされておらず、それ自体を利用する計画の記載もない |
| `tests/arch/`の実効性の限界（実際のimportグラフを検証しない） | **維持のうえ、Phase2以降で拡張を検討**。General Release前の緊急課題ではないが、今回のようなゴーストアーキテクチャの再発を防ぐ仕組みが現状ないことは認識しておく |

---

## Experiment Decision

**選択：C. 段階移行**

理由:
- **A（旧実装へ統一）を選ばない理由**: `domains/experiment`には既に正規化スキーマ・ライフサイクル管理・Outcome連携という、症例DB化構想（既にFounder承認済みの長期戦略）に必須の資産が投資されている。これを削除するのは長期戦略と矛盾する
- **B（新実装へ即座に統一）を選ばない理由**: Consent UI同様、`domains/experiment`側にはまだ実UIからの安定した呼び出し経路の検証実績がない。707行の稼働中コード（`experiments.js`）を一度に置き換えるのは、これまで繰り返されてきた「作って繋がない」の裏返しである「急いで繋いだが検証していない」という新たなリスクを生む
- **Cを選ぶ理由**: Phase2で、まず実験の1機能（例えば実験開始のみ）から`ExperimentCommandService`/`ApiGateway`を実際に`resolve()`して試験的に呼び出し、既存`experiments.js`と並走させながらデータ整合性を検証する。機能ごとに置き換えを進め、Phase2〜3の間で段階的に完全移行する

**当面の扱い**: 二重実装の維持コストはPhase2完了まで許容する。ただしこれをTechnical Debtとして明示し続け、放置したまま次のフェーズへ進むことは認めない。

---

## Consent Decision

**判定：PR-P2-06のままでよい。ただしGeneral Release前に1点、安全確認をCriticalへ追加する。**

理由:
- Consent UIが存在しない状態でも、症例生成・研究データ提供機能自体がまだ外部公開されない現状のGeneral Releaseスコープにおいては、法的リスクは直ちには顕在化しない
- ただし、`CaseGenerationService`等が「同意の有無を確認せずに症例データを生成・保存してしまう」経路が万一存在するなら、これは同意UIの有無とは独立した重大な法的リスクになる。今回の監査ではこの点（デフォルトdeny担保の有無）まで確認が及んでいない

**追加するCritical確認事項**: `CaseGenerationService`をはじめとするCase/Experiment生成系のコードパスが、Consent状態を必ずチェックし、同意がない場合は確実に生成をスキップする設計になっているかを、General Release前に一度確認する。UI実装自体はPR-P2-06のままでよいが、この安全確認だけは前倒しする。

---

## General Release Scope

### Critical（General Release前に必須）
1. Premium購入導線（PR-EXP-03）
2. `initNavIcons`二重実装の解消
3. `record.js`の壊れたimportの実害検証・修正
4. Case/Experiment生成系のConsent安全確認（デフォルトdeny担保の確認）

### High（General Release前推奨）
5. Experiment実装の段階移行方針の着手（Phase2の一部として実質的な第一歩を切ることを推奨するが、General Release自体のブロッカーにはしない）
6. `module-inventory.md`の現ブランチ向け再生成
7. `MASTER_PLAN.md`のExecutive Summary本文修正（自己矛盾の解消）

### Medium（Phase2へ移行可能）
8. Consent UI実装（PR-P2-06）
9. home-next未移植4関数（`updateHomeCTAState`/`updateHomeNumbers`/`updateHomePhaseBanner`/`updateTodayMessage`）の移行完了
10. `app-legacy.js`内の生死未確認5関数（`_flushCloudRestoreQueue`, `initNavIcons`※解消後に再命名整理, `openDayDetailByDate`, `saveEditRecord`, `mergeRecords`）の生死確認（削除作業自体はPhase2以降でよいが、確認はできれば早期に）

### Low（Phase3以降でよい）
11. ルート`domains/*.ts`のアーカイブ実施
12. 8つのGhostテーブルの活用開始
13. `tests/arch/`の実効性強化
14. Symptom/Disease/Food/Lifestyleの構造化・国際化

---

## Deferred Items

以下はGeneral Release後に先送りする。今回のCouncilでは着手判断のみ行い、設計変更・実装は行わない。

- Experiment Domainの完全統一（段階移行の完了はPhase2〜3）
- Consent UI本体の実装（PR-P2-06）
- ルート`domains/*.ts`のアーカイブ実務
- Ghost 8テーブルの活性化（Case/Similarity機能実装時）
- `tests/arch/`の実import検証機能への拡張
- Symptom英語キー化・Food/Lifestyle構造化・Embedding基盤（Wave3スコープのまま変更なし）

---

## Founder Final Decision

**READY WITH FIXES**

理由:
- **IMPLEMENTATION READYとしない理由**: Critical 4項目（Premium導線・icon二重実装・record.js import検証・Consent安全確認）が未解決のまま「即実装着手可」と宣言することはできない
- **NOT READYとしない理由**: 発見された問題は、構造的な設計破綻（層構造違反、循環依存、テスト基盤欠如等）ではない。むしろArchitecture Guard（165ルール・違反ゼロ）が機能している証拠があり、根幹のアーキテクチャは健全である。Critical項目はいずれも原因が特定済みで、修正の複雑度も高くないと判断できる
- **READY WITH FIXESとする理由**: 特定済みのCritical/High項目を順に解消すれば、新たな設計判断を挟まずにGeneral Releaseへ到達できる状態にある

---

## Implementation Policy

以後、General Releaseまでの実装方針を以下のとおり確定する。

1. **General Releaseまで追加設計を行わない**。新しいドメインモデル・新しい画面・新しい機能提案は行わない
2. **新Councilは原則開催しない**。本文書と`docs/GENERAL_RELEASE_IMPLEMENTATION_MASTER_PLAN.md`を唯一の基準とする
3. **Critical項目（4件）は実装修正の対象とする**。着手順は本文書の記載順（Premium導線→icon二重実装→record.js import→Consent安全確認）を推奨するが、依存関係がなければ並行着手を妨げない
4. **High項目（3件）は可能な範囲で修正する**。General Releaseの必須条件ではないが、着手できるものから進める
5. **Medium以下（Consent UI含む）はPhase2以降へ送る**
6. **実装開始後は、設計変更ではなく以下の順序を優先する**:
   実装 → テスト → Browser Verification → Regression → General Release
7. **General Release後に再監査を実施する**。今回のような「設計と実装のズレ」の再発を防ぐため、次回はGeneral Release完了時点でのExecution Gap Audit再実施を計画に含める

---

## Master Plan 追記項目（新規文書は作成しない・列挙のみ）

`docs/GENERAL_RELEASE_IMPLEMENTATION_MASTER_PLAN.md`へ以下を追記することを推奨する（本文書内での提言に留め、実際の追記作業は別途実施）:

- Executive Summary本文の「実装は一件も行われていない」という記述を、PR Master Listテーブルの実態（PR-EXP-01/02/04/05完了、03保留）と整合させる
- 新規Critical項目として「`initNavIcons`二重実装解消」「`record.js`壊れたimportの検証」「Case/Experiment生成系のConsent安全確認」の3件を追加
- Experiment Domain段階移行方針（本文書のExperiment Decision章）をPhase2セクションに追記
- Ghost Architectureの処遇（アーカイブ対象・Phase3活用対象）を注記として追加
