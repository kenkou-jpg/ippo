// ============================================================
//  ippo – src/services/supabase.js
//  Supabase SDK 初期化
//
//  方針:
//  - app.html が /src/main.js をブラウザで直接読み込む現行構成に合わせ、
//    bare import ではなく CDN ESM import を使用する
//  - window.supabase を維持（移行期間中: 非モジュール <script> との共存）
//  - 公開キーは app.html 側の既存グローバル値を優先して参照する
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const SUPABASE_URL = window.SUPABASE_URL || 'https://ekaoojdqhkpeudujfsdh.supabase.co';
const SUPABASE_SDK_KEY = window.SUPABASE_KEY;

if (!SUPABASE_SDK_KEY) {
  console.warn('ippo: SUPABASE_KEY is not available. Supabase client was not initialized.');
}

export const supabase = SUPABASE_SDK_KEY ? createClient(SUPABASE_URL, SUPABASE_SDK_KEY, {
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
}) : null;

window.supabase = supabase;
