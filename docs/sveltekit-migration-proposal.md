# SvelteKit 移行提案

> Phase 4 評価ドキュメント。本番移行は行わない。段階設計の判断材料として。

## 前提

- SvelteKit + `@sveltejs/adapter-static` で GitHub Pages に静的デプロイ
- PoC は `/poc/svelte-record-screen` として本番導線に接続しない
- 移行は画面単位の段階移行

---

## 技術スタック

```
SvelteKit 2
TypeScript 5
Vite 6（SvelteKit 内蔵 Vite をそのまま活用）
Svelte stores（writable / derived — 状態管理ライブラリ不要）
@supabase/supabase-js（npm パッケージ）
@sveltejs/adapter-static（GitHub Pages デプロイ）
Vitest + @testing-library/svelte（テスト）
```

---

## GitHub Pages / Static Hosting 適性

```
svelte.config.js:
  adapter: adapter({
    pages: 'dist',
    assets: 'dist',
    fallback: '404.html',  // SPA フォールバック
  })

npm run build → dist/ に静的ファイル
GitHub Actions: dist/ を gh-pages に push

→ 現行 Vite ビルドの GitHub Actions を ほぼそのまま流用可能
```

アダプタが SPA フォールバックを自動生成するため、
React で必要な `404.html` リダイレクトスクリプトが不要。

---

## 状態管理設計（Svelte stores）

```ts
// src/stores/records.ts
import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';

function createRecordStore() {
  const stored = browser ? localStorage.getItem('ippo-records') : null;
  const initial: DailyRecord[] = stored ? JSON.parse(stored) : [];

  const { subscribe, set, update } = writable<DailyRecord[]>(initial);

  // localStorage への自動同期
  subscribe(records => {
    if (browser) localStorage.setItem('ippo-records', JSON.stringify(records));
  });

  return {
    subscribe,
    addRecord: (rec: DailyRecord) =>
      update(records => upsertRecord(records, rec)),
    editRecord: (date: string, patch: Partial<DailyRecord>) =>
      update(records => patchRecord(records, date, patch)),
  };
}

export const records = createRecordStore();

// streak は derived — records が変わると自動再計算
export const streak = derived(records, ($records) => calcStreak($records));
export const totalDays = derived(records, ($records) =>
  new Set($records.map(r => r.date.slice(0,10))).size
);
```

`streak` が `derived` になるため、現行の手動インクリメントバグ（過去日編集問題）が構造的に解消される。

---

## Supabase 統合

```ts
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from '$env/static/public';

export const supabase = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY, {
  auth: { persistSession: true },
});
```

SvelteKit の `$env/static/public` で環境変数を安全に公開。  
ビルド時に埋め込まれるため、CDN からの実行時取得が不要になる。

---

## 移行ロードマップ

### Phase 1: SvelteKit セットアップ・store 設計（1週間）

```
成果物:
  sveltekit-poc/         — 別ディレクトリで PoC プロジェクト作成
  sveltekit-poc/src/stores/records.ts
  sveltekit-poc/src/stores/user.ts
  sveltekit-poc/src/stores/cycle.ts
  sveltekit-poc/src/stores/subscription.ts
  sveltekit-poc/src/types/index.ts
  sveltekit-poc/src/lib/supabase.ts

条件:
  - 本番の app.html には一切手を入れない
  - PoC プロジェクトは完全に独立
```

### Phase 2: 記録画面 Svelte コンポーネント（2週間）

```svelte
<!-- sveltekit-poc/src/routes/record/+page.svelte -->
<script lang="ts">
  import { records } from '$stores/records';
  import PainSlider from '$components/PainSlider.svelte';

  let painLevel = 0;

  function handleSave() {
    records.addRecord({
      date: new Date().toISOString(),
      record_date: new Date().toISOString().slice(0, 10),
      painLevel,
    });
  }
</script>

<h2>今日を記録する</h2>
<PainSlider bind:value={painLevel} />
<button on:click={handleSave}>保存する</button>
```

完了条件:
- PoC で記録が作成・保存できる
- stores が localStorage と同期する

### Phase 3: カレンダー + インサイト（3週間）

```
sveltekit-poc/src/routes/calendar/+page.svelte
sveltekit-poc/src/components/CalendarGrid.svelte
sveltekit-poc/src/routes/insights/+page.svelte
sveltekit-poc/src/components/StreakCard.svelte

Svelte の reactivity で:
  $: painDays = $records.filter(r => r.painLevel > 0).length;
  $: avgPain = painDays > 0 ? totalPain / painDays : 0;
```

### Phase 4: 設定・プレミアム・ホーム（2〜3週間）

```
Stripe 連携:
  startStripeCheckout は SvelteKit でも同じ Edge Function を使用
  → 実装変更なし、URL と JWT 取得方法のみ調整

認証:
  supabase.auth を SvelteKit のサーバー/クライアント双方で利用可能
  → SupabaseClient を +layout.ts で初期化し全ページに共有
```

### Phase 5: app.html 削除・本番切り替え（1週間）

```
1. sveltekit-poc/ → ippo/ に統合（または新リポジトリ）
2. GitHub Actions を SvelteKit ビルドに切り替え
3. CACHE_VERSION インクリメント
4. smoke テスト通過後リリース
```

---

## 移行コスト見積

| 項目 | 内容 |
|------|------|
| 期間 | 2〜3ヶ月（フルタイム 1 人換算） |
| React より短い理由 | Svelte の記述量が少ない、reactive stores が state 管理を簡素化 |
| リスク | Svelte/SvelteKit の習得コスト（React より小さいコミュニティ） |
| 最大リスク | Phase 5（app.html 削除）— PoC と本番の差が残っていた場合 |
| 緩和策 | Phase 1〜4 を PoC プロジェクトで完全に完成させてから統合 |

---

## React との比較

| 軸 | React | SvelteKit |
|----|-------|-----------|
| バンドルサイズ | React+DOM +45KB gzip | Svelte コンパイラのみ、+10〜15KB |
| 記述量 | useState/useEffect が多い | `$:` reactive statements で簡潔 |
| GitHub Pages | 404.html 設定要 | adapter-static で自動対応 |
| エコシステム | 最大 | 中程度 |
| streak 計算 | useReducer + memo | derived store で自動 |
| Supabase 連携 | 公式サポート | 公式サポート |
| 採用しやすさ | React 経験者が多い | SvelteKit 経験者は少ない |

---

## SvelteKit を選ぶべき条件

1. GitHub Pages への継続デプロイを最優先とする
2. バンドルサイズを最小化したい（モバイルユーザーが多い）
3. 複雑なコンポーネントツリーよりシンプルな記述を優先
4. React エコシステム依存を避けたい

## React を選ぶべき条件

1. チームが React に慣れている
2. React エコシステム（UI ライブラリ・テストツール）を活用したい
3. 将来的に React Native（モバイルアプリ化）の可能性を残したい
4. 採用・外注のしやすさを重視する
