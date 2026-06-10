// ================================================================
//  ippo – src/services/profile-cache-service.js
//
//  責務: profiles の prediction_cache / cluster_id / cluster_meta を
//        読み込んで返す読み取り専用サービス。
//
//  入力:
//    supabase  — Supabase JS クライアント（認証済みセッション付き）
//    userId    — 読み込み対象ユーザー ID
//
//  出力:
//    { predictionCache, clusterId, clusterMeta }
//    取得できない場合は各フィールドが null。
//
//  制約:
//    - records テーブルには触れない。
//    - 保存系関数（saveRecord / updateRecord / deleteRecord）を呼ばない。
//    - addPostSaveHook に登録しない。
//    - state を直接変更しない。呼び出し元が state に注入する。
//    - window 参照なし。
//    - エラーは console.warn に留め、null を返す（AI 分析を止めない）。
//
//  カラムは 20260003_cluster.sql で定義済み。Migration 追加不要。
// ================================================================

/**
 * @typedef {Object} ProfileCacheResult
 * @property {object|null} predictionCache — profiles.prediction_cache
 * @property {number|null} clusterId       — profiles.cluster_id
 * @property {object|null} clusterMeta     — profiles.cluster_meta
 */

/**
 * profiles から prediction_cache / cluster_id / cluster_meta を取得する。
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} userId
 * @returns {Promise<ProfileCacheResult>}
 */
export async function loadProfileCache(supabase, userId) {
  const _empty = { predictionCache: null, clusterId: null, clusterMeta: null };

  if (!supabase || !userId) return _empty;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('prediction_cache, cluster_id, cluster_meta')
      .eq('id', userId)
      .single();

    if (error || !data) {
      if (error) console.warn('loadProfileCache:', error.message);
      return _empty;
    }

    return {
      predictionCache: data.prediction_cache ?? null,
      clusterId:       data.cluster_id       ?? null,
      clusterMeta:     data.cluster_meta      ?? null,
    };
  } catch (err) {
    console.warn('loadProfileCache unexpected error:', err);
    return _empty;
  }
}
