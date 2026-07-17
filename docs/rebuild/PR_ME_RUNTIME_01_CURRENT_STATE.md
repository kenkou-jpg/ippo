# PR-ME-RUNTIME-01: Me / Consent / Research現状確認

対象: Me/Consent/Research Phase着手前の現状確認。コード変更なし（調査のみ）。

## 1. Research Contribution Badgeは既に実装・接続済み（着手不要）

Founder指定の順序「Me → Consent UI → Research Consent → Research
Contribution Badge」のうち、**Research Contribution Badgeは既に完了済み**
だった（`src/modules/home-next/home-next-status.js:828`
`buildResearchBadge()`、PR-P2-04・FOUNDER_FINAL_DECISIONS.md
IMPL-FD-3）。表示条件はResearch Consent同意済み+記録365日以上、抽象的な
貢献度表現のみで実データ（`window.ippoConsent.isResearchConsentGranted()`）
に接続されている。追加実装は不要。

## 2. 現行のResearch Consent実装

**正実装**: `src/services/consent-service.js`（PR-P2-06）。

- localStorage backed（`ippo_consent` / `ippo_consent_events`）。
  ファイル冒頭コメントに明記: 「将来`src/repositories/consent/
  consent-repository.js`（ConsentRepositoryImpl、PR-018、DI登録済みだが
  どの画面にも未接続）へ移行する際、ドロップイン置換になるよう
  ストレージ形状を意図的に合わせてある」— Experiment/Billingで見た
  「正ドメインはDI登録済みだが未接続、実際はシンプルな独立実装が稼働中」
  という**同一パターン**がConsentにも存在する
- 同意レベル: `0=未同意, 1=PLATFORM, 2=PLATFORM+RESEARCH, 3=+COMMERCIAL`。
  このサービスはRESEARCH境界（Level 2）のみを管理する
- UI: `app.html`内の設定画面（`src/screens/settings.html`ではなく、
  レガシーの大きなインラインHTML側）に1行のトグル形式で存在
  （`研究への協力（匿名データ提供）` / サブテキストで同意状態表示、
  タップで`toggleResearchConsent()` → `showConfirmModal()`で確認）
- **Supabase同期なし**: 現状は完全にローカルのみ（デバイス間・再インストール
  間で同意状態が引き継がれない）。Research Contribution Badge表示条件が
  この同意状態に依存しているため、デバイスを変えたユーザーは同意を
  再度行う必要がある（既知の制約、今回の調査で新たに判明）

## 3. 最重要発見: PrototypeにConsent UIの設計が存在しない

`prototype/index.html`全体を検索しても、「研究」「同意」「consent」に
該当する記述は**「Research Contribution Badge」という単語がProプランの
特典リスト内に1箇所あるのみ**。Research Consentのトグル・説明文・
専用画面のいずれもPrototypeには存在しない。

つまり、Home/Experiment/Insights/Billingで行ってきた「Prototypeの画面を
そのまま本番へ表示専用移植する」という手順が、**Consent UIについては
適用できない**（移植元が無い）。新規にUIを設計するとなると、同意文言・
UI構成の決定を伴うため、Founder指示の停止条件
（「同意文言・同意レベル・法的内容を変更する場合は停止」）に抵触する
リスクが高い。

## 4. Me画面の現状

Prototype `#screen-me`（本セッション内で既読・PR-BILLING-RUNTIME-02検討時）
は以下で構成される:
- profile-block（アバター・名前・現在のプラン表示・プレビュー用concern行）
- onboarding-card（プライバシー再保証の静的文言「あなたの記録は、あなた
  だけが見られます。第三者への共有・公開は行いません」— Consentの
  同意取得ではなく既存の安心材料コピー、変更対象ではない）
- plan-card-premium / plan-card-pro（**PR-BILLING-RUNTIME-02で
  `billing-next`として既に実装済み**、内容重複）
- settings-list（通知設定・データのエクスポート・アカウント・
  気になることを変更する・ヘルプ、5つの遷移行のみ、他画面へのリンクで
  実装詳細はここに無い）
- preview-block（「Founderレビュー用の機能です。本番には含まれません」と
  明記された開発者専用プレビューツール、**production対象外**）

Production側に`me-next`相当の画面はまだ存在しない。

## 5. 結論・提案スコープ

```
a. Research Contribution Badge → 対応不要（既に完了済み）
b. Me画面のRuntime統合 → 実施可能。ただしPlan Card部分は
   billing-nextと重複するため、Me画面からbilling-nextを呼び出す形にするか、
   Me画面側では静的な現在プラン表示のみに留めるか、設計判断が必要
   （Founder確認は不要な軽微な実装判断と考えるが、念のため次PRの冒頭で
   確認する）
c. Consent UI（Research Consent） → **Prototype設計が存在しないため、
   このセッションでは新規UI作成を見送る**。現行の1行トグル
   （app.html内・consent-service.js）は機能的に完結しており、
   Founder指示の停止条件（同意文言・レベル変更）に触れずに
   「移植」する対象が無い状態
```

**次に安全に進められる範囲**: Me画面のRuntime統合（PR-ME-RUNTIME-02〜04、
Home/Experiment/Insights/Billingと同じRead-onlyパターン）。Consent UIの
Prototype設計自体はFounder Decision待ちとして記録し、Me画面統合とは
独立して進める。

## Next

PR-ME-RUNTIME-02（Prototype Me画面の表示専用Runtime統合、Feature Flag
`ippo_me_ui_v2` デフォルトOFF、settings-listの5行は遷移リンクのみのため
実装しplan-card部分はbilling-nextへの遷移導線として扱う）
