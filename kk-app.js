// kk-app.js - 修正版

// localStorageのキー管理
const STORAGE_PREFIX = 'kk_';

function ls_get(key, defaultValue = null) {
  const item = localStorage.getItem(STORAGE_PREFIX + key);
  if (item === null) return defaultValue;
  try {
    return JSON.parse(item);
  } catch (e) {
    return item; // JSONとしてパースできない場合はそのまま返す
  }
}

function ls_set(key, value) {
  localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
}

// 既存のlocalStorageキーからの移行処理
function migrateLegacyStorage() {
  const legacyName =
    localStorage.getItem('kkUserName') ||
    localStorage.getItem('kk_username');

  const legacyWelcomeDone =
    localStorage.getItem('kk_welcome_done') === 'true';

  if (!ls_get('userName') && legacyName) {
    ls_set('userName', legacyName);
  }

  if (!ls_get('onboarded', false) && legacyWelcomeDone) {
    ls_set('onboarded', true);
  }

  if (!ls_get('startedAt') && legacyWelcomeDone) {
    ls_set('startedAt', today()); // today()関数は後で定義するか、適切な日付関数に置き換える
  }
  
  // 移行が完了したら、古いキーは削除しても良いが、今回は残しておく（安全のため）
  // localStorage.removeItem('kkUserName');
  // localStorage.removeItem('kk_username');
  // localStorage.removeItem('kk_welcome_done');
}

// 画面表示ロジック（仮）
function showScreen(screenName) {
  document.querySelectorAll('.app-screen').forEach(screen => {
    screen.classList.remove('active');
  });
  const targetScreen = document.getElementById(screenName);
  if (targetScreen) {
    targetScreen.classList.add('active');
  }
}

// イベントリスナー初期化（仮）
function initEventListeners() {
  // Welcome画面のボタンイベントなど、外部JSで一元管理するイベントをここに記述
  // 例: document.getElementById('welcomeNextBtn').addEventListener('click', () => { /* ... */ });
  // 例: document.getElementById('welcomeSkipBtn').addEventListener('click', () => { /* ... */ });
  
  // data-screenを持つボタンのイベントリスナー
  document.querySelectorAll('[data-screen]').forEach(button => {
    button.addEventListener('click', (event) => {
      const screenId = event.currentTarget.dataset.screen;
      if (screenId) {
        showScreen(screenId);
      }
    });
  });
}

// Welcome画面初期化（仮）
function initWelcome() {
  // Welcome画面の初期化ロジックをここに記述
  // 例: スライドの初期表示、アニメーションなど
}

// オンボーディング完了処理（仮）
function completeOnboarding(userName) {
  ls_set('userName', userName);
  ls_set('onboarded', true);
  ls_set('startedAt', today()); // today()関数は後で定義するか、適切な日付関数に置き換える
  showScreen('home'); // Home画面へ遷移
}

// 日付取得関数（仮）
function today() {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
}

// アプリケーションの初期化
const state = {
  userName: '',
  startedAt: null,
  records: [] // 仮
};

async function init() {
  if (window.__kkAppBooted) return;
  window.__kkAppBooted = true;

  migrateLegacyStorage(); // 既存データ移行

  state.userName = ls_get('userName', '');
  state.startedAt = ls_get('startedAt', null);
  const onboarded = ls_get('onboarded', false);

  initEventListeners();
  // initFeedbackListeners(); // 必要であれば追加
  // await fetchAllRecords(); // 必要であれば追加

  if (onboarded && state.userName) {
    showScreen('home'); // オンボーディング済みかつユーザー名があればHomeへ
  } else {
    showScreen('welcome'); // それ以外はWelcomeへ
    initWelcome();
  }
}

// DOMContentLoadedでinitを呼び出す
document.addEventListener('DOMContentLoaded', init);

// 外部からアクセス可能な関数をwindowオブジェクトに公開（必要に応じて）
window.showScreen = showScreen;
window.completeOnboarding = completeOnboarding;
window.ls_get = ls_get;
window.ls_set = ls_set;
