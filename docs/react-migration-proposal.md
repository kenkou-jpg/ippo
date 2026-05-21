# React 移行提案

> Phase 4 評価ドキュメント。本番移行は行わない。段階設計の判断材料として。

## 前提

- PoC は `/poc/react-record-screen` として本番導線に接続しない
- 移行は画面単位の段階移行（app.html を一括削除しない）
- TypeScript は移行と同時に導入
- GitHub Pages デプロイは継続

---

## 技術スタック

```
React 18
TypeScript 5
Vite 6（既存 Vite をそのまま活用）
Zustand（状態管理 — 軽量、Immer 互換）
TanStack Query（Supabase フェッチ + キャッシュ）
Vitest + React Testing Library（テスト）
```

GitHub Pages SPA モード:
```
vite.config.ts:
  base: '/ippo/'
  build.rollupOptions.input: { app: 'index.html' }

public/404.html → index.html にリダイレクト（SPA 対応）
```

---

## 状態管理設計（Zustand）

```ts
// src/stores/records.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useRecordStore = create(
  persist(
    (set, get) => ({
      records: [] as DailyRecord[],
      // streak は derived（毎回計算）
      get streak() { return calcStreak(get().records); },
      addRecord: (rec: DailyRecord) =>
        set(s => ({ records: upsertRecord(s.records, rec) })),
      editRecord: (date: string, patch: Partial<DailyRecord>) =>
        set(s => ({ records: patchRecord(s.records, date, patch) })),
    }),
    { name: 'ippo-records' }
  )
);
```

---

## 移行ロードマップ

### Phase 1: Domain model 抽出（2週間）

```
成果物:
  src/types/index.ts       — DailyRecord, UserProfile, etc.
  src/stores/records.ts    — Zustand store
  src/stores/user.ts       — Zustand store
  src/utils/streak.ts      — 純粋計算関数
  src/utils/cycle.ts       — 生理周期計算
  src/utils/pain.ts        — 痛みスコア集計

条件:
  - app.html は変更しない
  - stores は window にも公開（移行期間の互換）
```

### Phase 2: 記録画面コンポーネント（2週間）

```
対象: #screen-record の全コンテンツ

PoC ファイル:
  src/poc/RecordScreen.tsx
  src/poc/components/SymptomChips.tsx
  src/poc/components/PainSlider.tsx
  src/poc/components/MealInput.tsx

接続: /poc/react-record へのルートを追加（本番導線に接続しない）

完了条件:
  - PoC で記録が作成・保存できる
  - useRecordStore と Supabase sync が動く
```

### Phase 3: カレンダー画面（2週間）

```
対象: #screen-calendar / buildCalendar()

コンポーネント:
  src/poc/CalendarScreen.tsx
  src/poc/components/CalendarGrid.tsx
  src/poc/components/DayCell.tsx

完了条件:
  - 記録の有無がカレンダーに反映される
  - 過去日タップで記録画面に遷移できる
```

### Phase 4: インサイト画面（2〜3週間）

```
対象: #screen-insights / updateStats / buildCharts

コンポーネント:
  src/poc/InsightsScreen.tsx
  src/poc/components/StreakCard.tsx
  src/poc/components/PainChart.tsx
  src/poc/components/CyclePhaseCard.tsx

TanStack Query 活用:
  const { data } = useQuery({ queryKey: ['insights'], queryFn: fetchInsights });
```

### Phase 5: 設定・プレミアム画面（1〜2週間）

```
対象: #screen-settings / premium overlay

コンポーネント:
  src/poc/SettingsScreen.tsx
  src/poc/components/PremiumOverlay.tsx
  src/poc/components/AuthPanel.tsx

Stripe 連携:
  startStripeCheckout をそのまま window 経由で呼ぶ（再実装不要）
```

### Phase 6: ホーム画面 + app.html 削除（1〜2週間）

```
最終段階:
  1. ホーム画面 React 化
  2. app.html の HTML 部分を React に移植
  3. app.html を index.html として最小化
     （<div id="root"> のみ残す）
  4. CACHE_VERSION インクリメント
  5. 全 smoke テスト通過後にリリース
```

---

## 移行コスト見積

| 項目 | 内容 |
|------|------|
| 期間 | 3〜4ヶ月（フルタイム 1 人換算） |
| リスク | 移行期間中に app.html と React が並走する |
| 最大リスク | Phase 6（app.html 削除）— startup 破壊の可能性が最も高い |
| 緩和策 | 各 Phase で A/B ルート（旧 app.html + 新 React）を並走させる |

---

## Supabase 統合

```ts
// src/lib/supabase.ts（既存 src/services/supabase.js を TS 化）
import { createClient } from '@supabase/supabase-js';  // npm パッケージを使用

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY,
  { auth: { persistSession: true } }
);
```

移行時に CDN → npm パッケージへの切り替えも実施できる。

---

## GitHub Pages 設定変更

```
現行: dist/ → gh-pages（app.html がルートにある）
移行後: 
  vite.config.ts: base = '/ippo/'（リポジトリ名）
  public/404.html:
    <script>
      const path = window.location.pathname;
      sessionStorage.setItem('redirect', path);
      window.location.href = '/ippo/';
    </script>
  index.html:
    <script>
      const redirect = sessionStorage.getItem('redirect');
      if (redirect) { sessionStorage.removeItem('redirect'); history.replaceState(null, '', redirect); }
    </script>
```

---

## PoC の最小実装例

```tsx
// src/poc/RecordScreen.tsx
import { useRecordStore } from '../stores/records';

export function RecordScreen() {
  const { records, addRecord } = useRecordStore();
  const [painLevel, setPainLevel] = useState(0);

  const handleSave = () => {
    addRecord({
      date: new Date().toISOString(),
      record_date: new Date().toISOString().slice(0, 10),
      painLevel,
    });
  };

  return (
    <div>
      <h2>今日を記録する</h2>
      <PainSlider value={painLevel} onChange={setPainLevel} />
      <button onClick={handleSave}>保存する</button>
    </div>
  );
}
```

---

## 移行しない場合のリスク

- app.html が 15,000行 → 20,000行 に向かう
- 新機能追加のたびに startup 複雑度が上がる
- エンジニア採用時の技術スタックとして説明しにくい
- テストなしの状態が長期化 → リグレッション率が上がる
