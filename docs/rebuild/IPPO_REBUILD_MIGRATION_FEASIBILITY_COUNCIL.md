# IPPO REBUILD MIGRATION FEASIBILITY COUNCIL
## Prototype Layout × Current IPPO Function Migration Feasibility

> 本Councilは実装前の移植可能性監査である。コード変更・実装は一切行っていない。
> 前提資料: [ippo-rebuild](https://kenkou-jpg.github.io/ippo-rebuild/)（Prototype Freeze済み・Founder実機確認クリア済み）、`docs/IMPLEMENTATION_PLAN_V1.md`（既存実装計画書）、および現行`ippo`リポジトリの実コード監査5件（Record/データ基盤、Insights/AI/Question Layer、Experiment/課金、Consent/Case/Similarity、全体アーキテクチャ）。
> 調査はREAD-ONLYで実施。すべての結論は実コード（ファイルパス・行番号・引用）に基づく。推測箇所は「推測」と明記する。

---

## Executive Summary

現行IPPOのバックエンド資産は、事前の想定より**はるかに成熟している**。Consent（同意管理）、Case生成、Similarity（類似度スコアリング）、Stripe決済、統計的確信度エンジン、そして「断定禁止」原則を機械的に強制するforbidden-word-validatorは、いずれも実装済み・テスト済みの実コードであり、単なるインターフェースやスタブではない。これは従来の想定（「Phase4以降の将来資産」）を覆す発見であり、移植の実現可能性を大きく引き上げる。

一方で、**この移植固有の新しいリスクではなく、移植前から存在する技術的負債**が複数確認された。最も重大なのは以下の3点である。

1. **Record（記録）のスキーマが2系統に分岐している** — `user_records`のJSONBブロブテーブルと、正規化された`records`系テーブルが並存し、どちらが正とすべきか未確定。
2. **Experimentの実装が実質的に複数系統存在する** — レガシー（`src/modules/experiments.js`）、DI接続済みJS実装（`src/domains/experiment/*`）、未接続のTypeScript書き直し（`domains/experiment/*`）が並存し、新Prototype UIをどれに接続すべきか未決定。
3. **既存の実装計画書`docs/IMPLEMENTATION_PLAN_V1.md`（2026-06-24生成）のGap分析が陳腐化している** — 同文書は「Consent/Case/Similarityは未実装」としているが、本Council監査ではこれらの相当部分が2026-06-24以降に実装済みであることが判明した。

Prototypeのレイアウト思想（Home単一指標・Record低負荷・Experiment主役・症例DB非表出）自体は、これらの技術的負債と独立して維持可能である。ただし、Record画面だけは「疾患特化の深い記録」という現行IPPOの中核価値と、Prototypeの「入力負荷を増やさない」という制約が正面から衝突するため、単純な移植では済まず、設計判断が必要である（詳細は後述）。

**総合判定: GO WITH CONSTRAINTS**（詳細は最終判定セクション）。

---

## Prototype Layout Preservation Decision

| 画面 | 判定 | 根拠 |
|---|---|---|
| Home | **維持可能** | Hero単一リング・気づきカード・進行中実験カード・結果カード・マイルストーンバナーは、いずれも既存のルールベース生成ロジック（`home-insight-engine.js`等）や確信度エンジン（`analytics/confidence-engine.js`）の出力を1枚のカードに詰め替えるだけで済む。情報密度の増加を伴わない |
| Record | **条件付き可能** | 本Council最重要監査事項。詳細は「Record Migration Audit」参照。結論としては、Prototypeの5項目フォーム（気分/睡眠/肌/タグ/メモ）を既定表示として維持しつつ、疾患別の深い項目（痛みレベル・生理周期・血塊・排便等、実データモデルには約30項目存在）を**オンボーディングの「気になること」選択に連動した段階的開示（progressive disclosure）**として追加設計することで両立可能。これを設計せずに現行データモデルへ接続すると、Prototypeの「入力負荷を増やさない」制約に違反するか、疾患特化の深さが失われるかのどちらかになる |
| Insights | **維持可能** | 確信度メーター（4段階ドット）は`confidenceLabel(sampleSize)`（`analytics/confidence-engine.js`）が持つ`insufficient/low/medium/high`の4段階としっかり一致する。パターンカレンダー（7×4色分けグリッド）は既存の周期・気分の色分けヒートマップとしては新規構築が必要だが、これは「新規開発」であって「既存レイアウトの破壊」ではない |
| Experiment | **維持可能（ただしバックエンド一本化が前提）** | UIとしては、Day X/14の導出・仮説文・観察タグ・「試す」CTAはすべてレイアウト変更なしで実データに接続可能。ただし接続先を3実装のうちどれにするかを先に決定する必要がある（後述） |
| Me | **維持可能** | Premium/Proの2段階表示、Research Contribution Badge、「気になること」変更導線は、いずれも既存のConsent/Case/Billingロジックと自然に対応する |
| Navigation | **維持可能（IA変更は既に意図的）** | 現行の実ナビは Home/Calendar/Record(FAB)/Insights/Settings であり、Prototypeの Home/Record/Insights/**Experiment**/Me とは約60%の重なりに留まる。Calendar→Experimentへの主役交代は、以前のCouncil（World-Class Layout Evolution Council等）で既に検証済みの意図的な設計判断であり、後退ではなく前進として扱ってよい。ただしCalendarの実資産（月齢計算等、`calendar-next.js`）の行き場を明示的に決める必要がある（Insightsのパターンカレンダーへ吸収するか、Founderが別途判断するか） |

**総合判定: 維持可能（Recordのみ条件付き）**

---

## Function Migration Matrix

| 機能 | 判定 | 理由 |
|---|---|---|
| Record保存 | **Adapterで移植** | 保存ロジック自体（`src/modules/record-three-card-save.js`, `save-and-sync.js`）は`window.getState()/saveState()`というグローバル経由であり、UIマークアップに直接依存していない。新UIから同じ形のペイロードを生成するアダプターがあれば接続可能。ただし前提として`user_records`ブロブ vs 正規化`records`テーブルの分岐を先に解消する必要がある |
| Record入力UI | **UI作り直し／ロジック一部再利用** | 既存の2つのレガシーウィザード（`record.html`4ステップ、`record-three-card.html`3カード）はいずれもPrototypeの単一画面フォームと構造が異なる。保存ロジックはアダプター経由で再利用、UIはPrototypeのものを正とする。疾患別深掘り項目は新規に段階的開示UIとして設計 |
| Calendar | **ロジックだけ再利用／UI作り直し** | `calendar-next.js`の月齢計算・周期タグ表示は実装として価値があるが、Prototypeのパターンカレンダー（気分/症状の色分けヒートマップ）とは別物。データソースとして部分流用し、UIはInsightsのパターンカレンダーへ統合するか、Founderが別枠を判断する |
| Home Insight | **Adapterで移植** | `home-insight-engine.js`/`reason-generator.js`等が生成するテキストを、Prototypeの単一カード＋確信度メーターへ流し込むアダプターで接続可能 |
| AI Insight | **Phase後送り（実LLM接続は新規開発）** | 現状「AI」と呼べる生成AI呼び出しは一切実行されていない。`src/ai/prompt-builder.js`はClaude（`claude-sonnet-4-20250514`想定）向けのプロンプトを構築するが、実際にAPIを呼ぶコードは存在しない。「気づき」自体はルールベースエンジンで生成済みのため、当面は現状のルールベース出力を「気づき」として使い続け（Prototypeも「AI」ではなく「気づき」と表現しており整合済み）、実LLM接続は独立したPhaseとして扱う |
| Question Layer | **そのまま移植** | `forbidden-word-validator.js`は「〜病です」「今すぐ病院」等を正規表現でハードブロックし、`ForbiddenWordError`を投げる実働コード。Prototypeの「断定禁止」原則を上回る保護レベルであり、そのまま新しい気づき生成パスに直結すべき |
| Experiment | **UI再利用は可・ロジックは一本化が前提** | 3系統（レガシー`src/modules/experiments.js`、DI接続済みJS`src/domains/experiment/*`、未接続TS`domains/experiment/*`）が並存。**JS実装（DI接続済み・実際にApiGateway経由で稼働中）を正としてTS未接続実装とレガシーを退役させる**ことを先に決定すべき。データモデルにday/total進捗フィールドが無いため、`startDate`/`plannedEndDate`からのDay算出ロジックが新規に必要 |
| Experiment Suggestion | **ロジック再接続（実装済みだが死んでいる）** | `ExperimentNudgeService`（`src/domains/engagement/experiment-nudge-service.js`）はルールベースの提案ロジックとして実装・DIコンテナ登録・テスト済みだが、**UIからの呼び出しがゼロ**。新規ロジック開発ではなく、既存の未使用サービスをPrototypeの「おすすめの実験」カードへ配線するだけで済む |
| Premium / Pro | **UIは維持、バックエンドは追加開発が必要** | Prototypeは既にPremium/Proの2段階を正しく表現しているが、実際の課金は`getTierLevel()`が`'pro'`のみを返す単一ティア（後述）。UIを変える必要はなく、バックエンドの価格差別化実装（FREEZE-FD-1解消）が別途必要 |
| Stripe | **そのまま移植（配管は健全）** | `src/services/stripe.js`→Supabase Edge Function（`stripe-checkout`, `stripe-webhook`）は実働しており、Checkout Session作成・Webhook署名検証・`subscriptions`テーブル更新まで一通り機能する。追加が必要なのは月額/年額に加えたPremium/Pro差別化の価格ID |
| Consent | **バックエンドはそのまま移植・UIは新規** | `consents`/`consent_events`テーブル（RLS・追記専用の法的証跡）と`ConsentService`は実装・テスト済み。PrototypeにはまだConsent UI（オンボーディングの軽い安心カード以上のもの）が存在しないため、既存の成熟したバックエンドに新規UIを接続するだけで済む、低リスクな作業 |
| Research Consent UI | **新規UI／既存ロジック活用** | `ConsentGateService`（level≥2要求、fail-closed）は実装済み。Prototypeのオンボーディングまたはmeに、研究協力への同意を取得する新規UI導線が必要 |
| Case生成 | **バックエンドはそのまま移植** | `case.factory.ts`は「7件以上の記録・21日以上・1件以上のOutcome」という前提条件を強制するルールベースの実働パイプラインであり、対応するSupabaseテーブル（`cases`, `case_snapshots`, `case_quality_scores`）とテスト（506行）も存在する。UIは不要（Case自体はバックエンドの成果物であり、その効果=Research Contribution Badge等だけが表出すればよい） |
| Similarity | **バックエンドはそのまま移植・UIはPhase後送り継続** | `similarity.engine.ts`はルールベースの重み付け類似度スコアリング（ベクトル/embeddingではない）として実装済み・RLS保護済み・大量のテスト（2500行超）があるが、Prototypeには一切表出していない。「症例DBが目的に見えないように」という制約とも一致するため、意図的にPhase後送りを継続してよい |
| Settings / Me | **Adapterで移植** | 「気になること」変更導線・プライバシーカード・Research Contribution Badgeは、いずれも既存のConsent/Caseロジックへアダプター経由で接続可能 |
| Backup / Export | **本Councilでは未調査（要フォローアップ）** | 5件の並列監査のいずれもBackup/Exportを直接対象にしていない。データ削除（GDPR）に関する言及（`tests/data-deletion/`）はConsent監査で軽く触れられたのみ。判定を推測で埋めず、Phase 1着手前に専用の小規模監査を追加することを推奨する |

---

## Record Migration Audit

RecordはIPPOの中核であるため、本Councilが最も重点的に監査した領域である。

**現行データモデルとの乖離**
本番の`RecordEntity`（`domains/record/record.entity.ts:17-81`）は約30項目を持つ（`symptoms[]`, `painLevel`(0-10), `painLocation[]`, `painType[]`, `menstrualCycle`, `bloodClot[]`, `bloodColor[]`, `temperature`, `energy`(0-5), `mood`(0-5), `sleepBed/sleepWake/sleepHours/sleepQuality`, `meals`, `bowel`, `dischargeAmount/Type`, `wellnessScore`, `smiScore`, `bodyChoices`, `diseaseCheck`, `factors[]`, `medication[]`, `note`）。Prototypeの5項目（気分・睡眠3択・肌3択・行動タグ6種・メモ）とは構造的に別物であり、**「肌」の概念はコードベースのどこにも存在しない**（`domains/record`・`src`全体をgrepしてゼロ件）。行動タグ（カフェイン/乳製品/糖質/アルコール/運動/早寝）に対応する語彙も存在せず、最も近いのは汎用的な`factors[]`配列のみ。

**保存ロジックの現状（2系統が並存）**
- クリーンアーキテクチャ層（`domains/record`, `application/record`, `infrastructure/record`, `infrastructure/db`）は**未接続のスタブ**。`infrastructure/db/client.ts:1-6`は`"DB not implemented yet"`を投げ、`infrastructure/record/record.repository.ts:22-42`の`StubRecordRepository`は全メソッドが`"not implemented"`を投げる（コメントには「PR-007でSupabaseRecordRepositoryに置き換え予定」とあるが、実際には別経路が採用された模様）。
- 実際に稼働している保存経路はレガシー側: `record-three-card-save.js`/`save-and-sync.js`→`window.getState()/saveState()`（localStorage）→`syncRecordImmediately()`（`supabase.js:392-443`）→`user_records`テーブルへJSONBブロブとしてupsert（`{id, user_id, record_date, data: record, updated_at}`）。これは`supabase/migrations/20260029-32`が作る正規化`records`/`record_symptoms`/`record_factors`テーブルとは**別のテーブル**である。

**Prototypeとの自然な接続可否**
自然には接続できない。理由は上記のスキーマ乖離に加え、`UNIQUE(user_id, record_date)`制約がバックフィル待ちで未適用（migration 20260030コメントより）である点、そして保存パイプラインが`window`グローバルとSupabaseセッションのuser_idに強く依存しており、静的なPrototypeにはそのブリッジが存在しない点。

**入力項目を増やさずに済むか**
そのままでは済まない。ただし全項目を毎回すべて表示する必要はない。既存の`record-three-card.html`には既に「症状ピッカー→適応的follow-up」という段階的開示パターンが存在しており、これを再利用し、**オンボーディングの「気になること」選択に応じて疾患別の深い項目（痛みレベル・周期・血塊等）を条件付きで追加表示する**設計であれば、Prototypeの既定ビュー（5項目フォーム）を壊さずに疾患特化の深さを取り戻せる。この設計は移植の前提として明示的に行う必要があり、後回しにすると「入力負荷を増やさない」原則と「疾患特化の特別感を削がない」原則のどちらかが破られる。

**データ構造の矛盾**
矛盾あり（上述の2スキーマ並存）。新UIを接続する前に、どちらを正とするか（正規化`records`系を推奨、根拠: migration世代が新しく、既存実装計画書`IMPLEMENTATION_PLAN_V1.md`のPhase A-3が正規化テーブルを前提としている）をFounderが決定し、レガシーブロブからのバックフィルを実施する必要がある。

**Experiment文脈・今週の実験対象・観察タグとの整合**
部分的に整合。Prototypeの「今週の実験対象」バナーとタグハイライト機能に対応する直接的なフィールドは現行データモデルに存在しない（最も近いのは汎用`factors[]`）。`Experiment.interventionType`とRecordの`factors[]`をクライアント側で突き合わせるか、`recordHighlightTag`相当の新規フィールドが必要。

**Supabase接続時のUX負荷**
現行の保存パイプラインには既に非同期セーフティ（`syncPending`フラグによるリトライ、500ms遅延の`cloudBackupAll`フォールバック）が存在する。PR-LAYOUT-03で追加した「記録しました✓」フィードバック（550ms固定タイマー）は、実データ接続時には**固定タイマーではなく実際の保存Promiseの解決を待つ形に置き換える**必要がある。楽観的UI（即座に成功表示→裏で同期・失敗時は静かにリトライ）という設計方針自体は現行パターンと矛盾しない。

---

## Repository Strategy

| 選択肢 | コスト | リスク | 速度 | 将来性 | Legacy混入リスク |
|---|---|---|---|---|---|
| A. 現行ippoへPrototypeを戻す | 中 | 中 | 速い（既存バックエンドをすぐ使える） | 高（社内既存推奨方針と一致） | 中（strangler figパターンの継続適用で管理可能） |
| B. ippo-rebuildを新主リポジトリに | 高 | 高 | 遅い（Consent/Case/Similarity/Stripe/RLS/認証を再実装または再移植する必要） | 中 | 低（クリーンスタートだが、成熟済みの実装を再移植する過程で品質退行のリスク） |
| C. Monorepo化 | 中〜高 | 中 | 中 | 中 | 中（「どちらのコードが正か」という本質的決定を先送りするだけ） |
| D. 完全新規で再実装 | 最高 | 最高 | 最も遅い | 低（社内方針と矛盾） | 低いが、Consent/Case等の法的証跡・コンプライアンスロジックを再実装するリスクが極めて高い |
| E. アイデアのみ引き継ぎ融合 | 中 | 中 | 中 | 中 | 中（実際にはよく機能している既存コードを「アイデア」止まりで扱い、過小活用するおそれ） |

**根拠**: `docs/final-recommendation.md`（2026-05、最も権威ある内部文書と確認済み）は既に「Vite＋app.htmlの現行構成を維持し、フレームワーク移行は`/poc/`での小規模実験に留め、本格的なフレームワーク移行は3〜6ヶ月後に画面単位で段階的に行う」ことを明示的に推奨している。また`src/legacy/`ディレクトリと`LEGACY_REMOVAL_PLAN.md`/`ADR-005-guard-decommission.md`/PR-089番台のコミット群は、この種の段階移行（strangler figパターン：ロジックをモジュールへ抽出しつつ`window`経由の互換性を保つ）を過去90PR規模で既に実践してきた実績を示す。

**最終提案: A（現行ippoへPrototypeを戻す）**。`app.html`のスクリーンフラグメントをHome→Record→Insights→Experiment→Meの順に、既存のstrangler figパターンで1画面ずつ置き換える。実際に「動いている」バックエンド資産（Consent, Case, Similarity, Stripe, confidence-engine, ExperimentNudgeService, forbidden-word-validator）を各Phaseで再利用し、各監査で見つかった重複・デッドコード（未接続TS Experiment実装、孤立した`billing.entity.ts`の`PlanType`、未接続のRecordスタブ層）は、該当画面を移植するタイミングで退役させる。これは社内の既存推奨方針とも一致し、B/Dで懸念されるコンプライアンス・セキュリティコードの再実装リスクを回避できる。

なお、既存`docs/IMPLEMENTATION_PLAN_V1.md`のPhase F-2/F-4（「Record UI → screens/record/」「Experiment UI → screens/experiment/」）は、まさに今回のPrototype UIをそのまま充当できる項目である。両者は独立した計画ではなく、**同じ移行の異なる時点からの記述**として統合すべきである。

---

## UX Constraints

| 制約 | 遵守可否 | 備考 |
|---|---|---|
| Prototypeの見た目をなるべく崩さない | 遵守可能（Recordのみ要設計） | 上述の通り |
| Record入力負荷を増やさない、だが疾患特化の特別感を削がない | **緊張関係あり、要設計** | 段階的開示（オンボーディングの気になること連動）で両立可能。設計せずに現行30項目モデルへそのまま接続すると、どちらかの原則が破られる |
| Homeの情報密度を増やしすぎない | 遵守可能 | 実データはすべて既存の1カード枠に収まる形状 |
| AIを主役にしない、だが最大限活用する | 遵守可能・むしろ良好 | ルールベース気づきエンジン＋forbidden-word-validatorは「AIを裏方として最大限活用する」という設計思想を既にコードレベルで体現している |
| Premium導線を押し売りにしない | 遵守可能 | UI側は既に「あとで」導線・reassurance文言を実装済み。バックエンドの単一ティア→2ティア差別化は別途必要だがUIへの影響はない |
| Experiment文脈を維持する | **要決定** | 3系統の実装を1つに一本化する意思決定が前提。決定しないまま着手すると文脈が分裂する |
| 症例DBが目的に見えないようにする | 遵守できている | Case/Similarityの実データはPrototypeに一切表出しておらず、Research Contribution Badgeも件数等の生データを意図的に隠す設計（`buildResearchBadge()`）で実装済み。現状の非表出方針をそのまま継続すればよい |
| ユーザーの目的は改善であり、Case化は結果である | 構造的に遵守されている | `case.factory.ts`の前提条件（7件以上の記録・21日以上・1件以上のOutcome）が、実験が実際に行われて初めてCase化されるという順序をバックエンドレベルで強制している |

---

## Migration Roadmap

既存`docs/IMPLEMENTATION_PLAN_V1.md`のPhase A〜F構成をベースに、本Council監査で判明した実態（Consent/Case/Similarityの一部が既に先行実装済み、Experiment実装の重複、Recordスキーマの分岐）を反映して優先順位を組み替える。

```
Phase 0: Prototype Freeze（完了・Founder実機確認済み）

Phase 1: Record基盤の統合（最優先・最難関）
  - user_recordsブロブ vs 正規化recordsテーブルの一本化方針をFounderが決定
  - 疾患別プログレッシブディスクロージャー層の設計（オンボーディング「気になること」連動）
  - 新Record UIと既存save-and-sync.js/syncRecordImmediately()のアダプター接続
  - UNIQUE(user_id, record_date)制約の適用（バックフィル含む）
  - 達成フィードバックの固定タイマーを実保存Promiseベースへ置換

Phase 2: Home Insight + Question Layer接続
  - home-insight-engine.js / confidence-engine.jsをHero確信度メーターへアダプター接続
  - forbidden-word-validator.jsを新しい気づき生成パスに直結
  - 2つの確信度語彙（4段階 insufficient/low/medium/high と3段階 HIGH/MEDIUM/LOW）を統一

Phase 3: Experiment統合（実装一本化が前提）
  - src/domains/experiment/*（DI接続済みJS実装）を正とし、未接続TS実装とレガシーmodules/experiments.jsを退役
  - ExperimentNudgeService（実装済み・未使用）をおすすめ実験カードへ接続
  - Day X/14導出ロジックの新規実装（startDate/plannedEndDateから算出）

Phase 4: Insights パターンカレンダー新規構築
  - calendar-next.jsの周期データを部分流用
  - 気分/症状の色分けヒートマップは新規実装（既存資産なし）

Phase 5: Premium/Pro/Stripe整合
  - 単一ティア課金（isPremiumのみ）→ FREE/Premium/Proの実価格差別化をStripeへ追加
  - getTierLevel()の本実装化（FREEZE-FD-1の最終解消）

Phase 6: Consent UI新規構築（バックエンドは既存流用）
  - 既存consents/consent_eventsテーブル・ConsentGateServiceへ新規Consent UIを接続
  - Research Consent導線をオンボーディングまたはMeへ新規追加

Phase 7: Case / Similarity表出（バックエンドは既存、UIは意図的に後送り継続）
  - Research Contribution Badgeの実データ接続（Case数・研究同意状態）
  - Similarity/症例DB検索UIは「症例DBが目的に見えないように」の原則によりPhase後送りを継続
```

**既存計画との関係**: `IMPLEMENTATION_PLAN_V1.md`のPhase A（Record正規化）・Phase C（Experiment）・Phase E（Case+Consent）・Phase F-2/F-4（screens/移行）は、上記Phase 1〜7とほぼ対応する。ただし同文書のGap分析（G-05〜G-10を「未実装」とする記述）は本Council監査結果と食い違っており、リフレッシュが必要（後述）。

---

## Integration Risk

| リスク | 深刻度 | 内容 |
|---|---|---|
| UI崩壊リスク | 低〜中 | Recordのみ中リスク（段階的開示設計の成否に依存）、他画面は低リスク |
| Legacy混入リスク | 高 | `app.html`は`app-legacy.js`なしに起動不可であることが監査で確認済み。ブリッジ修復前にアダプターを組むと新UIにもレガシー依存が波及する |
| Record保存破壊リスク | 高 | 2つに分岐したスキーマ（`user_records`ブロブ vs 正規化テーブル）を統一せずに新UIを接続すると、どちらかのデータが欠損・不整合になる |
| Supabase接続リスク | 中 | 認証自体は実働しているが、2つの並行認証スタック（`app.html`内REST + Supabase JS SDK）がlocalStorageキーを共有する設計であり、脆さが文書化済みの技術的負債として存在する |
| AI出力トーン違反リスク | 低 | `forbidden-word-validator.js`が実働しており、むしろPrototypeの原則を上回る保護がある。ただし「AI Insight」という呼称を実際に使う場合、実LLM接続（現状未配線）とのギャップに注意 |
| Consent未接続リスク | 中 | バックエンドは成熟しているが、新Prototype UIには研究同意等の導線がまだない。Case/Similarityの表出（Phase 7）前に必ず接続する必要がある |
| Premium/Stripe不整合 | 高 | 現在Stripeは単一価格帯（月額/年額）のみで、PrototypeのPremium/Pro 2段階の価格差別化に未対応（FREEZE-FD-1として既知・未解消） |
| Experiment二重実装 | 高（移植前から既に発生済み） | 3つの並行Experiment実装が現在進行形で存在する。新規移植時に4つ目を生まないよう、着手前にどれか1つへ一本化する意思決定が必須 |
| Data Model不一致 | 高 | Record（30項目 vs 5項目）、Experiment（3実装間のフィールド不一致）、Billing（`getTierLevel()`の'pro'/'free' vs `billing.entity.ts`の`PlanType FREE\|PRO\|CLINIC` vs Founder決定のFREE/Premium/Pro、という3つの命名体系）が象徴的 |
| Browser Verification不足 | 中 | 本Councilはコード監査のみでBrowser Verificationを一切行っていない。各Phase実装後は、既存の検証プロセス（複数幅・Console Error確認）を継続する必要がある |
| **既存実装計画書の陳腐化リスク（新規発見）** | 高 | `IMPLEMENTATION_PLAN_V1.md`（2026-06-24生成）のGap分析はConsent/Case/Similarityを「未実装」としているが、本Council監査ではこれらの相当部分が実装・テスト済みであることを確認した。この文書を更新せずにPhase実装を進めると、既に完了した作業を重複実装してしまうおそれがある |

---

## Implementation Plan Addendum

`docs/IMPLEMENTATION_PLAN_V1.md`（既存の唯一の実装計画書）へ以下の追記を提案する。実際の追記はこのCouncil文書の完了後、Founder承認を得て別途行う。

**追記すべき内容:**

1. **採用するRepository Strategy**: A（現行ippoへPrototypeを戻す。`app.html`のスクリーンフラグメントを1画面ずつ置き換えるstrangler figパターンの継続）
2. **Phase別移植順序**: 本文書の「Migration Roadmap」セクション（Phase 1〜7）を、既存Phase A〜Fの後継/並行フェーズとして追加
3. **機能別移植方式**: 本文書の「Function Migration Matrix」をそのまま追記
4. **Record移植方針**: 本文書の「Record Migration Audit」の全文を追記。特に「段階的開示層の設計」と「スキーマ一本化」を新規のCritical Gap（G-21, G-22相当）として`Gap一覧`テーブルに追加することを推奨
5. **Migration Risk**: 本文書の「Integration Risk」テーブルをそのまま追記
6. **Exit Criteria**（Phase 1完了の判定基準として提案）:
   - Recordスキーマが単一テーブル系統に統一されている
   - 疾患別段階的開示層の設計がFounder承認済み
   - Experiment実装が1系統に一本化され、他2系統が削除されている
   - `getTierLevel()`が実際に'premium'/'pro'/'free'の3値を返すよう本実装化されている
   - 320/375/390/430pxでのBrowser Verificationが各Phaseで実施されている
7. **Browser Verification項目**: 既存のPR-LAYOUT系レポート（`docs/rebuild/PR_LAYOUT_01〜03_REPORT.md`）で用いた検証項目（全画面・全Day状態・複数幅・Console Error 0件）を、実データ接続後も同様の粒度で継続する旨を明記
8. **Gap分析のリフレッシュ要求**: 現行のGap一覧（G-05 casesテーブル、G-06 consentドメイン、G-07 Case生成パイプライン、G-08 Quality Score計算、G-10 anonymized_user_mapを「未実装」とする記述）は、本Council監査結果（いずれも実装・テスト済みと確認）と矛盾する。次回改訂時に現状に即して更新することを強く推奨する

---

## Founder Recommendation

1. まず**Record**の意思決定（スキーマ一本化＋段階的開示層の設計）を最優先で行うこと。これが本移植全体の最難関かつ前提条件である。
2. **Experiment実装の一本化**をPhase 3着手前に決定すること。先延ばしするほど4つ目の実装が生まれるリスクが高まる。
3. `docs/IMPLEMENTATION_PLAN_V1.md`のGap分析を、本Councilの発見（Consent/Case/Similarityの先行実装）に即して**リフレッシュ**すること。古い計画のまま進めると、既に完了した作業への重複投資が発生する。
4. Backup/Exportは本Councilで未調査であるため、Phase 1着手前に小規模な追加監査を行うこと。
5. Calendar機能（月齢計算等）の行き場について、Insightsへの吸収かFounder判断による別枠維持かを明確にすること。

---

## Final Verdict

# GO WITH CONSTRAINTS

**理由**: 現行IPPOのバックエンド資産（Consent, Case, Similarity, Stripe, 統計的確信度エンジン, forbidden-word-validator）は事前想定より遥かに成熟しており、Prototypeレイアウトを維持したまま移植できる見込みは高い。既存の内部推奨文書（`docs/final-recommendation.md`）とも一致する段階的移行戦略（Repository Strategy A）が明確に存在する。

しかし、この移植固有ではなく**移植前から存在する3つの技術的負債**（Recordスキーマの分岐、Experiment実装の三重化、実装計画書のGap分析の陳腐化）は、Phase 1着手前に解消すべき前提条件であり、これらを未解決のまま進めると「無条件のGO」は成立しない。したがって、これらを名指しした制約付きでの前進（GO WITH CONSTRAINTS）を最終判定とする。

次のアクション: Founderが本文書の「Founder Recommendation」5項目、特にRecordのスキーマ一本化と段階的開示層の設計方針を決定した後、`docs/IMPLEMENTATION_PLAN_V1.md`への正式な追記を行い、Phase 1（Record基盤の統合）に着手する。
