// ============================================================
// ippo – src/modules/record-input.js
// Phase 4-D Batch-1: Record Input UI の module 化
//
// app-legacy.js の currentRecord / currentStep / STEPS を
// module スコープへ移行する。
//
// 移植対象:
//   - currentRecord 管理 API (B1-1)
//   - Priority Group A: getBodyCheckTitle / getDiseaseMorningQuestion / getDailyHint (B1-2)
//   - Render 系: renderBodyCheck / renderSymptomDetail / renderEmotion / renderFasting (B1-3)
//   - buildSteps (B1-4)
//   - renderStep / nextStep / prevStep (B1-5)
//
// 禁止事項:
//   - 挙動変更禁止
//   - UI変更禁止
//   - app-legacy.js の関数を再設計しない
// ============================================================

// ─── B1-1: currentRecord モジュール変数 ────────────────────────

let _currentRecord = {};

/**
 * 現在編集中のレコードオブジェクトを返す。
 * app-legacy.js の `currentRecord` 変数の代替。
 */
export function getCurrentRecord() {
  return _currentRecord;
}

/**
 * 現在編集中のレコードオブジェクトを置き換える。
 * （編集モード開始時など、外部から完全な object を渡す場合に使用）
 */
export function setCurrentRecord(record) {
  _currentRecord = record;
}

/**
 * レコードを空オブジェクトにリセットする。
 * app-legacy.js の `currentRecord = {}` に相当。
 */
export function resetCurrentRecord() {
  _currentRecord = {};
}

// ─── B1-3: window bridge helpers ──────────────────────────────
// render 系が参照する window.ICONS / window.renderPainScale を
// モジュール内部から呼び出すためのヘルパー。
// Batch-X で import 化後に削除予定。

function _icons() {
  return typeof window.ICONS === 'object' ? window.ICONS : {};
}

function _renderPainScale(v, field) {
  return typeof window.renderPainScale === 'function'
    ? window.renderPainScale(v, field)
    : '';
}

// ─── B1-2: Priority Group A ────────────────────────────────────
// 移植元: app-legacy.js:3490 / 3588 / 3677
// 変更なし。挙動・UI はすべて app-legacy.js と同一。

/**
 * 時間帯に応じたからだチェックのタイトルを返す。
 * app-legacy.js:3490 getBodyCheckTitle() と同一実装。
 */
export function getBodyCheckTitle() {
  var hour = new Date().getHours();
  if (hour >= 5  && hour < 12) return '今朝のからだの\n状態を教えてください';
  if (hour >= 12 && hour < 17) return '今日のからだは\nどうですか？';
  if (hour >= 17 && hour < 21) return '今日一日\nお疲れさまでした';
  return '今夜のからだの\n状態を教えてください';
}

/**
 * 疾患・時間帯に応じた追加質問を返す。
 * app-legacy.js:3588 getDiseaseMorningQuestion() と同一実装。
 * @param {string[]} diseases
 * @param {boolean} isMorning
 * @param {boolean} isNight
 * @returns {{ question: string, options: string[] } | null}
 */
export function getDiseaseMorningQuestion(diseases, isMorning, isNight) {
  if (diseases.indexOf('子宮内膜症') !== -1) {
    if (isMorning) return {
      question: '朝起きたとき、骨盤周りの痛みはありましたか？',
      options: ['なかった', '少しあった', 'かなりあった', '起きるのがつらかった']
    };
    if (isNight) return {
      question: '今日一日の骨盤の痛みのピークはいつでしたか？',
      options: ['なかった', '朝', '午後', '夕方以降', '常にあった']
    };
    return {
      question: '今の骨盤周りの状態は？',
      options: ['楽', '少し重い', '痛みがある', 'かなり痛い']
    };
  }
  if (diseases.indexOf('PCOS') !== -1) {
    if (isMorning) return {
      question: '今朝の基礎体温を計りましたか？',
      options: ['計った（記録欄に入力）', '忘れた', '今日は計らない']
    };
    return {
      question: '今日の食欲はどうでしたか？',
      options: ['ふつう', '少し多め', 'かなり多め', '少なめ']
    };
  }
  if (diseases.indexOf('子宮筋腫') !== -1) {
    if (isMorning) return {
      question: '今朝、下腹部の圧迫感はありましたか？',
      options: ['なかった', '少しあった', 'かなりあった']
    };
    return {
      question: '今日の経血量は（生理中の場合）？',
      options: ['生理中ではない', '少ない', 'ふつう', '多い', 'とても多い']
    };
  }
  if (diseases.indexOf('PMS/PMDD') !== -1) {
    if (isMorning) return {
      question: '今朝の気分はどうですか？',
      options: ['穏やか', 'すこし不安定', 'かなり不安定', 'とても辛い']
    };
    return {
      question: '今日、感情のコントロールは難しかったですか？',
      options: ['問題なかった', '少し難しかった', 'かなり難しかった', 'とても辛かった']
    };
  }
  if (diseases.indexOf('更年期障害') !== -1) {
    if (isMorning) return {
      question: '昨夜、寝汗やほてりで目が覚めましたか？',
      options: ['なかった', '1回あった', '2〜3回あった', '何度も目が覚めた']
    };
    return {
      question: '今日のほてり・のぼせはありましたか？',
      options: ['なかった', '少しあった', 'かなりあった', 'とても辛かった']
    };
  }
  if (diseases.indexOf('卵巣嚢腫') !== -1) {
    return {
      question: '今日、片側の腹部に違和感はありましたか？',
      options: ['なかった', '左側に少し', '右側に少し', 'どちらかにかなり', '強い痛みがあった']
    };
  }
  if (isMorning) return {
    question: '今日一日の予定を考えると、からだの状態は？',
    options: ['問題なさそう', '少し心配', 'かなり心配', '無理せず休みたい']
  };
  return null;
}

/**
 * 疾患・時間帯に応じた日々のヒントを返す。
 * app-legacy.js:3677 getDailyHint() と同一実装。
 * @param {string[]} diseases
 * @param {boolean} isMorning
 * @param {boolean} isNight
 * @returns {{ label: string, text: string } | null}
 */
export function getDailyHint(diseases, isMorning, isNight) {
  var d = new Date().getDay();

  if (diseases.indexOf('子宮内膜症') !== -1) {
    if (isMorning) return { label: '💡 今日のケア', text: '骨盤を温めると血流が改善し、痛みが和らぐことがあります。今日も無理せず過ごしましょう。' };
    if (isNight)   return { label: '🌙 夜のケア',   text: '就寝前の軽いストレッチが骨盤のこわばりをやわらげます。今日の症状を記録しておきましょう。' };
    return { label: '📊 記録のヒント', text: '痛みの部位・性質・強さを記録すると、診察時に医師へ正確に伝えられます。' };
  }
  if (diseases.indexOf('PCOS') !== -1) {
    if (isMorning) return { label: '🌡 基礎体温', text: '毎朝同じ時間に基礎体温を測ると、排卵のパターンが見えてきます。' };
    if (isNight)   return { label: '🍽 食事メモ', text: '血糖値の急上昇を避けると、PCOSの症状管理に役立つことがあります。今日の食事を記録しましょう。' };
    return { label: '💡 今日のヒント', text: '適度な有酸素運動はインスリン抵抗性の改善に役立つと言われています。' };
  }
  if (diseases.indexOf('PMS/PMDD') !== -1) {
    if (isMorning) return { label: '🌸 今日の気分', text: 'PMSの症状は生理前7〜14日に出やすいです。今日の気分の変化も記録しておきましょう。' };
    if (isNight)   return { label: '🌙 夜のケア',   text: '生理前は睡眠の質が落ちやすい時期です。スマートフォンの画面は早めに閉じましょう。' };
    return { label: '💡 気分の記録', text: '気分の波をパターンとして記録すると、PMSとPMDDの違いが見えてきます。' };
  }
  if (diseases.indexOf('更年期障害') !== -1) {
    if (isMorning) return { label: '🌡 今朝のチェック', text: 'ほてりや寝汗の有無を毎朝記録すると、症状の変化のパターンがわかります。' };
    if (isNight)   return { label: '🌙 夜のケア',       text: '寝室を涼しくしておくと、夜間のほてりや寝汗が軽減されることがあります。' };
    return { label: '💡 SMIチェック', text: '更年期指数（SMI）の記録を続けると、症状の改善・悪化が数値でわかります。' };
  }

  var defaults = {
    morning: [
      { label: '🌸 今日も一歩', text: '今日の記録が、未来の診察を変えます。まず症状チップをタップしてみましょう。' },
      { label: '💡 記録のコツ', text: '毎日同じ時間に記録すると、からだのパターンが見えやすくなります。' }
    ],
    night: [
      { label: '🌙 お疲れさまでした', text: '今日の症状を記録して、一日を締めくくりましょう。' },
      { label: '📊 今日の振り返り',   text: '今日気になったことがあれば、メモ欄に残しておくと診察で役立ちます。' }
    ],
    day: [
      { label: '💡 記録の習慣', text: '30日記録を続けると、あなただけの症状パターンが見えてきます。' },
      { label: '🏥 診察の準備', text: '症状の記録が7日分たまったら、医師向けレポートを作成できます。' }
    ]
  };
  var pool = isMorning ? defaults.morning : isNight ? defaults.night : defaults.day;
  return pool[d % pool.length];
}

// ─── B1-3: Render 系関数 ───────────────────────────────────────
// 移植元: app-legacy.js:3341 / 3368 / 3403 / 3429 / 3498 / 3720
// 変更なし。挙動・UI はすべて app-legacy.js と同一。
// DOM 書き込みは document.getElementById('modal-body') に対して行う。
// window.ICONS / window.renderPainScale は _icons() / _renderPainScale() 経由。

export function renderWellness() {
  const scores = [
    { v: 1, emoji: '😔', label: 'とてもつらい' },
    { v: 2, emoji: '😕', label: 'しんどい' },
    { v: 3, emoji: '😐', label: 'ふつう' },
    { v: 4, emoji: '🙂', label: 'わりと元気' },
    { v: 5, emoji: '😊', label: 'とても元気' },
  ];
  document.getElementById('modal-body').innerHTML = `
    <div class="score-selector">
      ${scores.map(s => `
        <button class="score-btn ${_currentRecord.wellness === s.v ? 'selected' : ''}" onclick="selectWellness(${s.v}, this)">
          ${s.emoji}<span class="score-label">${s.label}</span>
        </button>
      `).join('')}
    </div>
  `;
}

export function selectWellness(v, el) {
  _currentRecord.wellness = v;
  document.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

export function renderFood() {
  const foods = ['根菜類', '発酵食品', '温かいもの', '砂糖控え', 'グルテンフリー', 'EPA/DHA', 'ビタミンD', '鉄分', '水2L以上'];
  if (!_currentRecord.foodItems) _currentRecord.foodItems = [];
  document.getElementById('modal-body').innerHTML = `
    <div class="score-selector" style="margin-bottom:16px;">
      ${[1,2,3,4,5,6,7,8,9,10].map(v => `
        <button class="score-btn ${_currentRecord.foodScore === v ? 'selected' : ''}" style="font-size:14px;padding:10px 2px;" onclick="selectFood(${v}, this)">
          ${v}<span class="score-label"></span>
        </button>
      `).join('')}
    </div>
    <div style="font-size:12px;color:var(--ink-light);margin-bottom:10px;">意識した食材（複数OK）</div>
    <div class="chips" id="food-chips">
      ${foods.map(f => `<div class="chip ${_currentRecord.foodItems.includes(f) ? 'selected' : ''}" onclick="toggleFoodItem('${f}', this)">${f}</div>`).join('')}
    </div>
  `;
}

export function selectFood(v, el) {
  _currentRecord.foodScore = v;
  document.querySelectorAll('.score-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
}

export function toggleFoodItem(item, el) {
  if (!_currentRecord.foodItems) _currentRecord.foodItems = [];
  if (_currentRecord.foodItems.includes(item)) {
    _currentRecord.foodItems = _currentRecord.foodItems.filter(f => f !== item);
    el.classList.remove('selected');
  } else {
    _currentRecord.foodItems.push(item);
    el.classList.add('selected');
  }
}

export function renderFasting() {
  const opts = [
    { label: '記録しない', value: null },
    { label: '12時間',     value: 12 },
    { label: '14時間',     value: 14 },
    { label: '16時間',     value: 16 },
    { label: '18時間以上', value: 18 },
  ];
  document.getElementById('modal-body').innerHTML = `
    <div class="chips" style="flex-direction:column;gap:8px;">
      ${opts.map(o => `
        <div class="chip ${_currentRecord.fasting === o.value ? 'selected' : ''}"
             style="padding:12px 16px;font-size:13px;border-radius:14px;"
             onclick="selectFasting(${o.value === null ? 'null' : o.value}, this)">${o.label}</div>
      `).join('')}
    </div>
  `;
}

export function selectFasting(v, el) {
  _currentRecord.fasting = v === 'null' ? null : Number(v);
  document.querySelectorAll('.chips .chip').forEach(c => c.classList.remove('selected'));
  el.classList.add('selected');
}

export function renderEmotion() {
  const emotions = [
    { emoji: '🌸', label: '穏やか\n平和', key: '穏やか' },
    { emoji: '✨', label: 'うれしい\n満たされ', key: 'うれしい' },
    { emoji: '🌙', label: '疲れ\n重さ', key: '疲れ' },
    { emoji: '🌊', label: '不安\n緊張', key: '不安' },
    { emoji: '🔥', label: 'イライラ\n焦り', key: 'イライラ' },
    { emoji: '☁️', label: 'ふつう', key: 'ふつう' },
  ];
  document.getElementById('modal-body').innerHTML = `
    <div class="emotion-grid">
      ${emotions.map(e => `
        <button class="emotion-btn ${_currentRecord.emotion === e.key ? 'selected' : ''}" onclick="selectEmotion('${e.key}', this)">
          <span class="emotion-emoji">${e.emoji}</span>
          <span class="emotion-label">${e.label.replace('\n', '<br>')}</span>
        </button>
      `).join('')}
    </div>
    <textarea class="modal-textarea" id="journal-note" placeholder="今日感じたことを自由に…">${_currentRecord.note || ''}</textarea>
  `;
}

export function selectEmotion(key, el) {
  _currentRecord.emotion = key;
  document.querySelectorAll('.emotion-btn').forEach(b => b.classList.remove('selected'));
  el.classList.add('selected');
  const note = document.getElementById('journal-note');
  if (note) _currentRecord.note = note.value;
}

export function renderBodyCheck() {
  var hour = new Date().getHours();
  var diseases = (typeof window.getState === 'function' ? window.getState() : {}).myDiseases || [];
  var isMorning = hour >= 5 && hour < 12;
  var isNight   = hour >= 20 || hour < 5;
  var ICONS = _icons();

  var html = '';
  html += '<div style="margin-bottom:18px;">';
  html += '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">今日の痛みレベルはどのくらいですか？</div>';
  html += _renderPainScale(_currentRecord.painLevel, 'painLevel');
  html += '</div>';

  if (isMorning) {
    html += '<div style="margin-bottom:18px;">';
    html += '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">昨夜の眠りはどうでしたか？</div>';
    var sleepOpts = [
      { v: 1, icon: 'moon',        label: 'ぐっすり' },
      { v: 2, icon: 'faceGood',    label: 'まあまあ' },
      { v: 3, icon: 'faceNeutral', label: 'あまり眠れず' },
      { v: 4, icon: 'faceBad',     label: 'ほとんど眠れず' }
    ];
    html += '<div class="score-selector">';
    sleepOpts.forEach(function(s) {
      var sel = _currentRecord.sleepQuality === s.v;
      var c = sel ? 'var(--rose)' : '#9a8e88';
      html += '<button class="score-btn' + (sel ? ' selected' : '') + '" onclick="selectBodyCheckItem(\'sleepQuality\',' + s.v + ',this)">'
        + (ICONS[s.icon] ? ICONS[s.icon](18, c) : '') + '<span class="score-label">' + s.label + '</span></button>';
    });
    html += '</div></div>';
  }

  html += '<div style="margin-bottom:18px;">';
  if (isMorning) {
    html += '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">今朝、からだはどんな感じですか？</div>';
  } else if (isNight) {
    html += '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">今日一日、からだはどうでしたか？</div>';
  } else {
    html += '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">今の体の状態を教えてください</div>';
  }
  var energyOpts = [
    { v: 5, icon: 'sun',          label: 'エネルギーがある' },
    { v: 4, icon: 'faceGood',     label: 'まあまあ元気' },
    { v: 3, icon: 'faceNeutral',  label: 'ふつう' },
    { v: 2, icon: 'faceBad',      label: '疲れている' },
    { v: 1, icon: 'faceVeryBad',  label: 'とても疲れている' }
  ];
  html += '<div class="score-selector">';
  energyOpts.forEach(function(s) {
    var sel = _currentRecord.energy === s.v;
    var c = sel ? 'var(--rose)' : '#9a8e88';
    html += '<button class="score-btn' + (sel ? ' selected' : '') + '" onclick="selectBodyCheckItem(\'energy\',' + s.v + ',this)">'
      + (ICONS[s.icon] ? ICONS[s.icon](18, c) : '') + '<span class="score-label">' + s.label + '</span></button>';
  });
  html += '</div></div>';

  var extraQ = getDiseaseMorningQuestion(diseases, isMorning, isNight);
  if (extraQ) {
    html += '<div style="margin-bottom:18px;">';
    html += '<div style="font-size:12px;color:var(--ink-light);margin-bottom:8px;">' + extraQ.question + '</div>';
    html += '<div class="chips">';
    extraQ.options.forEach(function(opt) {
      var sel = (_currentRecord.extraAnswer || '') === opt;
      html += '<div class="chip' + (sel ? ' selected' : '') + '" onclick="selectBodyCheckExtra(\'' + opt.replace(/'/g, "\\'") + '\',this)">' + opt + '</div>';
    });
    html += '</div></div>';
  }

  document.getElementById('modal-body').innerHTML = html;
}

export function selectBodyCheckItem(field, value, el) {
  _currentRecord[field] = value;
  var group = el.closest('.score-selector');
  if (group) group.querySelectorAll('.score-btn').forEach(function(b) { b.classList.remove('selected'); });
  el.classList.add('selected');
}

export function selectBodyCheckExtra(value, el) {
  _currentRecord.extraAnswer = value;
  var group = el.closest('.chips');
  if (group) group.querySelectorAll('.chip').forEach(function(c) { c.classList.remove('selected'); });
  el.classList.add('selected');
}

export function renderSymptomDetail() {
  var diseases = (typeof window.getState === 'function' ? window.getState() : {}).myDiseases || [];
  var DISEASE_CONFIG = typeof window.DISEASE_CONFIG === 'object' ? window.DISEASE_CONFIG : {};
  var SYMPTOM_DETAIL_CONFIG = typeof window.SYMPTOM_DETAIL_CONFIG === 'object' ? window.SYMPTOM_DETAIL_CONFIG : {};

  var prioritized = [];
  diseases.forEach(function(d) {
    var cfg = DISEASE_CONFIG[d];
    if (!cfg || !cfg.specificSymptoms) return;
    cfg.specificSymptoms.forEach(function(s) {
      if (prioritized.indexOf(s) === -1) prioritized.push(s);
    });
  });
  var userSymptoms = (typeof window.getState === 'function' ? window.getState() : {}).mySymptoms || [];
  userSymptoms.forEach(function(s) {
    if (prioritized.indexOf(s) === -1) prioritized.push(s);
  });
  var defaults = ['下腹部痛', '腰痛', '頭痛', '骨盤痛', 'だるさ', '不正出血', '吐き気', 'むくみ', 'おりもの', '気分の落ち込み', 'イライラ'];
  defaults.forEach(function(s) {
    if (prioritized.indexOf(s) === -1) prioritized.push(s);
  });

  if (!_currentRecord.symptoms) _currentRecord.symptoms = [];
  if (!_currentRecord.symptomDetails) _currentRecord.symptomDetails = {};

  var html = '';
  html += '<div style="font-size:12px;color:var(--ink-light);margin-bottom:10px;">今日の症状（複数選択可）</div>';
  html += '<div class="chips" id="sd-chips" style="margin-bottom:16px;">';
  prioritized.slice(0, 12).forEach(function(s) {
    var sel = _currentRecord.symptoms.indexOf(s) !== -1;
    html += '<div class="chip' + (sel ? ' selected' : '') + '" '
      + 'onclick="toggleSymptomChip(\'' + s.replace(/'/g, "\\'") + '\', this)" '
      + 'style="transition:all 0.2s;">'
      + s + '</div>';
  });
  html += '</div>';
  html += '<div id="sd-details"></div>';

  document.getElementById('modal-body').innerHTML = html;

  _currentRecord.symptoms.forEach(function(s) {
    appendSymptomDetail(s);
  });
}

export function toggleSymptomChip(symptomName, el) {
  if (!_currentRecord.symptoms) _currentRecord.symptoms = [];
  var idx = _currentRecord.symptoms.indexOf(symptomName);
  if (idx !== -1) {
    _currentRecord.symptoms.splice(idx, 1);
    el.classList.remove('selected');
    var safeId = 'sd-detail-' + symptomName.replace(/[^a-zA-Z0-9]/g, '_');
    var detail = document.getElementById(safeId);
    if (detail) {
      detail.style.maxHeight = detail.scrollHeight + 'px';
      requestAnimationFrame(function() {
        detail.style.transition = 'max-height 0.3s ease, opacity 0.3s ease';
        detail.style.maxHeight = '0';
        detail.style.opacity = '0';
        setTimeout(function() { if (detail.parentNode) detail.remove(); }, 300);
      });
    }
  } else {
    _currentRecord.symptoms.push(symptomName);
    el.classList.add('selected');
    appendSymptomDetail(symptomName);
  }
}

export function appendSymptomDetail(symptomName) {
  var SYMPTOM_DETAIL_CONFIG = typeof window.SYMPTOM_DETAIL_CONFIG === 'object' ? window.SYMPTOM_DETAIL_CONFIG : {};
  var cfg = SYMPTOM_DETAIL_CONFIG[symptomName];
  if (!cfg) return;

  var container = document.getElementById('sd-details');
  if (!container) return;
  var safeId = 'sd-detail-' + symptomName.replace(/[^a-zA-Z0-9]/g, '_');
  if (document.getElementById(safeId)) return;

  if (!_currentRecord.symptomDetails) _currentRecord.symptomDetails = {};
  if (!_currentRecord.symptomDetails[symptomName]) _currentRecord.symptomDetails[symptomName] = {};
  var detail = _currentRecord.symptomDetails[symptomName];

  var html = '<div id="' + safeId + '" style="background:var(--cream);border-radius:14px;padding:14px;margin-bottom:10px;border-left:3px solid var(--rose);max-height:0;opacity:0;overflow:hidden;">';
  html += '<div style="font-size:12px;font-weight:500;color:var(--ink);margin-bottom:10px;">| DETAIL<br>' + symptomName + 'の詳細</div>';

  if (cfg.positions && cfg.positions.length > 0) {
    var posLabel = symptomName === 'おりもの' ? '量' : '痛みの位置';
    html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:7px;">' + posLabel + '</div>';
    html += '<div class="chips" style="margin-bottom:12px;">';
    cfg.positions.forEach(function(pos) {
      var sel = (detail.positions || []).indexOf(pos) !== -1;
      html += '<div class="chip' + (sel ? ' selected' : '') + '" '
        + 'onclick="toggleDetailItem(\'' + symptomName.replace(/'/g, "\\'") + '\',\'positions\',\'' + pos.replace(/'/g, "\\'") + '\',this)" '
        + 'style="font-size:11px;transition:all 0.15s;">' + pos + '</div>';
    });
    html += '</div>';
  }

  if (cfg.types && cfg.types.length > 0) {
    var typesLabel = symptomName === 'おりもの' ? 'おりものの状態' : '痛みの種類';
    html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:7px;">' + typesLabel + '</div>';
    html += '<div class="chips" style="margin-bottom:12px;">';
    cfg.types.forEach(function(type) {
      var sel = (detail.types || []).indexOf(type) !== -1;
      html += '<div class="chip' + (sel ? ' selected' : '') + '" '
        + 'onclick="toggleDetailItem(\'' + symptomName.replace(/'/g, "\\'") + '\',\'types\',\'' + type.replace(/'/g, "\\'") + '\',this)" '
        + 'style="font-size:11px;transition:all 0.15s;">' + type + '</div>';
    });
    html += '</div>';
  }

  if (cfg.timing && cfg.timing.length > 0) {
    var timingLabel = symptomName === 'おりもの' ? 'その他の症状' : 'タイミング';
    html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:7px;">' + timingLabel + '</div>';
    html += '<div class="chips" style="margin-bottom:12px;">';
    cfg.timing.forEach(function(t) {
      var sel = (detail.timing || []).indexOf(t) !== -1;
      html += '<div class="chip' + (sel ? ' selected' : '') + '" '
        + 'onclick="toggleDetailItem(\'' + symptomName.replace(/'/g, "\\'") + '\',\'timing\',\'' + t.replace(/'/g, "\\'") + '\',this)" '
        + 'style="font-size:11px;transition:all 0.15s;">' + t + '</div>';
    });
    html += '</div>';
  }

  if (cfg.note) {
    html += '<div style="font-size:10px;color:var(--ink-light);background:rgba(184,112,122,0.07);border-radius:8px;padding:8px 10px;margin-bottom:10px;">ℹ️ ' + cfg.note + '</div>';
  }

  if (cfg.bowelCount) {
    var bowelVal = detail.bowelCount || 0;
    html += '<div style="font-size:11px;color:var(--ink-light);margin-bottom:7px;">今日の排便回数</div>';
    html += '<div style="display:flex;gap:6px;margin-bottom:12px;">';
    for (var i = 0; i <= 5; i++) {
      html += '<button onclick="selectBowelCount(\'' + symptomName.replace(/'/g, "\\'") + '\',' + i + ',this)" '
        + 'style="width:36px;height:36px;border-radius:50%;border:1.5px solid '
        + (bowelVal === i ? 'var(--rose)' : '#e8ddd8') + ';'
        + 'background:' + (bowelVal === i ? 'var(--rose-pale)' : 'var(--white)') + ';'
        + 'font-size:12px;font-weight:500;color:var(--ink);cursor:pointer;transition:all 0.15s;">'
        + (i === 0 ? 'なし' : i) + '</button>';
    }
    html += '</div>';
  }

  if (cfg.hasSlider) {
    var sliderLabel = cfg.sliderLabel || '痛みの強さ';
    var sliderVal = detail.intensity !== undefined ? detail.intensity : 0;
    var pct = Math.round(sliderVal / 10 * 100);
    var labels = ['なし', '軽い', '中程度', '強い', '激痛'];
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
    html += '<div style="font-size:11px;color:var(--ink-light);">' + sliderLabel + '</div>';
    html += '<div style="font-size:13px;font-weight:600;color:var(--rose);" id="slider-val-' + safeId + '">' + sliderVal + '<span style="font-size:10px;font-weight:400;color:var(--ink-light);">/10</span></div>';
    html += '</div>';
    html += '<input type="range" min="0" max="10" value="' + sliderVal + '" '
      + 'style="width:100%;height:4px;margin-bottom:8px;background:linear-gradient(to right,var(--rose) 0%,var(--rose) ' + pct + '%,#e8ddd8 ' + pct + '%,#e8ddd8 100%);" '
      + 'oninput="updateSliderDetail(\'' + symptomName.replace(/'/g, "\\'") + '\',this.value,\'' + safeId + '\',this)">';
    html += '<div style="display:flex;justify-content:space-between;">';
    labels.forEach(function(l) {
      html += '<span style="font-size:9px;color:var(--ink-light);">' + l + '</span>';
    });
    html += '</div>';
    html += '<div style="margin-top:10px;background:rgba(184,112,122,0.08);border-radius:8px;padding:8px 10px;font-size:10px;color:var(--ink-light);">💡 ' + symptomName + 'の記録が症状の変化の把握に役立ちます</div>';
  }

  html += '</div>';
  container.insertAdjacentHTML('beforeend', html);

  var el = document.getElementById(safeId);
  if (el) {
    requestAnimationFrame(function() {
      requestAnimationFrame(function() {
        el.style.transition = 'max-height 0.35s ease, opacity 0.35s ease';
        el.style.maxHeight = '700px';
        el.style.opacity = '1';
      });
    });
  }
}

export function toggleDetailItem(symptomName, field, value, el) {
  if (!_currentRecord.symptomDetails) _currentRecord.symptomDetails = {};
  if (!_currentRecord.symptomDetails[symptomName]) _currentRecord.symptomDetails[symptomName] = {};
  var detail = _currentRecord.symptomDetails[symptomName];
  if (!detail[field]) detail[field] = [];
  var idx = detail[field].indexOf(value);
  if (idx !== -1) {
    detail[field].splice(idx, 1);
    el.classList.remove('selected');
  } else {
    detail[field].push(value);
    el.classList.add('selected');
  }
}

export function updateSliderDetail(symptomName, value, safeId, sliderEl) {
  if (!_currentRecord.symptomDetails) _currentRecord.symptomDetails = {};
  if (!_currentRecord.symptomDetails[symptomName]) _currentRecord.symptomDetails[symptomName] = {};
  _currentRecord.symptomDetails[symptomName].intensity = parseInt(value);
  var valEl = document.getElementById('slider-val-' + safeId);
  if (valEl) valEl.innerHTML = value + '<span style="font-size:10px;font-weight:400;color:var(--ink-light);">/10</span>';
  if (sliderEl) {
    var pct = Math.round(parseInt(value) / 10 * 100);
    sliderEl.style.background = 'linear-gradient(to right, var(--rose) 0%, var(--rose) ' + pct + '%, #e8ddd8 ' + pct + '%, #e8ddd8 100%)';
  }
}

// ─── B1-4: buildSteps ──────────────────────────────────────────
// 移植元: app-legacy.js:3460
// 変更なし。state.fastingEnabled は window.getState() 経由で参照。

let _steps = [];
let _currentStep = 0;

/**
 * モーダルステップ配列を再構築して返す。
 * app-legacy.js:3460 buildSteps() と同一実装。
 */
export function buildSteps() {
  var state = typeof window.getState === 'function' ? window.getState() : {};
  var stepCount = 3 + (state.fastingEnabled ? 1 : 0);
  var steps = [
    {
      title: getBodyCheckTitle(),
      label: '1 / ' + stepCount,
      render: renderBodyCheck
    },
    {
      title: '症状と痛みを\n記録しましょう',
      label: '2 / ' + stepCount,
      render: renderSymptomDetail
    },
    {
      title: '今日の気持ちと\nひとことメモ',
      label: '3 / ' + stepCount,
      render: renderEmotion
    }
  ];
  if (state.fastingEnabled) {
    steps.push({
      title: '今日のファスティング',
      label: '4 / 4',
      render: renderFasting
    });
  }
  return steps;
}

/** 現在のステップ配列を返す */
export function getSteps() { return _steps; }

/** 現在のステップインデックスを返す */
export function getCurrentStep() { return _currentStep; }

/** ステップをリセットして buildSteps() で再初期化する */
export function initSteps() {
  _steps = buildSteps();
  _currentStep = 0;
  return _steps;
}

// ─── B1-5: renderStep / nextStep / prevStep ────────────────────
// 移植元: app-legacy.js:3306 / 3324 / 3333
// 変更なし。DOM 要素 'modal-body' / 'modal-title' 等に書き込む。
// nextStep の末尾で saveRecord() を呼ぶ: window.saveRecord 経由。

/**
 * 現在ステップの UI を DOM に描画する。
 * app-legacy.js:3306 renderStep() と同一実装。
 */
export function renderStep() {
  const step = _steps[_currentStep];
  document.getElementById('modal-title').innerHTML = step.title.replace('\n', '<br>');
  document.getElementById('modal-step-label').textContent = step.label;

  const dots = document.querySelectorAll('#step-indicator .step-dot');
  dots.forEach((d, i) => {
    d.classList.remove('active', 'done');
    if (i < _currentStep) d.classList.add('done');
    else if (i === _currentStep) d.classList.add('active');
  });

  document.getElementById('modal-back-btn').style.display = _currentStep === 0 ? 'none' : 'block';
  document.getElementById('modal-next-btn').textContent = _currentStep === _steps.length - 1 ? '保存する' : '次へ →';

  step.render();
}

/**
 * 次ステップへ進む。最終ステップでは saveRecord() を呼ぶ。
 * app-legacy.js:3324 nextStep() と同一実装。
 */
export function nextStep() {
  if (_currentStep < _steps.length - 1) {
    _currentStep++;
    renderStep();
  } else {
    if (typeof window.saveRecord === 'function') window.saveRecord();
  }
}

/**
 * 前ステップへ戻る。
 * app-legacy.js:3333 prevStep() と同一実装。
 */
export function prevStep() {
  if (_currentStep > 0) {
    _currentStep--;
    renderStep();
  }
}

export function selectBowelCount(symptomName, count, el) {
  if (!_currentRecord.symptomDetails) _currentRecord.symptomDetails = {};
  if (!_currentRecord.symptomDetails[symptomName]) _currentRecord.symptomDetails[symptomName] = {};
  _currentRecord.symptomDetails[symptomName].bowelCount = count;
  var parent = el.parentNode;
  parent.querySelectorAll('button').forEach(function(b) {
    b.style.background = 'var(--white)';
    b.style.borderColor = '#e8ddd8';
  });
  el.style.background = 'var(--rose-pale)';
  el.style.borderColor = 'var(--rose)';
}
