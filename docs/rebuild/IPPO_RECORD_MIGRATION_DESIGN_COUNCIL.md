# IPPO RECORD MIGRATION DESIGN COUNCIL
## Prototype Record UI × Current IPPO Record Domain 統合設計会議

> 本Councilは実装前のRecord専用設計会議である。コード変更・DB変更・Migration実行は一切行っていない。
> Repository Migration Principle: **Prototype First**（UI/UXはippo-rebuildを唯一の正とし、現行IPPOからは動作実績のあるDomain/Service/Data/Infrastructureのみを段階移植する）。
> 前提資料: `docs/IMPLEMENTATION_PLAN_V1.md`（Version 1.1）、`docs/rebuild/IPPO_REBUILD_MIGRATION_FEASIBILITY_COUNCIL.md`、`docs/rebuild/UI_UX_FOUNDATION_COUNCIL.md`、`prototype/*`。現行IPPO側は`domains/record/record.entity.ts`、`src/modules/record-three-card-save.js`、`src/modules/save-and-sync.js`、`supabase/migrations/`の該当ファイルを直接読み込んで検証済み。

---

## Executive Summary

現行IPPOのRecordバックエンドは、想定より**設計として一段上の完成度**を持っていた。特に重要な発見は以下の3点。

1. **正規化スキーマは既に相当程度存在する**。`records`テーブル（`20260029`/`20260030`）、`record_symptoms`（`20260031`）、`record_factors`（`20260032`）はいずれもRLS適用済み・controlled vocabulary（`symptoms`/`factor_definitions`テーブル）参照付きで実装されている。「ゼロから正規化する」のではなく「既にあるものへ書込み先を切り替える」問題である。
2. **Prototypeの行動タグ6種のうち4種（カフェイン・アルコール・運動・糖質≒high_carb）は既存のfactor_definitionsシードに実キーが存在**する。新規追加が必要なのは「乳製品(dairy)」「早寝(early_sleep)」の2件のみ。「肌」も`skin_roughness`という既存symptomキーで概ね代替できる。
3. **`UI_UX_FOUNDATION_COUNCIL.md`は既に「Information Density Freeze」を明記**しており、「入力項目数の上限はこのカード構成に固定し、将来的な追加はFounder承認必須」としている。本Councilが提案する段階的開示は、この既存Freezeの例外申請として扱う必要がある。

一方、放置すると設計品質を損なう不整合も見つかった。データベースの疾患定義は`pms_pmdd`という**単一キー**だが、Prototypeのオンボーディングは「PMS」「PMDD」を**個別の選択チップ**として提示している。また「肌: 荒れ/普通/良い」という3択のUIは、symptomモデル（ある/なし＋重症度）という現行データ構造とは意味論的に完全には一致しない（「良い」という積極的な状態を表す自然な列が現行スキーマにない）。

**総合判定: GO WITH CONSTRAINTS**（詳細は最終判定セクション）。

---

## Record UI Decision

**採用: C. Prototype UIを正とし、疾患別項目を段階的開示で追加する**

理由:
- A（Prototypeの5項目のみ）は、疾患特化アプリとしての深さ（`domains/record/record.entity.ts`が持つ約30項目の臨床的価値）を完全に捨てることになり、Repository Migration Principleの「既存機能はPrototypeに適合させる」を字義通り実行すると価値の喪失になる。
- B（現行3カード/4ステップUIを正とする）は、Prototype Firstの原則そのものに反する。不採用。
- D（再設計）は、既に2回のCouncil（World-Class Layout Evolution Council / Integration Council）でBrowser Verificationまで完了したPrototypeレイアウトを無駄にする。UI変更にはFounder承認を伴うLayout Councilが必須という原則にも反する。不採用。
- Cのみが、Prototypeの見た目を変えずに（＝Layout Councilを再度開かずに）、疾患特化の深さを取り戻せる。

ただし`UI_UX_FOUNDATION_COUNCIL.md`の「入力項目数の上限はこのカード構成に固定し、将来的な追加はFounder承認必須（既存Freeze継承）」という記述により、**段階的開示の追加自体がFounder承認事項**である。本文書の「Progressive Disclosure Design」を、そのFounder承認申請の具体案として提示する。

---

## Progressive Disclosure Design

既存の3カード構成（カード1: 今日の体調／カード2: 今日の行動タグ／カード3: 気づきメモ）を**増やさず**、各カードの中に「開く」導線を追加する設計とする。4枚目のカードを追加しない。

| 分類 | 内容 | 表示条件 |
|---|---|---|
| **常時表示**（現状のPrototypeのまま） | 気分(5段階)／睡眠(3択)／肌(3択)／行動タグ6種／メモ1行 | 常時 |
| **疾患選択時のみ表示** | オンボーディングで選択した疾患に対応する2〜3個の症状チップを、カード1の「肌」の下に小さく追加表示（例: 子宮内膜症選択者には「下腹部痛」チップ、PCOS選択者には「肌荒れ」を肌チップと統合表示） | オンボーディングの「気になること」が"特にない"以外のとき |
| **実験中のみ表示** | 進行中Experimentの`interventionType`に対応する観察タグを、カード2の行動タグにハイライト表示（既存Prototypeの`recordHighlightTag`をそのまま利用） | アクティブなExperimentが存在するとき |
| **詳細を開いた時のみ表示** | カード1末尾に「くわしく記録する（任意）」の折りたたみ導線を1つ追加。開くと痛みレベル(スライダー)・生理周期・血塊・おりもの・体温・排便・服薬が現れる。すべてnull許容・未入力でも保存可能 | ユーザーが明示的にタップしたときのみ |
| **今は実装しない** | PCOS特異的な症状（多毛症・無月経等）は現行`symptoms`シードに該当キーが存在しない。新規追加が必要だが本Councilのスコープ外（新規Gapとして記録） | Phase後送り |

**設計上の要点**: 「詳細を開いた時のみ表示」は毎日タップする必要がなく、Prototypeの「10〜30秒で記録できる」を壊さない。疾患選択時のチップ追加も最大2〜3個に絞り、カード1の縦方向の高さ増加を最小限にする。

---

## Record Schema Decision

**採用: B. 正規化records系を正とする（即時）**

| 比較軸 | user_records (A) | 正規化records系 (B) |
|---|---|---|
| 実装コスト | 低（現状維持） | **中**（`records`/`record_symptoms`/`record_factors`は既に実装済みのため、"書込み先の切替"のみで済む。ゼロから設計するコストは既に払われている） |
| データ整合性 | 低（JSONBブロブ、code-levelのUNIQUE制約なし） | 高（FK制約・RLS・controlled vocabulary） |
| 症例DB化 | 困難（`case.factory.ts`の前提条件クエリがブロブから効率的に集計できない） | 前提条件を満たす |
| Similarity | 困難（factor/symptomキーの構造化がないと重み付けスコアリング不可） | 前提条件を満たす |
| Research Consent | 困難（k-Anonymity集計がJSONBからは非効率） | 前提条件を満たす |
| 将来の国際化 | 困難（日本語キー混入リスクが既知のGap G-11） | `symptoms`/`factor_definitions`に`display_name_ja/en`が既に用意済み |
| バックフィル難易度 | — | 中。`IMPLEMENTATION_PLAN_V1.md`出力6に既存のBackfill計画あり（ゼロから設計不要） |
| リリースリスク | — | **極めて低い**。`IMPLEMENTATION_PLAN_V1.md`現状サマリーに「ユーザー数0、本番依存なし」と明記されている。今この移行を行うリスクは実質的に存在しない |

C（短期はuser_records維持）は、実データが存在する場合の安全策としては合理的だが、**ユーザー数0・本番依存なしという特殊状況ではその配慮が不要**であり、先送りするほど将来のバックフィルが難しくなるだけである。D（両方維持）はG-01の解消を放棄することになり不採用。

**推奨**: Bを今すぐ採用する。ただし`IMPLEMENTATION_PLAN_V1.md` Phase A-4に既に計画されている**Dual-Write**（旧`saveRecord()`を壊さず新recordsテーブルへも同時書込み）を、恒久的な現状維持策としてではなく、Prototype UI切替期間中の一時的な安全弁として活用する。

---

## Record Payload Design

Prototype UIから保存されるRecord Payloadを以下のように設計する。

```json
{
  "recordDate": "2026-07-09",
  "mood": 3,
  "sleep": "normal",
  "skin": "normal",
  "tags": ["caffeine", "exercise"],
  "memo": "string or null",

  "diseaseContext": {
    "concerns": ["endometriosis"]
  },

  "experimentContext": {
    "experimentId": "uuid or null",
    "interventionType": "dairy_elimination"
  },

  "observationTags": ["dairy"],

  "optionalDetails": {
    "painLevel": null,
    "menstrualCycle": null,
    "bloodClot": [],
    "bloodColor": [],
    "temperature": null,
    "bowel": null,
    "medication": [],
    "symptoms": []
  },

  "consentContext": {
    "recordConsentRequired": false,
    "researchConsentLevelSnapshot": 0
  },

  "metadata": {
    "clientCreatedAt": "2026-07-09T09:12:00+09:00",
    "source": "prototype-record-v1",
    "syncPending": false
  }
}
```

設計方針:
- `observationTags`はDB永続化不要。`experimentContext.interventionType`と`tags`をクライアント側で突き合わせて算出するだけの表示用フィールドとする。
- `consentContext`はRecord保存の可否判定には使わない（Consent Safety Design参照）。監査・トレーサビリティのためのスナップショットに留める。
- `optionalDetails`はすべてnull許容。Prototypeの「10〜30秒」を守るため、送信必須項目にしない。

---

## RecordEntity Mapping

| Payloadフィールド | 現行RecordEntity / DBカラム | 変換方針 |
|---|---|---|
| `recordDate` | `recordDate`（`records.record_date`） | そのまま |
| `mood` | `mood`（`records.mood`, 1-5） | そのまま（Prototypeも既に1-5の5段階） |
| `sleep`（short/normal/long） | `sleepHours`/`sleepQuality`/`sleepBed`/`sleepWake` | 3択→代表値マッピングが必要。例: short→5h/quality2、normal→7h/quality3、long→9h/quality4（暫定値。就寝・起床時刻は取得しない） |
| `skin`（rough/normal/good） | `record_symptoms`の`skin_roughness`（severity 1-5） | rough→severity4で登録、normal→未登録（symptom行なし）、good→**現行スキーマに「良い」を表す自然な列がない**（後述Risks参照。当面はnormalと同様に未登録とし、UI表示上のみ区別する） |
| `tags[]` | `records.factor_keys[]` + `record_factors` | caffeine/alcohol/exerciseは既存`factor_definitions`キーにそのまま対応。sugarは既存の`high_carb`キーへ読み替え。dairy/earlysleepは新規`factor_definitions`行の追加が必要（スキーマ変更不要、INSERTのみ） |
| `memo` | `note` | そのまま |
| `diseaseContext.concerns` | `diseases[]` / `diseaseCheck` | **オンボーディングのpms/pmdd個別選択と、DBの`pms_pmdd`統合キーが不一致**。Founder決定事項として明記（Pending Founder Decisionsへ追加） |
| `experimentContext` | 現行RecordEntityに存在しない | 新規nullableカラム`experiment_id`（FK `experiments(id)`）の追加を推奨 |
| `observationTags` | 永続化しない（クライアント計算のみ） | — |
| `optionalDetails.painLevel` 等 | `painLevel`/`menstrualCycle`/`bloodClot`/`bloodColor`/`temperature`/`bowel`/`medication` | そのまま（null許容） |
| `consentContext` | 現行RecordEntityに存在しない | 新規追加は必須ではない。将来的な監査要件が明確になった時点で追加を検討 |
| `metadata` | `client_created_at`/`sync_pending`/`synced_at` | そのまま既存カラムと対応 |

---

## Experiment Context Design

- **進行中Experimentの表示**: Prototypeの「今週の実験対象」バナー（`recordFocus`）は`experimentContext.interventionType`から導出する。
- **観察タグの強調**: 既存Prototypeの`recordHighlightTag`ロジックをそのまま使う。`interventionType`→対応するtagキーのマッピングテーブル（例: `dairy_elimination`→`'dairy'`）を1つ追加するだけで済み、新規ロジック開発は不要。
- **experimentIdの保持**: Recordに`experiment_id`（nullable, FK `experiments(id)`）を新規カラムとして追加することを推奨する。現状は`record_date`の範囲でしか実験と紐付けられておらず、複数実験が近接・重複した場合に曖昧になるリスクがある。
- **Outcomeへの接続**: 実験完了時、`IMPLEMENTATION_PLAN_V1.md` Phase D-2で計画済みの`OutcomeService`が該当`experiment_id`のRecordを集計し、`effect-size-engine.js`のCohen's d計算に渡す、という既存設計をそのまま使う。新規パイプラインは不要。

---

## Disease-Specific Disclosure

常時表示は増やさない前提で、既存`symptoms`シードの実キーのみを使用して整理する。

### PMS / PMDD（DB上は`pms_pmdd`単一キー。Founder決定が必要）
| 分類 | 症状 |
|---|---|
| 疾患選択時のみ表示 | `irritability`(イライラ), `bloating`(腹部膨満), `breast_tenderness`(胸の張り) |
| 詳細を開いた時のみ | `depression`, `anxiety`, `increased_appetite`, `difficulty_concentrating`, `brain_fog`, `insomnia` |
| 今は実装しない | PMDD重症度スケール相当（DSM基準等）は未整備 |

### PCOS
| 分類 | 症状 |
|---|---|
| 疾患選択時のみ表示 | `skin_roughness`(肌荒れ、Prototypeの「肌」項目と統合表示可能) |
| 詳細を開いた時のみ | `increased_appetite`, `fatigue`, `joint_pain` |
| 今は実装しない | 多毛症・無月経等のPCOS特異的symptomキーが現行`symptoms`シードに存在しない（新規Gap。追加が必要） |

### 子宮内膜症（endometriosis）
| 分類 | 症状 |
|---|---|
| 疾患選択時のみ表示 | `lower_abdominal_pain`(下腹部痛) |
| 詳細を開いた時のみ（sensitive配慮） | `dyspareunia`(性交痛, is_sensitive=true), `painful_defecation`(排便痛, is_sensitive=true), `pelvic_heaviness`, `stabbing_pain`, `heavy_menstruation`, `abnormal_bleeding` |
| 今は実装しない | なし（既存symptomsで概ねカバー） |

### 卵巣嚢腫（ovarian_cyst）
| 分類 | 症状 |
|---|---|
| 疾患選択時のみ表示 | `lower_abdominal_pain`, `bloating` |
| 詳細を開いた時のみ | `pressure_sensation`, `frequent_urination`, `stabbing_pain` |
| 今は実装しない | なし |

**sensitiveフラグの扱い**: `symptoms`テーブルの`is_sensitive=true`項目（`dyspareunia`, `painful_defecation`, `vulvar_burning`, `sitting_pain`）は、「詳細を開いた時のみ」よりさらに配慮したUI（婉曲的なラベリング・タップ数を増やす等）で扱うことをHealthcare UX Reviewerの立場から推奨する。

---

## Save Flow Design

現行の保存パイプライン（`src/modules/record-three-card-save.js`の`_rtcPipelineSave`）を検証した結果、これは**すでに新Prototypeの「軽さ」と両立する設計**になっていることが判明した。新規に再設計するのではなく、Prototype UIからこのパイプラインへ薄いアダプターで接続することを推奨する。

実際の流れ（確認済み）:
```
1. createRecordSaveContext()
2. window.getState() → upsertRecord() → state.records へ直接代入（同期・即時）
3. persistRecordState() → window.saveState()（同期・即時）
4. notifyRecordUpdated() → Home/Calendar/Statsの再描画（同期・即時）
5. finalizeRecordSaveContext()
6. syncRecordImmediately(savedRecord) を非同期fire-and-forgetで実行（失敗時はcatchしてsyncPending化、次回起動時にリトライ）
7. 500ms遅延でsyncRecordCloud()（全state fallbackバックアップ）
```

- **Local state保存**: 上記2-3は同期的に完了する。新UIはここまでの完了を待って「保存成功」を表示してよい。
- **Supabase保存**: 上記6-7は非同期・fire-and-forget。ネットワーク往復を待たずにUIへ成功を返す既存設計は変更しない。
- **Offline時 / Retry**: 既存の`syncPending`フラグ＋次回起動時リトライパターンをそのまま踏襲する。新規設計は不要。
- **Save Feedback（重要な修正）**: 前回Council（`IPPO_REBUILD_MIGRATION_FEASIBILITY_COUNCIL.md`）では「PR-LAYOUT-03の550ms固定タイマーを実保存Promiseへ置き換える必要がある」としたが、本Councilでの実装確認により**この記述を修正する**。ローカル状態への保存（手順2-3）は同期的に完了するため、550msという固定タイマーは「Supabase同期の完了を待つため」ではなく「UIアニメーションを読ませるための演出上の間」として正しい設計である。成功表示のトリガーは「ローカル保存の完了」でよく、Supabase同期の成否とは意図的に分離してよい。
- **保存中表示**: ローカル保存はほぼ瞬時のため、スピナーは不要（既存パターンにも存在しない）。
- **保存失敗時表示**: 「保存失敗」はローカルでは実質発生しない。失敗しうるのはバックグラウンドのSupabase同期のみであり、これは`syncPending`として静かに扱う。Prototypeの落ち着いたトーンに合わせ、警告的な表示ではなく「オフラインのため後で同期します」程度の控えめな表示に留める。
- **重複保存防止 / 同日上書き**: `upsertRecord(records, payload, { preserveExisting: true })` + `UNIQUE(user_id, record_date)`制約（適用後）により、同日の再記録は「重複」ではなく「意図された上書き」として扱われる。既存Prototypeの`record-strip`（「今日の記録」/「完了✓」表示）は既にこの前提を反映済みで、変更不要。
- **過去日編集**: 現行Prototypeには過去日を編集するUIが存在しない。Phase 1のスコープに含めるかはFounder判断が必要（Pending Founder Decisionsへ追加）。含めない場合、Browser Verificationの「過去日編集」項目は「意図的に非対応であることの確認」に読み替える。
- **Calendar / Home / Insightsへの反映**: 既存`notifyRecordUpdated()`は**レガシーUI**の再描画関数（`buildCalendar`, `renderCalendar`, `renderHome`等）を呼んでいる。新Prototype画面では、これらをPrototype側の描画関数（`renderHomeRecordStrip`, `renderCalendar`相当, `renderInsightsHighlight`等）に置き換える、または並行して呼ぶアダプターが必要。

---

## Consent Safety Design

- **Record保存自体はConsentなしでも可能**: 可能（そうあるべき）。「ユーザーの目的は改善であり、Case化は結果である」という原則、および`case.factory.ts`のCase生成が記録行為そのものより下流にある設計から、Record保存をConsentでゲートしてはならない。
- **Research ConsentなしでCase生成されないか**: `IMPLEMENTATION_PLAN_V1.md` Phase E-6（TierEvaluationService, FD-002）によれば、**CANDIDATE→TIER3への昇格はConsent不要**（quality≥30 + ユーザー承認のみ）。Consentが必須になるのはTIER3→TIER2（Consent Level1+）、TIER2→TIER1（Level2+）から。したがって「Case生成（候補判定）」自体はConsentなしで起こり得るが、「Case公開・研究利用可能な状態への昇格」はConsentが必須という設計になっている。この2段階を混同しないこと。
- **ConsentなしでSimilarity対象にならないか**: `similarity_edges`はTier2以上のCaseにのみ生成される（RLS保護済み、前回Council監査で確認済み）。Tier2はConsent Level1+が前提のため、実質的に保護されている。
- **ConsentなしでResearch Exportされないか**: `ConsentGateService`（level≥2要求、fail-closed）が既に実装・テスト済み。保護されている。
- **UIでどう説明するか**: 現行Prototypeのオンボーディング安心カード・Meのプライバシーカードは一般プライバシーConsent相当のみで、Research Consent（Level1+）専用の導線は存在しない。前回Council（出力12 Function Migration Matrix）で指摘済みの「Research Consent UI: 新規UI／既存ロジック活用」と整合させ、Phase 6で新規導線を設計する。

---

## Record Migration PR Plan

`IMPLEMENTATION_PLAN_V1.md`のPR-005〜009（Phase A）と対応させつつ、Prototype UI接続に特化したPRとして提示する。

> **Implementation Guardrail（2026-07-09）**: PR-REC-02（段階的開示UI）・PR-REC-03（save pipeline接続）・PR-REC-05（experiment_id接続）・PR-REC-06（スキーマ一本化）は、上記「Confirmed Founder Decisions」の確定を前提として着手可能となった。PR-REC-01・PR-REC-04は元々スキーマ変更を伴わない低リスク作業のため、Decision確定前から着手可能だった。

```
PR-REC-01: Record Payload設計・Adapter実装
  本文書のPayload/Mapping確定をコードに反映。DB変更なし、マッピング関数のみ。
  対応: 新規、既存PRとは独立して先行実施可能。

PR-REC-02: 疾患別段階的開示UI（Founder承認必須）
  Prototype UIへ「疾患選択時のみ表示」「詳細を開いた時のみ表示」を追加。
  UI_UX_FOUNDATION_COUNCIL.mdのInformation Density Freeze例外申請を伴う。
  対応: 新規（Layout Council承認が前提）。

PR-REC-03: Prototype Record UI ⇄ 既存save pipeline接続
  record-three-card-save.js の _rtcPipelineSave 相当のロジックを
  新UIから呼べるようアダプター化。保存ロジック自体は書き換えない。
  対応: PR-005〜008（Phase A-3/A-4）と並行。

PR-REC-04: factor_definitions / symptoms 追加シード
  dairy, early_sleep 等の新規factor_definitions行を追加（INSERTのみ、スキーマ変更なし）。
  対応: 新規、独立して先行実施可能。

PR-REC-05: experiment_id カラム追加 + Experiment Context接続
  Recordへの新規nullableカラム追加。Outcome集計精度向上。
  対応: Phase C（Experiment Domain）と連動。

PR-REC-06: Recordスキーマ一本化
  正規化records系への書込み一本化 + user_recordsからのバックフィル。
  対応: PR-006〜008（Phase A-3/A-4）そのもの。既存計画と統合。

PR-REC-07: Consent Context監査ログ（任意・優先度低）
  Record保存時にconsent_level snapshotを記録。Consentゲートには影響しない。
  対応: 新規、Phase 6以降でも可。

PR-REC-08: Record Browser Verification
  全項目の実機確認（次セクション参照）。
  対応: 各PR完了時に都度実施。最終確認として一括でも可。
```

---

## Browser Verification Plan

Record移植後、以下を確認する。

```
□ 新規記録（Day0〜Day30の各状態で）
□ 同日上書き（同日に2回記録して1件に統合されることを確認）
□ 過去日編集（Phase 1スコープに含める場合のみ。含めない場合は「意図的に非対応」を確認）
□ Offline保存（ネットワーク切断状態での保存→ローカルには即時反映されることを確認）
□ Retry（オフライン後の再接続でsyncPendingが解消されることを確認）
□ Supabase保存（正規化recordsテーブルへの実際の書込みを確認）
□ Home即時反映（記録直後にrecord-strip/気づきカード/Heroが更新されることを確認）
□ Insights反映（パターンカレンダー・確信度メーターへの反映を確認）
□ Experiment観察タグ反映（進行中実験のinterventionTypeに応じたタグハイライトを確認）
□ 疾患別追加項目（オンボーディングで選択した疾患ごとに正しい症状チップが表示されることを確認）
□ 「詳細を開く」の折りたたみ動作（開閉・null許容での保存を確認）
□ Console Error 0件
□ 320 / 375 / 390 / 430px確認
```

---

## Risks

| リスク | 深刻度 | 内容 |
|---|---|---|
| スキーマ一本化タイミングリスク | 高 | ユーザー数0の今が最も低リスクで実施できる。先送りするほどバックフィルが困難になる |
| Information Density Freeze違反リスク | 中 | 段階的開示の実装が誤って「常時表示」に漏れると、既存Freezeの原則（毎日使っても疲れない）を静かに破ることになる。PR-REC-02は必ずFounder承認を経ること |
| pms/pmdd統合キー不一致 | 中 | DBの`pms_pmdd`単一キーとPrototypeの個別選択チップの不整合を放置すると、疾患別段階的開示のロジックが誤動作する |
| 「肌」3択とsymptomモデルの意味論的不一致 | 中 | 現行スキーマには「良い」という積極的状態を表す自然な列がない。当面はUI表示上のみの区別に留める設計とした（本文書のRecordEntity Mapping参照）が、将来的にはpositive symptom trackingの設計拡張が必要になる可能性がある |
| dairy/sugar/earlysleep新規factor追加の見落とし | 低 | INSERTのみで解決するため技術的難易度は低いが、見落とすと3/6のタグが保存できない |
| experiment_idカラム追加を怠った場合のリスク | 中 | Outcome集計が`record_date`範囲のみに依存し、複数実験が近接した場合に集計精度が低下する |
| 過去日編集の扱いを誤認するリスク | 低 | 現行Prototypeに過去日編集UIが存在しないことを「未実装のバグ」ではなく「意図的な仕様」として扱うことをFounderが明示的に決定する必要がある |

---

## Confirmed Founder Decisions（2026-07-09 Implementation Guardrail）

> 以下3点はFounderにより確定済み。PR-REC-02以降は、この確定をもって着手可能となる（未確定のままの着手は禁止されていた）。

**Decision 1: Recordスキーマは正規化records系を正とする**
「Record Schema Decision」のB案を正式採用として確定。`records`/`record_symptoms`/`record_factors`への書込み一本化、`user_records`からのバックフィルをPR-REC-06で実施する。

**Decision 2: 疾患別段階的開示はInformation Density Freezeの例外として承認する**
「Progressive Disclosure Design」を`UI_UX_FOUNDATION_COUNCIL.md`のFreeze例外として正式承認。4枚目のカードを追加せず、既存3カード内の開示（疾患選択時のみ表示／詳細を開いた時のみ表示）に限定する、という本文書の設計方針の範囲内で実装してよい。この範囲を超える追加（新規カードの追加等）は、別途Layout Councilの再承認が必要。

**Decision 3: PMS/PMDDキーと「肌=良い」状態の扱い（暫定仕様として固定）**

*PMS/PMDD*
- UI: オンボーディングの「PMS」「PMDD」2チップ表示はそのまま維持する（ユーザーの自己認識の違いを尊重するUX判断）。
- データ層: いずれか一方または両方が選択された場合も、`diseaseContext.concerns`には既存の`disease_definitions.key = 'pms_pmdd'`を1件のみ記録する（重複排除。DBスキーマ変更なし）。
- Home等への表示文言（`CONCERN_CONTENT`のpms/pmdd別コピー）は現状のまま維持してよい。これはクライアント側の表示レイヤーの話であり、バックエンドのキー統合とは独立している。
- 再検討トリガー: PMSとPMDDで臨床的に異なる症状セット・Case品質スコアリングが必要になった場合、その時点で`disease_definitions`のキー分割を検討する。現時点では分割しない。

*肌=良い状態*
- データ層: 「良い」「普通」はいずれも`record_symptoms`へ`skin_roughness`行を追加しない（「荒れ」の場合のみseverity付きで行を挿入する）。
- 「良い」と「普通」の区別は、Prototypeのその日のUI表示（ローカル状態）でのみ保持し、バックエンドには区別可能な形で永続化しない。
- 影響範囲の確認: Case品質スコア・Similarity・Insightsのいずれも「symptomの有無」を前提としたロジックであり、「良い/普通の区別が永続化されないこと」による機能的な悪影響はない。
- 再検討トリガー: 将来、プロダクト分析上「積極的に良い日」と「データなし」を区別する必要が生じた場合、専用カラム（例: `skin_state` enum）の追加を検討する。現時点では追加しない。

---

## Founder Recommendation

1. ~~Recordスキーマ一本化はBを即採用すること。~~ **→ Decision 1で確定済み**
2. ~~段階的開示（PR-REC-02）はFounder自身がLayout Councilとして承認すること。~~ **→ Decision 2で確定済み**
3. ~~pms/pmdd統合キーの扱いを決定すること。~~ **→ Decision 3で確定済み（暫定仕様固定）**
4. ~~「肌」の「良い」状態の扱いを判断すること。~~ **→ Decision 3で確定済み（暫定仕様固定）**
5. **過去日編集をPhase 1に含めるかは、依然として未決定**。PR-REC-08（Browser Verification）着手前に決定すること。

---

## Final Verdict

# GO WITH CONSTRAINTS

**理由**: 現行IPPOのRecordバックエンド（正規化スキーマ、controlled vocabulary、非同期セーフティを備えた保存パイプライン）は、Prototype UIとの統合に十分な完成度を既に持っている。行動タグ6種のうち4種は既存キーに直接マッピングでき、保存フローも再設計不要でアダプター接続のみで済む。ユーザー数0という状況は、スキーマ一本化を今すぐ行う後押しとなる。

**2026-07-09更新**: 当初「制約」としていた3点（スキーマ方針、Freeze例外承認、pms/pmdd・肌=良いの暫定仕様）は、Implementation Guardrailにより全てFounder Decisionとして確定した（「Confirmed Founder Decisions」参照）。残る制約は「過去日編集をPhase 1に含めるか」のみであり、これはPR-REC-08着手前までに決定すればよく、PR-REC-01〜07の着手を妨げない。

次のアクション: PR-REC-01（Payload/Adapter設計）・PR-REC-04（factor/symptomシード追加）に加え、Confirmed Founder Decisionsの確定によりPR-REC-02（段階的開示UI）・PR-REC-03（save pipeline接続）・PR-REC-05（experiment_id接続）・PR-REC-06（スキーマ一本化）も着手可能となった。実装着手時は本文書の「Confirmed Founder Decisions」記載の暫定仕様（PMS/PMDDキー統合、肌=良いの非永続化）に従うこと。
