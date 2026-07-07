# FOUNDER DECISION REVIEW — Monetization Council FD-1〜FD-6
## MONETIZATION_COUNCIL_REPORT.md 第9章 Founder判断事項の検討資料

---

> **この文書の役割**: [MONETIZATION_COUNCIL_REPORT.md](MONETIZATION_COUNCIL_REPORT.md) 第9章
> 「Important Founder Decisions」で提起された FD-1〜FD-6 それぞれについて、選択肢・推奨案・リスク・
> General Releaseへの影響・Founderが今決めるべき最小判断を整理し、Founderが意思決定するための
> 検討資料として提供する。本文書はコード変更を一切伴わない（AI_EXECUTION.md準拠）。
> 末尾に、そのまま「採用」と返信できる形の Founder Decision 案を用意した。

---

## FD-1（Critical）— 価格の不整合の解消

### 1. 選択肢

```
A. BBS-001（Founder承認済み公式価格: Premium ¥980/月・Pro ¥1,980/月）を正とし、
   実装済みStripe価格（¥580/月・¥4,800/年）をBBS-001に合わせて修正する

B. 実装済み価格（¥580/¥4,800）を正とし、BBS-001の価格記載を
   事後的に改定する

C. 既存有料ユーザーには¥580のまま適用し（grandfathering）、
   新規ユーザーのみ¥980を適用する
```

### 2. 推奨案

**A**。理由は二つある。第一に、BBS-001は Business Strategy Council が Founder 承認のもとで確定した LEVEL-1 戦略文書であり、Revenue Simulation（`BUSINESS_STRATEGY.md` 8章・10章）や GTM ロードマップ（`GTM_COUNCIL.md` 5章）はすべて ¥980/¥1,980 を前提に組み立てられている。実装済み価格を正としてしまうと、これらの既存戦略文書全体の数値的整合性が崩れる。第二に、`RELEASE_READINESS_COUNCIL.md` の記載によれば現在の MAU は 0 であり、既存の有料ユーザーが存在しない。つまり C の grandfathering を検討する実務上の理由がなく、A を選んでも移行対象者はいない。

### 3. リスク

A を採用する場合のリスクは、Stripe の Price ID・Checkout 文言・premium 画面の価格表示を変更する小規模な実装作業が別途必要になることである。値上げ幅（¥580→¥980 は約1.7倍）が転換率（CVR）にどう影響するかは未知数だが、これはそもそも「実装が先行し、正式決定より低い価格が仮運用されていた」状態を是正するものであり、値上げというより本来の価格への復帰と捉えるべきである。B を採用する場合のリスクは、Founder が既に承認した公式戦略文書を無効化することになり、Business Strategy Council の権威と、そこに紐づく Revenue Simulation・Research License 価格帯（BBS-002）等、他の Binding Decision との整合性が総崩れになることである。C のリスクは、対象ユーザーがゼロの現状において複雑性だけが増し、Founder 一人運営の哲学（`BUSINESS_STRATEGY.md` 2-A）に反することである。

### 4. General Releaseへの影響

A を採用する場合、General Release 前に Stripe Price ID の差し替えと premium 画面の価格表示修正が必要になる。ただし現在ユーザーが存在しないため、既存ユーザーへの通知や移行措置は不要であり、実装コストのみで完結する。

### 5. Founderが今決めるべき最小判断

**BBS-001の価格（¥980/¥1,980）を正とし、実装済みのStripe価格をこれに合わせて修正することに合意するか。** この一点のみで足りる。

---

## FD-2（High）— PRO層の実装時期

### 1. 選択肢

```
A. General Release時点でPRO層（3層目）を実装する
B. PRO層をPhase2に送り、General ReleaseはFREE+STARTERの2層で開始する
C. PRO層自体を見送り、2層構成を恒久化する
```

### 2. 推奨案

**B**。Behavioral Designer の分析（[MONETIZATION_FRAMEWORK.md](business/MONETIZATION_FRAMEWORK.md) 第6章）が示す通り、3層を同時に立ち上げるとプラン間の違いの説明コストが増え、混乱による離脱リスクが生じる。また PRO 層の中核機能（Question Layer・Experiment Suggestion）はそもそも未実装であり（FD-4参照）、機能が伴わないまま3層目を先に出すことは本末転倒である。

### 3. リスク

A のリスクは、開発コストが増えるだけでなく、未実装の PRO 中核機能を欠いたまま3層目を「箱だけ」用意することになり、STARTER との違いが実感できない粗悪な有料層になりかねないことである。B のリスクは、General Release 期間中は PRO 層による追加収益機会を得られないことだが、現状 MAU=0 のため実害は限定的である。C のリスクは、BBS-001 が公式に定めた3層構成という Founder 決定そのものを覆すことになり、Business Strategy Council の決定を無視する形になることである。

### 4. General Releaseへの影響

B を採用する場合、PRO層関連のUI（3層比較画面等）の実装が不要になり、実装スコープが縮小して早期リリースが可能になる（[GENERAL_RELEASE_SCREEN_MAP.md](GENERAL_RELEASE_SCREEN_MAP.md) 第2章参照）。

### 5. Founderが今決めるべき最小判断

**PRO層の実装をGeneral Release後のPhase2に送ることに合意するか。**

---

## FD-3（Low）— プラン呼称の扱い

### 1. 選択肢

```
A. 既存のユーザー向け表示名「Premium」を維持する
B. 「STARTER」という呼称にユーザー向け表示を変更する
```

### 2. 推奨案

**A**。Council文書内で使った「STARTER」はあくまで3層構成を整理するための内部呼称であり、ユーザーに見せる文言を変更する提案ではない（[MONETIZATION_COUNCIL_REPORT.md](MONETIZATION_COUNCIL_REPORT.md) 第4章「却下された案」ですでに却下済み）。

### 3. リスク

B を採用する場合、UI文言の変更（Business Logic/UI変更）が必要になり、かつ「Premium」という既存の呼称にすでに定着している可能性のあるブランド認知を手放すことになる。積極的に変更する理由が見当たらない。A のリスクはほぼない。

### 4. General Releaseへの影響

A を採用すれば影響はない（現状維持）。

### 5. Founderが今決めるべき最小判断

**表示名は「Premium」のまま変更しない、という一言の確認のみ。**

---

## FD-4（High）— Value Ladder断絶（Question Layer / Experiment Suggestion）の解消着手時期

### 1. 選択肢

```
A. Phase2の中で最優先項目としてQuestion Layer/Experiment Suggestionの実装に着手する
B. Phase2の中で他機能と並列の優先度として扱う
C. Phase3以降に先送りする
```

### 2. 推奨案

**A**。[VALUE_LADDER.md](business/VALUE_LADDER.md) と [USER_JOURNEY.md](USER_JOURNEY.md) という異なる分析軸を持つ2つの監査が、独立に同一のギャップ（「理解」から「改善」への断絶）を最重要課題として指摘している。この一致は偶然ではなく、構造的な重要性を裏付けている。

### 3. リスク

A のリスクは、この機能が AI 出力を伴うため `REGULATORY_MEDICAL_COUNCIL.md` BD-045（Signal Insight / Pattern Discovery の出力テンプレートは医師アドバイザーの書面承認が必須）の対象になりうることである。`BUSINESS_STRATEGY.md` FR-B02 が求める医師アドバイザーの招聘がまだ完了していない場合、この実装は医師レビュー待ちで止まる可能性がある。B・C のリスクは、Value Ladder の断絶が放置され続け、STARTER から PRO への転換動機とユーザーの継続動機の両方が弱いままになることである。

### 4. General Releaseへの影響

この機能は Phase2 に属するため、General Release そのものへの影響はない。ただし General Release 直後のロードマップにおける優先順位づけに関わる。

### 5. Founderが今決めるべき最小判断

**Phase2の中でこの機能を最優先に位置づけることに合意するか。** 合意する場合、医師アドバイザー招聘（`BUSINESS_STRATEGY.md` FR-B02）の進捗状況を合わせて把握しておく必要がある（招聘未了の場合、Phase2着手前にこれが前提条件になりうる）。

---

## FD-5（Medium）— Record入力秒数・Empty State・Error文言の実地検証

### 1. 選択肢

```
A. General Release前にブラウザでの実地検証（/verify等）を実施する
B. General Release後の初期運用の中でモニタリングしながら確認する
```

### 2. 推奨案

**A**。本 Council は文書監査のみを行っており、実際の入力体験・Empty State文言・エラー文言の妥当性は未検証である。初回ユーザーが最初につまずく可能性がある箇所であるため、リリース前の軽微な事前検証が望ましい。

### 3. リスク

A のリスクは検証に数時間程度の追加工数がかかることのみである。B のリスクは、実際のユーザーが入力ストレスや不明瞭なエラー文言に直面してから初めて問題に気づくことになり、初回体験での離脱につながる可能性があることである。

### 4. General Releaseへの影響

A を採用した場合、リリース前に軽微な検証工数が発生する。検証の結果、文言修正が必要と判明した場合のみ小規模な実装対応が発生しうるが、これは本文書のスコープ外である。

### 5. Founderが今決めるべき最小判断

**General Release前に実地検証の機会を設けることに合意するか。**

---

## FD-6（Low）— Premium画面価格表示の凍結

### 1. 選択肢

```
A. FD-1の結論が出るまで、premium画面の価格表示（¥580/¥4,800）を現状のまま凍結する
B. FD-1の結論を待たずに、先行してBBS-001価格（¥980/¥1,980）に変更する
```

### 2. 推奨案

**A**。FD-1 は本レビューの中でもっとも重大な論点であり、その結論が出る前に価格表示を動かすことは、Founder の意思決定を先取りする行為になる。

### 3. リスク

B のリスクは、FD-1 の結論と食い違った場合に二重の変更作業が発生することと、Founder確認前の独断的な価格変更が望ましくないことである。A のリスクはほぼない（現状維持のため）。

### 4. General Releaseへの影響

A を採用すれば General Release への影響はない。

### 5. Founderが今決めるべき最小判断

**FD-1の結論が出るまでpremium画面の価格表示に触れない、という一言の確認のみ。**

---

## Founder Decision（案）

以下は Founder がそのまま「採用」と返信することで、Council の推奨案どおりに全件を確定できる形式で用意したものである。一部のみ修正したい場合は、該当 FD 番号と選択肢（A/B/C）を指定して返信すれば、その項目のみ変更して記録する。

```
Founder Decision — Monetization Council FD-1〜FD-6

FD-1: 選択肢A採用 — BBS-001価格（¥980/¥1,980）を正とし、
      実装済みStripe価格を修正する
FD-2: 選択肢B採用 — PRO層はGeneral Release後のPhase2に送る
FD-3: 選択肢A採用 — 表示名「Premium」を維持する
FD-4: 選択肢A採用 — Question Layer/Experiment SuggestionをPhase2最優先とする
FD-5: 選択肢A採用 — General Release前に実地検証を実施する
FD-6: 選択肢A採用 — FD-1決定まで premium画面価格表示を凍結する

決定日: ____________
承認: Founder（kenkou-jpg）
```

Founder がこの案をそのまま「採用」と返信した場合、本文書の該当節に決定日・承認者を記録し、[MONETIZATION_COUNCIL_REPORT.md](MONETIZATION_COUNCIL_REPORT.md) 第9章にも決定内容を反映する。

---

## Document Authority Record

| 項目 | 内容 |
|---|---|
| **文書番号** | IPPO-MONETIZATION-006 |
| **作成日** | 2026-07-07 |
| **前提文書** | MONETIZATION_COUNCIL_REPORT.md 第9章 / business/MONETIZATION_FRAMEWORK.md / business/VALUE_LADDER.md / USER_JOURNEY.md |
| **親文書** | [MONETIZATION_COUNCIL_REPORT.md](MONETIZATION_COUNCIL_REPORT.md) |
| **状態** | Founder決定待ち（未確定） |
| **次回改訂トリガー** | Founderが決定を返信した時 |
