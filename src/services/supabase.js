// ============================================================
//  ippo – src/services/supabase.js
//  Supabase SDK 初期化
//
//  方針:
//  - app.html が /src/main.js をブラウザで直接読み込む現行構成に合わせ、
//    bare import ではなく CDN ESM import を使用する
//  - window.supabase を維持（移行期間中: 非モジュール <script> との共存）
//  - キー解決優先順位:
//      1. window.SUPABASE_KEY  （後方互換: 既存グローバル代入）
//      2. import.meta.env.VITE_SUPABASE_KEY  （Vite ビルド時: GitHub Secrets 経由）
//      3. null → クライアント未生成、警告のみ
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

export const SUPABASE_URL = window.SUPABASE_URL || 'https://ekaoojdqhkpeudujfsdh.supabase.co';
const SUPABASE_SDK_KEY = window.SUPABASE_KEY
  || (import.meta.env && import.meta.env.VITE_SUPABASE_KEY)
  || null;

window.__ippoSupabaseStatus = {
  ready: false,
  url: SUPABASE_URL,
  hasKey: !!SUPABASE_SDK_KEY,
  initializedAt: null,
  reason: SUPABASE_SDK_KEY ? null : 'missing-supabase-key',
};

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
window.__ippoSupabaseStatus = {
  ready: !!supabase,
  url: SUPABASE_URL,
  hasKey: !!SUPABASE_SDK_KEY,
  initializedAt: new Date().toISOString(),
  reason: supabase ? null : 'client-not-created',
};

if (typeof window.ippoMarkServiceReady === 'function') {
  window.ippoMarkServiceReady('supabase', window.__ippoSupabaseStatus);
}
