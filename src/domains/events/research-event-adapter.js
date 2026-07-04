// research-event-adapter.js — Research Dataset Event Adapter.
// Wave2 Stub — connects Event Sourcing to DATA_ASSET_COUNCIL Layer 7/8 (Research Asset).
// Wave2 Roadmap: DomainEvent → ResearchDatasetBuilder → anonymized export → AI input.
// BD-021: no deletion — research events are permanent audit assets.
// PR-037: Event Sourcing Foundation

export class ResearchEventAdapter {
  /**
   * Transform a DomainEvent stream into research-ready event records.
   * Wave2 Stub — returns minimal object with roadmap notes.
   * @param {Readonly<object>[]} events
   * @returns {object}
   */
  buildResearchEvents(events) {
    return Object.freeze({
      researchEvents: [],
      sourceEventCount: Array.isArray(events) ? events.length : 0,
      wave: 'Wave2 Stub — DomainEvent → ResearchDataset pipeline pending Wave2',
      layerTarget: 'DATA_ASSET_COUNCIL Layer 7 (Research Signal) / Layer 8 (Research Asset)',
      bd021Compliant: true,
    });
  }

  /**
   * Export anonymized research dataset from events.
   * Wave2 Stub.
   * @param {Readonly<object>[]} events
   * @param {object} [options]
   * @returns {object}
   */
  exportDataset(events, options = {}) {
    return Object.freeze({
      dataset:     [],
      exportedAt:  new Date().toISOString(),
      eventCount:  Array.isArray(events) ? events.length : 0,
      options:     Object.freeze({ ...options }),
      wave:        'Wave2 Stub — anonymization + IRB consent enforcement pending Wave2',
      bd021Compliant: true,
    });
  }

  /**
   * Build research metadata from events.
   * Wave2 Stub.
   * @param {Readonly<object>[]} events
   * @returns {object}
   */
  buildResearchMetadata(events) {
    const eventCount = Array.isArray(events) ? events.length : 0;
    const eventTypes = Array.isArray(events)
      ? [...new Set(events.map(e => e.eventType).filter(Boolean))]
      : [];

    return Object.freeze({
      eventCount,
      eventTypes:    Object.freeze(eventTypes),
      generatedAt:   new Date().toISOString(),
      schemaVersion: '1',
      wave:          'Wave2 Stub — metadata schema finalization pending Wave2',
      bd021Compliant: true,
    });
  }
}
