// src/disease/disease-registry.js
// Phase3: 疾患アナライザーの登録・ディスパッチ。
// PR-C3: 日本語疾患名 → diseaseKey 変換を一元管理。
// diseaseKey は DISEASE_NAME_MAP の値に準拠。

import { EndometriosisAnalyzer }       from './endometriosis/analyzer.js';
import { OvarianCystAnalyzer }         from './ovarian-cyst/analyzer.js';
import { FibroidAnalyzer }             from './fibroid/analyzer.js';
import { AdenomyosisAnalyzer }         from './adenomyosis/analyzer.js';
import { PCOSAnalyzer }                from './pcos/analyzer.js';
import { PMSPMDDAnalyzer }             from './pms-pmdd/analyzer.js';
import { MenopauseAnalyzer }           from './menopause/analyzer.js';
import { InfertilityAnalyzer }         from './infertility/analyzer.js';
import { ProlapsAnalyzer }             from './prolapse/analyzer.js';
import { ChronicPelvicPainAnalyzer }   from './chronic-pelvic-pain/analyzer.js';
import { VulvodyniaAnalyzer }          from './vulvodynia/analyzer.js';

// 日本語疾患名 → diseaseKey の正規マッピング（唯一の定義場所）
export const JA_TO_KEY = {
  '子宮内膜症':   'endometriosis',
  '卵巣嚢腫':     'ovarianCyst',
  '子宮筋腫':     'fibroid',
  '子宮腺筋症':   'adenomyosis',
  'PCOS':         'pcos',
  'PMS':          'pms',
  'PMDD':         'pmdd',
  'PMS/PMDD':     'pms',
  '更年期障害':   'menopause',
  '不妊症':       'infertility',
  '骨盤臓器脱':   'prolapse',
  '慢性骨盤痛':   'chronicPelvicPain',
  '外陰痛症候群': 'vulvodynia',
};

// キーは DISEASE_NAME_MAP の値と一致させること
const REGISTRY = {
  endometriosis:    EndometriosisAnalyzer,
  ovarianCyst:      OvarianCystAnalyzer,
  fibroid:          FibroidAnalyzer,
  adenomyosis:      AdenomyosisAnalyzer,
  pcos:             PCOSAnalyzer,
  pms:              PMSPMDDAnalyzer,
  pmdd:             PMSPMDDAnalyzer,
  menopause:        MenopauseAnalyzer,
  infertility:      InfertilityAnalyzer,
  prolapse:         ProlapsAnalyzer,
  chronicPelvicPain: ChronicPelvicPainAnalyzer,
  vulvodynia:       VulvodyniaAnalyzer,
};

/**
 * diseaseKey からアナライザーインスタンスを返す。
 * @param {string} diseaseKey
 * @returns {BaseAnalyzer}
 */
export function getAnalyzer(diseaseKey) {
  const Cls = REGISTRY[diseaseKey];
  if (!Cls) throw new Error(`DiseaseRegistry: unknown key "${diseaseKey}"`);
  return new Cls();
}

/**
 * 複数疾患キーを一括分析する。
 * @param {string[]} diseaseKeys
 * @param {object[]} records
 * @param {object}   state
 * @returns {object[]}
 */
export function analyzeAll(diseaseKeys, records, state = {}) {
  return (diseaseKeys || [])
    .filter(key => REGISTRY[key])
    .map(key => getAnalyzer(key).analyze(records, state));
}

/**
 * 登録済み全 diseaseKey 一覧を返す。
 */
export function listDiseaseKeys() {
  return Object.keys(REGISTRY);
}

/**
 * 日本語疾患名の配列を diseaseKey 配列に変換する。
 * 未知の名前はスキップ（filter(Boolean) 相当）。
 * analysis-module が疾患名の詳細を知らなくて済むよう、
 * 変換ロジックをここに一元管理する。
 *
 * @param {string[]} jaNames — 日本語疾患名の配列（state.myDiseases）
 * @returns {string[]}       — 登録済み diseaseKey の配列
 */
export function resolveKeys(jaNames) {
  return (jaNames || []).map(n => JA_TO_KEY[n]).filter(Boolean);
}
