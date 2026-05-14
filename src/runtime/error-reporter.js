// ============================================================
// ippo – src/runtime/error-reporter.js
// health-monitor / boot-stability / startup-validator /
// rollback-manager / sync-consistency-checker を集約し
// 単一レポートを生成する。
//
// 使い方:
//   window.ippoReport()          // コンソールに全情報を出力
//   window.ippoErrorReporter.getReport()  // オブジェクト取得
//
// 提供: window.ippoErrorReporter, window.ippoReport
// ============================================================

function getReport() {
  var report = {
    generatedAt:    new Date().toISOString(),
    boot:           null,
    health:         null,
    startupGraph:   null,
    snapshots:      [],
    syncConsistency: null,
  };

  try {
    if (typeof window.ippoBootSummary === 'function') {
      report.boot = window.ippoBootSummary();
    }
  } catch (_) {}

  try {
    if (typeof window.ippoHealthMonitor === 'object') {
      report.health = window.ippoHealthMonitor.getHealth();
    }
  } catch (_) {}

  try {
    if (typeof window.ippoStartupValidator === 'object') {
      report.startupGraph = window.ippoStartupValidator.getGraph();
    }
  } catch (_) {}

  try {
    if (typeof window.ippoRollbackManager === 'object') {
      report.snapshots = window.ippoRollbackManager.getSnapshots().map(function (s) {
        return { label: s.label, at: s.at, recordCount: s.recordCount };
      });
    }
  } catch (_) {}

  try {
    if (typeof window.ippoSyncConsistencyChecker === 'object') {
      report.syncConsistency = window.ippoSyncConsistencyChecker.check();
    }
  } catch (_) {}

  return report;
}

function printReport() {
  var report = getReport();
  console.group('[ippo ErrorReporter] === Runtime Report ===');
  console.log('Generated:', report.generatedAt);

  if (report.health) {
    var h = report.health;
    console.log('Errors:', h.errorCount, '| Warnings:', h.warningCount,
                '| Renders:', h.metrics.renderCount, '| Saves:', h.metrics.saveCount,
                '| RecordDropEvents:', h.metrics.recordDropEvents);
    if (h.recentErrors.length > 0) {
      console.warn('Recent errors:', h.recentErrors);
    }
  }

  if (report.startupGraph) {
    var g = report.startupGraph;
    console.log('Startup phases:', g.phases.length, g.hasDuplicates ? '⚠ DUPLICATES DETECTED' : '(clean)');
    if (g.hasDuplicates) console.warn('Duplicates:', g.duplicates);
  }

  if (report.syncConsistency) {
    var sc = report.syncConsistency;
    if (!sc.ok) console.warn('Sync issues:', sc.issues);
    else        console.log('Sync: OK');
  }

  if (report.snapshots.length > 0) {
    console.log('Snapshots:', report.snapshots.map(function (s) {
      return s.label + '(' + s.recordCount + ')@' + s.at.slice(11, 19);
    }).join(', '));
  }

  console.groupEnd();
  return report;
}

window.ippoErrorReporter = {
  getReport:   getReport,
  printReport: printReport,
};

// コンソールから手軽に呼べるショートカット
window.ippoReport = printReport;

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('error-reporter-loaded');
}

export { getReport, printReport };
