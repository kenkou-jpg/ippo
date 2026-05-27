// ============================================================
// ippo – today-reflection.js
// "✓ 今日をふり返る" quiet reflection screen
//
// 役割:
// - 3カードデイリーチェックイン完了後の読み取り専用ふり返り画面
// - record.meta.uiFlow === 'daily-checkin' を確認して今日のデータを表示
// - 再入力不可 (quiet reflection only)、編集は再び3カード経由
// ============================================================

import { getState } from '../store/state.js';

// ─── helpers ─────────────────────────────────────────────────

function todayLocal() {
  const now = new Date();
  return [
    String(now.getFullYear()),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
  ].join('-');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── snapshot label maps ──────────────────────────────────────

const CONDITION_MAP = {
  great:       { emoji: '😊', label: 'とても良い' },
  good:        { emoji: '🙂', label: '良い' },
  normal:      { emoji: '😐', label: 'ふつう' },
  slightlyBad: { emoji: '😕', label: 'すこし辛い' },
  tough:       { emoji: '😞', label: '辛い' },
};

const SLEEP_MAP = {
  wellSlept:   { emoji: '😴', label: 'よく眠れた' },
  soSo:        { emoji: '🛌', label: 'まあまあ' },
  wokeUp:      { emoji: '😪', label: '目が覚めた' },
  hardlySlept: { emoji: '😤', label: 'ほとんど眠れず' },
};

const ENERGY_MAP = {
  plenty:    { emoji: '⚡', label: '元気いっぱい' },
  soSo:      { emoji: '🔋', label: 'まあまあ' },
  normal:    { emoji: '🔆', label: 'ふつう' },
  low:       { emoji: '🪫', label: '少ない' },
  hardlyAny: { emoji: '😶', label: 'ほとんどない' },
};

// ─── gentle observation generator ────────────────────────────

function _buildGentleObservation(rec) {
  if (!rec) return null;

  const lines = [];
  const snap = rec.snapshot || {};
  const emotions = rec.emotions || {};

  // Condition observation
  if (snap.condition) {
    const m = CONDITION_MAP[snap.condition];
    if (m) {
      if (snap.condition === 'great' || snap.condition === 'good') {
        lines.push('体調が良い日は、その感覚を丁寧に覚えておきましょう。');
      } else if (snap.condition === 'tough' || snap.condition === 'slightlyBad') {
        lines.push('今日は少し辛い一日だったかもしれません。それでも記録できたこと、きちんと自分を見ています。');
      }
    }
  }

  // Sleep observation
  if (snap.sleep === 'hardlySlept' || snap.sleep === 'wokeUp') {
    lines.push('睡眠が十分でなかった日は、無理をせず早めに休むことを意識してみてください。');
  }

  // Symptom observation
  const symptomCount = (rec.symptomDetails || []).length;
  if (symptomCount >= 3) {
    lines.push('複数の症状がありますね。記録が蓄積されると、パターンが見えてきます。');
  } else if (symptomCount === 0 && snap.condition && snap.condition !== 'tough') {
    lines.push('症状がない日は、身体が整っているサインかもしれません。');
  }

  // Emotion observation
  const emotionTags = emotions.tags || [];
  if (emotionTags.some(t => ['不安', '緊張', 'ストレス', '辛い'].includes(t))) {
    lines.push('感情の動きに気づいていること、それ自体がセルフケアの第一歩です。');
  } else if (emotionTags.some(t => ['嬉しい', '満足', '穏やか', '感謝'].includes(t))) {
    lines.push('穏やかな気持ちの日は、その余裕を大切にしてください。');
  }

  if (lines.length === 0) {
    lines.push('今日の記録が整いました。積み重ねることで、あなた自身の傾向が見えてきます。');
  }

  return lines[0]; // 最初の1文だけ表示（quiet）
}

// ─── screen renderer ─────────────────────────────────────────

function _renderScreen(rec) {
  const body = document.getElementById('trf-body');
  if (!body) return;

  if (!rec) {
    body.innerHTML = '<div style="text-align:center;padding:40px 0;color:#b0a09c;font-family:\'Noto Sans JP\',sans-serif;font-size:13px;">今日の記録が見つかりません</div>';
    return;
  }

  const snap = rec.snapshot || {};
  const symptomDetails = rec.symptomDetails || [];
  const emotions = rec.emotions || {};
  const memo = rec.note || (emotions.memo) || '';
  const emotionTags = emotions.tags || [];

  let html = '';

  // Done badge — show completedAt time if available
  const completedAt = rec.meta && rec.meta.completedAt;
  const completedTimeStr = (function() {
    if (!completedAt) return '';
    try {
      const d = new Date(completedAt);
      return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
    } catch(e) { return ''; }
  })();
  const frozenNote = rec._fromFrozenSnapshot
    ? 'チェックイン時点のスナップショットを表示しています。'
    : 'チェックイン時のデータを表示しています。';

  html += '<div class="trf-done-badge">';
  html += '<div class="trf-done-icon">✓</div>';
  html += '<div class="trf-done-text">';
  html += completedTimeStr
    ? (escapeHtml(completedTimeStr) + ' にチェックインが完了しました。')
    : '今日のチェックインが完了しています。';
  html += '<br><span style="font-size:11px;opacity:0.75;">' + frozenNote + '</span>';
  html += '</div>';
  html += '</div>';

  // Snapshot card (condition / sleep / energy)
  const condInfo = CONDITION_MAP[snap.condition] || { emoji: '—', label: '未記録' };
  const sleepInfo = SLEEP_MAP[snap.sleep] || { emoji: '—', label: '未記録' };
  const energyInfo = ENERGY_MAP[snap.energy] || { emoji: '—', label: '未記録' };

  html += '<div class="trf-card">';
  html += '<div class="trf-card-label">TODAY\'S SNAPSHOT</div>';
  html += '<div class="trf-snapshot-row">';
  html += '<div class="trf-snapshot-item">';
  html += '<div class="trf-snapshot-emoji">' + condInfo.emoji + '</div>';
  html += '<div class="trf-snapshot-label">状態</div>';
  html += '<div class="trf-snapshot-value">' + escapeHtml(condInfo.label) + '</div>';
  html += '</div>';
  html += '<div class="trf-snapshot-item">';
  html += '<div class="trf-snapshot-emoji">' + sleepInfo.emoji + '</div>';
  html += '<div class="trf-snapshot-label">睡眠</div>';
  html += '<div class="trf-snapshot-value">' + escapeHtml(sleepInfo.label) + '</div>';
  html += '</div>';
  html += '<div class="trf-snapshot-item">';
  html += '<div class="trf-snapshot-emoji">' + energyInfo.emoji + '</div>';
  html += '<div class="trf-snapshot-label">エネルギー</div>';
  html += '<div class="trf-snapshot-value">' + escapeHtml(energyInfo.label) + '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  // Symptoms
  html += '<div class="trf-card">';
  html += '<div class="trf-card-label">SYMPTOMS</div>';
  if (symptomDetails.length > 0) {
    html += '<div class="trf-symptom-list">';
    symptomDetails.forEach(function(s) {
      const sev = s.severity ? ' · ' + s.severity : '';
      html += '<span class="trf-symptom-chip">' + escapeHtml(s.symptom || '') + escapeHtml(sev) + '</span>';
    });
    html += '</div>';
  } else {
    html += '<div class="trf-no-content">症状の記録なし</div>';
  }
  html += '</div>';

  // Emotions + memo
  html += '<div class="trf-card">';
  html += '<div class="trf-card-label">EMOTION &amp; MEMO</div>';
  if (emotionTags.length > 0) {
    html += '<div class="trf-emotion-tags">';
    emotionTags.forEach(function(tag) {
      html += '<span class="trf-emotion-tag">' + escapeHtml(tag) + '</span>';
    });
    html += '</div>';
  }
  if (memo && memo.trim()) {
    html += '<div class="trf-memo-text">' + escapeHtml(memo.trim()) + '</div>';
  }
  if (emotionTags.length === 0 && !memo) {
    html += '<div class="trf-no-content">感情・メモの記録なし</div>';
  }
  html += '</div>';

  // Gentle observation
  const obs = _buildGentleObservation(rec);
  if (obs) {
    html += '<div class="trf-observation">';
    html += '<div class="trf-observation-label">TODAY\'S OBSERVATION</div>';
    html += '<div class="trf-observation-text">' + escapeHtml(obs) + '</div>';
    html += '</div>';
  }

  body.innerHTML = html;
}

// ─── stable check-in record retrieval ────────────────────────
//
// Returns a "view record" that always reflects the ORIGINAL intentional
// daily check-in data, even if the live record was subsequently edited
// via calendar/symptom/quick edit paths.
//
// Priority:
//   1. record.meta.checkinSnapshot  — frozen at check-in time (new saves)
//   2. record fields directly        — fallback for pre-fix saves
//   3. null                          — no daily check-in record for today
//
// Other save paths do NOT include a `meta` key in their payloads, so
// mergeRecordPreservingExisting() preserves meta intact after any edit.
function _getCheckinRecord(date) {
  const s = getState();
  if (!s) return null;

  const today = date || todayLocal();

  // Find the single record that carries the daily-checkin flag for this date.
  // (There is normally only one record per date; upsertRecord merges in-place.)
  const rec = (s.records || []).find(function(r) {
    const d = (r.date || r.record_date || '').slice(0, 10);
    return d === today && r.meta && r.meta.uiFlow === 'daily-checkin';
  });

  if (!rec) return null;

  // NEW saves (post-fix): reconstruct a stable view from the frozen snapshot.
  if (rec.meta.checkinSnapshot) {
    const frozen = rec.meta.checkinSnapshot;
    return {
      record_date: today,
      // Core snapshot fields from the frozen copy:
      snapshot:       frozen.snapshot       || {},
      symptomDetails: frozen.symptomDetails || [],
      emotions:       frozen.emotions       || { tags: [], memo: '' },
      note:           frozen.note           || '',
      // Expose meta so callers can read completedAt etc.
      meta: rec.meta,
      _fromFrozenSnapshot: true,
    };
  }

  // LEGACY saves (pre-fix): no frozen snapshot — use the live record fields
  // as-is. These records may have been mutated by subsequent edits, but
  // this is the best we can do without the frozen copy.
  return rec;
}

// ─── main export ─────────────────────────────────────────────

export function openTodayReflection() {
  const date = todayLocal();

  // Update header date
  const headerDate = document.getElementById('trf-header-date');
  if (headerDate) {
    const now = new Date();
    headerDate.textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日';
  }

  // Get the stable check-in record (prioritises meta.checkinSnapshot)
  const rec = _getCheckinRecord(date);

  // Render content (showScreen first, then render so DOM exists)
  if (typeof window.showScreen === 'function') {
    window.showScreen('today-reflection').then(function() {
      _renderScreen(rec);
      _bindEvents();
    });
  } else {
    // fallback: screen already visible
    _renderScreen(rec);
    _bindEvents();
  }
}

function _bindEvents() {
  const backBtn = document.getElementById('trf-back-btn');
  if (backBtn && !backBtn._trfBound) {
    backBtn.addEventListener('click', function() {
      if (typeof window.showScreen === 'function') {
        window.showScreen('home');
      }
    });
    backBtn._trfBound = true;
  }

  const editBtn = document.getElementById('trf-edit-btn');
  if (editBtn && !editBtn._trfBound) {
    editBtn.addEventListener('click', function() {
      if (typeof window.openRecordScreen === 'function') {
        window.openRecordScreen();
      }
    });
    editBtn._trfBound = true;
  }
}

// Expose globally for inline HTML onclick fallbacks
window.openTodayReflection = openTodayReflection;
