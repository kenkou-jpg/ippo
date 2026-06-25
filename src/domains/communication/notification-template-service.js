// NotificationTemplateService — generates user-facing notification text.
// All copy is UX-reviewed: "Case" is never shown to users (ProfileFormation UX rule).
// PR-023: Communication Layer

import { NOTIFICATION_TYPES } from './notification-schedule-service.js';

/**
 * @typedef {{ title: string, body: string, cta: string }} NotificationTemplate
 */

const TEMPLATES = Object.freeze({
  [NOTIFICATION_TYPES.DAY1_RECORD]: {
    title: '記録を続けましょう',
    body:  '昨日の続きも記録してみましょう。毎日の積み重ねがプロフィール形成に役立ちます。',
    cta:   '記録する',
  },
  [NOTIFICATION_TYPES.DAY3_EXPERIMENT_NUDGE]: {
    title: '試してみませんか？',
    body:  '試してみたいことを記録しませんか？小さな変化を試すことで新しい発見があります。',
    cta:   '試したいことを記録する',
  },
  [NOTIFICATION_TYPES.DAY7_SUMMARY]: {
    title: '1週間お疲れさまでした',
    body:  '1週間の振り返りを確認しましょう。あなたの記録がパターンを可視化しています。',
    cta:   '振り返りを見る',
  },
  [NOTIFICATION_TYPES.DAY15_PROFILE_FORMING]: {
    title: 'プロフィール形成中です',
    body:  'あなたのプロフィールが形成されています。記録を続けることでプロフィールが完成します。',
    cta:   '記録を続ける',
  },
  [NOTIFICATION_TYPES.PROFILE_READY]: {
    title: 'プロフィールが完成しました',
    body:  'あなたのプロフィールが完成しました。これまでの記録が形になりました。',
    cta:   'プロフィールを確認する',
  },
  [NOTIFICATION_TYPES.OUTCOME_REMINDER]: {
    title: '結果を記録しましょう',
    body:  '試みた内容の結果を記録しましょう。記録することで次のステップに進めます。',
    cta:   '結果を記録する',
  },
  [NOTIFICATION_TYPES.CONSENT_MOTIVATION]: {
    title: '貢献範囲を広げましょう',
    body:  '同意設定を更新することで、女性疾患研究への貢献範囲が広がります。',
    cta:   '同意設定を確認する',
  },
});

export class NotificationTemplateService {
  /**
   * Returns the notification template for the given type.
   * Returns null for unknown types.
   *
   * @param {string} notificationType
   * @returns {NotificationTemplate|null}
   */
  getTemplate(notificationType) {
    return TEMPLATES[notificationType] ?? null;
  }

  /**
   * Returns all available templates keyed by type.
   * @returns {Record<string, NotificationTemplate>}
   */
  getAllTemplates() {
    return { ...TEMPLATES };
  }
}
