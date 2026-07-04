// ================================================================
//  ippo – src/modules/record-factors.js
//  PR-087 (Legacy Removal Batch-9): Record Screen カスタムファクター追加
//
//  app-legacy.js の addCustomFactor を新設・物理移動。Business Logic変更なし。
//
//  ・audit文書（phase4d-legacy-migration-audit.md Batch-9節）はaddCustomFactorの
//    移植先を明示していなかったため、実装前調査を実施: toggleRsChip（同じ
//    #rs-factors チップ群を操作する関数）はBatch-9対象外でapp-legacy.js残置と
//    判明（Batch-2系のopenRecordScreen/DIスキャフォールド待ち）。addCustomFactor
//    自体はtoggleRsChipを呼ばずonclick文字列を組み立てるのみで直接依存はないため、
//    disease-settings.js/symptom-settings.js分離と同型の「1 feature = 1 owner」判断で
//    専用新設ファイルへ分離。
// ================================================================

export function addCustomFactor(){
  var input = document.getElementById('rs-factor-custom');
  if(!input) return;
  var text = input.value.trim();
  if(!text) return;
  var container = document.getElementById('rs-factors');
  if(!container) return;
  var chip = document.createElement('div');
  chip.className = 'chip selected';
  chip.textContent = text;
  chip.setAttribute('onclick', 'toggleRsChip(this)');
  container.appendChild(chip);
  input.value = '';
}
