// tests/analytics/phase4-c4-legacy-removal.test.js
// PR-C4: 旧AI経路削除 最終判定テスト
//
// 判定条件:
//   - _path = features のみで全機能が動作すること
//   - legacy 分岐が完全に削除されていること
//   - buildDataSummary() が参照されていないこと
//   - records 直接送信が存在しないこと

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve }      from 'path';

const appLegacy      = readFileSync(resolve(process.cwd(), 'src/app-legacy.js'), 'utf-8');
const analysisModule = readFileSync(resolve(process.cwd(), 'src/modules/pro/analysis/analysis-module.js'), 'utf-8');
// PR-082B (Legacy Removal Batch-4 分割②): callAIAPI/runAIAnalysis は
// src/modules/pro/analysis/analysis-overlay.js へ物理移動済み。
const analysisOverlayModule = readFileSync(resolve(process.cwd(), 'src/modules/pro/analysis/analysis-overlay.js'), 'utf-8');
const aiAnalyzeTs    = readFileSync(resolve(process.cwd(), 'supabase/functions/ai-analyze/index.ts'), 'utf-8');

// ─────────────────────────────────────────────────────────────
// 1. app-legacy.js 監査
// ─────────────────────────────────────────────────────────────

describe('PR-C4: app-legacy.js — legacy 経路削除確認', () => {

  it('buildDataSummary() 関数定義が存在しない', () => {
    expect(appLegacy).not.toMatch(/^function buildDataSummary\(/m);
  });

  it('buildDataSummary の呼び出しが存在しない', () => {
    expect(appLegacy).not.toContain('buildDataSummary(');
  });

  it('window.buildDataSummary の登録が存在しない', () => {
    expect(appLegacy).not.toContain('window.buildDataSummary');
  });

  it('generateLocalAnalysis() が存在しない', () => {
    expect(appLegacy).not.toMatch(/^function generateLocalAnalysis\(/m);
  });

  it('callAIAPI が features ペイロードを受け取る形式になっている', () => {
    expect(analysisOverlayModule).toContain('async function callAIAPI(apiPayload)');
  });

  it('callAIAPI 内に records / analysisType の直接送信が存在しない', () => {
    // callAIAPI 関数内でのみ確認 — 関数本体を抽出
    const fnStart = analysisOverlayModule.indexOf('async function callAIAPI(apiPayload)');
    const fnEnd   = analysisOverlayModule.indexOf('\nexport function copyAIAnalysis', fnStart);
    const fnBody  = analysisOverlayModule.slice(fnStart, fnEnd);
    expect(fnBody).not.toContain('analysisType');
    expect(fnBody).not.toContain('records: records');
  });

  it('runAIAnalysis が buildAIPrompt を使用している', () => {
    // PR-082A/PR-081同型: bare `state` は `window.state` に置換（挙動不変、同一オブジェクト参照）
    expect(analysisOverlayModule).toContain('window.buildAIPrompt(window.state.records, window.state)');
  });

  it('runAIAnalysis が features ペイロードを callAIAPI に渡している', () => {
    expect(analysisOverlayModule).toContain('callAIAPI({ features: features, systemPrompt: p.systemPrompt, userPrompt: p.userPrompt })');
  });
});

// ─────────────────────────────────────────────────────────────
// 2. analysis-module.js 監査
// ─────────────────────────────────────────────────────────────

describe('PR-C4: analysis-module.js — buildDataSummary 参照削除', () => {

  it('window.buildDataSummary の参照が存在しない', () => {
    expect(analysisModule).not.toContain('window.buildDataSummary');
  });

  it('analyzePatterns が null を返す実装になっている', () => {
    expect(analysisModule).toContain('return null;');
    // window.buildDataSummary への依存が消えていること
    const fnStart = analysisModule.indexOf('export function analyzePatterns');
    const fnEnd   = analysisModule.indexOf('\n// ─── 2.', fnStart);
    const fnBody  = analysisModule.slice(fnStart, fnEnd);
    expect(fnBody).not.toContain('buildDataSummary');
  });
});

// ─────────────────────────────────────────────────────────────
// 3. ai-analyze/index.ts 監査
// ─────────────────────────────────────────────────────────────

describe('PR-C4: ai-analyze/index.ts — legacy 分岐削除', () => {

  it('isNewPath 条件分岐が存在しない', () => {
    expect(aiAnalyzeTs).not.toContain('isNewPath');
  });

  it('records フィールドの legacy チェックが存在しない', () => {
    expect(aiAnalyzeTs).not.toContain('records must be an array');
  });

  it('analysisType フィールドが存在しない', () => {
    // コメント行を除いた実行コードに analysisType が存在しないことを確認
    const codeOnly = aiAnalyzeTs.replace(/\/\/[^\n]*/g, '');
    expect(codeOnly).not.toContain('analysisType');
  });

  it('旧経路プロンプト（英語 pattern/flareup/factor）が存在しない', () => {
    expect(aiAnalyzeTs).not.toContain('Analyze these health records');
    expect(aiAnalyzeTs).not.toContain('analysisPrompts');
  });

  it('_path が常に "features" を返す', () => {
    expect(aiAnalyzeTs).toContain("_path: 'features'");
    expect(aiAnalyzeTs).not.toContain("_path: isNewPath");
  });

  it('features が必須フィールドとして検証されている', () => {
    expect(aiAnalyzeTs).toContain("features is required");
  });

  it('features 経路の処理が存在する', () => {
    expect(aiAnalyzeTs).toContain('_buildFeaturesUserContent(features)');
    expect(aiAnalyzeTs).toContain('_defaultDiseaseSystemPrompt(disease)');
  });
});

// ─────────────────────────────────────────────────────────────
// 4. 最終判定: 目標構成の確認
// ─────────────────────────────────────────────────────────────

describe('PR-C4: 最終判定 — features 経路のみで動作', () => {

  it('目標構成: UI → buildAIPrompt → DiseaseAnalyzer → feature-engine → prompt-builder → ai-analyze', () => {
    // analysis-module に buildAIPrompt が存在し、disease-registry を利用している
    expect(analysisModule).toContain('export function buildAIPrompt');
    expect(analysisModule).toContain('resolveKeys(diseases)');
    expect(analysisModule).toContain('analyzeAll(diseaseKeys');
    expect(analysisModule).toContain('extractFeatures(');
    expect(analysisModule).toContain('buildPrompt(features)');
  });

  it('app-legacy は buildAIPrompt 経由で ai-analyze を呼ぶ', () => {
    // PR-082B: 実装は src/modules/pro/analysis/analysis-overlay.js へ物理移動済み（import参照）
    expect(analysisOverlayModule).toContain('window.buildAIPrompt(window.state.records, window.state)');
    expect(analysisOverlayModule).toContain("features: features, systemPrompt: p.systemPrompt, userPrompt: p.userPrompt");
  });

  it('ai-analyze は features のみを受け付ける', () => {
    expect(aiAnalyzeTs).toContain('features:      Record<string, unknown>');
    expect(aiAnalyzeTs).not.toContain('records:');
  });
});
