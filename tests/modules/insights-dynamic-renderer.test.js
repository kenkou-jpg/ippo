// tests/modules/insights-dynamic-renderer.test.js
// Insights Phase現状確認で発見: insights-dynamic-renderer.js冒頭コメントは
// 「禁止語」を申し合わせとして記載していたが、forbidden-word-validator.js
// (BD-038 SSOT)への実行時接続がなかった。_signalText/_recentChangeText/
// 主insightカードの表示経路へ検証を追加した分の単体テスト。
import { describe, it, expect } from 'vitest';
import { _signalText, _recentChangeText, _safeText } from '../../src/modules/insights-dynamic-renderer.js';

describe('_safeText (BD-038 forbidden-word-validator接続)', () => {
  it('禁止パターンを含まないテキストはそのまま返す', () => {
    expect(_safeText('最近は、睡眠に痛みが増える傾向があります')).toBe('最近は、睡眠に痛みが増える傾向があります');
  });

  it('禁止パターンを含むテキストはnullを返す', () => {
    expect(_safeText('今すぐ病院へ行ってください')).toBeNull();
    expect(_safeText('このサプリを飲んでください')).toBeNull();
  });

  it('null/空文字はそのままnullを返す', () => {
    expect(_safeText(null)).toBeNull();
    expect(_safeText('')).toBeNull();
  });
});

describe('_signalText', () => {
  it('既知のsignal idはテンプレート文を返す', () => {
    const text = _signalText({ id: 'sleepPainCorrelation', trigger: '睡眠不足', symptom: '痛み' });
    expect(text).toBe('最近は、睡眠不足に痛みが増える傾向があります');
  });

  it('未知のsignal idはnullを返す', () => {
    expect(_signalText({ id: 'unknownSignal' })).toBeNull();
  });

  it('sig自体が無ければnullを返す', () => {
    expect(_signalText(null)).toBeNull();
  });

  // 現行テンプレート自体は禁止語を含まないため通常はnullにならないが、
  // 万一trigger/symptomの値に禁止パターンが混入した場合でもブロックされることを確認
  it('sig.trigger/symptomの値に禁止パターンが混入していてもブロックされる', () => {
    const text = _signalText({ id: 'sleepPainCorrelation', trigger: 'このサプリを', symptom: '痛み' });
    expect(text).toBeNull();
  });
});

describe('_recentChangeText', () => {
  it('既知のsignal idは固定文を返す', () => {
    expect(_recentChangeText({ id: 'recentImprovement' })).toBe('過去1週間は、それ以前と比べて落ち着いている傾向があります');
  });

  it('未知のsignal idはnullを返す', () => {
    expect(_recentChangeText({ id: 'unknownSignal' })).toBeNull();
  });

  it('bbtVarianceはsig.avgを埋め込んだ文を返す(禁止語なし)', () => {
    expect(_recentChangeText({ id: 'bbtVariance', avg: 36.5 })).toBe('過去30日の体温に変化が見られます（平均 36.5℃）');
  });
});
