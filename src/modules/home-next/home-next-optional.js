// ============================================================
//  ippo – home-next-optional.js
//  Optional モジュール: ユーザーがONにした場合のみ表示
//  食事・ファスティング・血糖などのカード
// ============================================================

// ── 食事ロウ（フード記録ONの場合） ───────────────────────

function buildFoodRow(state) {
  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = (state.records || []).find(r =>
    (r.date || r.record_date || '').slice(0, 10) === today
  );

  // mealCount フィールドがあれば使う（将来の実装想定）
  const mealCount = todayRecord?.mealCount ?? null;
  const mealText  = mealCount != null ? `${mealCount}食` : '未記録';
  const muted     = mealCount == null;

  return `
    <div class="hn-optional-row">
      <div class="hn-optional-left">
        <div class="hn-optional-icon">🥗</div>
        <div>
          <div class="hn-optional-name">今日の食事</div>
          <div class="hn-optional-sub">食事記録</div>
        </div>
      </div>
      <div class="hn-optional-value${muted ? ' muted' : ''}">${mealText}</div>
    </div>`;
}

// ── optional modules 表示判定 ────────────────────────────

function shouldShowFoodModule(config, state) {
  // config の optionalModules に 'food' が含まれ、
  // かつ state.foodTracking === true のとき表示
  const inConfig = (config.optionalModules || []).includes('food');
  const userOn   = state.foodTracking === true;
  return inConfig && userOn;
}

// ── メインレンダリング ────────────────────────────────────

export function renderOptionalModules(container, config, state) {
  const rows = [];

  if (shouldShowFoodModule(config, state)) {
    rows.push(buildFoodRow(state));
  }

  if (rows.length === 0) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <div class="hn-section hn-animate-3">
      <div class="hn-section-label">記録中</div>
      <div class="hn-optional-card">${rows.join('')}</div>
    </div>`;
}
