// tests/research/event-research.test.js
// RESEARCH_DATASET_CREATED event integration — PR-040
import { describe, it, expect } from 'vitest';
import { DOMAIN_EVENT_TYPES, DOMAIN_EVENT_TYPE_SET, AGGREGATE_TYPES } from '../../src/domains/events/domain-event-types.js';
import { ResearchDatasetService }    from '../../src/domains/research/research-dataset-service.js';
import { ResearchDatasetRepository } from '../../src/domains/research/research-dataset-repository.js';
import { ResearchDatasetBuilder }    from '../../src/domains/research/research-dataset-builder.js';
import { EventStore }    from '../../src/domains/events/event-store.js';
import { EventBus }      from '../../src/domains/events/event-bus.js';
import { EventPublisher } from '../../src/domains/events/event-publisher.js';

describe('DOMAIN_EVENT_TYPES includes RESEARCH_DATASET_CREATED', () => {
  it('exists in DOMAIN_EVENT_TYPES', () => {
    expect(DOMAIN_EVENT_TYPES).toHaveProperty('RESEARCH_DATASET_CREATED', 'RESEARCH_DATASET_CREATED');
  });

  it('is included in DOMAIN_EVENT_TYPE_SET', () => {
    expect(DOMAIN_EVENT_TYPE_SET.has('RESEARCH_DATASET_CREATED')).toBe(true);
  });
});

describe('AGGREGATE_TYPES includes RESEARCH', () => {
  it('exists', () => {
    expect(AGGREGATE_TYPES).toHaveProperty('RESEARCH', 'RESEARCH');
  });
});

describe('EventStore stores RESEARCH_DATASET_CREATED', () => {
  it('published event is replayable (BD-015)', () => {
    const store     = new EventStore();
    const bus       = new EventBus();
    const publisher = new EventPublisher({ store, bus });

    const repo    = new ResearchDatasetRepository();
    const builder = new ResearchDatasetBuilder();
    const svc     = new ResearchDatasetService({ repository: repo, builder, eventPublisher: publisher });

    svc.createDataset();

    const events = store.getEvents();
    const researchEvents = events.filter(e => e.eventType === 'RESEARCH_DATASET_CREATED');
    expect(researchEvents).toHaveLength(1);
    expect(researchEvents[0].aggregateType).toBe('RESEARCH');
    expect(researchEvents[0].occurredAt).toBeTruthy();
  });

  it('event payload includes required fields', () => {
    const store     = new EventStore();
    const bus       = new EventBus();
    const publisher = new EventPublisher({ store, bus });

    const repo    = new ResearchDatasetRepository();
    const builder = new ResearchDatasetBuilder();
    const svc     = new ResearchDatasetService({ repository: repo, builder, eventPublisher: publisher });

    svc.createDataset();

    const events = store.getByType('RESEARCH_DATASET_CREATED');
    expect(events[0].payload.datasetId).toBeTruthy();
    expect(events[0].payload.generatedAt).toBeTruthy();
    expect(typeof events[0].payload.signalCount).toBe('number');
  });
});
