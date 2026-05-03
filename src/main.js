import { init } from './core/state.js';
import { start as startEngine, pauseForBackground, resumeFromBackground } from './core/timerEngine.js';
import { initStats, startWorkSession, endWorkSession } from './core/statsTracker.js';
import { createNoticeScreen } from './components/NoticeScreen.js';
import { createSplashScreen } from './components/SplashScreen.js';
import { createMainScreen } from './components/MainScreen.js';

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
  });
  app.appendChild(splash);
}

function showMainScreen() {
  mainScreen = createMainScreen();
  app.appendChild(mainScreen.el);
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
