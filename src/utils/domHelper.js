export function setupLongPress(el, onLongPress, options = {}) {
  const { duration = 500, moveThreshold = 5 } = options;
  let pressTimer = null;
  let startX = 0, startY = 0;
  let triggered = false;

  function handleDown(e) {
    triggered = false;
    const pt = e.touches ? e.touches[0] : e;
    startX = pt.clientX;
    startY = pt.clientY;

    pressTimer = setTimeout(() => {
      triggered = true;
      onLongPress(e);
    }, duration);

    document.addEventListener('pointermove', handleMove, { passive: false });
    document.addEventListener('pointerup', handleUp, { once: true });
    document.addEventListener('pointercancel', handleUp, { once: true });
  }

  function handleMove(e) {
    if (!pressTimer) return;
    const pt = e.touches ? e.touches[0] : e;
    if (Math.abs(pt.clientX - startX) > moveThreshold ||
        Math.abs(pt.clientY - startY) > moveThreshold) {
      cleanup();
    }
  }

  function handleUp() {
    cleanup();
  }

  function cleanup() {
    clearTimeout(pressTimer);
    pressTimer = null;
    document.removeEventListener('pointermove', handleMove);
    document.removeEventListener('pointerup', handleUp);
    document.removeEventListener('pointercancel', handleUp);
  }

  el.addEventListener('pointerdown', handleDown);

  return {
    wasLongPress() {
      return triggered;
    },
    reset() {
      triggered = false;
    },
    cancel() {
      cleanup();
      triggered = false;
    },
    destroy() {
      cleanup();
      el.removeEventListener('pointerdown', handleDown);
    }
  };
}
