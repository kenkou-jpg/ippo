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

  it('does not wire the prototype submit handler to the real save pipeline', () => {
    const submitFn = jsSource.slice(jsSource.indexOf('function _protoSubmit'));
    const submitBody = submitFn.slice(0, submitFn.indexOf('\n}'));
    expect(submitBody).not.toMatch(/rtcSaveDelegate\(|_integrateWithExistingSave\(/);
    expect(submitBody).toContain('console.log');
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
