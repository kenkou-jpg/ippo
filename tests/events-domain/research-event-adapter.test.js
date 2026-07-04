// tests/events-domain/research-event-adapter.test.js
// ResearchEventAdapter — Wave2 Stub, PR-037
import { describe, it, expect } from 'vitest';
import { ResearchEventAdapter } from '../../src/domains/events/research-event-adapter.js';
import { buildDomainEvent }     from '../../src/domains/events/domain-event-entity.js';

const adapter = () => new ResearchEventAdapter();

function makeEvent() {
  return buildDomainEvent({
    eventType: 'SIGNAL_CREATED', aggregateType: 'SIGNAL',
    aggregateId: 'a1', payload: { x: 1 },
  });
}

describe('ResearchEventAdapter.buildResearchEvents()', () => {
  it('returns an object', () => {
    expect(typeof adapter().buildResearchEvents([])).toBe('object');
  });

  it('researchEvents is empty array (Wave2 Stub)', () => {
    expect(adapter().buildResearchEvents([makeEvent()]).researchEvents).toEqual([]);
  });

  it('sourceEventCount matches input length', () => {
    expect(adapter().buildResearchEvents([makeEvent(), makeEvent()]).sourceEventCount).toBe(2);
  });

  it('wave note mentions Wave2', () => {
    expect(adapter().buildResearchEvents([]).wave).toMatch(/Wave2/);
  });

  it('reports bd021Compliant: true', () => {
    expect(adapter().buildResearchEvents([]).bd021Compliant).toBe(true);
  });

  it('handles non-array gracefully', () => {
    expect(adapter().buildResearchEvents(null).sourceEventCount).toBe(0);
  });
});

describe('ResearchEventAdapter.exportDataset()', () => {
  it('returns frozen object', () => {
    expect(Object.isFrozen(adapter().exportDataset([]))).toBe(true);
  });

  it('dataset is empty array (Wave2 Stub)', () => {
    expect(adapter().exportDataset([makeEvent()]).dataset).toEqual([]);
  });

  it('eventCount matches input', () => {
    expect(adapter().exportDataset([makeEvent()]).eventCount).toBe(1);
  });

  it('has exportedAt timestamp', () => {
    expect(adapter().exportDataset([]).exportedAt).toMatch(/^\d{4}/);
  });

  it('wave note mentions Wave2', () => {
    expect(adapter().exportDataset([]).wave).toMatch(/Wave2/);
  });

  it('bd021Compliant: true', () => {
    expect(adapter().exportDataset([]).bd021Compliant).toBe(true);
  });
});

describe('ResearchEventAdapter.buildResearchMetadata()', () => {
  it('returns frozen object', () => {
    expect(Object.isFrozen(adapter().buildResearchMetadata([]))).toBe(true);
  });

  it('eventCount matches input', () => {
    expect(adapter().buildResearchMetadata([makeEvent()]).eventCount).toBe(1);
  });

  it('eventTypes is deduplicated array', () => {
    const events = [makeEvent(), makeEvent()];
    const m = adapter().buildResearchMetadata(events);
    expect(Array.isArray(m.eventTypes)).toBe(true);
    expect(m.eventTypes).toContain('SIGNAL_CREATED');
    expect(m.eventTypes.filter(t => t === 'SIGNAL_CREATED')).toHaveLength(1);
  });

  it('has generatedAt', () => {
    expect(adapter().buildResearchMetadata([]).generatedAt).toMatch(/^\d{4}/);
  });

  it('wave note mentions Wave2', () => {
    expect(adapter().buildResearchMetadata([]).wave).toMatch(/Wave2/);
  });

  it('bd021Compliant: true', () => {
    expect(adapter().buildResearchMetadata([]).bd021Compliant).toBe(true);
  });
});
