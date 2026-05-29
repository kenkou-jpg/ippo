// ================================================================
//  ippo – src/modules/pro/shared/render/index.js
//  PRO shared render primitives — barrel export
//
//  各 PRO feature はここから import する。
//
//  import {
//    renderMetricRow, renderStatCard, renderSummarySection,
//    renderAlertBox, renderEmptyState,
//    renderTimeline, renderAISummaryCard,
//  } from '../shared/render/index.js';
//
//  shared化の条件:
//    1. 2つ以上の feature で利用
//    2. feature 非依存の責務
//    3. state / routing に依存しない
// ================================================================

export { renderMetricRow }      from './renderMetricRow.js';
export { renderStatCard }       from './renderStatCard.js';
export { renderSummarySection } from './renderSummarySection.js';
export { renderAlertBox }       from './renderAlertBox.js';
export { renderEmptyState }     from './renderEmptyState.js';
export { renderTimeline }       from './renderTimeline.js';
export { renderAISummaryCard }  from './renderAISummary.js';
