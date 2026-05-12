# 状態管理再構築提案

> Phase 4 評価ドキュメント。現行 `var state` の domain model 整理案。本番実装は Phase 4 移行決定後。

## 現行状態の問題点

`app.html` の `var state` は 1 つのフラットオブジェクトに全ドメインが混在している:

```js
var state = {
  // ユーザー識別
  name, _onboardingDone, birthYear, purpose,

  // 記録
  records, streak, totalDays,

  // 生理周期
  lastPeriodDate, cycleLength, cycleIrregular,

  // ファスティング（UI状態）
  fastingActive, fastingStart, fastGoal, fastTimer,

  // プレミアム
  isPremium,

  // 疾患設定
  myDiseases, myDisease,   // myDisease は旧フィールド

  // リマインダー
  reminders, reminderTime,

  // ビジョン
  myVision, rating,

  // 同期メタ
  lastSaved,
}
```

**問題:**
- 関係ないドメインが同じオブジェクトに混在
- `state.editingDate` のように一時的な UI 状態が永続化対象と混在
- `saveState()` が全フィールドを localStorage に書く（必要ないものも含む）
- TypeScript 化困難（型定義が 1 巨大オブジェクト）

---

## 提案: Domain Model 分割

```
ippo ドメインモデル
├── UserProfile        ユーザー識別・設定
├── RecordStore        記録データ・統計
├── CycleStore         生理周期データ
├── SubscriptionStore  プレミアム状態
├── SyncStore          同期・クラウド状態
└── UIStore            一時的な UI 状態（永続化不要）
```

---

## 各ドメインの定義

### UserProfile（永続化対象）

```ts
interface UserProfile {
  name: string;
  birthYear: number | null;
  purpose: string | null;
  myDiseases: string[];
  myVision: string;
  reminders: Reminder[];
  reminderTime: string | null;
  _onboardingDone: boolean;
}
```

localStorage key: `ippo_user`

### RecordStore（永続化対象）

```ts
interface RecordStore {
  records: DailyRecord[];
  streak: number;
  totalDays: number;
  lastSaved: string | null;  // ISO timestamp
}

interface DailyRecord {
  id?: string;
  date: string;            // ISO 8601
  record_date?: string;    // YYYY-MM-DD
  painLevel?: number;
  mood?: string;
  symptoms?: string[];
  note?: string;
  // ... その他フィールド
}
```

localStorage key: `ippo_records`（または既存 `ippo_state` に records のみ）

### CycleStore（永続化対象）

```ts
interface CycleStore {
  lastPeriodDate: string | null;
  cycleLength: number;
  cycleIrregular: boolean;
}
```

localStorage key: `ippo_cycle`

### SubscriptionStore（永続化: セッション間）

```ts
interface SubscriptionStore {
  isPremium: boolean;
  planType: 'monthly' | 'annual' | null;
  checkedAt: string | null;
}
```

localStorage key: `ippo_subscription`  
※ Supabase の `profiles.is_premium` が正とし、ローカルはキャッシュとして扱う

### SyncStore（永続化: デバッグ用）

```ts
interface SyncStore {
  lastCloudSync: string | null;
  cloudSyncStatus: 'success' | 'skipped' | 'error' | null;
  cloudSyncReason: string | null;
}
```

window のみ保持（`window.__ippoLastSyncStatus`）または `ippo_sync` に永続化

### UIStore（永続化不要・メモリのみ）

```ts
interface UIStore {
  editingDate: string | null;    // YYYY-MM-DD
  fastingActive: boolean;
  fastingStart: number | null;
  fastGoal: number;
  fastTimer: string | null;
  rating: number;
  currentTab: string;
}
```

---

## 移行戦略

### フェーズ A: インターフェース定義（TypeScript 化前提）

```
1. src/types/index.ts を作成して全インターフェースを定義
2. src/store/records.ts — RecordStore
3. src/store/user.ts — UserProfile
4. src/store/cycle.ts — CycleStore
5. src/store/subscription.ts — SubscriptionStore
```

### フェーズ B: 各フレームワークの状態管理へのマッピング

**React + Zustand:**
```ts
const useRecordStore = create<RecordStore>((set) => ({
  records: [],
  streak: 0,
  totalDays: 0,
  lastSaved: null,
  addRecord: (rec) => set((s) => ({ records: [...s.records, rec] })),
  // ...
}));
```

**SvelteKit + writable stores:**
```ts
export const records = writable<DailyRecord[]>([]);
export const streak = derived(records, ($r) => calcStreak($r));
```

`streak` を `derived` store にすれば、記録が変わると自動的に streak が再計算される。  
現行の `state.streak++` パターン（手動管理）が解消される。

---

## 現行 `var state` からの段階移行

```
Step 1: 型定義のみ追加（実装変更なし）
  → src/types/index.ts に interface を書くだけ
  → JS のまま動く、TypeScript コンパイル不要

Step 2: RecordStore を src/store/records.js に分離
  → app.html の records アクセスを window.recordStore.records に変える
  → cloudBackupAll を RecordStore から読む

Step 3: UserProfile を src/store/user.js に分離
  → name, myDiseases, _onboardingDone を別キーで保存

Step 4: UIStore を state から切り離す
  → editingDate, fastingActive をグローバル state から削除
  → UI コンポーネント内でローカル管理
```

---

## 現行 streak 計算の改善

現行の問題: `state.streak` を手動でインクリメント/デクリメントしているため、  
過去日編集や状態修復時に不整合が起きやすい。

提案: **`streak` を計算プロパティ（derived）にする**

```js
// 純粋関数
function calcStreak(records) {
  const uniqueDays = {};
  records.forEach(r => { uniqueDays[r.date.slice(0,10)] = true; });
  let streak = 0;
  const d = new Date();
  while (uniqueDays[d.toISOString().slice(0,10)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
```

これにより:
- `state.streak` の保存・ロード・修復が不要になる
- 過去日編集時の streak 不正加算が構造的に解消
- ユニットテスト可能

---

## 実装しない理由（現時点）

Phase 4 のアーキテクチャ選択（React vs SvelteKit vs 現行継続）が決まるまで、
状態管理の実装変更は行わない。

理由:
- React + Zustand と SvelteKit + writable では実装が大きく異なる
- 現行継続を選ぶ場合、TypeScript なし・状態管理ライブラリなしでの段階移行になる
- どの選択肢でも `src/types/index.ts` のインターフェース定義は先行して作れる
