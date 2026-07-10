# IPPO REPOSITORY STRATEGY RE-EVALUATION COUNCIL
## Repository Strategy A vs B 最終決定（再審査）

> 本Councilは実装前の戦略再評価である。コード変更・実装は一切行っていない。
> 前提資料: `docs/IMPLEMENTATION_PLAN_V1.md`（出力11「Repository Strategy（正式採用）」= A案、2026-07-09改訂）、
> `docs/rebuild/IPPO_REBUILD_MIGRATION_FEASIBILITY_COUNCIL.md`（A案採用の originating council）、
> `docs/rebuild/IPPO_RECORD_MIGRATION_DESIGN_COUNCIL.md`（A案前提のConfirmed Founder Decisions）、
> `docs/rebuild/PR_REC_03_RUNTIME_INTEGRATION_PLAN.md`（再評価のトリガーとなった実調査）、
> 現行ippo実コード（`domains/`, `src/`, `app.html`, `prototype/`, `supabase/migrations/`）を直接読み込み・行数計測して検証。
> 推測箇所はすべて「推測」と明記する。

---

## Executive Summary（先に結論）

**この再審査で最も重要な発見は、Repository Strategy Bの前提そのものが実コード上で成立していないことである。**

Founderの再評価理由は「Prototypeへ成熟したDomainだけを選抜して移植すれば、Bridge・Adapter・Legacyを増やさずに済む」という期待にある。しかし実コードを調査した結果、**Founderが「成熟した資産」として名指ししたConsent/Case/Similarity/Stripe/Experimentの実働コードは、クリーンに分離された移植可能な層には存在しない**ことが判明した。

```
domains/*.ts（クリーンアーキテクチャ層、51ファイル・3,240行）
  → composition-root.js から一切importされていない（grep結果ゼロ件）
  → domains/record/infrastructure/db/client.ts は "DB not implemented yet" を投げる
  → domains/record/record.repository.ts の StubRecordRepository は全メソッド未実装
  → domains/experiment/*.ts はテストのみで本番非接続（IMPLEMENTATION_PLAN_V1.md 出力14で確認済み）
  → 実質「死蔵コード／将来構想の下書き」であり、Bが前提とする「移植元」ではない

src/domains/*.js + src/repositories/*.js（実際に稼働している層、478ファイル・81,350行の一部）
  → src/application/composition-root.js が実際にDI登録しているのはこちら
  → window.getState()/saveState()、window.rtcSaveDelegate等のグローバルに強依存
  → app.html は app-legacy.js（1,917行）なしに起動不可（Migration Feasibility Council確認済み）
  → 2つの並行認証スタック（app.html内REST + Supabase JS SDK）がlocalStorageキーを共有
  → src/domains/case/ 内部でさえ case-generation-service.js と CaseGenerationService.js が重複並存
```

つまり「成熟したDomainだけを選抜して移植する」という作業は、実際には次のどちらかになる。

1. **タングルした`src/`の該当部分をそのまま持っていく** — window依存・DI・二重認証・legacy起動依存を含めて移植することになり、「綺麗になる」というBの動機そのものが崩れる。
2. **未接続の`domains/*.ts`を今から本番相当に仕上げる** — これは「移植」ではなく**Consent/Case/Stripe相当の法務・決済クリティカルなロジックのゼロからの再実装**であり、A/B/C/D/E比較時に既にD（完全新規再実装）が「Consent/Case等の法的証跡・コンプライアンスロジックを再実装するリスクが高い」という理由で不採用になったのと**同一のリスクを、Bという名前で再導入する**ことになる。

一方、Strategy A（現行採用中）の「Legacy増加」という懸念についても実データで検証したところ、**すでに90PR規模のstrangler figで`src/legacy/`は9行のブリッジファイル1つまで縮小しており、Legacy残存率は増加ではなく減少トレンドにある**ことが確認された（詳細は後述）。

**Final Verdict: A（現行Strategy Aを継続）。ただしHybrid的な補強条件を付す。** 詳細は末尾。

---

## 1. Repository Strategy A 最終評価

### 定義
`app.html`／`src/`のVite runtimeを本体として維持し、`prototype/`のUI（マークアップ・CSS・状態ロジック）を画面単位で移植する。保存パイプライン・DI・Supabase接続・認証はすべて現行のまま。

### 実コード裏付け
- **既に公式採用済み**: `docs/IMPLEMENTATION_PLAN_V1.md` 出力11「Repository Strategy（正式採用）」（2026-07-09改訂）に「A案を正式採用する」と明記。
- **統合パターンは既に確立・実証済み**: `screen-router.js`のSCREEN_HTML `?raw`注入パターン（Phase 8方式）で、Record画面の統合設計（PR-REC-03）はコード変更ゼロで「CONDITIONAL GO」判定まで到達している。新規の統合機構を発明する必要がない。
- **保存パイプラインは無改変で済む設計**: PR-REC-03 8節のロールバック計画で明記の通り、`_rtcPipelineSave`/`upsertRecord`/`syncRecordImmediately`は「ロールバックの対象にすらならない」＝最も安全マージンが大きい部分に一切手を入れない。
- **Legacy除去は既に実績がある**: `src/legacy/`は現在`legacy-bridge.js`（9行）のみ。git log上、legacy/cutover関連コミットは2,011コミット中79件（PR-089シリーズ等）。90PR規模の継続的なstrangler fig運用により、Legacyディレクトリの実体はほぼ払拭済み（ただし`app-legacy.js`は1,917行、起動時の必須依存として現存）。

### 弱点（正直に記載）
- `app-legacy.js`（1,917行）が起動必須依存として残存しており、「Legacy完全ゼロ」ではない。
- `src/`全体で478ファイル・81,350行という規模はそれ自体が新規Contributor理解のハードルになる。
- `domains/*.ts`という未接続の並行実装（Record/Experimentで確認済み、Consent/Case/Similarityも同様の疑いが濃厚）を放置したままAdapterを積み増すと、「どちらが正か分からないコード」がさらに増える。

---

## 2. Repository Strategy B 最終評価

### 定義（ユーザー提示の定義を採用）
`prototype/`（またはippo-rebuild）を新しい本体（新Runtime）として採用し、現行ippoから「成熟したDomainだけ」を選抜して移植する。`app.html`へは戻さない。

### 実コード裏付けによる評価

**前提の破綻**: Bは「Domainがクリーンに分離されている」ことを前提にしているが、実コードはそうなっていない。

| Founderが「成熟」と評価した資産 | 実際に稼働している場所 | クリーン層(`domains/*.ts`)の状態 |
|---|---|---|
| Consent | `src/domains/consent/*.js` + `src/repositories/consent/*.js`（composition-root.js経由でDI登録） | `domains/consent/*.ts`はSupabase未接続のまま並存（IMPLEMENTATION_PLAN_V1.md G-06で確認済み） |
| Case | `src/domains/case/case-generation-service.js`（composition-root.js:31でimport確認済み）。同ディレクトリに`CaseGenerationService.js`も重複存在 | `domains/case/case.factory.ts`は独立ロジックとしてはテスト済みだが、composition-root.jsからのimportはゼロ件（grep確認） |
| Similarity | `src/domains/similarity/*.js`（`similarity-candidate-builder.js`, `feature-extractor.js`, `similarity-engine.js`等、composition-root.js:36-41で確認） | `domains/similarity/*.ts`（similarity.engine.ts等）は同名だが別実装。composition-root.jsからのimportはゼロ件 |
| Experiment | `src/domains/experiment/experiment-lifecycle-service.js`（composition-root.js:27で確認、`ExperimentLifecycleService`としてDI登録） | `domains/experiment/*.ts`はテストのみで非接続と出力14で明記済み |
| Stripe | `src/services/stripe.js` + Supabase Edge Functions（`stripe-checkout`, `stripe-webhook`） | `domains/`配下にStripe相当の並行実装は存在しない（唯一`domains/billing/billing.entity.ts`1ファイルのみ、型定義のみでロジックなし） |

つまり「Domain」という言葉が指すものが**2つの矛盾した実体**（`domains/*.ts`＝未接続の設計図、`src/domains/*.js`＝実働だがlegacy runtimeに埋め込み）に分裂しており、Bの提案者（Founder）が期待している「移植すれば済む綺麗なDomain」はどちらの実体でもない。

### B案を実行する場合の2つの現実的シナリオ

**シナリオB-1: `src/domains/*.js`をタングルごと持っていく**
- composition-root.js（DIコンテナ）、window.getState()/saveState()、二重認証スタック、Supabaseクライアント初期化、`app-legacy.js`への隠れた依存関係を含めて新Runtimeに移植する必要がある。
- これは実質的に「81,350行のsrc/のうち、使われている部分を新しい入れ物にコピーする」作業であり、**Aで発生するAdapter量よりもむしろ大きくなる可能性が高い**（Aは既存runtimeにUIだけ足すが、Bは既存runtime相当を丸ごと新環境に再現する必要がある）。
- 「Prototypeへ移植すれば綺麗になる」という動機が成立しない（tangleごと移すため）。

**シナリオB-2: 未接続の`domains/*.ts`を今から本番化する**
- Record（`StubRecordRepository`が"not implemented"を投げる）、Experiment（テストのみ）と同様に、Consent/Case/Similarityの`domains/*.ts`も本番Supabase接続・RLS・実際の認証コンテキストでの検証が**ゼロから必要**になる可能性が高い（本Councilでは`domains/consent`等の接続状況を個別確認していないため、ここは「推測」）。
- これは移植ではなく**新規実装**であり、Consent（同意管理の法的証跡）・Stripe（決済）という、ミスが直接コンプライアンス・売上に影響する領域を作り直すことになる。
- A/B/C/D/E比較の原点（Migration Feasibility Council）で「D（完全新規再実装）」が不採用になった理由（「Consent/Case等の法的証跡・コンプライアンスロジックを再実装するリスクが高い」）が、B-2にもそのまま当てはまる。

**結論**: Bは名目上「A案より軽い」ように見えるが、実コード上はB-1（Aと同等以上のAdapter量＋新環境での二重認証・DI再構築という負債持ち込み）かB-2（Dと同種の再実装リスク）のいずれかであり、**「Domainだけ選抜する」という軽量な第三の道は実コード上に存在しない**。

---

## 3. 15項目 必須評価マトリクス

| # | 評価項目 | Strategy A | Strategy B |
|---|---|---|---|
| 1 | 5年品質 | 中〜高。既存のRLS・controlled vocabulary・監査証跡パターンを継続活用。Record/Experimentの二重実装という既存負債は残るが、Phase進行ごとに退役方針が明記済み（出力14） | 低〜中。B-1なら現状の負債をそのまま新環境に移設するだけで5年後も変わらない。B-2ならConsent/Stripeを作り直す過程で新しいバグ混入リスクを抱えたまま5年運用することになる |
| 2 | 10年品質 | 中。ドキュメント過多（後述）という別の負債はあるが、コード自体は正規化スキーマ・RLSへ収束しつつある | 低。B-2の場合、法務・決済クリティカルなコードを再実装した「作り直し版」を10年運用することになり、実績のない新規コードのリスクを長期に渡って背負う |
| 3 | コード量 | 現状: `src/`81,350行＋`domains/`3,240行＋`prototype/`1,852行。Aは`prototype/`のマークアップを`src/screens/`へ移植するだけなので純増分は小さい（PR-REC-03範囲: index.html 116行分＋関連CSS/JS） | B-1は81,350行のうち稼働部分を丸ごと新環境へ複製するため実質的な総コード量はAとほぼ同等かそれ以上（新旧二重期間が発生）。B-2は3,240行を本番品質まで書き足す必要があり、規模は不明（Consent/Case/Similarityの本番実装がゼロから必要なら数千行規模になり得る、推測） |
| 4 | 技術負債 | 中（既知・文書化済み: Record/Experiment二重実装、二重認証スタック、`app-legacy.js`依存） | B-1は同じ負債をそのまま移設。B-2は「未接続コードを本番化する」という新種の負債（未検証コードの本番投入）を追加 |
| 5 | Runtime Complexity | 中。単一Vite runtime、DIコンテナ1つ、strangler figパターンで置き換え中 | B-1は新環境で同等のRuntime Complexityを再構築する必要がある（複雑さが減らない）。B-2は静的なPrototypeに認証・DI・Supabase接続を新規に組み込む必要があり、**むしろ新しいRuntime Complexityがゼロから発生する**（現状prototype/はwindow依存ゼロの独立静的ページ、PR-REC-03 6節で確認済み） |
| 6 | 開発速度 | 速い。既存の統合パターン（screen-router.js）を再利用でき、PR-REC-03で具体的な分割PR案（03a/03b/03c）まで既に設計済み | 遅い。B-1/B-2いずれも、まず新環境の土台（DI・認証・Supabase接続）を作ってから機能移植に着手する必要があり、Phase 1着手が大きく後ろ倒しになる |
| 7 | バグ混入リスク | 低〜中。保存パイプライン等の中核は無改変（PR-REC-03確認済み）。UIとAdapterの新規コードのみがリスク対象 | 高。B-2はConsent/Stripe等の再実装そのものがバグ混入源になる。B-1は複雑な移設作業（DI・二重認証の移植）中の設定ミスがリスク源になる |
| 8 | テスト容易性 | 中〜高。既存テスト（`tests/domains/case`, `tests/e2e/flow.case-to-similarity.test.ts`等）がそのまま有効であり続ける | 低。B-2は新規実装に対して新規テストをゼロから書く必要がある。既存の`tests/services/consent-service.test.js`等が対象コード（`src/domains/consent/*`）に対するものであり、`domains/consent/*.ts`を本番化する場合はこれらのテストが検証範囲外になる |
| 9 | Adapter量 | 中。PR-REC-03で特定済み: `_buildPayload()`互換Adapter1つ（Record）。他画面も同様に1画面=Adapter1つ程度で収まる設計 | B-1は「新環境から旧DI・旧window依存を呼ぶための逆方向Adapter」が同程度以上に必要。B-2はAdapter概念自体が消えるが、代わりに「ゼロから実装」という更に重いコストに置き換わるだけ |
| 10 | Legacy残存率 | **減少トレンドが実データで確認済み**（`src/legacy/`は9行のブリッジのみ。79件のlegacy関連コミットで縮小済み）。`app-legacy.js`1,917行は残存するが、Phase進行で個別画面ごとに退役対象になる | B-1はLegacy要素（`app-legacy.js`起動依存、二重認証）をそのまま新環境に持ち込むため、「新しいはずの環境」に初日からLegacyが混入する。B-2は新環境自体はLegacyフリーだが、本番未検証コードという別種のリスクを抱える |
| 11 | Repository可読性 | 中。`src/`の規模（478ファイル）自体が可読性の課題だが、`domains/*.ts`という「読みやすいが動いていないコード」が並存する点が可読性を損なっている最大要因（どちらが正か新規参入者には分からない） | 短期的には高い（新環境はPrototypeの1,852行のみから開始）。ただしB-1を選べば結局`src/`相当の複雑さが混入し、B-2を選べば結局Consent等の複雑な法務ロジックを新環境に書き足すことになり、中期的には同水準に収束する |
| 12 | 新規Contributor理解容易性 | 中。ドキュメント過多（`docs/`直下111ファイル＋`docs/rebuild/`15ファイル）が最大の障害。どのDomain実装が正か（`domains/*.ts` vs `src/domains/*.js`）を明示する棚卸しドキュメントが不足している | 短期的には高い（新環境はシンプル）。ただし「なぜ2つのリポジトリ/2つのRuntimeが存在するのか」という新しい混乱要因が生まれる可能性がある（推測） |
| 13 | AI開発効率 | 中。CLAUDE.md/AI_EXECUTION.mdによるスコープ限定運用が既に確立しており、PRごとに読むべきファイルが絞られる設計になっている（本Council自体がその運用下で実施） | 不明。新環境が確立するまでの過渡期はAI_EXECUTION.md的なスコープ限定運用が機能しにくい（何を正とすべきかの棚卸しが完了していないため）。推測だが、移行完了までの期間はAI開発効率が一時的に低下する可能性が高い |
| 14 | 売却可能性 | 中〜高。Consent/Case/Similarity/Stripeという「規制対応・コンプライアンス投資」は買い手にとって再現コストが高い資産として評価されやすい。Aはこれらを無傷で維持する | B-2はこれらを未検証の新規実装に置き換えるため、買い手のデューデリジェンスにおいて「作り直し中の法務・決済ロジック」は評価を下げる要因になり得る（推測）。B-1は資産そのものは維持されるため大きな差はないが、「移行が完了していない状態」自体が売却時のディスカウント要因になる |
| 15 | 将来React等移行の容易性 | 中。既存`docs/react-migration-proposal.md`が既に存在し、`/poc/`での小規模実験→段階移行という方針が`docs/final-recommendation.md`で明記済み。Aは現在の移行と将来のReact移行を同じstrangler figパターンで扱える | 中〜低。Bで新環境を構築する場合、その新環境自体の技術選定（Prototypeは現状Vanilla JS）とReact移行を同時に考える必要があり、二重の移行になるリスクがある（推測） |

---

## 4. メリット・デメリット比較表

| | Strategy A | Strategy B |
|---|---|---|
| **メリット** | 既存の統合パターン(screen-router.js)を再利用可能。保存パイプライン等の中核は無改変でロールバック容易。Legacy除去は既に90PR規模の実績あり(減少トレンド)。Consent/Case/Similarity/Stripeという実働・テスト済み資産をリスクゼロで維持できる。IMPLEMENTATION_PLAN_V1.md出力11〜17がそのまま使える(書き換え不要) | 短期的にはRepositoryの見た目がシンプル。「新環境=Legacy皆無」という理想からスタートできる(ただしシナリオB-1/B-2いずれかを選んだ時点でこの前提は崩れる) |
| **デメリット** | `src/`(81,350行)の規模自体が可読性・新規参入コストの課題として残り続ける。`domains/*.ts`という未接続の並行実装が「どちらが正か」を曖昧にしたまま放置されるリスク | Domainのクリーンな分離という前提が実コード上成立しない。B-1は負債を新環境に持ち込むだけ、B-2はConsent/Stripe等の法務・決済クリティカルなロジックの再実装という高リスクを抱える。今日ratifyされたばかりのFounder Decision(スキーマ一本化・段階的開示Freeze例外)を含む3つのCouncil文書が前提から崩れ、書き直しが必要になる |

---

## 5. 実装コスト比較

| 項目 | Strategy A | Strategy B |
|---|---|---|
| 初期セットアップ | ゼロ(既存runtime継続使用) | B-1: DIコンテナ・認証・Supabase接続を新環境に再構築。B-2: 上記に加えてConsent/Case/Similarityの本番相当実装が必要 |
| Record統合 | PR-REC-03a/03b/03cとして既に分割設計済み(CONDITIONAL GO)。Adapter1つ | 上記に加え、保存先である`_rtcPipelineSave`/`syncRecordImmediately`相当の仕組み自体を新環境に再現する必要がある |
| Experiment統合 | `src/domains/experiment/*`(DI接続済み)をそのまま呼ぶだけ(出力14で一本化方針確定済み) | 同上を新環境向けに移設(B-1)、または`domains/experiment/*.ts`を本番化(B-2、Day X/14ロジック等が未実装のため追加開発も必要) |
| Consent/Case/Similarity/Stripe | 無改変(現状のsrc/domains/*.js・repositories/*.jsをそのまま利用) | B-1: 移設のみだが二重認証・DI依存を含めて持っていく必要があり工数はAとの差分ではなくほぼゼロからの再構築に近い。B-2: 事実上の新規実装 |
| **総合コスト感** | **低〜中**(既存資産を使い倒す方向) | **高**(どちらのシナリオでも、Aで避けられているコストのどれかを必ず払うことになる) |

---

## 6. コード量比較

```
現状の内訳:
  domains/        51ファイル   3,240行  (未接続・並行実装)
  src/            478ファイル  81,350行 (実働runtime、legacyを含む)
  app.html        1ファイル    1,262行
  prototype/      3ファイル    1,852行  (静的・依存ゼロ)
  supabase/migrations/ 35ファイル (スキーマ資産)

Strategy A採用時の増分見込み:
  + prototype/のマークアップ・CSS・状態ロジックをsrc/screens/へ移植(PR-REC-03範囲: 概ね数百行規模)
  + Adapter数点(画面あたり1つ程度)
  − 画面移植完了ごとにレガシー画面(record.html 4ステップ等)を退役(純減要素あり)

Strategy B採用時の増分見込み:
  B-1: src/の該当部分(DIコンテナ・repositories・window依存込み)をほぼ丸ごと複製 → 数万行規模の移設作業
  B-2: domains/*.ts(3,240行)を本番品質へ拡張 → Consent/Case/Similarity/Stripe相当の実装を新規に積み増す必要があり、規模は現状のsrc/domains相当(数千〜1万行規模、推測)に近づく可能性が高い
```

**結論**: Aは既存81,350行を「使い倒しながら緩やかに縮小させる」設計。Bはどちらのシナリオでも、Aで既に完成している何かをもう一度作ることになり、コード量の観点では純増になる可能性が高い。

---

## 7. Technical Debt比較

| 負債の種類 | Strategy A | Strategy B |
|---|---|---|
| Record二重実装(domains/record vs src/modules/record*) | 既知・出力13で対応方針記載済み。Phase 1完了で解消予定 | B-2を選ぶ場合、この負債の「未接続側」を本番化することになり、負債の解消ではなく負債側への"昇格"になる |
| Experiment三重実装 | 出力14で一本化方針(`src/domains/experiment/*`を正)を確定済み。Phase 3で他2系統を退役 | 同様の一本化判断がB環境でも必要だが、退役ではなく「正とする側をどう移設するか」という追加の意思決定が必要になる |
| Case内部の重複(`case-generation-service.js` / `CaseGenerationService.js`) | **本Councilで新規発見**。Aの枠組みでも未解消の負債として残っている。Phase 7(Case/Similarity表出)着手前に棚卸しを推奨 | 同上。移設時にどちらを正とするか改めて判断が必要(先送りできない) |
| 二重認証スタック(app.html内REST + Supabase JS SDK) | 既知の文書化済み負債(出力15)。Aでは現状維持のまま画面移植を進める設計 | B-1は複雑な二重スタックをそのまま移設する必要がある。B-2は新環境に認証をゼロから設計することになり、二重スタック問題自体は解消できるが、Consent等との整合を再設計する必要がある |
| ドキュメント過多(`docs/`111ファイル+`docs/rebuild/`15ファイル) | **AB共通の負債、本Councilの新規指摘**。Repository Strategyの選択とは無関係に解消が必要 | 同左 |

**新規発見**: Case実装内部の重複(`src/domains/case/case-generation-service.js` と `CaseGenerationService.js`)は、Experiment(3系統)・Record(2系統)に続く**3件目の「同一Domain内での重複実装」**である。これはRepository Strategyの選択に関わらず、Phase進行前に棚卸しすべき独立した技術負債として記録する。

---

## 8. Runtime Complexity比較

- **Strategy A**: 単一Vite runtime。`composition-root.js`という単一のDIコンテナ経由ですべてのDomainサービスが解決される。`prototype/`は現状window依存ゼロの独立静的ページ(PR-REC-03 6節確認済み)であり、統合時に「移植(コピー)」であって「参照(import)」ではない方針が既に確定している。Runtime自体は増えない。
- **Strategy B**: 新Runtime(Prototype側)は現状、認証もSupabase接続もDIコンテナも持たない。これらをゼロから組み込む(B-1/B-2共通)ことは、既存の`composition-root.js`相当のものをもう一つ作ることに等しく、**移行完了までの過渡期は「2つのRuntimeが並行稼働する」状態**が避けられない(推測: モノレポ化や別サービス化をしない限り)。これはRepository Strategy Cとして既に検討済みの「Monorepo化」に近い一時状態であり、C案が抱える「どちらが正かの決定を先送りするだけ」というリスクをBも過渡期に内包する。

---

## 9. IMPLEMENTATION_PLAN_V1.1への影響

現行の`docs/IMPLEMENTATION_PLAN_V1.md`(2026-07-09改訂版)は、出力11で既にA案を正式採用として明記している。B案へ変更した場合、以下の書き換えが必要になる。

```
出力11(Repository Strategy正式採用): 全面書き換え
  → 「A案を正式採用する」を撤回し、B-1/B-2いずれかのシナリオを明記する必要がある。
    現状B自体がユーザー提示の定義止まりで、B-1/B-2どちらを指すか未確定なため、
    まずこの一次決定をFounderが行わない限り出力11は書けない。

出力12(Function Migration Matrix): 全項目の見直しが必要
  → 現在の記述はすべて「現行ippoのロジックへPrototype UIをAdapterで繋ぐ」前提。
    Bでは移植の向きが逆転する(現行ippoのロジックをPrototype側へ持っていく)ため、
    「Adapterで移植」「そのまま移植」等の判定文言も意味が変わる。

出力13(Record Migration Audit): Record Schema Decision の前提再検証が必要
  → IPPO_RECORD_MIGRATION_DESIGN_COUNCIL.mdのConfirmed Founder Decisions(2026-07-09、
    本Councilと同日付)は「既存_rtcPipelineSaveへのAdapter接続」を前提に書かれている。
    Bでは接続先のRuntime自体が変わるため、Save Flow Design節全体が書き直しになる。

出力14(Experiment Decision): 「正とする実装」は変わらないが「どこに置くか」の追記が必要
  → src/domains/experiment/*を正とする判断自体は不変。ただしBでは
    この実装をどう新環境へ持っていくか(コピーか、サービス分割か)を新たに決定する必要がある。

出力15(Integration Risk): リスク項目の総入れ替えが必要
  → 「Legacy混入リスク」「二重認証リスク」等はB-1では悪化方向、B-2では
    「新規実装リスク」という新しいリスク項目に置き換わる。

出力16(Exit Criteria): Phase構成そのものの見直しが必要
```

**関連するCouncil文書への影響**:
- `IPPO_RECORD_MIGRATION_DESIGN_COUNCIL.md`の「Confirmed Founder Decisions」(Decision 1〜3、2026-07-09にFounderが確定したばかり)は、A案(既存パイプラインへのAdapter接続)を前提に成立している。B案採用は、この**確定から実質1日以内**の決定を覆すことを意味する。データ移行的には0件のバックフィルで済むためコストは低いが、**意思決定プロセス上のコスト(合意形成のやり直し)は無視できない**。
- `PR_REC_03_RUNTIME_INTEGRATION_PLAN.md`自体が本再評価のトリガーだが、この文書が示した「CONDITIONAL GO」は**Runtime統合の技術的難易度が想定より高いこと**であって、「Strategy Aが失敗した」ことではない。4つの残存条件(行動タグギャップ、CSS diff確認、フィーチャーフラグ判断、Supabase環境指定)はいずれも「調査不能」ではなく「Founder決定待ち」であり、Strategy変更でこれらの条件が消えるわけではない(Bでも同種の決定は必要になる)。

**書き換え規模の見積り**: 出力11〜17相当(約230行、`docs/IMPLEMENTATION_PLAN_V1.md`の後半3分の1)がほぼ全面書き換え対象。加えて`docs/rebuild/IPPO_RECORD_MIGRATION_DESIGN_COUNCIL.md`のSave Flow Design節・Record Migration PR Plan節も書き直しが必要。

---

## 10. 移行ロードマップ比較

### Strategy A(現行計画、出力11のPhase 1〜7)
```
Phase 1: Record基盤統合(最優先・最難関) ← PR-REC-01〜08として既に分割設計済み
Phase 2: Home Insight + Question Layer接続
Phase 3: Experiment統合(一本化方針確定済み)
Phase 4: Insights Pattern Calendar構築
Phase 5: Premium/Pro/Stripe整合
Phase 6: Consent UI構築
Phase 7: Case/Similarity表出
```
着手可能な項目(PR-REC-01/04)は既に存在し、即着手できる。

### Strategy B(想定ロードマップ、推測)
```
Phase 0': 新Runtime基盤構築
  - シナリオ選択(B-1 or B-2)をFounderが決定 ← 現時点で未決定、本Councilでも特定不能
  - B-1: DIコンテナ・二重認証・Supabase接続を新環境に移設
  - B-2: domains/*.tsのConsent/Case/Similarity/Stripe相当を本番品質まで実装
Phase 1'〜7': Aと同等の機能移植(ただし土台が変わるため個別設計をやり直す必要がある)
```
Phase 0'自体がAには存在しない追加フェーズであり、**AのPhase 1(Record基盤統合)に相当する着手可能な作業がBには現時点で1つも存在しない**(シナリオ未確定のため)。

---

## 11. 特に議論を求められた論点への回答

**Q1. PrototypeへDomainだけ移植した方が本当に綺麗になるのか**
A. ならない。3節で示した通り、「移植可能な綺麗なDomain」という実体はコードベース上に存在しない。あるのは(a)タングルした稼働コード(`src/domains/*.js`)か(b)未接続の設計図(`domains/*.ts`)のどちらかであり、どちらを選んでも「綺麗な移植」にはならない。

**Q2. Domain移植の隠れたリスク**
A. 最大の隠れたリスクは、「テスト済み」という言葉の二重の意味である。`domains/case/case.factory.ts`等のテスト(`tests/domains/case/case.service.test.ts`)は**そのファイル単体のロジックテスト**であり、実際に稼働している`src/domains/case/case-generation-service.js`が本番のSupabase/RLS/実認証コンテキストで検証されているという意味ではない。逆に、本番で実際にテストされてきたのは`src/domains/*.js`側だが、これはB移植の対象として「綺麗」とは言い難い。この二重の「テスト済み」を混同すると、B-2のリスクを過小評価する。

**Q3. Repository Strategy Aを続けた場合、コード量はどこまで増えるのか**
A. 6節参照。画面ごとのAdapter(数点)＋マークアップ移植分(数百行)程度で収まる見込み。PR-REC-03で実際に「Adapter1つ」という規模感が既に実証されている。むしろ画面移植完了ごとにレガシー画面(4ステップrecord.html等)を退役できるため、正味では横ばい〜微減の可能性がある。

**Q4. Runtime統合の複雑さは将来どれだけ負債になるか**
A. 現状の複雑さの大部分(DIコンテナ、二重認証)はStrategy Aを選んでも選ばなくても既に存在する負債であり、UIの統合先をどこにするかとは別次元の問題である。この負債はA継続でもB移行でも解消されず、**別途「二重認証スタックの統一」「Domain内重複実装の棚卸し」という独立したプロジェクトとして扱うべき**(出力15で既に文書化済みだが未着手)。

**Q5. 現時点(まだ本番UI統合前)がStrategy変更の最後のタイミングか**
A. **データ移行の観点では真(ユーザー数0、バックフィル不要)。しかし意思決定・設計資産の観点では逆**。今日付でFounderが確定したばかりの3つの決定(Recordスキーマ一本化、Progressive Disclosure Freeze例外、PMS/PMDD暫定仕様)はすべてA前提で成立しており、B移行はこれらの再協議を要求する。「今なら安い」のはDBカラムの話であって、Council文書3本分の設計判断のやり直しコストではない。

**Q6. IMPLEMENTATION_PLAN_V1.1をB案へ変更した場合、どの程度計画を書き換える必要があるか**
A. 9節参照。出力11〜17相当(約230行)が全面書き換え、加えて関連Council文書2本のSave Flow Design相当節が書き直し対象。

---

## 12. Founder Recommendation

1. **B案を採用する前に、B-1とB-2のどちらを指すかをまず自問すること**。「Domainだけ選抜移植」という表現は、実コード上はこの二択のどちらかにしかならない。この一次分解なしにB案を進めると、着手後に初めてこの分岐に気づき手戻りが発生する。
2. **「成熟した資産を失いたくない」という要求は、Strategy Aを継続することで無条件に満たされる**。Bを選んだ場合、B-1は資産を複雑さごと持っていくだけで実質的な「綺麗さ」の向上がなく、B-2は資産そのものを未検証の再実装に置き換えるリスクを負う。Founderの本当の目的(綺麗なコードベース・成熟資産の保持)は、実はAとの相性の方が良い。
3. **Founderが本当に不満なのは「Repository Strategy」ではなく「Domain内の重複・未接続コードの放置」である可能性が高い**。Record二重実装・Experiment三重実装に加え、本Councilで新たにCase内部の重複(`case-generation-service.js`/`CaseGenerationService.js`)も発見した。これはA継続でもB移行でも解消されない独立した負債であり、Repository Strategyとは別に「Domain De-duplication監査」を提案する。
4. **ドキュメント過多(`docs/`126ファイル)は、AでもBでも解消されない**。5年・10年品質の観点では、これはRepository Strategyの選択より優先度が高い可能性がある。
5. Bを選ぶこと自体を完全否定はしない。ただし選ぶ場合は「B-1(移設)」か「B-2(再実装)」かを明示した上で、B-2を選ぶならConsent/Stripeという法務・決済クリティカル領域から着手する妥当性(通常は最もリスクを避けたい領域から着手するのは不自然)を別途正当化する必要がある。

---

## Final Verdict

# A（現行Strategy Aを継続）。ただし「Domain De-duplication」をHybrid的に追加する。

**理由**:
Repository Strategy Bは、「Prototypeへ成熟したDomainだけを選抜して移植すれば綺麗になる」という前提のもとに提案されたが、実コード監査の結果、**その前提を満たす「選抜移植可能な綺麗なDomain」はコードベース上に存在しない**ことが判明した。存在するのは(1)本番で実際に稼働しているがwindow依存・二重認証・DIコンテナに深く埋め込まれた`src/domains/*.js`、(2)テストは通るが本番非接続の`domains/*.ts`、の2つであり、どちらを移植対象に選んでもBの動機（Bridge・Adapter・Legacy削減）は達成されない。

一方Strategy Aは、既に90PR規模のstrangler figでLegacy footprint(`src/legacy/`)を実質的に払拭した実績があり、PR-REC-03で保存パイプライン等の中核に一切手を入れない統合設計まで到達している。IMPLEMENTATION_PLAN_V1.mdおよび関連3Council文書は既にA前提で書かれており、今日確定したばかりのFounder Decisionsもこの上に成立している。

したがって、**Repository Strategyとしては引き続きAを採用**する。ただし、本Councilで新規発見した「Case内部の重複実装」を含む**Domain内の重複・未接続コードの棚卸し(De-duplication)**を、A継続と並行する独立ワークストリームとして追加することを推奨する。これはFounderが本来望んでいた「綺麗なコードベース」を、リポジトリを分割することなく実現する道である。

**次のアクション**:
1. Founderへ本Council文書を提示し、B-1/B-2いずれを想定していたかを確認する。
2. Strategy A継続を正式に再確認する（`docs/IMPLEMENTATION_PLAN_V1.md`出力11は書き換え不要）。
3. 「Domain De-duplication監査」（Record/Experiment/Caseの重複実装棚卸し）を新規Councilまたは軽量監査として起票するかをFounderが判断する。
4. PR-REC-01・PR-REC-04（着手可能項目）に着手を再開する。
