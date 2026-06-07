// ============================================================
//  ippo – src/services/companion-memory.js
//  PHASE 6: Adaptive Memory Layer
//
//  ユーザー特有の傾向を軽量保持する。
//  禁止: invasive profiling / hidden scoring / opaque ranking
//  保持するのは「強く出た傾向のトピック」のみ。
// ============================================================

const _MEMORY_KEY = 'ippo_companion_memory';
const _MAX_TOPICS = 8;

const _DEFAULT = {
  preferredTopics:   [],   // string[] — 傾向として強く出たトピック
  avoidedTopics:     [],   // string[] — 抑制すべきトピック
  updatedAt:         '',
};

// ─── Read / Write ─────────────────────────────────────────

export function getCompanionMemory() {
  try {
    const raw = localStorage.getItem(_MEMORY_KEY);
    if (!raw) return Object.assign({}, _DEFAULT);
    return Object.assign({}, _DEFAULT, JSON.parse(raw));
  } catch (_) {
    return Object.assign({}, _DEFAULT);
  }
}

export function saveCompanionMemory(memory) {
  try {
    localStorage.setItem(_MEMORY_KEY, JSON.stringify(
      Object.assign({}, memory, { updatedAt: new Date().toISOString() })
    ));
  } catch (_) {}
}

// ─── Light update (post-save) ─────────────────────────────

/**
 * 記録保存後に companionMemory を軽量更新。
 * - currentMode === 'anxious' → 'emotion_pattern' を avoidedTopics に追加
 * - activeInsightTopics に含まれるトピックを preferredTopics に蓄積
 *
 * 重要: オーパシティなスコアリングは行わない。
 * トピック登場事実のみを記録する。
 */
export function updateCompanionMemory(context) {
  if (!context) return;

  const memory = getCompanionMemory();
  const { settingsProfile, activeInsightTopics } = context;
  const currentMode = settingsProfile && settingsProfile.currentMode;

  // anxious モード → emotion_pattern を抑制リストに追加
  if (currentMode === 'anxious') {
    if (!memory.avoidedTopics.includes('emotion_pattern')) {
      memory.avoidedTopics = ['emotion_pattern', ...memory.avoidedTopics].slice(0, 5);
    }
  }

  // anxious 解除時には avoidedTopics をクリア
  if (currentMode && currentMode !== 'anxious') {
    memory.avoidedTopics = memory.avoidedTopics.filter(function(t) {
      return t !== 'emotion_pattern';
    });
  }

  // アクティブなインサイトトピックを preferredTopics に蓄積
  if (Array.isArray(activeInsightTopics)) {
    for (const topic of activeInsightTopics) {
      if (!memory.preferredTopics.includes(topic)) {
        memory.preferredTopics = [topic, ...memory.preferredTopics].slice(0, _MAX_TOPICS);
      }
    }
  }

  saveCompanionMemory(memory);
}

// ─── Window 公開 ──────────────────────────────────────────

window.ippoCompanionMemory = Object.freeze({
  getCompanionMemory,
  saveCompanionMemory,
  updateCompanionMemory,
});

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('companion-memory-loaded');
}
