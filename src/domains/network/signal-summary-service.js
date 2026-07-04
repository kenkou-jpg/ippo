// signal-summary-service.js — Wave1 Signal Summary (PR-031)
// Responsible for: symptomCount / painAverage / sleepAverage /
//                  exposureCount / menstrualRecords / latestSignals
// No Similarity, DiseaseCluster, AI, DB, Supabase.
// Output: plain JSON object only.

import { SIGNAL_TYPES } from './network-signal-types.js';

/**
 * @typedef {{
 *   symptomCount:      number,
 *   painAverage:       number,
 *   sleepAverage:      number,
 *   exposureCount:     number,
 *   menstrualRecords:  number,
 *   emotionCount:      number,
 *   latestSignals:     Record<string, import('./network-signal-entity.js').NetworkSignal | null>,
 *   totalSignals:      number,
 *   generatedAt:       string,
 * }} SignalSummary
 */

/** Filter signals by type. */
function _byType(signals, type) {
  return signals.filter(s => s?.signalType === type);
}

/** Average of normalizedValue in an array. */
function _avg(signals) {
  if (!signals.length) return 0;
  const sum = signals.reduce((s, sig) => s + (sig.normalizedValue ?? 0), 0);
  return Math.round((sum / signals.length) * 1000) / 1000;
}

/** Most recent signal in an array (by timestamp). */
function _latest(signals) {
  if (!signals.length) return null;
  return signals.reduce((best, s) => {
    if (!best) return s;
    return (s.timestamp ?? '') > (best.timestamp ?? '') ? s : best;
  }, null);
}

export class SignalSummaryService {
  /**
   * Generate a Wave1 summary from a flat NetworkSignal array.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @returns {SignalSummary}
   */
  summarize(signals) {
    const all = Array.isArray(signals) ? signals.filter(Boolean) : [];

    const symptomSignals   = _byType(all, SIGNAL_TYPES.SYMPTOM);
    const painSignals      = _byType(all, SIGNAL_TYPES.PAIN);
    const sleepSignals     = _byType(all, SIGNAL_TYPES.SLEEP);
    const exposureSignals  = _byType(all, SIGNAL_TYPES.EXPOSURE);
    const menstrualSignals = _byType(all, SIGNAL_TYPES.MENSTRUAL);
    const emotionSignals   = _byType(all, SIGNAL_TYPES.EMOTION);

    const latestSignals = {
      [SIGNAL_TYPES.SYMPTOM]:   _latest(symptomSignals),
      [SIGNAL_TYPES.PAIN]:      _latest(painSignals),
      [SIGNAL_TYPES.SLEEP]:     _latest(sleepSignals),
      [SIGNAL_TYPES.EXPOSURE]:  _latest(exposureSignals),
      [SIGNAL_TYPES.MENSTRUAL]: _latest(menstrualSignals),
      [SIGNAL_TYPES.EMOTION]:   _latest(emotionSignals),
    };

    return {
      symptomCount:     symptomSignals.length,
      painAverage:      _avg(painSignals),
      sleepAverage:     _avg(sleepSignals),
      exposureCount:    exposureSignals.length,
      menstrualRecords: menstrualSignals.length,
      emotionCount:     emotionSignals.length,
      latestSignals,
      totalSignals:     all.length,
      generatedAt:      new Date().toISOString(),
    };
  }

  /**
   * Summarize signals filtered to a specific recordId.
   * @param {import('./network-signal-entity.js').NetworkSignal[]} signals
   * @param {string} recordId
   * @returns {SignalSummary}
   */
  summarizeByRecord(signals, recordId) {
    const filtered = Array.isArray(signals)
      ? signals.filter(s => s?.recordId === recordId)
      : [];
    return this.summarize(filtered);
  }
}
