// ============================================================
//  ippo – home-next-optional.js
//  Optional モジュール: ユーザーがONにした場合のみ表示
//  食事・ファスティング・血糖などのカード
// ============================================================

// ── ファスティング表示 ────────────────────────────────────

function buildFastingRow(state) {
  if (!state.fastingActive) {
    return `
      <div class="hn-optional-row">
        <div class="hn-optional-left">
          <div class="hn-optional-icon">⏱</div>
          <div>
            <div class="hn-optional-name">ファスティング</div>
            <div class="hn-optional-sub">現在停止中</div>
          </div>
        </div>
        <div class="hn-optional-value muted">—</div>
      </div>`;
  }

  const start   = state.fastingStart ? new Date(state.fastingStart) : null;
  const goal    = state.fastGoal || 12;
  let elapsed   = '—';
  let remaining = '';

  if (start) {
    const elapsedMs  = Date.now() - start.getTime();
    const elapsedH   = Math.floor(elapsedMs / 3600000);
    const elapsedM   = Math.floor((elapsedMs % 3600000) / 60000);
    elapsed = `${elapsedH}h ${elapsedM}m`;

    const goalMs  = goal * 3600000;
    const leftMs  = goalMs - elapsedMs;
    if (leftMs > 0) {
      const leftH = Math.floor(leftMs / 3600000);
      const leftM = Math.floor((leftMs % 3600000) / 60000);
      remaining = `目標まで ${leftH}h ${leftM}m`;
    } else {
      remaining = `目標達成`;
    }
  }

  return `
    <div class="hn-optional-row">
      <div class="hn-optional-left">
        <div class="hn-optional-icon">⏱</div>
        <div>
          <div class="hn-optional-name">ファスティング中</div>
          <div class="hn-optional-sub">${remaining}</div>
        </div>
      </div>
      <div class="hn-optional-value">${elapsed}</div>
    </div>`;
}

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

function shouldShowFastingModule(state) {
  // ファスティング機能: state.fastingActive または state.fastGoal が設定されていれば表示
  return state.fastingActive || (state.fastGoal != null && state.fastGoal > 0);
}

// ── メインレンダリング ────────────────────────────────────

export function renderOptionalModules(container, config, state) {
  const rows = [];

  if (shouldShowFoodModule(config, state)) {
    rows.push(buildFoodRow(state));
  }

  if (shouldShowFastingModule(state)) {
    rows.push(buildFastingRow(state));
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
