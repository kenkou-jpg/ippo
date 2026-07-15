// ============================================================
//  ippo – experiment-progress.js
//  PR-EXP-RUNTIME-02: startDate/days から Day X/total を算出する純粋関数。
//  副作用なし・UI/Repository非依存。Business Logic層の新設ではなく、
//  home-next-hero.js の周期日数計算（Day 1 = 開始日、+1 する規約）と
//  同じ既存の日数カウント慣習に合わせた単一の算出関数のみを提供する。
// ============================================================

/**
 * @param {{ startDate: string, days: number, today?: Date }} params
 * @returns {{ currentDay: number, totalDays: number, progressPercent: number, isCompleted: boolean } | null}
 *   startDate が欠落・不正な日付の場合は null（安全なfallback）。
 */
export function computeExperimentProgress({ startDate, days, today } = {}) {
  const totalDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : null;
  if (!totalDays) return null;

  const start = new Date(startDate);
  if (isNaN(start.getTime())) return null;

  const now = today instanceof Date && !isNaN(today.getTime()) ? today : new Date();

  // Day 1 = 開始日（home-next-hero.js buildCycleText() と同じ +1 規約）。
  // 未来日startDate（今日 < 開始日）は Day 1 に丸める。
  const startMidnight = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const nowMidnight   = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const elapsedDays   = Math.floor((nowMidnight - startMidnight) / 86400000);

  const currentDay = Math.max(1, elapsedDays + 1);
  const isCompleted = currentDay > totalDays;
  const progressPercent = Math.min(100, Math.round((Math.min(currentDay, totalDays) / totalDays) * 100));

  return { currentDay: Math.min(currentDay, totalDays), totalDays, progressPercent, isCompleted };
}
