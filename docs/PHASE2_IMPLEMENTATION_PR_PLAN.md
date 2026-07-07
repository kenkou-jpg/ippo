# PHASE2 IMPLEMENTATION PR PLAN
## General Release〜Phase2 実装PR計画（Governance準拠版）

---

> **【2026-07-07 追記】** 全Founder Decisionは[FOUNDER_FINAL_DECISIONS.md](FOUNDER_FINAL_DECISIONS.md)で
> 確定済み（最終判定: IMPLEMENTATION READY）。PR-P2-05は「Ready・ただし実施順序は最後」。
> 新規 **PR-P2-06（Research Consent UI、GRX-FD-3確定により追加）** をPart Bに追加すること。
>
> 本文書は [PHASE2_GOVERNANCE.md](PHASE2_GOVERNANCE.md) のルールに従い、
> [IMPLEMENTATION_SEQUENCE.md](IMPLEMENTATION_SEQUENCE.md) / [GENERAL_RELEASE_EXPERIENCE_COUNCIL.md](GENERAL_RELEASE_EXPERIENCE_COUNCIL.md) /
> [PHASE2_IMPLEMENTATION_COUNCIL.md](PHASE2_IMPLEMENTATION_COUNCIL.md) / [PHASE2_ARCHITECTURE_FREEZE.md](PHASE2_ARCHITECTURE_FREEZE.md)
> の全決定を統合した、実行可能なPR計画である。**コード変更・実装は行っていない。**
> 各PRの実装者は、着手前に必ず [PHASE2_GOVERNANCE.md](PHASE2_GOVERNANCE.md) 該当章を確認すること。

---

**文書番号:** IPPO-PHASE2-PRPLAN-001
**作成日:** 2026-07-07
**前提文書:** PHASE2_GOVERNANCE.md / IMPLEMENTATION_SEQUENCE.md / GENERAL_RELEASE_EXPERIENCE_COUNCIL.md / PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md / PHASE2_IMPLEMENTATION_COUNCIL.md / PHASE2_ARCHITECTURE_FREEZE.md

---

## 全体依存関係図

```
Founder Decision（コード不要）
  FD-1(価格) ─────────────────┐
  IMPL-FD-1(既存資産再利用) ────┼──────────────────────┐
  IMPL-FD-2(tier分離順序) ─────┤                      │
  FREEZE-FD-1(課金ブランド体系)─┘                      │
                                                       │
General Release（UXグループ: UX-GR）                    │
  PR-EXP-01 ─┐                                        │
  PR-EXP-04 ─┼─ 並行実装可（Founder Decision不要）        │
  PR-EXP-05 ─┘                                        │
  PR-EXP-02 ── Phase2着手より必ず先に完了必須              │
  PR-EXP-03 ── FD-1が理想（暫定価格でも着手可）             │
       │                                              │
       ▼                                              │
  GRX-FD-1/2（実環境検証）→ Release Preparation Council   │
       │                                              │
       ▼                                              │
  General Release                                     │
       │                                              ▼
       └──────────────────────────────→ Phase2 PR群 着手可能化
                                                       │
Phase2（UXグループ: UX-D, UX-F 中心）                    │
  PR-P2-03（独立、Founder Decision不要） ←───────────────┤
  PR-P2-01 → PR-P2-02（IMPL-FD-1確定後、companion-intelligence.js接続共有）
                                                       │
  PR-P2-04（IMPL-FD-3確定後、UX-E）                      │
  PR-P2-05（FREEZE-FD-1 + IMPL-FD-2確定後、UX-C）          │
```

---

## Part A: General Release PR群

### PR-EXP-01 — ボトムナビ4アイコン描画復旧

```
UXグループ:     UX-A（Home体験）を含む全画面共通のNavigation基盤
対象ファイル:   src/app-legacy.js（initNavIcons()の呼び出しタイミング）
Founder Decision: なし（着手可能）
Governance参照: PHASE2_GOVERNANCE.md 1-G（アイコンサイズ、変更なし・復旧のみ）
Browser Verification: フレッシュリロード直後・複数回リロードで
                       nav-icon-home/insights/settings/plusの4要素に
                       空でないinnerHTMLが入ることを確認
Regression対象: 全画面でのタブ切り替え動作
Rollback方針:   呼び出し箇所を元のDOMContentLoadedリスナーに戻すのみ
完了条件:       全画面で4アイコンが常時表示される
```

### PR-EXP-02 — Insightsヒーローのモバイルレイアウト修正

```
UXグループ:     UX-B（Insights体験）
対象ファイル:   src/screens/insights.html（.ipr-hero系CSS、@media(max-width:767px)ブロック）
Founder Decision: なし（着手可能）
Governance参照: PHASE2_GOVERNANCE.md 1-B（タイポグラフィ、見出し28px以下を維持）
Browser Verification: 375×812/320×568/768px境界の3幅で見出し・リード文が
                       正常な行間で表示されること
Regression対象: Insights画面の他要素（PROロックカード等）のレイアウト
Rollback方針:   追加したCSSプロパティの削除で即時ロールバック
完了条件:       全モバイル幅でヒーローが正常表示される
**重要な依存関係**: 本PRはPhase2のPR-P2-02（Insightsタブ追加）より必ず先に完了させること
                    （PHASE2_ARCHITECTURE_FREEZE.md第2章、崩れたレイアウトの上に
                     新規カードを積むと複合的に崩れるため）
```

### PR-EXP-03 — Premium画面ヒーロー（価格・比較表・CTA）復旧

```
UXグループ:     UX-C（Premium体験）
対象ファイル:   app.html（#pro-hero）、premium関連JSモジュール（要調査）
Founder Decision: FD-1（価格の不整合）が理想。未決定でも着手可能
Governance参照: PHASE2_GOVERNANCE.md 1-I（Badge表現規則）、1-J（Premiumカード表現規則）
特記事項:       価格・CTA文言はハードコードせず設定値参照方式にすること
                （FREEZE-FD-1でtier名称が変わる際の手戻り防止、
                 PHASE2_ARCHITECTURE_FREEZE.md第13章より）
                3層tier比較表は作らない（2層のまま、PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md第5章）
Browser Verification: CTAボタンのクリックからCheckout遷移までの確認
Regression対象: 各PROカードのpremiumGate()クリック時の挙動
Rollback方針:   描画ロジックのみの変更のため、変更前状態への復帰で対応可能
完了条件:       価格・CTAが表示され、購入導線が機能する
Release Risk:   **高**（収益機能の入口）
```

### PR-EXP-04 — Home週間行の日付・記録表示復旧

```
UXグループ:     UX-A（Home体験）
対象ファイル:   src/modules/home-renderer.js（buildHomeWeekRow）
Founder Decision: なし（着手可能）
Governance参照: PHASE2_GOVERNANCE.md 2章（Home最大6ブロック、本PRは既存ブロックの修正のため上限に影響しない）
Browser Verification: 記録0件時・保存直後で週間行に7日分の日付と記録マークが表示されること
Regression対象: Home画面の他要素（CTA状態等）
Rollback方針:   表示ロジックの変更のみで即時ロールバック可能
完了条件:       週間行に日付・記録有無が正しく表示される
```

### PR-EXP-05 — ボトムナビラベル・Premium下部余白の軽微調整

```
UXグループ:     UX-A（Navigation）・UX-C（Premium）
対象ファイル:   ナビゲーションCSS（.nav-item関連）、Premium画面CSS（.pf-grid下部余白）
Founder Decision: なし（着手可能）
Governance参照: PHASE2_GOVERNANCE.md 1-D（ボタン高さ・タップ領域、44px基準を維持）
Browser Verification: 「カレンダー」ラベルが1行に収まること、Premium最下部カードが
                       ボトムナビに隠れず全体が見えること
Regression対象: 他ナビラベルの表示崩れ
Rollback方針:   CSSのみの変更で即時ロールバック可能
完了条件:       折り返り・occlusionが解消される
```

---

## Part B: Phase2 PR群

**着手前提**: Part A（PR-EXP-01・02・03）の完了、およびGRX-FD-1/2の実環境再検証完了（[IMPLEMENTATION_SEQUENCE.md](IMPLEMENTATION_SEQUENCE.md) Stage4）。

### PR-P2-01 — hn-experiment-card実装（Home）

```
UXグループ:     UX-A（Home体験）/ UX-D（Experiment体験）
対象ファイル:   src/modules/home-renderer.js、src/services/companion-intelligence.js（接続）
Founder Decision: IMPL-FD-1（companion-intelligence.js再利用可否）確定後
Governance参照: PHASE2_GOVERNANCE.md 2章（Home最大6ブロック=本要素で上限到達、以後Home追加禁止）、
                3章（Popup乱用禁止、AIが主役になるUI禁止）
表示条件:       isPremium()=true かつ 直近7日以内に記録がある かつ 週1回制限
Browser Verification: 記録0件時に非表示、週1回のみ表示されること
Regression対象: Home画面の他要素（CTA・週間行）
Rollback方針:   表示条件をfalse固定にする変更で即時非表示化
完了条件:       PHASE2_ARCHITECTURE_FREEZE.md UX-A完成条件（第11章）を満たす
```

### PR-P2-02 — ins-question-card実装（Insights）

```
UXグループ:     UX-B（Insights体験）/ UX-F（AI体験）
対象ファイル:   src/screens/insights.html、src/services/companion-intelligence.js（接続共有）
Founder Decision: IMPL-FD-1確定後。PR-P2-01と同一のcompanion-intelligence.js接続作業を
                  共有するため、PR-P2-01の直後に着手することを推奨
Governance参照: PHASE2_GOVERNANCE.md 2章（Insights同時表示4要素以内、タブ切り替えで担保）、
                6章（Value Ladder維持、③改善の穴を埋める中核PR）
前提:           **PR-EXP-02完了が必須**（レイアウト修正なしにタブ追加は行わない）
表示条件:       isPremium()=true かつ 直近7日以内に記録がある かつ 週1回制限、
                2週間再表示しない
Browser Verification: 回答後に選択内容が保存されること、2週間以内に同じ問いが
                       再表示されないこと
Regression対象: 既存のins-clinical-summary等、他タブの表示
Rollback方針:   タブ自体を非表示にする設定値で即時ロールバック可能
完了条件:       PHASE2_ARCHITECTURE_FREEZE.md UX-B完成条件（第11章）を満たす
```

### PR-P2-03 — ins-trend-cards/correlation-chart/medical-reportのタブ統合

```
UXグループ:     UX-B（Insights体験）
対象ファイル:   src/screens/insights.html（タブ統合のみ）
Founder Decision: なし（既存ロジック活用のため独立着手可能）
Governance参照: PHASE2_GOVERNANCE.md 2章（Insights同時表示4要素以内）
前提:           **PR-EXP-02完了が必須**
既存ロジック:    lag-correlation-engine.js、modules/pro/doctor-summary/（いずれも実装済み）
Browser Verification: 各タブへの遷移、記録30日未満時の相関チャート非表示条件
Regression対象: modules/pro/配下レポート機能が単独で正しく動作することの再確認
Rollback方針:   タブ追加分のみのロールバックで即時対応可能
完了条件:       PHASE2_ARCHITECTURE_FREEZE.md UX-B完成条件を満たす
```

### PR-P2-04 — Research Contribution Badge

```
UXグループ:     UX-E（Research体験）
対象ファイル:   home-renderer.js（Home状態カード末尾）、Premium画面（要調査）
Founder Decision: IMPL-FD-3（開示粒度）確定後に着手
Governance参照: PHASE2_GOVERNANCE.md 3章（Popup乱用禁止=初回表示時のみ祝福演出、
                以後は恒久静的表示）、6章（Value Ladder⑤資産化の完成）
表示条件:       Research Consent同意済み かつ 記録365日以上
Browser Verification: Consent未同意ユーザーには表示されないこと
Regression対象: 既存のConsent関連バックエンド処理（PR-076 Consent Gate）
Rollback方針:   表示条件をfalse固定で即時非表示化
完了条件:       PHASE2_ARCHITECTURE_FREEZE.md UX-E完成条件を満たす
```

### PR-P2-06 — Research Consent UI（新規、GRX-FD-3確定により追加）

```
UXグループ:     UX-E（Research体験）
対象ファイル:   Settings画面（新規Consent管理項目）
Founder Decision: GRX-FD-3確定済み（Phase2実装、FOUNDER_FINAL_DECISIONS.md）
Governance参照: PHASE2_GOVERNANCE.md 2章（Settings新カテゴリ追加はFounder承認必須。
                個別UI文言は別途承認を得ること）
推奨実施時期:   PR-P2-04（Research Contribution Badge）と同時期
                （Badgeの表示条件がConsent同意を前提とするため）
Browser Verification: 同意/非同意の選択が正しくバックエンド（PR-076 Consent Gate）に反映されること
Regression対象: 既存のConsent関連バックエンド処理
Rollback方針:   UIを非表示にすることで即時ロールバック可能（バックエンドのデフォルト
                non-consent状態は変更しない）
完了条件:       ユーザーがResearch Consentの同意/撤回を明示的に行えるUIが提供される
```

### PR-P2-05 — tier分離（isPremium()→getTierLevel()拡張）+ Premium比較表UI

```
UXグループ:     UX-C（Premium体験）
対象ファイル:   src/modules/premium/premium-service.js、Premium画面比較表UI
Founder Decision: **FREEZE-FD-1（課金ブランド体系の決定）確定後**、
                  IMPL-FD-2（tier分離の実施順序）に従う
Governance参照: PHASE2_GOVERNANCE.md 4章（Tier Branding Architecture、本PR最大の前提）、
                2章（Premium比較項目最大6件）
推奨順序:       PR-P2-01〜04（機能実装）を先に行い、tier分離は最後に行う
                （IMPL-FD-2でCouncilが推奨した順序、手戻りが少ないため）
Browser Verification: 新tier名称での比較表表示、価格・CTAの正確性
Regression対象: PR-EXP-03で復旧した価格・CTA表示との整合
Rollback方針:   tier分離ロジックを2層のまま維持することで即時ロールバック可能
完了条件:       PHASE2_ARCHITECTURE_FREEZE.md UX-C完成条件を満たし、
                FREEZE-FD-1で決定したブランド名称が正しく反映される
```

---

## Founder Decision 総覧（着手前に確認すべき全項目）

| ID | 内容 | ブロックするPR |
|---|---|---|
| FD-1 | 価格の不整合解消 | PR-EXP-03（理想、必須ではない） |
| IMPL-FD-1 | companion-intelligence.js等の再利用可否 | PR-P2-01, PR-P2-02 |
| IMPL-FD-2 | tier分離の実施順序 | PR-P2-05 |
| IMPL-FD-3 | Research Contribution Badgeの開示粒度 | PR-P2-04 |
| IMPL-FD-4 | Phase3着手条件の監視主体 | Phase3全般（本計画のスコープ外） |
| FREEZE-FD-1 | 課金ブランド体系の決定 | PR-P2-05（最重要） |
| GRX-FD-1 | 実環境（Supabase接続）でのオンボーディング・Premium導線再検証 | Release Preparation Council進行 |
| GRX-FD-2 | premiumGate()クリック時の実際の挙動確認 | Release Preparation Council進行 |
| GRX-FD-3 | Research Consent専用UIの要否 | Settings画面の将来変更（本計画では非対応） |

---

## 完了条件サマリー（全体）

```
Part A完了条件: PR-EXP-01・02・04・05が実装・検証完了し、
               PR-EXP-03がGRX-FD-1/2の実環境再検証を経て
               Release Preparation Councilへ進行可能な状態になること

Part B完了条件: PR-P2-01〜05が[PHASE2_ARCHITECTURE_FREEZE.md]第11章の
               各UX完成条件（UX-A〜F）を満たし、かつ[PHASE2_GOVERNANCE.md]の
               Design System Freeze・Information Density Freeze・
               禁止事項のいずれにも抵触しないこと
```

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-PHASE2-PRPLAN-001 |
| **作成日** | 2026-07-07 |
| **前提文書** | PHASE2_GOVERNANCE.md / IMPLEMENTATION_SEQUENCE.md / GENERAL_RELEASE_EXPERIENCE_COUNCIL.md / PHASE2_EXPERIENCE_INTEGRATION_COUNCIL.md / PHASE2_IMPLEMENTATION_COUNCIL.md / PHASE2_ARCHITECTURE_FREEZE.md |
| **コード変更** | ゼロ（計画のみ） |
| **次回改訂トリガー** | 各PR完了時 / Founder DecisionがFD-1・IMPL-FD-1〜4・FREEZE-FD-1を確定した時 |
