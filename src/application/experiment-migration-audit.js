// Experiment Migration Audit — tracks Repository route rate vs. legacy direct access.
// KPI: Repository Route Rate ≥ 80% (PR-015 target).
// console.warn only — no throws, no side-effects.

let _repositoryRoutes = 0;   // calls via ExperimentQueryService / ExperimentCommandService
let _legacyAccesses   = 0;   // calls still going through state.experiments / localStorage directly
let _storageDirectAccesses = 0; // localStorage direct reads/writes for experiment data

// ── Tracking API ─────────────────────────────────────────────────────────────

/** Called by ExperimentQueryService / ExperimentCommandService on each operation. */
export function trackRepositoryRoute(operation = 'unknown') {
  _repositoryRoutes++;
}

/** Called from legacy experiment access sites (app-legacy.js handlers etc.). */
export function trackLegacyAccess(site = 'unknown') {
  _legacyAccesses++;
  if (_legacyAccesses % 5 === 1) {
    console.warn(
      `[ExperimentMigrationAudit] Legacy experiment access at "${site}". ` +
      `Migrate to ExperimentQueryService / ExperimentCommandService. ` +
      `Legacy accesses: ${_legacyAccesses}`
    );
  }
}

/** Called when experiment data is read/written via localStorage directly (bypassing adapter). */
export function trackStorageDirectAccess(site = 'unknown') {
  _storageDirectAccesses++;
  if (_storageDirectAccesses % 5 === 1) {
    console.warn(
      `[ExperimentMigrationAudit] Direct storage access for experiment at "${site}". ` +
      `Use IStorageService via ExperimentRepository. Direct accesses: ${_storageDirectAccesses}`
    );
  }
}

// ── Metrics ──────────────────────────────────────────────────────────────────

/**
 * @returns {{
 *   repositoryRoutes: number,
 *   legacyAccesses:   number,
 *   storageDirectAccesses: number,
 *   routeRate:        number|null,
 * }}
 */
export function getMetrics() {
  const total     = _repositoryRoutes + _legacyAccesses;
  const routeRate = total > 0 ? _repositoryRoutes / total : null;
  return {
    repositoryRoutes:      _repositoryRoutes,
    legacyAccesses:        _legacyAccesses,
    storageDirectAccesses: _storageDirectAccesses,
    routeRate,
  };
}

/** Print current audit state to console. */
export function printAudit() {
  const m = getMetrics();
  const ratePct = m.routeRate != null ? `${(m.routeRate * 100).toFixed(1)}%` : 'n/a';
  console.warn(
    `[ExperimentMigrationAudit]\n` +
    `  Repository route rate: ${ratePct}  (target ≥ 80%)\n` +
    `  Repository routes: ${m.repositoryRoutes}\n` +
    `  Legacy accesses:   ${m.legacyAccesses}\n` +
    `  Storage direct:    ${m.storageDirectAccesses}`
  );
  if (m.routeRate != null && m.routeRate < 0.8) {
    console.warn(`[ExperimentMigrationAudit] WARNING: route rate below 80% target.`);
  }
}

/** Reset all counters (used in tests). */
export function resetAudit() {
  _repositoryRoutes      = 0;
  _legacyAccesses        = 0;
  _storageDirectAccesses = 0;
}
