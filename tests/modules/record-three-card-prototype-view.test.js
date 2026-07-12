import { readFileSync } from 'fs';
import { resolve } from 'path';

const jsSource = readFileSync(
  resolve(__dirname, '../../src/modules/record-three-card.js'),
  'utf8',
);
const htmlSource = readFileSync(
  resolve(__dirname, '../../src/screens/record-three-card.html'),
  'utf8',
);

describe('record-three-card — PR-REC-03a prototype view (Founder Decision fixes)', () => {
  it('hides the legacy rtc-header via a class selector, not getElementById', () => {
    expect(jsSource).toContain("document.querySelector('.rtc-header')");
    expect(jsSource).not.toMatch(/getElementById\(\s*\[?['"]rtc-header['"]/);
  });

  it('renders the Prototype screen title inside #rtc-proto-view', () => {
    const viewStart = htmlSource.indexOf('id="rtc-proto-view"');
    expect(viewStart).toBeGreaterThan(-1);
    const viewSnippet = htmlSource.slice(viewStart, viewStart + 400);
    expect(viewSnippet).toContain('<h1>記録する</h1>');
    expect(viewSnippet).toContain('10秒で今日の実験ログをつける');
  });

  it('feature flag defaults to off (query param or localStorage opt-in only)', () => {
    expect(jsSource).toContain("params.get('recordUI') === 'prototype'");
    expect(jsSource).toContain("localStorage.getItem('ippo_record_ui_v2') === '1'");
  });

  it('marks the new window bridges as a temporary migration bridge, not a permanent API', () => {
    const exportsBlock = jsSource.slice(jsSource.indexOf('window.isPrototypeRecordUIEnabled'));
    const precedingComment = jsSource.slice(
      jsSource.lastIndexOf('// Temporary migration bridge'),
      jsSource.indexOf('window.isPrototypeRecordUIEnabled'),
    );
    expect(precedingComment).toContain('Removal candidate');
    expect(exportsBlock).toContain('window._rtcProtoSubmit');
  });
});

describe('record-three-card — PR-REC-03a markup: data-value restoration (PR-REC-03b prerequisite)', () => {
  it('every mood/sleep/skin/menstrualCycle/bloodClot/bloodColor/bowel chip in #rtc-proto-view carries data-value', () => {
    const viewStart = htmlSource.indexOf('id="rtc-proto-view"');
    const viewEnd = htmlSource.indexOf('id="btn-submit-record"');
    const view = htmlSource.slice(viewStart, viewEnd);
    const fields = ['mood', 'sleep', 'skin', 'menstrualCycle', 'bloodClot', 'bloodColor', 'bowel'];
    fields.forEach((field) => {
      const fieldStart = view.indexOf(`data-field="${field}"`);
      expect(fieldStart, `data-field="${field}" not found`).toBeGreaterThan(-1);
      const groupEnd = view.indexOf('</div>', fieldStart);
      const group = view.slice(fieldStart, groupEnd);
      const buttonCount = (group.match(/<button/g) || []).length;
      const dataValueCount = (group.match(/data-value="/g) || []).length;
      expect(dataValueCount, `${field}: expected every button to carry data-value`).toBe(buttonCount);
    });
  });

  it('tags keep data-tag (unaffected by the data-value restoration)', () => {
    expect(htmlSource).toContain('data-tag="caffeine"');
    expect(htmlSource).toContain('data-tag="dairy"');
  });
});

describe('record-three-card — PR-REC-03b: DOM → Payload → legacy Adapter → save pipeline', () => {
  let container;

  beforeEach(async () => {
    vi.resetModules();
    document.body.innerHTML = htmlSource
      .replace(/<style>[\s\S]*?<\/style>/, '') // strip the scoped <style> block, irrelevant to DOM reads
      .replace(/<script[\s\S]*?<\/script>/g, '');
    await import('../../src/modules/record-three-card.js');
    container = document.getElementById('rtc-proto-view');
  });

  function selectChip(fieldSelector, dataValue) {
    const group = container.querySelector(`[data-field="${fieldSelector}"]`);
    const btn = group.querySelector(`button[data-value="${dataValue}"]`);
    window._rtcProtoSelect(btn);
    return btn;
  }

  function toggleTag(tag) {
    const btn = container.querySelector(`#rtc-proto-tag-grid button[data-tag="${tag}"]`);
    window._rtcProtoToggleTag(btn);
    return btn;
  }

  it('gathers mood/sleep/skin from data-value, never from button text or emoji', () => {
    selectChip('mood', '5');
    selectChip('sleep', 'long');
    selectChip('skin', 'rough');
    toggleTag('caffeine');

    window.rtcSaveDelegate = vi.fn();
    window._rtcProtoSubmit();

    expect(window.rtcSaveDelegate).toHaveBeenCalledTimes(1);
    const record = window.rtcSaveDelegate.mock.calls[0][0];
    expect(record.mood).toBe(5);
    expect(record.sleepQuality).toBe(4); // long → PROTO_SLEEP_QUALITY_MAP
    expect(record.symptoms).toEqual(['肌荒れ']); // skin=rough only
    expect(record.factors).toEqual(['カフェイン']);
  });

  it('uses record_date in snake_case so the immediate Supabase sync branch can fire', () => {
    window.rtcSaveDelegate = vi.fn();
    window._rtcProtoSubmit();
    const record = window.rtcSaveDelegate.mock.calls[0][0];
    const today = new Date().toISOString().split('T')[0];
    expect(record.record_date).toBe(today);
  });

  it('does not include skin_roughness symptom when skin is normal or good', () => {
    selectChip('skin', 'good');
    window.rtcSaveDelegate = vi.fn();
    window._rtcProtoSubmit();
    expect(window.rtcSaveDelegate.mock.calls[0][0].symptoms).toEqual([]);
  });

  it('gathers optionalDetails (painLevel/menstrualCycle/bloodClot/bloodColor/temperature/bowel/medication) without dropping any', () => {
    document.getElementById('rtc-proto-pain-level').value = '6';
    selectChip('menstrualCycle', 'luteal');
    selectChip('bloodClot', 'large');
    selectChip('bloodColor', 'brown');
    document.getElementById('rtc-proto-temperature').value = '37.2';
    selectChip('bowel', 'diarrhea');
    document.getElementById('rtc-proto-medication').value = 'イブプロフェン';

    window.rtcSaveDelegate = vi.fn();
    window._rtcProtoSubmit();
    const record = window.rtcSaveDelegate.mock.calls[0][0];

    expect(record.painLevel).toBe(6);
    expect(record.cycle).toBe('黄体期');
    expect(record.bloodClot).toEqual(['多い']);
    expect(record.bloodColor).toEqual(['茶色']);
    expect(record.temp).toBe(37.2);
    expect(record.bowel).toBe('下痢');
    expect(record.medication).toEqual(['イブプロフェン']);
  });

  it('marks the save as a completed daily check-in so Home/streak logic recognizes it', () => {
    window.rtcSaveDelegate = vi.fn();
    window._rtcProtoSubmit();
    const record = window.rtcSaveDelegate.mock.calls[0][0];
    expect(record.meta.uiFlow).toBe('daily-checkin');
    expect(record.meta.checkinSnapshot).toBeTruthy();
  });

  it('reserves experiment_id as null (no legacy user_records column consumes it yet)', () => {
    window.rtcSaveDelegate = vi.fn();
    window._rtcProtoSubmit();
    expect(window.rtcSaveDelegate.mock.calls[0][0].experiment_id).toBeNull();
  });

  it('shows the existing success feedback (#rtc-success) and hides the prototype view after submit', () => {
    window.rtcSaveDelegate = vi.fn();
    window._rtcProtoSubmit();
    expect(container.hidden).toBe(true);
    expect(document.getElementById('rtc-success').classList.contains('active')).toBe(true);
  });

  it('aborts without calling the save pipeline if #rtc-proto-view is missing from the DOM', () => {
    document.getElementById('rtc-proto-view').remove();
    window.rtcSaveDelegate = vi.fn();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    window._rtcProtoSubmit();
    expect(window.rtcSaveDelegate).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
