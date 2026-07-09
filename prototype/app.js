/* ============================================================
 * ippo Prototype app.js
 * Dummy data + static state only. No Supabase / Stripe / AI API / Auth.
 *
 * Narrative used across the Day-state preview (for internal consistency):
 *   Day0  — onboarding just finished, no records, no experiment yet
 *   Day3  — 乳製品断ち started on app-day1, now day3/14 (21%), early tentative signal
 *   Day7  — 乳製品断ち day7/14 (50%), signal getting clearer, still phrased as a question
 *   Day14 — 乳製品断ち day14/14, completed today → Before/After result, next suggestion appears
 *   Day30 — カフェイン断ち (started app-day17) day14/14, completed today → new result + new suggestion
 * ============================================================ */

const STATE = {
  onboardingDone: false,
  todayRecorded: false,
  concerns: [],
  currentDay: 0,
};

const DAY_STATES = {
  0: {
    heroDayNumber: "0",
    heroExperimentName: "🌱 まだ実験はありません",
    heroProgressPct: 0,
    heroProgressCaption: "記録を続けると実験を始められます",
    heroFocusText: "気になることを3日間、記録してみましょう",

    insight: {
      isEmpty: true,
      label: "はじめに",
      text: "まだ十分なデータがありません。記録を続けると、あなたの気づきが少しずつここに見えてきます。",
      confidence: null,
      ctaVisible: false,
    },

    experiment: null, // no active experiment
    experimentEmptyText: "まだ実験は始まっていません。3日ほど記録すると、気になることに合わせた実験を提案します。",

    result: null,
    next: null,
    milestone: null,

    recordFocus: null, // no "今週の実験対象" banner
    recordHighlightTag: null,

    calendarDays: 0,
    insightsHighlight: {
      text: "記録を始めたばかりです。パターンが見えてくるまで、もう少しかかります。",
      confidence: null,
    },
    compare: null,
    streak: ["future", "future", "future", "future", "future", "future", "future"],
  },

  3: {
    heroDayNumber: "3",
    heroExperimentName: "🥛 乳製品断ち実験",
    heroProgressPct: 21,
    heroProgressCaption: "全14日中3日目・残り11日",
    heroFocusText: "乳製品を一切摂らずに過ごす",

    insight: {
      isEmpty: false,
      label: "今日の気づき",
      text: "「乳製品を摂った日、もしかして肌の調子が気になりませんでしたか？」",
      confidence: { level: 1, label: "まだ3日分のデータです・参考程度に" },
      ctaVisible: true,
    },

    experiment: { name: "乳製品断ち", icon: "🥛", day: 3, total: 14, pct: 21, tag: "dairy" },
    experimentEmptyText: null,

    result: null,
    next: null,
    milestone: null,

    recordFocus: { icon: "🥛", text: "乳製品断ち（あと11日）" },
    recordHighlightTag: "dairy",

    calendarDays: 3,
    insightsHighlight: {
      text: "「乳製品を摂った日、もしかして肌の調子が気になりませんでしたか？」",
      confidence: { level: 1, label: "まだ3日分のデータです・参考程度に" },
    },
    compare: null,
    streak: ["future", "future", "future", "future", "recorded", "recorded", "recorded"],
  },

  7: {
    heroDayNumber: "7",
    heroExperimentName: "🥛 乳製品断ち実験",
    heroProgressPct: 50,
    heroProgressCaption: "全14日中7日目・残り7日",
    heroFocusText: "乳製品を一切摂らずに過ごす",

    insight: {
      isEmpty: false,
      label: "今日の気づき",
      text: "「乳製品を摂った日は、肌の調子が気になる日が多いようです」",
      confidence: { level: 2, label: "7件のデータから検出" },
      ctaVisible: true,
    },

    experiment: { name: "乳製品断ち", icon: "🥛", day: 7, total: 14, pct: 50, tag: "dairy" },
    experimentEmptyText: null,

    result: null,
    next: null,
    milestone: null,

    recordFocus: { icon: "🥛", text: "乳製品断ち（あと7日）" },
    recordHighlightTag: "dairy",

    calendarDays: 7,
    insightsHighlight: {
      text: "「乳製品を摂った日は、肌の調子が気になる日が多いようです」",
      confidence: { level: 2, label: "7件のデータから検出" },
    },
    compare: null,
    streak: ["recorded", "recorded", "missed", "recorded", "recorded", "recorded", "recorded"],
  },

  14: {
    heroDayNumber: "14",
    heroExperimentName: "🥛 乳製品断ち実験・完了",
    heroProgressPct: 100,
    heroProgressCaption: "全14日中14日目・今日で完了",
    heroFocusText: "実験の結果を振り返ってみましょう",

    insight: {
      isEmpty: false,
      label: "今日の気づき",
      text: "「乳製品を断ってから、肌荒れの報告が減っているようです」",
      confidence: { level: 3, label: "14件のデータから検出" },
      ctaVisible: true,
    },

    experiment: { name: "乳製品断ち", icon: "🥛", day: 14, total: 14, pct: 100, tag: "dairy" },
    experimentEmptyText: null,

    result: {
      before: "乳製品断ち前", target: "肌荒れ",
      delta: "-38", unit: "%",
      meaning: "肌荒れが落ち着いてきた実感があります",
      caption: "実験開始から2週間の変化・14件の記録から算出",
    },
    next: {
      icon: "☕", title: "カフェイン断ち・2週間",
      expected: "同じ悩みの人の <strong>62%</strong> が「寝つきの改善」を実感",
      reason: "肌荒れの次は、睡眠の質が気になったので",
      hypothesis: "仮説: カフェインを断つと、寝つきが良くなるかもしれません",
      observe: "観察すること: 就寝時刻・寝つくまでの時間",
    },
    milestone: {
      title: "14日間、やり遂げました",
      sub: "小さな一歩の積み重ねが、ここまで来ました。",
    },

    recordFocus: { icon: "🥛", text: "乳製品断ち（今日で完了）" },
    recordHighlightTag: "dairy",

    calendarDays: 14,
    insightsHighlight: {
      text: "「乳製品を断ってから、肌荒れの報告が減っているようです」",
      confidence: { level: 3, label: "14件のデータから検出" },
    },
    compare: {
      beforeLabel: "断つ前", afterLabel: "断ってから",
      beforeValue: 62, afterValue: 78,
      beforeHeight: 54, afterHeight: 82,
      caption: "乳製品を断ってから、肌荒れスコアが38%改善しました",
      question: "この実験で、本当に肌は変わったのでしょうか？",
    },
    streak: ["recorded", "recorded", "recorded", "missed", "recorded", "recorded", "recorded"],
  },

  30: {
    heroDayNumber: "30",
    heroExperimentName: "☕ カフェイン断ち実験・完了",
    heroProgressPct: 100,
    heroProgressCaption: "全14日中14日目・今日で完了",
    heroFocusText: "2つ目の実験の結果を振り返ってみましょう",

    insight: {
      isEmpty: false,
      label: "今日の気づき",
      text: "「カフェインを断ってから、寝つきが早くなっているようです」",
      confidence: { level: 3, label: "14件のデータから検出" },
      ctaVisible: true,
    },

    experiment: { name: "カフェイン断ち", icon: "☕", day: 14, total: 14, pct: 100, tag: "caffeine" },
    experimentEmptyText: null,

    result: {
      before: "カフェイン断ち前", target: "寝つきまでの時間",
      delta: "-42", unit: "%",
      meaning: "寝つきがぐっと早くなりました",
      caption: "実験開始から2週間の変化・14件の記録から算出",
    },
    next: {
      icon: "🍚", title: "糖質を控える・2週間",
      expected: "同じ悩みの人の <strong>55%</strong> が「気分の安定」を実感",
      reason: "気分の波がまだ気になるので",
      hypothesis: "仮説: 糖質を控えると、気分の波が緩やかになるかもしれません",
      observe: "観察すること: 気分・集中力",
    },
    milestone: {
      title: "2つ目の実験も、やり遂げました",
      sub: "少しずつ、自分の体のことがわかってきましたね。",
    },

    recordFocus: { icon: "☕", text: "カフェイン断ち（今日で完了）" },
    recordHighlightTag: "caffeine",

    calendarDays: 28,
    insightsHighlight: {
      text: "「カフェインを断ってから、寝つきが早くなっているようです」",
      confidence: { level: 4, label: "2つの実験・28件のデータから検出" },
    },
    compare: {
      beforeLabel: "断つ前", afterLabel: "断ってから",
      beforeValue: 58, afterValue: 84,
      beforeHeight: 50, afterHeight: 86,
      caption: "カフェインを断ってから、寝つきまでの時間が42%短縮しました",
      question: "2つの実験を経て、パターンは見えてきたのでしょうか？",
    },
    streak: ["recorded", "recorded", "recorded", "recorded", "recorded", "recorded", "recorded"],
  },
};

const CALENDAR_PATTERN = [
  "rose","","sage","","plum","rose","",
  "sage","sage","","rose","","plum","plum",
  "","sage","sage","","rose","","sage",
  "sage","","plum","plum","","rose","sage",
];

/* 「気になること」選択直後の仮説候補（オンボーディング濃厚化）とHome Day0の軽量シグナル文言 */
const CONCERN_CONTENT = {
  pms: {
    label: "PMS",
    onboarding: "PMSが気になる方には、生理前の乳製品や糖質の摂取と気分の変化に気づく人が多くいます。まずは3日間、気になることを記録するところから始めてみませんか？",
    homeFocus: "PMSの記録を続けてみましょう",
  },
  pmdd: {
    label: "PMDD",
    onboarding: "PMDDが気になる方には、生理前のカフェインや睡眠不足が気分の波に影響しているのではと感じる人がいます。まずは3日間、記録して自分のパターンを見てみましょう。",
    homeFocus: "PMDDの記録を続けてみましょう",
  },
  pcos: {
    label: "PCOS",
    onboarding: "PCOSが気になる方には、糖質や乳製品と肌・体重の変化に関連を感じる人がいます。まずは3日間の記録から始めてみませんか？",
    homeFocus: "PCOSの記録を続けてみましょう",
  },
  endometriosis: {
    label: "子宮内膜症",
    onboarding: "子宮内膜症が気になる方には、カフェインや冷えと痛みの変化に気づく人がいます。まずは3日間、体調を記録してみましょう。",
    homeFocus: "子宮内膜症の記録を続けてみましょう",
  },
  "ovarian-cyst": {
    label: "卵巣嚢腫",
    onboarding: "卵巣嚢腫が気になる方には、ホルモンバランスに関わる生活習慣を見直すきっかけを探している人が多くいます。まずは3日間、記録から始めてみましょう。",
    homeFocus: "卵巣嚢腫の記録を続けてみましょう",
  },
  none: {
    label: "特にない",
    onboarding: "気になることが特になくても大丈夫です。まずは3日間、なんとなく気になることを記録してみましょう。",
    homeFocus: "気になることを3日間、記録してみましょう",
  },
};

/* ===== Rendering ===== */

function renderHero(day) {
  document.getElementById("hero-day-number").textContent = day.heroDayNumber;
  document.getElementById("hero-ring").style.setProperty("--pct", day.heroProgressPct);
  document.getElementById("hero-experiment-name").textContent = day.heroExperimentName;
  document.getElementById("hero-progress-caption").textContent = day.heroProgressCaption;

  // Day0のみ「気になること」に合わせた軽量シグナルに差し替える（Home自体への女性向けシグナル）
  let focusText = day.heroFocusText;
  if (day.currentDay === 0) {
    const primary = STATE.concerns.find((c) => c !== "none");
    if (primary && CONCERN_CONTENT[primary]) focusText = CONCERN_CONTENT[primary].homeFocus;
  }
  document.getElementById("hero-focus-text").textContent = focusText;

  renderHeroStreak(day);
}

/* 直近7日継続ストリップ: Hero内への軽量統合。missed/futureは同じ見た目にし、未達成を責めない */
function renderHeroStreak(day) {
  const dots = document.querySelectorAll("#hero-streak-dots .streak-dot");
  const streak = day.streak || [];
  dots.forEach((dot, i) => {
    dot.classList.toggle("dot-recorded", streak[i] === "recorded");
    dot.classList.toggle("dot-today", i === dots.length - 1);
  });
}

function renderHomeMilestone(day) {
  const banner = document.getElementById("home-milestone-banner");
  if (!day.milestone) { banner.hidden = true; return; }
  banner.hidden = false;
  document.getElementById("milestone-title").textContent = day.milestone.title;
  document.getElementById("milestone-sub").textContent = day.milestone.sub;
}

/* 確信度メーター: 3〜5段階のドット表示。断定はせず「参考程度」の度合いを示すのみ */
function renderConfidenceMeter(rowId, tagId, confidence) {
  const row = document.getElementById(rowId);
  const tag = document.getElementById(tagId);
  if (!confidence) { row.hidden = true; return; }
  row.hidden = false;
  tag.textContent = confidence.label;
  row.querySelectorAll(".confidence-dot").forEach((dot, i) => {
    dot.classList.toggle("filled", i < confidence.level);
  });
}

function renderHomeInsight(day) {
  const label = document.getElementById("home-insight-label");
  const text = document.getElementById("home-insight-text");
  const cta = document.getElementById("home-insight-cta");

  label.textContent = day.insight.label;
  text.innerHTML = day.insight.text;
  renderConfidenceMeter("home-insight-confidence-row", "home-insight-confidence", day.insight.confidence);
  cta.hidden = !day.insight.ctaVisible;
}

function renderHomeExperiment(day) {
  const el = document.getElementById("home-experiment-card");
  if (!day.experiment) {
    el.innerHTML = `<p class="empty-guide-text">${day.experimentEmptyText}</p>`;
    return;
  }
  const ex = day.experiment;
  el.innerHTML = `
    <div class="mini-progress-ring" style="--pct:${ex.pct}"><span>Day ${ex.day}</span></div>
    <div>
      <div class="experiment-card-title">${ex.icon} ${ex.name}</div>
      <div class="experiment-card-sub">${ex.day >= ex.total ? "今日で完了・お疲れさまでした" : `残り ${ex.total - ex.day} 日・${ex.day}日連続で継続中`}</div>
    </div>
  `;
}

function renderHomeResult(day) {
  const section = document.getElementById("home-result-section");
  if (!day.result) { section.hidden = true; return; }
  section.hidden = false;
  document.getElementById("home-result-before").textContent = day.result.before;
  document.getElementById("home-result-target").textContent = day.result.target;
  document.getElementById("home-result-delta").innerHTML = `${day.result.delta}<span class="result-delta-unit">${day.result.unit}</span>`;
  document.getElementById("home-result-meaning").textContent = day.result.meaning;
  document.getElementById("home-result-caption").textContent = day.result.caption;
  if (day.compare) {
    document.getElementById("home-result-mini-before").style.height = day.compare.beforeHeight + "%";
    document.getElementById("home-result-mini-after").style.height = day.compare.afterHeight + "%";
  }
}

function renderHomeNext(day) {
  const section = document.getElementById("home-next-section");
  if (!day.next) { section.hidden = true; return; }
  section.hidden = false;
  document.getElementById("home-next-title").textContent = `${day.next.icon} ${day.next.title}`;
  document.getElementById("home-next-expected").innerHTML = day.next.expected;
}

function renderRecordFocusBanner(day) {
  const banner = document.getElementById("record-focus-banner");
  if (!day.recordFocus) { banner.hidden = true; return; }
  banner.hidden = false;
  document.getElementById("record-focus-icon").textContent = day.recordFocus.icon;
  document.getElementById("record-focus-text").textContent = day.recordFocus.text;
}

function renderRecordTagHighlight(day) {
  document.querySelectorAll("#record-tag-grid button").forEach((btn) => {
    btn.classList.toggle("experiment-highlight", day.recordHighlightTag === btn.dataset.tag);
  });
  const hint = document.getElementById("record-hint-text");
  hint.style.visibility = day.recordHighlightTag ? "visible" : "hidden";
}

function renderCalendar(day) {
  const el = document.getElementById("pattern-calendar");
  const visibleCount = Math.min(day.calendarDays, CALENDAR_PATTERN.length);
  el.innerHTML = CALENDAR_PATTERN
    .map((c, i) => `<div class="cell ${i < visibleCount ? c : "cell-future"}"></div>`)
    .join("");
}

function renderInsightsHighlight(day) {
  const text = document.getElementById("insights-highlight-text");
  text.innerHTML = day.insightsHighlight.text;
  renderConfidenceMeter("insights-highlight-confidence-row", "insights-highlight-confidence", day.insightsHighlight.confidence);
}

function renderInsightsCompare(day) {
  const section = document.getElementById("insights-compare-section");
  if (!day.compare) { section.hidden = true; return; }
  section.hidden = false;
  const c = day.compare;
  document.getElementById("insights-compare-question").textContent = c.question;
  document.getElementById("insights-compare-before-label").textContent = c.beforeLabel;
  document.getElementById("insights-compare-after-label").textContent = c.afterLabel;
  document.getElementById("insights-compare-before-value").textContent = c.beforeValue;
  document.getElementById("insights-compare-after-value").textContent = c.afterValue;
  document.getElementById("insights-compare-before-bar").style.height = c.beforeHeight + "%";
  document.getElementById("insights-compare-after-bar").style.height = c.afterHeight + "%";
  document.getElementById("insights-compare-caption").textContent = c.caption;
}

function renderExperimentScreen(day) {
  const runningSection = document.getElementById("experiment-running-section");
  const suggestedSection = document.getElementById("experiment-suggested-section");

  if (day.experiment && day.experiment.day < day.experiment.total) {
    runningSection.hidden = false;
    const ex = day.experiment;
    document.getElementById("experiment-progress-ring").style.setProperty("--progress", ex.pct);
    document.getElementById("experiment-progress-label").innerHTML = `Day ${ex.day}<br>/${ex.total}`;
    document.getElementById("experiment-running-title").textContent = `${ex.icon} ${ex.name}`;
    document.getElementById("experiment-running-caption").textContent = `${ex.total - ex.day}日、続けてみましょう`;
  } else {
    runningSection.hidden = true;
  }

  // Free tier: show the suggested-next card only when nothing is currently running
  if (!day.experiment || day.experiment.day >= day.experiment.total) {
    if (day.next) {
      suggestedSection.hidden = false;
      document.getElementById("experiment-suggest-reason").textContent = day.next.reason;
      document.getElementById("experiment-suggest-title").textContent = `${day.next.icon} ${day.next.title.split("・")[0]}`;
      document.getElementById("experiment-suggest-hypothesis").textContent = day.next.hypothesis;
      document.getElementById("experiment-suggest-observe").textContent = day.next.observe;
    } else if (day.currentDay === 0) {
      suggestedSection.hidden = false;
      document.getElementById("experiment-suggest-reason").textContent = "気になることの記録から、少しずつ提案が見えてきます";
      document.getElementById("experiment-suggest-title").textContent = "🥛 乳製品断ち";
      document.getElementById("experiment-suggest-hypothesis").textContent = "仮説: 乳製品を断つと、肌荒れが減るかもしれません";
      document.getElementById("experiment-suggest-observe").textContent = "観察すること: 肌の調子・気分";
    } else {
      suggestedSection.hidden = true;
    }
  } else {
    suggestedSection.hidden = true;
  }
}

function renderProfileConcern() {
  const el = document.getElementById("profile-concern-line");
  const real = STATE.concerns.filter((c) => c !== "none");
  if (real.length === 0) { el.hidden = true; return; }
  el.hidden = false;
  el.textContent = "気になること: " + real.map((c) => CONCERN_CONTENT[c].label).join("、");
}

function renderHomeRecordStrip() {
  const el = document.getElementById("home-record-strip");
  if (STATE.todayRecorded) {
    el.innerHTML = `
      <div class="record-strip-left">
        <span class="record-strip-icon">📝</span>
        <span>今日の記録</span>
        <span class="record-strip-chips">
          <span>気分 🙂</span><span>睡眠 普通</span><span>肌 普通</span>
        </span>
      </div>
      <span class="record-strip-done">完了 ✓</span>
    `;
  } else {
    el.innerHTML = `
      <div class="record-strip-left">
        <span class="record-strip-icon">📝</span>
        <span>今日はまだ記録していません</span>
      </div>
      <button class="record-strip-cta" data-nav="record">10秒で記録</button>
    `;
  }
  document.querySelectorAll("#home-record-strip [data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.nav));
  });
}

function renderAll() {
  const day = { ...DAY_STATES[STATE.currentDay], currentDay: STATE.currentDay };
  renderHero(day);
  renderHomeMilestone(day);
  renderHomeRecordStrip();
  renderHomeInsight(day);
  renderHomeExperiment(day);
  renderHomeResult(day);
  renderHomeNext(day);
  renderRecordFocusBanner(day);
  renderRecordTagHighlight(day);
  renderCalendar(day);
  renderInsightsHighlight(day);
  renderInsightsCompare(day);
  renderExperimentScreen(day);
  renderProfileConcern();

  document.querySelectorAll("#preview-day-row button").forEach((btn) => {
    btn.classList.toggle("active", Number(btn.dataset.day) === STATE.currentDay);
  });
}

/* ===== Toast / Nav / Modal ===== */

function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { toast.hidden = true; }, 2200);
}

function navigateTo(name) {
  document.querySelectorAll(".screen").forEach((s) => {
    s.hidden = s.dataset.screen !== name;
  });
  document.querySelectorAll(".nav-item").forEach((n) => {
    n.classList.toggle("active", n.dataset.nav === name);
  });
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
}

function openModal(kind) {
  const sheet = document.getElementById("modal-sheet");
  const backdrop = document.getElementById("modal-backdrop");
  if (kind === "premium") {
    sheet.innerHTML = `
      <button class="modal-close" data-close-modal>×</button>
      <div class="card-kicker"><span class="card-icon-badge badge-rose">🔬</span><span class="card-kicker-label">PLAN</span></div>
      <div class="plan-heading" style="color:var(--plum)">Premium</div>
      <p class="plan-tagline">自分の体をもっと深く理解する</p>
      <ul class="plan-list">
        <li>Insights全履歴の閲覧</li>
        <li>周期×体調の長期トレンド</li>
        <li>パターンカレンダー全期間表示</li>
      </ul>
      <button class="btn-primary" data-action="mock-upgrade">Premiumにする（プロトタイプ）</button>
      <button class="modal-later" data-close-modal>あとで</button>
    `;
  } else {
    sheet.innerHTML = `
      <button class="modal-close" data-close-modal>×</button>
      <div class="card-kicker"><span class="card-icon-badge badge-gold">🔭</span><span class="card-kicker-label">PLAN</span></div>
      <div class="plan-heading" style="color:#a8781f">Pro</div>
      <p class="plan-tagline">改善実験をもっと進める</p>
      <ul class="plan-list">
        <li>カスタム実験の作成</li>
        <li>複数実験の同時進行</li>
        <li>AIによる次の実験提案</li>
        <li>Research Contribution Badge</li>
      </ul>
      <button class="btn-primary gold" data-action="mock-upgrade">Proにする（プロトタイプ）</button>
      <button class="modal-later" data-close-modal>あとで</button>
    `;
  }
  backdrop.hidden = false;
}

function closeModal() {
  document.getElementById("modal-backdrop").hidden = true;
}

/* ===== Onboarding ===== */

function startApp() {
  document.getElementById("screen-onboarding").hidden = true;
  document.getElementById("nav-bar").hidden = false;
  navigateTo("home");
}

/* 「気になること」選択直後に軽い仮説候補を提示（オンボーディングを「実験ノートを開く」体験に濃厚化） */
function updateOnboardingSuggestion() {
  const box = document.getElementById("onboarding-suggestion");
  const textEl = document.getElementById("onboarding-suggestion-text");
  if (STATE.concerns.length === 0) { box.hidden = true; return; }
  const primary = STATE.concerns[0];
  const content = CONCERN_CONTENT[primary] || CONCERN_CONTENT.none;
  textEl.textContent = content.onboarding;
  box.hidden = false;
}

function initOnboarding() {
  const chipGrid = document.getElementById("onboarding-concern-chips");
  chipGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    const concern = btn.dataset.concern;
    if (concern === "none") {
      chipGrid.querySelectorAll("button").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      STATE.concerns = ["none"];
    } else {
      chipGrid.querySelector('[data-concern="none"]').classList.remove("selected");
      btn.classList.toggle("selected");
      STATE.concerns = Array.from(chipGrid.querySelectorAll("button.selected")).map((b) => b.dataset.concern);
    }
    updateOnboardingSuggestion();
  });

  document.getElementById("btn-onboarding-start").addEventListener("click", () => {
    STATE.onboardingDone = true;
    STATE.currentDay = 0;
    renderAll();
    startApp();
    showToast("ようこそ。まずは3日間、記録してみましょう");
  });

  document.getElementById("btn-review-onboarding").addEventListener("click", () => {
    document.getElementById("nav-bar").hidden = true;
    document.querySelectorAll(".screen").forEach((s) => { s.hidden = true; });
    document.getElementById("screen-onboarding").hidden = false;
  });
}

/* ===== Preview day switcher (review tool, not production UI) ===== */

function initPreviewDaySwitcher() {
  document.getElementById("preview-day-row").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    STATE.currentDay = Number(btn.dataset.day);
    renderAll();
    navigateTo("home");
    showToast(`プレビュー: Day ${STATE.currentDay} の見え方に切り替えました`);
  });
}

/* ===== Nav / Modal / Record form init ===== */

function initNav() {
  document.querySelectorAll(".nav-item[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.nav));
  });
  document.querySelectorAll(".card-cta[data-nav], .btn-gold[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => navigateTo(btn.dataset.nav));
  });
}

function initModal() {
  document.querySelectorAll("[data-open]").forEach((btn) => {
    btn.addEventListener("click", () => openModal(btn.dataset.open));
  });
  document.getElementById("modal-backdrop").addEventListener("click", (e) => {
    if (e.target.id === "modal-backdrop") closeModal();
  });
  document.addEventListener("click", (e) => {
    if (e.target.matches("[data-close-modal]")) closeModal();
    if (e.target.matches("[data-action='mock-upgrade']")) {
      closeModal();
      showToast("プロトタイプのため実際の課金は発生しません");
    }
    if (e.target.matches("[data-action='start-experiment']")) {
      showToast("実験を開始しました（ダミー）");
    }
  });
}

function initRecordForm() {
  document.querySelectorAll(".emoji-picker, .chip-group").forEach((group) => {
    group.addEventListener("click", (e) => {
      const btn = e.target.closest("button");
      if (!btn) return;
      group.querySelectorAll("button").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
    });
  });

  document.getElementById("record-tag-grid").addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;
    btn.classList.toggle("selected");
  });

  document.getElementById("btn-submit-record").addEventListener("click", () => {
    const btn = document.getElementById("btn-submit-record");
    STATE.todayRecorded = true;
    btn.classList.add("submit-success");
    btn.textContent = "記録しました ✓";
    setTimeout(() => {
      renderHomeRecordStrip();
      showToast("今日の記録を保存しました");
      navigateTo("home");
      btn.classList.remove("submit-success");
      btn.textContent = "記録する";
    }, 550);
  });
}

function init() {
  initOnboarding();
  initPreviewDaySwitcher();
  initNav();
  initModal();
  initRecordForm();
  renderAll();
}

document.addEventListener("DOMContentLoaded", init);
