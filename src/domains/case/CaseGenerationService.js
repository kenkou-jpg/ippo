// ============================================================
//  src/domains/case/CaseGenerationService.js
//  Case生成パイプライン（SSOT: CONSTITUTION_RECONCILIATION_V1）
//
//  生成条件（FD-002）:
//    CANDIDATE: record_days >= 30, coverage >= 60%, disease_tag >= 1
//    TIER3:     quality_score >= 30 + ユーザー承認 (Consent不要)
//    TIER2:     quality_score >= 55, 90日, 70%, exp完了1件, Consent Level1
//    TIER1:     quality_score >= 75, 180日, 80%, exp完了2件, Consent Level2
//
//  Case ID形式: 'CASE-{DISEASE_PREFIX}-{YYYYMM}-{RANDOM8}' (C-3)
// ============================================================

import { supabase } from '../../services/supabase.js';
import { calcCaseQualityScore, evalTier } from './quality-score.js';
import { getStatsForCase } from '../record/RecordRepository.js';

const DISEASE_PREFIXES = {
  endometriosis:        'ENDO',
  ovarian_cyst:         'OVC',
  uterine_fibroid:      'UF',
  adenomyosis:          'ADN',
  pcos:                 'PCOS',
  pms_pmdd:             'PMS',
  menopause:            'MNP',
  infertility:          'INF',
  pelvic_organ_prolapse:'POP',
  chronic_pelvic_pain:  'CPP',
  vulvodynia:           'VUL',
};

/**
 * ユーザーが Case登録申請を行ったときに呼び出す
 * TIER3 Case を生成する（Consent Level 不要）
 *
 * @param {string} userId
 * @param {string} primaryDiseaseKey
 * @returns {Promise<{caseId: string, tier: string, qualityScore: number}>}
 */
export async function generateCase(userId, primaryDiseaseKey) {
  // 1. anonymized_id を取得
  const { data: anonMap, error: anonErr } = await supabase
    .from('anonymized_user_map')
    .select('anonymized_id')
    .eq('user_id', userId)
    .single();
  if (anonErr) throw new Error(`anonymized_user_map が存在しません: ${anonErr.message}`);

  // 2. 記録統計を取得
  const stats = await getStatsForCase(userId);
  if (stats.daysRecorded < 30) throw new Error('記録日数が30日未満です');
  if (stats.coverageRate < 0.60) throw new Error('Coverage率が60%未満です');

  // 3. 疾患プロファイルを確認
  const { data: dp, error: dpErr } = await supabase
    .from('disease_profiles')
    .select('disease_key')
    .eq('user_id', userId)
    .eq('status', 'ACTIVE');
  if (dpErr) throw dpErr;
  if (!dp || dp.length === 0) throw new Error('疾患タグが登録されていません');

  const diseaseKeys = dp.map(d => d.disease_key);

  // 4. 実験・アウトカム統計を取得
  const { data: experiments } = await supabase
    .from('experiments')
    .select('id, status, outcome_id')
    .eq('user_id', userId)
    .eq('is_deleted', false);

  const completedExperiments = (experiments || []).filter(
    e => e.status === 'COMPLETED' && e.outcome_id != null
  ).length;

  // 5. Consent Level を取得
  const { data: consents } = await supabase
    .from('consents')
    .select('consent_type, status, level')
    .eq('user_id', userId);
  const consentLevel = _deriveConsentLevel(consents || []);

  // 6. Quality Score 計算
  const scores = calcCaseQualityScore({
    coverageRate: stats.coverageRate,
    daysRecorded: stats.daysRecorded,
    avgFieldFillRate: stats.avgFieldFillRate,
    completedExperiments,
    avgOutcomeQuality: 0,
    consentLevel,
  });

  if (scores.total < 30) throw new Error(`Quality Score が30点未満です (${scores.total}点)`);

  // 7. Case ID 生成
  const prefix = DISEASE_PREFIXES[primaryDiseaseKey];
  if (!prefix) throw new Error(`未定義の疾患キー: ${primaryDiseaseKey}`);
  const caseId = _generateCaseId(prefix);

  // 8. Cases テーブルに INSERT
  const { data: caseRow, error: caseErr } = await supabase
    .from('cases')
    .insert({
      id: caseId,
      anonymized_user_id: anonMap.anonymized_id,
      primary_disease_key: primaryDiseaseKey,
      disease_keys: diseaseKeys,
      status: 'TIER3',
      tier: 'TIER3',
      case_start_date: _daysAgo(stats.daysRecorded),
      consent_level: consentLevel,
      quality_score: scores.total,
      record_count: stats.daysRecorded,
    })
    .select()
    .single();
  if (caseErr) throw caseErr;

  // 9. case_quality_scores に INSERT
  await supabase.from('case_quality_scores').insert({
    case_id: caseId,
    total_score: scores.total,
    duration_score: scores.duration,
    coverage_score: scores.coverage,
    completeness_score: scores.completeness,
    outcome_score: scores.outcome,
    consent_score: scores.consent,
    total_record_days: stats.daysRecorded,
    coverage_rate: stats.coverageRate,
    avg_field_fill_rate: stats.avgFieldFillRate,
    completed_experiments: completedExperiments,
  });

  // 10. case_snapshots に初回スナップショットを保存
  await supabase.from('case_snapshots').insert({
    case_id: caseId,
    version: 1,
    snapshot: caseRow,
    reason: 'INITIAL_GENERATION',
  });

  // 11. audit_log に記録
  await supabase.from('audit_log').insert({
    table_name: 'cases',
    record_id: caseId,
    action: 'INSERT',
    performed_by: userId,
    performed_by_role: 'user',
    after_value: { tier: 'TIER3', quality_score: scores.total },
    reason: 'Case登録申請',
  });

  return { caseId, tier: 'TIER3', qualityScore: scores.total };
}

// ── Private helpers ──────────────────────────────────────────

function _generateCaseId(prefix) {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  return `CASE-${prefix}-${yyyymm}-${random}`;
}

function _daysAgo(days) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}

function _deriveConsentLevel(consents) {
  const granted = new Set(consents.filter(c => c.status === 'GRANTED').map(c => c.consent_type));
  if (granted.has('COMMERCIAL')) return 3;
  if (granted.has('RESEARCH'))   return 2;
  if (granted.has('PLATFORM'))   return 1;
  return 0;
}
