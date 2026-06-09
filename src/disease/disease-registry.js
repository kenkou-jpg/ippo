// src/disease/disease-registry.js
// Phase3: 疾患アナライザーの登録・ディスパッチ。
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
