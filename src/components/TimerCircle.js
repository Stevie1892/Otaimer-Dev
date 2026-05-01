import { formatDisplay } from '../core/timeFormat.js';
import { setupLongPress } from '../utils/domHelper.js';

export function createTimerCircle(timer, callbacks) {
  const { onToggle, onReset, onLongPress } = callbacks;

  const el = document.createElement('div');
  el.className = 'timer-circle';
  el.style.setProperty('--timer-color', timer.color);
  el.dataset.timerId = timer.id;

  const timeEl = document.createElement('div');
  timeEl.className = 'timer-time';

  const nameEl = document.createElement('div');
  nameEl.className = 'timer-name';
  nameEl.textContent = timer.name;

  const dragHandle = document.createElement('div');
  dragHandle.className = 'timer-drag-handle';
  dragHandle.textContent = '⠿';
  dragHandle.style.display = 'none';

  el.appendChild(timeEl);
  el.appendChild(nameEl);
  el.appendChild(dragHandle);

  const finishEl = document.createElement('div');
  finishEl.className = 'timer-finish';
  finishEl.textContent = '时间到！';
  el.insertBefore(finishEl, nameEl);

  let lastTapTime = 0;
  let lastTapTimeout = null;

  const longPress = setupLongPress(el, (e) => {
    navigator.vibrate?.(12);
    const rect = el.getBoundingClientRect();
    onLongPress({ x: rect.right, y: rect.bottom });
  }, { duration: 500, moveThreshold: 8 });

  el.addEventListener('pointerup', (e) => {
    if (document.body.classList.contains('timer-edit-mode')) return;

    const wasLP = longPress.wasLongPress();
    longPress.cancel();

    if (wasLP) {
      longPress.reset();
      return;
    }

    e.stopPropagation();
    e.preventDefault();

    const now = Date.now();
    navigator.vibrate?.(10);
    if (now - lastTapTime < 280) {
      clearTimeout(lastTapTimeout);
      lastTapTime = 0;
      onReset();
    } else {
      lastTapTime = now;
      lastTapTimeout = setTimeout(() => {
        lastTapTime = 0;
        onToggle();
      }, 280);
    }
  });

  function update(newTimer) {
    el.style.setProperty('--timer-color', newTimer.color);
    timeEl.textContent = formatDisplay(newTimer);
    nameEl.textContent = newTimer.name;

    el.classList.remove('running', 'overtime');

    if (newTimer.status === 'running') {
      el.classList.add('running');
    }
    if (newTimer.mode === 'countup' && newTimer.overtime > 0) {
      el.classList.add('overtime');
    }
  }

  update(timer);

  return {
    el,
    update,
    showDragHandle() {
      dragHandle.style.display = 'flex';
      el.classList.add('edit-mode');
    },
    hideDragHandle() {
      dragHandle.style.display = 'none';
      el.classList.remove('edit-mode');
    },
    destroy() {
      longPress.destroy();
    }
  };
}
