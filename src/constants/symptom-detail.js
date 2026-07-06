// ============================================================
//  ippo constants – symptom-detail.js
//  症状詳細マスターデータ（positions/types/hasSlider等）
//
//  PR-090-R4 (Legacy Removal, EXPORT_HUB_REFACTOR_COUNCIL 6-4): src/app-legacy.js
//  の bare `SYMPTOM_DETAIL_CONFIG`（純粋な静的データ、app-legacy.js内に他の
//  参照なし）をICONS/DISEASE_CONFIGと同型で物理移動。
//
//  【重要・現状維持のための既知の注記】本データを参照する
//  src/modules/record-input.js（appendSymptomDetail/renderSymptomDetail）は
//  `window.SYMPTOM_DETAIL_CONFIG`を読むが、移動前の時点で本ファイルを
//  window へ設定するコードはリポジトリ中に存在せず、`window.SYMPTOM_DETAIL_CONFIG`は
//  常にundefinedだった（record-input.js側の`{}`フォールバックが常時発火）。
//  ICONS/DISEASE_CONFIGのような`window.X = X;`ブリッジをここで新設すると
//  症状詳細サブUI（部位/タイプ/スライダー選択）が初めて表示されるようになり、
//  「Business Logic変更なし・UI変更なし」の制約に反する（実質的な機能有効化）ため、
//  本PRでは意図的にwindow bridgeを追加していない。record-input.js側の配線見直しは
//  別途Founder判断が必要な別課題として扱う。
// ============================================================

export const SYMPTOM_DETAIL_CONFIG = {
  '下腹部痛': {
    positions: ['左下腹部', '右下腹部', '下腹部全体', '腰', '骨盤周り'],
    types:     ['鈍痛', '鋭痛', '差し込み', '圧迫感', '張り'],
    hasSlider: true
  },
  '骨盤痛': {
    positions: ['左側', '右側', '両側', '仙骨周り', '全体'],
    types:     ['鈍痛', '鋭痛', '圧迫感', '張り', '重い'],
    hasSlider: true
  },
  '月経外の骨盤痛': {
    positions: ['左側', '右側', '両側', '仙骨周り'],
    types:     ['鈍痛', '鋭痛', '圧迫感', '張り'],
    hasSlider: true
  },
  '排卵痛': {
    positions: ['左下腹部', '右下腹部', '下腹部全体'],
    types:     ['鋭痛', '鈍痛', '差し込み', '張り'],
    hasSlider: true
  },
  '片側の下腹部痛': {
    positions: ['左側', '右側'],
    types:     ['鈍痛', '鋭痛', '差し込み', '圧迫感'],
    hasSlider: true
  },
  '腰痛': {
    positions: ['腰全体', '左側', '右側', '仙骨'],
    types:     ['鈍痛', '鋭痛', '張り', '重い'],
    hasSlider: true
  },
  '性交痛': {
    positions: ['入口付近', '奥（深部）', '全体'],
    types:     ['鈍痛', '鋭痛', '圧迫感', '灼熱感'],
    hasSlider: true
  },
  '排便痛': {
    positions: ['肛門周り', '腸全体', '左側', '右側'],
    types:     ['鈍痛', '鋭痛', '差し込み', '圧迫感'],
    hasSlider: true
  },
  '頭痛': {
    positions: ['前頭部', '側頭部（左）', '側頭部（右）', '後頭部', '全体'],
    types:     ['ズキズキ', '締め付け', '重い', '刺すような'],
    hasSlider: true
  },
  '慢性疲労': { hasSlider: true, sliderLabel: '疲れの強さ' },
  'だるさ':   { hasSlider: true, sliderLabel: '重さの程度' },
  '倦怠感':   { hasSlider: true, sliderLabel: '倦怠の程度' },
  'むくみ': {
    positions: ['顔', '手', '足（全体）', '足首', 'ふくらはぎ'],
    hasSlider: true,
    sliderLabel: 'むくみの程度'
  },
  '気分の落ち込み': {
    types:     ['ゆううつ', '虚無感', '涙が出る', '何もしたくない'],
    hasSlider: true,
    sliderLabel: '気分の重さ'
  },
  'イライラ': {
    types:     ['軽いイライラ', 'かなり強い', '怒りが抑えられない'],
    hasSlider: true,
    sliderLabel: 'イライラの強さ'
  },
  '不安感': {
    types:     ['漠然とした不安', '動悸を伴う', '眠れない'],
    hasSlider: true,
    sliderLabel: '不安の強さ'
  },
  '吐き気': {
    types:     ['軽い吐き気', '食欲がない', '嘔吐あり'],
    timing:    ['空腹時', '食後', '常時', '動いたとき'],
    hasSlider: true,
    sliderLabel: '吐き気の強さ'
  },
  '胸の張り': {
    positions: ['両側', '左側', '右側'],
    hasSlider: true,
    sliderLabel: '張りの強さ'
  },
  '不正出血': {
    types:     ['茶色のおりもの', '鮮血', '少量', '中等量'],
    timing:    ['排卵期', '生理前', '生理後', '性交後', '不定期'],
    hasSlider: false
  },
  '頻尿': {
    types:     ['少し多い', 'かなり多い', '夜間も起きる'],
    hasSlider: false
  },
  '便秘': {
    types:     ['数日出ない', '硬くて出にくい', '残便感'],
    hasSlider: false,
    bowelCount: true
  },
  '腹部膨満感': {
    types:     ['食後に張る', '一日中張っている', 'ガスが多い'],
    hasSlider: true,
    sliderLabel: '張りの程度'
  },
  'おりもの': {
    types:     ['透明・サラサラ', '白・とろみあり', '黄色みがかった', '茶色', 'ピンク・血混じり'],
    positions: ['量：少ない', '量：普通', '量：多い'],
    timing:    ['においの変化あり', 'かゆみあり', '膣の乾燥あり'],
    hasSlider: false,
    note: '膣の乾燥・においの変化は婦人科受診の参考になります'
  }
};
