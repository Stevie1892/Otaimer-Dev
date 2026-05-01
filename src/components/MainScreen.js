import {
  state, onStateChange, getGroupTimers,
  addTimer, removeTimer, toggleTimer, resetTimer,
  addTimerTime, subtractTimerTime, setTimerMode, startCountdown, forceUpdate,
  reorderTimers
} from '../core/state.js';
import { randomColor } from '../utils/colors.js';
import { setupLongPress } from '../utils/domHelper.js';
import { createTimerCircle } from './TimerCircle.js';
import { createFloatingMenu } from './FloatingMenu.js';
import { createEditTimerModal } from './EditTimerModal.js';
import { createConfirmDialog } from './ConfirmDialog.js';
import { createSidebar } from './Sidebar.js';

export function createMainScreen() {
  const el = document.createElement('div');
  el.style.cssText = 'width:100%;height:100%;display:flex;flex-direction:column;overflow:hidden;';

  let editMode = false;
  let dragData = null;
  const backHandlers = [];
  let sidebarHandlerIdx = -1;

  function pushBack(handler) {
    backHandlers.push(handler);
  }

  function consumeTopEntry() {
    backHandlers.pop();
  }

  function popBack() {
    if (backHandlers.length === 0) return;
    const handler = backHandlers.pop();
    handler();
  }

  function consumeSidebarEntry() {
    if (sidebarHandlerIdx >= 0 && sidebarHandlerIdx < backHandlers.length) {
      backHandlers.splice(sidebarHandlerIdx, 1);
      sidebarHandlerIdx = -1;
    }
  }

  function openSidebarWithBack() {
    const handler = () => sidebar.close();
    sidebar.open();
    pushBack(handler);
    sidebarHandlerIdx = backHandlers.length - 1;
  }

  const sidebar = createSidebar(
    () => { toggleEditMode(); },
    () => { consumeSidebarEntry(); },
    (handler) => { pushBack(handler); },
    () => { consumeTopEntry(); }
  );

  window.addEventListener('otaimer_back', () => {
    if (backHandlers.length > 0) {
      popBack();
    }
  });

  // Header
  const header = document.createElement('div');
  header.className = 'main-header';

  const menuBtn = document.createElement('button');
  menuBtn.style.cssText = `
    width:40px;height:40px;border-radius:50%;background:transparent;
    color:var(--text-secondary);font-size:1.3rem;
    display:flex;align-items:center;justify-content:center;
  `;
  menuBtn.textContent = '☰';
  menuBtn.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    openSidebarWithBack();
  });

  const titleEl = document.createElement('span');
  titleEl.style.cssText = 'font-size:1.1rem;font-weight:600;color:var(--text-primary);';

  const rightBtn = document.createElement('button');
  rightBtn.style.cssText = `
    min-width:40px;height:40px;border-radius:50%;background:rgba(69,183,209,0.15);
    color:var(--accent);font-size:1.3rem;
    display:flex;align-items:center;justify-content:center;
  `;
  rightBtn.textContent = '+';

  function updateHeader() {
    if (editMode) {
      titleEl.textContent = '拖动调整顺序';
      rightBtn.textContent = '✓';
      rightBtn.style.width = '48px';
      rightBtn.style.borderRadius = '20px';
      rightBtn.style.background = 'var(--accent)';
      rightBtn.style.color = '#fff';
      rightBtn.style.fontSize = '1rem';
      rightBtn.style.fontWeight = '600';
    } else {
      titleEl.textContent = getCurrentGroupName();
      rightBtn.textContent = '+';
      rightBtn.style.width = '40px';
      rightBtn.style.borderRadius = '50%';
      rightBtn.style.background = 'rgba(69,183,209,0.15)';
      rightBtn.style.color = 'var(--accent)';
      rightBtn.style.fontSize = '1.4rem';
      rightBtn.style.fontWeight = 'normal';
    }
  }
  updateHeader();

  rightBtn.addEventListener('pointerup', (e) => {
    e.stopPropagation();
    if (editMode) {
      saveReorder();
      toggleEditMode();
      consumeTopEntry();
    } else {
      handleAddTimer();
    }
  });

  header.appendChild(menuBtn);
  header.appendChild(titleEl);
  header.appendChild(rightBtn);
  el.appendChild(header);

  // Timer Grid
  const grid = document.createElement('div');
  grid.className = 'timer-grid';

  const gridLongPress = setupLongPress(grid, (e) => {
    if (editMode) return;
    const pt = e.touches ? e.touches[0] : e;
    const target = document.elementFromPoint(pt.clientX, pt.clientY);
    if (target === grid || target.classList.contains('timer-grid')) {
      handleAddTimer();
    }
  }, { duration: 500, moveThreshold: 8 });

  el.appendChild(grid);

  const circleMap = new Map();

  // --- Drag Sort ---

  function toggleEditMode() {
    editMode = !editMode;
    updateHeader();

    if (editMode) {
      pushBack(() => { saveReorder(); toggleEditMode(); });
      enterEditMode();
    } else {
      exitEditMode();
    }
  }

  function enterEditMode() {
    document.body.classList.add('timer-edit-mode');
    circleMap.forEach(c => c.showDragHandle());
    grid.addEventListener('pointerdown', onGridPointerDown, true);
    document.addEventListener('pointermove', onGridPointerMove);
    document.addEventListener('pointerup', onGridPointerUp);
    document.addEventListener('pointercancel', onGridPointerUp);
  }

  function exitEditMode() {
    document.body.classList.remove('timer-edit-mode');
    circleMap.forEach(c => c.hideDragHandle());
    grid.removeEventListener('pointerdown', onGridPointerDown, true);
    document.removeEventListener('pointermove', onGridPointerMove);
    document.removeEventListener('pointerup', onGridPointerUp);
    document.removeEventListener('pointercancel', onGridPointerUp);

    if (dragData) {
      cleanupDrag();
    }
  }

  function onGridPointerDown(e) {
    const circleEl = e.target.closest('.timer-circle');
    if (!circleEl) return;

    const timerId = circleEl.dataset.timerId;
    const circle = circleMap.get(timerId);
    if (!circle) return;

    const pt = e.touches ? e.touches[0] : e;
    dragData = {
      circle,
      circleEl,
      timerId,
      startX: pt.clientX,
      startY: pt.clientY,
      moved: false,
      ghost: null,
      placeholderRect: circleEl.getBoundingClientRect(),
      prevTarget: null
    };

    e.preventDefault();
    e.stopPropagation();
  }

  function onGridPointerMove(e) {
    if (!dragData) return;
    e.preventDefault();
    const pt = e.touches ? e.touches[0] : e;
    const dx = pt.clientX - dragData.startX;
    const dy = pt.clientY - dragData.startY;

    if (!dragData.moved && Math.abs(dx) + Math.abs(dy) < 10) return;

    if (!dragData.moved) {
      dragData.moved = true;
      dragData.circleEl.classList.add('placeholder');

      const ghost = dragData.circleEl.cloneNode(true);
      ghost.classList.add('ghost');
      ghost.classList.remove('placeholder', 'running', 'overtime', 'edit-mode');
      ghost.style.display = 'flex';
      ghost.style.width = dragData.placeholderRect.width + 'px';
      ghost.style.height = dragData.placeholderRect.height + 'px';
      ghost.style.left = (pt.clientX - dragData.placeholderRect.width / 2) + 'px';
      ghost.style.top = (pt.clientY - dragData.placeholderRect.height / 2) + 'px';
      ghost.style.transform = 'scale(1.08)';
      document.body.appendChild(ghost);
      dragData.ghost = ghost;
    }

    if (dragData.ghost) {
      dragData.ghost.style.left = (pt.clientX - dragData.placeholderRect.width / 2) + 'px';
      dragData.ghost.style.top = (pt.clientY - dragData.placeholderRect.height / 2) + 'px';
    }

    if (dragData.ghost) dragData.ghost.style.display = 'none';
    const targetEl = document.elementFromPoint(pt.clientX, pt.clientY);
    if (dragData.ghost) dragData.ghost.style.display = 'flex';

    const targetCircle = targetEl?.closest('.timer-circle:not(.ghost)');
    if (targetCircle && targetCircle !== dragData.circleEl && targetCircle !== dragData.prevTarget) {
      dragData.prevTarget = targetCircle;
      const children = [...grid.querySelectorAll('.timer-circle:not(.ghost)')];
      const targetIndex = children.indexOf(targetCircle);
      const currentIndex = children.indexOf(dragData.circleEl);
      if (targetIndex !== -1 && currentIndex !== -1 && targetIndex !== currentIndex) {
        if (targetIndex > currentIndex) {
          grid.insertBefore(dragData.circleEl, targetCircle.nextSibling);
        } else {
          grid.insertBefore(dragData.circleEl, targetCircle);
        }
      }
    }
  }

  function onGridPointerUp() {
    if (dragData && dragData.moved) {
      saveReorder();
    }
    cleanupDrag();
  }

  function cleanupDrag() {
    if (dragData?.ghost) {
      dragData.ghost.remove();
    }
    if (dragData?.circleEl) {
      dragData.circleEl.classList.remove('placeholder');
    }
    dragData = null;
  }

  function saveReorder() {
    const ids = [...grid.querySelectorAll('.timer-circle')]
      .map(el => el.dataset.timerId)
      .filter(Boolean);

    if (ids.length > 0) {
      const currentOrder = getGroupTimers(state.settings.currentGroupId).map(t => t.id);
      const changed = ids.some((id, i) => id !== currentOrder[i]);
      if (changed) {
        reorderTimers(ids);
      }
    }
  }

  // --- Timer actions ---

  function getGroupDurationText() {
    const duration = state.settings.defaultDuration;
    const min = duration / 60000;
    if (min % 1 === 0) return min + ' 分钟';
    return min + ' 分钟';
  }

  function getGroupDurationMs() {
    return state.settings.defaultDuration;
  }

  function showCustomDurationModal(timerId) {
    pushBack(() => {});

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const titleEl = document.createElement('div');
    titleEl.className = 'modal-title';
    titleEl.textContent = '自定义增加时长';

    const body = document.createElement('div');
    body.className = 'modal-body';

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.className = 'sidebar-slider';
    slider.style.width = '100%';
    slider.style.marginBottom = '16px';
    slider.min = '0.5';
    slider.max = '10';
    slider.step = '0.5';
    slider.value = '0.5';

    const display = document.createElement('div');
    display.style.cssText = 'text-align:center;font-size:1.2rem;font-weight:600;color:var(--accent);margin-bottom:16px;';

    function updateDisplay() {
      const mins = parseFloat(slider.value);
      const s = mins * 60;
      const m = Math.floor(s / 60);
      const r = Math.round(s % 60);
      display.textContent = r === 0 ? m + ' 分钟' : m + ' 分 ' + r + ' 秒';
    }
    updateDisplay();
    slider.addEventListener('input', updateDisplay);

    body.appendChild(slider);
    body.appendChild(display);

    const footer = document.createElement('div');
    footer.className = 'modal-footer';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-btn modal-btn-cancel';
    cancelBtn.textContent = '取消';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'modal-btn modal-btn-confirm';
    confirmBtn.textContent = '确认';

    footer.appendChild(cancelBtn);
    footer.appendChild(confirmBtn);

    modal.appendChild(titleEl);
    modal.appendChild(body);
    modal.appendChild(footer);

    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;inset:0;z-index:210;';
    container.appendChild(backdrop);
    container.appendChild(modal);

    function closeDialog() {
      container.remove();
    }

    backdrop.addEventListener('pointerup', () => {
      consumeTopEntry();
      closeDialog();
    });
    cancelBtn.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      consumeTopEntry();
      closeDialog();
    });
    confirmBtn.addEventListener('pointerup', (e) => {
      e.stopPropagation();
      const mins = parseFloat(slider.value);
      addTimerTime(timerId, Math.round(mins * 60000));
      consumeTopEntry();
      closeDialog();
    });

    document.body.appendChild(container);
  }

  function handleAddTimer() {
    const result = addTimer({ color: randomColor() });
    if (!result) {
      if (document.querySelector('.modal-backdrop')) return;
      document.body.appendChild(createConfirmDialog({
        title: '提示',
        message: '每个分组最多支持10个计时器',
        confirmLabel: '知道了',
        cancelLabel: '',
        onConfirm() {},
        onCancel() {}
      }));
    }
  }

  function handleTimerClick(timerId) {
    toggleTimer(timerId);
  }

  function handleTimerReset(timerId) {
    resetTimer(timerId);
  }

  function handleTimerLongPress(timerId, pos) {
    const timer = state.timers[timerId];
    if (!timer) return;

    let items = [];

    if (timer.status === 'running' && timer.mode === 'countdown') {
      const groupMs = getGroupDurationMs();
      const groupMin = Math.floor(groupMs / 60000);
      const groupSec = Math.round((groupMs % 60000) / 1000);
      const groupLabel = groupSec === 0 ? groupMin + ' 分钟' : groupMin + ' 分 ' + groupSec + ' 秒';
      items = [
        { icon: '⏱', label: '增加 ' + groupLabel, onClick: () => addTimerTime(timerId, groupMs) },
        { icon: '⏱', label: '增加 1 分钟', onClick: () => addTimerTime(timerId, 60000) },
        { icon: '⏱', label: '增加 2 分钟', onClick: () => addTimerTime(timerId, 120000) },
        { icon: '⏱', label: '自定义时长...', onClick: () => showCustomDurationModal(timerId) },
        { icon: '−', label: '减 1 分钟', bold: true, onClick: () => subtractTimerTime(timerId, 60000) }
      ];
    } else if (timer.status === 'running' && timer.mode === 'countup') {
      items = [
        { icon: '↺', label: '重置倒计时', onClick: () => { timer.remaining = timer.defaultDuration; timer.mode = 'countdown'; timer.overtime = 0; timer.status = 'idle'; forceUpdate(); } },
        { icon: '✎', label: '编辑名称/颜色', onClick: () => editTimer(timerId) },
        { icon: '🗑', label: '删除计时器', danger: true, onClick: () => confirmDeleteTimer(timerId) }
      ];
    } else {
      const groupDurationMs = getGroupDurationMs();
      items = [
        { icon: '▶', label: '启动倒计时 ' + getGroupDurationText(), onClick: () => startCountdown(timerId, groupDurationMs) },
        { icon: '⏱', label: '启动正计时', onClick: () => setTimerMode(timerId, 'countup') },
        { icon: '✎', label: '编辑名称/颜色', onClick: () => editTimer(timerId) },
        { icon: '🗑', label: '删除计时器', danger: true, onClick: () => confirmDeleteTimer(timerId) }
      ];
    }

    createFloatingMenu(items, pos);
  }

  function editTimer(timerId) {
    const timer = state.timers[timerId];
    if (!timer) return;
    pushBack(() => {});
    const modal = createEditTimerModal(
      timer,
      ({ name, color }) => {
        const t = state.timers[timerId];
        if (t) {
          t.name = name;
          t.color = color;
          forceUpdate();
        }
        consumeTopEntry();
      },
      () => { consumeTopEntry(); }
    );
    document.body.appendChild(modal);
  }

  function confirmDeleteTimer(timerId) {
    const timer = state.timers[timerId];
    if (!timer) return;
    document.body.appendChild(createConfirmDialog({
      title: '⚠ 确认删除',
      message: `确定要删除计时器"${timer.name}"吗？此操作不可撤销！`,
      confirmLabel: '确认删除',
      danger: true,
      onConfirm: () => removeTimer(timerId)
    }));
  }

  function getCurrentGroupName() {
    const group = state.groups.find(g => g.id === state.settings.currentGroupId);
    return group ? group.name : '计时器';
  }

  function renderGrid() {
    grid.querySelectorAll('.timer-grid-empty').forEach(e => e.remove());

    const timers = getGroupTimers(state.settings.currentGroupId);

    if (!editMode) {
      titleEl.textContent = getCurrentGroupName();
    }

    const newIds = new Set(timers.map(t => t.id));

    for (const [id, circle] of circleMap) {
      if (!newIds.has(id)) {
        circle.destroy();
        circle.el.remove();
        circleMap.delete(id);
      }
    }

    timers.forEach(timer => {
      let circle = circleMap.get(timer.id);
      if (circle) {
        circle.update(timer);
      } else {
        circle = createTimerCircle(timer, {
          onToggle: () => handleTimerClick(timer.id),
          onReset: () => handleTimerReset(timer.id),
          onLongPress: (pos) => handleTimerLongPress(timer.id, pos)
        });
        circleMap.set(timer.id, circle);
        grid.appendChild(circle.el);
      }
      if (editMode && circle) {
        circle.showDragHandle();
      }
    });

    if (timers.length === 0 && !editMode) {
      const empty = document.createElement('div');
      empty.className = 'timer-grid-empty';
      empty.textContent = '长按此处或点击右上角 + 添加计时器';
      grid.appendChild(empty);
    }
  }

  const unsub = onStateChange(() => {
    renderGrid();
  });

  renderGrid();

  // Apply theme
  document.body.className = 'theme-' + (state.settings.theme || 'dark');

  return {
    el,
    destroy() {
      unsub();
      gridLongPress.destroy();
      circleMap.forEach(circle => circle.destroy());
      circleMap.clear();
    }
  };
}
