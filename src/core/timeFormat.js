export function formatTime(ms) {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${minutes}:${pad(seconds)}`;
}

export function formatOvertime(ms) {
  return '-' + formatTime(ms);
}

export function formatDisplay(timer) {
  if (timer.mode === 'countup' && timer.overtime > 0) {
    return formatOvertime(timer.overtime);
  }
  return formatTime(timer.remaining);
}

function pad(n) {
  return n.toString().padStart(2, '0');
}
