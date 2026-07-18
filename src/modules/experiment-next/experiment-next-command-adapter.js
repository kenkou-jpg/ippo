// ============================================================
//  ippo – experiment-next-command-adapter.js
//  PR-EXP-RUNTIME-06: 実験開始CTA専用のApplication Adapter。
//
//  唯一の正規経路: window.app.api（PR-APP-BOOT-01のApplicationRuntime）
//  経由でのみExperiment Domainへ書き込む。UIからContainer/Repository/
//  Supabase/legacy state.experimentsへ直接アクセスしない。
//
//  対象は「実験開始」に加え、PR-FULL-INTEGRATION-02で「完了」「中止」を追加。
//  ExperimentCommandService.complete()/abandon()・ApiGateway.completeExperiment()/
//  abandonExperiment()は既存実装であり、本PRでDomain/ApiGateway層への変更は
//  一切行っていない（Runtime Adapter層への呼び出し追加のみ）。「今日もOK」は
//  引き続きこのAdapterの責務外。
//
//  createExperiment()とstartExperiment()の間には原子性がない
//  （ApiGateway/ExperimentCommandServiceに`createAndStartExperiment()`相当の
//  原子的メソッドは現状存在しないことを確認済み）。start失敗時、作成済みの
//  DRAFTは削除しない — 呼び出し元へstage:'start'として明示し、
//  補償処理（自動削除・自動リトライ）は行わない。
// ============================================================

// ── 実験ライブラリ: Prototype (prototype/index.html #screen-experiment
//    .library-grid) と同じ4項目。表示ラベルはexperiment-next.htmlの
//    静的マークアップと対応させ、開始時のpayloadのみここで保持する ──

export const EXPERIMENT_LIBRARY_PRESETS = Object.freeze([
  Object.freeze({
    id: 'fast-16h', name: '16時間断食',
    title: '16時間断食', hypothesis: '空腹時間を長くすると、体調にどんな変化があるか試してみる',
    diseaseKey: '空腹感', interventionType: 'fasting', days: 14,
  }),
  Object.freeze({
    id: 'fast-14h', name: '14時間断食',
    title: '14時間断食', hypothesis: '無理のない空腹時間で、体調の変化を観察してみる',
    diseaseKey: '空腹感', interventionType: 'fasting', days: 14,
  }),
  Object.freeze({
    id: 'no-caffeine', name: 'カフェイン断ち',
    title: 'カフェイン断ち', hypothesis: 'カフェインを控えると、睡眠の質に変化があるか試してみる',
    diseaseKey: 'カフェイン', interventionType: 'avoid', days: 14,
  }),
  Object.freeze({
    id: 'no-dairy', name: '乳製品断ち',
    title: '乳製品断ち', hypothesis: '乳製品を断つと、肌荒れの感じ方に変化があるか試してみる',
    diseaseKey: '乳製品', interventionType: 'avoid', days: 14,
  }),
]);

let _inFlight = false;
let _completeInFlight = false;
let _abandonInFlight = false;

/** テスト専用: 二重送信ガードをリセットする。 */
export function _resetInFlightGuardForTests() {
  _inFlight = false;
  _completeInFlight = false;
  _abandonInFlight = false;
}

function _getApi() {
  try {
    return (typeof window !== 'undefined' && window.app && window.app.api) || null;
  } catch (_) {
    return null;
  }
}

function _isAuthError(err) {
  return !!err && (err.name === 'AuthError' || err.code === 'FORBIDDEN' || err.code === 'UNAUTHENTICATED');
}

function _buildCreatePayload(preset) {
  const start = new Date();
  const startDate = start.toISOString().slice(0, 10);
  const end = new Date(start);
  end.setDate(end.getDate() + preset.days);
  const plannedEndDate = end.toISOString().slice(0, 10);

  return {
    title:            preset.title,
    hypothesis:       preset.hypothesis,
    diseaseKey:       preset.diseaseKey,
    interventionType: preset.interventionType,
    startDate,
    plannedEndDate,
  };
}

/**
 * ライブラリのプリセットから実験を作成し、即座にACTIVEへ遷移させる。
 * 2段階（createExperiment → startExperiment）で行い、途中失敗時は
 * stageで区別した失敗理由を返す。
 *
 * @param {string} presetId  EXPERIMENT_LIBRARY_PRESETS内のid
 * @returns {Promise<
 *   | { ok: true, experiment: object }
 *   | { ok: false, stage: 'guard'|'validation'|'runtime'|'permission'|'create'|'start', reason: string, draftId?: string, error?: unknown }
 * >}
 */
export async function startExperimentFromPreset(presetId) {
  if (_inFlight) {
    return { ok: false, stage: 'guard', reason: 'duplicate_request' };
  }

  const preset = EXPERIMENT_LIBRARY_PRESETS.find((p) => p.id === presetId);
  if (!preset) {
    return { ok: false, stage: 'validation', reason: 'unknown_preset' };
  }

  const api = _getApi();
  if (!api || typeof api.createExperiment !== 'function' || typeof api.startExperiment !== 'function') {
    return { ok: false, stage: 'runtime', reason: 'runtime_not_initialized' };
  }

  _inFlight = true;
  try {
    let created;
    try {
      created = await api.createExperiment(_buildCreatePayload(preset));
    } catch (error) {
      if (_isAuthError(error)) return { ok: false, stage: 'permission', reason: 'forbidden', error };
      return { ok: false, stage: 'create', reason: 'create_failed', error };
    }

    if (!created || !created.id) {
      return { ok: false, stage: 'create', reason: 'create_failed' };
    }

    try {
      const started = await api.startExperiment(created.id);
      return { ok: true, experiment: started };
    } catch (error) {
      // Founder指示: start失敗時にDRAFTを勝手に削除しない・補償処理をしない。
      if (_isAuthError(error)) return { ok: false, stage: 'permission', reason: 'forbidden', draftId: created.id, error };
      return { ok: false, stage: 'start', reason: 'start_failed', draftId: created.id, error };
    }
  } finally {
    _inFlight = false;
  }
}

/**
 * 進行中の実験を完了させる。ExperimentCommandService.complete()（既存実装、
 * 本PRで新設していない）をApiGateway.completeExperiment()経由で呼ぶのみ。
 *
 * @param {string} id  完了させる実験のid（experiment-next-adapter.jsの
 *   getRunningExperimentViewModel()が返すid）
 * @returns {Promise<
 *   | { ok: true, experiment: object }
 *   | { ok: false, stage: 'validation'|'guard'|'runtime'|'permission'|'complete', reason: string, error?: unknown }
 * >}
 */
export async function completeExperimentAction(id) {
  if (!id) return { ok: false, stage: 'validation', reason: 'missing_id' };
  if (_completeInFlight) return { ok: false, stage: 'guard', reason: 'duplicate_request' };

  const api = _getApi();
  if (!api || typeof api.completeExperiment !== 'function') {
    return { ok: false, stage: 'runtime', reason: 'runtime_not_initialized' };
  }

  _completeInFlight = true;
  try {
    const completed = await api.completeExperiment(id);
    return { ok: true, experiment: completed };
  } catch (error) {
    if (_isAuthError(error)) return { ok: false, stage: 'permission', reason: 'forbidden', error };
    return { ok: false, stage: 'complete', reason: 'complete_failed', error };
  } finally {
    _completeInFlight = false;
  }
}

/**
 * 進行中の実験を中止する。ExperimentCommandService.abandon()（既存実装、
 * 本PRで新設していない）をApiGateway.abandonExperiment()経由で呼ぶのみ。
 * reason入力UIは本PRのスコープ外のため常にnullを渡す。
 *
 * @param {string} id  中止させる実験のid
 * @returns {Promise<
 *   | { ok: true, experiment: object }
 *   | { ok: false, stage: 'validation'|'guard'|'runtime'|'permission'|'abandon', reason: string, error?: unknown }
 * >}
 */
export async function abandonExperimentAction(id) {
  if (!id) return { ok: false, stage: 'validation', reason: 'missing_id' };
  if (_abandonInFlight) return { ok: false, stage: 'guard', reason: 'duplicate_request' };

  const api = _getApi();
  if (!api || typeof api.abandonExperiment !== 'function') {
    return { ok: false, stage: 'runtime', reason: 'runtime_not_initialized' };
  }

  _abandonInFlight = true;
  try {
    const abandoned = await api.abandonExperiment(id, null);
    return { ok: true, experiment: abandoned };
  } catch (error) {
    if (_isAuthError(error)) return { ok: false, stage: 'permission', reason: 'forbidden', error };
    return { ok: false, stage: 'abandon', reason: 'abandon_failed', error };
  } finally {
    _abandonInFlight = false;
  }
}
