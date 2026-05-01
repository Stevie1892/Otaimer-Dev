import { state, markDirty, forceUpdate } from './state.js';
import { triggerAlert } from './alertManager.js';

let running = false;
let lastTimestamp = 0;
let rafId = null;
let backgroundTime = 0;

export function start() {
  if (running) return;
  running = true;
  lastTimestamp = performance.now();
  rafId = requestAnimationFrame(loop);
}

export function stop() {
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

export function isRunning() {
  return running;
}

export function pauseForBackground() {
  backgroundTime = Date.now();
  stop();
}

export function resumeFromBackground() {
  if (backgroundTime === 0) return;
  const elapsed = Date.now() - backgroundTime;
  backgroundTime = 0;
  if (elapsed <= 0) { start(); return; }

  let dirty = false;
  for (const id in state.timers) {
    const timer = state.timers[id];
    if (timer.status !== 'running') continue;

    if (timer.mode === 'countdown') {
      const overshoot = timer.remaining - elapsed;
      if (overshoot <= 0) {
        timer.overtime = Math.abs(overshoot);
        timer.remaining = 0;
        timer.mode = 'countup';
        triggerAlert(state.settings.alertMode);
      } else {
        timer.remaining = overshoot;
      }
    } else {
      timer.overtime += elapsed;
    }
    dirty = true;
  }

  if (dirty) forceUpdate();
  start();
}

function loop(timestamp) {
  if (!running) return;
  rafId = requestAnimationFrame(loop);

  const delta = Math.min(timestamp - lastTimestamp, 1000);
  lastTimestamp = timestamp;
  let dirty = false;

  for (const id in state.timers) {
    const timer = state.timers[id];
    if (timer.status !== 'running') continue;

    if (timer.mode === 'countdown') {
      const overshoot = timer.remaining - delta;
      if (overshoot <= 0) {
        timer.overtime = Math.abs(overshoot);
        timer.remaining = 0;
        timer.mode = 'countup';
        triggerAlert(state.settings.alertMode);
      } else {
        timer.remaining = overshoot;
      }
    } else {
      timer.overtime += delta;
    }
    dirty = true;
  }

  if (dirty) {
    markDirty();
  }
}
