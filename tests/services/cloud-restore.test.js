// tests/services/cloud-restore.test.js
// ─────────────────────────────────────────────────────────────
// safeMergeState の回帰テスト（PR-2B）
//
// 検証対象: src/utils/safe-merge-state.js
//   - cloudRestore / manualCloudRestore 共通のマージ保護ロジック
//   - trackedConditions 保護（空オブジェクト・空配列・null）
//   - myDiseases 保護（回帰確認）
// ─────────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest';
import { safeMergeState } from '../../src/utils/safe-merge-state.js';

describe('safeMergeState — trackedConditions 保護', () => {

  // ── T-1: 空オブジェクト → ローカル値を維持 ──────────────────
  it('T-1: cloud.trackedConditions が空オブジェクトならローカル値を上書きしない', () => {
    const local = { trackedConditions: { pain: true, fatigue: true } };
    const cloud = { trackedConditions: {} };
    const result = safeMergeState(local, cloud);
    expect(result.trackedConditions).toEqual({ pain: true, fatigue: true });
  });

  // ── T-2: 空配列 → ローカル値を維持 ─────────────────────────
  it('T-2: cloud.trackedConditions が空配列ならローカル値を上書きしない', () => {
    const local = { trackedConditions: { pain: true } };
    const cloud = { trackedConditions: [] };
    const result = safeMergeState(local, cloud);
    expect(result.trackedConditions).toEqual({ pain: true });
  });

  // ── T-3: null → ローカル値を維持 ────────────────────────────
  it('T-3: cloud.trackedConditions が null ならローカル値を維持する', () => {
    const local = { trackedConditions: { pain: true } };
    const cloud = { trackedConditions: null };
    const result = safeMergeState(local, cloud);
    expect(result.trackedConditions).toEqual({ pain: true });
  });

  // ── T-4: undefined → ローカル値を維持 ───────────────────────
  it('T-4: cloud.trackedConditions が undefined ならローカル値を維持する', () => {
    const local = { trackedConditions: { pain: true } };
    const cloud = {};   // trackedConditions キーなし
    const result = safeMergeState(local, cloud);
    expect(result.trackedConditions).toEqual({ pain: true });
  });

  // ── T-5: 有効値 → クラウド値で上書き ───────────────────────
  it('T-5: cloud.trackedConditions が有効オブジェクトならローカルを上書きする', () => {
    const local = { trackedConditions: { pain: true } };
    const cloud = { trackedConditions: { pain: true, fatigue: true, mood: true } };
    const result = safeMergeState(local, cloud);
    expect(result.trackedConditions).toEqual({ pain: true, fatigue: true, mood: true });
  });
});

describe('safeMergeState — myDiseases 保護（回帰）', () => {

  // ── T-6: 空配列 → ローカル値を維持 ─────────────────────────
  it('T-6: cloud.myDiseases が空配列ならローカル値を維持する', () => {
    const local = { myDiseases: ['子宮内膜症'] };
    const cloud = { myDiseases: [] };
    const result = safeMergeState(local, cloud);
    expect(result.myDiseases).toEqual(['子宮内膜症']);
  });

  // ── T-7: 有効値 → クラウド値で上書き ───────────────────────
  it('T-7: cloud.myDiseases が有効配列ならローカルを上書きする', () => {
    const local = { myDiseases: ['子宮内膜症'] };
    const cloud = { myDiseases: ['PCOS', '子宮内膜症'] };
    const result = safeMergeState(local, cloud);
    expect(result.myDiseases).toEqual(['PCOS', '子宮内膜症']);
  });
});

describe('safeMergeState — currentScreen 除外', () => {

  // ── T-8: currentScreen は常に除外 ───────────────────────────
  it('T-8: cloud.currentScreen はマージ結果に含まれない', () => {
    const local = { currentScreen: 'home', records: [] };
    const cloud = { currentScreen: 'settings', records: [] };
    const result = safeMergeState(local, cloud);
    expect(result.currentScreen).toBe('home');
  });
});

describe('safeMergeState — 通常フィールド', () => {

  // ── T-9: 通常フィールドはクラウド値が優先 ───────────────────
  it('T-9: 通常フィールドはクラウド値で上書きされる', () => {
    const local = { name: 'local-name', streak: 5 };
    const cloud = { name: 'cloud-name', streak: 10 };
    const result = safeMergeState(local, cloud);
    expect(result.name).toBe('cloud-name');
    expect(result.streak).toBe(10);
  });

  // ── T-10: ローカル専用フィールドは保持される ────────────────
  it('T-10: クラウドにないフィールドはローカル値が保持される', () => {
    const local = { localOnly: 'keep-me', streak: 5 };
    const cloud = { streak: 10 };
    const result = safeMergeState(local, cloud);
    expect(result.localOnly).toBe('keep-me');
  });
});
