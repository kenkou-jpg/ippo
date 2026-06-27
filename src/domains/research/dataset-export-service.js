// dataset-export-service.js — Wave1 JSON/CSV export; PARQUET is Wave2 Stub.
// BD-018: generatedAt on all export metadata.
// BD-022: Wave1 in-memory only.
// PR-040: Research Dataset Foundation

import { EXPORT_FORMAT, DATASET_STATUS } from './research-dataset-types.js';
import { withStatus }                    from './research-dataset-entity.js';

export class DatasetExportService {

  /**
   * Export a dataset as a JSON string.
   * @param {Readonly<object>} dataset
   * @returns {{ format: string, data: string, metadata: Readonly<object> }}
   */
  exportJSON(dataset) {
    if (!dataset?.id) throw new Error('[DatasetExportService] dataset is required');

    const exported = withStatus(dataset, DATASET_STATUS.EXPORTED);
    const data     = JSON.stringify(exported, null, 2);

    return Object.freeze({
      format:   EXPORT_FORMAT.JSON,
      data,
      metadata: this.getExportMetadata(dataset, EXPORT_FORMAT.JSON),
    });
  }

  /**
   * Export a dataset as a CSV string (signals array).
   * Each signal row: id, signalType, normalizedValue, rawValue, unit, timestamp.
   * @param {Readonly<object>} dataset
   * @returns {{ format: string, data: string, metadata: Readonly<object> }}
   */
  exportCSV(dataset) {
    if (!dataset?.id) throw new Error('[DatasetExportService] dataset is required');

    const signals = dataset.signals ?? [];
    const header  = ['id', 'signalType', 'normalizedValue', 'rawValue', 'unit', 'timestamp'];
    const rows    = signals.map(s => header.map(col => {
      const val = s[col] ?? '';
      // Escape commas/quotes for CSV
      const str = String(val);
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str.replace(/"/g, '""')}"`
        : str;
    }).join(','));

    const data = [header.join(','), ...rows].join('\n');

    return Object.freeze({
      format:   EXPORT_FORMAT.CSV,
      data,
      metadata: this.getExportMetadata(dataset, EXPORT_FORMAT.CSV),
    });
  }

  /**
   * PARQUET export — Wave2 Stub.
   * @param {Readonly<object>} dataset
   * @returns {{ format: string, data: null, metadata: Readonly<object>, stub: true }}
   */
  exportPARQUET(dataset) {
    if (!dataset?.id) throw new Error('[DatasetExportService] dataset is required');
    return Object.freeze({
      format:   EXPORT_FORMAT.PARQUET,
      data:     null,
      stub:     true,
      wave:     'Wave2',
      metadata: this.getExportMetadata(dataset, EXPORT_FORMAT.PARQUET),
    });
  }

  /**
   * Return export metadata for a given dataset and format.
   * BD-018: includes generatedAt.
   * @param {Readonly<object>} dataset
   * @param {string} format
   * @returns {Readonly<object>}
   */
  getExportMetadata(dataset, format) {
    return Object.freeze({
      generatedAt:        new Date().toISOString(), // BD-018
      datasetId:          dataset.id,
      datasetVersion:     dataset.datasetVersion ?? '1.0.0',
      format,
      anonymizationLevel: dataset.anonymizationLevel,
      signalCount:        dataset.signalCount        ?? 0,
      diseaseCount:       dataset.diseaseCount       ?? 0,
      snapshotCount:      dataset.snapshotCount      ?? 0,
      eventCount:         dataset.eventCount         ?? 0,
    });
  }
}
