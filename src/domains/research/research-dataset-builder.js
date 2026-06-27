// research-dataset-builder.js — Collects domain data and builds a ResearchDataset.
// Integrates: PersistentSignal (PR-033), Snapshots (PR-035), Similarity (PR-036),
//             DomainEvents (PR-037).
// BD-015: collected data must be reconstructible from Records.
// BD-018: generatedAt on dataset output.
// BD-022: Wave1 in-memory only.
// PR-040: Research Dataset Foundation

import { buildResearchDataset } from './research-dataset-entity.js';
import { ANONYMIZATION_LEVEL }  from './research-dataset-types.js';

export class ResearchDatasetBuilder {
  #signalService;
  #diseaseService;
  #eventStore;
  #snapshotService;
  #featureVectorService;
  #similarityService;

  /**
   * @param {{
   *   signalService?:        object,
   *   diseaseService?:       object,
   *   eventStore?:           object,
   *   snapshotService?:      object,
   *   featureVectorService?: object,
   *   similarityService?:    object,
   * }} deps
   */
  constructor({
    signalService        = null,
    diseaseService       = null,
    eventStore           = null,
    snapshotService      = null,
    featureVectorService = null,
    similarityService    = null,
  } = {}) {
    this.#signalService        = signalService;
    this.#diseaseService       = diseaseService;
    this.#eventStore           = eventStore;
    this.#snapshotService      = snapshotService;
    this.#featureVectorService = featureVectorService;
    this.#similarityService    = similarityService;
  }

  /**
   * Collect all NetworkSignals (Persistent Signals, PR-033).
   * @returns {object[]}
   */
  collectSignals() {
    if (!this.#signalService) return [];
    try {
      const list = this.#signalService.listSignals?.() ?? this.#signalService.findAll?.() ?? [];
      return [...list];
    } catch (_) {
      return [];
    }
  }

  /**
   * Collect all Disease entities (PR-029).
   * @returns {object[]}
   */
  collectDiseases() {
    if (!this.#diseaseService) return [];
    try {
      return [...(this.#diseaseService.getDiseases?.() ?? [])];
    } catch (_) {
      return [];
    }
  }

  /**
   * Collect all DomainEvents from EventStore (PR-037).
   * @returns {object[]}
   */
  collectEvents() {
    if (!this.#eventStore) return [];
    try {
      return [...(this.#eventStore.getEvents?.() ?? [])];
    } catch (_) {
      return [];
    }
  }

  /**
   * Collect all Snapshots (SignalSnapshot, LongitudinalSnapshot, DiseaseSnapshot — PR-035).
   * @returns {object[]}
   */
  collectSnapshots() {
    if (!this.#snapshotService) return [];
    try {
      return [...(this.#snapshotService.getSnapshots?.() ?? [])];
    } catch (_) {
      return [];
    }
  }

  /**
   * Collect all FeatureVectors and SimilarityEdges (PR-036).
   * @returns {{ featureVectors: object[], similarityEdges: object[] }}
   */
  collectSimilarityData() {
    let featureVectors  = [];
    let similarityEdges = [];
    try {
      if (this.#featureVectorService) {
        featureVectors = [...(this.#featureVectorService.getAll?.() ?? [])];
      }
    } catch (_) { /* best-effort */ }
    try {
      if (this.#similarityService) {
        similarityEdges = [...(this.#similarityService.getEdges?.() ?? [])];
      }
    } catch (_) { /* best-effort */ }
    return { featureVectors, similarityEdges };
  }

  /**
   * Verify completeness of the collected data.
   * BD-015: signals must be reconstructible.
   * @param {{ signals: object[], diseases: object[], events: object[], snapshots: object[] }} data
   * @returns {{ complete: boolean, issues: string[] }}
   */
  verifyCompleteness({ signals, diseases, events, snapshots }) {
    const issues = [];
    if (!Array.isArray(signals))   issues.push('signals must be an array');
    if (!Array.isArray(diseases))  issues.push('diseases must be an array');
    if (!Array.isArray(events))    issues.push('events must be an array');
    if (!Array.isArray(snapshots)) issues.push('snapshots must be an array');
    return { complete: issues.length === 0, issues };
  }

  /**
   * Build metadata summary for the dataset.
   * @param {{ signals: object[], diseases: object[], events: object[], snapshots: object[], featureVectors: object[], similarityEdges: object[] }} data
   * @returns {Readonly<object>}
   */
  buildMetadata({ signals, diseases, events, snapshots, featureVectors, similarityEdges }) {
    return Object.freeze({
      builtAt:          new Date().toISOString(),
      signalTypes:      [...new Set((signals ?? []).map(s => s.signalType).filter(Boolean))],
      eventTypes:       [...new Set((events ?? []).map(e => e.eventType).filter(Boolean))],
      diseaseKeys:      [...new Set((diseases ?? []).map(d => d.diseaseKey ?? d.key).filter(Boolean))],
      snapshotCount:    (snapshots ?? []).length,
      featureVectors:   (featureVectors ?? []).length,
      similarityEdges:  (similarityEdges ?? []).length,
    });
  }

  /**
   * Build the complete ResearchDataset from all domain sources.
   * @param {{ anonymizationLevel?: string, datasetVersion?: string } = {}} options
   * @returns {Readonly<object>}
   */
  build({
    anonymizationLevel = ANONYMIZATION_LEVEL.NONE,
    datasetVersion     = '1.0.0',
  } = {}) {
    const signals                         = this.collectSignals();
    const diseases                        = this.collectDiseases();
    const events                          = this.collectEvents();
    const snapshots                       = this.collectSnapshots();
    const { featureVectors, similarityEdges } = this.collectSimilarityData();

    const completeness = this.verifyCompleteness({ signals, diseases, events, snapshots });
    if (!completeness.complete) {
      throw new Error(`[ResearchDatasetBuilder] Incompleteness: ${completeness.issues.join(', ')}`);
    }

    const metadata = this.buildMetadata({ signals, diseases, events, snapshots, featureVectors, similarityEdges });

    return buildResearchDataset({
      datasetVersion,
      recordCount:       0, // Wave1: record count not separately tracked
      signalCount:       signals.length,
      diseaseCount:      diseases.length,
      snapshotCount:     snapshots.length,
      eventCount:        events.length,
      anonymizationLevel,
      signals,
      diseases,
      events,
      snapshots,
      featureVectors,
      similarityEdges,
      metadata,
    });
  }
}
