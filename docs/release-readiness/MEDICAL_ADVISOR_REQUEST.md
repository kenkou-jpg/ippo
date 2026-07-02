# C-2 — Medical Advisor Engagement Request

> docs/REGULATORY_MEDICAL_COUNCIL.md（IPPO-REGULATORY-001）CONDITIONAL GO 条件 C-2。
> 分類: **Founder Action**（採用・契約行為。AIは代行不可）。

---

## 目的

IPPOは疾患・症状・治療関連のデータを扱い、Disease Entity（[disease-entity.js](../../src/domains/disease/disease-entity.js)）、
Similarity/Case Recommendation等、疾患に関する示唆を生成する機能を持つ。医学的な誤りや不適切な
表現がユーザーに健康上の不利益を与えないよう、医師アドバイザー1名の継続的な関与を確保する。

## 判断事項（Founderが決定する事項）

1. どの診療科・専門領域の医師に依頼するか（IPPOが扱う疾患領域との適合性）。
2. 契約形態（アドバイザリー契約 / 顧問契約 / スポット相談 等）。
3. 関与範囲：
   - プライバシーポリシー・免責事項の医学的観点からのレビュー
   - AI Safety Layer（[ai-safety-validator.js](../../src/domains/ai-safety/ai-safety-validator.js)、
     禁止ワードリスト・診断/治療断定表現のブロック）の妥当性確認
   - Signal Insight / Pattern Discovery 等の出力表現の定期監修
   - 継続的な関与か、β開始時点の一時的レビューか
4. 関与開始時期（β公開前に確保すべきか、β運用と並行して確保するか）。

## 必要な証跡

- [ ] 医師アドバイザーとの契約書、または正式な依頼合意（書面/メール等の記録）
- [ ] 当該医師の資格・専門領域を確認できる情報（医籍登録番号 or 所属機関等、開示可能な範囲で）
- [ ] 関与範囲・頻度の合意内容

## Founderが確認する項目

- [ ] 招聘した医師の専門領域がIPPOの扱う疾患領域（女性疾患全般）と整合していること
- [ ] 関与範囲がREGULATORY_MEDICAL_COUNCIL.mdの想定する役割（医学的誤り・不適切表現の防止）を
      カバーしていること
- [ ] 契約が実際に締結され、口頭合意や検討中の段階でないこと

## 完了条件

医師アドバイザー1名との契約・関与合意が正式に締結されていること。
「候補者と面談中」「打診中」の段階では完了条件を満たさない。

## confirmed:true にしてよい条件

契約・関与合意が締結され、Founderがその内容（関与範囲・期間）を確認したうえで、
`ReleaseReadinessService.confirmItem({ founderId, category: 'REGULATORY_CONDITION', itemId: 'C-2', confirmed: true, note })`
の実行をFounderが明示的にAIへ指示した場合のみ。noteには関与形態・開始日を記載する。
