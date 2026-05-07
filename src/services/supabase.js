// ============================================================
//  ippo – src/services/supabase.js
//  Supabase SDK 初期化
//
//  【移設元】app.html の <script type="module"> ブロック
//           (createClient / window.supabase 設定)
//
//  【設計方針】
//  - CDN import を npm パッケージ (@supabase/supabase-js) へ移行
//  - window.supabase を維持（移行期間中: 非モジュール <script> との共存）
//  - SUPABASE_URL を re-export して services/stripe.js で共有
//
//  【注意】
//  - var SUPABASE_URL / var SUPABASE_KEY (anon JWT) は REST API ヘルパー用に
//    app.html のインラインスクリプトに残存。そちらとは別物。
//  - この SDK_KEY は publishable key (sb_publishable_...)。
// ============================================================

import { createClient } from '@supabase/supabase-js';

// ─── 定数 ────────────────────────────────────────────────────
export const SUPABASE_URL = 'https://ekaoojdqhkpeudujfsdh.supabase.co';

// Publishable key: Supabase SDK 専用（REST API の anon JWT とは別）
const SUPABASE_SDK_KEY = 'sb_publishable_N1aONYfjCsM-AXxBmptkEw_cj5C-0lb';

// ─── Supabase クライアント ────────────────────────────────────
export const supabase = createClient(SUPABASE_URL, SUPABASE_SDK_KEY, {
  auth: {
    persistSession: true,
    storageKey: 'ippo_sb',
    storage: {
      getItem: (key) => {
        if (key.endsWith('-token'))   return localStorage.getItem('ippo_sb_token');
        if (key.endsWith('-refresh')) return localStorage.getItem('ippo_sb_refresh');
        return localStorage.getItem(key);
      },
      setItem: (key, value) => {
        if (key.endsWith('-token'))        localStorage.setItem('ippo_sb_token', value);
        else if (key.endsWith('-refresh')) localStorage.setItem('ippo_sb_refresh', value);
        else                               localStorage.setItem(key, value);
      },
      removeItem: (key) => {
        if (key.endsWith('-token'))        localStorage.removeItem('ippo_sb_token');
        else if (key.endsWith('-refresh')) localStorage.removeItem('ippo_sb_refresh');
        else                               localStorage.removeItem(key);
      },
    },
  },
});

// ─── window 互換（移行期間: 非モジュール <script> との共存） ──
window.supabase = supabase;
