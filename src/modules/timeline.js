// src/modules/timeline.js
// Phase 4-C: renderTimeline / loadMoreTimeline / updateTimelineView を app-legacy.js から移植

var _tlPage    = 1;
var _tlPerPage = 20;

export function renderTimeline() {
  _tlPage = 1;
  updateTimelineView();
}

export function loadMoreTimeline() {
  _tlPage++;
  updateTimelineView();
}

export function updateTimelineView() {
  var list     = document.getElementById('tl-list');
  var countEl  = document.getElementById('tl-count');
  var moreBtn  = document.getElementById('tl-more');
  if (!list) return;

  var s      = window.getState ? window.getState() : (window.state || {});
  var search = ((document.getElementById('tl-search') || {}).value || '').trim().toLowerCase();
  var filter = (document.getElementById('tl-filter') || {}).value || 'all';

  var flareDates = {};
  if (typeof window.detectFlareups === 'function') {
    window.detectFlareups(s.records || []).forEach(function(f) {
      flareDates[new Date(f.date).toDateString()] = f;
    });
  }

  var filtered = (s.records || []).filter(function(r) {
    if (search) {
      var haystack = (
        (r.symptoms || []).join(' ') + ' ' +
        (r.factors || []).join(' ') + ' ' +
        (r.note || '') + ' ' +
        (r.bowel || '') + ' ' +
        (r.menstrualCycle || '') + ' ' +
        (r.medication || []).join(' ')
      ).toLowerCase();
      if (haystack.indexOf(search) === -1) return false;
    }
    var ds = new Date(r.record_date || r.date).toDateString();
    if (filter === 'pain')        return r.painLevel && r.painLevel > 0;
    if (filter === 'flare')       return !!flareDates[ds];
    if (filter === 'period')      return r.menstrualCycle && r.menstrualCycle !== 'なし';
    if (filter === 'high-energy') return r.energy && r.energy >= 4;
    if (filter === 'low-energy')  return r.energy && r.energy <= 2;
    return true;
  });

  filtered.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
  if (countEl) countEl.textContent = filtered.length + '件';

  var show = filtered.slice(0, _tlPage * _tlPerPage);
  if (moreBtn) moreBtn.style.display = show.length < filtered.length ? 'block' : 'none';

  if (show.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:30px 0;color:var(--ink-light);font-size:12px;">'
      + (search || filter !== 'all' ? '条件に一致する記録がありません' : 'まだ記録がありません') + '</div>';
    return;
  }

  var html = '';
  show.forEach(function(r) {
    var d = new Date(r.date);
    var ds = d.toDateString();
    var dateStr = (d.getMonth() + 1) + '/' + d.getDate() + '（' + ['日', '月', '火', '水', '木', '金', '土'][d.getDay()] + '）';
    var isFlare = !!flareDates[ds];

    html += '<div style="background:var(--white);border-radius:14px;padding:14px;margin-bottom:8px;box-shadow:0 1px 4px var(--shadow);' + (isFlare ? 'border-left:3px solid var(--rose);' : '') + 'cursor:pointer;" onclick="if(typeof window.editPastRecord===\'function\')window.editPastRecord(\'' + r.date + '\')">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">';
    html += '<div style="font-size:13px;font-weight:500;color:var(--ink);">' + dateStr + '</div>';
    html += '<div style="display:flex;gap:4px;">';
    if (r.wellnessScore !== undefined) html += '<span style="font-size:9px;padding:2px 6px;border-radius:6px;background:' + (r.wellnessScore >= 70 ? '#e8f4ec' : r.wellnessScore >= 40 ? 'var(--warm-light)' : '#fde8e8') + ';color:' + (r.wellnessScore >= 70 ? '#4a7c5c' : r.wellnessScore >= 40 ? '#a07840' : '#c4878c') + ';">WS:' + r.wellnessScore + '</span>';
    if (r.energy) html += '<span style="font-size:9px;padding:2px 6px;border-radius:6px;background:#e8f4ec;color:#4a7c5c;">⚡' + r.energy + '</span>';
    if (isFlare)  html += '<span style="font-size:9px;padding:2px 6px;border-radius:6px;background:#fde8e8;color:var(--rose);">🔥</span>';
    if (r.menstrualCycle && r.menstrualCycle !== 'なし') html += '<span style="font-size:9px;padding:2px 6px;border-radius:6px;background:var(--rose-pale);color:var(--rose);">🌸' + r.menstrualCycle + '</span>';
    html += '</div></div>';

    var tags = [];
    if (r.symptoms && r.symptoms.length)   tags = tags.concat(r.symptoms.slice(0, 4));
    if (r.painLevel && r.painLevel > 0)     tags.push('痛み' + r.painLevel + '/10');
    if (r.sleepHours)                       tags.push('😴' + r.sleepHours + 'h');
    if (r.bowel)                            tags.push('🫧' + r.bowel);
    if (r.factors && r.factors.length)      tags = tags.concat(r.factors.slice(0, 3).map(function(f) { return '📋' + f; }));
    if (r.medication && r.medication.length) tags.push('💊' + r.medication.join('・'));

    if (tags.length > 0) {
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
      tags.forEach(function(t) { html += '<span style="font-size:9px;background:var(--cream);color:var(--ink-mid);padding:2px 7px;border-radius:6px;">' + t + '</span>'; });
      html += '</div>';
    }
    if (r.note) {
      html += '<div style="font-size:10px;color:var(--ink-light);margin-top:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">📝 ' + r.note.substring(0, 50) + '</div>';
    }
    html += '</div>';
  });

  if (_tlPage === 1) { list.innerHTML = html; }
  else               { list.innerHTML += html; }
}

window.renderTimeline    = renderTimeline;
window.loadMoreTimeline  = loadMoreTimeline;
window.updateTimelineView = updateTimelineView;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('timeline-module-loaded');
}

export {};
