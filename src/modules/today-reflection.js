// ============================================================
// ippo – today-reflection.js
// "✓ 今日をふり返る" quiet journal reflection screen
//
// 役割:
// - 3カード daily check-in 完了後の読み取り専用ふり返り画面
// - meta.checkinSnapshot（check-in 時に凍結）を固定参照
// - analytics/dashboard ではなく「静かな日記」の空気感
// - 再入力不可 (readonly); 編集は 3カード経由
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

// ─── text label maps (no emoji — journal feel) ───────────────

const CONDITION_LABEL = {
  great:       'とても良い',
  good:        '良い',
  normal:      'ふつう',
  slightlyBad: 'すこし辛い',
  tough:       '辛い',
};

const SLEEP_LABEL = {
  wellSlept:   'よく眠れた',
  soSo:        'まあまあ',
  wokeUp:      '途中で目覚めた',
  hardlySlept: 'ほとんど眠れず',
};

const ENERGY_LABEL = {
  plenty:    '元気いっぱい',
  soSo:      'まあまあ',
  normal:    'ふつう',
  low:       '少ない',
  hardlyAny: 'ほとんどない',
};

// ─── date helpers ─────────────────────────────────────────────

const WEEKDAY_JP = ['日', '月', '火', '水', '木', '金', '土'];

function _formatDateJP(isoDate) {
  try {
    const d = new Date(isoDate + 'T00:00:00');
    const m = d.getMonth() + 1;
    const day = d.getDate();
    const w = WEEKDAY_JP[d.getDay()];
    return m + '月' + day + '日（' + w + '）';
  } catch(e) { return isoDate || ''; }
}

function _formatTimeJP(isoTs) {
  if (!isoTs) return '';
  try {
    const d = new Date(isoTs);
    const h = d.getHours();
    const min = String(d.getMinutes()).padStart(2, '0');
    return h + ':' + min;
  } catch(e) { return ''; }
}

// ─── gentle observation ───────────────────────────────────────
// 1文のみ、静かに。ラベルなし。

function _buildGentleObservation(rec) {
  if (!rec) return null;
  const snap = rec.snapshot || {};
  const emotions = rec.emotions || {};
  const emotionTags = emotions.tags || [];
  const symptomCount = (rec.symptomDetails || []).length;

  // Emotion first — most personal
  if (emotionTags.some(function(t) { return ['不安', '緊張', 'ストレス', '辛い'].includes(t); })) {
    return '感情の動きに気づいていること、それ自体がセルフケアの第一歩です。';
  }
  if (emotionTags.some(function(t) { return ['嬉しい', '満足', '穏やか', '感謝'].includes(t); })) {
    return '穏やかな気持ちの日は、その余裕を丁寧に覚えておきましょう。';
  }

  // Sleep — recovery signal
  if (snap.sleep === 'hardlySlept') {
    return '眠れない夜もあります。明日は少し早めに休む時間をつくれると良いですね。';
  }
  if (snap.sleep === 'wokeUp') {
    return '途中で目覚めた日は、体が何かを知らせているかもしれません。';
  }

  // Condition
  if (snap.condition === 'tough' || snap.condition === 'slightlyBad') {
    return '少し辛い一日でも、記録し続けていること自体がケアの積み重ねです。';
  }
  if (snap.condition === 'great' || snap.condition === 'good') {
    return '体調が良い日は、その感覚を丁寧に覚えておきましょう。';
  }

  // Symptoms
  if (symptomCount >= 3) {
    return '複数の症状を記録しています。続けることで傾向が見えてきます。';
  }
  if (symptomCount === 0) {
    return '症状のない日は、身体が整っているサインかもしれません。';
  }

  return '今日の記録が整いました。積み重ねることで、あなた自身の傾向が見えてきます。';
}

// ─── renderer ────────────────────────────────────────────────

function _renderScreen(rec) {
  const body = document.getElementById('trf-body');
  if (!body) return;

  if (!rec) {
    body.innerHTML =
      '<div class="trf-surface" style="padding:40px 22px;text-align:center;">' +
      '<p style="font-family:\'Noto Sans JP\',sans-serif;font-size:13px;color:#c0b0ac;">' +
      '今日のチェックイン記録が見つかりません</p></div>';
    return;
  }

  const snap          = rec.snapshot       || {};
  const symptomDetails = rec.symptomDetails || [];
  const emotions      = rec.emotions        || {};
  const memo          = rec.note || emotions.memo || '';
  const emotionTags   = emotions.tags        || [];
  const completedAt   = rec.meta && rec.meta.completedAt;

  // ── date anchor text ─────────────────────────────────────────
  const dateStr  = _formatDateJP(rec.record_date || todayLocal());
  const timeStr  = _formatTimeJP(completedAt);
  const anchorSub = timeStr
    ? timeStr + ' の小さな記録'
    : '今日の小さな記録';

  // ── snapshot text ─────────────────────────────────────────────
  const condVal   = CONDITION_LABEL[snap.condition] || '—';
  const sleepVal  = SLEEP_LABEL[snap.sleep]         || '—';
  const energyVal = ENERGY_LABEL[snap.energy]       || '—';

  const condClass   = snap.condition ? '' : ' trf-snap-val trf-unrecorded';
  const sleepClass  = snap.sleep     ? '' : ' trf-snap-val trf-unrecorded';
  const energyClass = snap.energy    ? '' : ' trf-snap-val trf-unrecorded';

  // ── observation ──────────────────────────────────────────────
  const obs = _buildGentleObservation(rec);

  // ── build HTML ───────────────────────────────────────────────
  let html = '<div class="trf-surface">';

  // Date anchor
  html += '<div class="trf-anchor">';
  html += '<div class="trf-anchor-date">' + escapeHtml(dateStr) + '</div>';
  html += '<div class="trf-anchor-sub">' + escapeHtml(anchorSub) + '</div>';
  html += '</div>';

  // Snapshot row — text-only, no emoji
  html += '<div class="trf-snap-section">';
  html += '<div class="trf-snap-grid">';
  html += '<div class="trf-snap-col">';
  html += '<div class="trf-snap-lbl">状態</div>';
  html += '<div class="trf-snap-val' + condClass + '">' + escapeHtml(condVal) + '</div>';
  html += '</div>';
  html += '<div class="trf-snap-col">';
  html += '<div class="trf-snap-lbl">睡眠</div>';
  html += '<div class="trf-snap-val' + sleepClass + '">' + escapeHtml(sleepVal) + '</div>';
  html += '</div>';
  html += '<div class="trf-snap-col">';
  html += '<div class="trf-snap-lbl">エネルギー</div>';
  html += '<div class="trf-snap-val' + energyClass + '">' + escapeHtml(energyVal) + '</div>';
  html += '</div>';
  html += '</div>';
  html += '</div>';

  // Symptoms section
  html += '<div class="trf-section">';
  if (symptomDetails.length > 0) {
    html += '<div class="trf-section-lbl">気になった症状</div>';
    html += '<div class="trf-chip-row">';
    symptomDetails.forEach(function(s) {
      const sev = s.severity ? ' · ' + s.severity : '';
      html += '<span class="trf-symptom-chip">' + escapeHtml((s.symptom || '') + sev) + '</span>';
    });
    html += '</div>';
  } else {
    html += '<div class="trf-empty">症状の記録なし</div>';
  }
  html += '</div>';

  // Emotions + memo section
  const hasEmotions = emotionTags.length > 0;
  const hasMemo     = memo && memo.trim();
  html += '<div class="trf-section">';
  if (hasEmotions || hasMemo) {
    if (hasEmotions) {
      html += '<div class="trf-section-lbl">感じたこと</div>';
      html += '<div class="trf-chip-row">';
      emotionTags.forEach(function(tag) {
        html += '<span class="trf-emotion-chip">' + escapeHtml(tag) + '</span>';
      });
      html += '</div>';
    }
    if (hasMemo) {
      if (!hasEmotions) {
        html += '<div class="trf-section-lbl">ひとこと</div>';
      }
      html += '<div class="trf-memo">' + escapeHtml(memo.trim()) + '</div>';
    }
  } else {
    html += '<div class="trf-empty">感情・メモの記録なし</div>';
  }
  html += '</div>';

  // Observation — no label, quiet italic text
  if (obs) {
    html += '<div class="trf-obs">';
    html += '<div class="trf-obs-text">' + escapeHtml(obs) + '</div>';
    html += '</div>';
  }

  html += '</div>'; // .trf-surface

  body.innerHTML = html;
}

// ─── stable check-in record retrieval ────────────────────────
//
// 取得優先順位:
//   1. record.meta.checkinSnapshot  — check-in 時に凍結 (新規保存)
//   2. record fields 直接参照       — 旧フォーマットへのフォールバック
//   3. null                         — 今日の daily check-in なし
//
// 他の保存経路 (calendar edit 等) は meta キーを含まないため
// mergeRecordPreservingExisting() が meta を永続保持する → 不変。
function _getCheckinRecord(date) {
  const s = getState();
  if (!s) return null;

  const today = date || todayLocal();

  const rec = (s.records || []).find(function(r) {
    const d = (r.date || r.record_date || '').slice(0, 10);
    return d === today && r.meta && r.meta.uiFlow === 'daily-checkin';
  });

  if (!rec) return null;

  // 新規保存: meta.checkinSnapshot から安定ビューを構築
  if (rec.meta.checkinSnapshot) {
    const frozen = rec.meta.checkinSnapshot;
    return {
      record_date:    today,
      snapshot:       frozen.snapshot       || {},
      symptomDetails: frozen.symptomDetails || [],
      emotions:       frozen.emotions       || { tags: [], memo: '' },
      note:           frozen.note           || '',
      meta:           rec.meta,           // completedAt 等へのアクセス用
      _fromFrozenSnapshot: true,
    };
  }

  // 旧フォーマット (checkinSnapshot なし): live フィールドにフォールバック
  return rec;
}

// ─── main export ─────────────────────────────────────────────

export function openTodayReflection() {
  const date = todayLocal();
  const now  = new Date();

  // Header date (right side chip)
  const headerDate = document.getElementById('trf-header-date');
  if (headerDate) {
    headerDate.textContent = (now.getMonth() + 1) + '月' + now.getDate() + '日';
  }

  const rec = _getCheckinRecord(date);

  if (typeof window.showScreen === 'function') {
    window.showScreen('today-reflection').then(function() {
      _renderScreen(rec);
      _bindEvents();
    });
  } else {
    _renderScreen(rec);
    _bindEvents();
  }
}

function _bindEvents() {
  const backBtn = document.getElementById('trf-back-btn');
  if (backBtn && !backBtn._trfBound) {
    backBtn.addEventListener('click', function() {
      if (typeof window.showScreen === 'function') window.showScreen('home');
    });
    backBtn._trfBound = true;
  }

  const editBtn = document.getElementById('trf-edit-btn');
  if (editBtn && !editBtn._trfBound) {
    editBtn.addEventListener('click', function() {
      if (typeof window.openRecordScreen === 'function') window.openRecordScreen();
    });
    editBtn._trfBound = true;
  }
}

// Global expose for HTML onclick fallbacks
window.openTodayReflection = openTodayReflection;
