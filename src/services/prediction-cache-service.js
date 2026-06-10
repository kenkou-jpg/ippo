// ================================================================
//  ippo – src/services/prediction-cache-service.js
//
//  責務: profiles.prediction_cache への書き込み専用サービス。
//
//  入力:
//    supabase  — Supabase JS クライアント（認証済みセッション付き）
//    userId    — 書き込み対象ユーザー ID
//    predictions — buildPredictionPayload().predictions の出力
//
//  書き込み先:
//    profiles.prediction_cache      JSONB
//    profiles.prediction_updated_at TIMESTAMPTZ
//
//  制約:
//    - records テーブルには触れない。
//    - saveRecord / updateRecord / deleteRecord を呼び出さない。
//    - addPostSaveHook に登録しない。
//    - window 参照なし。
//    - エラーは呼び出し元に伝播しない（fire-and-forget 用途を想定）。
//      呼び出し元が try/catch または .catch() で処理すること。
//
//  カラムは 20260003_cluster.sql で定義済み。Migration 追加不要。
// ================================================================

/**
 * predictNext() の出力を profiles.prediction_cache に保存する。
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @param {object} predictions  — buildPredictionPayload().predictions
 * @returns {Promise<void>}
 * @throws {Error} Supabase エラーまたは入力検証エラー
 */
export async function savePredictionCache(supabase, userId, predictions) {
  if (!supabase)    throw new Error('savePredictionCache: supabase client is required');
  if (!userId)      throw new Error('savePredictionCache: userId is required');
  if (!predictions || typeof predictions !== 'object') {
    throw new Error('savePredictionCache: predictions must be a non-null object');
  }

  const now = new Date().toISOString();

  const { error } = await supabase
    .from('profiles')
    .upsert(
      {
        id:                    userId,
        prediction_cache:      predictions,
        prediction_updated_at: now,
      },
      { onConflict: 'id' },
    );

  if (error) {
    throw new Error(`savePredictionCache: ${error.message}`);
  }
}
