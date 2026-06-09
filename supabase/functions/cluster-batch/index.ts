// supabase/functions/cluster-batch/index.ts
//
// 責務: 週次クラスタバッチ
// Phase4 Step4c で導入。
//
// 処理フロー:
//   1. profiles.prediction_cache が存在するユーザーを全件取得（service_role）
//   2. 匿名特徴量ベクトル [pain, fatigue, sleep] を抽出
//   3. k-means (k=5, max 50 iter) でクラスタリング
//   4. cluster_id / cluster_meta / cluster_updated_at を profiles に書き込む
//
// cluster_meta には匿名統計のみ格納（個人情報なし）。
// records 生データは読み込まない。
//
// Cron 設定方法（実装対象外 — 運用タスク）:
//   Supabase Dashboard → Edge Functions → cluster-batch → Schedule
//   または pg_cron:
//   SELECT cron.schedule(
//     'cluster-batch-weekly',
//     '0 2 * * 0',  -- 毎週日曜 02:00 UTC
//     $$SELECT net.http_post(
//         url      := '<SUPABASE_URL>/functions/v1/cluster-batch',
//         headers  := '{"Authorization":"Bearer <SERVICE_ROLE_KEY>"}'::jsonb,
//         body     := '{}'::jsonb
//       )$$
//   );

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const K        = 5;
const MAX_ITER = 50;

type FeatureVector = [number, number, number]; // [pain, fatigue, sleep]

interface ProfileRow {
  id:               string;
  prediction_cache: Record<string, unknown> | null;
}

interface ClusterMeta {
  size:       number;
  centroid:   FeatureVector;
  avgPain:    number | null;
  avgFatigue: number | null;
  avgSleep:   number | null;
}

Deno.serve(async (_req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')              ?? '';
  const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

  if (!serviceKey) {
    return _json({ error: 'Service role key not configured' }, 503);
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // prediction_cache がある profiles のみ対象
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, prediction_cache')
    .not('prediction_cache', 'is', null);

  if (error) {
    return _json({ error: error.message }, 500);
  }

  const rows = (profiles ?? []) as ProfileRow[];

  if (rows.length < K) {
    return _json({
      message:   `Skipped: insufficient profiles (${rows.length} < ${K})`,
      clustered: 0,
    }, 200);
  }

  // 匿名特徴量ベクトル抽出
  const vectors: FeatureVector[] = rows.map(p => _extractVector(p.prediction_cache));

  // k-means クラスタリング
  const assignments = _kmeans(vectors, K, MAX_ITER);

  // 匿名クラスタ統計
  const clusterMeta = _computeMeta(vectors, assignments, K);

  // profiles を更新
  const now     = new Date().toISOString();
  const updates = rows.map((p, i) => ({
    id:                 p.id,
    cluster_id:         assignments[i],
    cluster_meta:       clusterMeta[assignments[i]],
    cluster_updated_at: now,
  }));

  const { error: upsertError } = await supabase
    .from('profiles')
    .upsert(updates, { onConflict: 'id' });

  if (upsertError) {
    return _json({ error: upsertError.message }, 500);
  }

  return _json({
    message:      'Cluster batch completed',
    clustered:    rows.length,
    clusterSizes: clusterMeta.map(m => m.size),
  }, 200);
});

// ─── 特徴量抽出 ────────────────────────────────────────────────

function _extractVector(cache: Record<string, unknown> | null): FeatureVector {
  return [
    _numVal(cache, 'pain'),
    _numVal(cache, 'fatigue'),
    _numVal(cache, 'sleep'),
  ];
}

function _numVal(cache: Record<string, unknown> | null, key: string): number {
  if (!cache) return 0;
  const obj = cache[key] as Record<string, unknown> | null | undefined;
  const v   = obj?.value;
  return typeof v === 'number' ? v : 0;
}

// ─── k-means ──────────────────────────────────────────────────

function _kmeans(vectors: FeatureVector[], k: number, maxIter: number): number[] {
  // 初期セントロイド: 等間隔サンプリング
  let centroids: FeatureVector[] = Array.from({ length: k }, (_, i) =>
    vectors[Math.floor((i * vectors.length) / k)].slice() as FeatureVector
  );

  let assignments = new Array<number>(vectors.length).fill(0);

  for (let iter = 0; iter < maxIter; iter++) {
    const next = vectors.map(v => _nearest(v, centroids));
    const changed = next.some((a, i) => a !== assignments[i]);
    assignments = next;
    if (!changed) break;

    // セントロイド更新
    const sums   = Array.from({ length: k }, () => [0, 0, 0] as FeatureVector);
    const counts = new Array<number>(k).fill(0);
    for (let i = 0; i < vectors.length; i++) {
      const c = assignments[i];
      counts[c]++;
      for (let d = 0; d < 3; d++) sums[c][d] += vectors[i][d];
    }
    centroids = centroids.map((centroid, c) =>
      counts[c] > 0
        ? (sums[c].map(s => s / counts[c]) as FeatureVector)
        : centroid
    );
  }

  return assignments;
}

function _nearest(v: FeatureVector, centroids: FeatureVector[]): number {
  let minDist = Infinity;
  let idx     = 0;
  for (let i = 0; i < centroids.length; i++) {
    const d = _dist(v, centroids[i]);
    if (d < minDist) { minDist = d; idx = i; }
  }
  return idx;
}

function _dist(a: FeatureVector, b: FeatureVector): number {
  return Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
}

// ─── クラスタ統計（匿名化）────────────────────────────────────

function _computeMeta(
  vectors:     FeatureVector[],
  assignments: number[],
  k:           number,
): ClusterMeta[] {
  return Array.from({ length: k }, (_, c) => {
    const members = vectors.filter((_, i) => assignments[i] === c);
    if (members.length === 0) {
      return { size: 0, centroid: [0, 0, 0], avgPain: null, avgFatigue: null, avgSleep: null };
    }
    const centroid = [0, 1, 2].map(d =>
      Math.round(members.reduce((s, v) => s + v[d], 0) / members.length * 100) / 100
    ) as FeatureVector;
    return {
      size:       members.length,
      centroid,
      avgPain:    centroid[0],
      avgFatigue: centroid[1],
      avgSleep:   centroid[2],
    };
  });
}

// ─── ユーティリティ ────────────────────────────────────────────

function _json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
