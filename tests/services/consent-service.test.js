// tests/services/consent-service.test.js
// PR-P2-06 (Consent UI): 保存ロジック(localStorage)・レベル遷移・撤回導線の単体テスト。
// DOM描画(renderResearchConsentStatus)自体はBrowser Verificationで代替。

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getConsentState,
  isResearchConsentGranted,
  grantResearchConsent,
  withdrawResearchConsent,
  toggleResearchConsent,
} from '../../src/services/consent-service.js';

describe('consent-service', () => {
  beforeEach(() => {
    localStorage.clear();
    delete window.showConfirmModal;
  });

  it('初期状態はLevel 0（未同意）を返す', () => {
    expect(getConsentState()).toEqual({ level: 0, grantedAt: null, updatedAt: null });
    expect(isResearchConsentGranted()).toBe(false);
  });

  it('grantResearchConsentでLevel 2（RESEARCH許諾）へ遷移する', () => {
    grantResearchConsent();
    const state = getConsentState();
    expect(state.level).toBe(2);
    expect(state.grantedAt).toBeTruthy();
    expect(isResearchConsentGranted()).toBe(true);
  });

  it('withdrawResearchConsentでLevel 0へ戻り、grantedAtは保持される', () => {
    grantResearchConsent();
    const grantedAt = getConsentState().grantedAt;
    withdrawResearchConsent();
    const state = getConsentState();
    expect(state.level).toBe(0);
    expect(state.grantedAt).toBe(grantedAt);
    expect(isResearchConsentGranted()).toBe(false);
  });

  it('grant/withdrawのたびにconsent_eventsへappend-onlyでイベントを記録する', () => {
    grantResearchConsent();
    withdrawResearchConsent();
    const events = JSON.parse(localStorage.getItem('ippo_consent_events'));
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ eventType: 'GRANTED', fromLevel: 0, toLevel: 2 });
    expect(events[1]).toMatchObject({ eventType: 'REVOKED', fromLevel: 2, toLevel: 0 });
  });

  it('未同意時、toggleResearchConsentは同意を促すメッセージでshowConfirmModalを呼ぶ', () => {
    const calls = [];
    window.showConfirmModal = (message, onConfirm) => calls.push({ message, onConfirm });
    toggleResearchConsent();
    expect(calls).toHaveLength(1);
    expect(calls[0].message).toContain('同意しますか');
    calls[0].onConfirm();
    expect(isResearchConsentGranted()).toBe(true);
  });

  it('同意済み時、toggleResearchConsentは撤回確認メッセージでshowConfirmModalを呼ぶ', () => {
    grantResearchConsent();
    const calls = [];
    window.showConfirmModal = (message, onConfirm) => calls.push({ message, onConfirm });
    toggleResearchConsent();
    expect(calls).toHaveLength(1);
    expect(calls[0].message).toContain('撤回しますか');
    calls[0].onConfirm();
    expect(isResearchConsentGranted()).toBe(false);
  });

  it('showConfirmModal未定義時は確認なしで即座に同意状態を反映する', () => {
    toggleResearchConsent();
    expect(isResearchConsentGranted()).toBe(true);
  });
});
