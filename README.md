# ippo — 女性疾患・症状記録アプリ

> 疾患と向き合う女性の、毎日の記録帳。  
> 記録が積み重なるほど、あなただけのからだのパターンが見えてくる。

---

## 🌸 プロジェクト概要

**ippo** は、子宮内膜症・PCOS・子宮筋腫など女性特有の疾患を抱える方に向けた、症状・生理周期・食事・断食・感情を記録するセルフケアPWAです。

「記録の蓄積が意味を持つ体験設計」を核心思想とし、毎日の小さな記録が積み重なることで、ユーザー自身のからだのパターンを発見できるよう設計されています。

---

## 📂 ファイル構成

```
/
├── index.html         # トップページ（ブランドサイト）
├── app.html           # ★ アプリ本体（メインエントリー） ★
├── blog.html          # ブログ一覧
├── article.html       # ブログ記事ページ
│
├── src/
│   ├── main.js        # Vite エントリー（定数・サービス・モジュールをロード）
│   ├── modules/       # ブート安定性・永続化・観測性モジュール群
│   ├── services/      # Supabase / Stripe / Push 通知
│   ├── store/         # グローバル state 管理
│   ├── constants/     # 疾患定義・症状・アイコン
│   └── styles/
│       └── app.css    # アプリ全体スタイル
│
├── public/
│   ├── sw.js          # Service Worker（正規ソース）
│   ├── manifest.json  # PWA マニフェスト
│   └── images/        # アイコン・OGP 画像
│
├── css/               # ブランドサイト用スタイル
├── js/                # ブランドサイト用スクリプト
└── images/            # ブランドサイト用画像
```

---

## ✅ 実装済み機能

### アプリ本体（app.html）
- [x] **オンボーディング（9ステップ）**
  - ウェルカム → 名前 → 生年 → 疾患選択 → 生理日 → 周期 → 目的 → リマインダー → 完了
- [x] **ホーム画面**
  - 日付・挨拶・パーソナライズメッセージ
  - 連続記録日数・総記録日数
  - 週間カレンダー（記録済み/今日/未記録）
  - フェーズバナー（生理周期フェーズ）
  - ホームウィークロー・インサイトカード
- [x] **記録モーダル（ステップ形式）**
  - 症状・痛み・体温・気分・食事・断食タイマー
  - 疾患別優先セクション並べ替え
- [x] **カレンダー画面**
  - 月次カレンダー（記録日・生理日の視覚化）
- [x] **インサイト画面**
  - 7日/30日/90日 期間切替
  - 無料：基本統計・パターン分析
  - プレミアム：体温二相性分析・相関分析・フレアアップ検出・周期フェーズ比較
- [x] **設定画面**
  - プロフィール（名前・疾患・生年・生理周期）
  - クラウド同期（Supabase）
  - CSVエクスポート
  - 全データ削除
- [x] **プレミアムプラン（Stripe）**
  - 月額 ¥580 / 年額 ¥4,800
- [x] **PWA対応**
  - Service Worker（オフラインキャッシュ・プッシュ通知）
  - ホーム画面追加（manifest.json）

### ブランドサイト（index.html）
- [x] ヒーロー画像・コンセプトセクション
- [x] 疾患別ナビゲーション（子宮内膜症・PCOS・子宮筋腫 等）
- [x] アプリ紹介・testimonials・FAQ

---

## 🛠️ 技術スタック

| カテゴリ | 技術 |
|----------|------|
| フロントエンド | Vanilla JS (ES modules), HTML5 |
| ビルド | Vite v6 |
| バックエンド | Supabase（認証・DB） |
| 決済 | Stripe |
| PWA | Service Worker, Web App Manifest |
| デプロイ | GitHub Pages（`dist/` から配信） |

---

## 🚀 開発・ビルド

```bash
npm install
npm run dev      # 開発サーバー起動（http://localhost:5173/app.html）
npm run build    # dist/ にビルド
npm run preview  # ビルド確認
```

環境変数（`.env` または GitHub Secrets）:
```
VITE_SUPABASE_KEY=your_supabase_anon_key
```

---

## 🗄️ データモデル（Supabase）

| テーブル | 説明 |
|----------|------|
| `user_data` | ユーザーの全 state（JSON）。バックアップ・クラウド復元に使用 |
| `profiles` | `is_premium` フラグ |

---

## ⚙️ アーキテクチャ方針

ippo は **production stabilization phase** にあります。

- **Functional Core Runtime**（`app.html` の `init()` / `showMain()` / `switchTab()` / save / sync）は安定保持優先
- **Safe Modular Edges**（observability / analytics / UX polish / helpers）のみ小さな差分で改善
- `1PR = 1責務` ルール。startup / hydration / save / sync ordering の書き換えは禁止

---

## ⚠️ 免責事項

このアプリ・サイトは医療アドバイスを提供するものではありません。子宮内膜症・PCOS・子宮筋腫など婦人科疾患のある方は、必ず医師の診察を受けてください。
