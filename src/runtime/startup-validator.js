// ============================================================
// ippo – src/runtime/startup-validator.js
// 起動フェーズの重複（duplicate init / duplicate hydration /
// duplicate render / startup race）を検知・警告する。
//
// 使い方:
//   window.ippoStartupValidator.markPhase('bootstrap');
//   // → 同名フェーズが 2回マークされたら警告
//
// 提供: window.ippoStartupValidator
// ============================================================

var _phases    = {};
var _duplicates = [];

function _ts() {
  try { return new Date().toISOString(); } catch (_) { return ''; }
}

// フェーズを記録する。重複時は false を返し警告を出す。
function markPhase(name, detail) {
  if (_phases[name]) {
    var dup = {
      name:     name,
      firstAt:  _phases[name].at,
      secondAt: _ts(),
      detail:   detail || null,
    };
    _duplicates.push(dup);

    console.warn('[ippo StartupValidator] DUPLICATE phase detected:', name, dup);

    if (typeof window.ippoMarkBootWarning === 'function') {
      window.ippoMarkBootWarning('duplicate-phase:' + name, dup);
    }
    if (typeof window.ippoHealthMonitor === 'object') {
      window.ippoHealthMonitor.logWarning('duplicate-init', { phase: name });
    }
    return false;
  }

  _phases[name] = { at: _ts(), detail: detail || null };

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('startup-phase:' + name);
  }
  return true;
}

function getPhases()     { return Object.assign({}, _phases); }
function getDuplicates() { return _duplicates.slice(); }
function hasDuplicates() { return _duplicates.length > 0; }

function getGraph() {
  return {
    phases: Object.keys(_phases).map(function (k) {
      return { name: k, at: _phases[k].at };
    }),
    duplicates:    _duplicates.slice(),
    hasDuplicates: _duplicates.length > 0,
  };
}

window.ippoStartupValidator = {
  markPhase:     markPhase,
  getPhases:     getPhases,
  getDuplicates: getDuplicates,
  hasDuplicates: hasDuplicates,
  getGraph:      getGraph,
};

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('startup-validator-loaded');
}

export { markPhase, getPhases, getDuplicates, hasDuplicates, getGraph };
