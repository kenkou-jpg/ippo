# BD-034 — Supabase Persistence Scope Decision Memo

> docs/LEGACY_ASSET_INVENTORY.md Binding Decision BD-034「Wave2のすべての永続化層はSupabaseとする」。
> 分類: **Founder Action**（適用範囲の設計判断。監査済み、実装は本メモの対象外）。

---

## 目的

BD-034は「Wave2のすべての永続化層はSupabaseとする」と定めているが、実際の監査の結果、
これが文字通りには達成されていないことが判明した。この乖離をどう扱うかについて
Founderの判断を得る。

## 監査結果（2026-07-02実施、docs/RELEASE_READINESS_COUNCIL.md 18-B）

[persistence-config.js](../../src/infrastructure/persistence-config.js) の`PERSISTENCE_CONFIG`には
`networkSignal`の1エントリしか存在しない。`src/domains/*/`配下のリポジトリ実装を全件確認した結果：

**Supabase化済み（2ドメインのみ）:**
- NetworkSignal（[network-signal-supabase-repository.js](../../src/domains/network/network-signal-supabase-repository.js)、PR-042）
- ippo_events（SupabaseEventPersistenceRepository、PR-042）

**完全in-memoryのまま（15ドメイン以上）:**
Emotion / Menstrual / DiseaseCluster / FeatureVectorV2 / KnowledgeGraph / ResearchDataset /
Cohort / DatasetVersion / SimilarityPublicGate / Wave2ExitAudit / ReleaseReadiness /
FeatureStore / SimilaritySnapshotV2 等。これらはPersistenceConfigへのエントリすら存在せず、
Supabaseへ切り替える設計上の受け皿（Decorator/Factory）自体が未整備。

## 判断事項

1. **選択肢A（適用範囲の再解釈）**: BD-034の「すべての永続化層」を、恒久的なユーザーデータ
   （実際のβユーザーの記録・症状・疾患情報等）に限定して再解釈する。監査・研究・ガバナンス系の
   内部台帳（Wave2ExitAudit、ReleaseReadiness、DatasetVersion等の"Append-Onlyな意思決定記録"）は
   対象外とする。
   - この場合、対象を絞った上で「本当に恒久ユーザーデータを扱うドメインがSupabase化されているか」
     を再確認する必要がある（Record/Consent等、Wave1から存在する中核ドメインの現状確認を含む）。
2. **選択肢B（新規Roadmap起票）**: BD-034を文字通り達成する方針を維持し、残る15ドメイン規模の
   Supabase移行を新しいRoadmap（Wave3 Phase、または独立した"Persistence Migration Program"）と
   して正式に起票する。
   - 規模が大きいため、本Release Readiness Completion Programの制約（Roadmap変更禁止）の
     範囲外で別途計画する。
3. **選択肢C（β運用開始前は現状維持を許容）**: β運用で実際にリスクとなるのは「ユーザーが
   作成したデータが失われること」であり、内部監査・研究系ドメインのデータ消失は同種のリスクでは
   ないと整理した上で、BD-034の完全達成はLegacy Removal Council以降の課題として先送りする。

## 必要な証跡

外部証跡は不要（Founderの内部設計判断のため）。ただし判断内容は書面化して残すこと：

- [ ] 選択した選択肢（A/B/C）
- [ ] 選択肢Aの場合: 「恒久ユーザーデータ」の定義と、その定義に該当するドメイン一覧
- [ ] 選択肢Bの場合: 新Roadmapの起票予定時期
- [ ] 選択肢Cの場合: 先送りする期限（Legacy Removal Council開催時期の目安）

## Founderが確認する項目

- [ ] 現在Supabase化されているのはNetworkSignalとippo_eventsのみであるという監査結果
- [ ] β運用開始後、in-memoryのままのドメインに書き込まれたデータはプロセス再起動で消失する
      という技術的事実
- [ ] 選択した選択肢が、β運用で実際に生じるデータ消失リスクと整合していること

## 完了条件

Founderが選択肢A/B/Cのいずれかを明示的に選択し、その理由を記録していること。

## confirmed:true にしてよい条件

- **選択肢Aを選んだ場合**: 再定義した適用範囲に含まれるドメインの現状Supabase化状況を
  改めて確認し、その範囲内でBD-034が満たされていることを確認できた時点で、
  `ReleaseReadinessService.confirmItem({ founderId, category: 'BD_FOUNDER_REVIEW', itemId: 'BD-034', confirmed: true, note })`
  の実行をFounderが明示的にAIへ指示できる。noteには再定義した適用範囲を記載する。
- **選択肢Bを選んだ場合**: 新Roadmapが正式に起票され、少なくとも計画が存在する状態になった
  段階で、Founderが「移行完了までconfirmed:falseを維持する」か「計画存在をもって
  confirmed:trueとする」かを別途判断する。
- **選択肢Cを選んだ場合**: 先送りの判断自体を記録した上で、`confirmed:false`を維持し、
  Legacy Removal Council開催時に再度取り上げる。
