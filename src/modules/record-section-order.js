// ================================================================
//  ippo – src/modules/record-section-order.js
//  PR-084 (Legacy Removal Batch-6): Record Section Order
//
//  app-legacy.js の reorderRecordSections() を物理移動。Business Logic変更なし。
//
//  ・bare `state` → `window.state`（_ippoStateHooks により同一オブジェクト参照）
//  ・末尾の bare `updateDiseaseQuestions()` 呼び出しは、window.updateDiseaseQuestions
//    経由の guarded 呼び出しに変更。app-legacy.js側の同名ローカルラッパー
//    （`function updateDiseaseQuestions(){if(typeof window.updateDiseaseQuestions
//    ==='function')window.updateDiseaseQuestions();}`）と完全に同一の分岐を
//    そのまま踏襲しているため挙動変更なし（src/modules/disease-settings.js は
//    現状どこからもimportされておらず window.updateDiseaseQuestions は未定義の
//    ままのため、現行の呼び出しは実質no-op — 別タスクで追跡中の既存事象であり
//    本PRのScope外）。
// ================================================================

export function reorderRecordSections() {
  var diseases = window.state.myDiseases || [];
  if (diseases.length === 0) return;

  // 疾患カテゴリに基づく優先セクションID
  var prioritySections = [];

  var hasUterine = diseases.some(function(d) {
    return ['子宮内膜症', '子宮筋腫', '子宮腺筋症'].indexOf(d) !== -1;
  });
  var hasOvarian = diseases.some(function(d) {
    return ['卵巣嚢腫', 'PCOS'].indexOf(d) !== -1;
  });
  var hasHormonal = diseases.some(function(d) {
    return ['PMS/PMDD', '更年期障害', '不妊症・排卵障害'].indexOf(d) !== -1;
  });
  var hasPelvic = diseases.some(function(d) {
    return ['骨盤臓器脱', '慢性骨盤痛'].indexOf(d) !== -1;
  });

  // 疾患チェックセクションを常に上位に移動
  var diseaseQ = document.getElementById('disease-questions');
  if (diseaseQ && diseaseQ.parentNode) {
    var recordScreen = diseaseQ.closest('.screen') || diseaseQ.parentNode;
    var symptomsSection = document.getElementById('rs-symptoms');
    if (symptomsSection) {
      var symptomsCard = symptomsSection.closest('.section-card');
      if (symptomsCard && symptomsCard.parentNode) {
        symptomsCard.parentNode.insertBefore(diseaseQ, symptomsCard.nextSibling);
      }
    }
  }

  // 更年期障害選択時：睡眠セクションにハイライトを追加
  if (hasHormonal && diseases.indexOf('更年期障害') !== -1) {
    var sleepSection = document.getElementById('rs-sleep-bed');
    if (sleepSection) {
      var sleepCard = sleepSection.closest('.section-card');
      if (sleepCard) {
        sleepCard.style.borderLeft = '3px solid var(--rose)';
        var hint = document.createElement('div');
        hint.style.cssText = 'font-size:10px;color:var(--rose);margin-top:6px;padding:4px 8px;background:var(--rose-pale);border-radius:8px;display:inline-block;';
        hint.textContent = '💡 更年期障害では睡眠の質の記録が重要です';
        sleepCard.appendChild(hint);
      }
    }
  }

  // 子宮系疾患選択時：痛み記録にハイライト
  if (hasUterine) {
    var painSection = document.querySelector('[data-section="pain"]') || document.getElementById('rs-pain-level');
    if (painSection) {
      var painCard = painSection.closest('.section-card');
      if (painCard) {
        painCard.style.borderLeft = '3px solid var(--rose)';
        var hint2 = document.createElement('div');
        hint2.style.cssText = 'font-size:10px;color:var(--rose);margin-top:6px;padding:4px 8px;background:var(--rose-pale);border-radius:8px;display:inline-block;';
        hint2.textContent = '💡 痛みの記録が症状の変化の把握に役立ちます';
        painCard.appendChild(hint2);
      }
    }
  }

  // PCOS選択時：生活ファクターにハイライト
  if (hasOvarian && diseases.indexOf('PCOS') !== -1) {
    var factorsSection = document.getElementById('rs-factors');
    if (factorsSection) {
      var factorsCard = factorsSection.closest('.section-card');
      if (factorsCard) {
        factorsCard.style.borderLeft = '3px solid var(--rose)';
        var hint3 = document.createElement('div');
        hint3.style.cssText = 'font-size:10px;color:var(--rose);margin-top:6px;padding:4px 8px;background:var(--rose-pale);border-radius:8px;display:inline-block;';
        hint3.textContent = '💡 食事・運動の記録がPCOS管理に重要です';
        factorsCard.appendChild(hint3);
      }
    }
  }

  // 骨盤系選択時：排便にハイライト
  if (hasPelvic) {
    var bowelSection = document.getElementById('rs-bowel');
    if (bowelSection) {
      var bowelCard = bowelSection.closest('.section-card');
      if (bowelCard) {
        bowelCard.style.borderLeft = '3px solid var(--rose)';
        var hint4 = document.createElement('div');
        hint4.style.cssText = 'font-size:10px;color:var(--rose);margin-top:6px;padding:4px 8px;background:var(--rose-pale);border-radius:8px;display:inline-block;';
        hint4.textContent = '💡 骨盤臓器脱では排便の記録が参考になります';
        bowelCard.appendChild(hint4);
      }
    }
  }

  // 疾患チェックセクションを自動表示
  if (typeof window.updateDiseaseQuestions === 'function') window.updateDiseaseQuestions();
}

// PR-090-R6 (Legacy Removal, EXPORT_HUB_REFACTOR_COUNCIL Step D): 自己export化。
// app-legacy.js側の重複export行（guarded window.X = X）は削除済み。
window.reorderRecordSections = reorderRecordSections;
