// tests/services/prediction-cache-service.test.js
// ─────────────────────────────────────────────────────────────
// Layer B Step1 守護テスト — prediction_cache write path
//
// 検証対象:
//   1. savePredictionCache が profiles.prediction_cache に正しく書き込む
//   2. 入力検証: supabase/userId/predictions が未指定の場合はエラー
//   3. Supabase エラーが呼び出し元に伝播する
//   4. cluster-batch の _extractVector() が読む形式と一致する
//   5. buildPredictionPayload が context なしで従来通り動作する（後方互換）
//   6. buildPredictionPayload が context ありで savePredictionCache を呼ぶ
//   7. savePredictionCache のエラーが buildPredictionPayload の戻り値を壊さない
//   8. 保存処理（saveRecord/updateRecord/deleteRecord）を呼ばない
// ─────────────────────────────────────────────────────────────

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.stubGlobal('window', {});
vi.stubGlobal('localStorage', {
  _data: {},
  getItem(k)    { return this._data[k] ?? null; },
  setItem(k, v) { this._data[k] = String(v); },
  removeItem(k) { delete this._data[k]; },
  clear()       { this._data = {}; },
});

// ─── Supabase クライアント モック ─────────────────────────────

function _makeSupabaseMock({ upsertError = null } = {}) {
  const upsertFn = vi.fn().mockResolvedValue({ error: upsertError });
  const mock = {
    from: vi.fn().mockReturnValue({
      upsert: upsertFn,
    }),
    _upsertFn: upsertFn,
  };
  return mock;
}

// ─── テスト用 predictions ─────────────────────────────────────

const SAMPLE_PREDICTIONS = {
  pain:      { value: 3.5, confidence: 'medium' },
  fatigue:   { value: 4.2, confidence: 'medium' },
  headache:  { value: 0.25, unit: 'probability', confidence: 'medium' },
  sleep:     { value: 6.8, confidence: 'medium' },
  confidence:    'medium',
  sampleSize:    35,
  disclaimer:    true,
  disclaimerText: 'これは医療診断ではありません。参考情報としてご活用ください。',
};

const USER_ID = 'test-user-uuid-1234';

// ─────────────────────────────────────────────────────────────
// SECTION 1: savePredictionCache 単体テスト
// ─────────────────────────────────────────────────────────────

describe('savePredictionCache', () => {
  let savePredictionCache;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/services/prediction-cache-service.js');
    savePredictionCache = mod.savePredictionCache;
  });

  // ── 正常系 ──────────────────────────────────────────────────

  it('profiles.prediction_cache に upsert を呼び出す', async () => {
    const supabase = _makeSupabaseMock();
    await savePredictionCache(supabase, USER_ID, SAMPLE_PREDICTIONS);

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(supabase._upsertFn).toHaveBeenCalledTimes(1);

    const [upsertArg, upsertOpts] = supabase._upsertFn.mock.calls[0];
    expect(upsertArg.id).toBe(USER_ID);
    expect(upsertArg.prediction_cache).toEqual(SAMPLE_PREDICTIONS);
    expect(upsertArg.prediction_updated_at).toBeDefined();
    expect(upsertOpts).toEqual({ onConflict: 'id' });
  });

  it('prediction_updated_at が ISO 8601 形式である', async () => {
    const supabase = _makeSupabaseMock();
    await savePredictionCache(supabase, USER_ID, SAMPLE_PREDICTIONS);

    const [upsertArg] = supabase._upsertFn.mock.calls[0];
    expect(() => new Date(upsertArg.prediction_updated_at)).not.toThrow();
    expect(new Date(upsertArg.prediction_updated_at).toISOString())
      .toBe(upsertArg.prediction_updated_at);
  });

  it('records テーブルを触らない（profiles のみ）', async () => {
    const supabase = _makeSupabaseMock();
    await savePredictionCache(supabase, USER_ID, SAMPLE_PREDICTIONS);

    const calledTables = supabase.from.mock.calls.map(c => c[0]);
    expect(calledTables).not.toContain('records');
    expect(calledTables).toEqual(['profiles']);
  });

  // ── エラー系 ─────────────────────────────────────────────────

  it('supabase が null の場合 Error を throw する', async () => {
    await expect(
      savePredictionCache(null, USER_ID, SAMPLE_PREDICTIONS)
    ).rejects.toThrow('supabase client is required');
  });

  it('userId が空文字の場合 Error を throw する', async () => {
    const supabase = _makeSupabaseMock();
    await expect(
      savePredictionCache(supabase, '', SAMPLE_PREDICTIONS)
    ).rejects.toThrow('userId is required');
  });

  it('predictions が null の場合 Error を throw する', async () => {
    const supabase = _makeSupabaseMock();
    await expect(
      savePredictionCache(supabase, USER_ID, null)
    ).rejects.toThrow('predictions must be a non-null object');
  });

  it('Supabase upsert エラーを Error として伝播する', async () => {
    const supabase = _makeSupabaseMock({ upsertError: { message: 'DB connection failed' } });
    await expect(
      savePredictionCache(supabase, USER_ID, SAMPLE_PREDICTIONS)
    ).rejects.toThrow('DB connection failed');
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 2: cluster-batch 形式互換テスト
// ─────────────────────────────────────────────────────────────

describe('cluster-batch _extractVector() 互換性', () => {
  it('pain.value / fatigue.value / sleep.value が数値として読み取れる', () => {
    // cluster-batch/index.ts _numVal() の実装:
    //   const obj = cache[key] as Record<string, unknown>;
    //   const v   = obj?.value;
    //   return typeof v === 'number' ? v : 0;
    const cache = SAMPLE_PREDICTIONS;

    const painVal    = typeof cache.pain?.value    === 'number' ? cache.pain.value    : 0;
    const fatigueVal = typeof cache.fatigue?.value === 'number' ? cache.fatigue.value : 0;
    const sleepVal   = typeof cache.sleep?.value   === 'number' ? cache.sleep.value   : 0;

    expect(painVal).toBe(3.5);
    expect(fatigueVal).toBe(4.2);
    expect(sleepVal).toBe(6.8);
  });

  it('prediction-engine の空レコード出力も _extractVector() が 0 を返す', async () => {
    vi.resetModules();
    const { predictNext } = await import('../../src/analytics/prediction-engine.js');
    const empty = predictNext([]);

    const painVal    = typeof empty.pain?.value    === 'number' ? empty.pain.value    : 0;
    const fatigueVal = typeof empty.fatigue?.value === 'number' ? empty.fatigue.value : 0;
    const sleepVal   = typeof empty.sleep?.value   === 'number' ? empty.sleep.value   : 0;

    expect(painVal).toBe(0);
    expect(fatigueVal).toBe(0);
    expect(sleepVal).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 3: buildPredictionPayload 統合テスト
// ─────────────────────────────────────────────────────────────

describe('buildPredictionPayload — context なし（後方互換）', () => {
  let buildPredictionPayload;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/modules/pro/analysis/analysis-module.js');
    buildPredictionPayload = mod.buildPredictionPayload;
  });

  it('従来の 2 引数呼び出しで例外なく動作する', () => {
    expect(() => buildPredictionPayload([], {})).not.toThrow();
  });

  it('戻り値が { predictions, disease } 形式である', () => {
    const result = buildPredictionPayload([], { myDiseases: ['子宮内膜症'] });
    expect(result).toHaveProperty('predictions');
    expect(result).toHaveProperty('disease');
    expect(result.disease).toBe('子宮内膜症');
  });

  it('context なしでは Supabase upsert を呼ばない', async () => {
    const supabase = _makeSupabaseMock();
    buildPredictionPayload([], {});
    // 非同期処理が落ち着くのを待つ
    await new Promise(r => setTimeout(r, 10));
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

describe('buildPredictionPayload — context あり（prediction_cache 書き込み）', () => {
  let buildPredictionPayload;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import('../../src/modules/pro/analysis/analysis-module.js');
    buildPredictionPayload = mod.buildPredictionPayload;
  });

  function _makeRecords(count = 20) {
    const records = [];
    const base = new Date('2026-04-01');
    for (let i = 0; i < count; i++) {
      const d = new Date(base);
      d.setDate(d.getDate() + i);
      records.push({
        record_date:  d.toISOString().slice(0, 10),
        painLevel:    2,
        energy:       4,
        sleepHours:   7,
        sleepQuality: 3,
        symptoms:     [],
        factors:      [],
      });
    }
    return records;
  }

  it('context あり: profiles.prediction_cache に upsert される', async () => {
    const supabase = _makeSupabaseMock();
    const context  = { supabase, userId: USER_ID };

    buildPredictionPayload(_makeRecords(20), {}, context);
    await new Promise(r => setTimeout(r, 20));

    expect(supabase.from).toHaveBeenCalledWith('profiles');
    expect(supabase._upsertFn).toHaveBeenCalledTimes(1);

    const [upsertArg] = supabase._upsertFn.mock.calls[0];
    expect(upsertArg.id).toBe(USER_ID);
    expect(upsertArg.prediction_cache).toHaveProperty('pain');
    expect(upsertArg.prediction_cache).toHaveProperty('fatigue');
    expect(upsertArg.prediction_cache).toHaveProperty('sleep');
  });

  it('savePredictionCache エラーが buildPredictionPayload の戻り値を壊さない', async () => {
    const supabase = _makeSupabaseMock({ upsertError: { message: 'network error' } });
    const context  = { supabase, userId: USER_ID };

    let result;
    expect(() => {
      result = buildPredictionPayload(_makeRecords(10), {}, context);
    }).not.toThrow();

    await new Promise(r => setTimeout(r, 20));

    expect(result).toHaveProperty('predictions');
    expect(result).toHaveProperty('disease');
  });

  it('context.supabase が null の場合は upsert を呼ばない', async () => {
    const supabase = _makeSupabaseMock();
    buildPredictionPayload(_makeRecords(10), {}, { supabase: null, userId: USER_ID });
    await new Promise(r => setTimeout(r, 20));
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('context.userId が空の場合は upsert を呼ばない', async () => {
    const supabase = _makeSupabaseMock();
    buildPredictionPayload(_makeRecords(10), {}, { supabase, userId: '' });
    await new Promise(r => setTimeout(r, 20));
    expect(supabase.from).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────
// SECTION 4: 保存処理非依存確認
// ─────────────────────────────────────────────────────────────

describe('保存処理非依存', () => {
  it('prediction-cache-service.js が saveRecord を呼び出さない（コード上の呼び出し禁止）', async () => {
    const { readFileSync } = await import('fs');
    const { resolve }      = await import('path');
    const src = readFileSync(
      resolve(process.cwd(), 'src/services/prediction-cache-service.js'),
      'utf-8',
    );
    // コメント行を除いたコード部分に呼び出しがないことを確認
    const codeLines = src.split('\n').filter(l => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*'));
    const code = codeLines.join('\n');
    expect(code).not.toMatch(/saveRecord\s*\(/);
    expect(code).not.toMatch(/updateRecord\s*\(/);
    expect(code).not.toMatch(/deleteRecord\s*\(/);
    expect(code).not.toMatch(/addPostSaveHook\s*\(/);
  });

  it('prediction-cache-service.js が window を参照しない（コード上の参照禁止）', async () => {
    const { readFileSync } = await import('fs');
    const { resolve }      = await import('path');
    const src = readFileSync(
      resolve(process.cwd(), 'src/services/prediction-cache-service.js'),
      'utf-8',
    );
    const codeLines = src.split('\n').filter(l => !l.trimStart().startsWith('//') && !l.trimStart().startsWith('*'));
    const code = codeLines.join('\n');
    expect(code).not.toMatch(/\bwindow\./);
  });
});
