# PR-LAYOUT-03 Report — Layout Depth & Polish

> [IPPO_WORLD_CLASS_LAYOUT_INTEGRATION_COUNCIL.md](IPPO_WORLD_CLASS_LAYOUT_INTEGRATION_COUNCIL.md) のFinal Layout Roadmapで定義された「濃厚化・磨き込み」フェーズ（H/D/E＋ロック中Proカードの好奇心演出＋Record達成フィードバック）を実装。
> 対象: `prototype/index.html` / `prototype/styles.css` / `prototype/app.js`（ダミーデータのみ。Supabase/Stripe/AI API/認証/DB/Business Logic/新規バックエンドは一切なし）。

---

## 実装サマリー

| # | 項目 | 状態 | 実装内容 |
|---|---|---|---|
| H | オンボーディング濃厚化＋Home女性向け軽量シグナル | ✅完了 | 「気になること」チップ選択直後に、選択内容に応じた仮説候補（`.onboarding-suggestion`）を動的表示。PMS/PMDD/PCOS/子宮内膜症/卵巣嚢腫/特にないの6パターンをそれぞれ用意し、「実験ノートを開く」体験に濃厚化した。同じ`CONCERN_CONTENT`データをHome Day0のHero「今日の目的」にも反映し、選択した気になることに応じた文言（例: 「PMSの記録を続けてみましょう」）に差し替わるようにした。Day3以降は各Dayの物語文言を優先し上書きしない |
| D | 直近7日継続ストリップ | ✅完了 | Hero内に`.hero-streak`（7ドット）を軽量統合。新規ブロックは追加せず、Hero既存の情報密度規律を維持。Day0=全て未記録、Day3=直近3日分のみ記録（残りは未到達）、Day7/14=部分的な欠落を含む記録（完璧すぎる印象を避ける）、Day30=7日間すべて記録（習慣が定着した印象）という物語性のある分布にした。「未記録」と「まだ到達していない日」は視覚的に区別せず、達成を責めない設計にした |
| E | 気分ピッカー拡大＋タップフィードバック | ✅完了 | `.emoji-picker button`を40px→48px・font-size 1.25rem→1.5remに拡大。選択時に`emoji-pop`キーフレーム（0.3s、scale 1→1.22→1）を付与し、タップの手応えを追加。`prefers-reduced-motion`で無効化 |
| + | ロック中Proカードの好奇心演出 | ✅完了 | Experiment画面「実験ライブラリ」の「カスタム実験」カードを、`opacity:0.7`による沈み込みから、ゴールド系グラデーション＋「✨ Pro」バッジ＋具体的な誘い文句（「どんな実験を作れるか、のぞいてみる」）に変更。暗くして隠すのではなく、覗いてみたくなる方向に転換した |
| + | Record送信後の達成フィードバック | ✅完了 | 送信ボタンをタップすると即座に「記録しました ✓」＋sage色の`submit-pop`アニメーション（0.4s）に切り替わり、550ms後に元の表示へ戻りつつHomeへ遷移するように変更。過度なゲーミフィケーション（confetti等）は採用せず、静かな一拍のみ |
| 確認 | プレビュー日数切り替えUIの取り扱い | ✅確認のみ | Me画面の「プレビュー: 経過日数」は引き続きFounderレビュー専用の明記付き（`.preview-block`）のまま。本実装直前に削除する前提に変更なし。コード変更は行っていない |

---

## 実装中の設計判断

- **CONCERN_CONTENTへの統合**: 旧`CONCERN_LABELS`（ラベルのみ）を廃止し、`label`/`onboarding`（仮説候補文）/`homeFocus`（Home Day0文言）を1つのオブジェクトに統合した`CONCERN_CONTENT`に置き換えた。同じ「気になること」データソースがオンボーディング・Home・Meの3箇所で一貫して使われる構造にし、Councilが懸念した「応急処置的な女性向けシグナル」ではなく、オンボーディングからHomeまで一本の糸として繋がる設計にした。
- **複数選択時の優先順位**: 複数の「気になること」を選んだ場合、`STATE.concerns`の先頭（＝最初に選んだ項目）を代表として仮説候補とHome文言に使う。厳密な優先順位ロジック（重篤度順など）は実装しておらず、選択順という単純なルールに留めている。
- **継続ストリップの「欠落」表現**: 実データではまだ「記録忘れ」をネガティブに強調する仕組みは作らない方針のため、`missed`（記録忘れ）と`future`（まだ来ていない日）を視覚的に同一（濃く塗らないだけ）にした。データ上は区別しているが、UIでは区別しない。将来「記録忘れを可視化して行動変容を促す」方向に振るかどうかはFounder判断が必要。
- **Record達成フィードバックの遅延**: 550msの遅延はダミー値。実装時（実データ保存を伴う場合）は保存処理の実時間に応じて調整が必要になる。

---

## 変更ファイル

- `prototype/index.html` — オンボーディング仮説候補markup、Hero継続ストリップmarkup、ロック中Proカードのバッジmarkup
- `prototype/styles.css` — `.onboarding-suggestion`、`.hero-streak`/`.streak-dot`、`.emoji-picker`拡大＋`emoji-pop`、`.library-card.locked`再設計＋`.library-card-lock-badge`、`.submit-record.submit-success`＋`submit-pop`を追加。reduced-motionブロックに新規アニメーションを追加
- `prototype/app.js` — `CONCERN_LABELS`を`CONCERN_CONTENT`に統合・置換。`DAY_STATES`各Dayに`streak`配列を追加。`renderHero`をDay0限定の文言差し替え対応に拡張、`renderHeroStreak`を新設。`initOnboarding`のchipクリックハンドラに`updateOnboardingSuggestion`呼び出しを追加。Record送信ハンドラに達成フィードバックの状態切り替え＋遅延ナビゲーションを追加
- `docs/rebuild/PR_LAYOUT_03_REPORT.md` — 本レポート（新規）

---

## Browser Verification

- サーバー: `prototype`ローカルサーバー（`npx serve prototype`、port 5544）で実施。
- 確認方法の注記: 本セッションでは`preview_click`ツール（合成クリックイベント）が要素に実際のクリックを届けない事象が断続的に発生したため（`preview_screenshot`同様の環境要因と推測）、ページ内JavaScript経由での実クリック（`element.click()`）とDOM状態の直接評価（`preview_eval`）で動作を確認した。いずれも実際のイベントリスナー経由の動作であり、モックではない。
- オンボーディング: PMS/子宮内膜症/特にないの切り替えで、仮説候補テキストが正しく動的更新されることを確認。複数選択→「特にない」選択で他の選択が解除されることを確認。
- Home: 「気になること」選択後、Day0のHero「今日の目的」が選択内容に応じた文言に切り替わることを確認（例: PMS選択時「PMSの記録を続けてみましょう」）。Day3/7/14/30では日別の物語文言が優先されることを確認。
- 継続ストリップ: Day0（全7点未記録・末尾のみtodayリング）／Day3（後半3点のみ記録）／Day14（1点欠落を含む記録）／Day30（7点すべて記録）を確認。
- Record: 気分ピッカーのタップで`selected`クラスと`emoji-pop`アニメーションが付与されることを確認。送信ボタンが即座に「記録しました ✓」に切り替わり、550ms後に元の表示に戻りHome画面へ遷移することを確認。
- Experiment: 「カスタム実験」ロックカードに「✨ Pro」バッジが表示され、暗く沈んだ見た目ではなくなっていることを確認。
- 幅: 320px／430pxで横スクロールなしを確認（オンボーディング画面に仮説候補が表示された状態でも確認済み）。
- Console Error: 全操作を通じて0件。

---

## 残る誠実な評価

- **プレビュー環境の制約**: 本セッションの`preview_click`/`preview_screenshot`が不安定だったため、実際のマウスクリックによるピクセル単位の見た目（特に`emoji-pop`や`submit-pop`アニメーションの体感）は検証できていない。ロジック・DOM状態・レイアウト崩れの有無は確認済みだが、最終的な触感の判断はFounderの実機確認が必要。
- **継続ストリップのデータ表現**: 「欠落」を視覚的に区別しない設計は意図的だが、Founderが「記録忘れを可視化した方が継続動機になる」という判断をする場合、再設計が必要になる。
- **仮説候補文言の医学的正確性**: 各疾患向けの仮説候補文（例: 「PMSが気になる方には、生理前の乳製品や糖質の摂取と気分の変化に気づく人が多くいます」）はダミーコピーであり、医学的な裏付け・監修は行っていない。本実装時に医療監修が必要な領域。

---

## Final Verdict

# GO

**理由**: PR-LAYOUT-03のロードマップ項目（H/D/E＋ロック中Proカード＋Record達成フィードバック）すべてに対応した。「プレビュー日数切り替えUIの扱い」は変更なしの現状維持を再確認した。Console Error 0件、320/430pxでのレイアウト崩れなしを確認済み。

## 「プロダクト全体としての完成度」に対する到達点（率直な評価）

PR-LAYOUT-02完了時点で未達だったExit Criteria項目のうち、「オンボーディングを濃厚にして差別化」はH実装により前進した。ただし、[IPPO_WORLD_CLASS_LAYOUT_INTEGRATION_COUNCIL.md](IPPO_WORLD_CLASS_LAYOUT_INTEGRATION_COUNCIL.md)のFinal Layout Roadマップに従えば、次はPrototype Review（Founderが全画面・全Day状態を実機確認しExit Criteria充足を判定）であり、これはAIが自己判定できない工程である。

さらに、Councilが繰り返し「本実装時でよい／将来でよい」と分類してきた下記の項目は、レイアウトのみのPrototype改修では原理的に到達できない、構造的な天井として残り続ける。

- Record入力構造自体の再設計（「記録」ではなく「実験ノート」としての入力体験）
- 疾患特化コンテンツの深さ（9疾患フルセットの個人化）
- 全アイコンのSVG化
- 実データに基づく確信度算出ロジック・継続ストリップの記録忘れ検知ロジック

したがって、本PRの完了をもって「レイアウト改修として到達可能な範囲での完成度」には近づいたが、これは[IPPO_REBUILD_INTEGRATION_COUNCIL.md](IPPO_REBUILD_INTEGRATION_COUNCIL.md)のMigration Roadmap Phase1（実データ接続）以降でしか埋まらない領域が依然として存在することに変わりはない。

次のアクション: FounderによるPrototype Review（全画面・全Day状態の実機確認）を経て、Exit Criteria充足の最終判定とPrototype Freeze可否を判断する。
