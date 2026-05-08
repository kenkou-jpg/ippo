// ============================================================
// ippo – persistence-execution-readiness.js
//
// record persistence execution readiness preparation layer.
//
// observe-only.
// ============================================================

const EXECUTION_READINESS_KEY = '__ippoPersistenceExecutionReadiness';

const EXECUTION_REQUIREMENTS = [
  {
    name: 'record-save-context',
    apis: [
      'createRecordSaveContext',
      'prepareRecordUpsert',
      'persistRecordState',
      'finalizeRecordSaveContext',
    ],
  },
  {
    name: 'record-sync-execution',
    apis: [
      'syncRecordCloud',
      'cloudBackupAll',
      'syncFromCloud',
    ],
  },
  {
    name: 'record-save-verification',
    apis: [
      'ippoVerifyLastRecordSave',
      'ippoRecordSaveResultSummary',
    ],
  },
  {
    name: 'state-persistence-execution',
    apis: [
      'saveState',
      'loadState',
    ],
  },
];

function nowIso() {
  try {
    return new Date().toISOString();
  } catch (_) {
    return null;
  }
}

function getState() {
  if (!window[EXECUTION_READINESS_KEY]) {
    window[EXECUTION_READINESS_KEY] = {
      loadedAt: nowIso(),
      mode: 'observe-only',
      persistenceExecutionMoved: false,
      checks: [],
    };
  }

  return window[EXECUTION_READINESS_KEY];
}

function inspectRequirement(requirement) {
  const apis = {};

  requirement.apis.forEach((name) => {
    apis[name] = typeof window[name] === 'function';
  });

  const missingApis = Object.keys(apis).filter((key) => !apis[key]);

  return {
    name: requirement.name,
    apis,
    missingApis,
    ready: missingApis.length === 0,
  };
}

function summarizePersistenceExecutionReadiness() {
  const state = getState();
  const requirements = EXECUTION_REQUIREMENTS.map(inspectRequirement);
  const notReady = requirements.filter((item) => !item.ready);

  const persistenceBoundary = typeof window.ippoPersistenceBoundaryPrepSummary === 'function'
    ? window.ippoPersistenceBoundaryPrepSummary()
    : null;

  return {
    loadedAt: state.loadedAt,
    checkedAt: nowIso(),
    mode: state.mode,
    persistenceExecutionMoved: !!state.persistenceExecutionMoved,
    requirements,
    notReadyRequirements: notReady.map((item) => item.name),
    allRequirementsReady: notReady.length === 0,
    persistenceBoundaryReady: !!persistenceBoundary,
    safeForPersistenceExecutionPlanning: !!(
      persistenceBoundary &&
      persistenceBoundary.safeForPersistenceBoundaryPlanning &&
      notReady.length === 0
    ),
    checks: state.checks.slice(-40),
  };
}

function runPersistenceExecutionReadinessCheck(reason) {
  const state = getState();
  const summary = summarizePersistenceExecutionReadiness();

  state.checks.push({
    reason: reason || 'manual',
    at: nowIso(),
    allRequirementsReady: summary.allRequirementsReady,
    safeForPersistenceExecutionPlanning: summary.safeForPersistenceExecutionPlanning,
    notReadyRequirements: summary.notReadyRequirements,
  });

  if (state.checks.length > 60) {
    state.checks.splice(0, state.checks.length - 60);
  }

  if (typeof window.ippoMarkBootEvent === 'function') {
    window.ippoMarkBootEvent('persistence-execution-readiness-check', {
      reason: reason || 'manual',
      allRequirementsReady: summary.allRequirementsReady,
      safeForPersistenceExecutionPlanning: summary.safeForPersistenceExecutionPlanning,
      notReadyRequirements: summary.notReadyRequirements,
    });
  }

  return summarizePersistenceExecutionReadiness();
}

window.ippoPersistenceExecutionReadinessSummary = summarizePersistenceExecutionReadiness;
window.ippoRunPersistenceExecutionReadinessCheck = runPersistenceExecutionReadinessCheck;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    runPersistenceExecutionReadinessCheck('dom-content-loaded');
  }, { once: true });
} else {
  window.setTimeout(() => {
    runPersistenceExecutionReadinessCheck('module-loaded-after-dom');
  }, 0);
}

if (typeof window.ippoMarkBootEvent === 'function') {
  window.ippoMarkBootEvent('persistence-execution-readiness-loaded');
}

export {
  EXECUTION_REQUIREMENTS,
  summarizePersistenceExecutionReadiness,
  runPersistenceExecutionReadinessCheck,
};
