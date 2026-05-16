// ============================================================
//  ippo – home-next-quick-record.js
//  最下部のミニマル記録ボタン
//  HOMEの主役にしない。静かな導線として機能させる。
// ============================================================

function getTodayRecord(records) {
  const today = new Date().toISOString().slice(0, 10);
  return (records || []).find(r =>
    (r.date || r.record_date || '').slice(0, 10) === today
  ) || null;
}

function buildComparisonNote(rec) {
  if (!rec) return '';
  // 前日比較コメント (window.buildComparisonComment があれば委譲)
  if (typeof window.buildComparisonComment === 'function') {
    try { return window.buildComparisonComment(rec); } catch { return ''; }
  }
  const pain = rec.painLevel;
  if (pain === 0) return '今日は痛みなし';
  if (pain >= 3)  return '今日は痛みあり';
  return '';
}

export function renderQuickRecord(container, state) {
  const records   = state.records || [];
  const todayRec  = getTodayRecord(records);
  const isDone    = !!todayRec;
  const note      = isDone ? buildComparisonNote(todayRec) : '今日はまだ記録していません';

  const clickHandler = `if(typeof handleHomeCTA==='function'){handleHomeCTA();}else if(typeof openRecordScreen==='function'){openRecordScreen();}`;

  if (isDone) {
    container.innerHTML = `
      <div class="hn-record-area hn-animate-4">
        <div class="hn-record-btn" onclick="${clickHandler}">
          <div class="hn-record-btn-left">
            <div class="hn-record-btn-icon done">✓</div>
            <div>
              <div class="hn-record-btn-label done">今日の記録完了</div>
              <div class="hn-record-btn-sub">${escapeHTML(note)}</div>
            </div>
          </div>
          <span class="hn-record-chevron">›</span>
        </div>
      </div>`;
  } else {
    container.innerHTML = `
      <div class="hn-record-area hn-animate-4">
        <div class="hn-record-btn" onclick="${clickHandler}">
          <div class="hn-record-btn-left">
            <div class="hn-record-btn-icon">+</div>
            <div>
              <div class="hn-record-btn-label">今日を記録する</div>
              <div class="hn-record-btn-sub">${escapeHTML(note)}</div>
            </div>
          </div>
          <span class="hn-record-chevron">›</span>
        </div>
      </div>`;
  }
}

function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
