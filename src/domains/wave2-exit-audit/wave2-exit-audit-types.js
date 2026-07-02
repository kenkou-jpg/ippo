// wave2-exit-audit-types.js — SSOT for Wave2 Exit Audit (PR-075, Phase G capstone).
// WAVE2_MASTER_DESIGN.md Section 12 — Wave2 Exit Criteria (BD-040).
// BD-040: Wave2 の Exit Criteria（EC-01〜EC-15 + QC-01〜QC-04）は全項目を Founder が
//         確認した上で Wave3 に移行すること。一部通過での Wave3 着手は禁止。
// BD-027: 各フェーズ移行は Founder 確認を必須とする。

export const WAVE2_EXIT_AUDIT_SCHEMA_VERSION = '1';

export const AUDIT_RESULT = Object.freeze({
  PASS: 'PASS',
  FAIL: 'FAIL',
});

/** Compliance status for a single Binding Decision entry. */
export const BD_STATUS = Object.freeze({
  PASS:                     'PASS',
  FAIL:                     'FAIL',
  FOUNDER_REVIEW_REQUIRED:  'FOUNDER_REVIEW_REQUIRED', // not machine-checkable — BD-027
});

/** WAVE2_MASTER_DESIGN.md Section 12 必達条件 (EC-01〜EC-15). */
export const EC_LIST = Object.freeze([
  { id: 'EC-01', description: 'NetworkSignal が Supabase に永続化されている（in-memory なし）' },
  { id: 'EC-02', description: 'Emotion Signal が Record 保存時に自動生成される' },
  { id: 'EC-03', description: 'MenstrualPhase が自動判定される（UNKNOWN ゼロ）' },
  { id: 'EC-04', description: 'Disease Entity がフル構造体（icdCode / category / severity）' },
  { id: 'EC-05', description: 'ippo_events テーブルが存在し、Immutable で運用されている' },
  { id: 'EC-06', description: "FeatureVector が 12次元（VECTOR_VERSION='2'）で生成される" },
  { id: 'EC-07', description: 'SimilarityEdge に longitudinalContext が付与されている' },
  { id: 'EC-08', description: 'Knowledge Graph 骨格（Disease × Symptom × Outcome ノード/エッジ）が存在する' },
  { id: 'EC-09', description: 'AI Signal Insight と Pattern Discovery が動作する（診断禁止遵守）' },
  { id: 'EC-10', description: 'Cohort Builder が動作し、Research Dataset V2 を生成できる' },
  { id: 'EC-11', description: 'Dataset Version に versionId が付与される' },
  { id: 'EC-12', description: 'DiseaseClusterStatisticsService が動作する' },
  { id: 'EC-13', description: 'すべての新 Domain Event が ippo_events に記録される' },
  { id: 'EC-14', description: 'ArchitectureGuard に Wave2 全 Domain の違反ルールが追加されている' },
  { id: 'EC-15', description: 'テスト全件パス（Wave2 追加分含む）' },
]);

/** WAVE2_MASTER_DESIGN.md Section 12 品質条件 (QC-01〜QC-04). */
export const QC_LIST = Object.freeze([
  { id: 'QC-01', description: 'Architecture Health: A（違反ゼロ）' },
  { id: 'QC-02', description: 'BD-001〜BD-033（Wave1）および BD-034〜（Wave2）への違反ゼロ' },
  { id: 'QC-03', description: 'k-anonymity 検証テストが全件パス' },
  { id: 'QC-04', description: 'AI 出力に診断・治療・緊急度の文言がゼロ（自動テストで確認）' },
]);

/**
 * Binding Decisions in Wave2 Exit Audit scope (BD-001〜BD-043 — BD-040 / Roadmap PR-075 責務③).
 * BD-044〜BD-060 (Regulatory / GTM) are out of scope — separate governance track.
 */
export const BD_SCOPE_LIST = Object.freeze([
  { bd: 'BD-001', description: 'similarity_edges DELETE禁止' },
  { bd: 'BD-002', description: 'consent_events DELETE禁止（Consent Immutability）' },
  { bd: 'BD-003', description: 'Lunar CalendarをUIとして実装しない' },
  { bd: 'BD-004', description: 'Disease TagをWave1でEntityに昇格させない（Wave2）' },
  { bd: 'BD-005', description: 'FoodはFoodログでなくExposure Signalとして設計' },
  { bd: 'BD-006', description: 'Symptom IntelligenceはWave1で即時拡張対象' },
  { bd: 'BD-007', description: 'DROP判定ゼロ。旧資産はHOLDまたはREFACTOR' },
  { bd: 'BD-008', description: '疾患情報は4層（Record/Profile/Case/Network）に分離' },
  { bd: 'BD-009', description: 'Disease Cluster IDはWave2まで diseaseKey と同一' },
  { bd: 'BD-010', description: 'FeatureVectorは VECTOR_VERSION 定数を持ち、次元拡張時バージョンを上げる' },
  { bd: 'BD-011', description: 'EdgeGeneratorが生成する全エッジは vectorVersion フィールドを持つ' },
  { bd: 'BD-012', description: 'Longitudinal SignalのEdge付与はWave2スコープ' },
  { bd: 'BD-013', description: 'NetworkSignal SSOTは network-signal-types.js' },
  { bd: 'BD-014', description: 'MenstrualPhase自動判定はWave2' },
  { bd: 'BD-015', description: 'Layer 1（Record）保全でLayer 2〜7を決定論的に再構築できること' },
  { bd: 'BD-016', description: '各データ資産はSSOT以外に永続化してはならない' },
  { bd: 'BD-017', description: 'Wave2 ippo_eventsテーブルはImmutable（UPDATE/DELETE禁止）' },
  { bd: 'BD-018', description: 'Snapshotは必ず generatedAt と vectorVersion を含めること' },
  { bd: 'BD-019', description: 'データ削除要求: 匿名化優先 → SoftDelete → 90日後HardDelete' },
  { bd: 'BD-020', description: 'Layer 1保全でLayer 2〜7の再構築可能性を損なう変更はCouncil承認が必要' },
  { bd: 'BD-021', description: 'Research Datasetの作成・公開はFounder承認 + k-anonymity(k≥5)' },
  { bd: 'BD-022', description: 'NetworkSignalはWave2でSupabaseに永久保存（Wave1はin-memory暫定）' },
  { bd: 'BD-023', description: 'SimilarityEdge再計算時は新edgeIdを発行（既存IDの上書き禁止）' },
  { bd: 'BD-024', description: 'Emotion SignalはWave2 Signal層で実装（Wave1では生成しない）' },
  { bd: 'BD-025', description: 'PR-033〜PR-040はDATA ASSET COUNCIL Section 14に従って実装すること' },
  { bd: 'BD-026', description: 'Phase 3（k≥50 / 5疾患以上）達成前にSimilarity UIを公開しない' },
  { bd: 'BD-027', description: '各フェーズ移行はFounder確認を必須とする' },
  { bd: 'BD-028', description: 'Disease Cluster統計はk≥5（最終目標k≥50）を下回るデータを公開しない' },
  { bd: 'BD-029', description: 'Similarity UIはCaseノード同士の接続表示のみ。個人特定可能なUIを禁止' },
  { bd: 'BD-030', description: 'Research Dataset利用者が個人特定を試みることはZERO TOLERANCE（契約条件）' },
  { bd: 'BD-031', description: 'AIはいかなる状況でも診断・治療指示・緊急度判定を行ってはならない' },
  { bd: 'BD-032', description: 'Knowledge GraphのエッジはAppend-Only（削除・上書き禁止）' },
  { bd: 'BD-033', description: 'Founder Moat = 縦断の長さ × Consent純潔性 × Disease Intelligence深度' },
  { bd: 'BD-034', description: 'Wave2のすべての永続化層はSupabaseとする' },
  { bd: 'BD-035', description: "FeatureVector V2は12次元（VECTOR_VERSION='2'）" },
  { bd: 'BD-036', description: 'Disease Cluster統計はk≥50を目標とし、k≥5未満は公開しない' },
  { bd: 'BD-037', description: 'Knowledge GraphノードはAppend-Only（削除禁止）' },
  { bd: 'BD-038', description: 'Wave2 AIはルールベース + 統計テンプレートのみ（LLM禁止）' },
  { bd: 'BD-039', description: 'AISafetyValidatorはすべてのAI出力の必須ゲートキーパー' },
  { bd: 'BD-040', description: 'Wave2完了条件: EC-01〜EC-15 + QC-01〜QC-04 全項目をFounderが確認した上でWave3に移行' },
  { bd: 'BD-041', description: 'Wave2 PR-041〜075の実装順序は依存関係を厳守すること' },
  { bd: 'BD-042', description: 'Wave2完了条件: Phase 3達成（k≥50 / 5疾患）+ Research Platform稼働' },
  { bd: 'BD-043', description: 'Wave3以降の設計はWave2完了後にCouncilを開催して決定する' },
]);

/**
 * Binding Decisions with a real, already-implemented mechanical audit source in this
 * codebase (ResearchPlatformAuditService / Phase3CompletionValidator / AISafetyValidator).
 * All other BD-001〜BD-043 entries are process/architecture/historical decisions that
 * cannot be proven by code alone and are surfaced as FOUNDER_REVIEW_REQUIRED (BD-027).
 */
export const MECHANICALLY_AUDITED_BDS = Object.freeze([
  'BD-021', 'BD-026', 'BD-027', 'BD-030', 'BD-031', 'BD-036', 'BD-037', 'BD-038', 'BD-039',
]);
