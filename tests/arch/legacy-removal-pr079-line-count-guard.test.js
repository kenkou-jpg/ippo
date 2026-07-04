// tests/arch/legacy-removal-pr079-line-count-guard.test.js
// PR-079 (Legacy Removal Batch-1): SG-7 — app-legacy.js の行数がPR前後で
// 減少していることを機械的に監視する。
//
// 背景: ARCHITECTURE_V3.md は「CIチェックでLOCKED」と記載しているが、
// src/application/architecture-guard.js には app-legacy.js の行数を検証する
// ルールが存在しなかった（docs/LEGACY_REMOVAL_PLAN.md 6章 SG-7 注記）。
// 本テストはその是正であり、以降の Batch PR（PR-080〜089）は
// BASELINE_LINE_COUNT を実際の行数に合わせて更新するたびに「減少」していることを
// 確認すること（増加は即座に差し戻し）。
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const appLegacy = readFileSync(resolve(process.cwd(), 'src/app-legacy.js'), 'utf-8');

// PR-083時点のベースライン（Batch-5 — Sync Modal & Auth UIの物理移動後の実測値）。
// PR-082G(Batch-4 Exit Audit)時点は7,071行、
// PR-082E時点は7,664行、PR-082D時点は8,186行、PR-082C時点は8,441行、
// PR-082B時点は8,806行、PR-082A時点は8,977行、PR-081時点は9,569行、
// PR-080G時点は9,680行、PR-080E時点は9,768行、PR-080D時点は10,237行、
// PR-080時点は10,242行、PR-079時点は10,247行、PR-078時点は10,804行だった
// （docs/HANDOFF_PHASE7_COMPLETE.md参照）。
const BASELINE_LINE_COUNT = 7025;
const PRE_PR079_LINE_COUNT = 10804;

function countLines(text) {
  return text.split('\n').length;
}

describe('Legacy Removal SG-7 — app-legacy.js line count guard', () => {
  it('does not exceed the PR-079 baseline', () => {
    expect(countLines(appLegacy)).toBeLessThanOrEqual(BASELINE_LINE_COUNT);
  });

  it('has decreased from the pre-PR-079 (PR-078) line count', () => {
    expect(countLines(appLegacy)).toBeLessThan(PRE_PR079_LINE_COUNT);
  });

  it('imports record-input.js (Batch-1 delegation target)', () => {
    expect(appLegacy).toMatch(/import \* as RecordInput from ['"]\.\/modules\/record-input\.js['"]/);
  });
});
