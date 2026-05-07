// ============================================================
//  ippo – src/main.js
//  Vite エントリー: 定数を import して window に公開
//  CSS は app.html の <link> で読み込み済み
// ============================================================

// CSS は app.html の <link rel="stylesheet"> で読み込み済み。
// ここで import するとVite以外の環境(npx serve等)でモジュール全体が失敗するため除外。

import { ICONS }              from './constants/icons.js';
import { DISEASE_CONFIG }     from './constants/disease.js';
import {
  SYMPTOM_LAYERS,
  SENSITIVE_SYMPTOMS,
  DISEASE_PRIORITY_SYMPTOMS,
} from './constants/symptoms.js';

// window アサインは各定数ファイル内で完結
// ここでは re-export として型情報のみ提供（将来の TypeScript 移行用）
export { ICONS, DISEASE_CONFIG, SYMPTOM_LAYERS, SENSITIVE_SYMPTOMS, DISEASE_PRIORITY_SYMPTOMS };
