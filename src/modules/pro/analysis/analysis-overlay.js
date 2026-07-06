// ================================================================
//  ippo – src/modules/pro/analysis/analysis-overlay.js
//  PR-082 (Legacy Removal Batch-4): AIパターン解析オーバーレイ
//
//  app-legacy.js から物理移動。既存挙動は無変更（Business Logic変更なし）。
//
//  設計メモ: 移植元 phase4d-legacy-migration-audit.md は移動先候補として
//  analysis-module.js（既存拡充）を挙げていたが、analysis-module.js は
//  ファイル冒頭のコメントで「Pure Read Only。DOM操作・保存・キャッシュ禁止」
//  と明記された契約を持つ。本ファイルの関数群はオーバーレイDOM操作・
//  fetch・クリップボード書き込みを伴うUIオーケストレーション層であり、
//  analysis-module.js に混在させるとその契約に反するため、新規の
//  兄弟ファイルとして分離した（物理移動先の変更のみ、ロジック変更なし）。
//  pure計算部分（buildAIPrompt）は既に analysis-module.js
//  （Strangler Pattern済み）にあり、本ファイルは window.buildAIPrompt
//  経由で呼び出す既存の依存関係をそのまま維持する。
//
//  bare `state` 参照は `window.state` に置換（record-screen.js / premium-lock.js
//  と同型。_ippoStateHooks により同一オブジェクト参照、挙動変更なし）。
// ================================================================

var _aiOverlayApi = null;

function _getAiOverlay() {
  if (!_aiOverlayApi) {
    _aiOverlayApi = window.createProOverlay({
      id: 'ai-pro-overlay',
      ariaLabel: 'AIパターン解析',
      title: 'AIパターン解析',
      subtitle: 'あなたの記録データからパターンを読み解きます',
      footer: [
        { id: 'ai-close-btn', label: '閉じる', cls: 'pob-btn pob-btn-secondary' },
        { id: 'ai-copy-btn', label: 'テキストをコピー', cls: 'pob-btn pob-btn-primary' },
      ],
      onClose: closeAIAnalysis,
    });
    _aiOverlayApi.getButton('ai-close-btn').addEventListener('click', closeAIAnalysis);
    _aiOverlayApi.getButton('ai-copy-btn').addEventListener('click', copyAIAnalysis);
  }
  return _aiOverlayApi;
}

export function openAIAnalysis() {
  _getAiOverlay().open();
  runAIAnalysis();
}

export function closeAIAnalysis() {
  if (_aiOverlayApi) _aiOverlayApi.close();
}

export async function runAIAnalysis() {
  const api = _getAiOverlay();
  const token = api.nextToken();
  const body = api.body;
  body.innerHTML = '<div class="ai-loading"><div class="ai-loading-icon">✨</div><div class="ai-loading-text">データを収集しています...</div></div>';

  try {
    const today = new Date();
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const fromDate = ninetyDaysAgo.toISOString().split('T')[0];
    const toDate = today.toISOString().split('T')[0];

    const records = window.state.records.filter(function(r) {
      var d = r.record_date || (r.date ? r.date.slice(0, 10) : '');
      return d >= fromDate && d <= toDate;
    });

    if (records.length < 3) {
      body.innerHTML = '<div class="ai-error">パターン解析には最低3日分の記録が必要です。<br>記録を続けてから、もう一度お試しください。</div>';
      return;
    }

    body.querySelector('.ai-loading-text').textContent = 'パターンを解析中...';

    // PR-E1: Prediction / Cluster DB→State
    if (window.loadProfileCache && window.supabase && window.supabaseUserId) {
      try {
        const cache = await window.loadProfileCache(window.supabase, window.supabaseUserId);
        window.state.predictionCache = cache.predictionCache;
        window.state.clusterId       = cache.clusterId;
        window.state.clusterMeta     = cache.clusterMeta;
      } catch (_e) {
        // キャッシュ取得失敗時は従来分析継続
      }
    }


    // 新経路: buildAIPrompt → features
    const p        = window.buildAIPrompt(window.state.records, window.state);
    const features = p.features;

    // 解析モードをセッション状態で事前判定（表示用）
    const _sc = window.supabase;
    const _sd = _sc ? (await _sc.auth.getSession()).data?.session : null;
    const _isAI = !!_sd;
    const modeBadge = _isAI
      ? '<span style="display:inline-flex;align-items:center;gap:4px;background:#e8f4ec;color:#4a7c5c;font-size:11px;padding:3px 10px;border-radius:8px;font-weight:600;">✨ AI解析モード</span>'
      : '<span style="display:inline-flex;align-items:center;gap:4px;background:rgba(200,180,170,0.2);color:var(--ink-light);font-size:11px;padding:3px 10px;border-radius:8px;font-weight:600;">🏠 ローカル解析モード</span>';

    if (api.isStale(token)) return;

    let dataHtml = '<div class="ai-data-summary">';
    dataHtml += '<div class="ai-data-title" style="display:flex;justify-content:space-between;align-items:center;">解析対象データ ' + modeBadge + '</div>';
    dataHtml += '<div class="ai-data-row"><span class="ai-data-label">期間</span><span class="ai-data-value">' + fromDate + ' 〜 ' + toDate + '</span></div>';
    dataHtml += '<div class="ai-data-row"><span class="ai-data-label">記録件数</span><span class="ai-data-value">' + features.sampleSize + ' 件</span></div>';
    if (features.topSymptoms && features.topSymptoms.length) {
      dataHtml += '<div class="ai-data-row"><span class="ai-data-label">主な症状</span><span class="ai-data-value">' + features.topSymptoms.slice(0, 2).join('・') + '</span></div>';
    }
    if (features.flareTrigger) {
      dataHtml += '<div class="ai-data-row"><span class="ai-data-label">主なトリガー</span><span class="ai-data-value">' + features.flareTrigger + '</span></div>';
    }
    if (!_isAI) dataHtml += '<div class="ai-data-row" style="margin-top:6px;"><span style="font-size:11px;color:var(--ink-light);">ℹ️ ログインするとAIによる詳細解析が利用できます</span></div>';
    dataHtml += '</div>';

    body.innerHTML = dataHtml + '<div class="ai-loading"><div class="ai-loading-icon">✨</div><div class="ai-loading-text">パターンを読み解いています...</div></div>';

    const aiComment = await callAIAPI({ features: features, systemPrompt: p.systemPrompt, userPrompt: p.userPrompt });
    if (api.isStale(token)) return;

    // 結果を表示
    let resultHtml = dataHtml;
    resultHtml += '<div class="ai-result">';
    resultHtml += '<div class="ai-result-header">';
    resultHtml += '<div class="ai-result-icon">✨</div>';
    resultHtml += '<div class="ai-result-label">パターン解析</div>';
    resultHtml += '<div class="ai-result-date">' + new Date().toLocaleDateString('ja-JP') + '</div>';
    resultHtml += '</div>';
    resultHtml += '<div class="ai-result-text">' + aiComment + '</div>';
    resultHtml += '</div>';

    body.innerHTML = resultHtml;

  } catch (err) {
    console.error('AI analysis error:', err);
    if (!api.isStale(token)) {
      body.innerHTML = '<div class="ai-error">解析中にエラーが発生しました。<br><br>' + (err.message || '') + '<br><br><button class="ai-retry-btn" onclick="runAIAnalysis()">もう一度試す</button></div>';
    }
  }
}


// PR-C4: features 経路のみ。旧 records/analysisType 分岐・generateLocalAnalysis 削除済み。
async function callAIAPI(apiPayload) {
  var supabaseClient = window.supabase;
  var sessionData = supabaseClient ? (await supabaseClient.auth.getSession()).data?.session : null;

  if (!sessionData) {
    return 'ログインするとAIによる詳細解析が利用できます。記録が蓄積されています。';
  }

  var supabaseUrl = window.SUPABASE_URL || 'https://ekaoojdqhkpeudujfsdh.supabase.co';

  var resp = await fetch(supabaseUrl + '/functions/v1/ai-analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + sessionData.access_token,
    },
    body: JSON.stringify(apiPayload),
  });

  if (!resp.ok) {
    if (resp.status === 429) throw new Error('解析リクエストが多すぎます。1分後にもう一度お試しください。');
    const errData = await resp.json().catch(() => ({}));
    throw new Error('API error: ' + (errData.error || resp.status));
  }

  var data = await resp.json();
  var content = data.content?.[0]?.text ?? data.choices?.[0]?.message?.content ?? null;
  if (!content) throw new Error('AIの応答を取得できませんでした。');
  return content;
}

export function copyAIAnalysis() {
  const body = _aiOverlayApi ? _aiOverlayApi.body : null;
  const resultEl = body ? body.querySelector('.ai-result-text') : null;
  if (!resultEl) return;

  let text = '【ippo AIパターン解析】\n';
  text += '解析日: ' + new Date().toLocaleDateString('ja-JP') + '\n\n';
  text += resultEl.textContent;
  text += '\n\n※ このコメントはippoアプリの記録データに基づく参考情報です。医学的診断ではありません。';

  navigator.clipboard.writeText(text).then(() => {
    const btn = _aiOverlayApi ? _aiOverlayApi.getButton('ai-copy-btn') : null;
    if (!btn) return;
    const original = btn.textContent;
    btn.textContent = 'コピーしました ✓';
    btn.style.background = '#8aab96';
    setTimeout(() => {
      btn.textContent = original;
      btn.style.background = '';
    }, 2000);
  });
}

// PR-090-R6 (Legacy Removal, EXPORT_HUB_REFACTOR_COUNCIL Step D): 自己export化。
// app-legacy.js側の重複export行（guarded window.X = X）は削除済み。
window.closeAIAnalysis = closeAIAnalysis;
window.copyAIAnalysis  = copyAIAnalysis;
window.openAIAnalysis  = openAIAnalysis;
window.runAIAnalysis   = runAIAnalysis;
