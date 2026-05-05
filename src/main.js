import { init, needsWhatsNew } from './core/state.js';
import { start as startEngine, pauseForBackground, resumeFromBackground } from './core/timerEngine.js';
import { initStats, startWorkSession, endWorkSession } from './core/statsTracker.js';
import { createNoticeScreen } from './components/NoticeScreen.js';
import { createSplashScreen } from './components/SplashScreen.js';
import { createMainScreen } from './components/MainScreen.js';
import { createWhatsNewModal } from './components/WhatsNewModal.js';

const app = document.getElementById('app');
let mainScreen = null;
let backgroundTime = 0;

function initApp() {
  init();
  initStats();
  startEngine();

  const hasSeen = localStorage.getItem('otaimer_notice');
  if (hasSeen) {
    showSplash();
  } else {
    const notice = createNoticeScreen(() => {
      localStorage.setItem('otaimer_notice', '1');
      showSplash();
    });
    app.appendChild(notice);
  }
}

function showSplash() {
  const splash = createSplashScreen(() => {
    splash.remove();
    startWorkSession();
    showMainScreen();
    if (needsWhatsNew) {
      showWhatsNew();
    }
  });
  app.appendChild(splash);
}

function showMainScreen() {
  mainScreen = createMainScreen();
  app.appendChild(mainScreen.el);
}

function showWhatsNew() {
  createWhatsNewModal('v1.1.2a', [
    {
      title: '新功能',
      items: [
        '调整记录：长按计时器可查看每次加减时间的详细记录',
        '数据统计支持按分组查看，点击分组名称可折叠/展开',
        '工时统计：查看每日/每周/每月的累计工时',
        '支持自定义日期范围查询统计数据'
      ]
    },
    {
      title: '优化',
      items: [
        '暂停计时器时也可查看调整记录',
        '计时器重命名后统计数据自动跟随'
      ]
    }
  ]);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    backgroundTime = Date.now();
    pauseForBackground();
  } else {
    // If background > 5 min, end work session
    if (backgroundTime > 0 && Date.now() - backgroundTime > 5 * 60 * 1000) {
      endWorkSession();
      startWorkSession(); // Start new session
    }
    backgroundTime = 0;
    resumeFromBackground();
  }
});

initApp();
