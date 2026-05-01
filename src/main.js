import { init } from './core/state.js';
import { start as startEngine, pauseForBackground, resumeFromBackground } from './core/timerEngine.js';
import { createSplashScreen } from './components/SplashScreen.js';
import { createMainScreen } from './components/MainScreen.js';

const app = document.getElementById('app');
let mainScreen = null;

function initApp() {
  init();
  startEngine();

  const splash = createSplashScreen(() => {
    splash.remove();
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
    pauseForBackground();
  } else {
    resumeFromBackground();
  }
});

initApp();
