# PR-LAYOUT-02 Report — World-Class Layout Polish

> [IPPO_WORLD_CLASS_LAYOUT_INTEGRATION_COUNCIL.md](IPPO_WORLD_CLASS_LAYOUT_INTEGRATION_COUNCIL.md) の中核5項目（A/B/C/F/G）＋Experiment CTA強化を実装。
> 対象: `prototype/index.html` / `prototype/styles.css` / `prototype/app.js`（ダミーデータのみ。Supabase/Stripe/AI API/認証/DB/Business Logic/新規バックエンドは一切なし）。

---

## 実装サマリー（必須実装6項目）

| # | 項目 | 状態 | 実装内容 |
|---|---|---|---|
| A | Homeのシグネチャービジュアル確立 | ✅完了 | Heroを再設計。従来の「大きな数字＋別枠の細い進捗バー」を廃止し、`hero-ring`（104px・conic-gradient）1つにDay数と進捗％を統合。単一の視覚的主役として機能する。挨拶文（`hero-greeting`）は独立行に分離し、フォントサイズ0.875rem→0.75rem・不透明度低下で視覚的比重を縮小（削除はしていない） |
| B | 気づきカードへの確信度メーター追加 | ✅完了 | `.confidence-meter`（4段階ドット）を新設し、Home「今日の気づき」とInsights「今週のハイライト」の両方に追加。既存の確信度テキスト（「まだ3日分のデータです」等）は維持しつつ、ドットで直感的な確からしさを併記。断定表現は使用していない |
| C | 実験完了時のマイルストーン演出追加 | ✅完了 | Hero直下に`.milestone-banner`を新設。Day14/30（実験がその日に完了した状態）でのみ表示。ゴールド系グラデーション＋控えめなfade-in（0.5s、`prefers-reduced-motion`で無効化）。ゲーミフィケーション色の強い演出（バッジ乱発・数値カウントアップ等）は採用していない |
| F | 固有ブランドマーク追加 | ✅完了 | 「一歩」を想起させる抽象リングマーク（欠けた円＋先を行くドット）をSVGで1点designし、`.brand-mark`として1アセットを3箇所（オンボーディングHero／HomeのHero／結果カードの共有ウォーターマーク）で再利用。全アイコンのSVG化は行っていない（絵文字アイコン体系はそのまま維持） |
| G | 結果カードの共有前提ビジュアル化 | ✅完了 | `.card-result`に`.card-shareable`を追加。右上にブランドウォーターマーク、delta数値の隣に「意味」の一文（例:「肌荒れが落ち着いてきた実感があります」）、Before/Afterのミニ棒グラフ（`day.compare`のbeforeHeight/afterHeightを再利用）を追加し、数字だけでなく変化の意味と方向性が一目で伝わる構成にした |
| + | Experiment「試す」CTAの視覚的重み強化 | ✅完了 | Experiment画面のおすすめ実験カード内にあった小さな`btn-primary sm`インラインボタンを廃止し、カード最下部にフル幅の`.experiment-start-cta`（グラデーション・大きめpadding・強めshadow）として独立配置。「この実験を試してみる →」に文言も具体化。押し売り感を避けるため、アニメーションや常時点滅などは追加していない |

---

## 実装中の設計判断

- **リングの再利用**: Home Heroの大型リング（`.hero-ring`）は、既存の`.mini-progress-ring`・`.progress-ring`と同じ視覚言語（conic-gradient＋白抜き中央）を踏襲した。新規パターンを増やさず、既存デザインシステムとの一貫性を優先した。
- **ブランドマークとリングの意匠的連動**: ブランドマーク自体も「欠けた円＋先行するドット」という、リング進捗表現と同じモチーフ（進捗・一歩先へ）を採用し、シグネチャービジュアル（A）とブランドマーク（F）が視覚的に呼応するようにした。
- **確信度の粒度分け**: Home「今日の気づき」は当該実験単体のデータ件数に基づく確信度（Day30時点では"14件のデータから検出"・level3）、Insights「今週のハイライト」は全実験を横断した確信度（Day30時点では"2つの実験・28件のデータから検出"・level4）と、意図的に粒度を分けて表示した。両者が同じ数値を指すわけではないため、混同を避ける設計とした。
- **Before/Afterミニバーのデータ再利用**: 結果カードのミニ棒グラフは、Insights比較セクションで既に持っている`compare.beforeHeight`/`afterHeight`をそのまま参照する実装とし、新規のダミーデータ項目を増やさなかった。

---

## 変更ファイル

- `prototype/index.html` — Hero再設計（onboarding/home）、確信度メーターmarkup（Home/Insights）、マイルストーンバナー、結果カード共有ビジュアル、Experiment CTA独立化
- `prototype/styles.css` — `.brand-lockup`/`.brand-mark`、`.hero-signature`/`.hero-ring`、`.milestone-banner`、`.confidence-row`/`.confidence-meter`、`.card-shareable`/`.result-main-row`/`.result-mini-compare`、`.experiment-start-cta`を新設。旧`.hero-eyebrow`/`.hero-day-row`/`.hero-progress-track`等の不要ルールは削除
- `prototype/app.js` — `DAY_STATES`にmilestone / result.meaning / confidence（label+level構造）を追加。`renderHero`をリング駆動に変更、`renderHomeMilestone`・`renderConfidenceMeter`を新設し`renderHomeInsight`/`renderInsightsHighlight`から呼び出し、`renderHomeResult`にミニバー描画を追加
- `docs/rebuild/PR_LAYOUT_02_REPORT.md` — 本レポート（新規）

---

## Browser Verification

- サーバー: `prototype`ローカルサーバー（`npx serve prototype`、port 5544）で実施。
- 画面: オンボーディング／Home／Record／Insights／Experiment／Me／Premiumモーダル／Proモーダルを実機相当（アクセシビリティスナップショット＋DOM評価）で確認。
- Day状態: Day0（Hero=0日目・リング0%・確信度メーター非表示・マイルストーン非表示を確認）／Day14（リング100%・マイルストーンバナー「14日間、やり遂げました」・確信度3ドット点灯・結果カードの意味文とミニバーを確認）／Day30（リング100%・マイルストーンバナー「2つ目の実験も、やり遂げました」・Home確信度3ドット／Insights確信度4ドットの粒度差を確認）で、Hero・気づき・進行中実験・結果・次の提案・Insightsハイライト・Recordハイライトタグが正しく切り替わることを確認。
- Experiment画面: 新CTA「この実験を試してみる →」がフル幅ボタンとして独立表示されることを確認（`data-action="start-experiment"`のクリックハンドラは既存のまま維持）。
- 幅: 320px／375px／390px／430pxの4幅すべてで`document.documentElement.scrollWidth`と`clientWidth`を比較し、横スクロール（要素のはみ出し）が発生しないことをプログラム的に確認。
- Console Error: 全操作を通じて0件（`preview_console_logs`で確認）。
- 注記: 本セッションのpreviewツールでは`preview_screenshot`が環境要因でタイムアウトしたため、目視スクリーンショットの代わりにアクセシビリティスナップショット（`preview_snapshot`）とDOM/CSSの直接評価（`preview_eval`/`preview_inspect`）で内容・状態・レイアウト崩れの有無を確認した。ピクセル単位の見た目の最終確認はFounderの通常ブラウザでの実機確認に委ねる。

---

## 意図的に対象外とした項目（Councilの分類どおり）

- D（直近7日継続ストリップ）、E（気分ピッカー拡大）、H（Home女性向け軽量シグナル＋オンボーディング濃厚化）は[IPPO_WORLD_CLASS_LAYOUT_INTEGRATION_COUNCIL.md](IPPO_WORLD_CLASS_LAYOUT_INTEGRATION_COUNCIL.md)の計画どおりPR-LAYOUT-03に送っている。本PRでは実装していない。
- ロック中Proカードの好奇心演出、Record送信後の達成フィードバックアニメーションも同様にPR-LAYOUT-03送り。

---

## 残る誠実な評価（過大に「完璧」と言わないための注記）

- ピクセル単位の見た目確認（フォントレンダリング・グラデーションの実際の見え方・確信度ドットの視覚的な小ささが適切か等）は、本セッションでは`preview_screenshot`がタイムアウトしたためスクリーンショットで検証できていない。DOM構造・CSS計算値・レイアウト崩れの有無は確認済みだが、最終的な見た目の判断はFounderの実機確認が必要。
- マイルストーンバナーの表示条件は「その日に完了（`day === total`）」の状態のみを表現するダミーデータ状態（Day14/30）に対して実装した。実データでは「今日完了した」と「過去に完了済み」を区別するロジックが別途必要になる（本Prototypeのスコープ外、実装時に設計要）。
- 確信度メーターのlevel算出はDay状態ごとに手動で埋めたダミー値であり、実データでの確信度算出ロジック（何件からlevel2になるか等の閾値設計）はPrototypeでは定義していない。本実装時に別途設計が必要。

---

## Final Verdict

# GO

**理由**: Integration Councilが特定した中核5項目（A/B/C/F/G）およびExperiment CTA強化のすべてに対応した。Day0/14/30の状態切り替え、4幅でのレイアウト崩れなし、Console Error 0件を確認済み。意図的に対象外とした項目はCouncilの計画どおりPR-LAYOUT-03に分類済みのものに限られる。

次のアクション: Founderが通常ブラウザで全画面・全Day状態（特にDay3/7の中間状態と各モーダル）を実機確認し、ピクセル単位の見た目（特にHeroリングのバランス、マイルストーンバナーの演出強度、確信度ドットの視認性）に問題がないかを判定したうえで、PR-LAYOUT-03（H/D/E＋磨き込み）に進むかどうかを判断する。
