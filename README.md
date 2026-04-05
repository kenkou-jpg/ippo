# kenkou kiroku — ウェブサイト & アプリ

> 卵巣・女性のからだを、食と意識で整える。  
> 蓄積型健康記録ウェブアプリ + ブランドサイト

---

## 🌸 プロジェクト概要

**kenkou kiroku（健康記録）** は、卵巣嚢腫・PCOS・子宮内膜症など女性特有の不調を抱える方に向けた、チャクラ・食事療法・プチ断食・感情を軸とした健康記録アプリ＋ブランドWebサイトです。

「蓄積が意味を持つ体験設計」を核心思想とし、毎日の小さな記録が積み重なることで、ユーザー自身のからだのパターンを発見できるよう設計されています。

---

## 📂 ファイル構成

```
/
├── index.html         # トップページ（ブランドサイト）
├── blog.html          # ブログ一覧
├── article.html       # ブログ記事ページ
├── app.html           # アプリ紹介ページ（旧）
├── kk-app.html        # ★ 健康記録アプリ本体 ★
│
├── css/
│   ├── style.css      # ブランドサイト共通CSS
│   └── app-main.css   # アプリ専用デザインシステム
│
├── js/
│   ├── main.js        # ブランドサイト共通JS (SITE_CONFIG含む)
│   └── kk-app.js      # アプリ本体JS
│
└── images/
    ├── hero-bougainvillea.jpg
    ├── bougainvillea-arch.jpg
    ├── bougainvillea-closeup.jpg
    ├── bougainvillea-light.jpg
    └── profile-photo.jpg  ← 差し替え推奨
```

---

## ✅ 完成済み機能

### ブランドサイト（index.html）
- [x] ブーゲンビリア実写ヒーロー画像
- [x] コンセプトセクション（チャクラ・食事・断食 3本柱）
- [x] お悩み別ナビゲーション（卵巣嚢腫・PCOS・子宮内膜症）
- [x] 無料ガイドCTA
- [x] アプリ紹介プレビュー
- [x] プロフィールセクション
- [x] FAQ

### ブログ一覧（blog.html）
- [x] カテゴリフィルター
- [x] 実写ブーゲンビリア画像サムネイル
- [x] 記事カードレイアウト

### 記事ページ（article.html）
- [x] 目次ナビゲーション
- [x] 著者プロフィールボックス
- [x] 関連記事

### アプリ本体（kk-app.html）
- [x] **オンボーディング（Welcome 4スライド）**
  - ブランドイントロ、蓄積の価値説明、機能紹介、名前入力
- [x] **ホーム画面**
  - 日付・挨拶・パーソナライズメッセージ
  - 季節の声かけカード（春夏秋冬 × 五行）
  - 連続記録日数・総記録日数・週間断食累計
  - 週間カレンダー（記録済み/今日/未記録の視覚化）
  - 今日の記録サマリー
  - マイルストーンバナー（3/7/14/21/30/60/90/180日）
  - クイック記録ボタン
- [x] **記録画面（4タブ）**
  - 🌸 チャクラチェック（6チャクラ選択・強さ・スコア・症状タグ）
  - 🌿 食事療法（食事タイム・内容・食後体感・食材チェック・スコア）
  - 🌙 プチ断食（ビジュアルリングタイマー・時刻入力・体感タグ・スコア）
  - 💭 感情メモ（5つの感情・ウェルネス/エネルギー・日記・感謝）
- [x] **インサイト画面**
  - 7日/30日/90日 期間切替
  - パターンメッセージ（蓄積データから自動生成）
  - ウェルネス・エネルギー推移グラフ（Chart.js）
  - 食事スコア棒グラフ
  - チャクラ別記録ドーナツグラフ
  - パターン分析カード（7日以上で自動生成）
  - 蓄積へのメッセージ（記録日数に応じたパーソナライズ）
- [x] **設定画面**
  - プロフィール（名前・症状・断食目標時間）
  - リマインダートグル
  - CSVエクスポート
  - 全データ削除

---

## 🗄️ データモデル

### テーブル: `kk_records`（26フィールド）

| フィールド | 型 | 説明 |
|------------|------|------|
| id | text | レコードID（UUID） |
| record_date | text | 記録日付 YYYY-MM-DD |
| chakra | text | チャクラキー (root/sacral/solar/heart/throat/third_eye) |
| chakra_intensity | text | 状態 (blocked/heavy/flow/vibrant) |
| chakra_score | number | エネルギースコア 1-10 |
| chakra_notes | rich_text | チャクラ観察メモ |
| symptoms | array | 症状タグ配列 |
| food_time | text | 食事タイム (morning/noon/evening/snack) |
| food_content | rich_text | 食事内容 |
| body_feel | array | 食後体感タグ配列 |
| food_ingredients | array | 意識した食材タグ配列 |
| food_score | number | 食事スコア 1-10 |
| food_notes | rich_text | 食事メモ |
| fasting_start | text | 断食開始時刻 HH:MM |
| fasting_end | text | 断食終了時刻 HH:MM |
| fasting_goal_hours | number | 目標断食時間 |
| fasting_hours | number | 実際の断食時間（時間） |
| fasting_minutes | number | 断食時間（分余り） |
| fasting_feel | array | 断食中体感タグ配列 |
| fasting_score | number | 断食達成感スコア 1-10 |
| fasting_notes | rich_text | 断食メモ |
| emotion | text | 感情 (peaceful/happy/tired/anxious/irritated) |
| wellness_score | number | ウェルネス総合スコア 1-10 |
| energy_score | number | エネルギーレベル 1-10 |
| emotion_notes | rich_text | 感情・日記メモ |
| gratitude | text | からだへの感謝メッセージ |

---

## ⚙️ 設定方法

### ブログURL・プロフィール名の設定

`js/main.js` の冒頭の `SITE_CONFIG` を編集してください：

```javascript
const SITE_CONFIG = {
  BLOG_URL: 'https://あなたのWordPressブログのURL',
  PROFILE_NAME: '田中 花子',  // あなたのお名前
};
```

### プロフィール写真の差し替え

`images/profile-photo.jpg` をあなたの写真に差し替えてください。

---

## 🚀 公開・移行方法

### GenSparkで公開（今すぐ）
→ **Publishタブ** をクリックするだけで公開完了。

### Xserverへ移行（長期運用）
1. ファイルをZIPダウンロード
2. Xserver ファイルマネージャー or FTP でアップロード
3. 配置先例: `public_html/lp/` → URL: `https://your-blog.com/lp/`
4. ブラウザで確認
5. `js/main.js` の `SITE_CONFIG` を設定

---

## 🎯 デザインコンセプト

- **カラーパレット**: クリームホワイト × ブーゲンビリアピンク（#E63FA8）× ターコイズ（#27B7B3）
- **フォント**: Cormorant Garamond（英語アクセント）・Noto Serif JP（日本語）
- **世界観**: 上品・静か・知的・女性的。ブーゲンビリアの気配。医療ではなく、寄り添い。

---

## 📋 今後の推奨開発ステップ

1. **WordPress REST API連携** — ブログ記事をindex.htmlに自動表示
2. **ログイン機能** — メールアドレス認証でユーザーデータ分離
3. **周期トラッカー** — 生理周期とチャクラ/ウェルネスの相関分析
4. **Push通知** — 記録リマインダー（Service Worker）
5. **ネイティブアプリ化** — React Native or PWA化
6. **有料プラン** — 月次レポートPDF、AIパーソナルメッセージ

---

## ⚠️ 免責事項

このアプリ・サイトは医療アドバイスを提供するものではありません。卵巣嚢腫・PCOS・子宮内膜症など婦人科疾患のある方は、必ず医師の診察を受けてください。
