let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  return audioCtx;
}

function beep(frequency, duration, type = 'square') {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration / 1000);
  } catch {
    // Audio not available
  }
}

function playSound() {
  beep(440, 200);
  setTimeout(() => beep(880, 300), 250);
  setTimeout(() => beep(660, 400), 600);
}

function playVibrate() {
  if (navigator.vibrate) {
    navigator.vibrate([200, 150, 200, 150, 400]);
  }
}

export function triggerAlert(mode) {
  if (mode === 'sound') {
    playSound();
  } else if (mode === 'vibrate') {
    playVibrate();
  } else if (mode === 'both') {
    playSound();
    playVibrate();
  }
}
