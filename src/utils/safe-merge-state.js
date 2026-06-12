// src/utils/safe-merge-state.js
// ─────────────────────────────────────────────────────────────
// cloudRestore / manualCloudRestore 共通の安全マージ関数。
//
// 方針:
//   - cloud 状態でローカルを丸ごと置換しない
//   - currentScreen はユーザーデータではないため常に無視
//   - myDiseases: 空配列はローカル値を消さない
//   - trackedConditions: 空オブジェクト・空配列はローカル値を消さない
//   - null / undefined はスキップ（既存ローカル値を維持）
// ─────────────────────────────────────────────────────────────

export function safeMergeState(local, cloud) {
  var merged = Object.assign({}, local);
  Object.keys(cloud).forEach(function (key) {
    if (key === 'currentScreen') return;
    var cv = cloud[key];
    if (cv === undefined || cv === null) return;
    if (key === 'myDiseases') {
      if (!Array.isArray(cv) || cv.length === 0) return;
    }
    if (key === 'trackedConditions') {
      if (Array.isArray(cv) && cv.length === 0) return;
      if (typeof cv === 'object' && !Array.isArray(cv) && Object.keys(cv).length === 0) return;
    }
    merged[key] = cv;
  });
  return merged;
}
